import { z } from 'zod';
import type { AcceptableIntake, ConformityStatement } from './limits.ts';
import type { Attachment } from './attachment-contracts.ts';
import type { CertificateSummary } from './certificate.ts';

export * from './limits.ts';
export * from './investigations.ts';
import type { OosInvestigation } from './investigations.ts';

/** Lab users as the workspace shows them. Sign-in accounts (with password
 * hashes, server side only) are seeded from this list in src/accounts. */
export const people = [
  { id: 'coordinator', name: 'Morgan Lee', role: 'coordinator' },
  { id: 'analyst', name: 'Alex Chen', role: 'analyst' },
  { id: 'analyst-2', name: 'Sam Rivera', role: 'analyst' },
  { id: 'manager', name: 'Taylor Brooks', role: 'manager' },
] as const;
export type Actor = (typeof people)[number];
export type Role = Actor['role'];

export const materialTypes = ['raw material', 'finished product'] as const;
export type MaterialType = (typeof materialTypes)[number];
export type ReportingUnit = 'ppm' | 'ng/day';

/** The reporting unit follows the Material type and is never entered. */
export function reportingUnit(materialType: MaterialType): ReportingUnit {
  return materialType === 'finished product' ? 'ng/day' : 'ppm';
}

/** Illustrative placeholders; the lab's real Analytes replace them. */
export const analytes = [
  { id: 'impurity-a', name: 'Impurity A' },
  { id: 'impurity-b', name: 'Impurity B' },
  { id: 'impurity-c', name: 'Impurity C' },
] as const;
export type Analyte = (typeof analytes)[number];

export type Method = {
  /** Code and version together, so a later version is a separate Method. */
  id: string;
  code: string;
  version: number;
  analyteId: Analyte['id'];
  technique: string;
  materialTypes: readonly MaterialType[];
  /** Fixed, validated values in both reporting units (ADR-0002). */
  lodLoq: Readonly<Record<ReportingUnit, LodLoq>>;
};

/** A limit of detection and limit of quantitation in one reporting unit. */
export type LodLoq = { lod: number; loq: number };

const method = (code: string, analyteId: Analyte['id']): Method => ({
  id: `${code}-v1`,
  code,
  version: 1,
  analyteId,
  technique: 'LC-MS/MS',
  materialTypes,
  lodLoq: { 'ng/day': { lod: 1, loq: 3 }, ppm: { lod: 0.01, loq: 0.03 } },
});
/** Illustrative placeholders; each Method measures exactly one Analyte. */
export const methods: readonly Method[] = [
  method('NIT-001', 'impurity-a'),
  method('NIT-002', 'impurity-a'),
  method('NIT-003', 'impurity-b'),
  method('NIT-004', 'impurity-b'),
  method('NIT-005', 'impurity-c'),
];

export type Qualifier = '< LOD' | '< LOQ' | 'quantified';

/** Where a value falls against the LOD and LOQ. Both bounds are inclusive on
 * the upper side: exactly the LOD is `< LOQ`, exactly the LOQ is quantified. */
export function qualify(value: number, { lod, loq }: LodLoq): Qualifier {
  if (value < lod) return '< LOD';
  if (value < loq) return '< LOQ';
  return 'quantified';
}

/**
 * `current` is the Result a Test reports; `superseded` was replaced by a
 * correction; `invalidated` was found by an OOS investigation to have an
 * assignable laboratory cause, and a retest Result is then required. Results
 * are never deleted, only moved out of `current`.
 */
export type ResultStatus = 'current' | 'superseded' | 'invalidated';

