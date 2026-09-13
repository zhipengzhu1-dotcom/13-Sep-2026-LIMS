import { z } from 'zod';

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
};

const method = (code: string, analyteId: Analyte['id']): Method => ({
  id: `${code}-v1`,
  code,
  version: 1,
  analyteId,
  technique: 'LC-MS/MS',
  materialTypes,
});
/** Illustrative placeholders; each Method measures exactly one Analyte. */
export const methods: readonly Method[] = [
  method('NIT-001', 'impurity-a'),
  method('NIT-002', 'impurity-a'),
  method('NIT-003', 'impurity-b'),
  method('NIT-004', 'impurity-b'),
  method('NIT-005', 'impurity-c'),
];

export type Result = {
  value: number;
  unit: ReportingUnit;
  enteredBy: string;
  enteredAt: string;
  /** Empty for a first Result; required when it replaces the current one. */
  reason: string;
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
  /** Every Result ever entered, oldest first; the last one is current. */
  results: Result[];
};

export const sampleStatuses = [
  'Received',
  'In progress',
  'Awaiting approval',
  'Returned',
  'Approved',
] as const;
export type SampleStatus = (typeof sampleStatuses)[number];

export type Submission = {
  id: string;
  client: string;
  receivedAt: string;
  receivedBy: string;
  sampleIds: string[];
};

export type Sample = {
  id: string;
  submissionId: string;
  client: string;
  product: string;
  batch: string;
  materialType: MaterialType;
  dueDate: string;
  priority: 'Routine' | 'Urgent';
  receivedAt: string;
  receivedBy: string;
  assignee: string | null;
  status: SampleStatus;
  /** The Manager's latest return, shown to the Analyst until resubmission. */
  lastReturn: { comment: string; by: string; at: string } | null;
  tests: Test[];
  revision: number;
};

export type Activity = {
  id: number;
  sampleId: string;
  action: string;
  actor: string;
  at: string;
  detail: string;
};

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
  activity: Activity[];
  /** Every Electronic signature, oldest first. */
  signatures: Signature[];
  people: typeof people;
  analytes: typeof analytes;
  methods: typeof methods;
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

export const sampleReceiptSchema = z.object({
  product: text,
  batch: text,
  materialType: z.enum(materialTypes),
  methodIds: z.array(text).min(1).max(20),
  dueDate: date,
  priority: z.enum(['Routine', 'Urgent']),
});
export type SampleReceipt = z.infer<typeof sampleReceiptSchema>;

export const commandSchema = z.discriminatedUnion('type', [
  z.object({
    commandId,
    type: z.literal('receiveSubmission'),
    client: text,
    samples: z.array(sampleReceiptSchema).min(1).max(50),
  }),
  z.object({ commandId, type: z.literal('assign'), ...target, assignee: text }),
  z.object({
    commandId,
    type: z.literal('enterResult'),
    ...target,
    testId: text,
    value: z.number().finite().nonnegative(),
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
