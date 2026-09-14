import type { DatabaseSync } from 'node:sqlite';
import type { Signature } from './contracts.ts';

/** Electronic signatures as recorded, each kept with the key of the command
 * it signed. It never holds the password. */
export class SignatureStore {
  constructor(private db: DatabaseSync) {
    db.exec(
      'CREATE TABLE IF NOT EXISTS signatures (id INTEGER PRIMARY KEY, sampleId TEXT NOT NULL, signerId TEXT NOT NULL, printedName TEXT NOT NULL, signedAt TEXT NOT NULL, meaning TEXT NOT NULL, command TEXT NOT NULL, commandId BLOB NOT NULL);',
    );
  }

  /** Oldest first: lab-wide or for one Sample. */
  list(sampleId?: string): Signature[] {
    const columns =
      'SELECT sampleId, signerId, printedName, signedAt, meaning, command FROM signatures';
    const rows = (
      sampleId === undefined
        ? this.db.prepare(`${columns} ORDER BY signedAt, id`).all()
        : this.db
            .prepare(`${columns} WHERE sampleId=? ORDER BY signedAt, id`)
            .all(sampleId)
    ) as (Omit<Signature, 'command'> & { command: string })[];
    return rows.map((row) => ({ ...row, command: JSON.parse(row.command) }));
  }

  record(signature: Signature, commandId: Uint8Array) {
    this.db
      .prepare(
        'INSERT INTO signatures (sampleId, signerId, printedName, signedAt, meaning, command, commandId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        signature.sampleId,
        signature.signerId,
        signature.printedName,
        signature.signedAt,
        signature.meaning,
        JSON.stringify(signature.command),
        commandId,
      );
  }
}
