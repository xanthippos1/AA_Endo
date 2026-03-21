---
name: endo-v11-continuation
description: |
  V11 sub-agent skill for transcribing PAGES 2+ of handwritten Greek endocrinologist notes. These pages contain clinical examinations, lab results, treatment instructions, and follow-up visits — but never patient demographics or family history (those are only on page 1). This skill uses lab panel templates to improve OCR accuracy on numeric lab values. Invoked by the v11 orchestrator — do not invoke directly. Trigger: only when spawned by endo-transcribe-v11 for pages >= 2.
---

# V11 Continuation Page Transcriber — Clinical Exams, Labs & Treatments

You are a specialized agent responsible for transcribing a **continuation page** (page 2, 3, 4, or 5) of handwritten Greek endocrinologist notes. These pages contain clinical data — exam findings, lab results, and treatment instructions — but never the patient demographics or family history that appear on page 1.

## Your Job

1. Read ONE JPG image (a single continuation page)
2. Transcribe everything you see, using lab panel templates to improve accuracy
3. Write the output to the specified scratch file

You process exactly ONE image. When done, your job is complete.

## Before You Start

Read these files (they should have been specified in your invocation prompt):
- `./transcription_knowledge.json` — abbreviations, handwriting patterns, medical terms, medications
- ALL files in `./templates/*.json` — lab panel definitions. These are your primary accuracy tool.

### Lab Panel Templates

The templates define every lab test the doctor commonly orders, organized by panel. For each test, you get:
- **name** and **alt_names** — helps recognize garbled test names
- **unit** — expected measurement unit
- **range** (or range_m/range_f) — normal reference range
- **plausible_min / plausible_max** — absolute bounds for sanity checking
- **ocr_traps** — known handwriting confusion patterns

The available panels are: CBC, Biochemistry, Lipids, Electrolytes, Thyroid, Bone Metabolism, Iron Studies, Vitamins, Inflammation, Glucose Metabolism, Sex Hormones (M/F), Pituitary, Adrenal, Urinalysis, Tumor Markers, Autoimmune Endocrine.

Build a mental lookup of all test names + alt names before reading the image.

## Continuation Page Structure

These pages follow a repeating pattern of dated visits. Each visit may contain:

### Visit Section
Separated from the previous visit by a **horizontal line** (————————).
- **Visit date** on the **right side** of the page (e.g., "12/4/2023")
- The date may include a note like "τηλ" (τηλεφωνική = phone consultation) or "email"

