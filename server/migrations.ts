import { rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Accounts } from '../src/accounts/accounts.ts';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { sha256 } from '../src/laboratory/attachments.ts';
import { verifyDatabase } from './backup.ts';

/**
 * One change to the schema of the Benchline database file, applied once, in
 * version order. A migration only adds: it never drops, rebuilds or updates a
 * protected table, so every record, audit entry, Electronic signature,
 * attachment and Certificate of Analysis survives it unchanged. The stores
 * still create a new database's tables, so a migration's change is made in
 * the store's CREATE statement too; a rehearsal checks the two agree.
 */
export type Migration = {
  /** The schema version the database is at once this migration is applied. */
  version: number;
  /** What the change is, in the lab's words. */
  change: string;
  /** Runs inside the migration transaction; it must not end it. */
  apply(db: DatabaseSync): void;
};

/** The schema version of the last build before migrations, which every
 * database file is at or after. */
export const BASELINE_VERSION = 19;

/** Benchline's migrations, oldest first. */
export const migrations: readonly Migration[] = [
  {
    version: 20,
    change: 'Applied commands and command replays cannot be changed or deleted',
    // Kept as applied, not read from the Laboratory, so a later change to its
    // triggers cannot rewrite what this migration did.
    apply: (db) =>
      db.exec(`
  CREATE TRIGGER IF NOT EXISTS commandsNoUpdate BEFORE UPDATE ON commands
    WHEN NOT (OLD.subject IS NULL AND NEW.subject IS NOT NULL
      AND NEW.commandId IS OLD.commandId AND NEW.actorId IS OLD.actorId
      AND NEW.commandType IS OLD.commandType AND NEW.fingerprint IS OLD.fingerprint
      AND NEW.receivedAt IS OLD.receivedAt)
    BEGIN SELECT RAISE(ABORT, 'Applied commands cannot be changed.'); END;
  CREATE TRIGGER IF NOT EXISTS commandsNoDelete BEFORE DELETE ON commands BEGIN SELECT RAISE(ABORT, 'Applied commands cannot be deleted.'); END;
  CREATE TRIGGER IF NOT EXISTS commandsNoReplace BEFORE INSERT ON commands
    WHEN EXISTS (SELECT 1 FROM commands WHERE commandId = NEW.commandId)
    BEGIN SELECT RAISE(IGNORE); END;
  CREATE TRIGGER IF NOT EXISTS commandReplaysNoUpdate BEFORE UPDATE ON commandReplays BEGIN SELECT RAISE(ABORT, 'Command replays cannot be changed.'); END;
  CREATE TRIGGER IF NOT EXISTS commandReplaysNoDelete BEFORE DELETE ON commandReplays BEGIN SELECT RAISE(ABORT, 'Command replays cannot be deleted.'); END;
  CREATE TRIGGER IF NOT EXISTS commandReplaysNoReplace BEFORE INSERT ON commandReplays
    WHEN EXISTS (SELECT 1 FROM commandReplays WHERE id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'Command replays cannot be changed.'); END;`),
  },
  {
    version: 21,
    change:
      'Signatures, audit entries, attachments, Certificates, publications and Acceptable intake entries cannot be replaced',
    // A replacing insert deletes the row it replaces without firing delete
    // triggers. Kept as applied, like version 20.
    apply: (db) =>
      db.exec(`
  CREATE TRIGGER IF NOT EXISTS signaturesNoReplace BEFORE INSERT ON signatures
    WHEN EXISTS (SELECT 1 FROM signatures WHERE id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'Electronic signatures cannot be changed.'); END;
  CREATE TRIGGER IF NOT EXISTS audit_no_replace BEFORE INSERT ON audit
    WHEN EXISTS (SELECT 1 FROM audit WHERE sequence = NEW.sequence)
    BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be changed.'); END;
  CREATE TRIGGER IF NOT EXISTS attachments_no_replace BEFORE INSERT ON attachments
    WHEN EXISTS (SELECT 1 FROM attachments WHERE id = NEW.id OR rowid = NEW.rowid)
    BEGIN SELECT RAISE(ABORT, 'Attachments cannot be changed.'); END;
  CREATE TRIGGER IF NOT EXISTS certificatesNoReplace BEFORE INSERT ON certificates
    WHEN EXISTS (SELECT 1 FROM certificates WHERE sampleId = NEW.sampleId AND version = NEW.version)
    BEGIN SELECT RAISE(ABORT, 'Certificates of Analysis are locked.'); END;
  CREATE TRIGGER IF NOT EXISTS publicationsNoReplace BEFORE INSERT ON publications
    WHEN EXISTS (SELECT 1 FROM publications WHERE sampleId = NEW.sampleId AND version = NEW.version)
    BEGIN SELECT RAISE(ABORT, 'Publications are append-only.'); END;
  CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoReplace BEFORE INSERT ON acceptableIntakes
    WHEN EXISTS (SELECT 1 FROM acceptableIntakes WHERE id = NEW.id)
    BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;`),
  },
  {
    version: 22,
    change:
      'Acceptable intake entries record their Potency category and Limit type',
    // Entries appended before keep null for both, shown as not recorded.
    apply: (db) =>
      db.exec(`
  ALTER TABLE acceptableIntakes ADD COLUMN potencyCategory TEXT;
  ALTER TABLE acceptableIntakes ADD COLUMN limitType TEXT;`),
  },
  {
    version: 23,
    change: 'Accounts record whether their password is a One-time password',
    // Existing passwords are the users' own. Added only when absent, as the
    // triggers of versions 20 and 21 are, since the accounts store creates it
    // in a new database.
    apply: (db) => {
      if (!columnNames(db, 'users').includes('oneTimePassword'))
        db.exec(
          'ALTER TABLE users ADD COLUMN oneTimePassword INTEGER NOT NULL DEFAULT 0',
        );
    },
  },
  {
    version: 24,
    change: 'Accounts record when their password was set',
    // A password set before has no time on record, so it counts as expired
    // and its user sets a new one at the next sign-in. Added only when
    // absent, as version 23 is.
    apply: (db) => {
      if (!columnNames(db, 'users').includes('passwordSetAt'))
        db.exec('ALTER TABLE users ADD COLUMN passwordSetAt TEXT');
    },
  },
];

