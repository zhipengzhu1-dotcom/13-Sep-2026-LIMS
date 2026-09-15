import type { Attachment } from './attachment-contracts.ts';
import type { CertificateContent, CertificateSummary } from './certificate.ts';
import {
  renderCertificate,
  utcStamp,
  type DocumentSection,
} from './certificate-renderer.ts';
import { auditedTest } from './audit-writer.ts';
import { reportedValue, testLabel } from './results.ts';
import {
  auditedActLabels,
  stabilityConditionLabels,
  type AuditEntry,
  type Person,
  type Result,
  type Sample,
  type Signature,
  type Submission,
} from './contracts.ts';

/**
 * The Record copy: one Sample's complete record as exported for inspection
 * and true copies (21 CFR 11.10(b), §211.180(c); ADR-0013). Pure and
 * browser-safe: the core gathers the stored record into a `RecordCopy`, which
 * is written out as JSON, and `renderRecordCopy` projects it into the
 * document the PDF prints.
 */

/** An Electronic signature exactly as stored: `command` and `signedContent`
 * are the stored text, so its SHA-256 can be recomputed from the copy. */
export type RecordSignature = {
  commandId: string;
  sampleId: string;
  signerId: string;
  printedName: string;
  signedAt: string;
  meaning: Signature['meaning'];
  /** As held in the Signed content: on Approvals signed since #31 only. */
  reviewStatement?: string;
  command: string;
  signedContent: string;
  sha256: string;
  /** Whether the stored fields still match `sha256` when the copy was made. */
  verified: boolean;
};

/** A Certificate of Analysis version with its locked content as the stored
 * text, whose SHA-256 is `sha256`. */
export type RecordCertificate = CertificateSummary & {
  content: string;
  /** Whether the stored text still matches `sha256` when the copy was made. */
  verified: boolean;
};

/** How a copy's hashes are recomputed without Benchline. */
export const recordCopyHashes = {
  signature:
    'SHA-256 (hex) of the UTF-8 JSON array [commandId without hyphens, sampleId, signerId, printedName, signedAt, meaning, command, signedContent], each a string exactly as in this file, with no whitespace between elements.',
  certificate:
    'SHA-256 (hex) of the UTF-8 bytes of content, exactly as in this file.',
  worksheet:
    'SHA-256 (hex) of the file under worksheets/<id>/<filename>, which is the stored bytes.',
  manifest:
    "The SHA-256 of manifest.sha256 is recorded in the Sample's audit trail as recordCopy.manifestSha256 when the copy is made; this copy's own entry is not in it.",
} as const;

export type RecordCopy = {
  /** When the copy was made, by the server clock. */
  exportedAt: string;
  /** The account that made it. */
  exportedBy: string;
  /** The Client whose confidential information the copy holds (ISO/IEC
   * 17025 4.2). */
  confidentiality: string;
  /** What the record lives elsewhere, or not at all, so the copy is never
   * taken for more than it is. */
  notInThisCopy: string[];
  /** Instants are ISO 8601 in UTC; Analysis dates are calendar days in the
   * laboratory's time zone. */
  times: string;
  sample: Sample;
  submission: Submission;
  /** Every calculation worksheet a Result of the Sample ever referenced,
   * superseded and Invalidated ones included, by first reference. */
  worksheets: Attachment[];
  /** Every Electronic signature on the Sample, oldest first. */
  signatures: RecordSignature[];
  /** Every Certificate of Analysis version, oldest first. */
  certificates: RecordCertificate[];
  /** The Sample's history (the Sample, its Tests and Results, and its
   * Submission) with the upload of each of its worksheets, oldest first,
   * through the last entry before this copy. */
  auditTrail: { throughSequence: number; entries: AuditEntry[] };
  /** Everyone the record names by account, with their printed name. */
  people: Pick<Person, 'id' | 'name' | 'role'>[];
  hashes: typeof recordCopyHashes;
};

/** The filename a Record copy is downloaded under. */
export const recordCopyFilename = (sampleId: string) =>
  `Sample ${sampleId} record copy.zip`;

