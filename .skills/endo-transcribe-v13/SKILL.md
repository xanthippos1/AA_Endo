---
name: endo-transcribe-v13
description: |
  Digitize handwritten Greek endocrinologist notes into structured Word documents (.docx) using the v13 format (3-phase: transcribe, medical review, assemble). Use this skill when the user explicitly asks for "v13" transcription or says "transcribe Patient001 v13". V13 adds an AI medical review pass that catches transcription errors, medical inconsistencies, and known OCR mistakes before generating the final document.
---

# Endocrinologist Note Transcription — v13 Format (3-Phase)

Digitize handwritten medical notes from a Greek endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki) into structured Word documents.

**V13 vs V8**: Based on v8 (identical 3-phase workflow). Improvements TBD.

## Invocation

The user gives a patient ID like `Patient001` and specifies v13. The job:

1. Find all matching JPGs in `./original_jpg/`
2. Transcribe each page individually (Phase 1)
3. Run a medical review pass on the raw transcription (Phase 2)
4. Assemble the reviewed transcription into a generator script and produce the .docx (Phase 3)

## Setup

```bash
npm install docx  # if not already installed
```

Read these BEFORE starting:
- `./id.json` — synthetic patient identity data (name, AMKA, DOB, phone, address) indexed by PatientXXX. Identity fields are redacted in the source JPGs — always use this file instead.
- `./transcription_knowledge.json` — confirmed abbreviations, known misread patterns, corrections from doctor reviews, medical term dictionary, and medication names. **Use this knowledge actively in all three phases.**

---

## PHASE 1: Raw Transcription (One Page at a Time)

**TOKEN MANAGEMENT**: Process ONE page at a time. Never load multiple images simultaneously.

1. List pages with: `ls ./original_jpg/PatientXXX_*.jpg` — files are named `PatientXXX_1.jpg`, `PatientXXX_2.jpg`, etc. Do NOT explore or search the directory in any other way.
2. For EACH page, one at a time:
   a. Read the single JPG image. Note its pixel dimensions (width x height).
   b. Transcribe everything into a structured plain-text file: `./scratch/_raw_PatientXXX_pageN.txt`
   c. Include ALL content: visit dates, patient details, medications, diagnoses, exam findings, lab values, instructions.
   d. Mark uncertain readings with `[?]`. Mark very uncertain readings with `[??]`.
   e. Note the image dimensions at top of file (e.g., `IMAGE: 1700x2366`)
   f. **Move on to the next page — do NOT keep the previous image in context.**

