# V11 Assembly Reference — Phases 5, 6 & 7

This document guides the orchestrator through the final phases: generating the .docx document, appending original scans, and producing the summary report.

## Inputs

- `./scratch/_p2_reviewed_PatientXXX.txt` (or `_p3_final_PatientXXX.txt`) — final reviewed transcription
- `./id.json` — patient identity (name, AMKA, DOB, phone, address)
- `./scripts/v10_template_generator.js` — the docx template (reused for v11, the engine is identical)
- `./templates/*.json` — lab panel definitions (for reference ranges in the output)
- `./original_jpg/PatientXXX_*.jpg` — source images to append

## PHASE 5: Generate the .docx

### 5a. Copy and Configure the Template

1. **Read `./id.json`** and extract this patient's entry. You need the actual values for name, amka, birth_date, phone, address.

2. **Copy the template**:
```bash
cp ./scripts/v10_template_generator.js ./scratch/create_patientXXX_v11.js
```

3. **Update CONFIGURATION section** at the top of the copied script:
```javascript
const IMAGE_FILES = [
  { path: "./original_jpg/PatientXXX_1.jpg", width: XXXX, height: YYYY },
  { path: "./original_jpg/PatientXXX_2.jpg", width: XXXX, height: YYYY },
  // ... one entry per page
];
const OUTPUT_PATH = "./transcribed/v11/PatientXXX_N_digitized_v11.docx";
const PATIENT_AMKA = "*******XXXX";  // from id.json
```

Get image dimensions from the Phase 1 transcription files (each starts with `IMAGE: WxH`).

### 5b. Replace transcriptionChildren

Replace the entire `transcriptionChildren` array with the reviewed content. The structure follows this pattern:

