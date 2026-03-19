"""
=============================================================================
Processing Patient004_1.jpg through Google Cloud Vision API
=============================================================================

This script shows the EXACT code you'd run to process the uploaded scan.
Since we can't call the actual Vision API from this environment (network
restrictions), I'll show the code AND the expected output structure.

=============================================================================
"""

# ─────────────────────────────────────────────────────────────────────────
# STEP 1: ONE-TIME SETUP
# ─────────────────────────────────────────────────────────────────────────
#
# 1a. Create a Google Cloud project (or use existing)
#     https://console.cloud.google.com/
#
# 1b. Enable the Vision API:
#     gcloud services enable vision.googleapis.com
#
# 1c. Create a service account + download JSON key:
#     gcloud iam service-accounts create vision-ocr \
#         --display-name="Vision OCR for medical notes"
#     gcloud iam service-accounts keys create ~/vision-key.json \
#         --iam-account=vision-ocr@YOUR_PROJECT.iam.gserviceaccount.com
#
# 1d. Install the Python client:
#     pip install google-cloud-vision
#
# 1e. Set the credential:
#     export GOOGLE_APPLICATION_CREDENTIALS=~/vision-key.json


# ─────────────────────────────────────────────────────────────────────────
# STEP 2: THE CODE — Process Patient004_1.jpg
# ─────────────────────────────────────────────────────────────────────────

from google.cloud import vision
from google.cloud.vision_v1 import types
import json
import os


def process_patient_scan(image_path: str, eu_only: bool = True) -> dict:
    """
    Process a single patient scan through Vision API.
    
    Args:
        image_path: Path to the JPG file
        eu_only: If True, use EU endpoint for GDPR compliance
    
    Returns:
        dict with full_text, pages, blocks, and per-word confidence
    """
    
    # --- Create client (EU endpoint for GDPR) ---
    endpoint = "eu-vision.googleapis.com" if eu_only else None
    client_options = {"api_endpoint": endpoint} if endpoint else {}
    client = vision.ImageAnnotatorClient(client_options=client_options)
    
    # --- Read the image ---
    with open(image_path, "rb") as f:
        content = f.read()
    
    image = vision.Image(content=content)
    
    # --- Configure for Greek handwriting ---
    # "el" = Greek language hint
    # "el-t-i0-handwrit" = Greek, transformed from handwriting input
    image_context = vision.ImageContext(
        language_hints=["el", "el-t-i0-handwrit"]
    )
    
    # --- Call DOCUMENT_TEXT_DETECTION (not TEXT_DETECTION) ---
    # DOCUMENT_TEXT_DETECTION is optimized for dense text / handwriting
    # TEXT_DETECTION is for sparse text in photos (signs, etc.)
    response = client.document_text_detection(
        image=image,
        image_context=image_context,
    )
    
    # --- Check for errors ---
    if response.error.message:
        raise Exception(f"Vision API error: {response.error.message}")
    
    # --- Extract the full text ---
    full_text = ""
    if response.full_text_annotation:
        full_text = response.full_text_annotation.text
    
    # --- Extract structured page/block/paragraph/word data ---
    pages = []
    if response.full_text_annotation:
        for page in response.full_text_annotation.pages:
            page_info = {
                "width": page.width,
                "height": page.height,
                "languages": [
                    {"code": lang.language_code, "confidence": round(lang.confidence, 3)}
                    for lang in (page.property.detected_languages if page.property else [])
                ],
                "blocks": []
            }
            
            for block in page.blocks:
                block_text = ""
                block_words = []
                
                for paragraph in block.paragraphs:
                    for word in paragraph.words:
                        word_text = "".join(s.text for s in word.symbols)
                        block_text += word_text + " "
                        block_words.append({
                            "text": word_text,
                            "confidence": round(word.confidence, 3),
                        })
                
                page_info["blocks"].append({
                    "type": block.block_type.name,  # TEXT, TABLE, PICTURE, etc.
                    "confidence": round(block.confidence, 3),
                    "text": block_text.strip(),
                    "words": block_words,
                })
            
            pages.append(page_info)
    
    return {
        "file": os.path.basename(image_path),
        "full_text": full_text,
        "pages": pages,
    }


# ─────────────────────────────────────────────────────────────────────────
# STEP 3: RUN IT
# ─────────────────────────────────────────────────────────────────────────

# result = process_patient_scan("Patient004_1.jpg", eu_only=True)
# print(result["full_text"])


