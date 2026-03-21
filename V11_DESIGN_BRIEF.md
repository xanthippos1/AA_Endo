# V11 Design Brief — Start From Scratch

## What happened with previous versions

We made multiple attempts (v7, v8, v9, v10) to build a skill that digitizes handwritten Greek endocrinologist notes into structured .docx files. Each version added more intelligence — v8 added a medical review pass, v9 added Google Vision fusion, v10 added lab panel template awareness with OCR correction, plausibility checks, and panel grouping.

**Every version produced poor transcriptions.** The latest attempt (v10) was tested on Patient001 and Patient002 and the results were "more wrong than correct by a wide margin" — widespread hallucinated content and missing content.

## Root cause (diagnosed in the v10 session)

The skill overloads the model during image reading. Phase 1 of v10 asks the model to simultaneously:
- Read the handwritten image
- Apply lab panel template corrections (test name correction, run-on separation, plausibility checks)
- Check against knowledge base patterns
- Mark uncertainties with specific notation
- Group results by panel
- Handle magenta redaction fields
- Follow formatting rules

When we asked the model to "just read the occupation from the top of the page," it read **ΦΙΛΟΛΟΓΟΣ** correctly in seconds. But when the full v10 skill ran on the same image, it hallucinated **ΣΥΝΤΞ. Εκπαιδευτικός** (retired educator) — a plausible but completely wrong answer. The model was guessing plausible medical content instead of reading what was actually written.

**The problem is skill design, not image quality or model capability.** The model CAN read this handwriting accurately when focused on reading.

## What v11 must do differently

Phase 1 (transcription) must be **pure image reading** — look at the image, write down exactly what you see, nothing else. No corrections, no intelligence, no template matching. Just read and transcribe.

All smart processing (lab panel matching, plausibility checks, grouping, corrections) should happen in Phase 2 when no images are loaded and the model can focus purely on the text.

## Allowed inputs for v11

The skill should ONLY use these inputs:

| Input | Purpose |
|-------|---------|
| `./original_jpg/PatientXXX_N.jpg` | Source scan images |
| `./id.json` | Synthetic patient identity (name, AMKA, DOB, phone, address) |
| `./transcription_knowledge.json` | General knowledge base (abbreviations, handwriting patterns, medical terms, medication names) |
| `./templates/*.json` | Lab panel definitions (test names, units, ranges, OCR traps) |
| `./scripts/v11_template_generator.js` | Template script (to be created, based on v10 version) |

**No other inputs.** No output from any previous version. No patient-specific stats. Each run is fully independent (turnkey).

## Key requirements carried forward

- All intermediate files go in `./scratch/` — never in root
- Identity fields are redacted with magenta (#FF00FF) in source JPGs — use `./id.json` for name, AMKA, DOB, phone, address
- Knowledge base is general/patient-agnostic only — no patient-specific data, no per-run stats
- Final output: `./transcribed/v11/PatientXXX_N_digitized_v11.docx`
- Template script lives in `./scripts/v11_template_generator.js` — copy to `./scratch/` and adapt per patient
- Do NOT write docx generation code from scratch — use the template
- Summary table at end: patient info, timing, token estimates, cost — NO clinical flags

## Files to reference

- `./scripts/v10_template_generator.js` — the docx template engine works fine, just copy and rename for v11
- `./id.json` — synthetic patient identities
- `./transcription_knowledge.json` — general knowledge base
- `./templates/*.json` — lab panel definitions
- `./endo-transcribe-plugin/skills/endo-transcribe-v10/SKILL.md` — the v10 skill that failed (for reference on what NOT to do in Phase 1)
