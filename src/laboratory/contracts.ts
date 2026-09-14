import { z } from 'zod';
import {
  acceptableIntakeEntrySchema,
  type AcceptableIntake,
  type ConformityStatement,
} from './limits.ts';
import type { Attachment } from './attachment-contracts.ts';
import type { CertificateSummary } from './certificate.ts';

export * from './limits.ts';
// The Result & OOS investigation module's answers, for callers that ask
// through contracts. Their logic lives only in results.ts.
export {
  didBenchWork,
  investigationOf,
  oosRows,
  outOfSpecification,
  resultsView,
  type OosInvestigation,
  type OosOutcome,
  type OosRow,
} from './results.ts';
import type { OosInvestigation } from './results.ts';

/** Lab users as the workspace shows them. Sign-in accounts (with password
 * hashes, server side only) are seeded from this list in src/accounts. */
export const roles = ['coordinator', 'analyst', 'manager', 'admin'] as const;
export type Role = (typeof roles)[number];
/**
 * The one place a role grants permission. An Admin acts in every role
 * (ADR-0004), still as themselves: their own account on the audit trail,
 * their own password and name on a signature, and bound by separation of
 * duties like anyone else. The core and the workspace both ask this.
 */
export function actsAs(person: { role: string } | undefined, role: Role) {
  return person?.role === role || person?.role === 'admin';
}
/** A lab user as the core and the workspace know them. */
export type Person = {
  readonly id: string;
  readonly name: string;
  readonly role: Role;
  /** A deactivated person stays listed, so the record still names them, but
   * can no longer act. */
  readonly active: boolean;
};
export const people = [
  { id: 'coordinator', name: 'Morgan Lee', role: 'coordinator', active: true },
  { id: 'analyst', name: 'Alex Chen', role: 'analyst', active: true },
  { id: 'analyst-2', name: 'Sam Rivera', role: 'analyst', active: true },
  { id: 'manager', name: 'Taylor Brooks', role: 'manager', active: true },
  { id: 'admin', name: 'Jordan Park', role: 'admin', active: true },
] as const satisfies readonly Person[];
export type Actor = Person;

export const materialTypes = ['raw material', 'finished product'] as const;
export type MaterialType = (typeof materialTypes)[number];
export type ReportingUnit = 'ppm' | 'ng/day';

/** Whether a Material type is a finished product, which takes a Maximum daily
 * dose, may be a Stability sample and is judged against a Limit. */
export const isFinishedProduct = (materialType: MaterialType) =>
  materialType === 'finished product';

/** The reporting unit follows the Material type and is never entered. */
export function reportingUnit(materialType: MaterialType): ReportingUnit {
  return isFinishedProduct(materialType) ? 'ng/day' : 'ppm';
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
  /** Fixed, validated LOD and LOQ in ppm (ADR-0002). */
  ppmLodLoq: LodLoq;
  /** The highest Maximum daily dose, in mg/day, the Method may be requested
   * for. Its ng/day LOD and LOQ are set at this dose, so they are conservative
   * for every dose at or below it. */
  maximumDoseCeiling: number;
};

/** A limit of detection and limit of quantitation in one reporting unit. */
export type LodLoq = { lod: number; loq: number };

/**
 * A Method's LOD and LOQ in a reporting unit. In ng/day they are the ppm pair
 * at the Maximum-dose ceiling (ng/day = ppm × mg/day), never stored apart
 * from it, rounded to 12 significant digits to drop binary noise.
 */
export function methodLodLoq(method: Method, unit: ReportingUnit): LodLoq {
  const { lod, loq } = method.ppmLodLoq;
  if (unit === 'ppm') return { lod, loq };
  const atCeiling = (ppm: number) =>
    Number((ppm * method.maximumDoseCeiling).toPrecision(12));
  return { lod: atCeiling(lod), loq: atCeiling(loq) };
}

/** At a 100 mg/day ceiling the ng/day LOQ is 3, within 20 % of the lowest
 * Acceptable intake, 26.5 ng/day. */