export type Result = {
  /** Unique within its Test: 1 for the first Result, counting up. */
  sequence: number;
  status: ResultStatus;
  /** In the Test's reporting unit, calculated by hand (ADR-0002). */
  value: number;
  unit: ReportingUnit;
  /** Assigned by the core from the Test's LOD/LOQ; never entered. */
  qualifier: Qualifier;
  /** The instrument reading in ng/mL the value was calculated from. */
  instrumentReading: number;
  /** The injection or sequence ID that traces the Result to raw data. */
  sequenceId: string;
  /** The calculation worksheet the value was derived from (ADR-0002). */
  attachmentId: string;
  enteredBy: string;
  enteredAt: string;
  /** Empty for a first Result; required when it replaces the current one. */
  reason: string;
  /** A copy of the Acceptable intake entry in force when the Result was
   * entered, kept even after a newer entry is added; null for raw materials. */
  limit: AcceptableIntake | null;
  /** Decided by the core when the Result is entered; never entered. */
  conformity: ConformityStatement;
  /** The OOS investigation opened on this Result, kept once it is closed
   * (its outcome and any assignable cause are on the investigation). */
  investigationId: string | null;
};

/** One Method applied to one Sample. The Method's identity and Analyte are
 * copied at receipt, so a later Method change never rewrites the Test. */
export type Test = {
  id: string;
  methodId: string;
  methodCode: string;
  methodVersion: number;
  analyteId: string;
  analyteName: string;
  technique: string;
  unit: ReportingUnit;
  /** The Method's LOD/LOQ pair for this Sample's reporting unit, copied at
   * receipt. */
  lod: number;
  loq: number;
  /** Every Result ever entered, oldest first, each with its status. */
  results: Result[];
};

/** The Result a Test currently reports, if any. */
export function currentResult(test: Test): Result | undefined {
  return test.results.find((r) => r.status === 'current');
}

export const sampleStatuses = [
  'On hold',
  'Received',
  'In progress',
  'Awaiting approval',
  'Returned',
  'Approved',
  'Published',
  'Withdrawn',
] as const;
export type SampleStatus = (typeof sampleStatuses)[number];

/**
 * The Coordinator's Publish queue: approved Samples waiting to be Published,
 * earliest Due date first, urgent before routine on the same day.
 */
export function publishQueue(samples: readonly Sample[]): Sample[] {
  return samples
    .filter((s) => s.status === 'Approved')
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        (a.priority === b.priority ? 0 : a.priority === 'Urgent' ? -1 : 1) ||
        a.id.localeCompare(b.id),
    );
}

/** How a Certificate of Analysis was issued to the Client. The system records
 * it; it never transmits the document. */
export const issueChannels = ['email', 'portal', 'print', 'other'] as const;
export type IssueChannel = (typeof issueChannels)[number];

/** Statuses in which a Receipt deviation stops all work on a Sample: held
 * until the Client instructs the lab, or withdrawn on the Client's word. */
export const heldStatuses: readonly SampleStatus[] = ['On hold', 'Withdrawn'];

/** Fixed list, seeded and illustrative like the rest of the reference data. */
export const receiptDeviationKinds = [
  'damaged package',
  'broken seal',
  'temperature excursion',
  'insufficient quantity',
  'other',
] as const;
export type ReceiptDeviationKind = (typeof receiptDeviationKinds)[number];
export const clientDecisions = ['proceed', 'withdraw'] as const;
export type ClientDecision = (typeof clientDecisions)[number];

/** What the Client told the lab about a held Sample, and who recorded it. */
export type ClientInstruction = {
  decision: ClientDecision;
  /** The person at the Client who gave the instruction. */
  contact: string;
  /** When the Client gave the instruction; never later than its recording. */
  instructedAt: string;
  recordedBy: string;
  recordedAt: string;
};

/**
 * A problem found when a Sample arrived. It stays on the Sample for good: a
 * Sample that proceeds carries it to its Certificate of Analysis.
 */
export type ReceiptDeviation = {
  /** 1 for the first deviation on the Sample, counting up. */
  sequence: number;
  kind: ReceiptDeviationKind;
  description: string;
  recordedBy: string;
  recordedAt: string;
  /** The instruction that released or withdrew the Sample; null while held. */
  instruction: ClientInstruction | null;
};

/** Seeded, illustrative Clients. There is no maintenance screen in this
 * release; a Submission copies the Client's name and kind at receipt. */
