---
name: endo-transcribe
description: |
  Digitize handwritten Greek endocrinologist notes into structured Word documents (.docx) using the v7 hybrid format. Use this skill whenever someone asks to transcribe, digitize, or convert patient notes/scans into documents. Trigger on: "transcribe Patient001", "digitize patient 002", "process the next patient", "create v7 for Patient003", or any mention of converting JPG scans of handwritten medical notes into .docx files. This skill handles the ENTIRE workflow — reading source images, transcribing Greek handwriting, generating the formatted document, and appending original scans. The user only needs to provide a patient ID.
---

# Endocrinologist Note Transcription — v7 Format

Digitize handwritten medical notes from a Greek endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki) into structured Word documents.

## Invocation

The user gives a patient ID like `Patient001` or `Patient002`. The job:

1. Find all matching JPGs in `./original_jpg/` (e.g., `Patient001_1.jpg`, `Patient001_2.jpg`, etc.)
2. Read each JPG image and transcribe the Greek handwriting
3. Generate a single `.docx` file at `./transcribed/v7/PatientXXX_N_digitized_v7.docx`

Everything below tells you exactly how.

## Step 1: Setup and Preparation

```bash
npm install docx  # if not already installed
```

Read these BEFORE starting:
- `./id.json` — synthetic patient identity data (name, AMKA, DOB, phone, address) indexed by PatientXXX. Identity fields are redacted in the source JPGs — always use this file instead.
- `./transcription_knowledge.json` — confirmed abbreviations, known misread patterns, corrections from doctor reviews, a medical term dictionary (60+ Greek terms), and medication names seen so far. **Use this knowledge to avoid repeating mistakes that were already caught.**

## Step 2: Transcribe Each Page (One at a Time)

**IMPORTANT — TOKEN MANAGEMENT**: Patients may have 1-5 pages. Loading all images at once will exceed token limits for 3+ page patients. Instead, transcribe ONE page at a time:

1. Find all `./original_jpg/PatientXXX_N.jpg` files for the given patient ID.
2. For EACH page, one at a time:
   a. Read the single JPG image. Note its pixel dimensions (width × height).
   b. Transcribe everything you see into a structured plain-text file: `./scratch/_notes_PatientXXX_pageN.txt`
   c. Include ALL content: visit dates, patient details, medications, diagnoses, exam findings, lab values, instructions. Mark uncertain readings with `[?]`.
   d. Note the image dimensions at the top of the file (e.g., `IMAGE: 1700x2366`)
   e. Move on to the next page — do NOT keep the previous image in context.

