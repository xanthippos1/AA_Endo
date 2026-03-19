#!/usr/bin/env node
/**
 * V10 GENERATOR — Patient004 (Lab-Panel-Aware Transcription)
 * Generated: 19/03/2026
 * Source: original_jpg/Patient004_1.jpg (1079×1648px)
 * Patient: Female, 26yr, Psychology student
 * Visits: 2 (3/4/2023 + e-mail 12/4/2023)
 */

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, VerticalAlign, ImageRun
} = require('docx');

// =============================================================================
// CONFIGURATION
// =============================================================================

const IMAGE_FILES = [
  { path: "./original_jpg/Patient004_1.jpg", width: 1079, height: 1648 },
];

const OUTPUT_PATH = "./transcribed/v10/Patient004_1_digitized_v10.docx";

const PATIENT_AMKA = "*******0891";

// =============================================================================
// V10 ENGINE — Do not modify below this line unless fixing bugs
// =============================================================================

const MAX_IMG_W = 750;
const MAX_IMG_H = 1070;
function fitToPage(imgW, imgH) {
  const scaleW = MAX_IMG_W / imgW;
  const scaleH = MAX_IMG_H / imgH;
  const scale = Math.min(scaleW, scaleH);
  return { width: Math.round(imgW * scale), height: Math.round(imgH * scale) };
}

let rowCounter = 0;
function nextRow() { rowCounter++; return String(rowCounter).padStart(2, '0'); }
function rowNum(num) { return new TextRun({ text: num + " ", font: "Courier New", size: 14, color: "999999" }); }

const PURPLE = "7B2D8E";
const RED = "CC0000";
const BLUE = "2E75B6";

function bold(text) { return new TextRun({ text, bold: true, font: "Arial", size: 18 }); }
function normal(text) { return new TextRun({ text, font: "Arial", size: 18 }); }
function italic(text) { return new TextRun({ text, italics: true, font: "Arial", size: 18 }); }
function small(text) { return new TextRun({ text, font: "Arial", size: 16 }); }
function smallBold(text) { return new TextRun({ text, bold: true, font: "Arial", size: 16 }); }

function medical(text) { return new TextRun({ text: text.toUpperCase(), font: "Arial", size: 18, color: PURPLE, bold: true }); }
function medSmall(text) { return new TextRun({ text: text.toUpperCase(), font: "Arial", size: 16, color: PURPLE, bold: true }); }

function drug(text) { return new TextRun({ text: text.toUpperCase(), font: "Arial", size: 18, color: PURPLE, bold: true }); }

function uncertain(text) { return new TextRun({ text: "[" + text + "?]", font: "Arial", size: 18, color: RED }); }
function uncertainNum(text) { return new TextRun({ text, font: "Arial", size: 18, color: RED }); }
function uncertainSmall(text) { return new TextRun({ text: "[" + text + "?]", font: "Arial", size: 16, color: RED }); }

function nLine(children) {
  const rn = nextRow();
  return new Paragraph({ spacing: { after: 40 }, children: [rowNum(rn), ...children] });
}

function nLabelVal(label, value) {
  const rn = nextRow();
  return new Paragraph({ spacing: { after: 40 }, children: [rowNum(rn), bold(label + ": "), normal(value)] });
}

function boxTitle(text) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 18, color: BLUE })]
  });
}

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const contentWidth = 11906 - 2 * 1134;

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

function spacer(h = 120) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}

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
      children: [new TextRun({ text: "ΑΜΚΑ: ", bold: true, font: "Arial", size: 18, color: "333333" }),
                 new TextRun({ text: amka, font: "Arial", size: 18, color: "333333" })]
    }),
  ];
}

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
    new Paragraph({ spacing: { after: 30 }, children: [small(`Πηγή: ${sourceFiles}  |  Μεταγραφή: ${dateStr}  |  Έκδοση: 10 (lab-panel-aware)`)] }),
  ];
}

// =============================================================================
// TRANSCRIPTION CONTENT — Patient004
// =============================================================================

