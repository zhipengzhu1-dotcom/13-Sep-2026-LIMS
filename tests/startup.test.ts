import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describeSettings,
  openInstance,
  readSettings,
  type Settings,
} from '../server/startup.ts';

function folder(t: test.TestContext) {
  const path = mkdtempSync(join(tmpdir(), 'lims-startup-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

/** Opens the instance as the server does, closing it when the test ends. */
function opened(t: test.TestContext, settings: Settings) {
  const instance = openInstance(settings);
  assert.equal(instance.outcome, 'opened');
  t.after(() => instance.close());
  return instance;
}

const lockoutNotice = {
  smtpUrl: 'smtps://benchline:mail-secret-42@mail.lab.example:465',
  from: 'benchline@lab.example',
  systemAdministrator: 'sysadmin@lab.example',
  qualityLead: 'quality@lab.example',
};

test('the effective settings are printed at start-up for the installation record, never the mail password', () => {
  const ready = readSettings(production);
  assert.equal(ready.outcome, 'ready');
  assert.equal(
    describeSettings(ready.settings),
    [
      'Mode: production',
      'Database: /srv/benchline/production.sqlite',
      'Port: 5173 (127.0.0.1 only)',
      'Lockout notices: to sysadmin@lab.example and quality@lab.example, from benchline@lab.example, through smtps://mail.lab.example:465',
    ].join('\n'),
  );
  const demo = readSettings({ BENCHLINE_MODE: 'demo' });
  assert.equal(demo.outcome, 'ready');
  assert.equal(
    describeSettings(demo.settings),
    [
      'Mode: demo',
      'Database: data/prototype.sqlite',
      'Port: 5173 (127.0.0.1 only)',
      'Lockout notices: printed on the server console, not emailed',
    ].join('\n'),
  );
});

test('production on an empty database creates no Submissions and no accounts, at the database path it was given', (t) => {
  const database = join(folder(t), 'production.sqlite');
  const { lab, accounts } = opened(t, {
    mode: 'production',
    database,
    port: 5173,
    lockoutNotice,
  });
  assert.ok(existsSync(database));
  assert.deepEqual(lab.snapshot().submissions, []);
  assert.deepEqual(accounts.people(), []);
  assert.deepEqual(lab.auditTrail(), []);
});

const fileHash = (file: string) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

test('production never discards: a database from before versioned migrations is refused and left as it was', (t) => {
  const database = join(folder(t), 'production.sqlite');
  const db = new DatabaseSync(database);
  db.exec(`CREATE TABLE samples (id TEXT PRIMARY KEY, status TEXT);
    INSERT INTO samples VALUES ('26-00001', 'Reviewed');
    PRAGMA user_version=18;`);
  db.close();
  const before = fileHash(database);

  assert.deepEqual(
    openInstance({ mode: 'production', database, port: 5173, lockoutNotice }),
    {
      outcome: 'refused',
      reason:
        'The database is at schema version 18, from before versioned migrations (version 19), so no migration can bring it up to date. Nothing was changed.',
    },
  );
  assert.equal(fileHash(database), before);
});

test('production refuses a database that holds the demo accounts, whose passwords are published, and leaves it as it was', (t) => {
  const database = join(folder(t), 'copied-demo.sqlite');
  const demo = openInstance({ mode: 'demo', database, port: 5173 });
  assert.equal(demo.outcome, 'opened');
  demo.close();
  const before = fileHash(database);

  assert.deepEqual(
    openInstance({ mode: 'production', database, port: 5173, lockoutNotice }),
    {
      outcome: 'refused',
      reason:
        'The database holds the demo accounts coordinator, analyst, analyst-2, manager, admin, whose passwords are published, so it is a demo database and cannot be used in production. Nothing was changed.',
    },
  );
  assert.equal(fileHash(database), before);
});

test('demo seeds its records and demo accounts at the database path it was given', (t) => {
  const database = join(folder(t), 'demo.sqlite');
  const { lab, accounts } = opened(t, { mode: 'demo', database, port: 5173 });
  assert.ok(existsSync(database));
  assert.ok(lab.snapshot().submissions.length > 0);
  assert.deepEqual(
    accounts.people().map((p) => p.id),
    ['coordinator', 'analyst', 'analyst-2', 'manager', 'admin'],
  );
});

test('production opens a database whose real accounts share a demo username, since their passwords are their own', (t) => {
  const database = join(folder(t), 'production.sqlite');
  const first = openInstance({
    mode: 'production',
    database,
    port: 5173,
    lockoutNotice,
  });
  assert.equal(first.outcome, 'opened');
  first.accounts.seed([
    {
      id: 'admin',
      name: 'Riley Morgan',
      role: 'admin',
      password: 'a-real-password-of-her-own',
    },
  ]);
  first.close();

  const { accounts } = opened(t, {
    mode: 'production',
    database,
    port: 5173,
    lockoutNotice,
  });
  assert.deepEqual(
    accounts.people().map((p) => p.id),
    ['admin'],
  );
});

test('production refuses a database newer than this build and leaves it as it was', (t) => {
  const database = join(folder(t), 'production.sqlite');
  const db = new DatabaseSync(database);
  db.exec(`CREATE TABLE samples (id TEXT PRIMARY KEY, status TEXT);
    PRAGMA user_version=99;`);
  db.close();
  const before = fileHash(database);

  const refused = openInstance({
    mode: 'production',
    database,
    port: 5173,
    lockoutNotice,
  });
  assert.equal(refused.outcome, 'refused');
  assert.match(
    refused.outcome === 'refused' ? refused.reason : '',
    /schema version 99, newer than this build/,
  );
  assert.equal(fileHash(database), before);
});

test('demo discards a database from before versioned migrations and starts on a fresh, seeded one', (t) => {
  const database = join(folder(t), 'demo.sqlite');
  const db = new DatabaseSync(database);
  db.exec(`CREATE TABLE samples (id TEXT PRIMARY KEY, status TEXT);
    INSERT INTO samples VALUES ('26-00001', 'Reviewed');
    PRAGMA user_version=18;`);
  db.close();

  const { lab, migration } = opened(t, { mode: 'demo', database, port: 5173 });
  assert.equal(migration.outcome, 'created');
  assert.ok(lab.snapshot().submissions.length > 0);
});

test('a lockout notice that production cannot email is recorded as not sent, without the mail password', async (t) => {
  const { lab, accounts } = opened(t, {
    mode: 'production',
    database: join(folder(t), 'production.sqlite'),
    port: 5173,
    // Nothing listens on port 1, so the mail server refuses the connection.
    lockoutNotice: {
      ...lockoutNotice,
      smtpUrl: 'smtp://benchline:mail-secret-42@127.0.0.1:1',
    },
  });
  accounts.seed([
    {
      id: 'robin',
      name: 'Robin Hale',
      role: 'analyst',
      password: 'robin-own-password',
    },
  ]);
  for (let i = 0; i < 5; i++) await accounts.signIn('robin', 'wrong', lab);
  await accounts.noticesSettled();

  const trail = JSON.stringify(lab.auditTrail());
  assert.match(
    trail,
    /Email to sysadmin@lab.example, quality@lab.example failed/,
  );
  assert.ok(!trail.includes('mail-secret-42'));
});

test('start-up without a mode is refused, naming the setting, so a misconfigured server never falls back to demo', () => {
  for (const env of [{}, { NODE_ENV: 'production' }, { BENCHLINE_MODE: '' }])
    assert.deepEqual(readSettings(env), {
      outcome: 'refused',
      reasons: ['Set BENCHLINE_MODE to demo or production.'],
    });
  assert.deepEqual(readSettings({ BENCHLINE_MODE: 'validation' }), {
    outcome: 'refused',
    reasons: ['BENCHLINE_MODE is "validation"; set it to demo or production.'],
  });
});

const production = {
  BENCHLINE_MODE: 'production',
  BENCHLINE_DATABASE: '/srv/benchline/production.sqlite',
  BENCHLINE_SMTP_URL: 'smtps://benchline:mail-secret-42@mail.lab.example:465',
  BENCHLINE_MAIL_FROM: 'benchline@lab.example',
  BENCHLINE_SYSTEM_ADMINISTRATOR_EMAIL: 'sysadmin@lab.example',
  BENCHLINE_QUALITY_LEAD_EMAIL: 'quality@lab.example',
};

test('production starts only with its own database path and the outbound mail for lockout notices, each missing setting named', () => {
  assert.deepEqual(readSettings({ BENCHLINE_MODE: 'production' }), {
    outcome: 'refused',
    reasons: [
      'Set BENCHLINE_DATABASE to this instance’s database file.',
      'Set BENCHLINE_SMTP_URL to the outbound mail server, e.g. smtps://user:password@mail.example:465.',
      'Set BENCHLINE_MAIL_FROM to the address lockout notices are sent from.',
      'Set BENCHLINE_SYSTEM_ADMINISTRATOR_EMAIL to the System administrator’s address for lockout notices.',
      'Set BENCHLINE_QUALITY_LEAD_EMAIL to the Quality lead’s address for lockout notices.',
    ],
  });
  const garbled = readSettings({
    ...production,
    BENCHLINE_SMTP_URL: 'benchline:mail-secret-42@mail.lab.example',
    BENCHLINE_QUALITY_LEAD_EMAIL: 'quality',
  });
  assert.deepEqual(garbled, {
    outcome: 'refused',
    reasons: [
      'BENCHLINE_SMTP_URL must be an smtp:// or smtps:// URL.',
      'BENCHLINE_QUALITY_LEAD_EMAIL must be an email address.',
    ],
  });
  assert.ok(!JSON.stringify(garbled).includes('mail-secret-42'));

  assert.deepEqual(readSettings(production), {
    outcome: 'ready',
    settings: {
      mode: 'production',
      database: '/srv/benchline/production.sqlite',
      port: 5173,
      lockoutNotice: {
        smtpUrl: 'smtps://benchline:mail-secret-42@mail.lab.example:465',
        from: 'benchline@lab.example',
        systemAdministrator: 'sysadmin@lab.example',
        qualityLead: 'quality@lab.example',
      },
    },
  });
  assert.deepEqual(readSettings({ BENCHLINE_MODE: 'demo', PORT: '5174' }), {
    outcome: 'ready',
    settings: { mode: 'demo', database: 'data/prototype.sqlite', port: 5174 },
  });
  assert.deepEqual(readSettings({ ...production, PORT: 'eighty' }), {
    outcome: 'refused',
    reasons: ['PORT must be a port number.'],
  });
});
