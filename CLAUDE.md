## Project Overview

Digitize handwritten notes of a Greek endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki) into structured Word documents (.docx).

Long-term goal: a system the doctor can use to look up old notes and enter new ones from desktop or iPad/iPhone. Current phase: transcribing existing patient notes.

## General Rules

- Only check into git when explicitly asked
- Do not use pip or uv pip — ask the user to install manually
- All text in Greek. English only for medication names and some medical terms
- Dates in European format (DD/MM/YYYY)
- Intermediate/scratch files go in `./scratch/` (gitignored)
- Each transcription run is fully independent. Do NOT read output from previous runs or other versions

## Patient Identity — Redacted

Source JPGs have identity fields (name, AMKA, DOB, phone, address) covered with **magenta (#FF00FF) rectangles**. Do NOT read them from the image. Use `./id.json` for synthetic replacement values indexed by PatientXXX.

## Folder Structure

```
AA_Endo/
├── CLAUDE.md                          # This file
├── id.json                            # Synthetic patient identities (gitignored)
├── templates/                         # Lab panel definitions (CBC, Lipids, Thyroid, etc.)
├── original/                          # Original scanned PDFs
├── original_jpg/                      # Pre-cropped JPGs, identity fields magenta-redacted
├── transcribed/                       # Final .docx output, one subfolder per version (v7/, v8/, etc.)
├── scratch/                           # Temp files (gitignored)
├── endo-transcribe.plugin             # Packaged Cowork plugin
└── .skills/                           # Skill development (each version is self-contained)
    └── endo-transcribe-vN/
        ├── SKILL.md                   # Version's full workflow instructions
        └── references/
            └── vN_template_generator.js   # Version's own docx formatting engine
```

## original_jpg file

Are orginized by patient number (Patient001, Patient002 etc). Each patient may have multiple pages/jpegs of notes denoted by Patient{ID}_{N}.jpg

### **Always process one jpg image at a time**

## Version Independence

Multiple skill versions exist (v7, v8, v9, v10, etc.). Each is self-contained with its own SKILL.md and template generator. When a version is invoked, follow ONLY that version's SKILL.md. Do not mix instructions from other versions or from this file's methodology. This file defines the project context and the shared output format — the skill defines the workflow.

## Shared Output Format — .docx Structure

All versions produce the same docx layout. This is defined here once; individual skills should not redefine it.

### Text Formatting Functions

| Function | Appearance | When to Use |
|----------|-----------|-------------|
| `normal("text")` | Black regular | Default text |
| `bold("text")` | **Black bold** | Labels, field names |
| `italic("text")` | *Black italic* | Notes, references |
| `medical("text")` | **PURPLE UPPERCASE BOLD** | ALL disease names, conditions, anatomical terms |
| `drug("text")` | **PURPLE UPPERCASE BOLD** | ALL medication/drug names |
| `uncertain("text")` | RED [text?] | Unclear handwriting |
| `uncertainNum("text")` | RED (no brackets) | Uncertain numbers/dates |
| `small("text")` | Smaller black | Inside tables |

### Line Builders

- `nLine([bold("Label: "), normal("value"), medical("CONDITION")])` — numbered row with mixed formatting
- `nLabelVal("Label", "value")` — shortcut for "Label: value" rows

### Section Layout (matches doctor's consistent note structure)

| # | Sections | Layout Function |
|---|----------|----------------|
| 1 | ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ \| ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ | `twoBoxRow(...)` |
| 2 | ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ \| ΠΑΡΟΥΣΑ ΝΟΣΟΣ | `twoBoxRow(...)` |
| 3 | ΠΑΡΑΠΟΜΠΗ \| ΑΝΑΜΝΗΣΤΙΚΟ | `twoBoxRow(...)` |
| 4 | ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ | `threeBoxRow(...)` or `fourBoxRow(...)` |
| 5 | ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ | `fullWidthBox(...)` with `examTable(...)` |
| 6 | ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ | `fullWidthBox(...)` with `labTable(...)` |
| 7 | ΟΔΗΓΙΕΣ | `fullWidthBox(...)` |

For female patients, add ΓΥΝΑΙΚΟΛΟΓΙΚΟ ΙΣΤΟΡΙΚΟ after row 3.

Multiple visits: page break + `ΕΠΙΣΚΕΨΗ N — DD/MM/YYYY` heading. Visit 2+ references visit 1 for demographics.

### Section Colors

- Section titles: BLUE (#2E75B6)
- Row numbers: GRAY (#999999), Courier New font

### Document Sections (margins)

The docx has two sections with different margins:
- Transcription content: 2cm margins
- Appended original scan images: 0.5cm margins (separate docx section)

Use `fitToPage(imgW, imgH)` for image sizing. Original scans must never be cropped. Use JPG format.

### Structural Rules

- `nLine()` and `nLabelVal()` return Paragraph objects. NEVER wrap them in `new Paragraph(...)` — this nests paragraphs and corrupts the docx.
- The template generator includes `validateDocStructure()` which catches nesting errors before generation.

### General fules

  "formatting_rules": {
    "medical_terms": "PURPLE (#7B2D8E) + UPPERCASE — all disease names, conditions, medical terms",
    "drug_names": "PURPLE (#7B2D8E) + UPPERCASE — all pharmaceutical/medication names",
    "uncertain_text": "RED (#CC0000) + [text?] — words not recognized or not in dictionary",
    "uncertain_numbers": "RED (#CC0000) — any number not 99% certain",
    "phone_format": "XXXX XXX XXX (e.g. 6981 597 086)",
    "amka_format": "Mask all but last 4 digits (e.g. *******0891)"
  },

   "doctor_profile": {
    "name": "Dr. Dimitrios G. Bougiouklis",
    "specialty": "Endocrinologist / Diabetologist",
    "location": "Thessaloniki",
    "note_language": "Greek with English medical terms",
    "date_format": "DD/MM/YYYY"
  },

## Summary Report

Print this at the end of every transcription run (adjust fields to match the version's phases):

```
┌──────────────────────────────────────────────────┐
│ VN TRANSCRIPTION SUMMARY                         │
├──────────────────────────────────────────────────┤
│ Patient:           PatientXXX                    │
│ Pages:             N                             │
│ Rows:              XX                            │
│ Visits:            N                             │
├──────────────────────────────────────────────────┤
│ Phase timing (version-specific phases here)      │
│ Total elapsed:        X min Y sec               │
├──────────────────────────────────────────────────┤
│ Est. input tokens:    ~XX,XXX                    │
│ Est. output tokens:   ~XX,XXX                    │
│ Est. cost (Opus 4.6):   $X.XX                   │
│ Est. cost (Sonnet 4.6): $X.XX                   │
└──────────────────────────────────────────────────┘
```