function latestVersion(pending: readonly Migration[]) {
  return pending.at(-1)?.version ?? BASELINE_VERSION;
}

export type MigrationOutcome =
  | { outcome: 'created'; version: number }
  | { outcome: 'current'; version: number }
  | { outcome: 'migrated'; from: number; to: number; applied: string[] }
  /** The server must not start on this file. */
  | { outcome: 'refused'; version: number; reason: string };

const refused = (version: number, reason: string): MigrationOutcome => ({
  outcome: 'refused',
  version,
  reason: `${reason} Nothing was changed.`,
});

/**
 * Brings a database file to the latest schema version before any store opens
 * it. It owns `PRAGMA user_version`: a new file is stamped with the latest
 * version, and an older one gets each pending migration in order, in one
 * transaction that is rolled back unless the protection triggers, every
 * protected row and every other table's rows all survive.
 */
export function migrate(
  file: string,
  pending: readonly Migration[] = migrations,
): MigrationOutcome {
  const db = new DatabaseSync(file);
  try {
    const latest = latestVersion(pending);
    const version = userVersion(db);
    if (version === 0 && tableNames(db).length === 0) {
      db.exec(`PRAGMA user_version=${latest}`);
      return { outcome: 'created', version: latest };
    }
    if (version === latest) return { outcome: 'current', version };
    if (version > latest)
      return refused(
        version,
        `The database is at schema version ${version}, newer than this build of Benchline (version ${latest}).`,
      );
    if (version < BASELINE_VERSION)
      return refused(
        version,
        `The database is at schema version ${version}, from before versioned migrations (version ${BASELINE_VERSION}), so no migration can bring it up to date.`,
      );
    const due = pending.filter((m) => m.version > version);
    db.exec('BEGIN IMMEDIATE');
    const before = protection(db);
    for (const migration of due) {
      const named = `Migration to version ${migration.version} (${migration.change})`;
      try {
        migration.apply(db);
      } catch (error) {
        // SQLite may already have rolled back, after a full disk for one.
        if (db.isTransaction) db.exec('ROLLBACK');
        return refused(
          version,
          `${named} failed: ${error instanceof Error ? error.message : String(error)}.`,
        );
      }
      if (!db.isTransaction)
        return {
          outcome: 'refused',
          version,
          reason: `${named} ended the migration transaction itself, so the database may be partly migrated. Restore it from its backup.`,
        };
    }
    const loss = losses(db, before, latest);
    if (loss) {
      db.exec('ROLLBACK');
      return refused(version, loss);
    }
    db.exec(`PRAGMA user_version=${latest}`);
    db.exec('COMMIT');
    return {
      outcome: 'migrated',
      from: version,
      to: latest,
      applied: due.map((m) => m.change),
    };
  } finally {
    db.close();
  }
}

