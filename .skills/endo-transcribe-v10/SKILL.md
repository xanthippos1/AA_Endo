---
name: endo-transcribe-v10
description: |
  Digitize handwritten Greek endocrinologist notes into structured Word documents (.docx) using the v10 lab-panel-aware format (3-phase: transcribe with lab awareness, panel-guided review, assemble). Use this skill when the user asks for "v10" transcription or says "transcribe Patient001 v10". V10 loads lab panel templates (test names, alt names, units, nominal ranges, OCR traps) during transcription and review, enabling smarter character recognition and structured grouping of lab results.
---

# Endocrinologist Note Transcription — v10 Format (Lab-Panel-Aware)

Digitize handwritten medical notes from a Greek endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki) into structured Word documents, using **lab panel templates** to improve OCR accuracy and result organization.

V10 uses **lab panel intelligence** — structured test definitions (names, alt names, units, nominal ranges, plausible bounds, OCR traps) loaded from `./templates/*.json` — to:
1. **Correct likely misreads** during transcription (HDO → HDL, Anti-Tj → Anti-Tg)
2. **Catch order-of-magnitude errors** using plausible ranges (K: 41 → 4,1 because normal is 3,5-5,0)
3. **Separate garbled run-on text** (HGB1164 → HGB: 16,4)
4. **Group results into named panels** in the output (CBC, Lipids, Thyroid, etc.)

## Invocation

The user gives a patient ID (e.g., `Patient004`) and specifies v10. The job:

1. Read source JPGs + lab panel templates
2. Transcribe each page with lab-panel-aware OCR (Phase 1)
3. Run panel-guided medical review (Phase 2)
4. Assemble into .docx (Phase 3)

## Setup

```bash
npm install docx  # if not already installed
```

Read these BEFORE starting:
- `./id.json` — synthetic patient identity data (name, AMKA, DOB, phone, address) indexed by PatientXXX. These fields are redacted in the source JPGs and must be populated from this file.
- `./transcription_knowledge.json` — use these sections:
  - `abbreviations.confirmed` — doctor-confirmed abbreviation meanings
  - `handwriting_patterns.confirmed` — known handwriting quirks (e.g. 2↔9 year confusion)
  - `hallucination_warnings` — patterns where AI has previously hallucinated content
  - `omission_warnings` — patterns where AI has previously missed content
  - `common_medical_terms` — Greek↔English medical dictionary
  - `medication_names` — list of known drug names
  - `formatting_rules` — color coding and formatting standards
  - `note_structure.sections_visit` — expected section order
- ALL files in `./templates/*.json` — lab panel definitions with OCR traps

### CRITICAL: Turnkey Isolation

V10 must produce a **fresh transcription** every time it runs:
- The ONLY corrections that may influence transcription are: (a) lab panel template plausibility checks, and (b) general handwriting patterns confirmed by the doctor
- Each run reads the image fresh and applies only template-based intelligence — as if this patient has never been processed before
- The knowledge base contains ONLY general, patient-agnostic knowledge (abbreviations, handwriting patterns, medical terms, medication names). No patient-specific data.

---

## PHASE 1: Lab-Panel-Aware Transcription (One Page at a Time)

**TOKEN MANAGEMENT**: Process ONE page at a time. Never load multiple images simultaneously.

### 1a. Load Lab Panel Templates

Before reading any images, read ALL `./templates/*.json` files. Build a mental lookup of:
- Every test name and all its alt_names
- The plausible_min and plausible_max for each test
- The OCR traps for each panel

The panels available are:

