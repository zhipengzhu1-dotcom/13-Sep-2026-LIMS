import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Attachment } from './attachment-contracts.ts';
import type { DocumentCell, DocumentSection } from './certificate-renderer.ts';
import {
  renderRecordCopy,
  type RecordCopy,
  type RecordDocument,
} from './record-copy.ts';
import { zip } from './zip.ts';

/**
 * Writes a Record copy out as its ZIP: the PDF for reading, the JSON record,
 * each worksheet's stored bytes, and a manifest of their SHA-256 in
 * `sha256sum` format, so `shasum -a 256 -c manifest.sha256` checks a copy
 * without trusting the PDF.
 */
export async function recordArchive(
  copy: RecordCopy,
  worksheets: readonly { attachment: Attachment; content: Uint8Array }[],
): Promise<{ content: Uint8Array; manifestSha256: string }> {
  const files = [
    { name: 'record.pdf', content: await recordPdf(renderRecordCopy(copy)) },
    {
      name: 'record.json',
      content: Buffer.from(`${JSON.stringify(copy, null, 2)}\n`, 'utf8'),
    },
    ...worksheets.map(({ attachment, content }) => ({
      name: worksheetPath(attachment),
      content,
    })),
  ];
  const manifest = Buffer.from(
    files.map((f) => `${sha256(f.content)}  ${f.name}\n`).join(''),
    'utf8',
  );
  return {
    content: zip(
      [...files, { name: 'manifest.sha256', content: manifest }],
      new Date(copy.exportedAt),
    ),
    manifestSha256: sha256(manifest),
  };
}

/** Where a worksheet sits in the archive: under its attachment ID, so two
 * worksheets with one filename never collide. */
export const worksheetPath = (a: Pick<Attachment, 'id' | 'filename'>) =>
  `worksheets/${a.id}/${a.filename}`;

const sha256 = (content: Uint8Array) =>
  createHash('sha256').update(content).digest('hex');

/** Noto Sans (SIL Open Font License, `fonts/OFL.txt`), embedded so the PDF
 * prints the record's text as stored rather than in a font the reader
 * happens to have. */
const fonts = {
  regular: readFileSync(
    new URL('./fonts/NotoSans-Regular.ttf', import.meta.url),
  ),
  bold: readFileSync(new URL('./fonts/NotoSans-Bold.ttf', import.meta.url)),
};

/** A4 portrait, in points. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { side: 42, top: 48, bottom: 56 };
const WIDTH = PAGE.width - 2 * MARGIN.side;
const SIZE = { title: 16, part: 12, section: 10, body: 8.5, table: 7.5 };
const LEADING = 1.3;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.38, 0.4, 0.44);
const RULE = rgb(0.82, 0.83, 0.86);
const SHADE = rgb(0.94, 0.95, 0.96);
const CELL_PADDING = 3;

/** The document laid out as a PDF, every page footed with the copy's
 * reference and "Page x of y". */
export async function recordPdf(document: RecordDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });
  pdf.setTitle(`${document.title}: ${document.reference}`);
  pdf.setCreator('Benchline');
  pdf.setProducer('Benchline');
  const layout = new Layout(pdf, regular, bold);
  layout.paragraph(document.title, bold, SIZE.title);
  layout.gap(6);
  if (layout.printable(JSON.stringify(document)) !== JSON.stringify(document))
    layout.paragraph(
      "Some characters in this record are outside this PDF's font and print as ?. record.json holds them exactly as stored.",
      bold,
      SIZE.body,
    );
  for (const part of document.parts) {
    layout.keep(SIZE.part * 4);
    layout.gap(10);
    layout.paragraph(part.heading, bold, SIZE.part);
    layout.gap(4);
    for (const section of part.sections) layout.section(section);
  }
  layout.gap(12);
  layout.paragraph(document.endStatement, bold, SIZE.body);
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    const y = MARGIN.bottom - 24;
    const size = SIZE.table;
    page.drawText(layout.printable(document.reference), {
      x: MARGIN.side,
      y,
      size,
      font: regular,
      color: MUTED,
    });
    const number = `Page ${i + 1} of ${pages.length}`;
    page.drawText(number, {
      x: PAGE.width - MARGIN.side - regular.widthOfTextAtSize(number, size),
      y,
      size,
      font: regular,
      color: MUTED,
    });
  });
  return pdf.save({ useObjectStreams: false });
}

/** Lays text out down the pages, starting a new page when one is full. */
class Layout {
  private page!: PDFPage;
  private y = 0;
  private characters: Set<number>;
  constructor(
    private pdf: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
  ) {
    this.characters = new Set(regular.getCharacterSet());
    this.newPage();
  }

  /** Text with any character the font cannot draw replaced by `?`, so
   * drawing never fails; the JSON keeps the text as stored. */
  printable(text: string) {
    let out = '';
    for (const char of text.replace(/\t/g, ' '))
      out += this.characters.has(char.codePointAt(0)!) ? char : '?';
    return out;
  }

  private newPage() {
    this.page = this.pdf.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - MARGIN.top;
  }

  gap(points: number) {
    this.y -= points;
  }

  /** Starts a new page unless `points` still fit on this one. */
  keep(points: number) {
    if (this.y - points < MARGIN.bottom) this.newPage();
  }