/** What a migration must leave as it found: the triggers that refuse
 * updates and deletes, the rows of the tables they protect, and how many rows
 * every table has. */
type Protection = {
  triggers: Map<string, string>;
  counts: [string, number][];
  protectedTables: { table: string; columns: string[]; digest: string }[];
};

function protection(db: DatabaseSync): Protection {
  const triggers = triggerDefinitions(db);
  const protectedTables = [
    ...new Set([...triggers.values()].map((t) => t.table)),
  ]
    .sort()
    .map((table) => {
      const columns = columnNames(db, table);
      return { table, columns, digest: digest(db, table, columns) };
    });
  return {
    triggers: new Map([...triggers].map(([name, t]) => [name, t.sql])),
    counts: rowCounts(db),
    protectedTables,
  };
}

/** Why the migrated database fails its protection, or null if it keeps it. */
function losses(db: DatabaseSync, before: Protection, latest: number) {
  const now = triggerDefinitions(db);
  const disarmed = [...before.triggers]
    .filter(([name, sql]) => now.get(name)?.sql !== sql)
    .map(([name]) => name);
  if (disarmed.length)
    return `Migrating to version ${latest} would remove or alter the protection triggers ${disarmed.join(', ')}.`;
  const counts = new Map(rowCounts(db));
  const lost = before.counts.flatMap(([table, rows]) => {
    const left = counts.get(table);
    if (left === undefined) return [`${table} (table removed)`];
    const removed = rows - left;
    return removed > 0
      ? [`${table} (${removed} ${agree(removed, 'row', 'rows')} removed)`]
      : [];
  });
  if (lost.length)
    return `Migrating to version ${latest} would lose records: ${lost.join(', ')}.`;
  const changed = before.protectedTables
    .filter(
      ({ table, columns, digest: rows }) =>
        columns.some((c) => !columnNames(db, table).includes(c)) ||
        digest(db, table, columns) !== rows,
    )
    .map((p) => p.table);
  if (changed.length)
    return `Migrating to version ${latest} would change protected records in ${changed.join(', ')}.`;
  return null;
}

export type Rehearsal = {
  /** True when the migration applied and every check found nothing wrong. */
  passed: boolean;
  migration: MigrationOutcome;
  /** Every table's rows before and after; null after for a removed table. */
  tables: { table: string; before: number; after: number | null }[];
  /** Electronic signatures checked against their Signed content afterwards. */
  signatures: { checked: number; invalid: number };
  /** Certificates of Analysis checked against their SHA-256 afterwards. */
  certificates: { checked: number; mismatched: number };
  /** Attachments checked against their SHA-256 afterwards. */
  attachments: { checked: number; mismatched: number };
  problems: string[];
};

/**
 * Runs the pending migrations on a copy of a database file and checks the
 * copy, as change control requires before a release. The migration itself
 * refuses to lose records or change protected ones; the rehearsal adds that
 * every Electronic signature, Certificate of Analysis and attachment still
 * matches its hash as this build reads it, and that the migrated schema is
 * the one a new database gets. The original is only read.
 */
export function rehearseMigration(
  source: string,
  copy: string,
  pending: readonly Migration[] = migrations,
): Rehearsal {
  const original = new DatabaseSync(source, { readOnly: true });
  try {
    // A consistent copy, write-ahead log included.
    original.prepare('VACUUM INTO ?').run(copy);
  } finally {
    original.close();
  }
  const counts = reading(copy, rowCounts);
  const migration = migrate(copy, pending);
  const problems = migration.outcome === 'refused' ? [migration.reason] : [];
  const drift = schemaDrift(
    reading(copy, schemaOf),
    newDatabaseSchema(`${copy}.new`, pending),
  );
  if (drift) problems.push(drift);

  const now = new Map(reading(copy, rowCounts));
  // The same checks a backup gets.
  const verification = verifyDatabase(copy);
  problems.push(...verification.problems);
  return {
    passed: problems.length === 0,
    migration,
    tables: counts.map(([table, before]) => ({
      table,
      before,
      after: now.get(table) ?? null,
    })),
    signatures: verification.signatures,
    certificates: verification.certificates,
    attachments: verification.attachments,
    problems,
  };
}

