import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import {
  Accounts,
  type AccountsOptions,
  type Mail,
} from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditEntriesOfEventType,
  newCommandId,
  type AuditEntry,
} from '../src/laboratory/contracts.ts';

const NOW = '2026-09-14T09:00:00.000Z';

/** Fresh demo accounts and a laboratory whose audit trail records their
 * Access events. */
function lab(t: TestContext, options: AccountsOptions = {}) {
  const accounts = new Accounts(':memory:', options);
  accounts.seed(demoAccounts);
  const laboratory = new Laboratory(':memory:', {
    clock: () => NOW,
    credentials: accounts,
  });
  t.after(() => {
    laboratory.close();
    accounts.close();
  });
  return { accounts, lab: laboratory };
}

/** Access events oldest first, without their sequence and key. */
const accessEvents = (lab: Laboratory) =>
  lab
    .auditTrail()
    .filter((e) => e.recordType === 'Account')
    .reverse()
    .map(({ sequence, commandId, ...entry }: AuditEntry) => entry);

/** Runs a command on the Laboratory, returning its one Sample. */
function run(lab: Laboratory, command: object, actor: string) {
  return lab.execute({ commandId: newCommandId(), ...command }, actor)
    .samples[0];
}

/** A received raw material Sample with its Result entered by the Analyst,
 * ready to submit for Approval. */
function readyToSubmit(lab: Laboratory) {
  let s = run(
    lab,
    {
      type: 'receiveSubmission',
      clientId: 'northstar',
      shippingCondition: 'ambient',
      packageCondition: 'intact',
      samples: [
        {
          product: 'Demo',
          batch: '001',
          materialType: 'raw material',
          quantity: { value: 5, unit: 'g' },
          containers: { count: 1, type: 'jar' },
          conditionOnReceipt: 'Intact',
          methodIds: ['NIT-001-v1'],
          dueDate: '2026-10-01',
          priority: 'Routine',
        },
      ],
    },
    'coordinator',
  );
  const target = () => ({ sampleId: s.id, revision: s.revision });
  s = run(
    lab,
    { type: 'assign', ...target(), assignee: 'analyst' },
    'coordinator',
  );
  const sheet = lab.storeAttachment(
    {
      filename: 'sheet.csv',
      contentType: 'text/csv',
      content: Buffer.from('a,b\n1,2\n'),
    },
    'analyst',
  );
  return run(
    lab,
    {
      type: 'enterResult',
      ...target(),
      testId: 'NIT-001-v1',
      value: 0.02,
      instrumentReading: 0.2,
      sequenceId: 'SEQ-0001',
      attachmentId: sheet.id,
      reason: '',
    },
    'analyst',
  );
}

/** The laboratory's records and their audit entries, without Access events. */
const records = (lab: Laboratory) => {
  const { audit, ...snapshot } = lab.snapshot();
  return {
    ...snapshot,
    audit: audit.filter((e) => e.recordType !== 'Account'),
  };
};

test('a wrong signature password is a Failed attempt, and nothing is signed or saved', (t) => {
  const { lab: laboratory } = lab(t);
  const s = readyToSubmit(laboratory);
  const before = records(laboratory);
  assert.throws(
    () =>
      run(
        laboratory,
        {
          type: 'submitForApproval',
          sampleId: s.id,
          revision: s.revision,
          password: 'manager-demo',
        },
        'analyst',
      ),
    /The password is incorrect. Nothing was signed or saved./,
  );
  assert.deepEqual(records(laboratory), before);
  assert.deepEqual(accessEvents(laboratory), [
    {
      recordType: 'Account',
      recordId: 'analyst',
      sampleId: null,
      field: 'consecutiveFailedAttempts',
      oldValue: 0,
      newValue: 1,
      reason: `Wrong password on an Electronic signature (submitForApproval, Sample ${s.id})`,
      actor: 'analyst',
      at: NOW,
      commandType: 'failedAttempt',
    },
  ]);
  assert.ok(!JSON.stringify(laboratory.snapshot()).includes('manager-demo'));
});