export const clients = [
  { id: 'northstar', name: 'Northstar Pharma', kind: 'external' },
  { id: 'meridian', name: 'Meridian Therapeutics', kind: 'external' },
  { id: 'aster', name: 'Aster Laboratories', kind: 'external' },
  { id: 'harbor', name: 'Harbor Health Products', kind: 'external' },
  {
    id: 'formulation-development',
    name: 'Formulation Development',
    kind: 'internal',
  },
] as const;
export type Client = (typeof clients)[number];
export type ClientKind = Client['kind'];

/** Fixed receipt lists, seeded and illustrative like the rest of the
 * reference data. */
export const shippingConditions = [
  'ambient',
  'refrigerated',
  'frozen',
] as const;
export const packageConditions = ['intact', 'damaged'] as const;
export const containerTypes = [
  'bottle',
  'blister pack',
  'vial',
  'jar',
  'bag',
  'drum',
  'other',
] as const;
export const quantityUnits = ['g', 'mg', 'kg', 'mL', 'L', 'units'] as const;
export const expiryKinds = ['expiry', 'retest'] as const;
export const priorities = ['Routine', 'Urgent'] as const;
export const stabilityTimePoints = [
  'Initial',
  '1M',
  '3M',
  '6M',
  '9M',
  '12M',
  '18M',
  '24M',
  '36M',
] as const;
export const stabilityConditions = ['RT', 'INT', 'ACC', 'REF'] as const;
export const stabilityConditionLabels: Record<
  (typeof stabilityConditions)[number],
  string
> = {
  RT: '25 °C / 60% RH',
  INT: '30 °C / 65% RH',
  ACC: '40 °C / 75% RH',
  REF: '5 °C',
};

export type Stability = {
  studyId: string;
  timePoint: (typeof stabilityTimePoints)[number];
  condition: (typeof stabilityConditions)[number];
};

export type Submission = {
  id: string;
  clientId: string;
  /** The Client's name and kind as they were at receipt. */
  client: string;
  clientKind: ClientKind;
  clientReference: string;
  /** When the delivery arrived: the server time of the receipt, or the
   * Coordinator's corrected time when `receivedAtCorrection` is present. */
  receivedAt: string;
  /** A corrected received-at keeps the server time it replaced and the reason,
   * so the change is never hidden. */
  receivedAtCorrection: { recordedAt: string; reason: string } | null;
  receivedBy: string;
  courier: string;
  trackingNumber: string;
  shippingCondition: (typeof shippingConditions)[number];
  /** °C, when measured. */
  temperatureOnArrival: number | null;
  packageCondition: (typeof packageConditions)[number];
  chainOfCustodyReference: string;
  sampleIds: string[];
};

export type Sample = {
  id: string;
  submissionId: string;
  clientId: string;
  client: string;
  clientSampleId: string;
  product: string;
  strength: string;
  batch: string;
  manufacturer: string;
  /** YYYY-MM-DD, when supplied. */
  manufactureDate: string | null;
  expiryDate: string | null;
  expiryKind: (typeof expiryKinds)[number];
  quantity: { value: number; unit: (typeof quantityUnits)[number] };
  containers: { count: number; type: (typeof containerTypes)[number] };
  conditionOnReceipt: string;
  storageCondition: string;
  storageLocation: string;
  materialType: MaterialType;
  /** mg/day, supplied by the Client; finished products only. */
  maximumDailyDose: number | null;
  /** Finished products only. */
  stability: Stability | null;
  dueDate: string;
  priority: (typeof priorities)[number];
  remarks: string;
  retentionInstruction: string;
  receivedAt: string;
  receivedBy: string;
  assignee: string | null;
  status: SampleStatus;
  /** Every Receipt deviation, oldest first, kept after the Sample is released. */
  deviations: ReceiptDeviation[];
  /** The Manager's latest return, shown to the Analyst until resubmission. */
  lastReturn: { comment: string; by: string; at: string } | null;
  tests: Test[];
  /** Every OOS investigation on the Sample's Results, oldest first. */
  investigations: OosInvestigation[];
  revision: number;
};