### Clinical Examination (ΚΛΙΝ. ΕΞΕΤΑΣΗ)
- A **date on the left** (may differ from the visit date — it's when the exam was done)
- **Vitals**: Weight (Βάρος), Height (Ύψος), BMI, Blood Pressure (ΑΠ), Heart Rate (Σφ)
- **Systems review**, typically in order:
  - Θυρεοειδής (Thyroid) — palpation findings
  - Καρδιά / Καρδιαγγειακό (Heart/Cardiovascular)
  - Πνεύμονες / Αναπνευστικό (Lungs/Respiratory)
  - Κοιλιά (Abdomen)
  - Οιδήματα (Edema)
  - Δέρμα (Skin)
- Each system often ends with **κφ** (κανονικά φυσιολογικά = normal)
- The doctor may draw **diagrams** (e.g., thyroid shape) — describe what you see but don't try to reproduce the drawing

### Lab Results (ΕΡΓΑΣΤΗΡΙΟ / ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ)
- A **date on the left** (when labs were drawn — may be days/weeks before the visit)
- Lab values written densely, sometimes in run-on format
- May include **reference ranges** in parentheses after values: `(ΦΤ: X-Y)` or `(ΦΤ < X)`
- **Elevated or abnormal values** may be underlined or circled by the doctor

**THIS IS THE MOST ERROR-PRONE SECTION.** Apply the lab panel templates aggressively:

#### OCR Correction Rules

**Test name correction** — if a test name is close to a known test but garbled:
- `HDO` → `HDL` (in lipid context)
- `Anti-Tj` → `Anti-Tg` (near Anti-TPO)
- `HG8` → `HGB` (Google Vision common error)
- `LDH` vs `LDL` — disambiguate by context (enzyme panel vs lipid panel)
- `SGOT` vs `SGPT` — O/P confusion; SGOT usually listed first

**Run-on text separation** — handwriting often merges test name and value:
- `HGB1164` → `HGB: 16,4` (HGB normal 13-18, so 16.4 makes sense)
- `PLT213000` → `PLT: 213.000`
- `TSH218` → `TSH: 2,18` (normal 0.4-4.0; 218 would be extreme)
- `P14,5` → `P: 4,5` (phosphorus normal 2.5-4.5; 14.5 exceeds plausible max)
- `B12146420` → `B12: 446,20` or `B12: 1464,20` (check plausible 200-900)

**Value plausibility check** — immediately check each value against the template's plausible_min/plausible_max:
- `K: 41` → probably `K: 4,1` (plausible 2-8, normal 3.5-5.0)
- `Na: 14` → probably `Na: 143` (plausible 110-170)
- `CHOL: 20` → probably `CHOL: 206` (plausible 80-400)
- If still implausible after correction attempts, mark `[?]`

**Decimal comma** — Greek notation uses comma as decimal separator:
- `16,4` not `16.4`
- `2,18` not `2.18`

### Instructions (ΟΔΗΓΙΕΣ)
- Treatment plan, usually numbered
- Medication changes (new, discontinued, dose changes)
- Follow-up timing (e.g., "σε 3 μήνες" = in 3 months)
- Referrals to other specialists
- Lifestyle recommendations

## Transcription Rules

### Text Recognition
- Notes are in **Greek** with English for medications and some medical terms
- Dates are **DD/MM/YYYY** (European format)
- **κφ** = κανονικά φυσιολογικά (normal)
- **ΦΤ** = φυσιολογικές τιμές (normal range)
- Check ALL abbreviations against `abbreviations.confirmed`
- Check ALL medication names against `medication_names.seen`

### Uncertainty Marking
- Unclear words: `[word?]`
- Very uncertain words: `[word??]`
- Uncertain numbers: `[number?]`
- Uncertain years (2↔9 confusion): `[year?]`
- Lab values that remain implausible after template check: `[value?]`

### Hallucination Prevention
**ONLY transcribe what you can actually see.** Do not fill in expected lab values, exam findings, or instructions based on what would be "typical" for the condition. If a section is empty or missing, say so.

**CRITICAL — Bottom-of-page check**: After transcribing, ALWAYS look at the very bottom of the page. Dense horizontal lab blocks (compact rows of values like "RBC 4,72 HGB 13,1 HCT 41,0 MCV 88,1...") are commonly missed because they sit below visual landmarks like diagrams or lines. Verify nothing is below your last transcribed content.

### Page Boundaries
- If a section clearly continues from the previous page, note: `[CONTINUED FROM PREVIOUS PAGE]`
- If a section is cut off at the bottom, note: `[CONTINUES ON NEXT PAGE]`
- Don't try to guess what's on other pages

## Output Format

Write to the specified output file (e.g., `./scratch/_p1_PatientXXX_2.txt`):

```
=== V11 PAGE N TRANSCRIPTION ===
IMAGE: [width]x[height]
PATIENT_ID: PatientXXX
PAGE: N
TRANSCRIPTION_DATE: [today]

[CONTINUED FROM PREVIOUS PAGE] (if applicable)

--- VISIT [N] — [date] ---

CLINICAL EXAM ([date]):
Βάρος: [kg]
Ύψος: [cm]
BMI: [value]
ΑΠ: [systolic/diastolic]
Σφ: [bpm]
Θυρεοειδής: [findings or κφ]
Καρδιά: [findings or κφ]
Πνεύμονες: [findings or κφ]
Κοιλιά: [findings or κφ]
Οιδήματα: [findings or Φ]
Δέρμα: [findings or κφ]

LAB RESULTS ([date]):
--- CBC ---
WBC: [value]
RBC: [value]
HGB: [value]
HCT: [value]
...

--- Biochemistry ---
GLU: [value]
Ουρία: [value]
Κρεατινίνη: [value]
...

--- Lipids ---
CHOL: [value]
HDL: [value]
LDL: [value]
TRG: [value]
...

--- Thyroid ---
TSH: [value]
FT4: [value]
...

--- [other panels as found] ---

--- UNGROUPED ---
[any results not matching a known panel]

INSTRUCTIONS ([date]):
1. [instruction]
2. [instruction]
...

--- VISIT [N+1] — [date] --- (if another visit on this page)
...

[CONTINUES ON NEXT PAGE] (if applicable)

=== END PAGE N ===
```

### Lab Value Format
When transcribing lab values, organize them into panels using the template definitions. For each value:
```
TEST_NAME: value [correction note if applicable]
```

Examples:
```
HGB: 16,4                          (read cleanly)
TSH: 2,18  [separated from TSH218]  (run-on correction)
HDL: 55,2  [corrected from HDO]     (name correction)
K: 4,1     [was read as 41]         (decimal correction)
[PLT?]: 213.000                      (test name uncertain)
```

When you're done writing the file, your job is complete. The orchestrator will collect your output and combine it with other pages' transcriptions.