const transcriptionChildren = [
  ...doctorLetterhead(PATIENT_AMKA),

  // ==================== ΕΠΙΣΚΕΨΗ 1 — 3/4/2023 ====================
  new Paragraph({ heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 1 — 3/4/2023", font: "Arial" })] }),
  spacer(60),

  // Row 1: Demographics | Social/Lifestyle
  twoBoxRow(
    "ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ",
    [
      nLabelVal("Όνομα", "Ασθενής 004 (κ.)"),
      nLine([bold("Ημερ. Γέννησης: "), normal("[whited out] — 26 ετών")]),
      nLine([bold("Κατοικία: "), normal("[whited out] / ΤΚ 54631")]),
      nLine([bold("Τηλέφωνο: "), normal("[whited out]")]),
    ],
    "ΚΟΙΝΩΝΙΚΟ / ΑΤΟΜΙΚΟ",
    [
      nLabelVal("Εργασία", "Φοιτήτρια Ψυχολογίας"),
      nLabelVal("Κάπνισμα", "Από 16χρ (2-3/ημέρα)"),
      nLabelVal("Αλκοόλ", "Κοινωνικά"),
      nLine([bold("Αλλεργία: "), normal("Φ (κανένα)")]),
      nLine([uncertain("τεσσ"), normal(" — αδιάβαστη λέξη στο κοινωνικό ιστορικό")]),
    ]
  ),
  spacer(60),

  // Row 2: Current Medication | Presenting Illness
  twoBoxRow(
    "ΤΡΕΧΟΥΣΑ ΑΓΩΓΗ",
    [
      nLine([drug("ZOLOFT"), normal(" 50mg × 1")]),
    ],
    "ΠΑΡΟΥΣΑ ΝΟΣΟΣ",
    [
      nLine([medical("Διαταραχή Ύπνου"), normal(" — "), medical("Απώλεια Βάρους")]),
    ]
  ),
  spacer(60),

  // Row 3: Referral | Medical History
  twoBoxRow(
    "ΠΑΡΑΠΟΜΠΗ",
    [
      nLine([bold("Από: "), normal("κ. Αμπατζή Λναία (φίλη)")]),
    ],
    "ΑΝΑΜΝΗΣΤΙΚΟ",
    [
      nLine([normal("① Λήψη μυελού οξέων για την αδελφή του ("), medical("ΟΛΛ"), normal(" — "), uncertainNum("2012"), normal(")")]),
    ]
  ),
  spacer(60),

  // Row 4: Family History (3 columns: Father | Mother | Patient)
  threeBoxRow(
    ["ΟΙΚΟΓ. ΙΣΤΟΡ. — Πατέρας (56χρ)", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Μητέρα", "ΟΙΚΟΓ. ΙΣΤΟΡ. — Ασθενής"],
    [
      // Father
      [
        nLine([normal("• "), medical("Υπερλιπιδαιμία")]),
        nLine([normal("• "), medical("Προδιαβήτης")]),
        nLine([normal("• "), medical("Ακουστικό Νευρίνωμα"), normal(" "), uncertain("ΑΙ"), normal(" (2018 — "), uncertain("Χ/Γ"), normal(")")]),
      ],
      // Mother
      [
        nLine([uncertain("6λφ")]),
        nLine([normal("• "), medical("Υπερλιπιδαιμία")]),
        nLine([normal("• Χρ. "), medical("Προστατίτιδα")]),
        nLine([normal("• "), medical("Νεφρολιθίαση")]),
        nLine([medical("Εμμηνόπαυση"), normal(": 50χρ")]),
      ],
      // Patient
      [
        nLine([normal("Βλ. Αναμνηστικό")]),
      ],
    ]
  ),
  spacer(60),

  // Row 5: Clinical Examination
  fullWidthBox("ΚΛΙΝΙΚΗ ΕΞΕΤΑΣΗ", [
    examTable([
      ["Βάρος", "61 Kgr"],
      ["Ύψος", [small("1,"), uncertainSmall("82"), small(" m (μπορεί 1,62)")]],
      ["ΑΠ", "110/70 mmHg"],
      ["Σφύξεις", "60/min"],
      ["Καρδιά", [small("S1, S2 "), uncertainSmall("SE"), small(" "), uncertainSmall("αμολ")]],
      ["Πνεύμονες", "κφ"],
      ["Κοιλία", "κφ"],
      ["Τένοντες", "κφ"],
      ["Ενδοκρινολογικά", "κφ"],
      ["Νευρολογικά", "κφ"],
      ["Οιδήματα", [uncertainSmall("ΠΔΚ")]],
      ["Αγγειακά", "κφ"],
    ]),
    new Paragraph({ spacing: { before: 80, after: 40 },
      children: [italic("[Σωματικό διάγραμμα: + σημείο, ΟΛΛ σημείωση — βλ. πρωτότυπη σάρωση]")] }),
  ]),
  spacer(60),

  // Row 6: Lab Results (none for Visit 1)
  fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ", [
    new Paragraph({ children: [italic("[Δεν υπάρχουν — εντολή για εργαστηριακό έλεγχο]")] }),
  ]),
  spacer(60),

  // Row 7: Instructions (Visit 1)
  fullWidthBox("ΟΔΗΓΙΕΣ (Επίσκεψη 1)", [
    nLine([normal("① "), medical("Ορμονολογικός Έλεγχος")]),
    nLine([normal("② "), medical("Μεταβολικός Έλεγχος")]),
  ]),

  // ==================== ΕΠΙΣΚΕΨΗ 2 — e-mail 12/4/2023 ====================
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "ΕΠΙΣΚΕΨΗ 2 — e-mail 12/4/2023", font: "Arial" })] }),
  spacer(60),

  fullWidthBox("ΣΤΟΙΧΕΙΑ ΑΣΘΕΝΟΥΣ", [
    nLine([italic("Βλ. Επίσκεψη 1 (χωρίς αλλαγές)")]),
  ]),
  spacer(60),

  // Lab Results — Grouped by Panel (v10 feature)
  fullWidthBox("ΕΡΓΑΣΤΗΡΙΑΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ (10/4/2023)", [

    // --- CBC Panel ---
    nLine([bold("— Γενική Αίματος (CBC) —")]),
    labTable([
      ["WBC", "6800", "ΦΤ: 4.500-11.000"],
      ["RBC", "5,3×10⁶", "ΦΤ(F): 4,1-5,1 ⚠"],
      ["HGB", "16,4", "ΦΤ(F): 12-16 ⚠"],
      ["HCT", "49,2", "ΦΤ(F): 35,9-44,6 ⚠"],
      ["MCV", "92,8", "ΦΤ: 80-100"],
      ["MCH", "31", "ΦΤ: 27-33"],
      ["MCHC", "33,4", "ΦΤ: 32-36"],
      ["RDW", "12,7", "ΦΤ: 11,5-14,5"],
      ["PLT", "213.000", "ΦΤ: 150.000-400.000"],
      ["ΤΥΠΟΣ (N/L/E/M/B)", "50/39/8/3/1", "ΦΤ: 40-70/20-45/1-6/2-10/0-2"],
    ]),
    spacer(40),

    // --- Inflammation ---
    nLine([bold("— Δείκτες Φλεγμονής —")]),
    labTable([
      ["CRP", "0,36", "ΦΤ <6"],
    ]),
    spacer(40),

    // --- Biochemistry ---
    nLine([bold("— Βιοχημικές —")]),
    labTable([
      ["GLU", "92", "ΦΤ: 70-99"],
      ["Ουρία", "36", "ΦΤ: 7-20 ⚠"],
      ["Κρεατινίνη", "1,0", "ΦΤ(F): 0,5-1,1"],
      ["Ουρικό οξύ", "4,2", "ΦΤ(F): 2,6-6,0"],
      ["SGOT", "15", "ΦΤ <40"],
      ["SGPT", "15 [ή 115?]", "ΦΤ <40"],
      ["γGT", "46", "ΦΤ <55"],
      ["ALP", "119", "ΦΤ: 10-280"],
      ["CPK", "2598", "ΦΤ(F) <170 ⚠⚠"],
    ]),
    spacer(40),

    // --- Lipids ---
    nLine([bold("— Λιπιδαιμικό Προφίλ —")]),
    labTable([
      ["CHOL", "206", "ΦΤ <200 ⚠"],
      ["HDL", "55,2", "ΦΤ(F) >50"],
      ["TRG", "180", "ΦΤ <150 ⚠"],
      ["LDL", "135", "ΦΤ <100 ⚠"],
    ]),
    spacer(40),

    // --- Electrolytes ---
    nLine([bold("— Ηλεκτρολύτες —")]),
    labTable([
      ["Ca", "10,1 (9,63)", "ΦΤ: 8,5-10,2"],
      ["P", "4,5", "ΦΤ: 2,5-4,5"],
      ["K", "4,1", "ΦΤ: 3,5-5,0"],
      ["Na", "143", "ΦΤ: 135-145"],
    ]),
    spacer(40),

    // --- Autoimmune ---
    nLine([bold("— Αυτοάνοσο —")]),
    labTable([
      ["ANA", "(-) αρνητικό", "—"],
    ]),
    spacer(40),

    // --- Iron Studies ---
    nLine([bold("— Μελέτη Σιδήρου —")]),
    labTable([
      ["Φερριτίνη", "303", "ΦΤ: 15-400 (F premeno: 15-150) ⚠"],
    ]),
    spacer(40),

    // --- Vitamins ---
    nLine([bold("— Βιταμίνες —")]),
    labTable([
      ["Ομοκυστεΐνη", "18,0", "ΦΤ: 5-15 ⚠"],
      ["B12", "446,20 [ή 1464,20?]", "ΦΤ: 200-900"],
      ["[Φυλλικό Οξύ?]", "[0,30 ή 30?]", "ΦΤ: 2,7-17,0"],
    ]),
    spacer(40),

    // --- Bone Metabolism ---
    nLine([bold("— Οστικός Μεταβολισμός —")]),
    labTable([
      ["25-OHD₃", "24", "ΦΤ: 30-100 ⚠"],
      ["PTH", "16", "ΦΤ: 8-75"],
    ]),
    spacer(40),

    // --- Sex Hormones (Female) ---
    nLine([bold("— Ορμόνες Φύλου —")]),
    labTable([
      ["Τεστοστερόνη", "0,90 [?]", "ΦΤ: ~0,08 (ng/mL?)"],
      ["SHBG", "27,8 [ή 78?]", "ΦΤ(F): 30-100"],
    ]),
    spacer(40),

    // --- Thyroid ---
    nLine([bold("— Θυρεοειδικό —")]),
    labTable([
      ["TSH", "2,18", "ΦΤ: 0,2-4,5"],
      ["Anti-TPO", "20", "ΦΤ <150"],
      ["Anti-Tg", "15", "ΦΤ <150"],
    ]),
  ]),
  spacer(60),

  // Urinalysis
  fullWidthBox("ΓΕΝΙΚΗ ΟΥΡΩΝ", [
    nLabelVal("Ειδικό Βάρος", "1015"),
    nLabelVal("pH", "6"),
    nLabelVal("Πρωτεΐνες", "0-1"),
    nLabelVal("Ερυθρά", "0-1"),
  ]),
  spacer(60),

  // Instructions (Visit 2)
  fullWidthBox("ΟΔΗΓΙΕΣ (Επίσκεψη 2)", [
    nLine([normal("① ECHO "), uncertain("Κοιμ/142")]),
    nLine([normal("② "), medical("ΤΚΕ")]),
    nLine([normal("③ SGOT, SGPT, γGT, CPK, ALP, LDH")]),
    nLine([normal("④ ApoA1, ApoB, Lp(a)")]),
    nLine([normal("⑤ Έλεγχος "), medical("Ηπατίτιδας")]),
    nLine([normal("⑥ ACTH, β-hCG, AFP")]),
    nLine([normal("⑦ "), medical("Αλδολάση"), normal(", "), uncertain("Rabest")]),
  ]),

  // Transcription footer
  ...transcriptionNotes("Patient004_1.jpg", "19/3/2026"),
];

// =============================================================================
// DOCUMENT ASSEMBLY
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
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
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
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 284, right: 284, bottom: 284, left: 284 }
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
// STRUCTURAL VALIDATION
// =============================================================================

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

      if (obj instanceof Pg && child instanceof Pg) {
        console.error(`ERROR: Paragraph nested inside Paragraph at ${path}.root[${k}]`);
        errors++;
      }
      if (obj instanceof Pg && child instanceof Tb) {
        console.error(`ERROR: Table nested inside Paragraph at ${path}.root[${k}]`);
        errors++;
      }
      if (obj.constructor.name === 'TableCell' && child instanceof TR) {
        console.error(`ERROR: Bare TextRun inside TableCell at ${path}.root[${k}] (must be wrapped in Paragraph)`);
        errors++;
      }
      walkRoot(child, `${path}.root[${k}](${name})`);
    }
  }

  try {
    const body = doc.documentWrapper.document.root[1];
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
