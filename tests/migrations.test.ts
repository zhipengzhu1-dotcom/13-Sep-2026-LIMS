import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { seed } from '../server/seed.ts';
import {
  migrate,
  rehearseMigration,
  type Migration,
} from '../server/migrations.ts';

/** A folder for database files, removed after the test. */
function folder(t: TestContext) {
  const path = mkdtempSync(join(tmpdir(), 'lims-migrations-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

/** Opens both stores on a file, as the server does. */
function open(file: string) {
  const accounts = new Accounts(file);
  accounts.seed(demoAccounts);
  const lab = new Laboratory(file, {
    credentials: accounts,
    people: () => accounts.people(),
  });
  return {
    lab,
    close() {
      lab.close();
      accounts.close();
    },
  };
}

/** A database at schema version 19, the version before migrations existed,
 * holding the demo's records: Results, OOS investigations, Electronic
 * signatures, attachments and Published and Amended Certificates. */
function seededDatabase(t: TestContext) {
  const file = join(folder(t), 'benchline.sqlite');
  assert.equal(migrate(file, []).outcome, 'created');
  const { lab, close } = open(file);
  seed(lab);
  close();
  return file;
}

/** Everything Benchline shows of its records. */
function records(file: string) {
  const { lab, close } = open(file);
  try {
    return lab.snapshot();
  } finally {
    close();
  }
}

/** Two later schema changes, each adding to the schema. */
const resultsRecordAnalysisDates: Migration = {
  version: 20,
  change: 'Results record the analysis date',
  apply: (db) => db.exec('ALTER TABLE samples ADD COLUMN analysedOn TEXT'),
};
const testsRecordTheirMethodDocument: Migration = {
  version: 21,
  change: 'Tests record their controlled Method document',
  apply: (db) =>
    db.exec(
      'CREATE TABLE methodDocuments (methodId TEXT PRIMARY KEY, document TEXT NOT NULL)',
    ),
};
const later = [resultsRecordAnalysisDates, testsRecordTheirMethodDocument];

test('a new database starts at the latest schema version and needs no migration', (t) => {
  const file = join(folder(t), 'benchline.sqlite');
  assert.deepEqual(migrate(file, later), {
    outcome: 'created',
    version: 21,
  });
  assert.deepEqual(migrate(file, later), {
    outcome: 'current',
    version: 21,
  });
});

test('a database at an older schema version gets its pending migrations in order, keeping every record', (t) => {
  const file = seededDatabase(t);
  const before = records(file);
  assert.ok(before.signatures.length && before.certificates.length);

  assert.deepEqual(migrate(file, later), {
    outcome: 'migrated',
    from: 19,
    to: 21,
    applied: [
      'Results record the analysis date',
      'Tests record their controlled Method document',
    ],
  });
  assert.deepEqual(records(file), before);
  assert.deepEqual(migrate(file, later), {
    outcome: 'current',
    version: 21,
  });
});

test('a migration that rebuilds a protected table or disarms its triggers is refused and nothing is changed', (t) => {
  const file = seededDatabase(t);
  const before = records(file);
  const rebuild: Migration = {
    version: 20,
    change: 'Electronic signatures record the signing reason',
    apply: (db) =>
      db.exec(`CREATE TABLE signaturesNext AS SELECT *, NULL AS reason FROM signatures;
        DROP TABLE signatures;
        ALTER TABLE signaturesNext RENAME TO signatures;`),
  };
  const disarm: Migration = {
    version: 20,
    change: 'Audit entries may be archived',
    apply: (db) =>
      db.exec(`DROP TRIGGER audit_no_delete;
        CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT 1; END;`),
  };

  assert.deepEqual(migrate(file, [rebuild]), {
    outcome: 'refused',
    version: 19,
    reason:
      'Migrating to version 20 would remove or alter the protection triggers signaturesNoDelete, signaturesNoUpdate. Nothing was changed.',
  });
  assert.deepEqual(migrate(file, [disarm]), {
    outcome: 'refused',
    version: 19,
    reason:
      'Migrating to version 20 would remove or alter the protection triggers audit_no_delete. Nothing was changed.',
  });
  assert.deepEqual(records(file), before);
});

test('a migration that alters protected records behind their triggers is refused and nothing is changed', (t) => {
  const file = seededDatabase(t);
  const before = records(file);
  const restyle: Migration = {
    version: 20,
    change: 'Printed names, Certificates and audit reasons use the house style',
    apply: (db) =>
      db.exec(`DROP TRIGGER signaturesNoUpdate;
        UPDATE signatures SET printedName = upper(printedName);
        CREATE TRIGGER signaturesNoUpdate BEFORE UPDATE ON signatures BEGIN SELECT RAISE(ABORT, 'Electronic signatures cannot be changed.'); END;
        DROP TRIGGER certificatesNoUpdate;
        UPDATE certificates SET content = replace(content, 'Complies', 'Pass');
        CREATE TRIGGER certificatesNoUpdate BEFORE UPDATE ON certificates BEGIN SELECT RAISE(ABORT, 'Certificates of Analysis are locked.'); END;
        DROP TRIGGER audit_no_update;
        UPDATE audit SET reason = upper(reason) WHERE reason IS NOT NULL;
        CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit
        BEGIN SELECT RAISE(ABORT, 'Audit entries cannot be changed.'); END;`),
  };

  assert.deepEqual(migrate(file, [restyle]), {
    outcome: 'refused',
    version: 19,
    reason:
      'Migrating to version 20 would change protected records in audit, certificates, signatures. Nothing was changed.',
  });
  assert.deepEqual(records(file), before);
});

test('a migration that loses records is refused and nothing is changed', (t) => {
  const file = seededDatabase(t);
  const before = records(file);
  const tidy: Migration = {
    version: 20,
    change: 'Withdrawn Samples are no longer kept',
    apply: (db) =>
      db.exec(`DELETE FROM samples WHERE id = (SELECT MIN(id) FROM samples);
        DROP TABLE commandReplays;`),
  };

  assert.deepEqual(migrate(file, [tidy]), {
    outcome: 'refused',
    version: 19,
    reason:
      'Migrating to version 20 would lose records: commandReplays (table removed), samples (1 row removed). Nothing was changed.',
  });
  assert.deepEqual(records(file), before);
});

test('a migration that ends the migration transaction itself is refused as possibly partly applied', (t) => {
  const file = seededDatabase(t);
  const committing: Migration = {
    version: 20,
    change: 'Results record the analysis date',
    apply: (db) =>
      db.exec('ALTER TABLE samples ADD COLUMN analysedOn TEXT; COMMIT;'),
  };

  assert.deepEqual(migrate(file, [committing]), {
    outcome: 'refused',
    version: 19,
    reason:
      'Migration to version 20 (Results record the analysis date) ended the migration transaction itself, so the database may be partly migrated. Restore it from its backup.',
  });
});

test('a database this build has no migrations for is refused untouched: one from a newer build, or from before versioned migrations', (t) => {
  const file = seededDatabase(t);
  assert.equal(migrate(file, later).outcome, 'migrated');
  const before = records(file);
  assert.deepEqual(migrate(file, [resultsRecordAnalysisDates]), {
    outcome: 'refused',
    version: 21,
    reason:
      'The database is at schema version 21, newer than this build of Benchline (version 20). Nothing was changed.',
  });
  assert.deepEqual(records(file), before);

  const legacy = join(folder(t), 'prototype.sqlite');
  const db = new DatabaseSync(legacy);
  db.exec(`CREATE TABLE samples (id TEXT PRIMARY KEY, status TEXT);
    INSERT INTO samples VALUES ('26-00001', 'Reviewed');
    PRAGMA user_version=18;`);
  db.close();
  for (const pending of [[], later])
    assert.deepEqual(migrate(legacy, pending), {
      outcome: 'refused',
      version: 18,
      reason:
        'The database is at schema version 18, from before versioned migrations (version 19), so no migration can bring it up to date. Nothing was changed.',
    });
});

test('a migration that fails is refused and leaves the database as it was, earlier migrations included', (t) => {
  const file = seededDatabase(t);
  const before = records(file);
  const failing: Migration = {
    version: 21,
    change: 'Tests record their controlled Method document',
    apply: () => {
      throw new Error('disk full');
    },
  };

  assert.deepEqual(migrate(file, [resultsRecordAnalysisDates, failing]), {
    outcome: 'refused',
    version: 19,
    reason:
      'Migration to version 21 (Tests record their controlled Method document) failed: disk full. Nothing was changed.',
  });
  assert.deepEqual(records(file), before);
  // Nothing of version 20 stayed behind, so it applies again.
  assert.deepEqual(migrate(file, later), {
    outcome: 'migrated',
    from: 19,
    to: 21,
    applied: [
      'Results record the analysis date',
      'Tests record their controlled Method document',
    ],
  });
});

/** A version 19 database whose audit trail lacks its by-record index, its
 * records, and the migration that adds the index: the schema a new database
 * has. Opening the stores on it would create the index, so its records are
 * read first. */
function databaseAwaitingAuditIndex(t: TestContext) {
  const file = seededDatabase(t);
  const before = records(file);
  const db = new DatabaseSync(file);
  db.exec('DROP INDEX audit_by_record');
  db.close();
  const migration: Migration = {
    version: 20,
    change: 'Audit entries are found by their record',
    apply: (db) =>
      db.exec(
        'CREATE INDEX audit_by_record ON audit (recordType, recordId, sequence)',
      ),
  };
  return { file, before, migration };
}

test('a rehearsal migrates a copy of the database and checks it, leaving the original untouched', (t) => {
  const { file: source, before, migration } = databaseAwaitingAuditIndex(t);
  const copy = join(folder(t), 'rehearsal.sqlite');

  const rehearsal = rehearseMigration(source, copy, [migration]);
  assert.deepEqual(rehearsal.problems, []);
  assert.equal(rehearsal.passed, true);
  assert.deepEqual(rehearsal.migration, {
    outcome: 'migrated',
    from: 19,
    to: 20,
    applied: ['Audit entries are found by their record'],
  });
  const rows = new Map(rehearsal.tables.map((x) => [x.table, x]));
  assert.deepEqual(rows.get('signatures'), {
    table: 'signatures',
    before: before.signatures.length,
    after: before.signatures.length,
  });
  assert.deepEqual(rows.get('audit'), {
    table: 'audit',
    before: before.audit.length,
    after: before.audit.length,
  });
  assert.deepEqual(rehearsal.signatures, {
    checked: before.signatures.length,
    invalid: 0,
  });
  assert.deepEqual(rehearsal.certificates, {
    checked: before.certificates.length,
    mismatched: 0,
  });
  assert.deepEqual(rehearsal.attachments, {
    checked: before.attachments.length,
    mismatched: 0,
  });

  // The original still waits for its migration, with its records as they were.
  assert.equal(migrate(source, [migration]).outcome, 'migrated');
  assert.deepEqual(records(source), before);
  assert.deepEqual(records(copy), before);
});

test('a rehearsal fails when the migration is refused, or leaves a schema unlike a new database', (t) => {
  const { file: source, migration } = databaseAwaitingAuditIndex(t);

  const refused = rehearseMigration(source, join(folder(t), 'a.sqlite'), [
    {
      ...migration,
      apply: () => {
        throw new Error('disk full');
      },
    },
  ]);
  assert.equal(refused.passed, false);
  assert.deepEqual(refused.problems, [
    'Migration to version 20 (Audit entries are found by their record) failed: disk full. Nothing was changed.',
    'The migrated schema differs from a new database. Only in a new database: index audit_by_record.',
  ]);

  const drifted = rehearseMigration(
    source,
    join(folder(t), 'b.sqlite'),
    [migration, resultsRecordAnalysisDates].map((m, i) => ({
      ...m,
      version: 20 + i,
    })),
  );
  assert.equal(drifted.passed, false);
  assert.deepEqual(drifted.problems, [
    'The migrated schema differs from a new database. Only after migrating: column samples.analysedOn TEXT.',
  ]);
});