/** The confidentiality marking and the statement of what a Record copy does
 * not hold, which the JSON and the PDF both carry. */
export function recordCopyNotices(
  sample: Sample,
  submission: Submission,
): Pick<RecordCopy, 'confidentiality' | 'notInThisCopy'> {
  const sequenceIds = [
    ...new Set(sample.tests.flatMap((t) => t.results.map((r) => r.sequenceId))),
  ];
  return {
    confidentiality: `Confidential: ${submission.client}. This copy holds the Client's information and the laboratory's record of its work for them.`,
    notInThisCopy: [
      `Chromatograms and other original instrument data are held in the instrument data system, not in Benchline; the Results name them by sequence ID (${sequenceIds.join(', ') || none}).`,
      'Custody after receipt (transfers, sub-samples, storage monitoring, retention and disposal) is not recorded in Benchline; the storage fields are as recorded at receipt.',
      "Worksheets are included as their stored files; a PDF or printout of a spreadsheet is not its original. This copy is not a backup of Benchline's database.",
    ],
  };
}

/** A part of the document, printed under its own heading. */
export type RecordPart = { heading: string; sections: DocumentSection[] };

export type RecordDocument = {
  title: string;
  /** Printed at the foot of every page. */
  reference: string;
  parts: RecordPart[];
  /** Printed after everything else, so a reader can tell the copy is
   * complete. */
  endStatement: string;
};

const none = '—';
const text = (value: string | null | undefined) => value || none;
const capital = (value: string) => value[0].toUpperCase() + value.slice(1);
const statusLabels: Record<Result['status'], string> = {
  current: 'Current',
  superseded: 'Superseded by a correction',
  invalidated: 'Invalidated',
};

/**
 * The Record copy as a document of parts, every value written out as text
 * and every instant in UTC, for the PDF. Nothing is summarised away: every
 * Result version, investigation, signature, Certificate version and audit
 * entry appears.
 */
