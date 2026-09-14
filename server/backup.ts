import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { backup, DatabaseSync } from 'node:sqlite';
import { storedSignatures } from '../src/laboratory/signature-store.ts';

/** What checking a database file found. */
export type Verification = {
  /** True when every check found nothing wrong. */
  passed: boolean;
  /** SHA-256 of the file as checked. */
  sha256: string;
  /** Electronic signatures checked against their Signed content. */
  signatures: { checked: number; invalid: number };
  /** Certificates of Analysis checked against their SHA-256. */
  certificates: { checked: number; mismatched: number };
  /** Attachments checked against their SHA-256. */
  attachments: { checked: number; mismatched: number };
  /** One line per check, for the System administrator's report. */
  checks: string[];
  /** What is wrong, in words; empty when it passed. */
  problems: string[];
};

/** Rows whose stored SHA-256 no longer matches their content as stored. */
function hashMismatches(
  db: DatabaseSync,
  table: 'certificates' | 'attachments',
) {
  let checked = 0;
  let mismatched = 0;
  for (const row of db
    .prepare(`SELECT sha256, content FROM ${table}`)
    .iterate() as Iterable<{ sha256: string; content: string | Uint8Array }>) {
    checked++;
    if (
      createHash('sha256').update(Buffer.from(row.content)).digest('hex') !==
      row.sha256
    )
      mismatched++;
  }
  return { checked, mismatched };
}

/**
 * Copies a database file while the server keeps writing to it, through
 * SQLite's online backup, so the copy is one consistent moment of the record,
 * attachments included. The copy is left in rollback-journal mode, a single
 * self-contained file.
 */
export async function backupDatabase(source: string, destination: string) {
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, destination);
  } finally {
    db.close();
  }
  const copy = new DatabaseSync(destination);
  try {
    copy.exec('PRAGMA journal_mode=DELETE');
  } finally {
    copy.close();
  }
}

const agree = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

/** A command key, as the audit trail and the signatures table write it. */
const keyOf = (commandId: string) =>
  commandId.replaceAll('-', '').toLowerCase();

/**
 * Checks a database file without changing it (ADR-0008): SQLite's integrity
 * check, every Electronic signature against its Signed content, every signing
 * audit entry against exactly one matching signature and every signature
 * against its audit entries, and every Certificate of Analysis and
 * attachment against its SHA-256. The cross-check finds a signature deleted,
 * or inserted, with the triggers dropped, which its hash alone cannot.
 */
export function verifyDatabase(file: string): Verification {
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const problems: string[] = [];
    const integrity = (
      db.prepare('PRAGMA integrity_check').all() as {
        integrity_check: string;
      }[]
    ).map((row) => row.integrity_check);
    if (integrity.join() !== 'ok')
      problems.push(`The integrity check found: ${integrity.join('; ')}.`);

    const signatures = storedSignatures(db);
    const invalid = signatures.filter((s) => !s.valid).length;
    if (invalid)
      problems.push(
        `${invalid} ${agree(invalid, 'Electronic signature does not match its', 'Electronic signatures do not match their')} Signed content.`,
      );

    const signings = new Map<string, { meaning?: string; signer?: string }>();
    for (const row of db
      .prepare(
        "SELECT commandId, field, newValue FROM audit WHERE recordType = 'Sample' AND field IN ('signature.meaning', 'signature.signer')",
      )
      .iterate() as Iterable<{
      commandId: string;
      field: string;
      newValue: string;
    }>) {
      const signing = signings.get(keyOf(row.commandId)) ?? {};
      signing[row.field === 'signature.meaning' ? 'meaning' : 'signer'] =
        JSON.parse(row.newValue);
      signings.set(keyOf(row.commandId), signing);
    }
    const unmatched = [...signings].filter(
      ([key, { meaning, signer }]) =>
        signatures.filter(
          (s) =>
            s.key === key && s.meaning === meaning && s.signerId === signer,
        ).length !== 1 || signatures.filter((s) => s.key === key).length !== 1,
    );
    const unaudited = signatures.filter((s) => !signings.has(s.key));
    if (unmatched.length)
      problems.push(
        `${unmatched.length} signing ${agree(unmatched.length, 'act in the audit trail has', 'acts in the audit trail have')} no single matching Electronic signature.`,
      );
    if (unaudited.length)
      problems.push(
        `${unaudited.length} ${agree(unaudited.length, 'Electronic signature has', 'Electronic signatures have')} no signing entries in the audit trail.`,
      );

    const certificates = hashMismatches(db, 'certificates');
    if (certificates.mismatched)
      problems.push(
        `${certificates.mismatched} ${agree(certificates.mismatched, 'Certificate of Analysis does not match its', 'Certificates of Analysis do not match their')} hash.`,
      );
    const attachments = hashMismatches(db, 'attachments');
    if (attachments.mismatched)
      problems.push(
        `${attachments.mismatched} ${agree(attachments.mismatched, 'attachment does not match its', 'attachments do not match their')} hash.`,
      );

    return {
      passed: problems.length === 0,
      sha256,
      signatures: { checked: signatures.length, invalid },
      certificates,
      attachments,
      checks: [
        `Integrity check: ${integrity.join('; ')}`,
        `Electronic signatures: ${signatures.length} checked, ${invalid} invalid`,
        `Signing audit entries: ${signings.size - unmatched.length} matched to their signatures, ${unmatched.length + unaudited.length} mismatched`,
        `Certificates of Analysis: ${certificates.checked} checked, ${certificates.mismatched} mismatched`,
        `Attachments: ${attachments.checked} checked, ${attachments.mismatched} mismatched`,
      ],
      problems,
    };
  } finally {
    db.close();
  }
}