```javascript
const transcriptionChildren = [
  ...doctorLetterhead(PATIENT_AMKA),

  // ==================== VISIT 1 ====================
  new Paragraph({ heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 1 — DD/MM/YYYY", font: "Arial" })] }),
  spacer(60),

  // Demographics | Social
  twoBoxRow(
    "ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ",
    [
      nLabelVal("Όνομα", "Actual Name from id.json"),
      nLabelVal("Ημερ. Γέννησης", "DD/MM/YYYY"),
      nLabelVal("Κατοικία", "Actual Address from id.json"),
      nLabelVal("Τηλέφωνο", "XXXX XXX XXX from id.json"),
    ],
    "ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ",
    [
      nLabelVal("Εργασία", "[from transcription]"),
      nLabelVal("Κάπνισμα", "[from transcription]"),
      nLabelVal("Αλκοόλ", "[from transcription]"),
      nLine([bold("Αλλεργία: "), normal("[from transcription]")]),
    ]
  ),
  spacer(60),

  // Medication | Illness
  twoBoxRow(
    "ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ",
    [
      nLine([drug("MEDICATION_NAME"), normal(" δοσολογία")]),
      // ... more medications
    ],
    "ΠΑΡΟΥΣΑ ΝΟΣΟΣ",
    [
      nLine([medical("CONDITION_NAME"), normal(" — details")]),
    ]
  ),
  spacer(60),

  // Referral | History
  twoBoxRow(
    "ΠΑΡΑΠΟΜΠΗ",
    [
      nLine([bold("Από: "), normal("[referral source]")]),
    ],
    "ΑΝΑΜΝΗΣΤΙΚΟ",
    [
      nLine([normal("① "), medical("CONDITION"), normal(" (year)")]),
      nLine([normal("② "), medical("CONDITION"), normal(" (year)")]),
    ]
  ),
  spacer(60),

  // Family History (3 or 4 columns)
  threeBoxRow(
    ["ΟΙΚΟΓ. ΙΣΤΟΡ. — Πατέρας", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Μητέρα", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Ασθενής"],
    [
      [ nLine([medical("CONDITION")]) ],
      [ nLine([medical("CONDITION")]), nLine([normal("ΕΜΜΗΝΟΠΑΥΣΗ: XX")]) ],
      [ nLine([normal("Βλ. Αναμνηστικό")]) ],
    ]
  ),
  spacer(60),

  // Clinical Exam
  fullWidthBox("ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ (DD/MM/YYYY)", [
    examTable([
      ["Βάρος", "XX Kgr"],
      ["Ύψος", "XXX cm"],
      ["ΑΠ", "XXX/XX mmHg"],
      ["Σφύξεις", "XX/min"],
      ["Θυρεοειδής", "findings"],
      ["Καρδιά", "κφ"],
      ["Πνεύμονες", "κφ"],
      ["Κοιλιά", "κφ"],
    ]),
  ]),
  spacer(60),

  // Lab Results — GROUPED BY PANEL
  fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ (DD/MM/YYYY)", [
    nLine([bold("— Γενική Αίματος (CBC) —")]),
    labTable([
      ["WBC", "6800", "ΦΤ: 4.500-11.000"],
      ["RBC", "5,3×10⁶", "ΦΤ: 4,5-5,9"],
      ["HGB", "16,4", "ΦΤ: 13-18"],
      // ... more CBC results
    ]),
    spacer(40),

    nLine([bold("— Βιοχημικές —")]),
    labTable([
      ["GLU", "92", "ΦΤ: 70-99"],
      ["Ουρία", "36", "ΦΤ: 7-20 ⚠"],
      // ... more biochemistry
    ]),
    spacer(40),

    nLine([bold("— Λιπιδαιμικό Προφίλ —")]),
    labTable([
      ["CHOL", "206", "ΦΤ: <200 ⚠"],
      // ... more lipids
    ]),
    // ... more panels as found
  ]),
  spacer(60),

  // Instructions
  fullWidthBox("ΟΔΗΓΙΕΣ (DD/MM/YYYY)", [
    nLine([normal("① "), drug("MEDICATION"), normal(" dose change")]),
    nLine([normal("② Follow-up instructions")]),
  ]),

  // Additional visits follow the same pattern...
  // For visit 2+, demographics section becomes:
  // fullWidthBox("ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ", [
  //   nLine([italic("Βλ. Επίσκεψη 1 (χωρίς αλλαγές)")]),
  // ]),

  // Transcription footer
  ...transcriptionNotes("PatientXXX_1.jpg, PatientXXX_2.jpg", new Date().toLocaleDateString('el-GR')),
];
```

### 5c. Critical Rules for Assembly

**Identity values**: Every `[REDACTED — from id.json]` placeholder MUST be replaced with the actual value from id.json. The final document must contain real-looking synthetic data — no placeholders, no "Patient XXX" as a name.

**Color coding**: Apply consistently:
- `medical("text")` for ALL disease names, conditions, anatomical terms
- `drug("text")` for ALL medication names
- `uncertain("text")` for items still marked `[?]` after review
- `uncertainNum("text")` for uncertain numbers (no brackets)
- `normal("text")` for regular text
- `bold("text")` for labels

**Lab reference ranges**: The third column in `labTable` MUST use ranges from `./templates/*.json`, NOT from the doctor's handwritten ranges. Use `range` (or `range_m`/`range_f` based on patient sex) from the template. Add ⚠ after the range if the patient's value is outside normal.

**Paragraph nesting — CRITICAL**: `nLine()`, `nLabelVal()`, and `examTable()` return Paragraph (or Table) objects. NEVER wrap them in `new Paragraph({children: [...]})`. This creates paragraph-inside-paragraph which produces a corrupt .docx. Use them directly as content items in arrays passed to `fullWidthBox()`, `twoBoxRow()`, etc.

**examTable value format**: The second element of each examTable row can be either a string OR an array of TextRun objects. Use an array when you need mixed formatting (e.g., normal text + uncertain text):
```javascript
["Θυρεοειδής", [small("ψηλαφητά "), uncertainSmall("οζίδια")]]
```

**Multiple visits**: Each visit after the first gets its own heading:
```javascript
new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 2 — DD/MM/YYYY", font: "Arial" })] }),
```
For visit 2+, the demographics box shows "Βλ. Επίσκεψη 1" unless something changed.