| Panel | Key Tests |
|-------|-----------|
| CBC | WBC, RBC, HGB, HCT, MCV, MCH, MCHC, RDW, PLT, ΤΥΠΟΣ |
| Biochemistry | GLU, HbA1c, Ουρία, Κρεατινίνη, SGOT, SGPT, γGT, ALP, LDH, CPK |
| Lipids | CHOL, HDL, LDL, Τριγλυκερίδια, ApoA1, ApoB, Lp(a) |
| Electrolytes | Na, K, Ca, P, Mg |
| Thyroid | TSH, FT4, FT3, Anti-TPO, Anti-Tg |
| Bone Metabolism | PTH, 25-OHD₃, Ca, P, ALP |
| Iron Studies | Fe, Φερριτίνη, TIBC, Transferrin Sat |
| Vitamins | B12, Φυλλικό οξύ, Ομοκυστεΐνη, 25-OHD₃ |
| Inflammation | CRP, ΤΚΕ, Φερριτίνη |
| Glucose Metabolism | GLU, HbA1c, Ινσουλίνη, C-peptide, HOMA-IR |
| Hormones | Testosterone, SHBG, E2, FSH, LH, PRL, DHEA-S |
| Pituitary | GH, IGF-1, ACTH, Cortisol, PRL |
| Adrenal | Cortisol, ACTH, DHEA-S, Aldosterone, Renin |
| Urinalysis | Ειδ. βάρος, pH, πρωτεΐνες, γλυκόζη, ερυθρά |
| Tumor Markers | AFP, CEA, PSA, CA 19-9 |
| Autoimmune | Anti-TPO, Anti-Tg, ANA, anti-GAD |

### 1b. Transcribe Each Page

For EACH page, one at a time:

1. Read the single JPG image. Note pixel dimensions.
2. Transcribe into `./scratch/_notes_PatientXXX_pageN.txt`
3. **While transcribing lab results**, apply the lab templates:

#### OCR Correction Rules (apply during transcription):

**Test name correction**: If you read a test name that doesn't match any known test but is close to one, correct it:
- `HDO` → `HDL` (in lipid context)
- `Anti-Tj` → `Anti-Tg` (next to Anti-TPO)
- `HG8` → `HGB`
- `LDH` vs `LDL` — disambiguate by context (enzyme panel vs lipid panel)
- `SGOT` vs `SGPT` — O and P confused; SGOT usually listed first

**Run-on text separation**: Handwriting often runs test names into values:
- `HGB1164` → `HGB: 16,4` (HGB normal range 13-18)
- `PLT213000` → `PLT: 213.000`
- `TSH218` → `TSH: 2,18` (normal 0,4-4,0, so 2,18 makes sense; 218 would be extreme)
- `P14,5` → `P: 4,5` (not 14,5 — phosphorus normal is 2,5-4,5)
- `B12146420` → `B12: 446,20` or `B12: 1464,20` (check plausible range 200-900)

**Value plausibility check**: After reading a value, immediately check against plausible_min/plausible_max:
- If the value is outside plausible range, consider whether a digit was dropped, added, or the decimal was missed
- `K: 41` → probably `K: 4,1` (plausible 2-8, normal 3,5-5,0)
- `Na: 14` → probably `Na: 143` (plausible 110-170, normal 135-145)
- `CHOL: 20` → probably `CHOL: 206` (plausible 80-400)
- If a value is implausible even after correction attempts, mark it `[?]` and flag

**Decimal comma awareness**: Greek notation uses comma as decimal separator:
- `16,4` not `16.4`
- `2,18` not `2.18`
- If you see what looks like a large integer that should have a decimal, insert the comma where it makes clinical sense

4. Note image dimensions at top (e.g., `IMAGE: 1700x2366`)
5. **Move to next page — do NOT keep previous image in context.**

