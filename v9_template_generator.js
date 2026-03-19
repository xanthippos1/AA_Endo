#!/usr/bin/env node
/**
 * V9 TEMPLATE GENERATOR — Reference implementation for digitizing handwritten medical notes.
 *
 * V9 fuses Google Vision API OCR with Claude's image reading, then runs a medical review.
 * The docx engine is identical to v7/v8 — only the workflow differs.
 *
 * HOW TO USE THIS FILE:
 * 1. Copy this file and rename it: create_patientXXX_v9.js
 * 2. Replace all content in the "TRANSCRIPTION CONTENT" section with actual transcribed data
 * 3. Update IMAGE_FILES, OUTPUT_PATH, and patient-specific metadata
 * 4. Run: node create_patientXXX_v9.js
 *
 * DEPENDENCIES: npm install docx
 *
 * This file is the COMPLETE, WORKING code that produces a v9 document.
 * DO NOT simplify, refactor, or "improve" the structure — it works exactly as-is.
 * A new Claude session should use this as a starting point, NOT try to write from scratch.
 */

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, VerticalAlign, ImageRun
} = require('docx');

// =============================================================================
// CONFIGURATION — Update these for each patient
// =============================================================================

// Source image files (pre-cropped JPGs from original_jpg/; names are whited out in scans)
const IMAGE_FILES = [
  { path: "./original_jpg/PatientXXX_1.jpg", width: 1700, height: 2366 },
  // Add more pages if multi-page scan:
  // { path: "./original_jpg/PatientXXX_2.jpg", width: 1700, height: 2366 },
];

// Output path
const OUTPUT_PATH = "./transcribed/v9/PatientXXX_1_digitized_v9.docx";

// Patient AMKA (masked) — use "[Δεν καταγράφηκε]" if not recorded
const PATIENT_AMKA = "*******XXXX";

// =============================================================================
// V9 ENGINE — Do not modify below this line unless fixing bugs
// =============================================================================

// Fit-to-page image sizing for appended original scans
// A4 with 0.5cm margins: content area = 200mm × 287mm
// docx-js uses 96 DPI for pixel→EMU: 756px × 1085px, with ~1% safety buffer
// CRITICAL: Images must NEVER be cropped. Scale down to fit entirely within the page.
const MAX_IMG_W = 750;
const MAX_IMG_H = 1070;
function fitToPage(imgW, imgH) {
  const scaleW = MAX_IMG_W / imgW;
  const scaleH = MAX_IMG_H / imgH;
  const scale = Math.min(scaleW, scaleH);
  return { width: Math.round(imgW * scale), height: Math.round(imgH * scale) };
}

// Row number tracking — every content line gets a sequential gray number
let rowCounter = 0;
function nextRow() { rowCounter++; return String(rowCounter).padStart(2, '0'); }
function rowNum(num) { return new TextRun({ text: num + " ", font: "Courier New", size: 14, color: "999999" }); }

// Color constants
const PURPLE = "7B2D8E";  // Medical terms + drug names
const RED = "CC0000";      // Uncertain readings
const BLUE = "2E75B6";     // Section titles

// --- Text helper functions ---
// All sizes are in half-points: size: 18 = 9pt, size: 16 = 8pt, size: 28 = 14pt
function bold(text) { return new TextRun({ text, bold: true, font: "Arial", size: 18 }); }
function normal(text) { return new TextRun({ text, font: "Arial", size: 18 }); }
function italic(text) { return new TextRun({ text, italics: true, font: "Arial", size: 18 }); }
function small(text) { return new TextRun({ text, font: "Arial", size: 16 }); }
function smallBold(text) { return new TextRun({ text, bold: true, font: "Arial", size: 16 }); }

// Medical terms: PURPLE + UPPERCASE + BOLD — use for disease names, conditions
function medical(text) { return new TextRun({ text: text.toUpperCase(), font: "Arial", size: 18, color: PURPLE, bold: true }); }
function medSmall(text) { return new TextRun({ text: text.toUpperCase(), font: "Arial", size: 16, color: PURPLE, bold: true }); }

