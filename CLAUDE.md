## Project Overview

- **Purpose**: Digitize and archive handwritten notes of a Greek Endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki)
- **Long-term goal**: Build a complete system/application this endocrinologist can use to both lookup old notes, as well as enter new notes from either a desktop app or an iPad/iPhone
- **Current phase**: Digitizing individual patient notes into structured Word documents using "Version 7" (v7) format.

## General Instructions

- **Only check into git repository when explicitly asked**
- **Do not use pip or uv pip to install ANYTHING — always ask the user to install manually**
- **Do not store any patient names. Convert names to a number/ID upon scanning (e.g. "Ασθενής 004")**
- The notes are in Greek. Keep all transcriptions in Greek. English words appear mostly for medications or medical terms.
- Dates are in European format (DD/MM/YYYY)
- AMKA numbers: mask all but last 4 digits (e.g. *******0891)

## How to Transcribe a New Patient — Step by Step

**This is the procedure. Follow it exactly.**

### Step 1: Setup

1. Install dependency if not already present: `npm install docx`
2. Read `transcription_knowledge.json` — it contains confirmed abbreviations, known misread patterns, corrections from previous patients, and medical term dictionary. USE THIS KNOWLEDGE to avoid repeating known mistakes.

### Step 2: Prepare the Source Image

- Source JPGs are in `original_jpg/` (full 1700x2366 resolution, converted from PDF via `pdftoppm -jpeg -jpegopt quality=95 -r 72`). There may also be manually cropped versions prefixed with `x` in `redacted/`.
- View the JPG image(s) to read the handwriting.
- Note the image dimensions — you'll need width and height in pixels for the image embedding step.

### Step 3: Copy and Adapt the Template Script

1. **Copy `v7_template_generator.js`** to a new file named `create_patientXXX_v7.js` (where XXX is the patient number)
2. Update the CONFIGURATION section at top:
   - `IMAGE_FILES`: set paths and pixel dimensions for each page's JPG
   - `OUTPUT_PATH`: set to `./transcribed/v7/PatientXXX_N_digitized_v7.docx`
   - `PATIENT_AMKA`: set masked AMKA or `"[Δεν καταγράφηκε]"`
3. Replace the `transcriptionChildren` array with actual transcribed content (see Step 4)

### Step 4: Transcribe the Handwriting

Read the JPG image and transcribe the content into the template's section structure. **Use the helper functions from the template — do NOT try to create docx elements from scratch.**

