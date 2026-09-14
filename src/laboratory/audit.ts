import type { DatabaseSync } from 'node:sqlite';
import type { AuditedAct, AuditEntry, Sample } from './contracts.ts';
import { auditWriter, type Audit } from './audit-writer.ts';

export {
  auditRecord,
  auditWriter,
  type Audit,
  type AuditChange,
  type AuditRecord,
} from './audit-writer.ts';

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
        BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be deleted.'); END;
      CREATE TRIGGER IF NOT EXISTS audit_no_replace BEFORE INSERT ON audit
        WHEN EXISTS (SELECT 1 FROM audit WHERE sequence = NEW.sequence)
        BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be changed.'); END;`);
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
    return auditWriter((change) =>
      insert.run(
        change.recordType,
        change.recordId,
        change.sampleId,
        change.field,
        JSON.stringify(change.oldValue),
        JSON.stringify(change.newValue),
        change.reason,
        command.actor,
        command.at,
        command.commandType,
        command.commandId,
      ),
    );
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
