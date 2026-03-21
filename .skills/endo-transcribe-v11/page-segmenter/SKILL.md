---
name: page-segmenter
description: Segment a single page of handwritten endocrinologist notes into labeled horizontal slices. Use when the user says "segment Patient001 page 1", "split page 2", "break up Patient003_1", or any request to divide a patient scan into sections. This is the FIRST step in the v11 transcription pipeline — always run this before transcription.
---

# Page Segmenter

Break one page JPG into horizontal section slices, classify each slice by type, and save to scratch.

## Context

Read `organization.md` (sibling of this skill's parent folder) for project paths and note structure. Key points:
- Source images: `./original_jpg/PatientXXX_N.jpg`
- All outputs go to `./scratch/`
- Identity fields are magenta-redacted — ignore them visually

## What You Do

1. **Look at the image** — open the source JPG and visually identify distinct sections top-to-bottom
2. **Decide horizontal cut lines** — each section spans the full page width; you only pick Y-coordinates for where sections start and end
3. **Classify each slice** by section type (see type codes below)
4. **Crop and save** each slice as a separate JPG
5. **Write a section_order.json** recording the sequence

## Section Type Codes

| Code | Section | How to spot it |
|------|---------|----------------|
| 1 | Personal info (ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ, ΚΟΙΝΩΝΙΚΟ/ΑΤΟΜΙΚΟ) | Top of page 1. Magenta redaction blocks. Name, DOB, phone, address, profession, smoking, allergies. |
| 2 | History block (ΠΑΡΑΠΟΜΠΗ, ΠΑΡΟΥΣΑ ΝΟΣΟΣ, ΑΝΑΜΝΗΣΤΙΚΟ, ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ) | Keywords visible. Numbered medical history items. Current medications listed. |
| 3 | Family history (ΟΙΚΟΓΕΝΕΙΑΚΟ / ΟΙΚ. ΙΣΤΟΡΙΚΟ) | Split into columns with vertical line. Circle (○) = mother, square (□) = father. Occasionally siblings on far right. |
| 4a | Clinical exam (ΚΛΙΝ. ΕΞΕΤΑΣΗ) | Keyword visible. Vitals (ΑΠ, ΣΒ, BMI). Systems review. Body diagram sometimes present. |
| 4b | Lab results (ΕΡΓ. ΕΛΕΓΧΟΣ / ΕΡΓΑΣΤΗΡΙΑΚΑ) | Dense numeric blocks. Test abbreviations (TSH, FT4, HGB, etc). Reference ranges in parentheses. |
| 4c | Instructions (ΟΔΗΓΙΕΣ) | Keyword visible. Numbered orders. Medication changes. Follow-up scheduling. |
| 4d | Prescriptions / Medications | Medication names (often English/Latin). Dosage instructions. Sometimes on a distinct prescription block. |
| 5 | Visit header / date marker | A date on left or right margin marking start of a new visit. Often with a horizontal line. |

**Notes on type 4 subtypes:** These are visit-level sections. A single page can have multiple visits, and within each visit these subtypes can appear in any order. Label them sequentially: if page 2 has two lab sections, they become `_type4b_a` and `_type4b_b`.

## How to Identify Section Boundaries

Look for these visual cues (in order of reliability):

1. **Horizontal lines** — drawn lines or dashes separating sections
2. **Dates on the margin** — a date (DD/MM/YYYY or DD/MM/YY) at the left or right edge signals a new visit section
3. **Section keywords** — ΟΔΗΓΙΕΣ, ΟΙΚ. ΙΣΤΟΡΙΚΟ, ΚΛΙΝ. ΕΞΕΤΑΣΗ, ΕΡΓ. ΕΛΕΓΧΟΣ, ΠΑΡΑΠΟΜΠΗ, ΑΝΑΜΝΗΣΤΙΚΟ
4. **Vertical whitespace** — a clear gap between groups of text
5. **Content change** — shift from narrative text to dense numbers (→ lab results), or from numbers to medication names (→ prescriptions)

## Output File Naming

Cropped slices: `./scratch/_PatientXXX_pageN_typeC_S.jpg`
- `XXX` = patient ID (e.g., 001)
- `N` = page number
- `C` = type code from the table above (1, 2, 3, 4a, 4b, 4c, 4d, 5)
- `S` = sequence letter within that type on this page (a, b, c…)

Examples:
- `_Patient001_page1_type1_a.jpg` — personal info block (top of page 1)
- `_Patient001_page1_type2_a.jpg` — history/referral block
- `_Patient001_page2_type5_a.jpg` — visit date header
- `_Patient001_page2_type4b_a.jpg` — first lab results section on page 2
- `_Patient001_page2_type4b_b.jpg` — second lab results section on page 2

## Section Order JSON

Save to `./scratch/_PatientXXX_pageN_section_order.json`:

```json
{
  "patient": "Patient001",
  "page": 1,
  "image": "./original_jpg/Patient001_1.jpg",
  "image_height": 3400,
  "sections": [
    { "type": "1", "seq": "a", "y_start": 0, "y_end": 480, "file": "_Patient001_page1_type1_a.jpg" },
    { "type": "2", "seq": "a", "y_start": 480, "y_end": 1100, "file": "_Patient001_page1_type2_a.jpg" },
    { "type": "3", "seq": "a", "y_start": 1100, "y_end": 1550, "file": "_Patient001_page1_type3_a.jpg" },
    { "type": "5", "seq": "a", "y_start": 1550, "y_end": 1600, "file": "_Patient001_page1_type5_a.jpg", "date": "15/03/2019" },
    { "type": "4a", "seq": "a", "y_start": 1600, "y_end": 2200, "file": "_Patient001_page1_type4a_a.jpg" }
  ]
}
```

## Execution Steps

1. Parse the patient ID and page number from the user's request
2. Load the source image: `./original_jpg/PatientXXX_N.jpg`
3. View the image and identify section boundaries (Y-coordinates and types)
4. Write a small Python script to `./scratch/` that uses Pillow to crop the image at those Y-coordinates and save each slice as a JPG (quality 90)
5. Run the script
6. Write the `_section_order.json`
7. Report what sections were found

**Cropping script pattern:**
```python
from PIL import Image
img = Image.open("./original_jpg/Patient001_1.jpg")
w, h = img.size
# cuts = [(y_start, y_end, filename), ...]
for y_start, y_end, fname in cuts:
    crop = img.crop((0, y_start, w, y_end))
    crop.save(f"./scratch/{fname}", "JPEG", quality=90)
```

## Important

- **Full width only** — every slice uses the full image width. You are only deciding vertical boundaries.
- **Generous margins** — when in doubt, include a few extra pixels above/below. It's better to overlap slightly than to cut off handwriting.
- **Don't skip anything** — every pixel of the page should belong to exactly one section. No gaps.
- **Ambiguous areas** — if a section is unclear, classify it as the most likely type and note the uncertainty in your report to the user.
