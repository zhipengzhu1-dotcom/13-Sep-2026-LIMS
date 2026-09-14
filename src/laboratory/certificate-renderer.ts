import {
  clientSuppliedMark,
  type CertificateContent,
  type CertificateResult,
  type ClientSuppliedField,
} from './certificate.ts';
import { isFinishedProduct, type ClientContact } from './contracts.ts';
import { reportedValue } from './results.ts';

/**
 * The Certificate renderer: a pure projection from a locked Certificate
 * content record to a printable document of headed sections whose values are
 * already written out as text. The workspace lays the document out with print
 * styles and the browser's print-to-PDF produces the PDF; a server-generated
 * PDF can later render the same document without changing the record.
 */

export type DocumentField = { label: string; value: string };

/** A table cell: one line of text, or several entries printed one per line. */
export type DocumentCell = string | string[];

export type DocumentSection =
  | { kind: 'fields'; heading: string; fields: DocumentField[] }
  | {
      kind: 'table';
      heading: string;
      columns: string[];
      rows: DocumentCell[][];
      /** Shown under the table; empty when there is nothing to note. */
      notes: string[];
    }
  | { kind: 'text'; heading: string; paragraphs: string[] }
  | {
      kind: 'signatures';
      heading: string;
      signatures: { meaning: string; name: string; signedAt: string }[];
    };

export type CertificateDocument = {
  title: string;
  /** `Sample 26-00001 · Version 1`. */
  reference: string;
  /** `Amended, replaces version 1` for a version issued by an Amendment
   * (`Amended` if it was issued before the replaced version was recorded),
   * otherwise null. */
  marker: string | null;
  laboratory: { name: string; lines: string[] };
  sections: DocumentSection[];
  footer: string;
};

const none = '—';

/** An ISO timestamp in UTC with its zone named, so the printed time is never
 * ambiguous and does not depend on where the document is printed. */