# ─────────────────────────────────────────────────────────────────────────
# STEP 4: WHAT YOU GET BACK
# ─────────────────────────────────────────────────────────────────────────
#
# Vision API returns a FLAT TEXT DUMP. For Patient004_1.jpg, you'd get
# something approximately like this (actual output will vary):
#
# """
# Δημήτριος Γ. Μπουγιουκλής
# Ειδικός Ενδοκρινολόγος - Διαβητολόγος
# Μητρ. Ιωσήφ 10, 2ος όροφος
# 546 22 Θεσσαλονίκη
# ΑΜΚΑ: 13059700891
# Τηλ./Fax: 2310 24.24.20
# Κιν: 6973 83.21.74
# 3/4/23
# -Κ. [patient name]
# Ημερ. Γεν: 13/5/97 → 26Χρ
# -ΚΑΤΟΙΚΙΑ: ΜΗΤΡ. ΓΕΝΝΑΔΙΟΥ-10-/ΚΕΝΤΡΟ /ΤΚ:54631/ΤΗΛ:6981597086
# -ΕΡΓΑΣΙΑ: ΦΟΙΤΗΤΗΣ ΨΥΧΟΛΟΓΙΑΣ/ΚΑΠΝΙΣΜΑ: ΑΠΟ 16Χρ(2-3/d)/ΑΛΚΟΟΛ:Κοινωνικός
# Πόση/ΑΛΛΕΡΓΙΑ:φ /ΑΓΩΓΗ: ZOLOFT 50mg x1
# ...
# """
#
# KEY OBSERVATIONS about Vision API output:
#
# 1. It's FLAT TEXT — no structure. "TSH 2,18" is just characters,
#    not identified as a lab result.
#
# 2. The family pedigree DIAGRAM (boxes, circles, lines) will be
#    largely LOST — Vision API reads text near the symbols but
#    doesn't understand the genealogical meaning.
#
# 3. Handwritten abbreviations like "κφ" (κανονικός/φυσιολογικός)
#    may or may not be correctly read.
#
# 4. The tabular lab results section will come back as a text blob,
#    not as structured key-value pairs.
#
# 5. Confidence scores per word tell you WHERE the OCR struggled.


# ─────────────────────────────────────────────────────────────────────────
# STEP 5: THE MISSING PIECE — Structuring with an LLM
# ─────────────────────────────────────────────────────────────────────────
#
# Vision API gives you RAW TEXT. To turn it into structured medical data,
# you need a second pass. This is what your Cowork skill already does
# in a single step with Claude.
#
# The hybrid approach: Vision API extracts characters (possibly catching
# ones Claude's vision misses in dense areas), then Claude structures it.

import anthropic  # pip install anthropic


def structure_medical_note(raw_ocr_text: str, image_path: str = None) -> dict:
    """
    Take Vision API's raw text output and structure it using Claude.
    Optionally also pass the original image for cross-reference.
    """
    client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var
    
    prompt = f"""You are processing a Greek endocrinology patient note.
The following text was extracted via OCR from a handwritten note.
Please structure it into the following JSON fields, keeping all text in Greek:

{{
  "patient": {{
    "name": "",
    "amka": "",
    "dob": "",
    "age": "",
    "address": "",
    "phone": "",
    "occupation": ""
  }},
  "habits": {{
    "smoking": "",
    "alcohol": "",
    "allergies": ""
  }},
  "current_medications": [],
  "referral": {{
    "from": "",
    "reason": ""
  }},
  "presenting_complaint": "",
  "family_history": {{
    "father": [],
    "mother": [],
    "siblings": [],
    "notes": ""
  }},
  "clinical_exam": {{
    "weight_kg": "",
    "height_cm": "",
    "bmi": "",
    "bp_systolic": "",
    "bp_diastolic": "",
    "pulse": "",
    "findings": []
  }},
  "lab_results": {{
    "date": "",
    "values": [
      {{"test": "", "value": "", "unit": "", "reference_range": "", "flag": ""}}
    ]
  }},
  "orders": [],
  "next_steps": []
}}

OCR TEXT:
{raw_ocr_text}
"""
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    
    return json.loads(message.content[0].text)


# ─────────────────────────────────────────────────────────────────────────
# STEP 6: BATCH PROCESSING — All scans for a patient
# ─────────────────────────────────────────────────────────────────────────

