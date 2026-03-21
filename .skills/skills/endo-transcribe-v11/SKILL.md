---
name: endo-transcribe-v11
description: |
  Digitize handwritten Greek endocrinologist notes into structured Word documents (.docx) using the v11 parallel-agent architecture. V11 spawns separate specialized agents for each page (page-1 agent for demographics/history, continuation agents for clinical/lab pages 2+), runs them in parallel, then performs sequential review and assembly. Use this skill when the user asks for "v11" transcription or says "transcribe Patient001 v11", "transcribe Patient005", or "process the next patient v11". This is the most advanced transcription pipeline — use it as the default unless a specific older version is requested.
---

# Endocrinologist Note Transcription — v11 (Parallel Agent Architecture)

V11 is a multi-agent pipeline that transcribes handwritten Greek medical notes into structured Word documents. It improves on v10 by splitting the work across specialized parallel agents, each focused on a specific type of content.

## Architecture Overview

```
User: "transcribe Patient005 v11"
         │
    ORCHESTRATOR (this skill)
         │
    ┌────┴─────────────────────┐
    │  PHASE 1: Parallel       │
    │  Transcription           │
    │                          │
    │  ┌─────────┐ ┌─────────┐│
    │  │ Page 1  │ │ Page 2  ││
    │  │ Agent   │ │ Agent   ││
    │  │(page1   │ │(cont.   ││
    │  │ skill)  │ │ skill)  ││
    │  └────┬────┘ └────┬────┘│
    │       │            │     │
    │  scratch/       scratch/ │
    │  _p1_P005_1.txt _p1_P005_2.txt
    └──────┬───────────────────┘
           │
    ┌──────┴───────────────────┐
    │  PHASE 2: Sequential     │
    │  Review (template-guided)│
    │  → references/reviewer.md│
    └──────┬───────────────────┘
           │
    ┌──────┴───────────────────┐
    │  PHASE 3: Contextual     │
    │  Second Pass             │
    │  → references/reviewer.md│
    └──────┬───────────────────┘
           │
    ┌──────┴───────────────────┐
    │  PHASE 4: Knowledge Base │
    │  Update                  │
    └──────┬───────────────────┘
           │
    ┌──────┴───────────────────┐
    │  PHASE 5-6: Assembly     │
    │  → references/assembler.md│
    │  (docx + appended scans) │
    └──────┬───────────────────┘
           │
    ┌──────┴───────────────────┐
    │  PHASE 7: Summary        │
    └──────────────────────────┘
```

## Invocation

The user provides a patient ID (e.g., `Patient005`) and optionally specifies `v11`. This orchestrator coordinates all 7 phases.

## Setup — Read These BEFORE Starting

Load these files into context before any work:

1. `./id.json` — synthetic patient identity (name, AMKA, DOB, phone, address)
2. `./transcription_knowledge.json` — abbreviations, handwriting patterns, medical terms, medications
3. Count the JPG files: `./original_jpg/PatientXXX_*.jpg`

You do NOT need to read the lab templates or template generator script yourself — the sub-agents and reference docs handle those.

---

## PHASE 1: Parallel Transcription

This is the core innovation of v11. Each page gets its own agent running in parallel, with specialized instructions based on page position.

### Step 1a: Identify Pages

```bash
ls ./original_jpg/PatientXXX_*.jpg
```

Determine: how many pages does this patient have? (1-5 typical)

### Step 1b: Record Start Time

Note the wall-clock time when Phase 1 begins (use `date +%s` in bash).

### Step 1c: Spawn Agents

Launch ALL page agents in a single message (parallel execution):

**For page 1** — use the `endo-v11-page1` skill:

Spawn an agent with this prompt:
```
Read and follow the skill at: ./.skills/skills/endo-v11-page1/SKILL.md

Patient ID: PatientXXX
Page file: ./original_jpg/PatientXXX_1.jpg
Output file: ./scratch/_p1_PatientXXX_1.txt

Also read before starting:
- ./id.json (extract this patient's identity fields)
- ./transcription_knowledge.json (abbreviations, handwriting patterns, medical terms)
```

**For each page N >= 2** — use the `endo-v11-continuation` skill:

Spawn an agent with this prompt:
```
Read and follow the skill at: ./.skills/skills/endo-v11-continuation/SKILL.md

Patient ID: PatientXXX
Page number: N
Page file: ./original_jpg/PatientXXX_N.jpg
Output file: ./scratch/_p1_PatientXXX_N.txt

Also read before starting:
- ./transcription_knowledge.json (abbreviations, handwriting patterns, medical terms)
- ALL files in ./templates/*.json (lab panel definitions)
```

