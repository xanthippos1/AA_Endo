## Project Overview

- **Purpose**: Digitize and archive handwritten notes of a Greek Endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki)
- **Long-term goal**: Build a complete system/application this endocrinologist can use to both lookup old notes, as well as enter new notes from either a desktop app or an iPad/iPhone
- **Current phase**: Transcribing individual patient notes into structured Word documents.

## General Instructions

- **Only check into git repository when explicitly asked**
- **Do not use pip or uv pip to install ANYTHING — always ask the user to install manually**
- **Patient identity fields (name, AMKA, DOB, phone, address) are redacted** in the source JPGs with **magenta (#FF00FF)** rectangles. Do NOT attempt to read them from the image. Instead, use `./id.json` which contains synthetic replacement values indexed by PatientXXX.
- The notes are in Greek. Keep all transcriptions in Greek. English words appear mostly for medications or medical terms.
- Dates are in European format (DD/MM/YYYY)
- All intermediate/scratch files go in `./scratch/` (gitignored)

## How to Transcribe a New Patient - Phases

Unknown. Figure it out. See skill.

## Create summary report at the end of processing

┌──────────────────────────────────────────────────┐
│ VX TRANSCRIPTION SUMMARY                         │
├──────────────────────────────────────────────────┤
│ Patient:           Patient004                    │
│ Pages:             1                             │
│ Rows:              89                            │
│ Visits:            2 (3/4/23 + 12/4/23 email)   │
│ Phase 2 corrections: 7                           │
│ Phase 2 flags:       12                          │
│ Phase 2 confidence:  MEDIUM                      │
├──────────────────────────────────────────────────┤
│ Phase 1 (transcribe): ~8.7 min                   │
│ Phase 2 (review):     ~1.3 min                   │
│ Phase 3 (assemble):   ~2.5 min                   │
│ Total elapsed:        ~12.5 min                  │
├──────────────────────────────────────────────────┤
│ Est. input tokens:    ~15,000                    │
│ Est. output tokens:   ~20,000                    │
│ Est. cost (Opus 4.6):   ~$0.52                   │
│ Est. cost (Sonnet 4.6): ~$0.11                   │
└──────────────────────────────────────────────────┘

### Key inputs the skill reads (and ONLY these):

| Input | Purpose |
|-------|---------|
| `./original_jpg/PatientXXX_N.jpg` | Source scan images |
| `./id.json` | Synthetic patient identity (name, AMKA, DOB, phone, address) |
| `./transcription_knowledge.json` | General knowledge base (abbreviations, handwriting patterns, medical terms, medication names) |
| `./templates/*.json` | Lab panel definitions (test names, units, ranges, OCR traps) |
| `.skills/<version>/references/vN_template_generator.js` | Template script bundled with each skill version — copied to scratch/ and populated with patient data during assembly |

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

- Peronal information (ID, Name, Address, Phone, Occupation, Smoking, Alcohol, Alergies, Treatment, Refferal, Current Ailment/Disease)
- Family History
- Exam 1 (date on right)
    - Clinical Exam (ΚΛΙΝ. ΕΞΕΤΑΣΗ) (date on left)
    - Lab results (ΕΡΓΑΣΤΗΡΙΟ) (date on left)
    - Intructions (ΟΔΗΓΙΕΣ) (date on left)
    - (one or more of the above might be missing)
- Exam 2
    - Clinical Exam (ΚΛΙΝ. ΕΞΕΤΑΣΗ)
    - Lab results (ΕΡΓΑΣΤΗΡΙΟ)
    - Intructions (ΟΔΗΓΙΕΣ)

**Multiple visits**: If the note contains more than one visit date, add each as a separate `ΕΠΙΣΚΕΨΗ N — DD/MM/YYYY` heading.

## Folder Structure

```
AA_Endo/
├── CLAUDE.md                              # This file — project instructions
├── INSTALL.md                             # Setup guide for new team members
├── id.json                                # Synthetic patient identities (local only, gitignored)
├── transcription_knowledge.json           # Knowledge base — general, patient-agnostic only
├── templates/                             # Lab panel definitions (CBC, Lipids, Thyroid, etc.)
├── original/                              # Original scanned PDFs
├── original_jpg/                          # Pre-cropped JPGs, identity fields magenta-redacted
│   ├── Patient001_1.jpg ... Patient001_5.jpg
│   ├── Patient002_1.jpg, Patient002_2.jpg
│   ├── Patient003_3.jpg
│   ├── Patient004_1.jpg
│   └── Patient005_1.jpg, Patient005_2.jpg
├── transcribed/                           # Final .docx output, one subfolder per version
│   ├── v7/
│   ├── v8/
│   └── v10/
├── scratch/                               # Intermediate files (gitignored)
├── endo-transcribe.plugin                 # Cowork plugin (install into Cowork)
└── .skills/                               # Repo-local skill development (mirrors plugin structure)
    ├── endo-transcribe/                   # v7 — basic transcription
    │   ├── SKILL.md
    │   └── references/v7_template_generator.js
    ├── endo-transcribe-v8/                # v8 — 3-phase with medical review (proven best)
    │   ├── SKILL.md
    │   └── references/v8_template_generator.js
    ├── endo-transcribe-v9/                # v9 — fusion (Google Vision + Claude)
    │   ├── SKILL.md
    │   └── references/v9_template_generator.js
    └── endo-transcribe-v10/               # v10 — lab-panel-aware (biased reads — use with caution)
        ├── SKILL.md
        └── references/v10_template_generator.js
```

## Knowledge Base

`transcription_knowledge.json` contains **general, patient-agnostic** knowledge only:

- **abbreviations.confirmed**: e.g. κφ = κανονικά φυσιολογικά, ΦΤ = φυσιολογικές τιμές
- **hallucination_warnings**: Cases where AI generated exam items NOT in the original scan
- **omission_warnings**: Patterns where AI tends to skip content (e.g. dense lab blocks at page bottom)
- **common_medical_terms**: Greek→English medical dictionary (60+ terms)
- **medication_names**: Running list of drugs seen in notes

No patient-specific data, per-run stats, or value corrections belong in the knowledge base.

## Critical Lessons (Do Not Ignore)

1. **Hallucination risk**: AI sometimes generates plausible exam items NOT in the scan. Cross-reference EVERY line against the image.
3. **Use the template script**: Do NOT write docx generation code from scratch. Each skill version bundles its own template generator at `.skills/<version>/references/vN_template_generator.js`. Copy it to scratch/ and adapt it. The template contains all the exact formatting, sizing, and structure that took many iterations to get right.
4. **Image embedding requires separate docx section**: Transcription uses 2cm margins, appended scans use 0.5cm margins. These MUST be in different docx sections.
5. **Fit-to-page**: Always use `fitToPage(imgW, imgH)` for image sizing — checks both width and height constraints.
6. **JPG for scans**: JPG at quality 75-95 is 7x smaller than PNG with no visible loss.
7. **Patient identity**: Redacted with magenta in JPGs. Always use `./id.json` for name, AMKA, DOB, phone, address.
8. **NEVER nest Paragraphs**: `nLine()`, `nLabelVal()` return `Paragraph` objects. NEVER wrap them in `new Paragraph({children: [nLine(...)]})` — this creates paragraph-inside-paragraph which produces a corrupt .docx that Word refuses to open. Use `nLine(...)` directly as a content item in `fullWidthBox()` arrays.
9. **Structural validation**: The template includes a `validateDocStructure()` function that runs automatically before generating. If it finds nesting errors, it will print the exact location and exit with FATAL. Fix all errors before retrying.
10. **Turnkey isolation**: Each transcription run is fully independent. Do NOT read output from previous runs, other version outputs, or patient-specific stats. Only inputs are: source JPGs, id.json, the knowledge base (general only), lab panel templates, and the template script.
