import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { openInstance } from '../server/startup.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { seed } from '../server/seed.ts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import type { AuditEntry } from '../src/laboratory/contracts.ts';
import { administerFromServer } from '../server/system-administrator.ts';
import { migrate } from '../server/migrations.ts';

function folder(t: TestContext) {
  const path = mkdtempSync(join(tmpdir(), 'lims-sysadmin-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

/** A production instance's environment, on its own database file. */
const production = (database: string) => ({
  BENCHLINE_MODE: 'production',
  BENCHLINE_DATABASE: database,
  BENCHLINE_SMTP_URL: 'smtp://benchline:mail-secret-42@127.0.0.1:1',
  BENCHLINE_MAIL_FROM: 'benchline@lab.example',
  BENCHLINE_SYSTEM_ADMINISTRATOR_EMAIL: 'sysadmin@lab.example',
  BENCHLINE_QUALITY_LEAD_EMAIL: 'quality@lab.example',
});

/** Runs the System administrator's command as `lab-server-user`. */
const command = (database: string, ...args: string[]) =>
  administerFromServer({
    env: production(database),
    args,
    operator: 'lab-server-user',
  });

/** Opens the stores on a file as the server does, closed when the test ends. */
function open(t: TestContext, database: string) {
  assert.notEqual(migrate(database).outcome, 'refused');
  const accounts = new Accounts(database);
  const lab = new Laboratory(database, {
    credentials: accounts,
    people: () => accounts.people(),
  });
  t.after(() => {
    lab.close();
    accounts.close();
  });
  return { accounts, lab };
}

/** Access events oldest first, as act, account, actor, field, new value and
 * reason. */
const accessEvents = (lab: Laboratory) =>
  lab
    .auditTrail()
    .filter((e: AuditEntry) => e.recordType === 'Account')
    .reverse()
    .map((e) => [
      e.commandType,
      e.recordId,
      e.actor,
      e.field,
      e.newValue,
      e.reason,
    ]);

const oneTimePasswordIn = (output: string) =>
  output.match(/One-time password: (\S+)/)?.[1] ?? '';

const SYSTEM_ADMINISTRATOR = 'System administrator (lab-server-user)';

test('the System administrator issues a new account by its change record, and its One-time password is printed once and stored nowhere', async (t) => {
  const database = join(folder(t), 'production.sqlite');
  const output = await command(
    database,
    'issue-account',
    'robin',
    '--name',
    'Robin Hale',
    '--role',
    'analyst',
    '--change-record',
    'CR-2026-014',
  );
  const oneTimePassword = oneTimePasswordIn(output);
  assert.ok(oneTimePassword.length >= 12);
  assert.equal(output.split(oneTimePassword).length, 2);

  const { accounts, lab } = open(t, database);
  assert.deepEqual(accounts.people(), [
    { id: 'robin', name: 'Robin Hale', role: 'analyst', active: true },
  ]);
  assert.deepEqual(accessEvents(lab), [
    [
      'accountAdded',
      'robin',
      SYSTEM_ADMINISTRATOR,
      'name',
      'Robin Hale',
      'Change record CR-2026-014',
    ],
    [
      'accountAdded',
      'robin',
      SYSTEM_ADMINISTRATOR,
      'role',
      'analyst',
      'Change record CR-2026-014',
    ],
    [
      'accountAdded',
      'robin',
      SYSTEM_ADMINISTRATOR,
      'active',
      true,
      'Change record CR-2026-014',
    ],
    [
      'oneTimePasswordIssued',
      'robin',
      SYSTEM_ADMINISTRATOR,
      'password',
      'One-time password issued',
      'Change record CR-2026-014',
    ],
  ]);
  for (const file of [database, `${database}-wal`])
    assert.ok(
      !readFileSync(file, { flag: 'a+' }).includes(oneTimePassword),
      `${file} holds the One-time password`,
    );
  assert.ok(!JSON.stringify(lab.auditTrail()).includes(oneTimePassword));
});

test('unlocking a Locked account needs its approved Form, issues a One-time password, and the account then signs in only to set a new password', async (t) => {
  const database = join(folder(t), 'production.sqlite');
  const first = await issued(database);
  {
    const accounts = new Accounts(database);
    const lab = new Laboratory(database, { people: () => accounts.people() });
    await accounts.replaceExpiredPassword(
      'robin',
      first,
      'robin-own-password',
      lab,
    );
    for (let i = 0; i < 5; i++) await accounts.signIn('robin', 'guess', lab);
    lab.close();
    accounts.close();
  }

  for (const form of [[], ['--form', '  ']])
    await assert.rejects(() => command(database, 'unlock', 'robin', ...form), {
      message:
        'Cite the approved Form this is done under. Nothing was changed.',
    });

  const output = await command(
    database,
    'unlock',
    'robin',
    '--form',
    'F-ACC-2026-031',
  );
  const oneTimePassword = oneTimePasswordIn(output);
  assert.ok(oneTimePassword.length >= 12);
  assert.match(output, /^robin is unlocked under Form F-ACC-2026-031\./);

  const { accounts, lab } = open(t, database);
  assert.equal(
    (await accounts.signIn('robin', 'robin-own-password', lab)).outcome,
    'incorrect',
  );
  assert.deepEqual(await accounts.signIn('robin', oneTimePassword, lab), {
    outcome: 'oneTimePassword',
  });
  assert.equal(
    (
      await accounts.replaceExpiredPassword(
        'robin',
        oneTimePassword,
        'robin-second-password',
        lab,
      )
    ).outcome,
    'signedIn',
  );
  const unlocking = accessEvents(lab).filter(
    ([act]) => act === 'unlock' || act === 'oneTimePasswordIssued',
  );
  assert.deepEqual(unlocking.slice(1), [
    [
      'unlock',
      'robin',
      SYSTEM_ADMINISTRATOR,
      'locked',
      false,
      'Form F-ACC-2026-031',
    ],
    [
      'unlock',
      'robin',
      SYSTEM_ADMINISTRATOR,
      'consecutiveFailedAttempts',
      0,
      'Form F-ACC-2026-031',
    ],
    [
      'oneTimePasswordIssued',
      'robin',
      SYSTEM_ADMINISTRATOR,
      'password',
      'One-time password issued',
      'Form F-ACC-2026-031',
    ],
  ]);
  // Its Failed attempts and lockout stay on record.
  assert.equal(
    accessEvents(lab).filter(([act]) => act === 'lockout').length,
    1,
  );
  assert.ok(!JSON.stringify(lab.auditTrail()).includes(oneTimePassword));
});

test('Access events print for a period of whole UTC days, and lockout notices that were not sent are listed', async (t) => {
  const database = join(folder(t), 'production.sqlite');
  assert.notEqual(migrate(database).outcome, 'refused');
  {
    const accounts = new Accounts(database);
    accounts.seed([
      {
        id: 'robin',
        name: 'Robin Hale',
        role: 'analyst',
        password: 'robin-own-password',
      },
    ]);
    const at = { now: '2026-09-13T23:59:59.000Z' };
    const lab = new Laboratory(database, {
      clock: () => at.now,
      people: () => accounts.people(),
    });
    await accounts.signIn('robin', 'wrong', lab);
    at.now = '2026-09-14T00:00:00.000Z';
    for (let i = 0; i < 4; i++) await accounts.signIn('robin', 'guess', lab);
    at.now = '2026-09-15T00:00:00.000Z';
    await accounts.signIn('nobody', 'guess', lab);
    lab.close();
    accounts.close();
  }

  const printed = await command(
    database,
    'access-events',
    '--from',
    '2026-09-14',
    '--to',
    '2026-09-14',
  );
  assert.deepEqual(printed.split('\n'), [
    'Access events from 2026-09-14 to 2026-09-14 (UTC), oldest first:',
    '2026-09-14T00:00:00.000Z  Failed attempt  robin  by robin  consecutiveFailedAttempts: 1 → 2  (Wrong password at sign-in)',
    '2026-09-14T00:00:00.000Z  Failed attempt  robin  by robin  consecutiveFailedAttempts: 2 → 3  (Wrong password at sign-in)',
    '2026-09-14T00:00:00.000Z  Failed attempt  robin  by robin  consecutiveFailedAttempts: 3 → 4  (Wrong password at sign-in)',
    '2026-09-14T00:00:00.000Z  Failed attempt  robin  by robin  consecutiveFailedAttempts: 4 → 5  (Wrong password at sign-in)',
    '2026-09-14T00:00:00.000Z  Account locked  robin  by Benchline  locked: false → true  (5 consecutive Failed attempts)',
    '2026-09-14T00:00:00.000Z  Lockout notice  robin  by Benchline  lockoutNotice: null → failed  (No outbound mail is configured, so the lockout notice was not sent.)',
    '4 Failed attempts.',
  ]);
  await assert.rejects(
    () => command(database, 'access-events', '--from', '14/09/2026'),
    { message: 'Give --from and --to as UTC dates, YYYY-MM-DD.' },
  );

  assert.equal(
    await command(database, 'unsent-notices'),
    [
      'Lockout notices not sent:',
      '2026-09-14T00:00:00.000Z  robin  No outbound mail is configured, so the lockout notice was not sent.',
    ].join('\n'),
  );
});

/** A production database holding the demo's records: Results, OOS
 * investigations, Electronic signatures, attachments and Published and
 * Amended Certificates, with every account's password its own. */
function databaseWithRecords(t: TestContext) {
  const database = join(folder(t), 'production.sqlite');
  assert.notEqual(migrate(database).outcome, 'refused');
  const accounts = new Accounts(database);
  accounts.seed(demoAccounts);
  const lab = new Laboratory(database, {
    credentials: accounts,
    people: () => accounts.people(),
  });
  seed(lab);
  // No production database keeps the published demo passwords.
  for (const { id } of demoAccounts)
    accounts.administer(
      { type: 'setPassword', username: id, password: `${id}-own-password` },
      'admin',
      lab,
    );
  lab.close();
  accounts.close();
  return database;
}

const fileHash = (file: string) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

test('a backup of the running database passes its integrity, signature, audit cross-check, Certificate and attachment checks, and is on record', async (t) => {
  const database = databaseWithRecords(t);
  // The server stays open on the file while the backup runs.
  const { lab } = open(t, database);
  const records = lab.snapshot();
  const destination = join(folder(t), 'benchline-2026-09-14.sqlite');

  const output = await command(database, 'backup', destination);
  const lines = output.split('\n');
  assert.equal(lines[0], `The backup ${destination} passed every check.`);
  assert.deepEqual(lines.slice(1), [
    'Integrity check: ok',
    `Electronic signatures: ${records.signatures.length} checked, 0 invalid`,
    `Signing audit entries: ${records.signatures.length} matched to their signatures, 0 mismatched`,
    `Certificates of Analysis: ${records.certificates.length} checked, 0 mismatched`,
    `Attachments: ${records.attachments.length} checked, 0 mismatched`,
    `SHA-256 of the backup: ${fileHash(destination)}`,
  ]);
  assert.ok(records.signatures.length > 0 && records.certificates.length > 0);

  const entries = lab
    .auditTrail()
    .filter((e) => e.commandType === 'backup')
    .reverse()
    .map((e) => [e.recordType, e.recordId, e.actor, e.field, e.newValue]);
  assert.deepEqual(entries, [
    ['Backup', destination, SYSTEM_ADMINISTRATOR, 'verification', 'passed'],
    [
      'Backup',
      destination,
      SYSTEM_ADMINISTRATOR,
      'sha256',
      fileHash(destination),
    ],
  ]);
});

test('a backup altered behind its triggers fails verification: a changed Certificate, a signature row deleted, or one inserted without its audit entries', async (t) => {
  const database = databaseWithRecords(t);
  const backups = folder(t);
  /** A fresh backup, altered by `sql` with the protection triggers dropped. */
  async function tampered(name: string, sql: string) {
    const file = join(backups, `${name}.sqlite`);
    await command(database, 'backup', file);
    const db = new DatabaseSync(file);
    for (const { name: trigger } of db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'")
      .all() as { name: string }[])
      db.exec(`DROP TRIGGER "${trigger}"`);
    db.exec(sql);
    db.close();
    return file;
  }
  const failure = async (file: string) => {
    try {
      await command(database, 'verify-backup', file);
      return null;
    } catch (error) {
      return (error as Error).message.split('\n').slice(0, 2);
    }
  };

  const intact = join(backups, 'intact.sqlite');
  await command(database, 'backup', intact);
  assert.match(
    await command(database, 'verify-backup', intact),
    new RegExp(`^The backup ${intact} passed every check\\.`),
  );

  const certificate = await tampered(
    'certificate',
    `UPDATE certificates SET content = replace(content, '"version":1', '"version":1 ') WHERE version = 1 AND sampleId = (SELECT min(sampleId) FROM certificates)`,
  );
  assert.deepEqual(await failure(certificate), [
    `The backup ${certificate} failed its checks.`,
    '1 Certificate of Analysis does not match its hash.',
  ]);

  const deleted = await tampered(
    'deleted-signature',
    'DELETE FROM signatures WHERE id = (SELECT max(id) FROM signatures)',
  );
  assert.deepEqual(await failure(deleted), [
    `The backup ${deleted} failed its checks.`,
    '1 signing act in the audit trail has no single matching Electronic signature.',
  ]);

  // A signature whose signing entries are gone keeps a valid hash, as one
  // inserted without them would, so only the cross-check finds it.
  const unaudited = await tampered(
    'unaudited-signature',
    `DELETE FROM audit WHERE field IN ('signature.meaning', 'signature.signer')
       AND lower(replace(commandId, '-', '')) = (SELECT lower(hex(commandId)) FROM signatures WHERE id = 1)`,
  );
  assert.deepEqual(await failure(unaudited), [
    `The backup ${unaudited} failed its checks.`,
    '1 Electronic signature has no signing entries in the audit trail.',
  ]);
  const duplicated = await tampered(
    'duplicated-signature',
    `INSERT INTO signatures (sampleId, signerId, printedName, signedAt, meaning, command, commandId, signedContent, sha256)
     SELECT sampleId, signerId, printedName, signedAt, meaning, command, commandId, signedContent, sha256 FROM signatures WHERE id = 1`,
  );
  assert.deepEqual(await failure(duplicated), [
    `The backup ${duplicated} failed its checks.`,
    '1 signing act in the audit trail has no single matching Electronic signature.',
  ]);

  const verifications = open(t, database)
    .lab.auditTrail()
    .filter((e) => e.field === 'verification')
    .map((e) => [e.commandType, e.newValue]);
  assert.ok(verifications.length >= 5);
  assert.ok(verifications.every(([act]) => act === 'backup'));
});

test('a verified backup restored onto a clean server under its change record starts, with every signature valid and every Certificate hash matching', async (t) => {
  const source = databaseWithRecords(t);
  const records = open(t, source).lab.snapshot();
  const backups = folder(t);
  const backupFile = join(backups, 'benchline-2026-09-14.sqlite');
  await command(source, 'backup', backupFile);
  const server = folder(t);
  const restored = join(server, 'production.sqlite');

  for (const reference of [[], ['--change-record', ' ']])
    await assert.rejects(
      () => command(restored, 'restore', backupFile, ...reference),
      {
        message:
          'Cite the approved change record this is done under. Nothing was changed.',
      },
    );
  await assert.rejects(
    () =>
      command(source, 'restore', backupFile, '--change-record', 'CR-2026-020'),
    {
      message: `${source} already exists. A backup is restored only onto a clean server, so nothing recorded there is lost. Nothing was changed.`,
    },
  );
  const altered = join(backups, 'altered.sqlite');
  await command(source, 'backup', altered);
  {
    const db = new DatabaseSync(altered);
    db.exec(`DROP TRIGGER attachments_immutable;
      UPDATE attachments SET content = x'00' WHERE id = (SELECT min(id) FROM attachments)`);
    db.close();
  }
  await assert.rejects(
    () =>
      command(restored, 'restore', altered, '--change-record', 'CR-2026-020'),
    (error: Error) =>
      error.message.startsWith(
        `The backup ${altered} failed its checks.\n1 attachment does not match its hash.`,
      ) && error.message.endsWith('Nothing was restored.'),
  );
  assert.ok(!existsSync(restored));

  const output = await command(
    restored,
    'restore',
    backupFile,
    '--change-record',
    'CR-2026-020',
  );
  const lines = output.split('\n');
  assert.equal(
    lines[0],
    `The backup ${backupFile} is restored to ${restored} under change record CR-2026-020, and the restored database passed every check.`,
  );
  assert.ok(
    lines.includes(
      `Electronic signatures: ${records.signatures.length} checked, 0 invalid`,
    ),
  );
  assert.ok(
    lines.includes(
      `Certificates of Analysis: ${records.certificates.length} checked, 0 mismatched`,
    ),
  );

  const instance = openInstance({
    mode: 'production',
    database: restored,
    port: 5173,
    lockoutNotice: {
      smtpUrl: 'smtp://benchline:mail-secret-42@127.0.0.1:1',
      from: 'benchline@lab.example',
      systemAdministrator: 'sysadmin@lab.example',
      qualityLead: 'quality@lab.example',
    },
  });
  assert.equal(instance.outcome, 'opened');
  if (instance.outcome !== 'opened') return;
  t.after(() => instance.close());
  const after = instance.lab.snapshot();
  assert.equal(after.signatures.length, records.signatures.length);
  assert.ok(after.signatures.every((s) => s.valid));
  assert.deepEqual(after.certificates, records.certificates);
  assert.deepEqual(
    instance.lab
      .auditTrail()
      .filter((e) => e.commandType === 'restore')
      .reverse()
      .map((e) => [e.recordId, e.actor, e.field, e.newValue, e.reason]),
    [
      [
        backupFile,
        SYSTEM_ADMINISTRATOR,
        'verification',
        'passed',
        'Change record CR-2026-020',
      ],
      [
        backupFile,
        SYSTEM_ADMINISTRATOR,
        'sha256',
        fileHash(backupFile),
        'Change record CR-2026-020',
      ],
    ],
  );
});

test('the System administrator’s command runs only in production, reading the instance’s own settings', async (t) => {
  const database = join(folder(t), 'demo.sqlite');
  await assert.rejects(
    () =>
      administerFromServer({
        env: { BENCHLINE_MODE: 'demo', BENCHLINE_DATABASE: database },
        args: ['unsent-notices'],
        operator: 'lab-server-user',
      }),
    {
      message:
        'The System administrator’s command is for production. In the demo, the Admin manages accounts on the Accounts screen and `npm run unlock` unlocks a lone Admin.',
    },
  );
  await assert.rejects(
    () =>
      administerFromServer({
        env: { BENCHLINE_MODE: 'production' },
        args: ['unsent-notices'],
        operator: 'lab-server-user',
      }),
    /Set BENCHLINE_DATABASE to this instance’s database file\./,
  );
  assert.ok(!existsSync(database));
});

/** Issues `robin` an account and returns its One-time password. */
async function issued(database: string) {
  return oneTimePasswordIn(
    await command(
      database,
      'issue-account',
      'robin',
      '--name',
      'Robin Hale',
      '--role',
      'analyst',
      '--change-record',
      'CR-2026-014',
    ),
  );
}

test('a One-time password signs in only to set a new password of at least 12 characters, different from it', async (t) => {
  const database = join(folder(t), 'production.sqlite');
  const oneTimePassword = await issued(database);
  const { accounts, lab } = open(t, database);

  assert.deepEqual(await accounts.signIn('robin', oneTimePassword, lab), {
    outcome: 'oneTimePassword',
  });
  // No session can be resumed and nothing signed with it.
  assert.equal(accounts.find('robin'), null);
  assert.equal(
    accounts.verifySigner('robin', oneTimePassword, lab, 'test'),
    'incorrect',
  );

  const replace = (current: string, next: string) =>
    accounts.replaceExpiredPassword('robin', current, next, lab);
  await assert.rejects(() => replace(oneTimePassword, 'too-short'), {
    message: 'A password needs at least 12 characters.',
  });
  await assert.rejects(() => replace(oneTimePassword, oneTimePassword), {
    message: 'Choose a new password, different from the current one.',
  });
  assert.deepEqual(await replace('not-the-one-time', 'robin-own-password'), {
    outcome: 'incorrect',
  });

  const replaced = await replace(oneTimePassword, 'robin-own-password');
  assert.deepEqual(replaced, {
    outcome: 'signedIn',
    user: { id: 'robin', name: 'Robin Hale', role: 'analyst' },
  });
  assert.equal(
    (await accounts.signIn('robin', 'robin-own-password', lab)).outcome,
    'signedIn',
  );
  assert.deepEqual(await accounts.signIn('robin', oneTimePassword, lab), {
    outcome: 'incorrect',
  });
  await assert.rejects(
    () => replace('robin-own-password', 'another-password'),
    {
      message:
        'The password of Robin Hale has not expired, so there is nothing to replace. Sign in and change it there.',
    },
  );

  assert.deepEqual(
    accessEvents(lab)
      .slice(4)
      .map(([act, , actor, field, value]) => [act, actor, field, value]),
    [
      ['failedAttempt', 'robin', 'consecutiveFailedAttempts', 1],
      ['failedAttempt', 'robin', 'consecutiveFailedAttempts', 2],
      ['passwordSet', 'robin', 'password', 'changed'],
      ['signIn', 'robin', 'session', 'signed in'],
      ['signIn', 'robin', 'consecutiveFailedAttempts', 0],
      ['signIn', 'robin', 'session', 'signed in'],
      ['failedAttempt', 'robin', 'consecutiveFailedAttempts', 1],
    ],
  );
  assert.ok(!JSON.stringify(lab.auditTrail()).includes('robin-own-password'));
});

test('a One-time password unused for 72 hours no longer signs in, and the System administrator issues a new one under its Form', async (t) => {
  const database = join(folder(t), 'production.sqlite');
  const stale = await issued(database);
  /** The stores on the file with the server clock this many hours on from
   * when the One-time password was issued. */
  async function hoursLater<T>(
    hours: number,
    use: (stores: { accounts: Accounts; lab: Laboratory }) => Promise<T>,
  ) {
    const accounts = new Accounts(database, {
      clock: () => new Date(Date.now() + hours * 3_600_000).toISOString(),
    });
    const lab = new Laboratory(database, { people: () => accounts.people() });
    try {
      return await use({ accounts, lab });
    } finally {
      lab.close();
      accounts.close();
    }
  }
  await hoursLater(71, async ({ accounts, lab }) =>
    assert.deepEqual(await accounts.signIn('robin', stale, lab), {
      outcome: 'oneTimePassword',
    }),
  );
  await hoursLater(72, async ({ accounts, lab }) => {
    assert.deepEqual(await accounts.signIn('robin', stale, lab), {
      outcome: 'oneTimePasswordExpired',
    });
    assert.deepEqual(
      await accounts.replaceExpiredPassword(
        'robin',
        stale,
        'robin-own-password',
        lab,
      ),
      { outcome: 'oneTimePasswordExpired' },
    );
    // Still only the right password learns that it expired.
    assert.deepEqual(await accounts.signIn('robin', 'a-guess', lab), {
      outcome: 'incorrect',
    });
  });

  await assert.rejects(
    () => command(database, 'issue-one-time-password', 'robin'),
    {
      message:
        'Cite the approved Form this is done under. Nothing was changed.',
    },
  );
  const output = await command(
    database,
    'issue-one-time-password',
    'robin',
    '--form',
    'F-ACC-2026-040',
  );
  assert.match(
    output,
    /^A new One-time password is issued for robin under Form F-ACC-2026-040\./,
  );
  const fresh = oneTimePasswordIn(output);
  assert.notEqual(fresh, stale);

  const { accounts, lab } = open(t, database);
  assert.deepEqual(await accounts.signIn('robin', stale, lab), {
    outcome: 'incorrect',
  });
  assert.equal(
    (
      await accounts.replaceExpiredPassword(
        'robin',
        fresh,
        'robin-own-password',
        lab,
      )
    ).outcome,
    'signedIn',
  );
  assert.deepEqual(
    accessEvents(lab)
      .filter(([act]) => act !== 'accountAdded' && act !== 'signIn')
      .map(([act, , actor, , value, reason]) => [act, actor, value, reason]),
    [
      [
        'oneTimePasswordIssued',
        SYSTEM_ADMINISTRATOR,
        'One-time password issued',
        'Change record CR-2026-014',
      ],
      ['failedAttempt', 'robin', 1, 'Wrong password at sign-in'],
      [
        'oneTimePasswordIssued',
        SYSTEM_ADMINISTRATOR,
        'One-time password issued',
        'Form F-ACC-2026-040',
      ],
      // Reissuing clears no Failed attempts; only a success does.
      ['failedAttempt', 'robin', 2, 'Wrong password at sign-in'],
      ['passwordSet', 'robin', 'changed', 'Replaced a One-time password'],
    ],
  );

  // A Locked account is unlocked instead, which issues its One-time password.
  for (let i = 0; i < 5; i++) await accounts.signIn('robin', 'guess', lab);
  await assert.rejects(
    () =>
      command(
        database,
        'issue-one-time-password',
        'robin',
        '--form',
        'F-ACC-2026-041',
      ),
    {
      message:
        'Robin Hale is locked. Unlock it under its Form, which issues a One-time password. Nothing was changed.',
    },
  );
});