// Drug names: PURPLE + UPPERCASE + BOLD — use for all medication/pharmaceutical names
function drug(text) { return new TextRun({ text: text.toUpperCase(), font: "Arial", size: 18, color: PURPLE, bold: true }); }

// Uncertain readings: RED + [text?] brackets — use when handwriting is unclear
function uncertain(text) { return new TextRun({ text: "[" + text + "?]", font: "Arial", size: 18, color: RED }); }
function uncertainNum(text) { return new TextRun({ text, font: "Arial", size: 18, color: RED }); }
function uncertainSmall(text) { return new TextRun({ text: "[" + text + "?]", font: "Arial", size: 16, color: RED }); }

// --- Numbered content line builders ---

// nLine: a numbered line with custom children (TextRun array)
// Usage: nLine([bold("Label: "), normal("value"), medical("TERM")])
function nLine(children) {
  const rn = nextRow();
  return new Paragraph({ spacing: { after: 40 }, children: [rowNum(rn), ...children] });
}

// nLabelVal: shortcut for "Label: Value" pattern
// Usage: nLabelVal("Όνομα", "Ασθενής 004")
function nLabelVal(label, value) {
  const rn = nextRow();
  return new Paragraph({ spacing: { after: 40 }, children: [rowNum(rn), bold(label + ": "), normal(value)] });
}

// --- Section title inside a box ---
function boxTitle(text) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 18, color: BLUE })]
  });
}

// --- Border definitions ---
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// Page dimensions: A4 with 2cm margins
// A4 = 11906 x 16838 DXA, margin = 1134 DXA (2cm)
const contentWidth = 11906 - 2 * 1134; // = 9638 DXA

// =============================================================================
// LAYOUT FUNCTIONS — Box arrangements for section content
// =============================================================================

// Two boxes side by side (used for Demographics|Social, Medication|Illness, etc.)
function twoBoxRow(leftTitle, leftContent, rightTitle, rightContent) {
  const colWidth = Math.floor(contentWidth / 2);
  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [colWidth, contentWidth - colWidth],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: thinBorders, width: { size: colWidth, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [boxTitle(leftTitle), ...leftContent]
        }),
        new TableCell({
          borders: thinBorders, width: { size: contentWidth - colWidth, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [boxTitle(rightTitle), ...rightContent]
        }),
      ]
    })]
  });
}

// Three-column box (used for family history: Self | Father | Mother)
function threeBoxRow(titles, contents) {
  const col1 = Math.floor(contentWidth / 3);
  const col2 = Math.floor(contentWidth / 3);
  const col3 = contentWidth - col1 - col2;
  const colWidths = [col1, col2, col3];
  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [new TableRow({
      children: titles.map((title, i) =>
        new TableCell({
          borders: thinBorders, width: { size: colWidths[i], type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [boxTitle(title), ...contents[i]]
        })
      )
    })]
  });
}

// Four-column box (used when family history includes siblings)
function fourBoxRow(titles, contents) {
  const colW = Math.floor(contentWidth / 4);
  const colWidths = [colW, colW, colW, contentWidth - 3 * colW];
  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [new TableRow({
      children: titles.map((title, i) =>
        new TableCell({
          borders: thinBorders, width: { size: colWidths[i], type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [boxTitle(title), ...contents[i]]
        })
      )
    })]
  });
}

// Full-width section box (used for clinical exam, labs, instructions)
function fullWidthBox(title, content) {
  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [contentWidth],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: thinBorders, width: { size: contentWidth, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [boxTitle(title), ...content]
        })
      ]
    })]
  });
}

// Spacer between sections
function spacer(h = 120) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}