/** The kinds of record an audit entry can describe. */
export type AuditRecordType =
  | 'Submission'
  | 'Sample'
  | 'Test'
  | 'OOS investigation'
  | 'Certificate of Analysis';
/** A single field's value as the audit trail keeps it. */
export type AuditValue = string | number | boolean | null;

/**
 * One field-level change made by one command (ADR-0001: who, when, old value,
 * new value, reason). Entries are append-only: nothing in the application
 * updates or deletes them. A new record is written as one entry per field with
 * an `oldValue` of null.
 */
export type AuditEntry = {
  /** Position in the lab-wide trail; a later entry always has a higher one. */
  sequence: number;
  recordType: AuditRecordType;
  /** A Submission or Sample ID, or `{sampleId}/{testId}` for a Test. */
  recordId: string;
  /** The Sample the record belongs to; null for a Submission. */
  sampleId: string | null;
  /** The field, with dotted paths for nested values (`result.value`). */
  field: string;
  oldValue: AuditValue;
  newValue: AuditValue;
  reason: string | null;
  actor: string;
  at: string;
  commandType: Command['type'];
  commandId: string;
};

/** Whether an entry is part of a Sample's own history: the Sample, its Tests
 * and Results, and the Submission it was received under. */
export function auditsSample(entry: AuditEntry, sample: Sample) {
  return entry.sampleId === null
    ? entry.recordType === 'Submission' &&
        entry.recordId === sample.submissionId
    : entry.sampleId === sample.id;
}

/**
 * The meaning of each Electronic signature, by the command that applies it.
 * A signing command carries its signer's password; the core verifies it, and
 * writes this record, for every command type listed here.
 */
export const signatureMeanings = {
  submitForApproval: 'performed by',
  approve: 'approved by',
} as const;
export type SigningCommandType = keyof typeof signatureMeanings;
export type SignatureMeaning = (typeof signatureMeanings)[SigningCommandType];

/** An Electronic signature as recorded. It never holds the password. */
export type Signature = {
  sampleId: string;
  signerId: string;
  /** The signer's printed name at the moment of signing. */
  printedName: string;
  /** ISO 8601 with offset; the command's own timestamp. */
  signedAt: string;
  meaning: SignatureMeaning;
  /** The command that was signed, exactly as applied, without the password. */
  command: {
    commandId: string;
    type: SigningCommandType;
    sampleId: string;
    revision: number;
  };
};

export type Snapshot = {
  submissions: Submission[];
  samples: Sample[];
  /** The lab-wide audit trail, newest first. */
  audit: AuditEntry[];
  /** Every Electronic signature, oldest first. */
  signatures: Signature[];
  /** Records only; the bytes are downloaded per attachment. */
  attachments: Attachment[];
  people: typeof people;
  clients: typeof clients;
  analytes: typeof analytes;
  methods: typeof methods;
  /** Every Acceptable intake entry, current and historical, in append order. */
  acceptableIntakes: AcceptableIntake[];
  /** Every Certificate version issued, by Sample then version; the content
   * is read per Certificate. */
  certificates: CertificateSummary[];
};

/**
 * A UUIDv7. Time-ordered, so successive keys land near each other in the
 * `commands` primary-key B-tree — RFC 9562 §6.10. `crypto.randomUUID()` is v4
 * and would scatter inserts across the one index on the hot write path.
 */