/** The schema of a new database, created as the server creates one. */
function newDatabaseSchema(file: string, pending: readonly Migration[]) {
  try {
    migrate(file, pending);
    const accounts = new Accounts(file);
    new Laboratory(file).close();
    accounts.close();
    return reading(file, schemaOf);
  } finally {
    for (const suffix of ['', '-wal', '-shm'])
      rmSync(file + suffix, { force: true });
  }
}

/** Every column, index and trigger, each described in one line. */
function schemaOf(db: DatabaseSync) {
  const described = tableNames(db).flatMap((table) =>
    (
      db.prepare(`PRAGMA table_info(${quoted(table)})`).all() as {
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }[]
    ).map(
      (c) =>
        `column ${table}.${c.name} ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' PRIMARY KEY' : ''}`,
    ),
  );
  for (const type of ['index', 'trigger'] as const)
    described.push(...schemaNames(db, type).map((name) => `${type} ${name}`));
  return described;
}

function schemaDrift(migrated: string[], created: string[]) {
  const onlyMigrated = migrated.filter((x) => !created.includes(x)).sort();
  const onlyCreated = created.filter((x) => !migrated.includes(x)).sort();
  if (!onlyMigrated.length && !onlyCreated.length) return null;
  return [
    'The migrated schema differs from a new database.',
    ...(onlyMigrated.length
      ? [`Only after migrating: ${onlyMigrated.join(', ')}.`]
      : []),
    ...(onlyCreated.length
      ? [`Only in a new database: ${onlyCreated.join(', ')}.`]
      : []),
  ].join(' ');
}

/** Reads a database file through its own connection, closed afterwards. */
function reading<T>(file: string, read: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(file);
  try {
    return read(db);
  } finally {
    db.close();
  }
}

export function userVersion(db: DatabaseSync) {
  return (db.prepare('PRAGMA user_version').get() as { user_version: number })
    .user_version;
}

const quoted = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

const agree = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

function schemaNames(db: DatabaseSync, type: 'table' | 'index' | 'trigger') {
  return (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type=? AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all(type) as { name: string }[]
  ).map((t) => t.name);
}

const tableNames = (db: DatabaseSync) => schemaNames(db, 'table');

/** Each trigger's table and its definition, whitespace normalised, by name. */
function triggerDefinitions(db: DatabaseSync) {
  return new Map(
    (
      db
        .prepare(
          'SELECT name, tbl_name AS "table", sql FROM sqlite_master WHERE type=\'trigger\' ORDER BY name',
        )
        .all() as { name: string; table: string; sql: string }[]
    ).map((t) => [
      t.name,
      { table: t.table, sql: t.sql.replace(/\s+/g, ' ').trim() },
    ]),
  );
}

function columnNames(db: DatabaseSync, table: string) {
  return (
    db.prepare(`PRAGMA table_info(${quoted(table)})`).all() as {
      name: string;
    }[]
  ).map((c) => c.name);
}

/** Each table's row count, by table name. */
function rowCounts(db: DatabaseSync): [string, number][] {
  return tableNames(db).map((table) => [
    table,
    Number(
      (
        db.prepare(`SELECT COUNT(*) AS rows FROM ${quoted(table)}`).get() as {
          rows: number;
        }
      ).rows,
    ),
  ]);
}

/** A SHA-256 of a table's rows over the given columns, in a stable order. */
function digest(db: DatabaseSync, table: string, columns: string[]) {
  const rows = db
    .prepare(
      `SELECT ${columns.map(quoted).join(', ')} FROM ${quoted(table)} ORDER BY ${columns.map((_, i) => i + 1).join(', ')}`,
    )
    .iterate();
  const lines: string[] = [];
  for (const row of rows)
    lines.push(
      JSON.stringify(Object.values(row), (_key, v) =>
        v instanceof Uint8Array ? Buffer.from(v).toString('hex') : v,
      ),
    );
  return sha256(Buffer.from(lines.join('\n')));
}
