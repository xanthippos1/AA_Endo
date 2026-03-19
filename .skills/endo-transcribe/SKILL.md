---
name: endo-transcribe
description: |
  Digitize handwritten Greek endocrinologist notes into structured Word documents (.docx) using the v7 hybrid format. Use this skill whenever someone asks to transcribe, digitize, or convert patient notes/scans into documents. Trigger on: "transcribe Patient001", "digitize patient 002", "process the next patient", "create v7 for Patient003", or any mention of converting JPG scans of handwritten medical notes into .docx files. This skill handles the ENTIRE workflow — reading source images, transcribing Greek handwriting, generating the formatted document, and appending original scans. The user only needs to provide a patient ID.
---

# Endocrinologist Note Transcription — v7 Format

You are digitizing handwritten medical notes from a Greek endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki) into structured Word documents.

## Invocation

The user gives you a patient ID like `Patient001` or `Patient002`. Your job:

1. Find all matching JPGs in `./original_jpg/` (e.g., `Patient001_1.jpg`, `Patient001_2.jpg`, etc.)
2. Read each JPG image and transcribe the Greek handwriting
3. Generate a single `.docx` file at `./transcribed/v7/PatientXXX_N_digitized_v7.docx`

That's the whole task. Everything below tells you exactly how.

## Step 1: Setup and Preparation

```bash
npm install docx  # if not already installed
```

Read `./transcription_knowledge.json` BEFORE starting. It contains:
- Confirmed abbreviations (e.g., κφ = κανονικά φυσιολογικά)
- Known misread patterns (e.g., 2↔9 year confusion)
- Corrections from doctor reviews of previous patients
- Medical term dictionary (60+ Greek→English terms)
- Medication names seen so far

**Use this knowledge.** It exists to prevent you from repeating mistakes that were already caught and corrected.

## Step 2: Transcribe Each Page (One at a Time)

**IMPORTANT — TOKEN MANAGEMENT**: Patients may have 1-5 pages. Loading all images at once will exceed token limits for 3+ page patients. Instead, transcribe ONE page at a time:

1. Find all `./original_jpg/PatientXXX_N.jpg` files for the given patient ID.
2. For EACH page, one at a time:
   a. Read the single JPG image. Note its pixel dimensions (width × height).
   b. Transcribe everything you see into a structured plain-text file: `_notes_PatientXXX_pageN.txt`
   c. Include ALL content: visit dates, patient details, medications, diagnoses, exam findings, lab values, instructions. Mark uncertain readings with `[?]`.
   d. Note the image dimensions at the top of the file (e.g., `IMAGE: 1700x2366`)
   e. Move on to the next page — do NOT keep the previous image in context.

The images are pre-cropped JPGs (varying dimensions, typically around 1700×2366 pixels). The patient's name has been whited out in the scans, so for the "Όνομα" field always use the patient ID (e.g., "Ασθενής 002" for Patient002). Do NOT attempt to read or reconstruct any name.

Example `_notes_PatientXXX_page1.txt`:
```
IMAGE: 1700x2366
VISIT DATE: 15/03/2019
PATIENT: Ασθενής 002
DOB: 12/05/1965 (54 ετών)
ADDRESS: [address from scan]
PHONE: 6973 XXX XXX
AMKA: *******1234
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

**CRITICAL: Do NOT write docx generation code from scratch. Copy the template.**

1. Read all the `_notes_PatientXXX_pageN.txt` files you created in Step 2.
2. Copy `./v7_template_generator.js` to a new file named `create_patientXXX_v7.js` in the working directory.
3. Update the CONFIGURATION section at the top:
   - `IMAGE_FILES`: set the paths and pixel dimensions for each page's JPG (from the IMAGE: lines in each .txt)
   - `OUTPUT_PATH`: set to `./transcribed/v7/PatientXXX_N_digitized_v7.docx`
   - `PATIENT_AMKA`: set the masked AMKA number or `"[Δεν καταγράφηκε]"` if not recorded
4. Replace the `transcriptionChildren` array with actual transcribed content (Step 4), converting the plain-text notes into the template's helper function calls.
5. Leave everything else in the template unchanged — the engine code, helper functions, layout builders, and document assembly are all correct and tested.

## Step 4: Build the Transcription Content

Convert the plain-text notes from Step 2 into the template's code format. Use the helper functions from the template — here's what's available:

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
nLabelVal("Όνομα", "Ασθενής 004")
```

### Section Layout Functions