export function renderRecordCopy(copy: RecordCopy): RecordDocument {
  const { sample, submission } = copy;
  const name = (id: string | null) =>
    id === null ? none : (copy.people.find((p) => p.id === id)?.name ?? id);
  const by = (id: string, at: string) => `${name(id)}, ${utcStamp(at)}`;
  const worksheet = (id: string) => {
    const w = copy.worksheets.find((x) => x.id === id);
    return w ? `${w.filename}, SHA-256 ${w.sha256}` : id;
  };
  const parts: RecordPart[] = [
    {
      heading: 'About this copy',
      sections: [
        {
          kind: 'fields',
          heading: 'Record copy',
          fields: [
            { label: 'Sample', value: sample.id },
            { label: 'Client', value: submission.client },
            {
              label: 'Confidentiality',
              value: copy.confidentiality,
            },
            { label: 'Made by', value: name(copy.exportedBy) },
            { label: 'Made at', value: utcStamp(copy.exportedAt) },
            {
              label: 'Audit trail',
              value: `Every entry through number ${copy.auditTrail.throughSequence}, the last before this copy was made`,
            },
            { label: 'Times', value: copy.times },
            {
              label: 'Checking this copy',
              value: `manifest.sha256 lists the SHA-256 of every other file in the copy. ${recordCopyHashes.manifest} record.json holds the same record as this PDF, with each Electronic signature's Signed content and each Certificate version as stored.`,
            },
          ],
        },
        {
          kind: 'text',
          heading: 'Not in this copy',
          paragraphs: copy.notInThisCopy,
        },
      ],
    },
    receiptPart(copy, name),
    {
      heading: 'Results',
      sections: sample.tests.flatMap((test): DocumentSection[] => [
        {
          kind: 'fields',
          heading: testLabel(test),
          fields: [
            { label: 'Analyte', value: test.analyteName },
            {
              label: 'Method',
              value: `${test.methodCode} v${test.methodVersion} (${test.technique})`,
            },
            { label: 'Reporting unit', value: test.unit },
            { label: 'LOD', value: `${test.lod} ${test.unit}` },
            { label: 'LOQ', value: `${test.loq} ${test.unit}` },
            ...(test.maximumDoseCeiling
              ? [
                  {
                    label: 'Maximum-dose ceiling',
                    value: `${test.maximumDoseCeiling} mg/day`,
                  },
                ]
              : []),
            ...(test.results.length
              ? []
              : [{ label: 'Results', value: 'None entered' }]),
          ],
        },
        ...test.results.map((r): DocumentSection => ({
          kind: 'fields',
          heading: `${testLabel(test)}, Result ${r.sequence}`,
          fields: [
            { label: 'Status', value: statusLabels[r.status] },
            { label: 'Value', value: `${r.value} ${r.unit}` },
            { label: 'Reported as', value: reportedValue(test, r) },
            {
              label: 'Instrument reading',
              value: `${r.instrumentReading} ng/mL`,
            },
            { label: 'Sequence ID', value: r.sequenceId },
            {
              label: 'Analysis date',
              value: r.analysedOn ?? 'Not recorded',
            },
            { label: 'Worksheet', value: worksheet(r.attachmentId) },
            { label: 'Entered', value: by(r.enteredBy, r.enteredAt) },
            { label: 'Reason', value: text(r.reason) },
            {
              label: 'Limit',
              value: r.limit
                ? `${r.limit.value} ng/day, Acceptable intake entry ${r.limit.id}, Potency category ${r.limit.potencyCategory ?? 'not recorded'}, Limit type ${r.limit.limitType ?? 'not recorded'}: ${r.limit.sourceTitle}, revision ${r.limit.sourceRevisionDate}, in force from ${r.limit.effectiveFrom}, ${r.limit.sourceUrl}${r.limit.illustrative ? ' (illustrative value)' : ''}`
                : 'None (raw material)',
            },
            { label: 'Conformity statement', value: r.conformity },
            { label: 'OOS investigation', value: text(r.investigationId) },
            {
              label: 'Retest after',
              value: r.retestAfter
                ? `OOS investigation ${r.retestAfter}`
                : none,
            },
          ],
        })),
      ]),
    },
  ];
  if (sample.investigations.length)
    parts.push({
      heading: 'OOS investigations',
      sections: sample.investigations.map((i): DocumentSection => {
        const test = sample.tests.find((t) => t.id === i.testId);
        return {
          kind: 'fields',
          heading: i.id,
          fields: [
            {
              label: 'Result',
              value: `${test ? testLabel(test) : i.testId}, Result ${i.resultSequence}`,
            },
            { label: 'Status', value: i.status },
            { label: 'Opened', value: by(i.openedBy, i.openedAt) },
            {
              label: 'Laboratory error check',
              value: i.labErrorCheck
                ? `${i.labErrorCheck.errorIdentified ? 'Laboratory error identified' : 'No laboratory error identified'}: ${i.labErrorCheck.findings} (${by(i.labErrorCheck.by, i.labErrorCheck.at)})`
                : 'Not recorded',
            },
            { label: 'Outcome', value: text(i.outcome) },
            { label: 'Assignable cause', value: text(i.assignableCause) },
            {
              label: 'Causation confirmed',
              value:
                i.causationConfirmed === null
                  ? none
                  : i.causationConfirmed
                    ? 'Yes'
                    : 'No',
            },
            {
              label: 'Closed',
              value:
                i.closedBy && i.closedAt ? by(i.closedBy, i.closedAt) : none,
            },
            {
              label: 'Client informed',
              value: i.clientNotification
                ? `${i.clientNotification.contact}, ${utcStamp(i.clientNotification.notifiedAt)}; sent: ${i.clientNotification.sent} (recorded by ${by(i.clientNotification.recordedBy, i.clientNotification.recordedAt)})`
                : none,
            },
          ],
        };
      }),
    });
  const check = (verified: boolean) =>
    verified ? 'Verified' : 'Failed: does not match its SHA-256';
  parts.push(
    {
      heading: 'Electronic signatures',
      sections: [
        {
          kind: 'table',
          heading: 'Electronic signatures',
          columns: [
            'Meaning',
            'Printed name',
            'Date and time',
            'Review statement',
            'Check',
            'SHA-256',
          ],
          rows: copy.signatures.map((x) => [
            capital(x.meaning),
            x.printedName,
            utcStamp(x.signedAt),
            text(x.reviewStatement),
            check(x.verified),
            x.sha256,
          ]),
          notes: copy.signatures.length
            ? [
                `Each signature is checked against its stored Signed content, which record.json holds. ${recordCopyHashes.signature}`,
              ]
            : ['No Electronic signature is recorded.'],
        },
      ],
    },
    {
      heading: 'Certificates of Analysis',
      sections: copy.certificates.length
        ? copy.certificates.flatMap((c): DocumentSection[] => {
            const locked = parsed<CertificateContent>(c.content);
            return [
              {
                kind: 'fields',
                heading: `Version ${c.version}`,
                fields: [
                  { label: 'Approved', value: utcStamp(c.approvedAt) },
                  { label: 'SHA-256', value: c.sha256 },
                  { label: 'Check', value: check(c.verified) },
                  {
                    label: 'Published',
                    value: c.publication
                      ? `${utcStamp(c.publication.publishedAt)} by ${name(c.publication.publishedBy)}, ${c.publication.channel}${c.publication.channelDetail ? ` (${c.publication.channelDetail})` : ''}, to ${c.publication.recipients.join('; ')}; recorded ${utcStamp(c.publication.recordedAt)}`
                      : 'Not Published',
                  },
                  {
                    label: 'Superseded by',
                    value:
                      c.supersededBy === null
                        ? none
                        : `Version ${c.supersededBy}`,
                  },
                ],
              },
              ...(locked
                ? renderCertificate(locked).sections.map((section) => ({
                    ...section,
                    heading: `Version ${c.version} · ${section.heading}`,
                  }))
                : [
                    {
                      kind: 'text' as const,
                      heading: `Version ${c.version} · Content`,
                      paragraphs: [
                        'The stored content no longer reads as a Certificate; record.json holds it as stored.',
                      ],
                    },
                  ]),
            ];
          })
        : [
            {
              kind: 'text',
              heading: 'Certificates of Analysis',
              paragraphs: ['No Certificate of Analysis has been issued.'],
            },
          ],
    },
    {
      heading: 'Worksheets',
      sections: [
        {
          kind: 'table',
          heading: 'Worksheets',
          columns: [
            'File',
            'Type',
            'Size',
            'SHA-256',
            'Uploaded',
            'In this copy',
          ],
          rows: copy.worksheets.map((w) => [
            w.filename,
            w.contentType,
            `${w.size} bytes`,
            w.sha256,
            by(w.uploadedBy, w.uploadedAt),
            `worksheets/${w.id}/${w.filename}`,
          ]),
          notes: copy.worksheets.length ? [] : ['No worksheet is recorded.'],
        },
      ],
    },
    {
      heading: 'Audit trail',
      sections: [
        {
          kind: 'table',
          heading: 'Audit trail',
          columns: [
            'No.',
            'Date and time',
            'Act',
            'By',
            'Record',
            'Field',
            'Old value',
            'New value',
            'Reason',
          ],
          rows: copy.auditTrail.entries.map((e) => {
            const audited = auditedTest(e, [sample]);
            return [
              String(e.sequence),
              utcStamp(e.at),
              auditedActLabels[e.commandType] ?? e.commandType,
              name(e.actor),
              audited
                ? `Test ${testLabel(audited.test)}`
                : `${e.recordType} ${e.recordId}`,
              e.field,
              e.oldValue === null ? 'empty' : String(e.oldValue),
              e.newValue === null ? 'empty' : String(e.newValue),
              text(e.reason),
            ];
          }),
          notes: [],
        },
      ],
    },
  );
  return {
    title: 'Record copy',
    reference: `Record copy of Sample ${sample.id}, made ${utcStamp(copy.exportedAt)}`,
    parts,
    endStatement: 'End of Record copy',
  };
}