// Clinical examination table (Label | Value, with blue-shaded label column)
function examTable(rows) {
  const colWidths = [500, 2400, 5400];
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map(([label, valueChildren]) => {
      const rn = nextRow();
      const valChildren = typeof valueChildren === 'string' ? [small(valueChildren)] : valueChildren;
      return new TableRow({
        children: [
          new TableCell({ borders: thinBorders, width: { size: colWidths[0], type: WidthType.DXA }, margins: { top: 30, bottom: 30, left: 60, right: 60 },
            children: [new Paragraph({ children: [new TextRun({ text: rn, font: "Courier New", size: 14, color: "999999" })] })] }),
          new TableCell({ borders: thinBorders, width: { size: colWidths[1], type: WidthType.DXA }, shading: { fill: "E8F0F8", type: ShadingType.CLEAR }, margins: { top: 30, bottom: 30, left: 60, right: 60 },
            children: [new Paragraph({ children: [smallBold(label)] })] }),
          new TableCell({ borders: thinBorders, width: { size: colWidths[2], type: WidthType.DXA }, margins: { top: 30, bottom: 30, left: 60, right: 60 },
            children: [new Paragraph({ children: valChildren })] }),
        ]
      });
    })
  });
}

// Lab results table (4 columns: #, Test, Value, Reference Range)
function labTable(rows) {
  const colWidths = [500, 2600, 2400, 2800];
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    children: [
      { text: "#", w: colWidths[0] },
      { text: "Εξέταση", w: colWidths[1] },
      { text: "Τιμή", w: colWidths[2] },
      { text: "Φυσιολ. Τιμές", w: colWidths[3] },
    ].map(({ text, w }) =>
      new TableCell({
        borders: thinBorders, width: { size: w, type: WidthType.DXA },
        shading: { fill: BLUE, type: ShadingType.CLEAR },
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 14, color: "FFFFFF" })] })]
      })
    )
  });
  const dataRows = rows.map(([test, value, ref]) => {
    const rn = nextRow();
    return new TableRow({
      children: [
        new TableCell({ borders: thinBorders, width: { size: colWidths[0], type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: rn, font: "Courier New", size: 14, color: "999999" })] })] }),
        new TableCell({ borders: thinBorders, width: { size: colWidths[1], type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 60, right: 60 },
          children: [new Paragraph({ children: [small(test)] })] }),
        new TableCell({ borders: thinBorders, width: { size: colWidths[2], type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 60, right: 60 },
          children: [new Paragraph({ children: [small(value)] })] }),
        new TableCell({ borders: thinBorders, width: { size: colWidths[3], type: WidthType.DXA }, margins: { top: 20, bottom: 20, left: 60, right: 60 },
          children: [new Paragraph({ children: [small(ref)] })] }),
      ]
    });
  });
  return new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: colWidths, rows: [headerRow, ...dataRows] });
}

// Doctor letterhead (appears at top of document)
function doctorLetterhead(amka) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new TextRun({ text: "Δημήτριος Γ. Μπουγιουκλής", bold: true, font: "Arial", size: 28 })]
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: "Ειδικός Ενδοκρινολόγος - Διαβητολόγος", font: "Arial", size: 20, italics: true })]
    }),
    new Table({
      width: { size: contentWidth, type: WidthType.DXA },
      columnWidths: [Math.floor(contentWidth / 2), contentWidth - Math.floor(contentWidth / 2)],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: noBorders, width: { size: Math.floor(contentWidth / 2), type: WidthType.DXA },
            children: [
              new Paragraph({ spacing: { after: 20 }, children: [small("Μητρ. Ιωσήφ 10, 2ος όροφος")] }),
              new Paragraph({ spacing: { after: 0 }, children: [small("546 22 Θεσσαλονίκη")] }),
            ]
          }),
          new TableCell({
            borders: noBorders, width: { size: contentWidth - Math.floor(contentWidth / 2), type: WidthType.DXA },
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 20 }, children: [small("Τηλ. / Fax: 2310 24.24.20")] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [small("Κιν: 6973 83.21.74")] }),
            ]
          }),
        ]
      })]
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "333333", space: 1 } },
      spacing: { before: 80, after: 40 },
      children: []
    }),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 120 },
      children: amka.startsWith("[")
        ? [new TextRun({ text: "ΑΜΚΑ: ", bold: true, font: "Arial", size: 18, color: "333333" }),
           new TextRun({ text: amka, font: "Arial", size: 18, color: "999999", italics: true })]
        : [new TextRun({ text: "ΑΜΚΑ: ", bold: true, font: "Arial", size: 18, color: "333333" }),
           new TextRun({ text: amka, font: "Arial", size: 18, color: "333333" })]
    }),
  ];
}

