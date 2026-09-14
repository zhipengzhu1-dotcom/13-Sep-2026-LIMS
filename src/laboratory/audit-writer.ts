/**
 * What a command writes to the audit trail and how: the record an entry
 * describes, the `Audit` a handler writes through, and the diffing every
 * writer shares. Pure and browser-safe, so core modules the workspace imports
 * can write their own audit entries; the SQLite trail is in audit.ts.
 */
import type {
  AcceptableIntake,
  AuditEntry,
  AuditRecordType,
  AuditValue,
  OosInvestigation,
  Sample,
  Submission,
  Test,
} from './contracts.ts';
import type { Attachment } from './attachment-contracts.ts';

/** The record an entry describes, and the Sample whose history it joins. */
export type AuditRecord = {
  type: AuditRecordType;
  id: string;
  sampleId: string | null;
};

export const auditRecord = {
  submission: (s: Submission): AuditRecord => ({
    type: 'Submission',
    id: s.id,
    sampleId: null,
  }),
  sample: (s: Sample): AuditRecord => ({
    type: 'Sample',
    id: s.id,
    sampleId: s.id,
  }),
  test: (s: Sample, t: Test): AuditRecord => ({
    type: 'Test',
    id: `${s.id}/${t.id}`,
    sampleId: s.id,
  }),
  investigation: (s: Sample, i: OosInvestigation): AuditRecord => ({
    type: 'OOS investigation',
    id: i.id,
    sampleId: s.id,
  }),
  certificate: (s: Sample, version: number): AuditRecord => ({
    type: 'Certificate of Analysis',
    id: `${s.id}/v${version}`,
    sampleId: s.id,
  }),
  acceptableIntake: (e: AcceptableIntake): AuditRecord => ({
    type: 'Acceptable intake',
    id: String(e.id),
    sampleId: null,
  }),
  attachment: (a: Attachment): AuditRecord => ({
    type: 'Attachment',
    id: a.id,
    sampleId: null,
  }),
};

/** The Sample and Test an entry on a Test describes, or undefined when the
 * entry is on another record or names a Test not among `samples`. */
export function auditedTest(
  entry: Pick<AuditEntry, 'recordType' | 'recordId' | 'sampleId'>,
  samples: readonly Sample[],
): { sample: Sample; test: Test } | undefined {
  if (entry.recordType !== 'Test') return undefined;
  const sample = samples.find((s) => s.id === entry.sampleId);
  const test = sample?.tests.find(
    (t) => auditRecord.test(sample, t).id === entry.recordId,
  );
  return sample && test && { sample, test };
}

/** Fields of `T` whose values the trail can hold as they are. */
type AuditableKey<T> = {
  [K in keyof T]: T[K] extends AuditValue ? K : never;
}[keyof T] &
  string;

/**
 * How a command handler writes its audit entries. The entry point binds it to
 * the command, so the actor, timestamp, command type and key are filled in
 * here and a handler states only what changed and why. Entries land in the
 * command's transaction, so a rejected command leaves none behind.
 */
export type Audit = {
  /** One field changing from `oldValue` to `newValue`. */
  change(
    record: AuditRecord,
    field: string,
    oldValue: AuditValue,
    newValue: AuditValue,
    reason?: string,
  ): void;
  /**
   * Every field that differs between two versions of a record, with nested
   * values flattened to dotted paths. Pass `before` as null for a new record,
   * which writes each of its fields. `omit` names paths that are not audited
   * as fields (identifiers, child collections audited as their own records).
   * Returns the number of entries written.
   */
  compare(
    record: AuditRecord,
    before: object | null,
    after: object,
    options?: { reason?: string; omit?: readonly string[] },
  ): number;
  /** Sets `target[field]`, recording the change when the value differs. */
  set<T extends object, K extends AuditableKey<T>>(
    record: AuditRecord,
    target: T,
    field: K,
    value: T[K],
    reason?: string,
  ): void;
};

function flatten(
  value: unknown,
  path: string,
  omit: readonly string[],
  into: Map<string, AuditValue>,
) {
  if (value === undefined || omit.includes(path)) return;
  if (value === null || typeof value !== 'object') {
    into.set(path, value as AuditValue);
    return;
  }
  const children = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value);
  for (const [key, child] of children)
    flatten(child, path ? `${path}.${key}` : key, omit, into);
}

/** What a change to a record puts on the trail, before the command's actor,
 * timestamp, type and key are added. */
export type AuditChange = Pick<
  AuditEntry,
  | 'recordType'
  | 'recordId'
  | 'sampleId'
  | 'field'
  | 'oldValue'
  | 'newValue'
  | 'reason'
>;

/**
 * An `Audit` that turns each change, comparison and set into field-level
 * changes and hands them, one at a time and in order, to `write`. Every audit
 * writer is built on it, so they all produce the same entries for the same
 * calls. `written` counts the changes handed over so far.
 */
export function auditWriter(
  write: (change: AuditChange) => void,
): Audit & { readonly written: number } {
  let written = 0;
  const audit = {
    get written() {
      return written;
    },
    change(record, field, oldValue, newValue, reason) {
      write({
        recordType: record.type,
        recordId: record.id,
        sampleId: record.sampleId,
        field,
        oldValue,
        newValue,
        reason: reason || null,
      });
      written++;
    },
    compare(record, before, after, { reason, omit = [] } = {}) {
      const old = new Map<string, AuditValue>();
      const next = new Map<string, AuditValue>();
      if (before) flatten(before, '', omit, old);
      flatten(after, '', omit, next);
      let count = 0;
      for (const field of new Set([...next.keys(), ...old.keys()])) {
        const from = old.get(field) ?? null;
        const to = next.get(field) ?? null;
        if (from === to) continue;
        audit.change(record, field, from, to, reason);
        count++;
      }
      return count;
    },
    set(record, target, field, value, reason) {
      if (target[field] === value) return;
      audit.change(
        record,
        field,
        target[field] as AuditValue,
        value as AuditValue,
        reason,
      );
      target[field] = value;
    },
  } satisfies Audit & { readonly written: number };
  return audit;
}