  /** Text wrapped to `width`, one entry per printed line. */
  lines(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const paragraph of this.printable(text).split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          line = candidate;
          continue;
        }
        if (line) out.push(line);
        // A word longer than the width (a hash, an ID) breaks anywhere.
        line = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > width && line) {
            out.push(line);
            line = '';
          }
          line += char;
        }
      }
      out.push(line);
    }
    return out;
  }

  paragraph(text: string, font = this.regular, size = SIZE.body, x = 0) {
    const height = size * LEADING;
    for (const line of this.lines(text, font, size, WIDTH - x)) {
      this.keep(height);
      this.y -= height;
      this.page.drawText(line, {
        x: MARGIN.side + x,
        y: this.y + size * 0.25,
        size,
        font,
        color: INK,
      });
    }
  }

  section(section: DocumentSection) {
    this.keep(SIZE.section * 5);
    this.gap(6);
    this.paragraph(section.heading, this.bold, SIZE.section);
    this.gap(2);
    switch (section.kind) {
      case 'fields':
        return this.table(
          null,
          section.fields.map((f) => [f.label, f.value]),
          [0.3, 0.7],
        );
      case 'table':
        this.table(section.columns, section.rows);
        for (const note of section.notes)
          this.paragraph(note, this.regular, SIZE.table);
        return;
      case 'text':
        for (const p of section.paragraphs) {
          this.paragraph(p);
          this.gap(2);
        }
        return;
      case 'signatures':
        return this.table(
          ['Meaning', 'Printed name', 'Date and time'],
          section.signatures.map((x) => [x.meaning, x.name, x.signedAt]),
        );
    }
  }

  /**
   * A table with ruled rows; the header row, if any, repeats on each page it
   * continues onto, and a row too tall for the rest of a page continues on
   * the next. `shares` fixes the column widths as fractions; otherwise they
   * follow the content.
   */
  table(columns: string[] | null, rows: DocumentCell[][], shares?: number[]) {
    const size = SIZE.table;
    const height = size * LEADING;
    const count = columns?.length ?? rows[0]?.length ?? 0;
    if (!count) return;
    const text = (cell: DocumentCell) =>
      typeof cell === 'string' ? cell : cell.join('\n');
    const widths = shares
      ? shares.map((s) => s * WIDTH)
      : this.columnWidths(
          [columns ?? [], ...rows.map((r) => r.map(text))],
          count,
          size,
        );
    const inner = (i: number) => widths[i] - 2 * CELL_PADDING;
    const wrapped = (cells: string[], font: PDFFont) =>
      cells.map((c, i) => this.lines(c, font, size, inner(i)));
    const header = columns && wrapped(columns, this.bold);
    const drawRow = (
      cells: string[][],
      from: number,
      to: number,
      font: PDFFont,
      shaded: boolean,
    ) => {
      const rowHeight = (to - from) * height + 2 * CELL_PADDING;
      const top = this.y;
      if (shaded)
        this.page.drawRectangle({
          x: MARGIN.side,
          y: top - rowHeight,
          width: WIDTH,
          height: rowHeight,
          color: SHADE,
        });
      let x = MARGIN.side;
      cells.forEach((lines, i) => {
        lines.slice(from, to).forEach((line, j) =>
          this.page.drawText(line, {
            x: x + CELL_PADDING,
            y: top - CELL_PADDING - (j + 1) * height + size * 0.25,
            size,
            font,
            color: INK,
          }),
        );
        x += widths[i];
      });
      this.y = top - rowHeight;
      this.page.drawLine({
        start: { x: MARGIN.side, y: this.y },
        end: { x: MARGIN.side + WIDTH, y: this.y },
        thickness: 0.5,
        color: RULE,
      });
    };
    const headerHeight = header
      ? Math.max(...header.map((l) => l.length)) * height + 2 * CELL_PADDING
      : 0;
    const startPage = () => {
      if (header)
        drawRow(
          header,
          0,
          Math.max(...header.map((l) => l.length)),
          this.bold,
          true,
        );
    };
    this.keep(headerHeight + height + 2 * CELL_PADDING);
    startPage();
    for (const row of rows) {
      const cells = wrapped(row.map(text), this.regular);
      const total = Math.max(...cells.map((l) => l.length));
      let from = 0;
      while (from < total) {
        const room = Math.floor(
          (this.y - MARGIN.bottom - 2 * CELL_PADDING) / height,
        );
        // Keep a short row whole; split only what cannot fit on a page.
        const whole = total - from;
        const pageLines = Math.floor(
          (PAGE.height -
            MARGIN.top -
            MARGIN.bottom -
            headerHeight -
            2 * CELL_PADDING) /
            height,
        );
        if (room < Math.min(whole, pageLines) || room < 1) {
          this.newPage();
          startPage();
          continue;
        }
        const to = from + Math.min(whole, room);
        drawRow(cells, from, to, this.regular, false);
        from = to;
      }
    }
    this.gap(4);
  }

  /** Widths that give each column its content's natural width when the
   * table fits, and otherwise share the width out by how much each column
   * wants beyond an even share. */
  private columnWidths(rows: string[][], count: number, size: number) {
    const natural = Array.from(
      { length: count },
      (_, i) =>
        Math.max(
          24,
          ...rows.map((r) =>
            Math.max(
              ...(r[i] ?? '')
                .split('\n')
                .map((l) =>
                  this.regular.widthOfTextAtSize(this.printable(l), size),
                ),
            ),
          ),
        ) +
        2 * CELL_PADDING,
    );
    const sum = natural.reduce((a, b) => a + b, 0);
    if (sum <= WIDTH) return natural.map((w) => w + ((WIDTH - sum) * w) / sum);
    const even = WIDTH / count;
    const base = natural.map((w) => Math.min(w, even));
    const excess = natural.map((w, i) => w - base[i]);
    const spare = WIDTH - base.reduce((a, b) => a + b, 0);
    const wanted = excess.reduce((a, b) => a + b, 0);
    return base.map((w, i) => w + (wanted ? (spare * excess[i]) / wanted : 0));
  }
}