// Transcription notes footer (appears at end of transcription section)
function transcriptionNotes(sourceFiles, dateStr) {
  return [
    spacer(120),
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: RED, space: 1 } },
      spacing: { before: 200, after: 40 },
      children: [new TextRun({ text: "ΣΗΜΕΙΩΣΕΙΣ ΜΕΤΑΓΡΑΦΗΣ", bold: true, font: "Arial", size: 18, color: RED })]
    }),
    new Paragraph({ spacing: { after: 30 }, children: [
      small("Αυτόματη μεταγραφή από χειρόγραφη σάρωση. "),
      new TextRun({ text: "[Κόκκινα?]", font: "Arial", size: 16, color: RED }), small(" = αβέβαια. "),
      new TextRun({ text: "ΜΩΒΑ ΚΕΦΑΛΑΙΑ", font: "Arial", size: 16, color: PURPLE, bold: true }), small(" = ιατρικοί όροι/φάρμακα."),
    ] }),
    new Paragraph({ spacing: { after: 30 }, children: [small("Αριθμοί γραμμών (π.χ. 05) για εύκολη αναφορά σε διορθώσεις.")] }),
    new Paragraph({ spacing: { after: 30 }, children: [small(`Πηγή: ${sourceFiles}  |  Μεταγραφή: ${dateStr}  |  Έκδοση: 9 (Google Vision + Claude fusion)`)] }),
  ];
}

// =============================================================================
// TRANSCRIPTION CONTENT — Replace everything below with actual patient data
// =============================================================================