/** The receipt as recorded: the Submission, the Sample, any Stability sample
 * and every Receipt deviation with the Client's instruction. */
function receiptPart(
  { sample, submission }: RecordCopy,
  name: (id: string | null) => string,
): RecordPart {
  const contact = submission.clientContact;
  const sections: DocumentSection[] = [
    {
      kind: 'fields',
      heading: 'Submission',
      fields: [
        { label: 'Submission', value: submission.id },
        {
          label: 'Client',
          value: `${submission.client}${submission.clientKind === 'internal' ? ' (internal)' : ''}`,
        },
        {
          label: 'Client contact',
          value: contact
            ? `${contact.name}, ${contact.role} · ${contact.email} · ${contact.phone}`
            : 'Not recorded',
        },
        { label: 'Client reference', value: text(submission.clientReference) },
        { label: 'Received', value: utcStamp(submission.receivedAt) },
        ...(submission.receivedAtCorrection
          ? [
              {
                label: 'Received time corrected',
                value: `From the server time ${utcStamp(submission.receivedAtCorrection.recordedAt)}: ${submission.receivedAtCorrection.reason}`,
              },
            ]
          : []),
        { label: 'Courier', value: text(submission.courier) },
        { label: 'Tracking number', value: text(submission.trackingNumber) },
        { label: 'Shipping condition', value: submission.shippingCondition },
        {
          label: 'Temperature on arrival',
          value:
            submission.temperatureOnArrival === null
              ? 'Not measured'
              : `${submission.temperatureOnArrival} °C`,
        },
        { label: 'Package condition', value: submission.packageCondition },
        {
          label: 'Chain of custody reference',
          value: text(submission.chainOfCustodyReference),
        },
      ],
    },
    {
      kind: 'fields',
      heading: 'Sample',
      fields: [
        { label: 'Lab Sample ID', value: sample.id },
        { label: 'Status', value: sample.status },
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
        { label: 'Material type', value: capital(sample.materialType) },
        {
          label: 'Maximum daily dose',
          value:
            sample.maximumDailyDose === null
              ? none
              : `${sample.maximumDailyDose} mg/day`,
        },
        {
          label: 'Quantity received',
          value: `${sample.quantity.value} ${sample.quantity.unit}`,
        },
        {
          label: 'Containers',
          value: `${sample.containers.count} × ${sample.containers.type}`,
        },
        { label: 'Condition on receipt', value: sample.conditionOnReceipt },
        { label: 'Storage condition', value: text(sample.storageCondition) },
        { label: 'Storage location', value: text(sample.storageLocation) },
        {
          label: 'Retention instruction',
          value: text(sample.retentionInstruction),
        },
        { label: 'Due date', value: sample.dueDate },
        { label: 'Priority', value: sample.priority },
        { label: 'Remarks', value: text(sample.remarks) },
        { label: 'Received by', value: name(sample.receivedBy) },
        { label: 'Assigned analyst', value: name(sample.assignee) },
      ],
    },
  ];
  if (sample.stability)
    sections.push({
      kind: 'fields',
      heading: 'Stability sample',
      fields: [
        { label: 'Study ID', value: sample.stability.studyId },
        { label: 'Time point', value: sample.stability.timePoint },
        {
          label: 'Storage condition',
          value: `${sample.stability.condition} (${stabilityConditionLabels[sample.stability.condition]})`,
        },
      ],
    });
  if (sample.deviations.length)
    sections.push({
      kind: 'text',
      heading: 'Receipt deviations',
      paragraphs: sample.deviations.map((d) => {
        const instruction = d.instruction
          ? ` Client instruction: ${d.instruction.decision}, given by ${d.instruction.contact} at ${utcStamp(d.instruction.instructedAt)}, recorded by ${name(d.instruction.recordedBy)} at ${utcStamp(d.instruction.recordedAt)}.`
          : ' No Client instruction recorded.';
        return `${d.sequence}. ${capital(d.kind)}: ${d.description} (recorded by ${name(d.recordedBy)} at ${utcStamp(d.recordedAt)}).${instruction}`;
      }),
    });
  return { heading: 'Receipt', sections };
}

/** Stored JSON as a value, or null when it no longer parses. */
function parsed<T>(stored: string): T | null {
  try {
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
}