The images are pre-cropped JPGs (varying dimensions, typically around 1700x2366 pixels). Identity fields (name, AMKA, DOB, phone, address) are **redacted with magenta (#FF00FF) rectangles**. Do NOT attempt to read them — use `./id.json` for these values.

Use the same plain-text format as v8 (see example below), but prefix files with `_raw_` to distinguish from reviewed versions.

Example `./scratch/_raw_PatientXXX_page1.txt`:
```
IMAGE: 1700x2366
VISIT DATE: 15/03/2019
PATIENT: [REDACTED — from id.json]
DOB: [REDACTED — from id.json]
ADDRESS: [REDACTED — from id.json]
PHONE: [REDACTED — from id.json]
AMKA: [REDACTED — from id.json]
PROFESSION: [profession]
SMOKING: 20 τσιγ/ημ
ALCOHOL: Φ

REFERRAL: Από Δρ. [name]
PRESENTING ILLNESS: ΣΑΚΧΑΡΩΔΗΣ ΔΙΑΒΗΤΗΣ ΤΥΠΟΥ 2

CURRENT MEDICATION:
- METFORMIN 850mg x2
- LANTUS 20 IU

MEDICAL HISTORY:
① ΥΠΕΡΤΑΣΗ (2015)
② ΥΠΕΡΛΙΠΙΔΑΙΜΙΑ

FAMILY HISTORY:
Father: ΔΙΑΒΗΤΗΣ ΤΥΠ.2, ΕΜΦΡΑΓΜΑ
Mother: ΥΠΕΡΤΑΣΗ
Patient: see history

CLINICAL EXAM:
Weight: 95 Kgr
Height: 172 cm
BP: 140/85 mmHg
Pulse: 78/min
Heart: κφ
Lungs: κφ
Abdomen: κφ
Thyroid: κφ

LABS: [none this visit]

INSTRUCTIONS:
① Συνέχεια METFORMIN 850mg x2
② [?unclear instruction]
```

---

## PHASE 2: Medical Review Pass

**No images needed.** Read ALL `./scratch/_raw_PatientXXX_pageN.txt` files and `transcription_knowledge.json`, then perform a systematic review.

### 2a. Known Error Pattern Check

Cross-reference against the knowledge base:

| Error Pattern | What to Check |
|--------------|---------------|
| **Year confusion (2↔9)** | Any year that contains 2 or 9 — e.g., is "2019" actually "9019" or "2012" actually "9012"? Flag if the year doesn't make clinical sense for the patient's age. |
| **Known abbreviation misreads** | Check all abbreviations against `abbreviations.confirmed` in the knowledge base. Flag any that don't match. |
| **Medication name misspellings** | Check all drug names against `medication_names.seen`. Flag any that are close but don't match (e.g., METFORMIN vs ΜΕΤΦΟΡΜΙΝΗ). |
| **Previous correction patterns** | Check `corrections_log` for patterns that recurred. Apply same corrections proactively. |
| **Hallucination patterns** | Check `hallucination_warnings` — are there exam items or lab values that seem suspiciously "complete" or "typical"? If a value looks textbook-perfect, flag it for verification. |

### 2b. Medical Consistency Check

Look for internal contradictions or implausible content:

- **Diagnosis ↔ Medication mismatch**: e.g., diabetes diagnosis but no diabetes medication, or a medication listed that doesn't match any diagnosis
- **Lab value plausibility**: e.g., HbA1c > 20%, glucose < 0, TSH of 500 (possible but flag it)
- **Age ↔ Date consistency**: Does the stated age match the DOB and visit date?
- **Cross-page consistency**: Do demographics on page 1 match any references on later pages? Are medication lists consistent across visits (unless explicitly changed)?
- **Dosage plausibility**: Are medication dosages within normal therapeutic ranges?

### 2c. Formatting Standardization

- Ensure dates are consistently DD/MM/YYYY
- Ensure medication names use the same spelling throughout
- Ensure lab test names match standard Greek medical terminology
- Unify abbreviations (don't mix κφ and κ.φ. for the same meaning)

### 2d. Write Reviewed Output

For each page, write a reviewed version: `./scratch/_reviewed_PatientXXX_pageN.txt`

At the TOP of each reviewed file, include a review summary:
```
=== MEDICAL REVIEW SUMMARY ===
Corrections applied: N
Items flagged for doctor review: N
Confidence: HIGH / MEDIUM / LOW

CORRECTIONS:
- Line "METFORMIN 850mg x3" → "METFORMIN 850mg x2" (typical dosage is x2, x3 unusual — FLAGGED, kept as-is but marked uncertain)
- Year "9019" → "2019" (9↔2 confusion, patient age confirms 2019)

FLAGS FOR DOCTOR:
- Line "TSH: 0,05" — very low, suggests hyperthyroidism. Consistent with diagnosis? [VERIFY]
- Line "[?unclear instruction]" — could not resolve

CONFIDENCE NOTES:
- Page 1: HIGH confidence (clear handwriting, standard format)
- Page 2: MEDIUM confidence (several smudged areas, 3 uncertain readings)
=== END REVIEW ===
```

Then include the corrected transcription below (same format as Phase 1, with corrections applied and `[?]` markers updated).

---

## PHASE 3: Assemble and Generate

**No images needed.** Read all `./scratch/_reviewed_PatientXXX_pageN.txt` files.

### 3a. Copy the Template Script

The template is bundled with this plugin at:
```
${CLAUDE_PLUGIN_ROOT}/skills/endo-transcribe-v13/references/v13_template_generator.js
```

It is also available in the project repo at `./v13_template_generator.js`.

1. Read `./id.json` and extract the entry for this patient.
2. Copy template to `./scratch/create_patientXXX_v13.js`
3. Update the CONFIGURATION section:
   - `IMAGE_FILES`: paths and pixel dimensions for each page's JPG (from IMAGE: lines)
   - `OUTPUT_PATH`: set to `./transcribed/v13/PatientXXX_N_digitized_v13.docx`
   - `PATIENT_AMKA`: from `id.json`
4. Replace `transcriptionChildren` with content built from the REVIEWED notes (not the raw ones)
5. Insert identity fields from `id.json` (name, DOB, AMKA, phone, address) into the ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ section.
6. Leave the engine code unchanged.

### 3b. Build the Transcription Content

Convert the reviewed notes into the template's code format using the same helper functions:

#### Text Formatting Functions

| Function | Appearance | When to Use |
|----------|-----------|-------------|
| `normal("text")` | Black regular text | Default text |
| `bold("text")` | **Black bold** | Labels, field names |
| `italic("text")` | *Black italic* | Notes, references |
| `medical("text")` | **PURPLE UPPERCASE** | ALL disease names, conditions, anatomical terms |
| `drug("text")` | **PURPLE UPPERCASE** | ALL medication/drug names |
| `uncertain("text")` | RED [text?] | Handwriting you can't read clearly |
| `uncertainNum("text")` | RED text | Uncertain numbers or dates |
| `small("text")` | Smaller black text | Used inside tables |

#### Content Line Builders

```javascript
nLine([bold("Label: "), normal("some value"), medical("CONDITION")])
nLabelVal("Όνομα", "from id.json → name")
```

#### Section Layout

Build in this order:

| Row | Sections | Function |
|-----|----------|----------|
| 1 | ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ \| ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ | `twoBoxRow(...)` |
| 2 | ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ \| ΠΑΡΟΥΣΑ ΝΟΣΟΣ | `twoBoxRow(...)` |
| 3 | ΠΑΡΑΠΟΜΠΗ \| ΑΝΑΜΝΗΣΤΙΚΟ | `twoBoxRow(...)` |
| 4 | ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ | `threeBoxRow(...)` or `fourBoxRow(...)` |
| 5 | ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ | `fullWidthBox(...)` with `examTable(...)` |
| 6 | ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ | `fullWidthBox(...)` with `labTable(...)` |
| 7 | ΟΔΗΓΙΕΣ | `fullWidthBox(...)` |

For multiple visits: page break + new heading. For visit 2+, reference visit 1 for demographics.

For female patients, add ΓΥΝΑΙΚΟΛΟΓΙΚΟ ΙΣΤΟΡΙΚΟ after referral/history.

### 3c. Generate the Document

```bash
node ./scratch/create_patientXXX_v13.js
```

### 3d. Update Knowledge Base

Update `./transcription_knowledge.json` with:
- New medical terms, medications, abbreviations
- Any new error patterns discovered in Phase 2
- Uncertain readings in `transcription_stats`

---

## Rules

### Privacy & Redacted Fields
- **Identity fields (name, AMKA, DOB, phone, address) are redacted** in the source JPGs with **magenta (#FF00FF)** rectangles.
- **Do NOT attempt to read** any redacted field from the image. Always use `./id.json` for these values.
- `id.json` is stored locally only and never committed to version control.
- AMKA values in `id.json` are already masked (last 4 digits only).

### Transcription Accuracy
- **Cross-reference EVERY line against the image during Phase 1.** AI tends to hallucinate plausible exam items.
- Phase 2 is a second line of defense — it catches pattern-based errors but cannot verify against the image.
- Mark ALL uncertain readings in RED using `uncertain("text")` or `uncertainNum("text")`
- Year confusion: 2 and 9 look similar in this handwriting. Flag in red.
- Use confirmed abbreviations from the knowledge base.
- Keep all text in Greek. English only for medication names and some medical terms.
- Dates: European format DD/MM/YYYY

### Formatting
- ALL disease names → `medical("text")` (PURPLE + UPPERCASE + BOLD)
- ALL drug names → `drug("text")` (PURPLE + UPPERCASE + BOLD)
- ALL uncertain readings → `uncertain("text")` (RED + [text?] brackets)
- Section titles: BLUE (#2E75B6)
- Row numbers: GRAY (#999999) in Courier New

### Technical
- **Do NOT write docx code from scratch.** Copy `v13_template_generator.js` and adapt it.
- Image section MUST be a separate docx section (different margins: 0.5cm vs 2cm)
- Always use `fitToPage(imgW, imgH)` for image sizing — scales to fit within 750x1070 pixels
- **CRITICAL: The appended original scan images must NEVER be cropped.** The entire page must be visible.
- Use JPG for scans (not PNG)

## Known Abbreviations

| Abbreviation | Meaning |
|-------------|---------|
| κφ | κανονικά φυσιολογικά (normal) |
| ΦΤ | φυσιολογικές τιμές (normal range) |
| ΟΛΛ | Οξεία Λεμφοβλαστική Λευχαιμία (ALL) |
| ΤΑΚ | τακτικός (regular/normal) |
| ΑΝ | αναπνευστικό (respiratory) |
| Φ | Φυσιολογικό / negative / No |
| ΤΚΕ | Ταχύτητα Καθίζησης Ερυθρών (ESR) |
| Χρ. | Χρόνια (Chronic) |

See `transcription_knowledge.json` for the complete list.

## Timing and Cost Estimation

Record and report the following at the end of every transcription:

1. **Wall-clock time**: Note times at start of Phase 1, end of Phase 1, end of Phase 2, and end of Phase 3. Report total and per-phase.

2. **Token estimation**: V13 uses more tokens than v7 due to Phase 2.
   - **Phase 1 input**: Each JPG ≈ 1,600 tokens + instructions ≈ 3,000 tokens
   - **Phase 2 input**: All raw transcription texts + knowledge base ≈ 3,000-8,000 tokens
   - **Phase 3 input**: All reviewed texts + template ≈ 4,000-10,000 tokens
   - **Output**: Raw notes + reviewed notes + generator script ≈ 15,000-30,000 tokens total

3. **Cost estimation**:
   - **Claude Opus 4.6**: $15 / 1M input tokens, $75 / 1M output tokens
   - **Claude Sonnet 4.6**: $3 / 1M input tokens, $15 / 1M output tokens

Print a summary table at the end:
```
┌──────────────────────────────────────────────────┐
│ V13 TRANSCRIPTION SUMMARY                        │
├──────────────────────────────────────────────────┤
│ Patient:           PatientXXX                    │
│ Pages:             N                             │
│ Rows:              XX                            │
│ Phase 2 corrections: N                           │
│ Phase 2 flags:       N                           │
│ Phase 2 confidence:  HIGH/MEDIUM/LOW             │
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

## Reference Outputs

Examine existing v7 outputs for reference on formatting (v13 produces identical docx format):
- `./transcribed/v7/Patient004_1_digitized_v7.docx` — 88 rows, 2 visits, 1 page scan
- `./transcribed/v7/Patient005_1_digitized_v7.docx` — 112 rows, 2 visits, 2 page scan