// This example shows the STRUCTURE. Replace with real transcribed content.
const transcriptionChildren = [
  ...doctorLetterhead(PATIENT_AMKA),

  // ==================== VISIT 1 ====================
  new Paragraph({ heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 1 — DD/MM/YYYY", font: "Arial" })] }),
  spacer(60),

  // Row 1: Demographics | Social/Lifestyle
  twoBoxRow(
    "ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ",
    [
      nLabelVal("Όνομα", "Ασθενής XXX"),
      nLabelVal("Ημερ. Γέννησης", "DD/MM/YYYY (XX ετών)"),
      nLabelVal("Κατοικία", "[διεύθυνση]"),
      nLabelVal("Τηλέφωνο", "XXXX XXX XXX"),
    ],
    "ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ",
    [
      nLabelVal("Εργασία", "[επάγγελμα]"),
      nLabelVal("Κάπνισμα", "[ποσότητα]"),
      nLabelVal("Αλκοόλ", "[ποσότητα]"),
      nLine([bold("Αλλεργία: "), normal("[αλλεργίες ή Φ]")]),
    ]
  ),
  spacer(60),

  // Row 2: Current Medication | Presenting Illness
  twoBoxRow(
    "ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ",
    [
      nLine([drug("DRUG_NAME"), normal(" [δοσολογία]")]),
    ],
    "ΠΑΡΟΥΣΑ ΝΟΣΟΣ",
    [
      nLine([medical("CONDITION"), normal(" — [λεπτομέρειες]")]),
    ]
  ),
  spacer(60),

  // Row 3: Referral | Medical History
  twoBoxRow(
    "ΠΑΡΑΠΟΜΠΗ",
    [
      nLine([bold("Από: "), normal("[παραπέμπων ιατρός/πρόσωπο]")]),
    ],
    "ΑΝΑΜΝΗΣΤΙΚΟ",
    [
      nLine([normal("① [ιστορικό 1]")]),
      nLine([normal("② [ιστορικό 2]")]),
    ]
  ),
  spacer(60),

  // Row 4: Family History
  // Use threeBoxRow for Self|Father|Mother, or fourBoxRow if siblings exist
  threeBoxRow(
    ["ΟΙΚΟΓ. ΙΣΤΟΡ. — Πατέρας", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Μητέρα", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Ασθενής"],
    [
      [ nLine([normal("• "), medical("CONDITION")]) ],
      [ nLine([normal("• "), medical("CONDITION")]) ],
      [ nLine([normal("Βλ. Αναμνηστικό")]) ],
    ]
  ),
  spacer(60),

  // Row 5: Clinical Examination
  fullWidthBox("ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ", [
    examTable([
      ["Βάρος", "[XX] Kgr"],
      ["Ύψος", "[XXX] cm"],
      ["ΑΠ", "[XXX/XX] mmHg"],
      ["Σφύξεις", "[XX]/min"],
      ["Καρδιά", "[findings]"],
      ["Πνεύμονες", "κφ"],
      ["Κοιλία", "κφ"],
      // Add more exam items as found in the handwriting
    ]),
    new Paragraph({ spacing: { before: 80, after: 40 },
      children: [italic("[Διάγραμμα εξέτασης: βλ. πρωτότυπη σάρωση]")] }),
  ]),
  spacer(60),

  // Row 6: Lab Results (use placeholder if none for this visit)
  fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ", [
    new Paragraph({ children: [italic("[Δεν υπάρχουν εργαστηριακά αποτελέσματα για αυτή την επίσκεψη]")] }),
    // OR use labTable for actual results:
    // labTable([
    //   ["WBC", "6800", ""],
    //   ["HGB", "16,4", "ΦΤ: 13-17"],
    // ]),
  ]),
  spacer(60),

  // Row 7: Instructions
  fullWidthBox("ΟΔΗΓΙΕΣ", [
    nLine([normal("① [οδηγία 1]")]),
    nLine([normal("② [οδηγία 2]")]),
  ]),

  // ==================== VISIT 2 (if applicable) ====================
  // Uncomment and fill in for additional visits:
  //
  // new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
  //   children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 2 — DD/MM/YYYY", font: "Arial" })] }),
  // spacer(60),
  //
  // fullWidthBox("ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ", [
  //   nLine([italic("Βλ. Επίσκεψη 1 (χωρίς αλλαγές)")]),
  // ]),
  // spacer(60),
  //
  // fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ (DD/MM/YYYY)", [
  //   labTable([
  //     ["Test", "Value", "Reference"],
  //   ]),
  // ]),
  // spacer(60),
  //
  // fullWidthBox("ΟΔΗΓΙΕΣ (Επίσκεψη 2)", [
  //   nLine([normal("① [οδηγία]")]),
  // ]),

  // Transcription footer
  ...transcriptionNotes("PatientXXX_1.jpg", new Date().toLocaleDateString('el-GR')),
];