const method = (code: string, analyteId: Analyte['id']): Method => ({
  id: `${code}-v1`,
  code,
  version: 1,
  analyteId,
  technique: 'LC-MS/MS',
  materialTypes,
  ppmLodLoq: { lod: 0.01, loq: 0.03 },
  maximumDoseCeiling: 100,
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
  /** The laboratory's calendar day (YYYY-MM-DD, `laboratoryDay`) the Analyst
   * ran the analysis, as entered; `enteredAt` stays the server time of
   * recording. Absent on a Result entered before analysis dates were
   * recorded. */
  analysedOn?: string;
  enteredBy: string;
  enteredAt: string;
  /** Empty for a first Result; required when it replaces the current one. */
  reason: string;
  /** A copy of the Acceptable intake entry in force when the Result was
   * entered, kept even after a newer entry is added; null for raw materials.
   * A copy made before entries recorded their Potency category and Limit
   * type has neither field. */
  limit:
    | (Omit<AcceptableIntake, 'potencyCategory' | 'limitType'> &
        Partial<Pick<AcceptableIntake, 'potencyCategory' | 'limitType'>>)
    | null;
  /** Decided by the core when the Result is entered; never entered. */
  conformity: ConformityStatement;
  /** The OOS investigation opened on this Result, kept once it is closed
   * (its outcome and any assignable cause are on the investigation). */
  investigationId: string | null;
  /** For a Retest, the OOS investigation that Invalidated the Result it
   * follows, and through it that Invalidated result; null for a first entry
   * or a correction. Written only by the Result & OOS investigation module. */
  retestAfter: string | null;
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
  /** The Method's Maximum-dose ceiling (mg/day) the ng/day LOD and LOQ were
   * set at, copied at receipt; null for a ppm Test, and absent on a Test
   * received before ceilings were recorded. */
  maximumDoseCeiling?: number | null;
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
  'Amendment in progress',
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

/** The person at the Client a Submission's Certificates of Analysis are for,
 * as the Client gave them at receipt. */
export type ClientContact = {
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type Submission = {
  id: string;
  clientId: string;
  /** The Client's name and kind as they were at receipt. */
  client: string;
  clientKind: ClientKind;
  clientReference: string;
  /** Absent on a Submission received before the contact was recorded. */
  clientContact?: ClientContact;
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
  | 'Certificate of Analysis'
  | 'Acceptable intake'
  | 'Attachment'
  | 'Account'
  /** A backup of the database, by the file it was taken to or restored from. */
  | 'Backup';
/** Why a user set a password of their own, as its Access event records it, so
 * the periodic access review tells the three apart. */
export type PasswordSetReason =
  | 'Replaced a One-time password'
  | 'Replaced an expired password'
  | 'Changed by the user';
/** An Access event: an audit entry about an account rather than a record
 * (ADR-0010), as the accounts store and sessions report it. Never a
 * password. */
export type AccessEvent =
  | {
      type: 'signIn';
      username: string;
      /** The consecutive Failed attempts this sign-in reset. */
      clearedFailedAttempts: number;
    }
  | { type: 'signOut'; username: string }
  | { type: 'sessionExpiry'; username: string; reason: string }
  | {
      type: 'failedAttempt';
      /** The username that was typed, whether or not that account exists. */
      username: string;
      /** Consecutive Failed attempts on this username, this one included. */
      consecutive: number;
      /** Why the attempt was refused, in words. */
      reason: string;
    }
  | { type: 'lockout'; username: string; consecutive: number }
  | {
      type: 'passwordSet';
      by: string;
      username: string;
      /** Why the user set it; absent for the Admin's before Go-live. */
      reason?: PasswordSetReason;
    }
  | {
      type: 'unlock';
      by: string;
      username: string;
      /** The consecutive Failed attempts the unlock cleared. */
      clearedFailedAttempts: number;
      /** The approved Form the System administrator cites. */
      reference?: string;
    }
  | {
      type: 'accountChanged';
      /** The Admin who changed it. */
      by: string;
      username: string;
      changes: {
        field: 'name' | 'role' | 'active';
        from: string | boolean;
        to: string | boolean;
      }[];
    }
  | {
      type: 'accountAdded';
      /** The Admin, or the System administrator, who added it. */
      by: string;
      username: string;
      name: string;
      role: Role;
      /** The approved change record the System administrator cites. */
      reference?: string;
    }
  | {
      type: 'oneTimePasswordIssued';
      /** The System administrator who issued it. */
      by: string;
      username: string;
      /** The approved Form or change record it was issued under. */
      reference: string;
    }
  | {
      type: 'lockoutNotice';
      username: string;
      /** Whether the notice was sent, and to whom or why not. */
      sent: boolean;
      reason: string;
    };
export type AccessEventType = AccessEvent['type'];
/** What an audit entry records the doing of: a command, the upload of a
 * worksheet attachment, which is stored outside the command seam, or an
 * Access event. */
export type AuditedAct =
  | Command['type']
  | 'storeAttachment'
  | AccessEventType
  /** The System administrator's backup and restore of the database. */
  | 'backup'
  | 'restore';

/** How the audit trail names each act, on screen and on the System
 * administrator's printouts. */
export const auditedActLabels: Record<AuditedAct, string> = {
  receiveSubmission: 'Received',
  assign: 'Assigned',
  enterResult: 'Result entered',
  submitForApproval: 'Submitted',
  approve: 'Approved',
  return: 'Returned',
  openOosInvestigation: 'OOS investigation opened',
  recordLabErrorCheck: 'Lab error check recorded',
  concludeOosInvestigation: 'OOS investigation concluded',
  recordReceiptDeviation: 'Receipt deviation recorded',
  recordClientInstruction: 'Client instruction recorded',
  recordClientOosNotification: 'Client informed of confirmed OOS',
  publish: 'Published',
  startAmendment: 'Amendment started',
  appendAcceptableIntake: 'Acceptable intake entry added',
  storeAttachment: 'Worksheet uploaded',
  signIn: 'Signed in',
  signOut: 'Signed out',
  sessionExpiry: 'Session expired',
  failedAttempt: 'Failed attempt',
  lockout: 'Account locked',
  lockoutNotice: 'Lockout notice',
  accountAdded: 'Account added',
  accountChanged: 'Account changed',
  passwordSet: 'Password changed',
  unlock: 'Account unlocked',
  oneTimePasswordIssued: 'One-time password issued',
  backup: 'Backup taken',
  restore: 'Restored from backup',
};
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
  /** The Sample the record belongs to; null for a Submission, an Acceptable
   * intake entry or an attachment. */
  sampleId: string | null;
  /** The field, with dotted paths for nested values (`result.value`). */
  field: string;
  oldValue: AuditValue;
  newValue: AuditValue;
  reason: string | null;
  actor: string;
  at: string;
  commandType: AuditedAct;
  commandId: string;
};

/**
 * The entries made within a period of whole UTC calendar days, `from` and `to`
 * inclusive (YYYY-MM-DD); an empty bound leaves that side open.
 */
export function auditEntriesWithin<E extends Pick<AuditEntry, 'at'>>(
  entries: readonly E[],
  { from, to }: { from: string; to: string },
): E[] {
  return entries.filter((e) => {
    const day = new Date(e.at).toISOString().slice(0, 10);
    return (!from || day >= from) && (!to || day <= to);
  });
}

/** The laboratory's time zone: the calendar day an Analysis date names is a
 * day here. */
export const laboratoryTimeZone = 'America/New_York';

const laboratoryDays = new Intl.DateTimeFormat('en-CA', {
  timeZone: laboratoryTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The laboratory's calendar day (YYYY-MM-DD) at an ISO instant. */
export const laboratoryDay = (iso: string) =>
  laboratoryDays.format(new Date(iso));

/** The lab-wide audit trail's event-type filter: every entry, Access events
 * alone, or record changes alone. */
export type AuditEventType = 'all' | 'accessEvents' | 'recordChanges';

export function auditEntriesOfEventType<
  E extends Pick<AuditEntry, 'recordType'>,
>(entries: readonly E[], type: AuditEventType): E[] {
  if (type === 'all') return [...entries];
  return entries.filter(
    (e) => (e.recordType === 'Account') === (type === 'accessEvents'),
  );
}

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
/** In an Amendment the Analyst's submission signs the correction as
 * "amended by"; its re-approval is still "approved by". */
export const amendmentSignatureMeanings = {
  submitForApproval: 'amended by',
} as const satisfies Partial<Record<SigningCommandType, string>>;
export type SignatureMeaning =
  | (typeof signatureMeanings)[SigningCommandType]
  | (typeof amendmentSignatureMeanings)[keyof typeof amendmentSignatureMeanings];

/** The meaning a signing command is recorded with: in an Amendment (a Sample
 * that already has a Certificate of Analysis) or not. */
export function signatureMeaning(
  type: SigningCommandType,
  inAmendment: boolean,
): SignatureMeaning {
  return inAmendment && Object.hasOwn(amendmentSignatureMeanings, type)
    ? amendmentSignatureMeanings[
        type as keyof typeof amendmentSignatureMeanings
      ]
    : signatureMeanings[type];
}

/** What every Approval signature, including an Amendment's, attests was
 * reviewed (§211.194(a)(8)). Its meaning stays "approved by". */
export const approvalReviewStatement =
  "The Results, their calculation worksheets, the original instrument data, any OOS investigations and the Sample's audit trail were reviewed.";

/** An Electronic signature as recorded. It never holds the password. */
export type Signature = {
  sampleId: string;
  signerId: string;
  /** The signer's printed name at the moment of signing. */
  printedName: string;
  /** ISO 8601 with offset; the command's own timestamp. */
  signedAt: string;
  meaning: SignatureMeaning;
  /** What the signer attests was reviewed, as held in the Signed content:
   * on Approvals only, and absent on those signed before #31. */
  reviewStatement?: string;
  /** The command that was signed, exactly as applied, without the password. */
  command: {
    commandId: string;
    type: SigningCommandType;
    sampleId: string;
    revision: number;
  };
  /** Whether the signature still matches its stored Signed content, checked
   * on every read. A failing signature stays on record, shown as invalid. */
  valid: boolean;
};

/** Exactly what an Electronic signature attests to, kept as it stood at the
 * moment of signing: the Sample as saved by the signing command (attachments
 * by ID) and, for Approval, the Certificate of Analysis version it issued and
 * the review statement it attests to. */
export type SignedContent = {
  sample: Sample;
  certificate: { version: number; sha256: string } | null;
  /** Absent on submissions, and on Approvals signed before #31, whose
   * stored content and hash stay as they were. */
  reviewStatement?: string;
};

/** Commands refused on a Sample that has an invalid Electronic signature;
 * bench work and OOS investigations continue (ADR-0008). */
export const commandsNeedingValidSignatures = [
  'submitForApproval',
  'approve',
  'publish',
  'startAmendment',
] as const satisfies readonly Command['type'][];

/** The refusal for those commands, or null while every signature on the
 * Sample verifies. */
export function invalidSignatureRefusal(
  signatures: readonly Signature[],
  sampleId: string,
): string | null {
  return signatures.some((x) => x.sampleId === sampleId && !x.valid)
    ? `An Electronic signature on Sample ${sampleId} is invalid. Contact the Quality lead.`
    : null;
}

export type Snapshot = {
  submissions: Submission[];
  samples: Sample[];
  /** The lab-wide audit trail, newest first. */
  audit: AuditEntry[];
  /** Every Electronic signature, oldest first. */
  signatures: Signature[];
  /** Records only; the bytes are downloaded per attachment. */
  attachments: Attachment[];
  people: readonly Person[];
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
  clientContact: z.object(
    {
      name: required("Client contact's name"),
      role: required("Client contact's role"),
      email: z
        .email({ error: "Enter the Client contact's email address." })
        .max(200),
      phone: required("Client contact's phone number"),
    },
    { error: 'Enter the Client contact.' },
  ),
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
    analysedOn: z
      .string({ error: 'Enter the analysis date.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the analysis date.')
      .pipe(date),
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
    /** The Manager confirms the identified laboratory error caused the value:
     * true for Invalidated, false for Confirmed. Always stated. */
    causationConfirmed: z.boolean(),
  }),
  z.object({
    commandId,
    type: z.literal('recordClientOosNotification'),
    ...target,
    investigationId: text,
    contact: required('Client contact who was informed'),
    /** What data and Laboratory error check findings were sent to the
     * Client; the length rule is the module's. */
    sent: z
      .string({ error: 'State what was sent to the Client.' })
      .trim()
      .max(
        2000,
        'State what was sent to the Client in 2000 characters or fewer.',
      ),
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
    type: z.literal('startAmendment'),
    ...target,
    reason: z
      .string({ error: 'Give a reason for the Amendment.' })
      .trim()
      .min(3, 'Give a reason for the Amendment.')
      .max(2000),
  }),
  z.object({
    commandId,
    type: z.literal('appendAcceptableIntake'),
    ...acceptableIntakeEntrySchema.shape,
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