test('Failed attempts at sign-in and signing count together, a success resets them, and the fifth locks the account', async (t) => {
  const { accounts, lab: laboratory } = lab(t);
  const s = readyToSubmit(laboratory);
  const wrongSignature = () =>
    assert.throws(
      () =>
        run(
          laboratory,
          {
            type: 'submitForApproval',
            sampleId: s.id,
            revision: s.revision,
            password: 'wrong',
          },
          'analyst',
        ),
      /password is incorrect/,
    );
  const wrongSignIn = async () =>
    assert.deepEqual(await accounts.signIn('analyst', 'wrong', laboratory), {
      outcome: 'incorrect',
    });

  for (let i = 0; i < 4; i++) await wrongSignIn();
  const signedIn = await accounts.signIn('analyst', 'analyst-demo', laboratory);
  assert.equal(signedIn.outcome, 'signedIn');

  await wrongSignIn();
  wrongSignature();
  wrongSignature();
  await wrongSignIn();
  assert.ok(accounts.find('analyst'), 'four in a row do not lock');
  // The attempt that locks, and any after it, is refused as locked whatever
  // the password, so guessing on learns nothing.
  const lockedSignIn = async (password: string) =>
    assert.deepEqual(await accounts.signIn('analyst', password, laboratory), {
      outcome: 'locked',
    });
  await lockedSignIn('wrong');
  assert.equal(
    accounts.find('analyst'),
    null,
    'a Locked account has no session',
  );

  const events = accessEvents(laboratory);
  assert.deepEqual(
    events
      .filter((e) => e.commandType === 'failedAttempt')
      .map((e) => e.newValue),
    [1, 2, 3, 4, 1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    events.filter((e) => e.commandType === 'lockout'),
    [
      {
        recordType: 'Account',
        recordId: 'analyst',
        sampleId: null,
        field: 'locked',
        oldValue: false,
        newValue: true,
        reason: '5 consecutive Failed attempts',
        actor: 'Benchline',
        at: NOW,
        commandType: 'lockout',
      },
    ],
  );
  // Only the one lockout, however many attempts follow.
  await lockedSignIn('another-guess');
  await lockedSignIn('analyst-demo');
  assert.equal(
    accessEvents(laboratory).filter((e) => e.commandType === 'lockout').length,
    1,
  );
});

test('a Locked account is refused sign-in and signing, even with its own password', async (t) => {
  const { accounts, lab: laboratory } = lab(t);
  let s = readyToSubmit(laboratory);
  s = run(
    laboratory,
    {
      type: 'submitForApproval',
      sampleId: s.id,
      revision: s.revision,
      password: 'analyst-demo',
    },
    'analyst',
  );
  for (const user of ['analyst', 'manager']) {
    for (let i = 0; i < 5; i++) await accounts.signIn(user, 'x', laboratory);
    assert.deepEqual(await accounts.signIn(user, `${user}-demo`, laboratory), {
      outcome: 'locked',
    });
  }
  const before = records(laboratory);
  for (const [type, user] of [
    ['submitForApproval', 'analyst'],
    ['approve', 'manager'],
  ])
    assert.throws(
      () =>
        run(
          laboratory,
          {
            type,
            sampleId: s.id,
            revision: s.revision,
            password: `${user}-demo`,
          },
          user,
        ),
      (e: Error & { status: number; code?: string }) =>
        e.status === 401 &&
        e.code === 'accountLocked' &&
        e.message ===
          'This account is locked, so nothing was signed or saved. Contact the System administrator.',
      `${type} by a Locked account`,
    );
  assert.deepEqual(records(laboratory), before);
});

const recipients = {
  systemAdministrator: 'system.administrator@lab.example',
  qualityLead: 'quality.lead@lab.example',
};

test('a lockout emails one notice to the System administrator and the Quality lead at once', async (t) => {
  const sent: Mail[] = [];
  const { accounts, lab: laboratory } = lab(t, {
    lockoutNotice: {
      ...recipients,
      transport: { send: async (mail) => void sent.push(mail) },
    },
  });
  for (let i = 0; i < 5; i++)
    await accounts.signIn('manager', 'manager-guess', laboratory);
  await accounts.noticesSettled();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, [
    'system.administrator@lab.example',
    'quality.lead@lab.example',
  ]);
  assert.match(sent[0].subject, /manager/);
  assert.match(sent[0].text, /manager/);
  assert.match(sent[0].text, /5 consecutive Failed attempts/);
  assert.ok(!JSON.stringify(sent).includes('manager-guess'));
  assert.deepEqual(
    accessEvents(laboratory).filter((e) => e.commandType === 'lockoutNotice'),
    [
      {
        recordType: 'Account',
        recordId: 'manager',
        sampleId: null,
        field: 'lockoutNotice',
        oldValue: null,
        newValue: 'sent',
        reason:
          'Emailed to system.administrator@lab.example, quality.lead@lab.example',
        actor: 'Benchline',
        at: NOW,
        commandType: 'lockoutNotice',
      },
    ],
  );
});

