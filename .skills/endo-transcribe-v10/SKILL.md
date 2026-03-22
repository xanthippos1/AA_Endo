---
name: endo-transcribe-v10
description: |
  Render pre-transcribed Greek endocrinologist notes into structured Word documents (.docx). Use this skill when the user says "v10" or "render Patient001 v10". v10 takes already-transcribed text (from Gemini or other source) in `./gemini_response/PatientXXX_N_gemini31.txt` and renders it into the standard formatted docx. No image reading or OCR — just text-to-document rendering. 2-phase: parse input text, then assemble docx.
---

# Endocrinologist Note Rendering — v10 Format (2-Phase)

Render pre-transcribed medical notes into structured Word documents. The input is already-transcribed Greek text — **no image reading, no OCR, no vision work**.

**V10 vs V9**: The only additional I want V10 to have compared to V9 is to store all the data that is beiong read from the transcipt in an otganized data structure (and not just in the docx file). 

## Invocation

The user gives a patient ID like `Patient004` and specifies v10. The job:

1. Read the pre-transcribed text from `./gemini_response/`
2. Parse and map the content to the standard section structure (Phase 1)
3. Assemble the formatted docx using the template generator (Phase 2)
4. (NEW TO V10) Also store all the data in a data structure that mirrors the structure in the docx file. decide on the best data structure for this. ultuimately this data will need to be transformed by another process and ingested into a database for use by the app. so this is meant to be temporary staging of the data extracted from the gemini transcript.
  - patient demographics (identity fields are redacted),  social/lifestyle, current medication, presenting illness, referal, medical history, family history (mother, father, sibligs etc)
  - visit/exam/email (date)
    - clinical exam (optional)
    - lab results (optional) - broken up further by lab type
    - instructions
  - visit/exam/email (date)
    - clinical exam (optional)
    - lab results (optional) - broken up further by lab type
    - instructions
  - etc...
  - any alternate fields

## Setup

```bash
npm install docx  # if not already installed
```

Read BEFORE starting:
- `./id.json` — synthetic patient identity data (name, AMKA, DOB, phone, address) indexed by PatientXXX. The transcribed text has redacted identity fields (marked as `[Διαγραμμένο]` or similar). Replace them with values from this file.

## Input Format

The input file is at: `./gemini_response/PatientXXX_1_gemini31.txt`

It is a markdown-formatted transcription with sections like:
- `### ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ` — patient demographics (identity fields are redacted)
- `### ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ ΙΣΤΟΡΙΚΟ` — social/lifestyle
- `### ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ` — current medication
- `### ΠΑΡΟΥΣΑ ΝΟΣΟΣ` — presenting illness
- `### ΠΑΡΑΠΟΜΠΗ` — referral
- `### ΑΤΟΜΙΚΟ ΑΝΑΜΝΗΣΤΙΚΟ` — medical history
- `### ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ` — family history
- `### ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ` — clinical exam
- `### ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ` — lab results (markdown table)
- `### ΟΔΗΓΙΕΣ` — instructions

The text may also contain visit dates (`ΕΠΙΣΚΕΨΗ 1 — DD/MM/YYYY`), AMKA values, and doctor letterhead info. Multiple visits may be present.

---

## PHASE 1: Parse Input Text

1. Read `./gemini_response/PatientXXX_1_gemini31.txt`
2. Read `./id.json` and extract the entry for this patient
3. Identify all sections and map them to the standard 7-section layout:

| Row | Target Section | Source in Gemini text |
|-----|---------------|----------------------|
| 1 | ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ \| ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ | Demographics table + Social history |
| 2 | ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ \| ΠΑΡΟΥΣΑ ΝΟΣΟΣ | Current medication + Presenting illness |
| 3 | ΠΑΡΑΠΟΜΠΗ \| ΑΝΑΜΝΗΣΤΙΚΟ | Referral + Medical history |
| 4 | ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ | Family history (split into Father/Mother/Patient columns) |
| 5 | ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ | Clinical exam findings |
| 6 | ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ | Lab results table |
| 7 | ΟΔΗΓΙΕΣ | Instructions/orders |

