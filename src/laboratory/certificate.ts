import { decisionRule, type ConformityStatement } from './limits.ts';
import { resultsView, type CertificateInvestigation } from './results.ts';
import {
  isFinishedProduct,
  stabilityConditionLabels,
  type ClientContact,
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

/** PJLA PL-3 §2.1.3.1's US regulatory statement, printed with the decision
 * rule of a Certificate that makes statements of conformity. */
export const uncertaintyStatement =
  'Measurement uncertainty is not applied when providing statements of conformity; decision rules are not identified in regulation.';

/** ISO/IEC 17025 7.8.2.1 and 7.8.2.2. The Sample is tested as received;
 * Benchline never samples. */
export const itemsTestedStatement =
  'The results relate only to the items tested.';
export const asReceivedStatement =
  'The results apply to the Sample as received.';

/** The mark on a field the Client supplied. */
export const clientSuppliedMark = '†';
const clientSuppliedDisclaimer = (finished: boolean) =>
  finished
    ? `${clientSuppliedMark} Supplied by the Client. The laboratory is not responsible for this information; it can affect the validity of the Results, as the Maximum daily dose sets the ng/day Results and their Limit.`
    : `${clientSuppliedMark} Supplied by the Client. The laboratory is not responsible for this information, which can affect the validity of the Results.`;

/** Certificate fields whose values the Client supplied (ISO/IEC 17025
 * 7.8.2.2), in the order the Certificate prints them; `stability` covers the
 * study ID, time point and condition. */
export const clientSuppliedFields = [
  'clientContact',
  'clientReference',
  'clientSampleId',
  'product',
  'strength',
  'batch',
  'manufacturer',
  'manufactureDate',
  'expiryDate',
  'maximumDailyDose',
  'stability',
] as const;
export type ClientSuppliedField = (typeof clientSuppliedFields)[number];

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
  /** The reported Result's analysis date; null when it has none. Absent on
   * a version issued before analysis dates were recorded. */
  analysedOn?: string | null;
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
   * an Amendment corrected, each with the value, qualifier and unit of the
   * Result it decided. Empty when there was none. */
  investigations: CertificateInvestigation[];
};

export type CertificateContent = {
  sampleId: string;
  /** 1 for the first Certificate of a Sample, counting up with each Amendment. */
  version: number;
  /** The time of the Approval that froze this version. */
  approvedAt: string;
  /**
   * The date of issue: the same Approval, printed as such (ADR-0008).
   * Publishing records when the Certificate reached the Client.
   *
   * This and every other field marked absent on older versions came with
   * ISO/IEC 17025 7.8.2's report content; a version issued before it has
   * none of them and renders as it did.
   */
  issuedAt?: string;
  /** Null for version 1; an Amendment states the version it replaces, why
   * and what changed. */
  amendment: {
    /** The Published version the Amendment started from (ISO/IEC 17025
     * 7.8.8.3); absent on a version amended before it was recorded. */
    replacesVersion?: number;
    reason: string;
    changeSummary: string;
  } | null;
  laboratory: { name: string; address: string; accreditation: string };
  client: {
    id: string;
    name: string;
    kind: ClientKind;
    /** Null for a Submission received before contacts were recorded; absent
     * on older versions. */
    contact?: ClientContact | null;
  };
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
  /** For a finished product; null for a raw material, absent on older
   * versions. */
  uncertaintyStatement?: string | null;
  individualJudgement: string;
  /** The fields marked as supplied by the Client; absent on older versions. */
  clientSupplied?: ClientSuppliedField[];
  /** Printed under Statements: the items tested, as received, and the
   * Client-supplied disclaimer; absent on older versions. */
  statements?: string[];
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
  // Only what the Certificate prints a value for is marked.
  const unsupplied: ClientSuppliedField[] = [
    ...(submission.clientContact === undefined
      ? (['clientContact'] as const)
      : []),
    ...(finished ? [] : (['maximumDailyDose'] as const)),
    ...(sample.stability ? [] : (['stability'] as const)),
  ];
  const clientSupplied = clientSuppliedFields.filter(
    (f) => !unsupplied.includes(f),
  );
  return {
    sampleId: sample.id,
    version,
    approvedAt,
    issuedAt: approvedAt,
    amendment,
    laboratory: { ...laboratoryIdentity },
    client: {
      id: submission.clientId,
      name: submission.client,
      kind: submission.clientKind,
      contact: submission.clientContact ?? null,
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
    results: resultsView(sample).tests.map((view): CertificateResult => {
      const { test, current: r } = view;
      if (!r)
        throw new Error(`Test ${test.id} has no current Result to certify.`);
      return {
        testId: test.id,
        analyte: test.analyteName,
        methodCode: test.methodCode,
        methodVersion: test.methodVersion,
        technique: test.technique,
        analysedOn: r.analysedOn ?? null,
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
        investigations: view.certificateInvestigations,
      };
    }),
    decisionRule: finished ? decisionRule : rawMaterialDecisionRule,
    uncertaintyStatement: finished ? uncertaintyStatement : null,
    individualJudgement: individualJudgementStatement,
    clientSupplied,
    statements: [
      itemsTestedStatement,
      asReceivedStatement,
      clientSuppliedDisclaimer(finished),
    ],
    signatures: signatures.map((s) => ({ ...s })),
  };
}