export function utcStamp(iso: string) {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)} UTC`;
}

const text = (value: string | null | undefined) => value || none;
const capital = (value: string) => value[0].toUpperCase() + value.slice(1);

/** An investigation as its row lists it, e.g. "OOS26-0003, Invalidated, for
 * Result 31.2 ng/day": the Result it decided is reported like the row's own,
 * against the same Test's LOD and LOQ. */
export function certificateInvestigationText(
  i: CertificateResult['investigations'][number],
  row: Pick<CertificateResult, 'lod' | 'loq'>,
) {
  const value = reportedValue(row, i.result);
  return `${i.id}, ${i.outcome}, for Result ${value} ${i.result.unit}`;
}

/** The dates of testing: the one analysis date, or the first to the last,
 * noting Results entered before analysis dates were recorded. */
function testingDates(results: CertificateResult[]) {
  const dates = [
    ...new Set(results.flatMap((r) => (r.analysedOn ? [r.analysedOn] : []))),
  ].sort();
  if (!dates.length) return notRecorded;
  const range =
    dates.length === 1 ? dates[0] : `${dates[0]} to ${dates.at(-1)}`;
  return results.some((r) => !r.analysedOn)
    ? `${range} (not recorded for every Result)`
    : range;
}

const notRecorded = 'Not recorded';

/** A Client contact on one line: "Dana Wells, QA Manager ·
 * dana.wells@northstar.example · +1 555 0100". */
export const contactLine = (c: ClientContact) =>
  `${c.name}, ${c.role} · ${c.email} · ${c.phone}`;

function limitSource(limit: NonNullable<CertificateResult['limit']>) {
  return `${limit.sourceTitle}, revision ${limit.sourceRevisionDate}, in force from ${limit.effectiveFrom}${limit.illustrative ? ' (illustrative value)' : ''}`;
}

export function renderCertificate(
  content: CertificateContent,
): CertificateDocument {
  const finished = isFinishedProduct(content.materialType);
  const sample = content.sample;
  // A version issued before ISO/IEC 17025 7.8.2's report content was
  // recorded renders as it did: no Certificate section, contact, analysis
  // dates, statements or marks.
  const withReportContent = content.issuedAt !== undefined;
  const mark = (field: ClientSuppliedField, label: string) =>
    content.clientSupplied?.includes(field)
      ? `${label} ${clientSuppliedMark}`
      : label;
  const sampleFields: DocumentField[] = [
    { label: 'Lab Sample ID', value: sample.id },
    {
      label: mark('clientSampleId', 'Client sample ID'),
      value: text(sample.clientSampleId),
    },
    { label: mark('product', 'Product'), value: sample.product },
    { label: mark('strength', 'Strength'), value: text(sample.strength) },
    { label: mark('batch', 'Batch / lot'), value: sample.batch },
    {
      label: mark('manufacturer', 'Manufacturer'),
      value: text(sample.manufacturer),
    },
    {
      label: mark('manufactureDate', 'Manufacture date'),
      value: text(sample.manufactureDate),
    },
    {
      label: mark('expiryDate', `${capital(sample.expiryKind)} date`),
      value: text(sample.expiryDate),
    },
    {
      label: 'Material type',
      value: capital(content.materialType),
    },
    ...(finished
      ? [
          {
            label: mark('maximumDailyDose', 'Maximum daily dose'),
            value:
              content.maximumDailyDose === null
                ? none
                : `${content.maximumDailyDose} mg/day`,
          },
        ]
      : []),
    {
      label: 'Quantity received',
      value: `${sample.quantity.value} ${sample.quantity.unit}`,
    },
    {
      label: 'Containers',
      value: `${sample.containers.count} × ${sample.containers.type}`,
    },
    { label: 'Condition on receipt', value: sample.conditionOnReceipt },
  ];
  const sections: DocumentSection[] = [];
  if (withReportContent)
    sections.push({
      kind: 'fields',
      heading: 'Certificate',
      fields: [
        { label: 'Date of issue', value: utcStamp(content.issuedAt!) },
        { label: 'Dates of testing', value: testingDates(content.results) },
      ],
    });
  sections.push(
    {
      kind: 'fields',
      heading: 'Client and Submission',
      fields: [
        {
          label: 'Client',
          value: `${content.client.name}${content.client.kind === 'internal' ? ' (internal)' : ''}`,
        },
        ...(withReportContent
          ? [
              {
                label: mark('clientContact', 'Client contact'),
                value: content.client.contact
                  ? contactLine(content.client.contact)
                  : notRecorded,
              },
            ]
          : []),
        {
          label: mark('clientReference', 'Client reference'),
          value: text(content.submission.clientReference),
        },
        { label: 'Submission', value: content.submission.id },
        { label: 'Received', value: utcStamp(content.submission.receivedAt) },
      ],
    },
    { kind: 'fields', heading: 'Sample', fields: sampleFields },
  );
  if (content.stability)
    sections.push({
      kind: 'fields',
      heading: 'Stability study',
      fields: [
        {
          label: mark('stability', 'Study ID'),
          value: content.stability.studyId,
        },
        {
          label: mark('stability', 'Time point'),
          value: content.stability.timePoint,
        },
        {
          label: mark('stability', 'Storage condition'),
          value: `${content.stability.condition} (${content.stability.conditionLabel})`,
        },
      ],
    });
  if (content.deviations.length)
    sections.push({
      kind: 'text',
      heading: 'Receipt deviations',
      paragraphs: content.deviations.map((d) => {
        const instruction = d.instruction
          ? ` Client instruction: ${d.instruction.decision}, given by ${d.instruction.contact} on ${utcStamp(d.instruction.instructedAt)}.`
          : '';
        return `${d.sequence}. ${capital(d.kind)}: ${d.description} (recorded ${utcStamp(d.recordedAt)}).${instruction}`;
      }),
    });
  const notes = content.results.flatMap((r) =>
    r.limit ? [`${r.analyte}: Limit source ${limitSource(r.limit)}.`] : [],
  );
  sections.push({
    kind: 'table',
    heading: 'Results',
    columns: [
      'Analyte',
      'Method',
      ...(withReportContent ? ['Analysis date'] : []),
      'Result',
      'Unit',
      ...(finished ? ['Limit'] : []),
      'Conformity statement',
      'OOS investigation',
    ],
    rows: content.results.map((r): DocumentCell[] => [
      r.analyte,
      `${r.methodCode} v${r.methodVersion} (${r.technique})`,
      ...(withReportContent ? [r.analysedOn ?? notRecorded] : []),
      reportedValue({ lod: r.lod, loq: r.loq }, r),
      r.unit,
      ...(finished
        ? [r.limit ? `${r.limit.value} ${r.limit.unit}` : none]
        : []),
      r.conformity,
      r.investigations.length
        ? r.investigations.map((i) => certificateInvestigationText(i, r))
        : none,
    ]),
    notes,
  });
  sections.push({
    kind: 'text',
    heading: 'Decision rule',
    paragraphs: [
      content.decisionRule,
      ...(content.uncertaintyStatement ? [content.uncertaintyStatement] : []),
      content.individualJudgement,
    ],
  });
  if (content.statements)
    sections.push({
      kind: 'text',
      heading: 'Statements',
      paragraphs: content.statements,
    });
  // A version amended before the replaced version was recorded prints
  // no version in its marker or change summary.
  const replaces = content.amendment?.replacesVersion;
  const replaced =
    replaces === undefined
      ? { marker: 'Amended', changes: 'Changes' }
      : {
          marker: `Amended, replaces version ${replaces}`,
          changes: `Changes from version ${replaces}`,
        };
  if (content.amendment)
    sections.push({
      kind: 'text',
      heading: 'Amendment',
      paragraphs: [
        `Reason: ${content.amendment.reason}`,
        `${replaced.changes}: ${content.amendment.changeSummary}`,
      ],
    });
  sections.push({
    kind: 'signatures',
    heading: 'Electronic signatures',
    signatures: content.signatures.map((signature) => ({
      meaning: capital(signature.meaning),
      name: signature.printedName,
      signedAt: utcStamp(signature.signedAt),
    })),
  });
  return {
    title: 'Certificate of Analysis',
    reference: `Sample ${content.sampleId} · Version ${content.version}`,
    marker: content.amendment ? replaced.marker : null,
    laboratory: {
      name: content.laboratory.name,
      lines: [content.laboratory.address, content.laboratory.accreditation],
    },
    sections,
    footer: `Certificate of Analysis for Sample ${content.sampleId}, version ${content.version}, approved ${utcStamp(content.approvedAt)}. Electronically signed; valid without a handwritten signature.`,
  };
}