4. Replace redacted identity fields (`[Διαγραμμένο]`, `[Διαγραμμένο στο πρωτότυπο]`) with values from `id.json`
5. Identify which terms are medical conditions (→ `medical()`) and which are drug names (→ `drug()`)
6. Note any items marked uncertain or unclear in the source text (→ `uncertain()`)
7. Determine the original JPG files for this patient: `ls ./original_jpg/PatientXXX_*.jpg` — these get appended to the docx as reference scans. Note their pixel dimensions.

---

## PHASE 2: Assemble and Generate

### 2a. Copy the Template Script

The template generator is at:
```
${CLAUDE_PLUGIN_ROOT}/skills/endo-transcribe-v10/references/v10_template_generator.js
```

Also available at: `./.skills/endo-transcribe-v10/references/v10_template_generator.js`

1. Copy template to `./scratch/create_patientXXX_v10.js`
2. Update the CONFIGURATION section:
   - `IMAGE_FILES`: paths and pixel dimensions for each JPG (for appending scans)
   - `OUTPUT_PATH`: set to `./transcribed/v10/PatientXXX_N_digitized_v10.docx`
   - `PATIENT_AMKA`: from `id.json`
3. Replace `transcriptionChildren` with content built from the parsed input
4. Insert identity fields from `id.json` into the ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ section
5. Leave the engine code unchanged

### 2b. Build the Transcription Content

Use the template's helper functions — see CLAUDE.md for the full reference of text formatting functions (`normal()`, `bold()`, `medical()`, `drug()`, `uncertain()`, etc.), line builders (`nLine()`, `nLabelVal()`), and layout functions (`twoBoxRow()`, `threeBoxRow()`, `fullWidthBox()`, `examTable()`, `labTable()`).

Key formatting rules:
- ALL disease/condition names → `medical("text")` — renders as PURPLE UPPERCASE BOLD
- ALL drug/medication names → `drug("text")` — renders as PURPLE UPPERCASE BOLD
- Any uncertain readings from the source → `uncertain("text")` — renders as RED with [text?]
- Section titles: BLUE
- Row numbers: GRAY, Courier New

### 2c. Generate the Document

```bash
node ./scratch/create_patientXXX_v10.js
```

Verify the output file exists and report row count + file size.


### 2d. Generate the data file

Key rule: keep the same organization as the docx file. The idea is to create that data structure as we are processing the gemini transcript and as the docx file is being created. That way the data is already in a convenient format to be ingested into a back-end database for the application.
- output location: `./data/Patient004_1_data.v10.json`
- example: `./example_data_template.json`
---

## Rules

### Identity Fields
- The input text has redacted identity fields. Always replace with values from `./id.json`.
- AMKA values in `id.json` are already masked (last 4 digits only).

### No Image Reading
- v10 does NOT read or transcribe from images. The input is pre-transcribed text only.
- Original JPG scans ARE appended to the docx as reference, but never read for content.

### Formatting
- Follow all formatting rules defined in CLAUDE.md (Shared Output Format section).
- ALL disease names → `medical()`, ALL drug names → `drug()`, ALL uncertain → `uncertain()`

### Technical
- **Do NOT write docx code from scratch.** Copy `v10_template_generator.js` and adapt it.
- `nLine()` and `nLabelVal()` return Paragraph objects. NEVER wrap them in `new Paragraph(...)`.
- Image section MUST be a separate docx section (0.5cm margins vs 2cm for content).
- Use `fitToPage(imgW, imgH)` for image sizing. Original scans must never be cropped. Use JPG format.

## Timing and Cost Estimation

Print a summary at the end:
```
┌──────────────────────────────────────────────────┐
│ v10 RENDERING SUMMARY                             │
├──────────────────────────────────────────────────┤
│ Patient:           PatientXXX                    │
│ Rows:              XX                            │
│ Visits:            N                             │
├──────────────────────────────────────────────────┤
│ Phase 1 (parse):     X min Y sec                │
│ Phase 2 (assemble):  X min Y sec                │
│ Total elapsed:       X min Y sec                │
├──────────────────────────────────────────────────┤
│ Est. input tokens:    ~XX,XXX                    │
│ Est. output tokens:   ~XX,XXX                    │
│ Est. cost (Opus 4.6):   $X.XX                   │
│ Est. cost (Sonnet 4.6): $X.XX                   │
└──────────────────────────────────────────────────┘
```