**Section order (matches doctor's consistent note structure):**

| Row | Sections (side by side) | Function |
|-----|------------------------|----------|
| 1 | ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ \| ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ | `twoBoxRow(...)` |
| 2 | ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ \| ΠΑΡΟΥΣΑ ΝΟΣΟΣ | `twoBoxRow(...)` |
| 3 | ΠΑΡΑΠΟΜΠΗ \| ΑΝΑΜΝΗΣΤΙΚΟ | `twoBoxRow(...)` |
| 4 | ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ (3 or 4 columns) | `threeBoxRow(...)` or `fourBoxRow(...)` |
| 5 | ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ | `fullWidthBox(...)` with `examTable(...)` |
| 6 | ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ | `fullWidthBox(...)` with `labTable(...)` |
| 7 | ΟΔΗΓΙΕΣ | `fullWidthBox(...)` |

**Color coding rules — critical for correct output:**
- `medical("text")` → PURPLE + UPPERCASE + BOLD — use for ALL disease names, medical conditions, anatomical terms
- `drug("text")` → PURPLE + UPPERCASE + BOLD — use for ALL medication/pharmaceutical names
- `uncertain("text")` → RED + [text?] brackets — use when handwriting is unclear
- `uncertainNum("text")` → RED (no brackets) — use for uncertain numbers/dates
- `normal("text")` → black regular text
- `bold("text")` → black bold text (use for labels)
- `nLine([...children])` → creates a numbered row with mixed formatting
- `nLabelVal("Label", "value")` → shortcut for "Label: Value" rows

**Multiple visits**: If the note contains more than one visit date, add each as a separate `ΕΠΙΣΚΕΨΗ N — DD/MM/YYYY` heading. For visit 2+, patient demographics can reference visit 1: `nLine([italic("Βλ. Επίσκεψη 1 (χωρίς αλλαγές)")])`.

### Step 5: Generate the Document

```bash
node create_patientXXX_v7.js
```

This produces the .docx in `transcribed/v7/`. The script automatically:
- Numbers all content rows sequentially (01, 02, ...)
- Appends original scan image(s) as full-page images in a separate docx section
- Applies fit-to-page scaling to images
- Adds page numbers in footer

### Step 6: Update Knowledge Base

After transcription, update `transcription_knowledge.json`:
- Add any new medical terms to `common_medical_terms`
- Add any new medications to `medication_names.seen`
- Add any new confirmed abbreviations
- Log uncertain readings in `transcription_stats`
- Note any new handwriting patterns

## Folder Structure

```
AA_Endo/
├── CLAUDE.md                              # This file — project instructions
├── v7_template_generator.js               # TEMPLATE SCRIPT — copy this for each new patient
├── transcription_knowledge.json           # Knowledge base — READ BEFORE EVERY TRANSCRIPTION
├── original/                              # Original scanned PDFs
├── original_jpg/                          # Full-resolution JPGs (1700x2366, quality 95)
│   ├── Patient001_1.jpg ... Patient001_5.jpg
│   ├── Patient002_1.jpg, Patient002_2.jpg
│   ├── Patient003_3.jpg
│   ├── Patient004_1.jpg
│   └── Patient005_1.jpg, Patient005_2.jpg
├── transcribed/
│   ├── v0/ through v6/                    # Superseded — ignore
│   └── v7/                                # Current production format
│       ├── Patient004_1_digitized_v7.docx # 88 rows, 2 visits — reference output
│       └── Patient005_1_digitized_v7.docx # 112 rows, 2 visits — reference output
├── Patient004_1_digitized_v3.pdf          # Legacy
└── xPatient004_digitized_gpt54_v1.docx    # ChatGPT comparison (poor quality)
```

## PDF to JPG Conversion

- Native resolution: 1700x2366 pixels, 72 DPI
- **Do NOT use `pdfimages`** — it ignores the PDF's rotation transform and produces upside-down images
- Correct command: `pdftoppm -jpeg -jpegopt quality=95 -r 72 -singlefile input.pdf output_prefix`

## Knowledge Base

`transcription_knowledge.json` contains everything learned from previous transcriptions:

- **abbreviations.confirmed**: e.g. κφ = κανονικά φυσιολογικά, ΦΤ = φυσιολογικές τιμές
- **handwriting_patterns.confirmed**: e.g. year 2↔9 confusion, ΕΜΜΗΝΟΠΑΥΣΗ misread patterns
- **hallucination_warnings**: Cases where AI generated exam items NOT in the original scan — cross-reference every line against the image
- **corrections_log**: Row-by-row corrections from doctor review of Patient004
- **common_medical_terms**: Greek→English medical dictionary (60+ terms)
- **medication_names**: Running list of drugs seen in notes

## Correction Workflow

1. Doctor reviews .docx output
2. Doctor provides corrections as "Row XX: X should be Y"
3. Corrections added to `transcription_knowledge.json` under `corrections_log`
4. Knowledge improves accuracy of future transcriptions
5. Uncertain readings (red `[text?]`) are priority items for doctor review

## Patients Status

| Patient | Pages | v7 Status | Doctor Review |
|---------|-------|-----------|---------------|
| 001 | 5 | **Not started** | No |
| 002 | 2 | **Not started** | No |
| 003 | 1 | **Not started** | No |
| 004 | 1 | **v7 complete** (88 rows, 2 visits) | Partial (rows 1-38) |
| 005 | 2 | **v7 complete** (112 rows, 2 visits) | No |

## Critical Lessons (Do Not Ignore)

1. **Hallucination risk**: AI sometimes generates plausible exam items NOT in the scan. Cross-reference EVERY line against the image.
2. **Year confusion**: 2 and 9 look similar in this handwriting. Flag uncertain years in red.
3. **Use the template script**: Do NOT write docx generation code from scratch. Copy `v7_template_generator.js` and adapt it. The template contains all the exact formatting, sizing, and structure that took many iterations to get right.
4. **Image embedding requires separate docx section**: Transcription uses 2cm margins, appended scans use 0.5cm margins. These MUST be in different docx sections.
5. **Fit-to-page**: Always use `fitToPage(imgW, imgH)` for image sizing — checks both width and height constraints.
6. **JPG for scans**: JPG at quality 75-95 is 7x smaller than PNG with no visible loss.
7. **Patient names**: Always redact. Use "Ασθενής XXX" format.
