# V11 Review Reference — Phases 2 & 3

This document guides the orchestrator through Phase 2 (template-guided review) and Phase 3 (contextual second pass). These phases run sequentially after all page agents have completed their transcriptions.

## Inputs

- All Phase 1 transcription files: `./scratch/_p1_PatientXXX_*.txt`
- `./transcription_knowledge.json` — abbreviations, handwriting patterns, medical terms
- ALL `./templates/*.json` — lab panel definitions (test names, units, ranges, OCR traps)

## PHASE 2: Template-Guided Sequential Review

Process the transcription files in page order (page 1, page 2, ...). Context builds as you go — what you learn from page 1 (patient conditions, medications) informs interpretation of later pages.

### 2a. Merge Page Transcriptions

First, concatenate all page transcriptions into a single working document, preserving page boundaries:

```
=== V11 MERGED TRANSCRIPTION ===
Patient: PatientXXX

[contents of _p1_PatientXXX_1.txt]

[contents of _p1_PatientXXX_2.txt]

... (more pages if they exist)
```

### 2b. Non-Lab Content Review

Go through the merged transcription section by section:

**Demographics & History (from page 1):**
- Verify profession, smoking, alcohol, allergies make sense as Greek words
- Check medical history conditions against `common_medical_terms`
- Check medication names against `medication_names.seen`
- Verify family history structure (Self | Father | Mother)
- Check that ΕΜΜΗΝΟΠΑΥΣΗ wasn't misread as ΕΝΗΜΕΡΩΤΗΣ (known confusion)

**Clinical Exam Sections:**
- Verify vital signs are physiologically plausible:
  - Weight: 40-180 kg typical
  - Height: 140-200 cm typical
  - BMI: 15-50 typical
  - BP: 80-220 / 40-140 mmHg
  - Heart rate: 40-150 bpm
- Check system findings against `common_medical_terms`
- Verify κφ (normal) is used consistently and in appropriate contexts

**Instructions Sections:**
- Check medication names against `medication_names.seen`
- Verify dosages are pharmacologically plausible
- Check follow-up intervals make sense

**Dates:**
- All dates should be DD/MM/YYYY
- Visit dates should be chronological (later visits have later dates)
- Lab dates should be close to (usually before) their corresponding visit dates
- Watch for 2↔9 year confusion (known handwriting pattern)
- Flag any date that seems out of chronological order

### 2c. Lab Results Review

This is the most critical part. For EACH lab value in the transcription:

1. **Identify the panel** — match the test name (or alt_name) to a `./templates/*.json` panel
2. **Check value plausibility** — is the value within `plausible_min` to `plausible_max`?
3. **Check against normal range** — annotate as normal (✓), high (⚠ HIGH), or low (⚠ LOW)
4. **Check for template-correctable errors**:
   - Test name garbling (HDO→HDL, HG8→HGB)
   - Run-on values (TSH218→TSH: 2,18)
   - Missing decimals (K: 41→K: 4,1)
   - Order-of-magnitude errors (Na: 14→Na: 143)

**Cross-panel consistency**: Some tests appear in multiple panels. If the same test has different values, flag the discrepancy:
- Ca: appears in Electrolytes and Bone Metabolism
- 25-OHD₃: appears in Vitamins and Bone Metabolism
- ALP: appears in Biochemistry and Bone Metabolism
- Φερριτίνη: appears in Iron Studies and Inflammation

### 2d. Correction Tracking

For every correction you make, record it:
```
TEMPLATE-BASED CORRECTIONS:
1. "HDO: 55,2" → "HDL: 55,2" [OCR trap: HDO→HDL in lipid context]
2. "TSH 218" → "TSH: 2,18" [plausible range 0,01-100; 218 implausible]
3. "P14,5" → "P: 4,5" [plausible range 1-10; 14,5 exceeds max]
4. "Υπεραλδοστερονισμία" → "ΥΠΕΡΛΙΠΙΔΑΙΜΙΑ" [known misread pattern]
```

### 2e. Uncertainty Marking

After review, every remaining uncertain item should be explicitly marked:
- Text: `[word?]` — word that could not be confirmed despite template/knowledge checks
- Numbers: `[number?]` — value that remains uncertain
- For lab values outside plausible range even after correction attempts: `[value? — outside plausible range]`

**Confidence threshold**: Mark in RED anything where you are less than 90% certain. It's better to flag too many items than to let errors through — the doctor will review flagged items.

### 2f. Write Phase 2 Output

Write to `./scratch/_p2_reviewed_PatientXXX.txt`:

```
=== V11 PHASE 2 REVIEW ===
Patient: PatientXXX
Review date: [today]

Lab panels identified: [list panels found]
Total lab values: N
  Within normal: N (XX%)
  Abnormal: N
  Corrected by template: N
  Still uncertain: N

TEMPLATE-BASED CORRECTIONS:
- [each correction with explanation]

FLAGS FOR DOCTOR:
- [items still uncertain after review]
- [items that seem medically inconsistent]

=== REVIEWED TRANSCRIPTION ===

[Full merged transcription with all corrections applied]
[Uncertain items marked with [text?] or [number?]]
[Lab results grouped by panel with ✓/⚠ annotations]

=== END PHASE 2 ===
```

---

## PHASE 3: Contextual Second Pass

Now re-read the entire reviewed transcription with the complete patient picture in mind.

### 3a. Medical Coherence Check

With full knowledge of the patient's conditions, medications, and history:

- Do the lab results make sense given the diagnoses?
  - Diabetic patient should have glucose/HbA1c values
  - Thyroid patient should have TSH/FT4/FT3 values
  - If key expected labs are missing, note it (but do NOT invent values)

- Do the medications match the conditions?
  - Thyroid medication (Medithyrox) with thyroid condition
  - Statin (Zocor, Rosuben) with hyperlipidemia
  - If there's a mismatch, flag it

- Are clinical findings consistent across visits?
  - Sudden large changes in stable conditions may indicate misreads
  - Weight that jumps dramatically between visits may be a digit error

### 3b. Resolve Remaining Ambiguities

Some uncertain items from Phase 2 may become clear with full context:
- An abbreviated word that makes sense in the context of the patient's other conditions
- A drug name that becomes clear when you see the condition it treats
- A lab value that makes sense when you know the patient's disease profile

Upgrade these from `[uncertain?]` to confirmed, with a note explaining the reasoning.

### 3c. Final Uncertainty Check

For items that remain uncertain even with full context:
- If you now understand them, remove the uncertainty marker
- If full context reveals NEW problems, add uncertainty markers
- Ensure every `[?]` item truly cannot be resolved

### 3d. Update the Reviewed File

Update `./scratch/_p2_reviewed_PatientXXX.txt` with Phase 3 changes, or write a new file `./scratch/_p3_final_PatientXXX.txt`.

Add a Phase 3 section at the top:
```
=== V11 PHASE 3 CONTEXTUAL REVIEW ===
Items resolved by context: N
New flags added: N
Final uncertain count: N
Overall confidence: HIGH/MEDIUM/LOW

CONTEXT-BASED RESOLUTIONS:
- "[word?]" → "word" [resolved: makes sense given patient has condition X]
- ...

NEW FLAGS:
- [any new issues found in contextual review]
```

### Confidence Rating Guide

- **HIGH**: ≤ 3 uncertain items remaining, no uncertain numbers, all lab values plausible
- **MEDIUM**: 4-8 uncertain items, or 1-2 uncertain numbers, all lab values plausible
- **LOW**: > 8 uncertain items, or uncertain lab values, or medical inconsistencies found