### 5d. Update the Version String

In the `transcriptionNotes` function call, update the version:
```javascript
...transcriptionNotes("PatientXXX_1.jpg, ...", new Date().toLocaleDateString('el-GR')),
```

Also change the source line to say "Έκδοση: 11 (parallel-agent)" in the transcriptionNotes function body if you want — or leave it as-is.

---

## PHASE 6: Append Original Scans

This is already handled by the template generator's Section 2 (the IMAGE_FILES configuration). The template creates a separate docx section with:
- 0.5cm margins (vs 2cm for transcription)
- No headers/footers
- Each image on its own page, scaled using `fitToPage(imgW, imgH)`
- Images are NEVER cropped — only scaled down to fit

Verify:
1. All JPG paths in IMAGE_FILES are correct
2. All width/height dimensions match the actual images
3. The `fitToPage` function is being used (not manual sizing)

### 5e/6. Generate

```bash
node ./scratch/create_patientXXX_v11.js
```

The script runs `validateDocStructure()` automatically. If validation fails, it prints the exact error location. Fix all errors before retrying.

**Output**: `./transcribed/v11/PatientXXX_N_digitized_v11.docx`

Verify the file was created:
```bash
ls -la ./transcribed/v11/PatientXXX_*_v11.docx
```

---

## PHASE 7: Summary Report

Count from the generated script:
- **Rows**: the final value of `rowCounter` (print it at the end of the script)
- **Pages**: number of source JPGs
- **Visits**: count of "ΕΠΙΣΚΕΨΗ" headings
- **Lab panels**: count of panel sub-headings
- **Lab values**: count of labTable rows
- **Phase 2 corrections**: count from the `TEMPLATE-BASED CORRECTIONS` section
- **Phase 2 flags**: count from the `FLAGS FOR DOCTOR` section
- **Confidence**: from Phase 3 assessment (HIGH/MEDIUM/LOW)

Display this EXACT format — no extra rows, no clinical flags:

```
┌──────────────────────────────────────────────────┐
│ V11 PARALLEL-AGENT TRANSCRIPTION SUMMARY         │
├──────────────────────────────────────────────────┤
│ Patient:              PatientXXX                 │
│ Pages:                N                          │
│ Rows:                 XX                         │
│ Visits:               N (dates)                  │
│ Lab panels found:     N panels, M total values   │
│ Phase 2 corrections:  N                          │
│ Phase 2 flags:        N                          │
│ Phase 2 confidence:   HIGH/MEDIUM/LOW            │
├──────────────────────────────────────────────────┤
│ Phase 1 (transcribe): X min Y sec  [N parallel]  │
│ Phase 2 (review):     X min Y sec               │
│ Phase 3 (context):    X min Y sec               │
│ Phase 5-6 (assemble): X min Y sec               │
│ Total elapsed:        X min Y sec               │
├──────────────────────────────────────────────────┤
│ Est. input tokens:    ~XX,XXX                    │
│ Est. output tokens:   ~XX,XXX                    │
│ Est. cost (Opus 4.6):   $X.XX                   │
│ Est. cost (Sonnet 4.6): $X.XX                   │
└──────────────────────────────────────────────────┘
```

**Token estimation guidelines:**
- Each JPG image: ~1,600 tokens input (per agent)
- SKILL.md instructions (per agent): ~2,000 tokens input
- Knowledge base: ~1,500 tokens input (per agent that reads it)
- Lab templates (all): ~2,000 tokens input (per agent that reads them)
- Template script: ~2,000 tokens input (assembly phase only)
- Phase 2 review input: ~3,000-8,000 tokens
- Output per phase: varies, typically 5,000-15,000 tokens
- **Parallel agents share input tokens for common resources** — don't double-count
- **Opus 4.6 pricing**: $15/1M input, $75/1M output
- **Sonnet 4.6 pricing**: $3/1M input, $15/1M output