**CRITICAL**: Launch all agents in a SINGLE message so they run in parallel. Do not wait for page 1 to finish before starting page 2.

### Step 1d: Collect Results

Wait for all agents to complete. Verify that each produced its output file:
```bash
ls ./scratch/_p1_PatientXXX_*.txt
```

Read all the output files to have the raw transcriptions available for Phase 2.

Record the Phase 1 end time.

---

## PHASE 2: Sequential Template-Guided Review

Read `references/reviewer.md` (bundled with this skill) for detailed instructions.

**Summary**: Go through each page's transcription sequentially (page 1 first, then page 2, etc.) and:
- Correct words using the knowledge base and lab panel templates
- Validate lab values against plausible ranges from `./templates/*.json`
- Group lab results into named panels (CBC, Lipids, Thyroid, etc.)
- Mark anything uncertain (< 90% confidence) in RED with `[text?]`
- Mark uncertain numbers in RED without brackets

This phase is SEQUENTIAL because context from earlier pages informs later corrections (e.g., knowing the patient has diabetes affects interpretation of glucose values).

Output: `./scratch/_p2_reviewed_PatientXXX.txt`

---

## PHASE 3: Contextual Second Pass

Still following `references/reviewer.md`.

Re-read the entire reviewed transcription with full context and:
- Identify things that don't make medical sense given the patient's full picture
- Resolve remaining ambiguities now that you have the complete document
- Upgrade uncertain items to confirmed if context makes them clear
- Add new uncertainty markers if full context reveals problems

Output: Update `./scratch/_p2_reviewed_PatientXXX.txt` in place (or write `_p3_final_PatientXXX.txt`).

---

## PHASE 4: Knowledge Base Update

Review what was learned during transcription and add **general, patient-agnostic** knowledge to `./transcription_knowledge.json`:

- New medical terms → `common_medical_terms`
- New medications → `medication_names.seen`
- New confirmed abbreviations → `abbreviations.confirmed` (only if meaning is certain)
- New handwriting patterns → `handwriting_patterns.confirmed`
- New hallucination or omission warnings if applicable

**Do NOT add**: patient-specific data, per-run stats, value corrections, or anything tied to a specific patient.

---

## PHASE 5-6: Assembly (docx Generation + Scan Append)

Read `references/assembler.md` (bundled with this skill) for detailed instructions.

**Summary**:
1. Copy `./scripts/v10_template_generator.js` to `./scratch/create_patientXXX_v11.js`
2. Update configuration (IMAGE_FILES, OUTPUT_PATH → `./transcribed/v11/`, PATIENT_AMKA)
3. Replace `transcriptionChildren` with the reviewed content from Phase 3
4. Insert ACTUAL identity values from `id.json` (no placeholders!)
5. Group lab results by panel with sub-headings
6. Reference ranges from `./templates/*.json` (not from handwriting)
7. Run: `node ./scratch/create_patientXXX_v11.js`

The template generator handles both the transcription section (2cm margins) and the appended scans section (0.5cm margins, separate docx section).

Output: `./transcribed/v11/PatientXXX_N_digitized_v11.docx`

---

## PHASE 7: Summary

Display this exact table format — no extra rows, no clinical flags:

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
- Each JPG image: ~1,600 tokens input
- SKILL.md instructions (per agent): ~2,000 tokens input
- Knowledge base: ~1,500 tokens input
- Lab templates (all): ~2,000 tokens input
- Template script: ~2,000 tokens input
- Phase 2 review input: ~3,000-8,000 tokens
- Output per phase: varies, typically 5,000-15,000 tokens
- **Opus 4.6 pricing**: $15/1M input, $75/1M output
- **Sonnet 4.6 pricing**: $3/1M input, $15/1M output

---

## Rules (Apply to ALL Phases)

### Privacy & Redacted Fields
- Identity fields are redacted with **magenta (#FF00FF)** in the JPGs
- NEVER read identity data from images — always use `./id.json`
- Final docx must have ACTUAL synthetic values, no placeholders

### Color Coding
- `medical("text")` → PURPLE + UPPERCASE + BOLD — disease names, conditions
- `drug("text")` → PURPLE + UPPERCASE + BOLD — medication names
- `uncertain("text")` → RED + [text?] — unclear handwriting
- `uncertainNum("text")` → RED (no brackets) — uncertain numbers

### Technical
- Do NOT write docx code from scratch — copy the template generator
- NEVER nest Paragraphs (nLine/nLabelVal return Paragraphs, use directly)
- Image section uses separate docx section (0.5cm vs 2cm margins)
- `fitToPage(imgW, imgH)` for image sizing — never crop scans
- Each run is fully independent — no reading previous run outputs
