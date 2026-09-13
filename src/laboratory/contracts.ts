import { z } from 'zod';

export const people = [
  { id: 'coordinator', name: 'Morgan Lee', role: 'coordinator' },
  { id: 'analyst', name: 'Alex Chen', role: 'analyst' },
  { id: 'analyst-2', name: 'Sam Rivera', role: 'analyst' },
  { id: 'reviewer', name: 'Taylor Brooks', role: 'reviewer' },
] as const;
export type Actor = (typeof people)[number];
export const methods = [
  {
    id: 'assay',
    name: 'Assay',
    method: 'DEMO-HPLC-001 · v1',
    unit: '%',
    min: 98,
    max: 102,
    technique: 'HPLC',
  },
  {
    id: 'water',
    name: 'Water content',
    method: 'DEMO-KF-002 · v1',
    unit: '%',
    min: 0,
    max: 0.5,
    technique: 'Karl Fischer',
  },
  {
    id: 'impurity',
    name: 'Total impurities',
    method: 'DEMO-HPLC-003 · v1',
    unit: '%',
    min: 0,
    max: 1,
    technique: 'HPLC',
  },
] as const;
export type Method = {
  id: string;
  name: string;
  method: string;
  unit: string;
  min: number;
  max: number;
  technique: string;
};
export type Result = {
  value: number;
  reference: string;
  analyst: string;
  recordedAt: string;
  reason: string;
  inSpec: boolean;
};
export type Test = Method & { results: Result[] };
export type Sample = {
  id: string;
  product: string;
  client: string;
  batch: string;
  dueDate: string;
  priority: 'Routine' | 'Urgent';
  receivedAt: string;
  receivedBy: string;
  notes: string;
  assignee: string | null;
  status: 'Received' | 'In progress' | 'In review' | 'Returned' | 'Approved';
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
  samples: Sample[];
  activity: Activity[];
  people: typeof people;
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
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a valid date.');
export const commandSchema = z.discriminatedUnion('type', [
  z.object({
    commandId,
    type: z.literal('receive'),
    product: text,
    client: text,
    batch: text,
    dueDate: date,
    priority: z.enum(['Routine', 'Urgent']),
    notes: z.string().trim().max(2000),
    methodIds: z.array(text).min(1).max(20),
  }),
  z.object({ commandId, type: z.literal('assign'), ...target, assignee: text }),
  z.object({
    commandId,
    type: z.literal('record'),
    ...target,
    testId: text,
    value: z.number().finite(),
    reference: text,
    reason: z.string().trim().max(1000),
  }),
  z.object({ commandId, type: z.literal('submit'), ...target }),
  z.object({
    commandId,
    type: z.literal('review'),
    ...target,
    decision: z.enum(['approve', 'return']),
    comment: z.string().trim().min(3).max(2000),
  }),
]);
export type Command = z.infer<typeof commandSchema>;

/**
 * A replay is surfaced as a replay, never as a fresh save. If a client wrongly
 * reused a key for a genuinely second laboratory act, silent success would lose
 * that act with no trace; an explicit "already recorded" is the moment the
 * analyst notices and records it properly.
 */
export type CommandOutcome =
  | { outcome: 'applied'; sample: Sample }
  | {
      outcome: 'replayed';
      sample: Sample;
      originallyAppliedAt: string;
      originalActorId: string;
    };
export function hasException(sample: Sample) {
  return sample.tests.some((t) => t.results.some((r) => !r.inSpec));
}
