# Setup Guide

## Prerequisites

- **Cowork** (Claude desktop app) installed and working
- **Node.js** (v18+) installed
- Access to the git repo (you should already have this via VS Code)

## Step 1: Pull the repo

```bash
git pull
```

## Step 2: Install Node dependencies

From the repo root (`AA_Endo/`):

```bash
npm install
```

This installs the `docx` package used to generate Word documents.

## Step 3: Install the plugin

1. Open Cowork
2. Find the file `endo-transcribe.plugin` in the repo root
3. Double-click it, or drag it into a Cowork chat — Cowork will prompt you to install
4. Confirm the install

Once installed, the following skills become available in any Cowork session:

| Skill | Command | What it does |
|-------|---------|-------------|
| v7 | "transcribe Patient001" | Basic 2-phase transcription |
| v8 | "transcribe Patient001 v8" | 3-phase with medical review pass |
| v9 | "transcribe Patient001 v9" | Google Vision fusion (deprecated) |
| v10 | "transcribe Patient001 v10" | v8 + lab panel templates for smarter OCR |

**v10 is the recommended version.**

## Step 4: Create your local `id.json`

This file contains synthetic patient identity data (names, AMKA, DOB, phone, address) that gets inserted into the output documents. It is `.gitignore`d because it should never be committed.

Create `id.json` in the repo root with this structure:

```json
{
  "Patient001": {
    "name": "Ελένη Κ. Παπαδοπούλου",
    "birth_date": "14/03/1938",
    "amka": "*******4217",
    "phone": "6974 521 839",
    "address": "Τσιμισκή 78, Θεσσαλονίκη 54622"
  },
  "Patient002": {
    "name": "Νικόλαος Γ. Αντωνίου",
    "birth_date": "22/08/1980",
    "amka": "*******6053",
    "phone": "6938 274 610",
    "address": "Εγνατία 145, Θεσσαλονίκη 54636"
  }
}
```

Add an entry for each patient before transcribing them. The values are fake — real identity fields are redacted (magenta rectangles) in the source JPGs.

## Step 5: Select the repo folder in Cowork

When starting a Cowork session, select the `AA_Endo/` folder as your working directory so the skills can find the templates, knowledge base, and source images.

## Usage

Once set up, just open a Cowork chat and say:

```
transcribe Patient003 v10
```

The skill handles everything — reading the JPG scans, transcribing, running the medical review, and producing the final `.docx` in `./transcribed/v10/`.

## Folder overview

```
AA_Endo/
├── original_jpg/          Source JPGs (pre-cropped, identity fields magenta-redacted)
├── templates/             Lab panel definitions (CBC, Lipids, Thyroid, etc.)
├── transcribed/v7-v10/    Final .docx output
├── transcription_knowledge.json   Shared knowledge base (abbreviations, medical terms)
├── id.json                Local-only synthetic patient identities (not committed)
├── v7_template_generator.js       Template scripts (do not edit directly)
├── v8_template_generator.js
├── v10_template_generator.js
├── scratch/               Intermediate files (gitignored)
└── endo-transcribe.plugin Plugin file (install into Cowork)
```