def process_patient_folder(patient_folder: str) -> dict:
    """
    Process all JPG scans for a patient, concatenate OCR text,
    then structure the combined output.
    
    Expected folder structure:
        patients/
            Patient004/
                Patient004_1.jpg
                Patient004_2.jpg   (if multiple pages)
                Patient004_3.jpg
    """
    jpg_files = sorted(Path(patient_folder).glob("*.jpg"))
    
    all_text = []
    all_results = []
    
    client = vision.ImageAnnotatorClient(
        client_options={"api_endpoint": "eu-vision.googleapis.com"}
    )
    
    for jpg in jpg_files:
        print(f"Processing {jpg.name}...")
        result = process_patient_scan(str(jpg), eu_only=True)
        all_text.append(f"\n--- Page: {jpg.name} ---\n{result['full_text']}")
        all_results.append(result)
        
        # Print per-word confidence stats
        if result["pages"]:
            words = [w for b in result["pages"][0]["blocks"] for w in b["words"]]
            low_conf = [w for w in words if w["confidence"] < 0.8]
            print(f"  → {len(words)} words, {len(low_conf)} below 80% confidence")
            if low_conf:
                print(f"  → Low confidence words: {[w['text'] for w in low_conf[:10]]}")
    
    combined_text = "\n".join(all_text)
    
    # Structure with Claude
    structured = structure_medical_note(combined_text)
    
    return {
        "patient_id": os.path.basename(patient_folder),
        "raw_ocr": all_results,
        "combined_text": combined_text,
        "structured": structured,
    }


# ─────────────────────────────────────────────────────────────────────────
# STEP 7: COST ESTIMATE for Patient004
# ─────────────────────────────────────────────────────────────────────────
#
# Patient004 = 1 page (Patient004_1.jpg)
#
# Vision API:
#   - First 1,000 pages/month: FREE
#   - After that: $1.50 per 1,000 pages
#   - This single page: $0.00 (within free tier)
#
# Claude structuring pass (Sonnet):
#   - ~2,000 input tokens (OCR text + prompt): ~$0.006
#   - ~1,500 output tokens (structured JSON): ~$0.024
#   - This single page: ~$0.03
#
# For 1,000 patients × ~5 pages average = 5,000 pages total:
#   - Vision API: ~$6.00 (after free 1,000)
#   - Claude structuring: ~$150 (at ~$0.03/page)
#   - TOTAL: ~$156 for the entire practice backlog
#
# Compare to: your current Cowork single-pass approach
#   - Claude vision (image input): ~$0.01-0.05 per page
#   - Claude structuring: included in same call
#   - TOTAL: ~$50-250 for entire backlog
#
# The hybrid approach costs slightly more but may catch
# 5-10% more characters in dense handwriting areas.


# ─────────────────────────────────────────────────────────────────────────
# SUMMARY: Vision API pipeline for Patient004
# ─────────────────────────────────────────────────────────────────────────
#
# WHAT VISION API DOES WELL:
#   ✓ Character-level extraction — may catch characters Claude misses
#   ✓ Per-word confidence scores — tells you WHERE it struggled  
#   ✓ Bounding boxes — you know exactly where each word is on the page
#   ✓ EU data residency endpoint
#   ✓ Dirt cheap ($1.50/1000 pages)
#   ✓ Greek language support with handwriting hints
#
# WHAT VISION API DOES NOT DO:
#   ✗ Understand medical context ("TSH 2,18" is just text, not a lab value)
#   ✗ Interpret diagrams (the family pedigree tree)
#   ✗ Structure data into fields (patient, labs, medications)
#   ✗ Know that "κφ" means "κανονικός/φυσιολογικός"
#   ✗ Handle abbreviations common in Greek medical handwriting
#
# VERDICT FOR PATIENT004:
#   This note is DENSE — labs, family tree diagram, clinical exam,
#   abbreviations, mixed text sizes. Vision API alone would give you
#   ~70-85% usable text. You NEED the LLM structuring pass regardless.
#
#   Your current Cowork/Claude single-pass at 80-90% is already
#   competitive. The hybrid (Vision + Claude) might push you to 90-95%
#   on the text extraction, at the cost of pipeline complexity.
#
#   Recommendation: Test 10-20 of the HARDEST pages through both
#   approaches and compare. If the gain is marginal, keep it simple.


from pathlib import Path

if __name__ == "__main__":
    # Example usage:
    # result = process_patient_scan("Patient004_1.jpg")
    # print(json.dumps(result, indent=2, ensure_ascii=False))
    
    print("Vision API walkthrough script ready.")
    print("Set GOOGLE_APPLICATION_CREDENTIALS and uncomment the calls above.")
    print()
    print("For Patient004_1.jpg:")
    print("  - 1 page, ~$0.00 (free tier)")
    print("  - Use DOCUMENT_TEXT_DETECTION with language_hints=['el', 'el-t-i0-handwrit']")
    print("  - Use EU endpoint: eu-vision.googleapis.com")
    print("  - Follow with Claude structuring for medical field extraction")