The images are pre-cropped JPGs (varying dimensions, typically around 1700x2366 pixels). Identity fields (name, AMKA, DOB, phone, address) are **redacted with magenta (#FF00FF) rectangles**. Do NOT attempt to read them — use `./id.json` for these values.

Example `./scratch/_notes_PatientXXX_page1.txt`:
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

## Step 3: Assemble the Generator Script

After ALL pages are transcribed to .txt files, proceed with code generation — NO images needed from this point on.

**CRITICAL: Do NOT write docx generation code from scratch. Copy the bundled template.**

The template is bundled with this plugin at:
```
${CLAUDE_PLUGIN_ROOT}/skills/endo-transcribe/references/v7_template_generator.js
```

It is also available in the project repo at `./v7_template_generator.js`.

1. Read all the `./scratch/_notes_PatientXXX_pageN.txt` files you created in Step 2.
2. Read `./id.json` and extract the entry for this patient.
3. Copy the template to `./scratch/create_patientXXX_v7.js`.
4. Update the CONFIGURATION section at the top:
   - `IMAGE_FILES`: set the paths and pixel dimensions for each page's JPG (from the IMAGE: lines in each .txt)
   - `OUTPUT_PATH`: set to `./transcribed/v7/PatientXXX_N_digitized_v7.docx`
   - `PATIENT_AMKA`: from `id.json`
5. Replace the `transcriptionChildren` array with actual transcribed content (Step 4), converting the plain-text notes into the template's helper function calls.
6. Insert identity fields from `id.json` (name, DOB, AMKA, phone, address) into the ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ section.
7. Leave everything else in the template unchanged — the engine code, helper functions, layout builders, and document assembly are all correct and tested.

## Step 4: Build the Transcription Content

Convert the plain-text notes from Step 2 into the template's code format. Use the helper functions from the template:

### Text Formatting Functions

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

### Content Line Builders

```javascript
// A numbered line with mixed formatting:
nLine([bold("Label: "), normal("some value"), medical("CONDITION")])

// Shortcut for "Label: Value" pattern:
nLabelVal("Όνομα", "from id.json → name")
```

### Section Layout — Build in This Order

The doctor uses a consistent note structure. Build the document as follows:

```javascript
const transcriptionChildren = [
  ...doctorLetterhead(PATIENT_AMKA),

  // Visit heading
  new Paragraph({ heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 1 — DD/MM/YYYY", font: "Arial" })] }),
  spacer(60),

  // Row 1: Patient demographics | Social/lifestyle
  twoBoxRow(
    "ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ",
    [
      nLabelVal("Όνομα", "from id.json → name"),
      nLabelVal("Ημερ. Γέννησης", "from id.json → birth_date"),
      nLabelVal("Κατοικία", "from id.json → address"),
      nLabelVal("Τηλέφωνο", "from id.json → phone"),
    ],
    "ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ",
    [
      nLabelVal("Εργασία", "[profession]"),
      nLabelVal("Κάπνισμα", "[amount or Φ]"),
      nLabelVal("Αλκοόλ", "[amount or Φ]"),
      nLine([bold("Αλλεργία: "), normal("[allergies or Φ]")]),
    ]
  ),
  spacer(60),

  // Row 2: Current medication | Presenting illness
  twoBoxRow(
    "ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ",
    [ nLine([drug("DRUG_NAME"), normal(" [dosage]")]) ],
    "ΠΑΡΟΥΣΑ ΝΟΣΟΣ",
    [ nLine([medical("CONDITION"), normal(" — [details]")]) ]
  ),
  spacer(60),

  // Row 3: Referral | Medical history
  twoBoxRow(
    "ΠΑΡΑΠΟΜΠΗ",
    [ nLine([bold("Από: "), normal("[referral source]")]) ],
    "ΑΝΑΜΝΗΣΤΙΚΟ",
    [
      nLine([normal("① [history item 1]")]),
      nLine([normal("② [history item 2]")]),
    ]
  ),
  spacer(60),

  // Row 4: Family history — use threeBoxRow or fourBoxRow
  threeBoxRow(
    ["ΟΙΚΟΓ. ΙΣΤΟΡ. — Πατέρας", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Μητέρα", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Ασθ/ής"],
    [
      [ nLine([normal("• "), medical("CONDITION")]) ],
      [ nLine([normal("• "), medical("CONDITION")]) ],
      [ nLine([normal("Βλ. Αναμνηστικό")]) ],
    ]
  ),
  spacer(60),

  // Row 5: Clinical examination — use examTable inside fullWidthBox
  fullWidthBox("ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ", [
    examTable([
      ["Βάρος", "[XX] Kgr"],
      ["Ύψος", "[XXX] cm"],
      ["ΑΠ", "[XXX/XX] mmHg"],
      ["Σφύξεις", "[XX]/min"],
      ["Καρδιά", "[findings]"],
      ["Πνεύμονες", "κφ"],
      ["Κοιλία", "κφ"],
    ]),
  ]),
  spacer(60),

  // Row 6: Lab results — use labTable or placeholder
  fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ", [
    labTable([
      ["WBC", "6800", ""],
      ["HGB", "16,4", "ΦΤ: 13-17"],
    ]),
  ]),
  spacer(60),

  // Row 7: Instructions/orders
  fullWidthBox("ΟΔΗΓΙΕΣ", [
    nLine([normal("① [instruction 1]")]),
    nLine([normal("② [instruction 2]")]),
  ]),

  // Transcription footer
  ...transcriptionNotes("PatientXXX_1.jpg", new Date().toLocaleDateString('el-GR')),
];
```

### Multiple Visits

If the note contains more than one visit date, add a page break and new visit heading:

```javascript
new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 2 — DD/MM/YYYY", font: "Arial" })] }),
spacer(60),

// For demographics, reference visit 1:
fullWidthBox("ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ", [
  nLine([italic("Βλ. Επίσκεψη 1 (χωρίς αλλαγές)")]),
]),
```

### Gynecological History (Female Patients)

Add after the referral/history section:

```javascript
fullWidthBox("ΓΥΝΑΙΚΟΛΟΓΙΚΟ ΙΣΤΟΡΙΚΟ", [
  nLine([bold("Εμμηναρχή: "), normal("[age]")]),
  nLine([bold("Εμμηνόπαυση: "), normal("[age]")]),
  nLine([bold("Τοκετοί: "), normal("[count]"), bold(" / Αποβολές: "), normal("[count]")]),
]),
```

## Step 5: Generate the Document

```bash
node ./scratch/create_patientXXX_v7.js
```

Expected output:
```
Created: ./transcribed/v7/PatientXXX_N_digitized_v7.docx
Total rows numbered: XX
File size: XXX KB
```

The script automatically numbers all content rows sequentially, appends original scan images as full-page images in a separate docx section, scales images using fit-to-page, and adds page numbers in the footer.

## Step 6: Update Knowledge Base

After transcription, update `./transcription_knowledge.json`:
- Add new medical terms to `common_medical_terms`
- Add new medications to `medication_names.seen`
- Add new confirmed abbreviations
- Log uncertain readings in `transcription_stats`

## Rules

### Privacy & Redacted Fields
- **Identity fields (name, AMKA, DOB, phone, address) are redacted** in the source JPGs with **magenta (#FF00FF)** rectangles.
- **Do NOT attempt to read** any redacted field from the image. Always use `./id.json` for these values.
- `id.json` is stored locally only and never committed to version control.
- AMKA values in `id.json` are already masked (last 4 digits only).

### Transcription Accuracy
- **Cross-reference EVERY line against the image.** AI tends to hallucinate plausible exam items NOT in the original scan. This has happened before.
- Mark ALL uncertain readings in RED using `uncertain("text")` or `uncertainNum("text")`
- Year confusion: 2 and 9 look similar in this handwriting. Flag uncertain years in red.
- Use confirmed abbreviations from the knowledge base (e.g., κφ = κανονικά φυσιολογικά)
- Keep all text in Greek. English appears only for medication names and some medical terms.
- Dates are European format: DD/MM/YYYY

### Formatting
- ALL disease names and medical conditions → `medical("text")` (PURPLE + UPPERCASE + BOLD)
- ALL medication/drug names → `drug("text")` (PURPLE + UPPERCASE + BOLD)
- ALL uncertain readings → `uncertain("text")` (RED + [text?] brackets)
- Section titles are BLUE (#2E75B6)
- Row numbers are GRAY (#999999) in Courier New

### Technical
- **Do NOT write docx code from scratch.** Copy the bundled `v7_template_generator.js` and adapt it.
- Image section MUST be a separate docx section (different margins: 0.5cm vs 2cm)
- Always use `fitToPage(imgW, imgH)` for image sizing — this scales down to fit within 750×1070 pixels (A4 with 0.5cm margins at 96 DPI, with safety buffer)
- **CRITICAL: The appended original scan images must NEVER be cropped.** The entire handwritten page must be visible. The `fitToPage()` function ensures this by scaling down proportionally. If any part of an image is cut off, the MAX_IMG_W/MAX_IMG_H values need to be reduced further.
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

1. **Wall-clock time**: Note the time when starting (before reading images) and when the final .docx is written. Report the total elapsed time.

2. **Token estimation**: Estimate the input and output tokens used:
   - **Input tokens**: Each JPG image ≈ 1,600 tokens (at typical 1700×2366). The SKILL.md instructions ≈ 3,000 tokens. The knowledge base ≈ 1,500 tokens. The template script ≈ 2,000 tokens. Total input ≈ 8,000 + (1,600 × number_of_pages) tokens.
   - **Output tokens**: The generated script is typically 400-800 lines ≈ 8,000-16,000 tokens depending on visit count and content density.

3. **Cost estimation**: Report estimated cost for both models:
   - **Claude Opus 4.6**: $15 / 1M input tokens, $75 / 1M output tokens
   - **Claude Sonnet 4.6**: $3 / 1M input tokens, $15 / 1M output tokens

Print a summary table at the end:
```
┌─────────────────────────────────────────────┐
│ TRANSCRIPTION SUMMARY                       │
├─────────────────────────────────────────────┤
│ Patient:        PatientXXX                  │
│ Pages:          N                           │
│ Rows:           XX                          │
│ Elapsed time:   X min Y sec                 │
│ Est. input:     ~XX,XXX tokens              │
│ Est. output:    ~XX,XXX tokens              │
│ Est. cost (Opus 4.6):   $X.XX              │
│ Est. cost (Sonnet 4.6): $X.XX              │
└─────────────────────────────────────────────┘
```

## Reference Outputs

Examine these existing v7 outputs for reference:
- `./transcribed/v7/Patient004_1_digitized_v7.docx` — 88 rows, 2 visits, 1 page scan
- `./transcribed/v7/Patient005_1_digitized_v7.docx` — 112 rows, 2 visits, 2 page scan
