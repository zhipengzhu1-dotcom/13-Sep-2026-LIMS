import { decisionRule, type ConformityStatement } from './limits.ts';
import type { OosOutcome } from './investigations.ts';
import {
  isFinishedProduct,
  stabilityConditionLabels,
  type ClientDecision,
  type ClientKind,
  type IssueChannel,
  type MaterialType,
  type Qualifier,
  type ReceiptDeviationKind,
  type ReportingUnit,
  type Sample,
  type SignatureMeaning,
  type Submission,
} from './contracts.ts';

/**
 * The Certificate of Analysis content record. Pure and browser-safe: the core
 * builds the record at Approval and stores it locked, and the Certificate
 * renderer projects it into a printable document. Everything a Certificate
 * shows is copied into the record, so a later change to reference data (a
 * Client's name, a Method, an Acceptable intake entry, the lab's identity)
 * never alters a Certificate already issued.
 */

/** The laboratory as its Certificates name it. Illustrative placeholder. */
export const laboratoryIdentity = {
  name: 'Benchline Analytical Laboratory',
  address: '1 Example Park, Research Way, Anytown',
  accreditation: 'ISO/IEC 17025:2017 (illustrative accreditation reference)',
} as const;

export const individualJudgementStatement =
  'Each Result is judged individually. No combined nitrosamine assessment was made.';

export const rawMaterialDecisionRule =
  'Raw materials have no Limit: each Result is reported as is, with the Conformity statement Report.';

/** A signature manifestation as the Certificate prints it. */
export type CertificateSignature = {
  meaning: SignatureMeaning;
  signerId: string;
  printedName: string;
  /** ISO 8601 with offset. */
  signedAt: string;
};

/** One row per Test, reporting its current Result. */
export type CertificateResult = {
  testId: string;
  analyte: string;
  methodCode: string;
  methodVersion: number;
  technique: string;
  value: number;
  qualifier: Qualifier;
  unit: ReportingUnit;
  lod: number;
  loq: number;
  /** The Limit the Result was judged against; null for raw materials. */
  limit: {
    entryId: number;
    value: number;
    unit: 'ng/day';
    sourceTitle: string;
    sourceUrl: string;
    sourceRevisionDate: string;
    effectiveFrom: string;
    illustrative: boolean;
  } | null;
  conformity: ConformityStatement;
  /** Every closed OOS investigation on the Test's Results, oldest first: on
   * the reported Result, on an Invalidated Result it retests, or on a Result
   * an Amendment corrected. Empty when there was none. */
  investigations: { id: string; outcome: OosOutcome }[];
};

export type CertificateContent = {
  sampleId: string;
  /** 1 for the first Certificate of a Sample, counting up with each Amendment. */
  version: number;
  /** The time of the Approval that froze this version. */
  approvedAt: string;
  /** Null for version 1; an Amendment states why and what changed. */
  amendment: { reason: string; changeSummary: string } | null;
  laboratory: { name: string; address: string; accreditation: string };
  client: { id: string; name: string; kind: ClientKind };
  submission: {
    id: string;
    clientReference: string;
    receivedAt: string;
  };
  sample: {
    id: string;
    clientSampleId: string;
    product: string;
    strength: string;
    batch: string;
    manufacturer: string;
    manufactureDate: string | null;
    expiryDate: string | null;
    expiryKind: Sample['expiryKind'];
    quantity: Sample['quantity'];
    containers: Sample['containers'];
    conditionOnReceipt: string;
    dueDate: string;
  };
  materialType: MaterialType;
  /** mg/day; finished products only. */
  maximumDailyDose: number | null;
  stability: {
    studyId: string;
    timePoint: string;
    condition: string;
    conditionLabel: string;
  } | null;
  deviations: {
    sequence: number;
    kind: ReceiptDeviationKind;
    description: string;
    recordedAt: string;
    instruction: {
      decision: ClientDecision;
      contact: string;
      instructedAt: string;
    } | null;
  }[];
  results: CertificateResult[];
  decisionRule: string;
  individualJudgement: string;
  /** Performed by; for a version issued by an Amendment, amended by; then
   * approved by. */
  signatures: CertificateSignature[];
};

/**
 * The Coordinator's record that one Certificate version was issued to the
 * Client. Stored apart from the locked content, append-only, at most one per
 * version.
 */