The doctor uses a consistent note structure. Build the document in this order:

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
      nLabelVal("Όνομα", "Ασθενής XXX"),
      nLabelVal("Ημερ. Γέννησης", "DD/MM/YYYY (XX ετών)"),
      nLabelVal("Κατοικία", "[address]"),
      nLabelVal("Τηλέφωνο", "XXXX XXX XXX"),
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
  // threeBoxRow for: Self | Father | Mother
  // fourBoxRow for: Self | Father | Mother | Siblings
  threeBoxRow(
    ["ΟΙΚΟΓ. ΙΣΤΟΡ. — Πατέρας", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Μητέρα", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Ασθενής"],
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
      // ... more exam items as present in the scan
    ]),
    new Paragraph({ spacing: { before: 80, after: 40 },
      children: [italic("[Διάγραμμα εξέτασης: βλ. πρωτότυπη σάρωση]")] }),
  ]),
  spacer(60),

  // Row 6: Lab results — use labTable inside fullWidthBox
  // If no labs for this visit, use placeholder:
  fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ", [
    new Paragraph({ children: [italic("[Δεν υπάρχουν εργαστηριακά αποτελέσματα]")] }),
  ]),
  // OR with actual data:
  // fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ (DD/MM/YYYY)", [
  //   labTable([
  //     ["WBC", "6800", ""],
  //     ["HGB", "16,4", "ΦΤ: 13-17"],
  //   ]),
  // ]),
  spacer(60),

  // Row 7: Instructions/orders
  fullWidthBox("ΟΔΗΓΙΕΣ", [
    nLine([normal("① [instruction 1]")]),
    nLine([normal("② [instruction 2]")]),
  ]),

  // Transcription footer (auto-generated)
  ...transcriptionNotes("PatientXXX_1.jpg", new Date().toLocaleDateString('el-GR')),
];
```

### Multiple Visits

If the note contains more than one visit date, add a page break and new visit heading:

```javascript
// Visit 2+
new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 2 — DD/MM/YYYY", font: "Arial" })] }),
spacer(60),

// For demographics, reference visit 1:
fullWidthBox("ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ", [
  nLine([italic("Βλ. Επίσκεψη 1 (χωρίς αλλαγές)")]),
]),
```

### Gynecological History (Female Patients)

If the patient is female, add after the referral/history section:

```javascript
fullWidthBox("ΓΥΝΑΙΚΟΛΟΓΙΚΟ ΙΣΤΟΡΙΚΟ", [
  nLine([bold("Εμμηναρχή: "), normal("[age]")]),
  nLine([bold("Εμμηνόπαυση: "), normal("[age]")]),
  nLine([bold("Τοκετοί: "), normal("[count]"), bold(" / Αποβολές: "), normal("[count]")]),
]),
```

## Step 5: Generate the Document

```bash
node create_patientXXX_v7.js
```

Expected output:
```
Created: ./transcribed/v7/PatientXXX_N_digitized_v7.docx
Total rows numbered: XX
File size: XXX KB
```

The script automatically:
- Numbers all content rows sequentially (01, 02, ...)
- Appends original scan image(s) as full-page images in a separate docx section
- Scales images using fit-to-page (checks both width and height constraints)
- Adds page numbers in footer

## Step 6: Update Knowledge Base

After transcription, update `./transcription_knowledge.json`:
- Add new medical terms to `common_medical_terms`
- Add new medications to `medication_names.seen`
- Add new confirmed abbreviations
- Log uncertain readings in `transcription_stats`

## Rules That Must Be Followed

### Privacy
- **Patient names are already whited out in the scans.** Use the patient ID as the name (e.g., "Ασθενής 002" for Patient002). Do NOT attempt to read or reconstruct any name from the scan.
- **Mask AMKA numbers**: show only last 4 digits (e.g., `*******0891`)
- Phone numbers: format as `XXXX XXX XXX`

### Transcription Accuracy
- **Cross-reference EVERY line against the image.** The AI tends to hallucinate plausible-looking exam items that are NOT in the original scan. This has happened before — see `hallucination_warnings` in the knowledge base.
- Mark ALL uncertain readings in RED using `uncertain("text")` or `uncertainNum("text")`
- Year confusion: 2 and 9 look similar in this handwriting. When in doubt, flag in red.
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
- **Do NOT write docx code from scratch.** Copy `v7_template_generator.js` and adapt it.
- Image section MUST be a separate docx section (different margins: 0.5cm vs 2cm)
- Always use `fitToPage(imgW, imgH)` for image sizing — this scales down to fit within 750×1070 pixels (A4 with 0.5cm margins at 96 DPI, with safety buffer)
- **CRITICAL: The appended original scan images must NEVER be cropped.** The entire handwritten page must be visible. The `fitToPage()` function ensures this by scaling down proportionally. If any part of an image is cut off, the MAX_IMG_W/MAX_IMG_H values need to be reduced further.
- Use JPG for scans (not PNG — 7x smaller, no visible quality loss)

## Known Abbreviations (Quick Reference)

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

See `transcription_knowledge.json` for the complete list including unconfirmed abbreviations that need doctor review.

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

Look at the existing v7 outputs for reference on what good output looks like:
- `./transcribed/v7/Patient004_1_digitized_v7.docx` — 88 rows, 2 visits, 1 page scan
- `./transcribed/v7/Patient005_1_digitized_v7.docx` — 112 rows, 2 visits, 2 page scan