// =============================================================================
// DOCUMENT ASSEMBLY — Creates the complete .docx with transcription + appended scans
// =============================================================================

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 18 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 0 } },
    ]
  },
  sections: [
    // ===== SECTION 1: TRANSCRIPTION (A4, 2cm margins) =====
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },           // A4
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }  // 2cm
        }
      },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [] })] })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Σελίδα ", font: "Arial", size: 14, color: "666666" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: "666666" })
            ]
          })]
        })
      },
      children: transcriptionChildren,
    },

    // ===== SECTION 2: ORIGINAL SCANS (A4, 0.5cm margins, no headers/footers) =====
    // CRITICAL: This MUST be a separate section because margins differ from transcription
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },           // A4
          margin: { top: 284, right: 284, bottom: 284, left: 284 }  // 0.5cm
        }
      },
      headers: { default: new Header({ children: [new Paragraph({ children: [] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [] })] }) },
      children: IMAGE_FILES.map((img, idx) => {
        const para = new Paragraph({
          ...(idx > 0 ? { pageBreakBefore: true } : {}),
          spacing: { before: 0, after: 0 },
          children: [new ImageRun({
            type: "jpg",
            data: fs.readFileSync(img.path),
            transformation: fitToPage(img.width, img.height),
            altText: {
              title: `Original Page ${idx + 1}`,
              description: `Πρωτότυπη σάρωση σελίδας ${idx + 1}`,
              name: `page${idx + 1}`
            }
          })]
        });
        return para;
      }),
    },
  ]
});

// =============================================================================
// STRUCTURAL VALIDATION — Catches invalid nesting before Packer runs
// =============================================================================

/**
 * Validates that the document structure doesn't contain invalid nesting patterns
 * that produce corrupt .docx files (which Word will refuse to open).
 *
 * Known issues this catches:
 *  - Paragraph nested inside Paragraph (e.g., wrapping nLine() in new Paragraph())
 *  - Bare TextRun inside TableCell (must be wrapped in Paragraph)
 *
 * Uses docx-js v9 internal structure: objects store children in .root (indexed),
 * NOT in .options.children.
 */
function validateDocStructure(doc) {
  let errors = 0;
  const Pg = Paragraph;
  const Tb = Table;
  const TR = TextRun;

  function walkRoot(obj, path) {
    if (!obj || !obj.root) return;
    const keys = Object.keys(obj.root);
    for (const k of keys) {
      const child = obj.root[k];
      if (!child || !child.constructor) continue;
      const name = child.constructor.name;

      // Paragraph should not contain Paragraph or Table
      if (obj instanceof Pg && child instanceof Pg) {
        console.error(`ERROR: Paragraph nested inside Paragraph at ${path}.root[${k}]`);
        errors++;
      }
      if (obj instanceof Pg && child instanceof Tb) {
        console.error(`ERROR: Table nested inside Paragraph at ${path}.root[${k}]`);
        errors++;
      }

      // TableCell should not contain bare TextRun (must be wrapped in Paragraph)
      if (obj.constructor.name === 'TableCell' && child instanceof TR) {
        console.error(`ERROR: Bare TextRun inside TableCell at ${path}.root[${k}] (must be wrapped in Paragraph)`);
        errors++;
      }

      // Recurse
      walkRoot(child, `${path}.root[${k}](${name})`);
    }
  }

  try {
    const body = doc.documentWrapper.document.root[1]; // Body is root[1] in docx-js v9
    walkRoot(body, 'Body');
  } catch(e) {
    console.error('WARNING: Could not access document body for validation:', e.message);
  }

  return errors;
}

// =============================================================================
// GENERATE OUTPUT
// =============================================================================
async function main() {
  // Validate document structure before generating
  const structErrors = validateDocStructure(doc);
  if (structErrors > 0) {
    console.error(`\nFATAL: ${structErrors} structural error(s) found. Fix before generating.`);
    console.error(`Common causes:`);
    console.error(`  - Wrapping nLine() inside new Paragraph() — nLine() already returns a Paragraph`);
    console.error(`  - Passing bare TextRun/uncertainSmall() to examTable — wrap in array: [uncertainSmall("x")]`);
    process.exit(1);
  }
  console.log(`Structure validation: OK`);

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`Created: ${OUTPUT_PATH}`);
  console.log(`Total rows numbered: ${rowCounter}`);
  const fileSize = fs.statSync(OUTPUT_PATH).size;
  console.log(`File size: ${(fileSize / 1024).toFixed(0)} KB`);
}

main().catch(err => { console.error(err); process.exit(1); });
