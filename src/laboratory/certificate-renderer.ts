import type { CertificateContent, CertificateResult } from './certificate.ts';

/**
 * The Certificate renderer: a pure projection from a locked Certificate
 * content record to a printable document of headed sections whose values are
 * already written out as text. The workspace lays the document out with print
 * styles and the browser's print-to-PDF produces the PDF; a server-generated
 * PDF can later render the same document without changing the record.
 */

export type DocumentField = { label: string; value: string };

export type DocumentSection =
  | { kind: 'fields'; heading: string; fields: DocumentField[] }
  | {
      kind: 'table';
      heading: string;
      columns: string[];
      rows: string[][];
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

/** The Result as reported: the number, or `< LOD` / `< LOQ` with that value. */
export function reportedResult(r: CertificateResult) {
  if (r.qualifier === '< LOD') return `< LOD (${r.lod})`;
  if (r.qualifier === '< LOQ') return `< LOQ (${r.loq})`;
  return String(r.value);
}

function limitSource(limit: NonNullable<CertificateResult['limit']>) {
  return `${limit.sourceTitle}, revision ${limit.sourceRevisionDate}, in force from ${limit.effectiveFrom}${limit.illustrative ? ' (illustrative value)' : ''}`;
}

export function renderCertificate(c: CertificateContent): CertificateDocument {
  const finished = c.materialType === 'finished product';
  const s = c.sample;
  const sampleFields: DocumentField[] = [
    { label: 'Lab Sample ID', value: s.id },
    { label: 'Client sample ID', value: text(s.clientSampleId) },
    { label: 'Product', value: s.product },
    { label: 'Strength', value: text(s.strength) },
    { label: 'Batch / lot', value: s.batch },
    { label: 'Manufacturer', value: text(s.manufacturer) },
    { label: 'Manufacture date', value: text(s.manufactureDate) },
    { label: `${capital(s.expiryKind)} date`, value: text(s.expiryDate) },
    { label: 'Material type', value: capital(c.materialType) },
    ...(finished
      ? [
          {
            label: 'Maximum daily dose',
            value:
              c.maximumDailyDose === null
                ? none
                : `${c.maximumDailyDose} mg/day`,
          },
        ]
      : []),
    {
      label: 'Quantity received',
      value: `${s.quantity.value} ${s.quantity.unit}`,
    },
    {
      label: 'Containers',
      value: `${s.containers.count} × ${s.containers.type}`,
    },
    { label: 'Condition on receipt', value: s.conditionOnReceipt },
  ];
  const sections: DocumentSection[] = [
    {
      kind: 'fields',
      heading: 'Client and Submission',
      fields: [
        {
          label: 'Client',
          value: `${c.client.name}${c.client.kind === 'internal' ? ' (internal)' : ''}`,
        },
        {
          label: 'Client reference',
          value: text(c.submission.clientReference),
        },
        { label: 'Submission', value: c.submission.id },
        { label: 'Received', value: utcStamp(c.submission.receivedAt) },
      ],
    },
    { kind: 'fields', heading: 'Sample', fields: sampleFields },
  ];
  if (c.stability)
    sections.push({
      kind: 'fields',
      heading: 'Stability study',
      fields: [
        { label: 'Study ID', value: c.stability.studyId },
        { label: 'Time point', value: c.stability.timePoint },
        {
          label: 'Storage condition',
          value: `${c.stability.condition} (${c.stability.conditionLabel})`,
        },
      ],
    });
  if (c.deviations.length)
    sections.push({
      kind: 'text',
      heading: 'Receipt deviations',
      paragraphs: c.deviations.map((d) => {
        const instruction = d.instruction
          ? ` Client instruction: ${d.instruction.decision}, given by ${d.instruction.contact} on ${utcStamp(d.instruction.instructedAt)}.`
          : '';
        return `${d.sequence}. ${capital(d.kind)}: ${d.description} (recorded ${utcStamp(d.recordedAt)}).${instruction}`;
      }),
    });
  const notes = c.results.flatMap((r) =>
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
    rows: c.results.map((r) => [
      r.analyte,
      `${r.methodCode} v${r.methodVersion} (${r.technique})`,
      reportedResult(r),
      r.unit,
      ...(finished
        ? [r.limit ? `${r.limit.value} ${r.limit.unit}` : none]
        : []),
      r.conformity,
      r.investigation
        ? `${r.investigation.id} (${r.investigation.outcome})`
        : none,
    ]),
    notes,
  });
  sections.push({
    kind: 'text',
    heading: 'Decision rule',
    paragraphs: [c.decisionRule, c.individualJudgement],
  });
  if (c.amendment)
    sections.push({
      kind: 'text',
      heading: 'Amendment',
      paragraphs: [
        `Reason: ${c.amendment.reason}`,
        `Changes: ${c.amendment.changeSummary}`,
      ],
    });
  sections.push({
    kind: 'signatures',
    heading: 'Electronic signatures',
    signatures: c.signatures.map((x) => ({
      meaning: capital(x.meaning),
      name: x.printedName,
      signedAt: utcStamp(x.signedAt),
    })),
  });
  return {
    title: 'Certificate of Analysis',
    reference: `Sample ${c.sampleId} · Version ${c.version}`,
    marker: c.amendment ? 'Amended' : null,
    laboratory: {
      name: c.laboratory.name,
      lines: [c.laboratory.address, c.laboratory.accreditation],
    },
    sections,
    footer: `Certificate of Analysis for Sample ${c.sampleId}, version ${c.version}, approved ${utcStamp(c.approvedAt)}. Electronically signed; valid without a handwritten signature.`,
  };
}
