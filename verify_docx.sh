#!/bin/bash

DOCX_FILE="transcribed/v8/Patient005_1_digitized_v8.docx"
VERIFY_DIR="scratch/verify_docx"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DOCX FILE VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check file exists and size
echo "1. FILE SIZE CHECK"
if [ ! -f "$DOCX_FILE" ]; then
  echo "   ✗ File not found: $DOCX_FILE"
  exit 1
fi

FILE_SIZE=$(ls -lh "$DOCX_FILE" | awk '{print $5}')
FILE_SIZE_BYTES=$(stat -f%z "$DOCX_FILE" 2>/dev/null || stat -c%s "$DOCX_FILE")

echo "   ✓ File exists: $DOCX_FILE"
echo "   ✓ File size: $FILE_SIZE ($FILE_SIZE_BYTES bytes)"

if [ "$FILE_SIZE_BYTES" -lt 500000 ]; then
  echo "   ⚠ Warning: File size is less than 500KB. Expected >500KB with 2 embedded JPGs"
else
  echo "   ✓ File size looks reasonable (>500KB)"
fi
echo ""

# 2. Unzip and check structure
echo "2. INTERNAL STRUCTURE CHECK"
mkdir -p "$VERIFY_DIR"
cd "$VERIFY_DIR"

# Create a copy and unzip
cp "../../$DOCX_FILE" test.docx
unzip -q test.docx 2>/dev/null || { echo "   ✗ Failed to unzip docx file"; exit 1; }
echo "   ✓ Successfully unzipped"
echo ""

# 3. Check document.xml exists
echo "3. DOCUMENT.XML CHECK"
if [ -f "word/document.xml" ]; then
  echo "   ✓ word/document.xml found"
  DOC_SIZE=$(stat -f%z word/document.xml 2>/dev/null || stat -c%s word/document.xml)
  echo "   ✓ document.xml size: $DOC_SIZE bytes"
else
  echo "   ✗ word/document.xml NOT found"
fi
echo ""

# 4. Check for media folder with images
echo "4. EMBEDDED IMAGES CHECK"
if [ -d "word/media" ]; then
  echo "   ✓ word/media folder found"
  IMG_COUNT=$(ls -1 word/media/ 2>/dev/null | wc -l)
  echo "   ✓ Image count: $IMG_COUNT"
  
  if [ "$IMG_COUNT" -ge 2 ]; then
    echo "   ✓ At least 2 images found (expected)"
  else
    echo "   ⚠ Warning: Expected at least 2 images, found $IMG_COUNT"
  fi
  
  echo "   Image files:"
  ls -lh word/media/
else
  echo "   ✗ word/media folder NOT found"
fi
echo ""

# 5. Check for relationships
echo "5. DOCUMENT RELATIONSHIPS CHECK"
if [ -f "word/_rels/document.xml.rels" ]; then
  echo "   ✓ word/_rels/document.xml.rels found"
  REL_COUNT=$(grep -c "image" word/_rels/document.xml.rels 2>/dev/null || echo "0")
  echo "   ✓ Image relationships found: $REL_COUNT"
else
  echo "   ✗ word/_rels/document.xml.rels NOT found"
fi
echo ""

# 6. Check for sections
echo "6. DOCUMENT SECTIONS CHECK"
SECTION_COUNT=$(grep -o "<w:sectPr" word/document.xml 2>/dev/null | wc -l)
echo "   ✓ Section count: $SECTION_COUNT"

if [ "$SECTION_COUNT" -ge 2 ]; then
  echo "   ✓ At least 2 sections found (transcription + images)"
else
  echo "   ⚠ Warning: Expected 2+ sections, found $SECTION_COUNT"
fi
echo ""

# 7. Check document.xml integrity
echo "7. XML INTEGRITY CHECK"
if grep -q "<?xml" word/document.xml; then
  echo "   ✓ Valid XML header found"
fi

if grep -q "</w:document>" word/document.xml; then
  echo "   ✓ Valid XML closing tag found"
  echo "   ✓ document.xml appears well-formed"
else
  echo "   ✗ document.xml may be malformed (missing closing tag)"
fi
echo ""

# Cleanup
cd ../..
rm -rf "$VERIFY_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ VERIFICATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
