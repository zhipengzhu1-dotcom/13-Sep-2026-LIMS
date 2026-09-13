import { z } from 'zod';
import type { AcceptableIntake, ConformityStatement } from './limits.ts';

export * from './limits.ts';

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
 * correction. Results are never deleted, only moved out of `current`.
 */
export type ResultStatus = 'current' | 'superseded';

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
  enteredBy: string;
  enteredAt: string;
  /** Empty for a first Result; required when it replaces the current one. */
  reason: string;
  /** A copy of the Acceptable intake entry in force when the Result was
   * entered, kept even after a newer entry is added; null for raw materials. */
  limit: AcceptableIntake | null;
  /** Decided by the core when the Result is entered; never entered. */
  conformity: ConformityStatement;
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

export type Snapshot = {
  submissions: Submission[];
  samples: Sample[];
  activity: Activity[];
  people: typeof people;
  analytes: typeof analytes;
  methods: typeof methods;
  /** Every Acceptable intake entry, current and historical, in append order. */
  acceptableIntakes: AcceptableIntake[];
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
    instrumentReading: z.number().finite().nonnegative(),
    sequenceId: text,
    reason: z.string().trim().max(1000),
  }),
  z.object({ commandId, type: z.literal('submitForApproval'), ...target }),
  z.object({ commandId, type: z.literal('approve'), ...target }),
  z.object({
    commandId,
    type: z.literal('return'),
    ...target,
    comment: z.string().trim().min(3).max(2000),
  }),
]);
export type Command = z.infer<typeof commandSchema>;

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