test('a notice that cannot be sent leaves the account locked and is recorded as failed', async (t) => {
  const { accounts, lab: laboratory } = lab(t, {
    lockoutNotice: {
      ...recipients,
      transport: {
        send: async () => {
          throw new Error('Connection refused');
        },
      },
    },
  });
  for (let i = 0; i < 5; i++)
    await accounts.signIn('manager', 'wrong', laboratory);
  await accounts.noticesSettled();
  assert.equal(accounts.find('manager'), null);
  assert.deepEqual(
    await accounts.signIn('manager', 'manager-demo', laboratory),
    { outcome: 'locked' },
  );
  assert.deepEqual(
    accessEvents(laboratory)
      .filter((e) => e.commandType === 'lockoutNotice')
      .map((e) => [e.newValue, e.reason]),
    [
      [
        'failed',
        'Email to system.administrator@lab.example, quality.lead@lab.example failed: Connection refused',
      ],
    ],
  );
});

test('Failed attempts on an unknown username that reach the limit are a lockout, noticed like any other', async (t) => {
  // No mail transport is configured here, so the notice fails on record.
  const { accounts, lab: laboratory } = lab(t);
  for (let i = 0; i < 5; i++)
    await accounts.signIn('root', 'password1', laboratory);
  await accounts.noticesSettled();
  assert.deepEqual(
    accessEvents(laboratory)
      .filter((e) => e.commandType !== 'failedAttempt')
      .map((e) => [e.commandType, e.recordId, e.newValue, e.reason]),
    [
      ['lockout', 'root', true, '5 consecutive Failed attempts'],
      [
        'lockoutNotice',
        'root',
        'failed',
        'No outbound mail is configured, so the lockout notice was not sent.',
      ],
    ],
  );
  assert.ok(!JSON.stringify(laboratory.auditTrail()).includes('password1'));
});

test('a wrong password at sign-in is a Failed attempt, recorded with the typed username', async (t) => {
  const { accounts, lab: laboratory } = lab(t);
  assert.deepEqual(
    await accounts.signIn('analyst', 'manager-demo', laboratory),
    { outcome: 'incorrect' },
  );
  assert.deepEqual(
    await accounts.signIn('nobody', 'analyst-demo', laboratory),
    { outcome: 'incorrect' },
  );
  assert.deepEqual(accessEvents(laboratory), [
    {
      recordType: 'Account',
      recordId: 'analyst',
      sampleId: null,
      field: 'consecutiveFailedAttempts',
      oldValue: 0,
      newValue: 1,
      reason: 'Wrong password at sign-in',
      actor: 'analyst',
      at: NOW,
      commandType: 'failedAttempt',
    },
    {
      recordType: 'Account',
      recordId: 'nobody',
      sampleId: null,
      field: 'consecutiveFailedAttempts',
      oldValue: 0,
      newValue: 1,
      reason: 'Wrong password at sign-in',
      actor: 'nobody',
      at: NOW,
      commandType: 'failedAttempt',
    },
  ]);
  assert.ok(!JSON.stringify(laboratory.auditTrail()).includes('-demo'));
});

test('Access event entries are refused UPDATE and DELETE at the database', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-access-'));
  const file = join(folder, 'test.sqlite');
  const accounts = new Accounts(':memory:');
  accounts.seed(demoAccounts);
  const laboratory = new Laboratory(file, {
    clock: () => NOW,
    credentials: accounts,
  });
  const db = new DatabaseSync(file);
  t.after(() => {
    db.close();
    laboratory.close();
    accounts.close();
    rmSync(folder, { recursive: true, force: true });
  });
  await accounts.signIn('analyst', 'wrong', laboratory);
  await accounts.signIn('analyst', 'analyst-demo', laboratory);
  assert.throws(
    () =>
      db
        .prepare(`UPDATE audit SET newValue = '0' WHERE recordType = 'Account'`)
        .run(),
    /Audit entries cannot be changed/,
  );
  assert.throws(
    () => db.prepare(`DELETE FROM audit WHERE recordType = 'Account'`).run(),
    /Audit entries cannot be deleted/,
  );
  assert.deepEqual(
    accessEvents(laboratory).map((e) => e.commandType),
    ['failedAttempt', 'signIn', 'signIn'],
  );
});

test('the lab-wide audit trail can show Access events alone, or hide them', async (t) => {
  const { accounts, lab: laboratory } = lab(t);
  readyToSubmit(laboratory);
  await accounts.signIn('nobody', 'wrong', laboratory);
  const entries = laboratory.auditTrail();
  assert.deepEqual(auditEntriesOfEventType(entries, 'all'), entries);
  assert.deepEqual(
    auditEntriesOfEventType(entries, 'accessEvents').map((e) => [
      e.commandType,
      e.recordId,
    ]),
    [['failedAttempt', 'nobody']],
  );
  const recordChanges = auditEntriesOfEventType(entries, 'recordChanges');
  assert.equal(recordChanges.length, entries.length - 1);
  assert.deepEqual(
    [...new Set(recordChanges.map((e) => e.commandType))].sort(),
    ['assign', 'enterResult', 'receiveSubmission', 'storeAttachment'],
  );
});
