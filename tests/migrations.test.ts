import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { newCommandId } from '../src/laboratory/contracts.ts';
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
      'Migrating to version 20 would remove or alter the protection triggers signaturesNoDelete, signaturesNoReplace, signaturesNoUpdate. Nothing was changed.',
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
        DROP TABLE sequences;`),
  };

  assert.deepEqual(migrate(file, [tidy]), {
    outcome: 'refused',
    version: 19,
    reason:
      'Migrating to version 20 would lose records: samples (1 row removed), sequences (table removed). Nothing was changed.',
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

/** Removes the Potency category and Limit type from every Acceptable intake
 * entry, as databases before migration version 22 hold them. */
function withoutPotencyColumns(db: DatabaseSync) {
  db.exec(`ALTER TABLE acceptableIntakes DROP COLUMN potencyCategory;
    ALTER TABLE acceptableIntakes DROP COLUMN limitType;`);
}

/** Records as Benchline shows them once a database from before migration
 * version 22 is migrated: no entry has a Potency category or Limit type. */
function uncategorised(records: ReturnType<Laboratory['snapshot']>) {
  return {
    ...records,
    acceptableIntakes: records.acceptableIntakes.map((e) => ({
      ...e,
      potencyCategory: null,
      limitType: null,
    })),
  };
}

/** The triggers that refuse replacing inserts on the tables protected before
 * migrations existed, which migration version 21 adds. */
const replaceProtection = [
  'signaturesNoReplace',
  'audit_no_replace',
  'attachments_no_replace',
  'certificatesNoReplace',
  'publicationsNoReplace',
  'acceptableIntakesNoReplace',
];

/** A version 19 database as the last build before migrations left it: its
 * applied commands and command replays have no protection triggers, and no
 * protected table refuses a replacing insert. It holds the demo's records and
 * one replayed command. */
function databaseBeforeCommandProtection(t: TestContext) {
  const file = seededDatabase(t);
  const { lab, close } = open(file);
  const retried = {
    commandId: newCommandId(),
    type: 'receiveSubmission',
    clientId: 'northstar',
    clientContact: 'Dana Wells, QA Northstar',
    shippingCondition: 'ambient',
    packageCondition: 'intact',
    samples: [
      {
        product: 'Demo tablets 10 mg',
        batch: 'B-001',
        materialType: 'finished product',
        quantity: { value: 60, unit: 'units' },
        containers: { count: 2, type: 'bottle' },
        conditionOnReceipt: 'Intact',
        maximumDailyDose: 40,
        methodIds: ['NIT-001-v1'],
        dueDate: '2026-10-01',
        priority: 'Routine',
      },
    ],
  };
  lab.execute(retried, 'coordinator');
  assert.equal(lab.execute(retried, 'coordinator').outcome, 'replayed');
  close();
  const before = uncategorised(records(file));
  const db = new DatabaseSync(file);
  for (const { name } of db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name IN ('commands', 'commandReplays')",
    )
    .all() as { name: string }[])
    db.exec(`DROP TRIGGER ${name}`);
  for (const name of replaceProtection)
    db.exec(`DROP TRIGGER IF EXISTS ${name}`);
  withoutPotencyColumns(db);
  db.close();
  return { file, before };
}

/** A version 20 database as that build left it: its protected tables refuse
 * updates and deletes, but only applied commands and command replays refuse a
 * replacing insert. It holds the demo's records. */
function databaseBeforeReplaceProtection(t: TestContext) {
  const file = seededDatabase(t);
  const before = uncategorised(records(file));
  const db = new DatabaseSync(file);
  for (const name of replaceProtection) db.exec(`DROP TRIGGER ${name}`);
  withoutPotencyColumns(db);
  db.exec('PRAGMA user_version=20');
  db.close();
  return { file, before };
}

/** A version 21 database as that build left it: its Acceptable intake
 * entries record no Potency category or Limit type. It holds the demo's
 * records. */
function databaseBeforePotencyCategories(t: TestContext) {
  const file = seededDatabase(t);
  const before = uncategorised(records(file));
  const db = new DatabaseSync(file);
  withoutPotencyColumns(db);
  db.exec('PRAGMA user_version=21');
  db.close();
  return { file, before };
}

/** Every row of the tables protected before migrations existed. */
function protectedRecords(file: string) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return Object.fromEntries(
      [
        'signatures',
        'audit',
        'attachments',
        'certificates',
        'publications',
        'acceptableIntakes',
      ].map((table) => [
        table,
        // Only attachments have a rowid that is not one of their columns.
        db
          .prepare(
            `SELECT ${table === 'attachments' ? 'rowid, ' : ''}* FROM ${table} ORDER BY 1, 2`,
          )
          .all(),
      ]),
    );
  } finally {
    db.close();
  }
}

/** Applied commands and command replays, row for row. */
function commandRecords(file: string) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return {
      commands: db.prepare('SELECT * FROM commands ORDER BY commandId').all(),
      commandReplays: db
        .prepare('SELECT * FROM commandReplays ORDER BY id')
        .all(),
    };
  } finally {
    db.close();
  }
}

test('migrating to version 20 keeps every applied command and command replay, and the database then refuses changing or deleting them', (t) => {
  const { file, before } = databaseBeforeCommandProtection(t);
  const commands = commandRecords(file);
  assert.ok(commands.commands.length && commands.commandReplays.length);

  const migration = migrate(file);
  assert.equal(migration.outcome, 'migrated');
  if (migration.outcome === 'migrated') {
    assert.equal(migration.from, 19);
    assert.equal(migration.to, 22);
  }
  assert.deepEqual(records(file), before);
  assert.deepEqual(commandRecords(file), commands);

  const db = new DatabaseSync(file);
  t.after(() => db.close());
  for (const [sql, refusal] of [
    ...[
      "actorId='manager'",
      "fingerprint=X'00'",
      "receivedAt='2020-01-01'",
      "commandType='assign'",
      "commandId=X'00'",
      "subject='{}'",
    ].map(
      (change) =>
        [
          `UPDATE commands SET ${change}`,
          /Applied commands cannot be changed/,
        ] as const,
    ),
    ['DELETE FROM commands', /Applied commands cannot be deleted/],
    [
      "UPDATE commandReplays SET actorId='manager'",
      /Command replays cannot be changed/,
    ],
    ['DELETE FROM commandReplays', /Command replays cannot be deleted/],
  ] as const)
    assert.throws(() => db.exec(sql), refusal, sql);
  assert.deepEqual(commandRecords(file), commands);
});

test('migrating to version 21 keeps every protected record, and the database then refuses replacing signatures, audit entries, attachments, Certificates, publications and Acceptable intake entries', (t) => {
  const { file, before } = databaseBeforeReplaceProtection(t);
  const rows = protectedRecords(file);
  assert.ok(before.signatures.every((s) => s.valid));

  assert.deepEqual(migrate(file), {
    outcome: 'migrated',
    from: 20,
    to: 22,
    applied: [
      'Signatures, audit entries, attachments, Certificates, publications and Acceptable intake entries cannot be replaced',
      'Acceptable intake entries record their Potency category and Limit type',
    ],
  });
  assert.deepEqual(records(file), before);
  assert.deepEqual(protectedRecords(file), uncategorisedRows(rows));

  const db = new DatabaseSync(file);
  t.after(() => db.close());
  for (const [sql, refusal] of [
    [
      `INSERT OR REPLACE INTO signatures
        SELECT id, sampleId, signerId, 'Someone Else', signedAt, meaning, command, commandId, signedContent, sha256 FROM signatures`,
      /Electronic signatures cannot be changed/,
    ],
    [
      `INSERT OR REPLACE INTO audit
        SELECT sequence, recordType, recordId, sampleId, field, oldValue, newValue, reason, 'manager', at, commandType, commandId FROM audit`,
      /Audit entries cannot be changed/,
    ],
    [
      `INSERT OR REPLACE INTO attachments (rowid, id, filename, contentType, size, sha256, uploadedBy, uploadedAt, content)
        SELECT rowid, id, filename, contentType, size, '00', uploadedBy, uploadedAt, X'00' FROM attachments`,
      /Attachments cannot be changed/,
    ],
    [
      `INSERT OR REPLACE INTO attachments (rowid, id, filename, contentType, size, sha256, uploadedBy, uploadedAt, content)
        SELECT rowid, id || '-other', filename, contentType, size, '00', uploadedBy, uploadedAt, X'00' FROM attachments`,
      /Attachments cannot be changed/,
    ],
    [
      `INSERT OR REPLACE INTO certificates
        SELECT sampleId, version, 'TAMPERED', sha256, content, commandId FROM certificates`,
      /Certificates of Analysis are locked/,
    ],
    [
      `INSERT OR REPLACE INTO publications
        SELECT sampleId, version, recipients, channel, channelDetail, publishedAt, 'manager', recordedAt, commandId FROM publications`,
      /Publications are append-only/,
    ],
    [
      `INSERT OR REPLACE INTO acceptableIntakes
        SELECT id, 'TAMPERED', value, sourceTitle, sourceUrl, sourceRevisionDate, effectiveFrom, illustrative, potencyCategory, limitType FROM acceptableIntakes`,
      /Acceptable intake entries are append-only/,
    ],
  ] as const)
    assert.throws(() => db.exec(sql), refusal, sql);
  assert.deepEqual(protectedRecords(file), uncategorisedRows(rows));
});

/** Protected rows as a migration to version 22 leaves them: each Acceptable
 * intake entry gains an empty Potency category and Limit type. */
function uncategorisedRows(rows: ReturnType<typeof protectedRecords>) {
  return {
    ...rows,
    // Rows read from SQLite have no prototype; so do these.
    acceptableIntakes: rows.acceptableIntakes.map((row) =>
      Object.assign(Object.create(null), row, {
        potencyCategory: null,
        limitType: null,
      }),
    ),
  };
}

test('migrating to version 22 keeps every Acceptable intake entry, marked with no potency category or limit type and still in force, and later entries record both', (t) => {
  const { file, before } = databaseBeforePotencyCategories(t);
  const rows = protectedRecords(file);
  assert.ok(before.acceptableIntakes.length);

  assert.deepEqual(migrate(file), {
    outcome: 'migrated',
    from: 21,
    to: 22,
    applied: [
      'Acceptable intake entries record their Potency category and Limit type',
    ],
  });
  assert.deepEqual(records(file), before);
  assert.deepEqual(protectedRecords(file), uncategorisedRows(rows));

  const { lab, close } = open(file);
  t.after(close);
  // A Result judged against an entry from before still gets its Limit.
  const attachmentId = lab.storeAttachment(
    {
      filename: 'worksheet.csv',
      contentType: 'text/csv',
      content: Buffer.from('reading,result\n1.25,2.5\n'),
    },
    'analyst',
  ).id;
  const received = lab.execute(
    {
      commandId: newCommandId(),
      type: 'receiveSubmission',
      clientId: 'northstar',
      clientContact: 'Dana Wells, QA Northstar',
      shippingCondition: 'ambient',
      packageCondition: 'intact',
      samples: [
        {
          product: 'Demo tablets 10 mg',
          batch: 'B-002',
          materialType: 'finished product',
          quantity: { value: 60, unit: 'units' },
          containers: { count: 2, type: 'bottle' },
          conditionOnReceipt: 'Intact',
          maximumDailyDose: 40,
          methodIds: ['NIT-001-v1'],
          dueDate: '2026-10-01',
          priority: 'Routine',
        },
      ],
    },
    'coordinator',
  ).samples[0];
  const assigned = lab.execute(
    {
      commandId: newCommandId(),
      type: 'assign',
      sampleId: received.id,
      revision: received.revision,
      assignee: 'analyst',
    },
    'coordinator',
  ).samples[0];
  const judged = lab.execute(
    {
      commandId: newCommandId(),
      type: 'enterResult',
      sampleId: assigned.id,
      revision: assigned.revision,
      testId: 'NIT-001-v1',
      value: 2,
      instrumentReading: 1.25,
      sequenceId: 'SEQ-0001',
      analysedOn: new Date().toISOString().slice(0, 10),
      attachmentId,
      reason: '',
    },
    'analyst',
  ).samples[0];
  const limit = judged.tests[0].results[0].limit;
  assert.deepEqual(
    [limit?.id, limit?.value, limit?.potencyCategory, limit?.limitType],
    [1, 26.5, null, null],
  );

  lab.execute(
    {
      commandId: newCommandId(),
      type: 'appendAcceptableIntake',
      analyteId: 'impurity-a',
      value: 100,
      potencyCategory: 2,
      limitType: 'CPCA-predicted',
      sourceTitle: 'CDER Nitrosamine Impurity Acceptable Intake Limits',
      sourceUrl: 'https://www.fda.gov/',
      sourceRevisionDate: '2026-09-01',
      effectiveFrom: '2026-10-01',
      illustrative: false,
    },
    'manager',
  );
  const added = lab.snapshot().acceptableIntakes.at(-1);
  assert.deepEqual(
    [added?.potencyCategory, added?.limitType],
    [2, 'CPCA-predicted'],
  );
});

test('a rehearsal of the Benchline migrations on a version 19 database passes', (t) => {
  const { file: source } = databaseBeforeCommandProtection(t);
  const rehearsal = rehearseMigration(
    source,
    join(folder(t), 'rehearsal.sqlite'),
  );
  assert.deepEqual(rehearsal.problems, []);
  assert.equal(rehearsal.passed, true);
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
