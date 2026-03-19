---
name: endo-transcribe-v9
description: |
  Digitize handwritten Greek endocrinologist notes into structured Word documents (.docx) using the v9 fusion format (4-phase: Google Vision OCR + Claude image reading, fusion + medical review, assemble). Use this skill when the user explicitly asks for "v9" transcription or says "transcribe Patient001 v9", "fuse Patient002", "v9 for Patient003". V9 combines Google Vision API OCR text with Claude's own image reading, then cross-references the two sources to produce a higher-accuracy transcription than either alone. Requires a pre-generated Google Vision API text file in `./visionai/`. For v7 (basic) or v8 (review only), use the other endo-transcribe skills.
---

# Endocrinologist Note Transcription — v9 Format (Dual-OCR Fusion)

Digitize handwritten medical notes from a Greek endocrinologist (Dr. Dimitrios G. Bougiouklis, Thessaloniki) into structured Word documents, using **two independent OCR sources** fused together for maximum accuracy.

**V9 vs V8 vs V7**: The docx output format is identical across all three. V9 adds a second OCR source (Google Vision API) and a fusion step that cross-references the two independent readings. Where both sources agree, confidence is high. Where they disagree, the discrepancy is the most informative signal — it tells you exactly where to look.

## Invocation

The user gives a patient ID (e.g., `Patient004`) and specifies v9. Prerequisites:

- JPG scan(s) in `./original_jpg/PatientXXX_N.jpg`
- Google Vision API output in `./visionai/PatientXXX_googleai.txt`

If the Google Vision file doesn't exist, tell the user they need to run the Vision API first (or fall back to v8).

## Setup

```bash
npm install docx  # if not already installed
```

Read `./transcription_knowledge.json` BEFORE starting.

---

## PHASE 1a: Read Google Vision OCR

Read the pre-generated file `./visionai/PatientXXX_googleai.txt`. This is raw text output from Google Cloud Vision API's document text detection.

**What Google Vision is good at:**
- Individual character recognition, especially printed text and numbers
- Lab values, medication dosages, phone numbers
- Characters that are ambiguous in context (2 vs 9, ε vs ο)

