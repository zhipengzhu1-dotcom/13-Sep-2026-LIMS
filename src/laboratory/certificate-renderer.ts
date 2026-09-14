import type { CertificateContent, CertificateResult } from './certificate.ts';
import { isFinishedProduct } from './contracts.ts';
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
  /** `Amended` for a version issued by an Amendment, otherwise null. */
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

function limitSource(limit: NonNullable<CertificateResult['limit']>) {
  return `${limit.sourceTitle}, revision ${limit.sourceRevisionDate}, in force from ${limit.effectiveFrom}${limit.illustrative ? ' (illustrative value)' : ''}`;
}

export function renderCertificate(
  content: CertificateContent,
): CertificateDocument {
  const finished = isFinishedProduct(content.materialType);
  const sample = content.sample;
  const sampleFields: DocumentField[] = [
    { label: 'Lab Sample ID', value: sample.id },
    { label: 'Client sample ID', value: text(sample.clientSampleId) },
    { label: 'Product', value: sample.product },
    { label: 'Strength', value: text(sample.strength) },
    { label: 'Batch / lot', value: sample.batch },
    { label: 'Manufacturer', value: text(sample.manufacturer) },
    { label: 'Manufacture date', value: text(sample.manufactureDate) },
    {
      label: `${capital(sample.expiryKind)} date`,
      value: text(sample.expiryDate),
    },
    { label: 'Material type', value: capital(content.materialType) },
    ...(finished
      ? [
          {
            label: 'Maximum daily dose',
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
  const sections: DocumentSection[] = [
    {
      kind: 'fields',
      heading: 'Client and Submission',
      fields: [
        {
          label: 'Client',
          value: `${content.client.name}${content.client.kind === 'internal' ? ' (internal)' : ''}`,
        },
        {
          label: 'Client reference',
          value: text(content.submission.clientReference),
        },
        { label: 'Submission', value: content.submission.id },
        { label: 'Received', value: utcStamp(content.submission.receivedAt) },
      ],
    },
    { kind: 'fields', heading: 'Sample', fields: sampleFields },
  ];
  if (content.stability)
    sections.push({
      kind: 'fields',
      heading: 'Stability study',
      fields: [
        { label: 'Study ID', value: content.stability.studyId },
        { label: 'Time point', value: content.stability.timePoint },
        {
          label: 'Storage condition',
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
      'Result',
      'Unit',
      ...(finished ? ['Limit'] : []),
      'Conformity statement',
      'OOS investigation',
    ],
    rows: content.results.map((r): DocumentCell[] => [
      r.analyte,
      `${r.methodCode} v${r.methodVersion} (${r.technique})`,
      reportedValue(r, r),
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
    paragraphs: [content.decisionRule, content.individualJudgement],
  });
  if (content.amendment)
    sections.push({
      kind: 'text',
      heading: 'Amendment',
      paragraphs: [
        `Reason: ${content.amendment.reason}`,
        `Changes: ${content.amendment.changeSummary}`,
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
    marker: content.amendment ? 'Amended' : null,
    laboratory: {
      name: content.laboratory.name,
      lines: [content.laboratory.address, content.laboratory.accreditation],
    },
    sections,
    footer: `Certificate of Analysis for Sample ${content.sampleId}, version ${content.version}, approved ${utcStamp(content.approvedAt)}. Electronically signed; valid without a handwritten signature.`,
  };
}