export function newCommandId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const ms = BigInt(Date.now());
  for (let i = 0; i < 6; i++)
    bytes[i] = Number((ms >> BigInt(40 - i * 8)) & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const text = z.string().trim().min(1).max(200);
const commandId = z.string().uuid();
const target = { sampleId: text, revision: z.number().int().positive() };
/** The signer's password, re-entered for an Electronic signature. It is never
 * trimmed, stored, logged or part of the command fingerprint. */
const signPrompt = 'Enter your password to sign.';
const password = z.string({ error: signPrompt }).min(1, signPrompt).max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a valid date.');

const required = (label: string) =>
  z
    .string({ error: `Enter the ${label}.` })
    .trim()
    .min(1, `Enter the ${label}.`)
    .max(200);
const optionalText = z.string().trim().max(200).default('');
const optionalDate = date.nullable().default(null);

const receiptDeviation = {
  kind: z.enum(receiptDeviationKinds, {
    error: 'Choose the kind of Receipt deviation from the list.',
  }),
  description: z
    .string({ error: 'Describe the Receipt deviation.' })
    .trim()
    .min(3, 'Describe the Receipt deviation.')
    .max(1000),
};

export const sampleReceiptSchema = z.object({
  clientSampleId: optionalText,
  materialType: z.enum(materialTypes),
  product: required('product name'),
  strength: optionalText,
  batch: required('batch or lot'),
  manufacturer: optionalText,
  manufactureDate: optionalDate,
  expiryDate: optionalDate,
  expiryKind: z.enum(expiryKinds).default('expiry'),
  quantity: z.object(
    {
      value: z
        .number({ error: 'Enter the quantity received as a number.' })
        .finite()
        .positive('The quantity received must be a positive number.'),
      unit: z.enum(quantityUnits),
    },
    { error: 'Enter the quantity received.' },
  ),
  containers: z.object({
    count: z
      .number({ error: 'Enter the number of containers.' })
      .int()
      .positive('The number of containers must be at least 1.')
      .max(10000),
    type: z.enum(containerTypes),
  }),
  conditionOnReceipt: required('condition on receipt'),
  storageCondition: optionalText,
  storageLocation: optionalText,
  methodIds: z.array(text).min(1, 'Request at least one Method.').max(20),
  dueDate: date,
  priority: z.enum(priorities),
  remarks: z.string().trim().max(2000).default(''),
  retentionInstruction: optionalText,
  maximumDailyDose: z
    .number()
    .finite()
    .positive('The Maximum daily dose must be a positive number of mg/day.')
    .nullable()
    .default(null),
  stability: z
    .object({
      studyId: required('stability study ID'),
      timePoint: z.enum(stabilityTimePoints, {
        error: 'Choose a stability time point from the list.',
      }),
      condition: z.enum(stabilityConditions, {
        error: 'Choose a stability storage condition from the list.',
      }),
    })
    .nullable()
    .default(null),
  /** Problems found on arrival; any at all put the Sample on hold. */
  deviations: z.array(z.object(receiptDeviation)).max(10).default([]),
});
/** A Sample as a receipt supplies it; optional fields may be omitted. */
export type SampleReceipt = z.input<typeof sampleReceiptSchema>;

export const receiveSubmissionSchema = z.object({
  commandId,
  type: z.literal('receiveSubmission'),
  clientId: text,
  clientReference: optionalText,
  /** Omitted to take the server time. A correction must give a reason. */
  receivedAt: z
    .object({
      at: z.iso.datetime({
        offset: true,
        error: 'Enter a valid received date and time.',
      }),
      reason: z.string().trim().max(1000),
    })
    .nullable()
    .default(null),
  courier: optionalText,
  trackingNumber: optionalText,
  shippingCondition: z.enum(shippingConditions),
  temperatureOnArrival: z
    .number()
    .finite()
    .min(-100)
    .max(100)
    .nullable()
    .default(null),
  packageCondition: z.enum(packageConditions),
  chainOfCustodyReference: optionalText,
  samples: z.array(sampleReceiptSchema).min(1).max(50),
});
/** A receipt as a client sends it; optional fields may be omitted. */
export type SubmissionReceipt = z.input<typeof receiveSubmissionSchema>;

export const commandSchema = z.discriminatedUnion('type', [
  receiveSubmissionSchema,
  z.object({ commandId, type: z.literal('assign'), ...target, assignee: text }),
  z.object({
    commandId,
    type: z.literal('enterResult'),
    ...target,
    testId: text,
    value: z.number().finite().nonnegative(),
    instrumentReading: z.number().finite().nonnegative(),
    sequenceId: text,
    attachmentId: text,
    reason: z.string().trim().max(1000),
  }),
  z.object({
    commandId,
    type: z.literal('submitForApproval'),
    ...target,
    password,
  }),
  z.object({ commandId, type: z.literal('approve'), ...target, password }),
  z.object({
    commandId,
    type: z.literal('return'),
    ...target,
    comment: z.string().trim().min(3).max(2000),
  }),
  z.object({
    commandId,
    type: z.literal('openOosInvestigation'),
    ...target,
    testId: text,
  }),
  z.object({
    commandId,
    type: z.literal('recordLabErrorCheck'),
    ...target,
    investigationId: text,
    findings: z.string().trim().min(3).max(2000),
    errorIdentified: z.boolean(),
  }),
  z.object({
    commandId,
    type: z.literal('concludeOosInvestigation'),
    ...target,
    investigationId: text,
    outcome: z.enum(['Invalidated', 'Confirmed']),
    /** Mandatory for Invalidated; must be empty for Confirmed. */
    assignableCause: z.string().trim().max(2000),
  }),
  z.object({
    commandId,
    type: z.literal('recordClientOosNotification'),
    ...target,
    investigationId: text,
    contact: required('Client contact who was informed'),
    notifiedAt: z.iso.datetime({
      offset: true,
      error: 'Enter when the Client was informed.',
    }),
  }),
  z.object({
    commandId,
    type: z.literal('publish'),
    ...target,
    recipients: z
      .array(required('recipient'), { error: 'Enter the recipients.' })
      .min(1, 'Enter at least one recipient.')
      .max(20),
    channel: z.enum(issueChannels, {
      error:
        'Choose how the Certificate was issued: email, portal, print or other.',
    }),
    /** Free text; required when the channel is `other`. */
    channelDetail: optionalText,
    publishedAt: z.iso.datetime({
      offset: true,
      error: 'Enter when the Certificate was issued.',
    }),
  }),
  z.object({
    commandId,
    type: z.literal('recordReceiptDeviation'),
    ...target,
    ...receiptDeviation,
  }),
  z.object({
    commandId,
    type: z.literal('recordClientInstruction'),
    ...target,
    decision: z.enum(clientDecisions, {
      error: 'Choose whether the Client says to proceed or withdraw.',
    }),
    contact: required('Client contact who gave the instruction'),
    instructedAt: z.iso.datetime({
      offset: true,
      error: 'Enter when the Client gave the instruction.',
    }),
  }),
]);
export type Command = z.infer<typeof commandSchema>;

// Compile-time check: the commands that carry a password are exactly those
// with a signature meaning.
type PasswordCommandType = Extract<Command, { password: string }>['type'];
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type SigningCommandsCarryPasswords<
  T extends true = Same<PasswordCommandType, SigningCommandType>,
> = T;

/**
 * A replay is surfaced as a replay, never as a fresh save. If a client wrongly
 * reused a key for a genuinely second laboratory act, silent success would lose
 * that act with no trace; an explicit "already recorded" is the moment the
 * analyst notices and records it properly.
 *
 * `samples` holds every Sample the command touched, in order: one for a
 * Sample command, all of them for a receipt, which also returns its
 * Submission.
 */
export type CommandOutcome = {
  submission: Submission | null;
  samples: Sample[];
} & (
  | { outcome: 'applied' }
  | {
      outcome: 'replayed';
      originallyAppliedAt: string;
      originalActorId: string;
    }
);

/**
 * Separation of duties (ADR-0003): whoever entered any Result on a Sample,
 * current or earlier, may not give it Approval. Shared so the core enforces it
 * and the workspace can explain a disabled Approve.
 */
export function enteredResultOn(sample: Sample, actorId: string) {
  return sample.tests.some((t) =>
    t.results.some((r) => r.enteredBy === actorId),
  );
}