The images are pre-cropped JPGs. The following fields are **redacted** (painted over with **magenta #FF00FF** rectangles) in the source scans — do NOT attempt to read them from the image:
- **Name** — use the value from `id.json` → `PatientXXX.name`
- **AMKA** — use the value from `id.json` → `PatientXXX.amka` (already masked)
- **Birth date** — use the value from `id.json` → `PatientXXX.birth_date`
- **Phone** — use the value from `id.json` → `PatientXXX.phone`
- **Address** — use the value from `id.json` → `PatientXXX.address`

When you encounter a magenta rectangle where identity data would normally be, skip it and note `[REDACTED — from id.json]` in the .txt transcription. The actual values will be inserted during Phase 3 assembly.

---

## PHASE 2: Panel-Guided Medical Review

**No images needed.** Read all `./scratch/_notes_PatientXXX_pageN.txt` files + the lab templates.

### 2a. Lab Result Grouping

Organize all lab results from the transcription into panels. For each result, determine which panel it belongs to using the test name and alt_names from the templates.

Output format in the reviewed file:
```
=== LAB RESULTS GROUPED BY PANEL ===

--- CBC (Γενική Αίματος) ---
WBC: 6800 [×10³/μL, normal 4,5-11,0] ✓
RBC: 5,3×10⁶ [×10⁶/μL, normal 4,5-5,9] ✓
HGB: 16,4 [g/dL, normal 13-18] ✓
HCT: 49,2 [%, normal 41,5-50,4] ✓
MCV: 92,8 [fL, normal 80-100] ✓
MCH: 31 [pg, normal 27-33] ✓
MCHC: 33,4 [g/dL, normal 32-36] ✓
RDW: 12,7 [%, normal 11,5-14,5] ✓
PLT: 213.000 [×10³/μL, normal 150-400] ✓
ΤΥΠΟΣ: 50/39/8/3/1 [%, N/L/E/M/B]

--- Biochemistry (Βιοχημικές) ---
GLU: 92 [mg/dL, normal 70-99] ✓
Ουρία: 36 [mg/dL, normal 7-20] ⚠ ELEVATED
Κρεατινίνη: 1,0 [mg/dL, normal 0,6-1,2] ✓
...

--- UNGROUPED ---
[any results that don't match a known panel]
```

### 2b. Cross-Panel Validation

Check for consistency across panels:
- Ca appears in both Electrolytes and Bone Metabolism — values should match
- 25-OHD₃ appears in Vitamins and Bone Metabolism — values should match
- ALP appears in Biochemistry and Bone Metabolism — values should match
- If the same test appears with different values, flag the discrepancy

### 2c. Range-Based Review

For each lab value, check:
- **Within normal range** → mark ✓
- **Outside normal but within plausible** → mark ⚠ with annotation (HIGH/LOW)
- **Outside plausible range** → mark ❌ and flag as likely OCR error. Re-examine the raw transcription.

### 2d. Known Error Pattern Check

Check against the knowledge base:
- Year confusion (2↔9) — from `handwriting_patterns.confirmed`
- Known abbreviation misreads — from `abbreviations.confirmed`
- Hallucination patterns — from `hallucination_warnings`
- Omission patterns — from `omission_warnings`

### 2e. Write Reviewed Output

Write: `./scratch/_reviewed_PatientXXX.txt`

Include at top:
```
=== V10 LAB-PANEL-AWARE REVIEW ===
Lab panels identified: CBC, Biochemistry, Lipids, Electrolytes, Thyroid, Bone, Vitamins, Iron
Total lab values: N
  Within normal: N (XX%)
  Abnormal: N
  Corrected by template: N (list each correction)
  Still uncertain: N

TEMPLATE-BASED CORRECTIONS:
- "HDO: 55,2" → "HDL: 55,2" (OCR trap: HDO→HDL in lipid context)
- "TSH 218" → "TSH: 2,18" (plausible range 0,01-100; 218 implausible, 2,18 normal)
- "P14,5" → "P: 4,5" (plausible range 1-10; 14,5 exceeds max)
- "B12146420" → "B12: 446,20" (separated run-on; plausible 50-5000)

FLAGS FOR DOCTOR:
- [items still uncertain after template-guided review]
=== END REVIEW ===
```

Then the full reviewed transcription with corrected lab results grouped by panel.

---

## PHASE 3: Assemble and Generate

**No images needed.** Read `./scratch/_reviewed_PatientXXX.txt`.

### 3a. Copy the Template Script

The template is bundled with this plugin at:
```
${CLAUDE_PLUGIN_ROOT}/skills/endo-transcribe-v10/references/v10_template_generator.js
```

Also available at `./scripts/v10_template_generator.js`.

1. **Read `./id.json` FIRST** and extract the entry for this patient (e.g., `Patient004`). You MUST have the actual values before writing any code.
2. Copy template to `./scratch/create_patientXXX_v10.js`
3. Update CONFIGURATION: `IMAGE_FILES`, `OUTPUT_PATH` (→ `./transcribed/v10/`), `PATIENT_AMKA` (from `id.json`)
4. Replace `transcriptionChildren` from REVIEWED notes
5. **CRITICAL — Insert ACTUAL identity values from `id.json`** into the ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ section. Do NOT leave placeholders like `[REDACTED]`, `[whited out]`, `Patient 004`, or `Ασθενής 004`. The docx must contain the real synthetic values:

```javascript
// Example for Patient004 — use ACTUAL values from id.json:
twoBoxRow(
  "ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ",
  [
    nLabelVal("Όνομα", "Αικατερίνη Σ. Δημητρίου"),    // ← from id.json .name
    nLabelVal("Ημερ. Γέννησης", "10/06/1998"),          // ← from id.json .birth_date
    nLabelVal("Κατοικία", "Λ. Νίκης 55, Θεσσαλονίκη 54623"), // ← from id.json .address
    nLabelVal("Τηλέφωνο", "6981 597 086"),              // ← from id.json .phone
    nLabelVal("ΑΜΚΑ", "*******0891"),                    // ← from id.json .amka
  ],
  ...
)
```

**Every `[REDACTED — from id.json]` placeholder in the .txt files MUST be replaced with the actual value from id.json in the final code. No placeholders, no patient IDs as names — real-looking synthetic data.**

6. Leave engine unchanged.

### 3b. Lab Results in the Document

When building the ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ section, **group results by panel** using sub-headings.

**IMPORTANT**: The `labTable` third column (Reference Range) MUST be populated from the `./templates/*.json` files — use the official `range` (or `range_m`/`range_f` based on patient sex) from the template, NOT the doctor's handwritten ranges. This ensures consistency and correctness. Add ⚠ after the range if the patient's value is outside normal.

```javascript
fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ (10/4/23)", [
  // Sub-heading for each panel
  nLine([bold("— Γενική Αίματος (CBC) —")]),
  labTable([
    ["WBC", "6800", "ΦΤ: 4.500-11.000"],
    ["RBC", "5,3×10⁶", "ΦΤ: 4,5-5,9"],
    ["HGB", "16,4", "ΦΤ: 13-18"],
    // ... rest of CBC
  ]),
  spacer(40),

  nLine([bold("— Βιοχημικές —")]),
  labTable([
    ["GLU", "92", "ΦΤ: 70-99"],
    ["Ουρία", "36", "ΦΤ: 7-20 ⚠"],
    // ... rest of biochemistry
  ]),
  spacer(40),

  nLine([bold("— Λιπιδαιμικό Προφίλ —")]),
  labTable([
    ["CHOL", "206", "ΦΤ: <200 ⚠"],
    ["HDL", "55,2", "ΦΤ: >40"],
    ["TRG", "180", "ΦΤ: <150 ⚠"],
    ["LDL", "135", "ΦΤ: <100 ⚠"],
  ]),
  // ... more panels
]),
```

### 3c. Helper Functions

| Function | When to Use |
|----------|-------------|
| `normal("text")` | Default text |
| `bold("text")` | Labels |
| `medical("text")` | Disease names, conditions (PURPLE) |
| `drug("text")` | Medications (PURPLE) |
| `uncertain("text")` | Uncertain after review (RED) |
| `uncertainNum("text")` | Uncertain numbers (RED) |

Section layout order: ΣΤΟΙΧΕΙΑ | ΚΟΙΝΩΝΙΚΟ → ΑΓΩΓΗ | ΝΟΣΟΣ → ΠΑΡΑΠΟΜΠΗ | ΑΝΑΜΝΗΣΤΙΚΟ → ΟΙΚΟΓ. ΙΣΤΟΡ. → ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ → ΕΡΓΑΣΤΗΡΙΑΚΑ → ΟΔΗΓΙΕΣ.

### 3d. Generate

```bash
node ./scratch/create_patientXXX_v10.js
```

### 3e. Update Knowledge Base

Update `./transcription_knowledge.json` with **general, patient-agnostic** knowledge only:
- New medical terms → `common_medical_terms`
- New medications → `medication_names`
- New confirmed abbreviations → `abbreviations.confirmed` (only if meaning is certain from context)
- Do NOT add any patient-specific data, per-run stats, or value corrections. The knowledge base must remain general and applicable to any patient.

---

## Rules

### Privacy & Redacted Fields
- **Identity fields (name, AMKA, DOB, phone, address) are redacted** in the source JPGs — painted over with **magenta (#FF00FF)** rectangles.
- **Do NOT attempt to read** any redacted field from the image. Always use `./id.json` for these values.
- `id.json` is stored locally only and never shared or committed to version control.
- AMKA values in `id.json` are already masked (last 4 digits only).

### Transcription Accuracy
- **Lab templates are the primary accuracy tool for lab values.** Use them aggressively during Phase 1 and Phase 2.
- Cross-reference every non-lab line against the image during Phase 1.
- Mark ALL remaining uncertain items in RED after review.

### Formatting
- ALL disease names → `medical("text")` (PURPLE + UPPERCASE + BOLD)
- ALL drug names → `drug("text")` (PURPLE + UPPERCASE + BOLD)
- ALL uncertain readings → `uncertain("text")` (RED + [text?])
- Section titles: BLUE (#2E75B6)
- Row numbers: GRAY (#999999) in Courier New

### Technical
- **Do NOT write docx code from scratch.** Copy `./scripts/v10_template_generator.js`.
- Image section MUST be separate docx section (0.5cm vs 2cm margins)
- `fitToPage(imgW, imgH)` — 750×1070 max
- **CRITICAL: Appended scan images must NEVER be cropped.**

## Timing and Cost Estimation

Record per-phase and total time. Estimate tokens and compute cost.

**Token estimation guidelines:**
- Each JPG image ≈ 1,600 tokens input
- SKILL.md instructions ≈ 3,000 tokens input
- Knowledge base ≈ 1,500 tokens input
- Lab templates (all) ≈ 2,000 tokens input
- Template script ≈ 2,000 tokens input
- Phase 2 review input: raw transcription texts ≈ 3,000-8,000 tokens
- Output: transcription .txt + reviewed .txt + generator script ≈ 15,000-30,000 tokens total
- **Opus 4.6 pricing**: $15 / 1M input tokens, $75 / 1M output tokens
- **Sonnet 4.6 pricing**: $3 / 1M input tokens, $15 / 1M output tokens

**MANDATORY — Print this EXACT table at the end. No clinical flags, no extra rows. This exact format:**

```
┌──────────────────────────────────────────────────┐
│ V10 LAB-PANEL-AWARE TRANSCRIPTION SUMMARY        │
├──────────────────────────────────────────────────┤
│ Patient:              PatientXXX                 │
│ Pages:                N                          │
│ Rows:                 XX                         │
│ Lab panels found:     N panels, M total values   │
│ Template corrections: N                          │
│ Still uncertain:      N                          │
├──────────────────────────────────────────────────┤
│ Phase 1 (transcribe): X min Y sec               │
│ Phase 2 (review):     X min Y sec               │
│ Phase 3 (assemble):   X min Y sec               │
│ Total elapsed:        X min Y sec               │
├──────────────────────────────────────────────────┤
│ Est. input tokens:    ~XX,XXX                    │
│ Est. output tokens:   ~XX,XXX                    │
│ Est. cost (Opus 4.6):   $X.XX                   │
│ Est. cost (Sonnet 4.6): $X.XX                   │
└──────────────────────────────────────────────────┘
```

**Do NOT add clinical findings, key flags, inherited fixes, or any other rows. The table above is the COMPLETE output.**
