import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import type { Signature, SignedContent } from './contracts.ts';

/** A signature row as stored; `key` is the signed command's key in hex. */
type Row = {
  key: string;
  sampleId: string;
  signerId: string;
  printedName: string;
  signedAt: string;
  meaning: Signature['meaning'];
  command: string;
  signedContent: string;
  sha256: string;
};

const columns =
  'SELECT lower(hex(commandId)) AS key, sampleId, signerId, printedName, signedAt, meaning, command, signedContent, sha256 FROM signatures';

/** JSON with object keys sorted at every level, so the same value always
 * serializes to the same text. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
}

/** Stored JSON as a value, or null when it no longer parses. */
function parseStored<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** The SHA-256 binding a manifestation to its signed command, that command's
 * key and its Signed content. It is computed over the stored text, never a
 * re-serialization, so a later change in how values are written cannot
 * invalidate it. */
function hashOf(row: Omit<Row, 'sha256'>): string {
  return createHash('sha256')
    .update(
      canonical([
        row.key,
        row.sampleId,
        row.signerId,
        row.printedName,
        row.signedAt,
        row.meaning,
        row.command,
        row.signedContent,
      ]),
    )
    .digest('hex');
}

/** Whether a stored row still matches its hash. */
const matches = ({ sha256, ...row }: Row) => hashOf(row) === sha256;

/**
 * Electronic signatures as recorded, each kept with the key of the command it
 * signed and a copy of its Signed content, bound by a hash checked on every
 * read. It never holds the password. The database refuses updates and
 * deletes as a second line of defence.
 */
export class SignatureStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS signatures (id INTEGER PRIMARY KEY, sampleId TEXT NOT NULL, signerId TEXT NOT NULL, printedName TEXT NOT NULL, signedAt TEXT NOT NULL, meaning TEXT NOT NULL, command TEXT NOT NULL, commandId BLOB NOT NULL, signedContent TEXT NOT NULL, sha256 TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS signaturesNoUpdate BEFORE UPDATE ON signatures BEGIN SELECT RAISE(ABORT, 'Electronic signatures cannot be changed.'); END;
      CREATE TRIGGER IF NOT EXISTS signaturesNoDelete BEFORE DELETE ON signatures BEGIN SELECT RAISE(ABORT, 'Electronic signatures cannot be deleted.'); END;
      CREATE TRIGGER IF NOT EXISTS signaturesNoReplace BEFORE INSERT ON signatures
        WHEN EXISTS (SELECT 1 FROM signatures WHERE id = NEW.id)
        BEGIN SELECT RAISE(ABORT, 'Electronic signatures cannot be changed.'); END;`);
  }

  /** Oldest first: lab-wide or for one Sample, each checked against its
   * Signed content. A failing check never throws. */
  list(sampleId?: string): Signature[] {
    const rows = (
      sampleId === undefined
        ? this.db.prepare(`${columns} ORDER BY signedAt, id`).all()
        : this.db
            .prepare(`${columns} WHERE sampleId=? ORDER BY signedAt, id`)
            .all(sampleId)
    ) as Row[];
    return rows.map((row) => {
      const command = parseStored<Signature['command']>(row.command);
      const statement = parseStored<SignedContent>(
        row.signedContent,
      )?.reviewStatement;
      return {
        sampleId: row.sampleId,
        signerId: row.signerId,
        printedName: row.printedName,
        signedAt: row.signedAt,
        meaning: row.meaning,
        ...(typeof statement === 'string' && { reviewStatement: statement }),
        // A command altered past reading is shown by its key alone, with
        // no revision; the signature necessarily fails its check. Every
        // signing command is Submit for approval or Approval.
        command: command ?? {
          commandId: row.key.replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5',
          ),
          type: row.meaning === 'approved by' ? 'approve' : 'submitForApproval',
          sampleId: row.sampleId,
          revision: -1,
        },
        valid: command !== null && matches(row),
      };
    });
  }

  /** The Signed content of the signature on a command, with whether that
   * signature is valid; null if the command was not signed. Content altered
   * past reading comes back as null, never a throw. */
  signedContent(
    commandId: Uint8Array,
  ): { content: SignedContent | null; valid: boolean } | null {
    const row = this.db
      .prepare(`${columns} WHERE commandId=?`)
      .get(commandId) as Row | undefined;
    if (!row) return null;
    const content = parseStored<SignedContent>(row.signedContent);
    return { content, valid: content !== null && matches(row) };
  }

  record(
    signature: Omit<Signature, 'valid'>,
    content: SignedContent,
    commandId: Uint8Array,
  ) {
    const row = {
      key: Buffer.from(commandId).toString('hex'),
      sampleId: signature.sampleId,
      signerId: signature.signerId,
      printedName: signature.printedName,
      signedAt: signature.signedAt,
      meaning: signature.meaning,
      command: canonical(signature.command),
      signedContent: canonical(content),
    };
    this.db
      .prepare(
        'INSERT INTO signatures (sampleId, signerId, printedName, signedAt, meaning, command, commandId, signedContent, sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        row.sampleId,
        row.signerId,
        row.printedName,
        row.signedAt,
        row.meaning,
        row.command,
        commandId,
        row.signedContent,
        hashOf(row),
      );
  }
}
