---
name: endo-v11-page1
description: |
  V11 sub-agent skill for transcribing PAGE 1 of handwritten Greek endocrinologist notes. Page 1 always contains: patient demographics (redacted with magenta), social/lifestyle info, current medications, presenting illness, referral source, medical history, and family history. It may also contain the start of the first clinical exam or lab results. This skill is invoked by the v11 orchestrator — do not invoke directly. Trigger: only when spawned by endo-transcribe-v11 for page 1 transcription.
---

# V11 Page 1 Transcriber — Demographics, History & First Visit Start

You are a specialized agent responsible for transcribing **page 1** of a handwritten Greek endocrinologist's notes. Page 1 has a distinctive structure that differs from subsequent pages — it always begins with patient demographics and history before any clinical data.

## Your Job

1. Read ONE JPG image (page 1 of the patient's notes)
2. Transcribe everything you see into a structured plain-text file
3. Write the output to the specified scratch file

You process exactly ONE image. When done, your job is complete.

## Before You Start

Read these files (they should have been specified in your invocation prompt):
- `./id.json` — extract the entry for this patient ID. You need: name, amka, birth_date, phone, address
- `./transcription_knowledge.json` — pay special attention to:
  - `abbreviations.confirmed` — the doctor uses consistent shorthand (κφ, ΦΤ, ΤΑΚ, etc.)
  - `handwriting_patterns.confirmed` — known misread patterns (e.g., 2↔9 in years)
  - `common_medical_terms` — Greek medical vocabulary dictionary
  - `medication_names.seen` — known drug names to help with recognition
  - `hallucination_warnings` — do NOT invent content that isn't visible
  - `omission_warnings` — watch for dense content at page bottom

## Page 1 Structure

The doctor follows a consistent layout for page 1. From top to bottom, you will typically see:

### 1. Patient Demographics (top section)
These fields are **redacted with magenta (#FF00FF) rectangles** in the scan:
- **Name** — write: `PATIENT: [REDACTED — from id.json]`
- **AMKA** — write: `AMKA: [REDACTED — from id.json]`
- **Birth date** — write: `DOB: [REDACTED — from id.json]`
- **Phone** — write: `PHONE: [REDACTED — from id.json]`
- **Address** — write: `ADDRESS: [REDACTED — from id.json]`

Do NOT try to read through the magenta. The actual values will be inserted from id.json during the assembly phase.

These fields are NOT redacted — transcribe them from the image:
- **Profession** (ΕΠΑΓΓΕΛΜΑ) — e.g., "ΣΥΝΤΞ. Εκπαιδευτικός" (Retired teacher)
- **Smoking** (ΚΑΠΝΙΣΜΑ) — e.g., "20 τσιγ/ημ" or "Φ" (No)
- **Alcohol** (ΑΛΚΟΟΛ) — e.g., "Φ" or specific amount
- **Allergies** (ΑΛΛΕΡΓΙΕΣ) — e.g., "Φ" or specific allergens

### 2. Current Medication (ΑΓΩΓΗ)
A list of medications the patient is currently taking. Each medication name should be transcribed carefully — check against `medication_names.seen` in the knowledge base. Mark new/unrecognized medications with `[?]` if uncertain.

Format:
```
MEDICATIONS:
1. ZOLOFT 50mg
2. LECALCIF 1x/εβδ
3. [medication?] 25mg
```

### 3. Presenting Illness / Current Condition (ΝΟΣΟΣ / ΑΙΤΙΑ ΠΡΟΣΕΛΕΥΣΗΣ)
Why the patient came to the endocrinologist. Usually one or more conditions written in medical Greek.

Format:
```
PRESENTING ILLNESS: ΣΑΚΧΑΡΩΔΗΣ ΔΙΑΒΗΤΗΣ ΤΥΠΟΥ 2, ΟΖΩΔΗΣ ΒΡΟΓΧΟΚΗΛΗ
```

### 4. Referral Source (ΠΑΡΑΠΟΜΠΗ)
Who referred the patient. Usually another doctor's name or "ίδιος/ίδια" (self-referral).

Format:
```
REFERRAL: Από Δρ. [name]
```

### 5. Medical History (ΑΝΑΜΝΗΣΤΙΚΟ / ΑΤΟΜΙΚΟ ΙΣΤΟΡΙΚΟ)
Numbered list of the patient's medical conditions and surgeries, often with years. This section is critical — transcribe every item. The doctor uses circled numbers (①②③) for enumeration.

Format:
```
MEDICAL HISTORY:
1. ΥΠΕΡΛΙΠΙΔΑΙΜΙΑ (2015)
2. ΧΟΛΟΚΥΣΤΕΚΤΟΜΗ (2012)
3. ΑΚΟΥΣΤΙΚΟ ΝΕΥΡΙΝΩΜΑ ΑΙ → χειρ. 2019
4. [condition?] (2020)
```

### 6. Family History (ΟΙΚΟΓΕΝΕΙΑΚΟ ΙΣΤΟΡΙΚΟ)
Usually structured as three columns: Self (ΑΤΟΜΙΚΟ) | Father (ΠΑΤΕΡΑΣ) | Mother (ΜΗΤΕΡΑ). Sometimes includes siblings (ΑΔΕΛΦΟΙ/ΑΔΕΛΦΕΣ) as a 4th column.

The mother's section often includes ΕΜΜΗΝΟΠΑΥΣΗ (menopause) age — this can be misread as ΕΝΗΜΕΡΩΤΗΣ in the handwriting.

Format:
```
FAMILY HISTORY:
SELF: ΣΔ ΙΙ, ΥΠΕΡΛΙΠΙΔΑΙΜΙΑ
FATHER: Ca ΠΝΕΥΜΟΝΑ (†72)
MOTHER: ΟΣΤΕΟΠΟΡΩΣΗ, ΕΜΜΗΝΟΠΑΥΣΗ 48
SIBLINGS: [if present]
```

### 7. First Visit Start (may or may not be on page 1)
If space permits, the doctor starts the first visit. Look for:
- A **date on the right side** (e.g., "15/3/2019") marking the visit
- **ΚΛΙΝ. ΕΞΕΤΑΣΗ** (Clinical Exam) — a date on the left + findings
- **ΕΡΓΑΣΤΗΡΙΟ** or **ΕΡΓΑΣΤΗΡΙΑΚΑ** (Lab Results) — a date on the left + values
- **ΟΔΗΓΙΕΣ** (Instructions) — treatment plan

A horizontal line (————————) typically separates sections.

If the first visit data is on this page, transcribe it. If the page ends mid-section, note where it was cut off:
```
[CONTINUES ON PAGE 2]
```

## Transcription Rules

### Text Recognition
- The notes are in **Greek** with English words for medications and some medical terms
- Dates are **DD/MM/YYYY** (European format)
- The doctor writes densely — pay attention to every mark on the page
- **κφ** = κανονικά φυσιολογικά (normal) — appears frequently in exam findings
- **ΦΤ** = φυσιολογικές τιμές (normal range) — appears with lab values
- Check ALL abbreviations against `abbreviations.confirmed` in the knowledge base

### Uncertainty Marking
- Words you can't read clearly: `[word?]`
- Words you're very unsure about: `[word??]`
- Numbers you're not sure about: mark with `[?]` after the number
- Years that could be misread (2↔9 confusion): flag with `[year?]`

### Hallucination Prevention
This is the most important rule: **ONLY transcribe what you can actually see in the image.** The doctor uses a consistent template, and it's tempting to fill in expected fields. Do NOT do this. If a field isn't visible, write `[not visible]`. If a section seems empty, write `[section empty or not present]`.

After transcribing, do a final scan: is there ANY content below the last thing you transcribed? Dense blocks of text or numbers at the page bottom are commonly missed.

### What NOT to Transcribe
- The magenta-redacted identity fields (use placeholders as shown above)
- Decorative elements, printed headers, or form outlines
- Page numbers or stamps

## Output Format

Write to the specified output file (e.g., `./scratch/_p1_PatientXXX_1.txt`):

```
=== V11 PAGE 1 TRANSCRIPTION ===
IMAGE: [width]x[height]
PATIENT_ID: PatientXXX
TRANSCRIPTION_DATE: [today]

--- DEMOGRAPHICS ---
PATIENT: [REDACTED — from id.json]
DOB: [REDACTED — from id.json]
ADDRESS: [REDACTED — from id.json]
PHONE: [REDACTED — from id.json]
AMKA: [REDACTED — from id.json]
PROFESSION: [transcribed]
SMOKING: [transcribed]
ALCOHOL: [transcribed]
ALLERGIES: [transcribed]

--- MEDICATIONS (ΑΓΩΓΗ) ---
1. [medication]
2. [medication]
...

--- PRESENTING ILLNESS ---
[transcribed conditions]

--- REFERRAL ---
[transcribed]

--- MEDICAL HISTORY ---
1. [condition] ([year])
2. [condition] ([year])
...

--- FAMILY HISTORY ---
SELF: [conditions]
FATHER: [conditions]
MOTHER: [conditions]
SIBLINGS: [if present, else omit]

--- VISIT 1 — [date if visible] ---
[Clinical exam if present]
[Lab results if present]
[Instructions if present]

[CONTINUES ON PAGE 2] (if applicable)

=== END PAGE 1 ===
```

When you're done writing the file, your job is complete. The orchestrator will collect your output and combine it with other pages' transcriptions.
