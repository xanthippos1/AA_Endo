# Project Organization — AA_Endo

## Inputs

| Input | Path | Purpose |
|-------|------|---------|
| Source scans | `./original_jpg/PatientXXX_N.jpg` | Handwritten Greek notes. Identity fields redacted with magenta (#FF00FF). |
| Patient identity | `./id.json` | Synthetic name, DOB, AMKA, phone, address keyed by PatientXXX. Use instead of reading magenta areas. |
| Knowledge base | `./transcription_knowledge.json` | Abbreviations, handwriting traps, medical terms, drug names. General/patient-agnostic only. |
| Lab panels | `./templates/*.json` | 20 panel files (CBC, Thyroid, Lipids, etc.) with test names, alt names, units, ranges, OCR traps. |
| Template script | `./scripts/v11_template_generator.js` | Docx builder — copy to `./scratch/` and populate. Never write docx code from scratch. |

## Outputs

| Output | Path |
|--------|------|
| Final docx | `./transcribed/v11/PatientXXX_digitized_v11.docx` |
| Run summary | `./summary/PatientXXX_v11.txt` |

## Scratch (intermediate files, gitignored)

All temp files go in `./scratch/`. Naming conventions:

- `_notes_PatientXXX_pageN.txt` — raw transcription per page
- `_reviewed_PatientXXX.txt` — corrected/merged text
- `create_patientXXX_v11.js` — generated assembly script

## Doctor's Note Structure

Sections always appear in this order per visit:

1. Personal Info: ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ | ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ
2. ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ | ΠΑΡΟΥΣΑ ΝΟΣΟΣ | ΠΑΡΑΠΟΜΠΗ | ΑΝΑΜΝΗΣΤΙΚΟ
3. ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ (3–4 columns)
4. Visits
  a. ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ
  b. ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ
  c. ΟΔΗΓΙΕΣ
  d. Prescriptions

Multiple visits → separate `ΕΠΙΣΚΕΨΗ N — DD/MM/YYYY` headings.

## Hard Rules

1. Each run is fully independent — never read previous run output.
2. Identity from `id.json` only — never read magenta areas.
3. Knowledge base stays patient-agnostic.
4. Use template script — never hand-write docx code.
5. Scratch for intermediates — never temp files in root.
6. No pip/uv installs — ask user. No git commits unless asked.