**What Google Vision is bad at:**
- Document structure (sections, columns, tables)
- Medical abbreviations and shorthand
- Understanding what belongs together semantically
- Greek handwriting context (it doesn't know κφ means κανονικά φυσιολογικά)

Save a structured summary: `_google_PatientXXX.txt` — reorganize the raw Google text into the standard section format (demographics, medications, history, exam, labs, instructions) as best you can. Mark sections where Google's output is garbled or unclear with `[GOOGLE UNCLEAR]`.

---

## PHASE 1b: Claude Image Reading (One Page at a Time)

**TOKEN MANAGEMENT**: Process ONE page at a time. Never load multiple images simultaneously.

1. Find all `./original_jpg/PatientXXX_N.jpg` files for the given patient ID.
2. For EACH page, one at a time:
   a. Read the single JPG image. Note its pixel dimensions (width × height).
   b. Transcribe everything into: `_claude_PatientXXX_pageN.txt`
   c. Include ALL content. Mark uncertain readings with `[?]`.
   d. Note image dimensions at top (e.g., `IMAGE: 1700x2366`)
   e. **Move to next page — do NOT keep previous image in context.**

The images are pre-cropped JPGs. Patient names are whited out — use the patient ID (e.g., "Ασθενής 004").

Use the same structured plain-text format as v8.

---

## PHASE 2: Fusion + Medical Review

**No images needed.** Read ALL of these files:
- `_google_PatientXXX.txt` (reorganized Google Vision output)
- `_claude_PatientXXX_pageN.txt` (all Claude transcription pages)
- `./transcription_knowledge.json`

### 2a. Side-by-Side Comparison

Go through each section and compare the two sources. For each piece of information, determine:

| Situation | Action | Confidence |
|-----------|--------|------------|
| **Both agree** | Use the agreed value | HIGH |
| **Both agree on structure, differ on a character** | Use medical/contextual knowledge to pick the correct one. E.g., Google says "6800" and Claude says "6800" → HIGH. Google says "METFORMIN" and Claude says "ΜΕΤΦΟΡΜΙΝ" → use METFORMIN (standard English spelling for drugs) |  MEDIUM-HIGH |
| **Google has a clear value, Claude is uncertain `[?]`** | Prefer Google's character reading, validate medically | MEDIUM |
| **Claude has clear value, Google is garbled** | Prefer Claude's structural reading | MEDIUM |
| **Both are uncertain or garbled** | Mark as `[?]` in red, flag for doctor | LOW |
| **One has content the other doesn't** | Likely a hallucination by the one that has it, OR a miss by the one that doesn't. Check if it's medically plausible. | LOW — flag for doctor |

### 2b. Specific Fusion Rules

**Lab values**: Google Vision is typically better at reading numbers and decimal points. Prefer Google's numbers when both sources have a value but differ on digits. Example: Claude reads "HGB: 16.4", Google reads "HGB1164" → fuse to "HGB: 16,4" (Greek decimal comma).

**Medication names**: Both sources may have the drug name but spelled differently. Use standard pharmaceutical spelling. Check `medication_names.seen` in the knowledge base.

**Medical abbreviations**: Claude understands these better. Google often splits or garbles them. Prefer Claude for abbreviations like κφ, ΦΤ, ΟΛΛ.

**Dates**: Cross-check dates between both sources. Apply the 2↔9 year confusion check. Validate against patient age.

**Structural content (section assignments)**: Always prefer Claude. Google Vision outputs flat text with no section awareness.

### 2c. Medical Consistency Check

Same as v8 — check for:
- Diagnosis ↔ medication mismatches
- Lab value plausibility
- Age ↔ date consistency
- Cross-page consistency
- Dosage plausibility

### 2d. Write Fused Output

Write: `_fused_PatientXXX.txt`

At the TOP, include a fusion report:
```
=== V9 FUSION REPORT ===
Sources: Google Vision API + Claude image reading
Agreement rate: XX% (N of M items matched)
Corrections from fusion: N
Items resolved by Google: N (Google was clearer)
Items resolved by Claude: N (Claude was clearer)
Items still uncertain: N (flagged for doctor)

FUSION LOG:
- "HGB: 16.4" — Google: "HGB1164", Claude: "HGB: 16,4" → FUSED: "HGB: 16,4" (Google confirmed digits, Claude had structure) [HIGH]
- "AMKA: *******0811" — Google: "ΑΜΚΑΣ -00811", Claude: "ΑΜΚΑ: *******0811" → FUSED: use Claude (Google garbled) [MEDIUM]
- "CPK: 2598" — Google: "CPK: 2598", Claude: "CPK: 2598" → BOTH AGREE [HIGH]
- "[unclear medication]" — Google: "Rabest", Claude: "[?Rabe...]" → FUSED: "RABEPRAZOLE [?]" (likely Rabeprazole based on both partial reads) [MEDIUM — flag for doctor]

FLAGS FOR DOCTOR:
- [list items that remain uncertain after fusion]

CONFIDENCE: HIGH / MEDIUM / LOW (overall)
=== END REPORT ===
```

Then include the fused transcription in standard structured format.

---

## PHASE 3: Assemble and Generate

**No images needed.** Read `_fused_PatientXXX.txt`.

### 3a. Copy the Template Script

The template is bundled with this plugin at:
```
${CLAUDE_PLUGIN_ROOT}/skills/endo-transcribe-v9/references/v9_template_generator.js
```

It is also available in the project repo at `./v9_template_generator.js`.

1. Copy to `create_patientXXX_v9.js`
2. Update CONFIGURATION: `IMAGE_FILES`, `OUTPUT_PATH` (→ `./transcribed/v9/`), `PATIENT_AMKA`
3. Replace `transcriptionChildren` with content from the FUSED notes
4. Leave engine code unchanged.

### 3b. Build the Transcription Content

Use the same helper functions as v7/v8:

| Function | Appearance | When to Use |
|----------|-----------|-------------|
| `normal("text")` | Black regular text | Default |
| `bold("text")` | **Black bold** | Labels |
| `medical("text")` | **PURPLE UPPERCASE** | Disease names, conditions |
| `drug("text")` | **PURPLE UPPERCASE** | Medications |
| `uncertain("text")` | RED [text?] | Still uncertain after fusion |
| `uncertainNum("text")` | RED text | Uncertain numbers |

Section layout order (same as v7/v8):

| Row | Sections | Function |
|-----|----------|----------|
| 1 | ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ \| ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ | `twoBoxRow(...)` |
| 2 | ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ \| ΠΑΡΟΥΣΑ ΝΟΣΟΣ | `twoBoxRow(...)` |
| 3 | ΠΑΡΑΠΟΜΠΗ \| ΑΝΑΜΝΗΣΤΙΚΟ | `twoBoxRow(...)` |
| 4 | ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ | `threeBoxRow(...)` or `fourBoxRow(...)` |
| 5 | ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ | `fullWidthBox(...)` with `examTable(...)` |
| 6 | ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ | `fullWidthBox(...)` with `labTable(...)` |
| 7 | ΟΔΗΓΙΕΣ | `fullWidthBox(...)` |

For multiple visits: page break + new heading.
For female patients: add ΓΥΝΑΙΚΟΛΟΓΙΚΟ ΙΣΤΟΡΙΚΟ.

### 3c. Generate

```bash
node create_patientXXX_v9.js
```

### 3d. Update Knowledge Base

Update `./transcription_knowledge.json` with:
- New terms, medications, abbreviations
- New error patterns from the fusion step
- Cases where Google Vision was consistently better or worse
- Uncertain readings

---

## Rules

### Privacy
- **Patient names are whited out.** Use patient ID (e.g., "Ασθενής 004"). Do NOT reconstruct names.
- **Mask AMKA**: last 4 digits only (e.g., `*******0811`)
- Phone numbers: `XXXX XXX XXX`

### Transcription Accuracy
- The fusion of two independent sources is the primary accuracy mechanism.
- Still cross-reference against the image during Phase 1b.
- Mark ALL remaining uncertain items in RED after fusion.
- Year confusion: validate all years against patient age.

### Formatting
- ALL disease names → `medical("text")` (PURPLE + UPPERCASE + BOLD)
- ALL drug names → `drug("text")` (PURPLE + UPPERCASE + BOLD)
- ALL uncertain readings → `uncertain("text")` (RED + [text?])
- Section titles: BLUE (#2E75B6)
- Row numbers: GRAY (#999999) in Courier New

### Technical
- **Do NOT write docx code from scratch.** Copy `v9_template_generator.js`.
- Image section MUST be separate docx section (0.5cm vs 2cm margins)
- `fitToPage(imgW, imgH)` for sizing — 750×1070 max
- **CRITICAL: Appended scan images must NEVER be cropped.**

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

## Timing and Cost Estimation

Record and report at the end:

1. **Wall-clock time**: Per-phase and total.
2. **Token estimation**: V9 uses slightly more than v8 (Phase 2 is larger due to dual-source comparison).
   - Phase 1a: ~500 tokens (reading a text file)
   - Phase 1b: ~1,600 tokens per image + instructions
   - Phase 2: ~5,000-12,000 tokens (both transcriptions + knowledge base + fusion reasoning)
   - Phase 3: ~4,000-10,000 tokens
3. **Cost**:
   - Claude Opus 4.6: $15 / 1M input, $75 / 1M output
   - Claude Sonnet 4.6: $3 / 1M input, $15 / 1M output

Summary table:
```
┌──────────────────────────────────────────────────┐
│ V9 FUSION TRANSCRIPTION SUMMARY                  │
├──────────────────────────────────────────────────┤
│ Patient:             PatientXXX                  │
│ Pages:               N                           │
│ Rows:                XX                          │
│ Agreement rate:      XX%                         │
│ Resolved by Google:  N items                     │
│ Resolved by Claude:  N items                     │
│ Still uncertain:     N items                     │
├──────────────────────────────────────────────────┤
│ Phase 1a (Google):     X min Y sec               │
│ Phase 1b (Claude):     X min Y sec               │
│ Phase 2 (fusion):      X min Y sec               │
│ Phase 3 (assemble):    X min Y sec               │
│ Total elapsed:         X min Y sec               │
├──────────────────────────────────────────────────┤
│ Est. input tokens:     ~XX,XXX                   │
│ Est. output tokens:    ~XX,XXX                   │
│ Est. cost (Opus 4.6):    $X.XX                   │
│ Est. cost (Sonnet 4.6):  $X.XX                   │
└──────────────────────────────────────────────────┘
```

## Reference Outputs

Examine existing v7 outputs for formatting reference:
- `./transcribed/v7/Patient004_1_digitized_v7.docx` — 88 rows, 2 visits, 1 page scan
- `./transcribed/v7/Patient005_1_digitized_v7.docx` — 112 rows, 2 visits, 2 page scan