export type Publication = {
  sampleId: string;
  version: number;
  recipients: string[];
  channel: IssueChannel;
  /** Free text describing the channel; required for `other`. */
  channelDetail: string;
  /** When the Certificate was issued, as the Coordinator recorded it. */
  publishedAt: string;
  publishedBy: string;
  /** The server time the publication was recorded. */
  recordedAt: string;
};

/** A stored, locked Certificate version. */
export type Certificate = {
  sampleId: string;
  version: number;
  approvedAt: string;
  /** SHA-256 (hex) of the content as stored, so any later copy can be checked. */
  sha256: string;
  content: CertificateContent;
  /** How and when this version was Published; null until it is. */
  publication: Publication | null;
  /** The first later version that was Published, which superseded this one;
   * null while this is the latest Published version (or none is). Derived,
   * never stored: the locked content does not change. */
  supersededBy: number | null;
};

/** A Certificate version without its content, as the workspace lists it. */
export type CertificateSummary = Omit<Certificate, 'content'>;

/**
 * The content of a Certificate for an approved Sample. Each Test must have a
 * current Result; the core calls this only once Approval's checks passed.
 */
export function certificateContent({
  sample,
  submission,
  version,
  approvedAt,
  signatures,
  amendment = null,
}: {
  sample: Sample;
  submission: Submission;
  version: number;
  approvedAt: string;
  signatures: CertificateSignature[];
  amendment?: CertificateContent['amendment'];
}): CertificateContent {
  const finished = isFinishedProduct(sample.materialType);
  return {
    sampleId: sample.id,
    version,
    approvedAt,
    amendment,
    laboratory: { ...laboratoryIdentity },
    client: {
      id: submission.clientId,
      name: submission.client,
      kind: submission.clientKind,
    },
    submission: {
      id: submission.id,
      clientReference: submission.clientReference,
      receivedAt: submission.receivedAt,
    },
    sample: {
      id: sample.id,
      clientSampleId: sample.clientSampleId,
      product: sample.product,
      strength: sample.strength,
      batch: sample.batch,
      manufacturer: sample.manufacturer,
      manufactureDate: sample.manufactureDate,
      expiryDate: sample.expiryDate,
      expiryKind: sample.expiryKind,
      quantity: { ...sample.quantity },
      containers: { ...sample.containers },
      conditionOnReceipt: sample.conditionOnReceipt,
      dueDate: sample.dueDate,
    },
    materialType: sample.materialType,
    maximumDailyDose: sample.maximumDailyDose,
    stability: sample.stability && {
      ...sample.stability,
      conditionLabel: stabilityConditionLabels[sample.stability.condition],
    },
    deviations: sample.deviations.map((d) => ({
      sequence: d.sequence,
      kind: d.kind,
      description: d.description,
      recordedAt: d.recordedAt,
      instruction: d.instruction && {
        decision: d.instruction.decision,
        contact: d.instruction.contact,
        instructedAt: d.instruction.instructedAt,
      },
    })),
    results: sample.tests.map((test): CertificateResult => {
      const r = test.results.find((x) => x.status === 'current');
      if (!r)
        throw new Error(`Test ${test.id} has no current Result to certify.`);
      return {
        testId: test.id,
        analyte: test.analyteName,
        methodCode: test.methodCode,
        methodVersion: test.methodVersion,
        technique: test.technique,
        value: r.value,
        qualifier: r.qualifier,
        unit: r.unit,
        lod: test.lod,
        loq: test.loq,
        limit: r.limit && {
          entryId: r.limit.id,
          value: r.limit.value,
          unit: 'ng/day',
          sourceTitle: r.limit.sourceTitle,
          sourceUrl: r.limit.sourceUrl,
          sourceRevisionDate: r.limit.sourceRevisionDate,
          effectiveFrom: r.limit.effectiveFrom,
          illustrative: r.limit.illustrative,
        },
        conformity: r.conformity,
        investigations: sample.investigations.flatMap((i) =>
          i.testId === test.id && i.status === 'Closed' && i.outcome
            ? [{ id: i.id, outcome: i.outcome }]
            : [],
        ),
      };
    }),
    decisionRule: finished ? decisionRule : rawMaterialDecisionRule,
    individualJudgement: individualJudgementStatement,
    signatures: signatures.map((s) => ({ ...s })),
  };
}
