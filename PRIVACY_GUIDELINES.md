# Privacy Guidelines — LLM-Assisted Transcription Project

**Project:** Digitization of handwritten endocrinologist notes using Claude (Anthropic)
**Last updated:** 2026-03-19

---

## What Data We're Handling

The scanned notes contain **special category data** under GDPR Article 9: patient names, AMKA (national social security number), dates of birth, addresses, phone numbers, diagnoses, medications, and lab results — all linked to identifiable individuals.

## Core Principle

**No identifiable patient data should reach Anthropic's servers.** All personally identifying information (PII) must be removed or masked *before* images are processed by the LLM. Medical content (diagnoses, medications, lab values, exam findings) is fine to process once de-linked from identity.

## What Must Be Redacted Before LLM Processing

| Field | Action | Reason |
|---|---|---|
| Patient name | Paint over with **magenta (#FF00FF)** | Direct identifier |
| AMKA | Paint over with **magenta (#FF00FF)** | Unique national ID — directly identifies a person |
| Date of birth (full) | Paint over with **magenta (#FF00FF)** | Strong identifier when combined with other data |
| Address | Paint over with **magenta (#FF00FF)** if present | Direct identifier |
| Phone number | Paint over with **magenta (#FF00FF)** if present | Direct identifier |
| Referring doctor name | Paint over with **magenta (#FF00FF)** if present | Can indirectly identify patient |

## What Can Be Processed by the LLM

- Diagnoses, medical conditions, symptoms
- Medications and dosages
- Lab results and reference ranges
- Clinical examination findings
- Visit dates (low re-identification risk on their own)
- Age or birth year (non-identifying alone)
- Treatment instructions

## Recommended Workflow

### 1. Extract identifiers locally (no cloud)

Use local-only tools (Tesseract OCR with Greek language pack, or a local vision LLM via Ollama) to read the header area of each scan and extract: name, AMKA, DOB, address, phone.

Save to `./id.json` — a **local-only** file (gitignored) that maps patient IDs to synthetic replacement identity data (name, AMKA, DOB, phone, address). This file must never leave the local machine or be committed to version control.

### 2. Redact identifiers locally

Paint over the identifier fields on the JPG with **magenta (#FF00FF)** rectangles using a local image editor or script (Python + Pillow, ImageMagick, or similar). Save as the redacted JPG. Magenta is used because it is visually unambiguous — the LLM can clearly distinguish redacted areas from blank paper or white space.

If automated redaction is not feasible (inconsistent layouts, etc.), manual redaction with a simple image editor takes roughly 10 seconds per page.

### 3. Process redacted images with LLM

Send only the redacted JPGs to Claude for transcription. The transcription skill reads `./id.json` and inserts the synthetic identity values into the output document automatically. The LLM never sees real patient identity data.

### 4. Final output

The LLM produces a .docx with synthetic identity data from `id.json` embedded in the demographics section. For production use, a local script can replace the synthetic values with real patient data from a secure local mapping file. This step runs entirely on the local machine.

## Claude Account Settings

- **Training toggle must be OFF.** Settings → Privacy → "Help Improve Claude" → disabled. This ensures conversations and uploaded files are not used for model training.
- With the toggle off, data is retained on Anthropic's servers for up to **30 days** for safety monitoring, then deleted.
- If a conversation is flagged by automated safety classifiers, retention extends to **2 years**.
- A **Team or Enterprise plan** (commercial terms) provides a contractual guarantee of no training and includes a formal Data Processing Addendum with EU Standard Contractual Clauses. This is recommended for the production phase.

## Research Phase vs. Production Phase

| | Research (now) | Production (future) |
|---|---|---|
| **Plan** | Pro or Max (consumer) with training OFF | Team or Enterprise (commercial terms) |
| **Redaction** | Manual magenta paint-over before processing | Automated local pipeline |
| **ID mapping** | Manual or semi-automated | Fully automated, local-only |
| **Compliance posture** | Best-effort anonymization | Formal DPIA, documented procedures |
| **Patient consent** | Not processing identifiable data | Consider obtaining if any PII risk remains |

## What This Document Does NOT Cover

- Back-end database security or access controls
- Front-end application privacy design
- Long-term data storage and retention policies
- Patient-facing privacy notices or consent forms

## Important Caveats

- This document reflects our best understanding as of March 2026. It is not legal advice.
- Greek data protection law (Law 4624/2019 implementing GDPR) may impose additional requirements for health data.
- A consultation with a lawyer familiar with Greek healthcare data regulations is recommended before scaling to production.
