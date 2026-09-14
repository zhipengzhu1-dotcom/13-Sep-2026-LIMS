import {
  auditWriter,
  type Audit,
  type AuditChange,
} from '../src/laboratory/audit.ts';

/**
 * An audit writer for tests that keeps its entries in memory, oldest first.
 * It shares `auditWriter` with the SQLite writer, so it records exactly the
 * entries production would store, values round-tripped through JSON as the
 * database keeps them. Test code only: it is not the tamper-proof trail.
 */
export function recordingAudit(): Audit & {
  readonly written: number;
  readonly entries: readonly AuditChange[];
} {
  const entries: AuditChange[] = [];
  const audit = auditWriter((change) => {
    entries.push(
      Object.freeze({
        ...change,
        oldValue: JSON.parse(JSON.stringify(change.oldValue)),
        newValue: JSON.parse(JSON.stringify(change.newValue)),
      }),
    );
  });
  return {
    change: audit.change,
    compare: audit.compare,
    set: audit.set,
    get written() {
      return audit.written;
    },
    entries,
  };
}
