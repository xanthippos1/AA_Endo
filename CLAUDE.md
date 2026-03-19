## Project Overview

- **Purpose**: Digitize and archive handwritten notes of a Greek Endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki)
- **Long-term goal**: Build a complete system/application this endocrinologist can use to both lookup old notes, as well as enter new notes from either a desktop app or an iPad/iPhone
- **Current phase**: Digitizing individual patient notes into structured Word documents. The recommended transcription method is **v10** (lab-panel-aware, 3-phase pipeline). Use the `endo-transcribe-v10` skill.

## General Instructions

- **Only check into git repository when explicitly asked**
- **Do not use pip or uv pip to install ANYTHING — always ask the user to install manually**
- **Patient identity fields (name, AMKA, DOB, phone, address) are redacted** in the source JPGs with **magenta (#FF00FF)** rectangles. Do NOT attempt to read them from the image. Instead, use `./id.json` which contains synthetic replacement values indexed by PatientXXX.
- The notes are in Greek. Keep all transcriptions in Greek. English words appear mostly for medications or medical terms.
- Dates are in European format (DD/MM/YYYY)
- All intermediate/scratch files go in `./scratch/` (gitignored)

## How to Transcribe a New Patient

**Use the `endo-transcribe-v10` skill.** It handles the entire workflow end-to-end. The user only needs to provide a patient ID (e.g., "transcribe Patient004 v10").

The skill's 3-phase pipeline:

1. **Phase 1 — Transcribe**: Read source JPGs one page at a time, applying lab panel templates for OCR correction. Output: `./scratch/_notes_PatientXXX_pageN.txt`
2. **Phase 2 — Review**: Panel-guided medical review of the transcription. Group lab results by panel, validate against plausible ranges, flag uncertainties. Output: `./scratch/_reviewed_PatientXXX.txt`
3. **Phase 3 — Assemble**: Copy `./scripts/v10_template_generator.js` to `./scratch/`, populate with reviewed transcription + identity data from `id.json`, generate .docx. Output: `./transcribed/v10/PatientXXX_N_digitized_v10.docx`

### Key inputs the skill reads (and ONLY these):

| Input | Purpose |
|-------|---------|
| `./original_jpg/PatientXXX_N.jpg` | Source scan images |
| `./id.json` | Synthetic patient identity (name, AMKA, DOB, phone, address) |
| `./transcription_knowledge.json` | General knowledge base (abbreviations, handwriting patterns, medical terms, medication names) |
| `./templates/*.json` | Lab panel definitions (test names, units, ranges, OCR traps) |
| `./scripts/v10_template_generator.js` | Template script — copied to scratch and adapted per patient |

**No other inputs.** The skill does NOT read output from any previous transcription run, any previous version's output, or any patient-specific stats. Each run is fully independent.

### Color coding rules — critical for correct output:
- `medical("text")` → PURPLE + UPPERCASE + BOLD — ALL disease names, medical conditions, anatomical terms
- `drug("text")` → PURPLE + UPPERCASE + BOLD — ALL medication/pharmaceutical names
- `uncertain("text")` → RED + [text?] brackets — unclear handwriting
- `uncertainNum("text")` → RED (no brackets) — uncertain numbers/dates
- `normal("text")` → black regular text
- `bold("text")` → black bold text (labels)
- `nLine([...children])` → numbered row with mixed formatting
- `nLabelVal("Label", "value")` → shortcut for "Label: Value" rows

### Section order (matches doctor's consistent note structure):

| Row | Sections (side by side) | Function |
|-----|------------------------|----------|
| 1 | ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ \| ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ | `twoBoxRow(...)` |
| 2 | ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ \| ΠΑΡΟΥΣΑ ΝΟΣΟΣ | `twoBoxRow(...)` |
| 3 | ΠΑΡΑΠΟΜΠΗ \| ΑΝΑΜΝΗΣΤΙΚΟ | `twoBoxRow(...)` |
| 4 | ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ (3 or 4 columns) | `threeBoxRow(...)` or `fourBoxRow(...)` |
| 5 | ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ | `fullWidthBox(...)` with `examTable(...)` |
| 6 | ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ | `fullWidthBox(...)` with `labTable(...)` |
| 7 | ΟΔΗΓΙΕΣ | `fullWidthBox(...)` |

**Multiple visits**: If the note contains more than one visit date, add each as a separate `ΕΠΙΣΚΕΨΗ N — DD/MM/YYYY` heading.

## Folder Structure

```
AA_Endo/
├── CLAUDE.md                              # This file — project instructions
├── INSTALL.md                             # Setup guide for new team members
├── id.json                                # Synthetic patient identities (local only, gitignored)
├── transcription_knowledge.json           # Knowledge base — general, patient-agnostic only
├── scripts/                               # Template generator scripts (permanent, updated with skills)
│   └── v10_template_generator.js          # Copy to scratch/ for each patient
├── templates/                             # Lab panel definitions (CBC, Lipids, Thyroid, etc.)
├── original/                              # Original scanned PDFs
├── original_jpg/                          # Pre-cropped JPGs, identity fields magenta-redacted
│   ├── Patient001_1.jpg ... Patient001_5.jpg
│   ├── Patient002_1.jpg, Patient002_2.jpg
│   ├── Patient003_3.jpg
│   ├── Patient004_1.jpg
│   └── Patient005_1.jpg, Patient005_2.jpg
├── transcribed/
│   └── v10/                               # Final .docx output
├── scratch/                               # Intermediate files (gitignored)
├── endo-transcribe.plugin                 # Cowork plugin (install into Cowork)
└── .skills/                               # Repo-local skill copies
```

## PDF to JPG Conversion

- Native resolution: 1700x2366 pixels, 72 DPI
- **Do NOT use `pdfimages`** — it ignores the PDF's rotation transform and produces upside-down images
- Correct command: `pdftoppm -jpeg -jpegopt quality=95 -r 72 -singlefile input.pdf output_prefix`

## Knowledge Base

`transcription_knowledge.json` contains **general, patient-agnostic** knowledge only:

- **abbreviations.confirmed**: e.g. κφ = κανονικά φυσιολογικά, ΦΤ = φυσιολογικές τιμές
- **handwriting_patterns.confirmed**: e.g. year 2↔9 confusion, ΕΜΜΗΝΟΠΑΥΣΗ misread patterns
- **hallucination_warnings**: Cases where AI generated exam items NOT in the original scan
- **omission_warnings**: Patterns where AI tends to skip content (e.g. dense lab blocks at page bottom)
- **common_medical_terms**: Greek→English medical dictionary (60+ terms)
- **medication_names**: Running list of drugs seen in notes

No patient-specific data, per-run stats, or value corrections belong in the knowledge base.

## Correction Workflow

1. Doctor reviews .docx output
2. Doctor provides corrections as "Row XX: X should be Y"
3. General patterns from corrections (e.g. handwriting quirks, new abbreviations) are added to the relevant KB section
4. Patient-specific corrections are NOT stored — only the general lesson is extracted
5. Uncertain readings (red `[text?]`) are priority items for doctor review

## Critical Lessons (Do Not Ignore)

1. **Hallucination risk**: AI sometimes generates plausible exam items NOT in the scan. Cross-reference EVERY line against the image.
2. **Year confusion**: 2 and 9 look similar in this handwriting. Flag uncertain years in red.
3. **Use the template script**: Do NOT write docx generation code from scratch. Copy `./scripts/v10_template_generator.js` and adapt it. The template contains all the exact formatting, sizing, and structure that took many iterations to get right.
4. **Image embedding requires separate docx section**: Transcription uses 2cm margins, appended scans use 0.5cm margins. These MUST be in different docx sections.
5. **Fit-to-page**: Always use `fitToPage(imgW, imgH)` for image sizing — checks both width and height constraints.
6. **JPG for scans**: JPG at quality 75-95 is 7x smaller than PNG with no visible loss.
7. **Patient identity**: Redacted with magenta in JPGs. Always use `./id.json` for name, AMKA, DOB, phone, address.
8. **NEVER nest Paragraphs**: `nLine()`, `nLabelVal()` return `Paragraph` objects. NEVER wrap them in `new Paragraph({children: [nLine(...)]})` — this creates paragraph-inside-paragraph which produces a corrupt .docx that Word refuses to open. Use `nLine(...)` directly as a content item in `fullWidthBox()` arrays.
9. **Structural validation**: The template includes a `validateDocStructure()` function that runs automatically before generating. If it finds nesting errors, it will print the exact location and exit with FATAL. Fix all errors before retrying.
10. **Turnkey isolation**: Each transcription run is fully independent. Do NOT read output from previous runs, other version outputs, or patient-specific stats. Only inputs are: source JPGs, id.json, the knowledge base (general only), lab panel templates, and the template script.
