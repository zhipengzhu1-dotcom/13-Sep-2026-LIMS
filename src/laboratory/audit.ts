import type { DatabaseSync } from 'node:sqlite';
import type {
  AcceptableIntake,
  AuditedAct,
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

type Row = Omit<AuditEntry, 'oldValue' | 'newValue'> & {
  oldValue: string;
  newValue: string;
};

/**
 * The append-only audit trail (ADR-0001). The application only ever inserts
 * into it; the database refuses updates and deletes as a second line of
 * defence. Order is the explicit `sequence`, never storage order.
 */
export class AuditTrail {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS audit (
        sequence INTEGER PRIMARY KEY, recordType TEXT NOT NULL, recordId TEXT NOT NULL,
        sampleId TEXT, field TEXT NOT NULL, oldValue TEXT NOT NULL, newValue TEXT NOT NULL,
        reason TEXT, actor TEXT NOT NULL, at TEXT NOT NULL, commandType TEXT NOT NULL,
        commandId TEXT NOT NULL) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS audit_by_sample ON audit (sampleId, sequence);
      CREATE INDEX IF NOT EXISTS audit_by_record ON audit (recordType, recordId, sequence);
      CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit
        BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be changed.'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit
        BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be deleted.'); END;`);
  }

  /** A writer for one command. `written` counts its entries so far. */
  writer(command: {
    actor: string;
    at: string;
    commandType: AuditedAct;
    commandId: string;
  }): Audit & { readonly written: number } {
    const insert = this.db.prepare(
      `INSERT INTO audit (sequence, recordType, recordId, sampleId, field, oldValue, newValue, reason, actor, at, commandType, commandId)
       VALUES ((SELECT COALESCE(MAX(sequence), 0) + 1 FROM audit), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let written = 0;
    const audit = {
      get written() {
        return written;
      },
      change(record, field, oldValue, newValue, reason) {
        insert.run(
          record.type,
          record.id,
          record.sampleId,
          field,
          JSON.stringify(oldValue),
          JSON.stringify(newValue),
          reason || null,
          command.actor,
          command.at,
          command.commandType,
          command.commandId,
        );
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

  /** The lab-wide trail, or one Sample's history, newest first. */
  entries(sample?: Sample): AuditEntry[] {
    const rows = (
      sample
        ? this.db
            .prepare(
              `SELECT * FROM audit WHERE sampleId = ?
                 OR (sampleId IS NULL AND recordType = 'Submission' AND recordId = ?)
               ORDER BY sequence DESC`,
            )
            .all(sample.id, sample.submissionId)
        : this.db.prepare('SELECT * FROM audit ORDER BY sequence DESC').all()
    ) as Row[];
    return rows.map((row) => ({
      ...row,
      oldValue: JSON.parse(row.oldValue),
      newValue: JSON.parse(row.newValue),
    }));
  }
}
