import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { unlockFromServer } from '../server/unlock.ts';
import { migrate } from '../server/migrations.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { newCommandId, type AuditEntry } from '../src/laboratory/contracts.ts';

const NOW = '2026-09-14T09:00:00.000Z';

/** Fresh demo accounts, and a laboratory that records their Access events
 * and takes its users from them. */
function lab(t: TestContext) {
  const accounts = new Accounts(':memory:');
  accounts.seed(demoAccounts);
  const laboratory = new Laboratory(':memory:', {
    clock: () => NOW,
    credentials: accounts,
    people: () => accounts.people(),
  });
  t.after(() => {
    laboratory.close();
    accounts.close();
  });
  return { accounts, lab: laboratory };
}

/** Access events oldest first, as act, account, actor, field, old and new. */
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
      e.oldValue,
      e.newValue,
    ]);

test('a user the Admin adds can act and sign; once deactivated they cannot, and the record still names them', async (t) => {
  const { accounts, lab: laboratory } = lab(t);
  const add = (username: string, name: string, role: string) =>
    accounts.administer(
      {
        type: 'addAccount',
        username,
        name,
        role,
        password: `${username}-password`,
      },
      'admin',
      laboratory,
    );
  add('coordinator-2', 'Kai Moreno', 'coordinator');
  add('analyst-3', 'Robin Diaz', 'analyst');
  const run = (command: object, actor: string) =>
    laboratory.execute({ commandId: newCommandId(), ...command }, actor)
      .samples[0];
  const receipt = {
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
  };
  let s = run(receipt, 'coordinator-2');
  assert.equal(s.receivedBy, 'coordinator-2');
  const target = () => ({ sampleId: s.id, revision: s.revision });
  s = run(
    { type: 'assign', ...target(), assignee: 'analyst-3' },
    'coordinator-2',
  );
  const sheet = laboratory.storeAttachment(
    {
      filename: 'sheet.csv',
      contentType: 'text/csv',
      content: Buffer.from('a,b\n1,2\n'),
    },
    'analyst-3',
  );
  s = run(
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
    'analyst-3',
  );
  s = run(
    { type: 'submitForApproval', ...target(), password: 'analyst-3-password' },
    'analyst-3',
  );
  assert.deepEqual(
    laboratory.snapshot().signatures.map((x) => [x.signerId, x.printedName]),
    [['analyst-3', 'Robin Diaz']],
  );

  accounts.administer(
    { type: 'updateAccount', username: 'coordinator-2', active: false },
    'admin',
    laboratory,
  );
  assert.equal(accounts.find('coordinator-2'), null);
  assert.deepEqual(
    await accounts.signIn(
      'coordinator-2',
      'coordinator-2-password',
      laboratory,
    ),
    { outcome: 'incorrect' },
  );
  assert.throws(
    () => run(receipt, 'coordinator-2'),
    (e: Error & { status: number }) =>
      e.status === 403 && e.message === 'This account is deactivated.',
  );
  // Still in the directory, so the record keeps naming who received the Sample.
  assert.deepEqual(
    laboratory.snapshot().people.find((p) => p.id === 'coordinator-2'),
    {
      id: 'coordinator-2',
      name: 'Kai Moreno',
      role: 'coordinator',
      active: false,
    },
  );
  assert.deepEqual(
    accessEvents(laboratory).filter(([act]) => act === 'accountChanged'),
    [['accountChanged', 'coordinator-2', 'admin', 'active', true, false]],
  );
});

test('the Admin unlocks a Locked account and sets its password, and its past Failed attempts stay on record', async (t) => {
  const { accounts, lab: laboratory } = lab(t);
  for (let i = 0; i < 5; i++)
    await accounts.signIn('manager', `guess-${i}`, laboratory);
  const status = () => {
    const { locked, failedAttempts } = accounts
      .accountsFor('admin')
      .find((a) => a.id === 'manager')!;
    return { locked, failedAttempts };
  };
  assert.deepEqual(status(), { locked: true, failedAttempts: 5 });

  accounts.administer(
    { type: 'setPassword', username: 'manager', password: 'taylor-new-pass' },
    'admin',
    laboratory,
  );
  accounts.administer(
    { type: 'unlockAccount', username: 'manager' },
    'admin',
    laboratory,
  );
  assert.deepEqual(status(), { locked: false, failedAttempts: 0 });
  assert.throws(
    () =>
      accounts.administer(
        { type: 'unlockAccount', username: 'manager' },
        'admin',
        laboratory,
      ),
    (e: Error & { status: number }) =>
      e.status === 409 && e.message === 'Taylor Brooks is not locked.',
  );

  assert.deepEqual(
    await accounts.signIn('manager', 'manager-demo', laboratory),
    { outcome: 'incorrect' },
  );
  assert.equal(
    (await accounts.signIn('manager', 'taylor-new-pass', laboratory)).outcome,
    'signedIn',
  );
  // Setting it never lets the Admin sign as the Manager.
  assert.equal(
    accounts.verifySigner('admin', 'taylor-new-pass', laboratory, 'test'),
    'incorrect',
  );

  const acts = accessEvents(laboratory);
  assert.equal(acts.filter(([act]) => act === 'failedAttempt').length, 7);
  assert.equal(acts.filter(([act]) => act === 'lockout').length, 1);
  assert.deepEqual(
    acts.filter(([act]) => act === 'passwordSet' || act === 'unlock'),
    [
      ['passwordSet', 'manager', 'admin', 'password', null, 'changed'],
      ['unlock', 'manager', 'admin', 'locked', true, false],
      ['unlock', 'manager', 'admin', 'consecutiveFailedAttempts', 5, 0],
    ],
  );
  assert.ok(
    !JSON.stringify(laboratory.auditTrail()).includes('taylor-new-pass'),
  );
});

test("account changes are the Admin's alone, never reuse a username and never leave Benchline without an Admin", (t) => {
  const { accounts, lab: laboratory } = lab(t);
  /** The refusal an account change meets, as status and message; null when
   * it is saved. */
  const refusal = (input: object, by: string) => {
    try {
      accounts.administer(input, by, laboratory);
      return null;
    } catch (e) {
      const { status, message } = e as Error & { status: number };
      return [status, message];
    }
  };
  const only = [403, 'Only the Admin manages accounts.'];
  for (const user of ['coordinator', 'analyst', 'manager'])
    assert.deepEqual(
      refusal({ type: 'unlockAccount', username: 'analyst' }, user),
      only,
    );

  // A deactivated user's username is still theirs.
  assert.equal(
    refusal(
      { type: 'updateAccount', username: 'analyst-2', active: false },
      'admin',
    ),
    null,
  );
  assert.deepEqual(
    refusal(
      {
        type: 'addAccount',
        username: 'analyst-2',
        name: 'Someone Else',
        role: 'analyst',
        password: 'long-enough-pass',
      },
      'admin',
    ),
    [409, 'The username analyst-2 is already taken.'],
  );
  assert.deepEqual(
    refusal(
      {
        type: 'addAccount',
        username: 'Bad Name',
        name: 'Someone Else',
        role: 'analyst',
        password: 'short',
      },
      'admin',
    ),
    [
      400,
      'A username is 2 to 40 lowercase letters, digits or hyphens, starting with a letter or digit. A password needs at least 12 characters.',
    ],
  );
  assert.deepEqual(
    refusal(
      { type: 'setPassword', username: 'nobody', password: 'long-enough-pass' },
      'admin',
    ),
    [404, 'There is no account nobody.'],
  );

  // The Admin may change their own account, but never leave no Admin.
  assert.equal(
    refusal(
      { type: 'updateAccount', username: 'admin', name: 'Jordan Park-Lee' },
      'admin',
    ),
    null,
  );
  assert.deepEqual(
    refusal(
      { type: 'updateAccount', username: 'admin', name: 'Jordan Park-Lee' },
      'admin',
    ),
    [400, 'Nothing to change.'],
  );
  const noAdmin = [409, 'Benchline needs at least one active Admin.'];
  assert.deepEqual(
    refusal(
      { type: 'updateAccount', username: 'admin', role: 'manager' },
      'admin',
    ),
    noAdmin,
  );
  assert.deepEqual(
    refusal(
      { type: 'updateAccount', username: 'admin', active: false },
      'admin',
    ),
    noAdmin,
  );
  // With a second Admin, the first may step down, and then manages nothing.
  accounts.administer(
    {
      type: 'addAccount',
      username: 'admin-2',
      name: 'Casey Wu',
      role: 'admin',
      password: 'casey-password',
    },
    'admin',
    laboratory,
  );
  assert.equal(
    refusal(
      { type: 'updateAccount', username: 'admin', role: 'manager' },
      'admin',
    ),
    null,
  );
  assert.deepEqual(
    refusal({ type: 'unlockAccount', username: 'analyst' }, 'admin'),
    only,
  );
});

test('the Admin adds a user, who can then sign in, and the addition is on record', async (t) => {
  const { accounts, lab: laboratory } = lab(t);
  const listed = accounts.administer(
    {
      type: 'addAccount',
      username: 'analyst-3',
      name: 'Robin Diaz',
      role: 'analyst',
      password: 'robin-password',
    },
    'admin',
    laboratory,
  );
  assert.deepEqual(
    listed.find((a) => a.id === 'analyst-3'),
    {
      id: 'analyst-3',
      name: 'Robin Diaz',
      role: 'analyst',
      active: true,
      locked: false,
      failedAttempts: 0,
    },
  );
  const signedIn = await accounts.signIn(
    'analyst-3',
    'robin-password',
    laboratory,
  );
  assert.equal(signedIn.outcome, 'signedIn');
  assert.deepEqual(accessEvents(laboratory), [
    ['accountAdded', 'analyst-3', 'admin', 'name', null, 'Robin Diaz'],
    ['accountAdded', 'analyst-3', 'admin', 'role', null, 'analyst'],
    ['accountAdded', 'analyst-3', 'admin', 'active', null, true],
    ['signIn', 'analyst-3', 'analyst-3', 'session', null, 'signed in'],
  ]);
  assert.ok(
    !JSON.stringify(laboratory.auditTrail()).includes('robin-password'),
  );
});

test('a lone Admin who locked themselves out is unlocked by the demo server command, which names who ran it', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-unlock-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const database = join(folder, 'benchline.sqlite');
  /** What the server does on start. */
  const open = () => {
    assert.notEqual(migrate(database).outcome, 'refused');
    const accounts = new Accounts(database);
    accounts.seed(demoAccounts);
    const laboratory = new Laboratory(database, {
      credentials: accounts,
      people: () => accounts.people(),
    });
    return { accounts, laboratory };
  };
  let { accounts, laboratory } = open();
  for (let i = 0; i < 5; i++) await accounts.signIn('admin', 'x', laboratory);
  laboratory.close();
  accounts.close();

  assert.throws(
    () =>
      unlockFromServer({
        database,
        username: 'admin',
        operator: 'lab-server-user',
        production: true,
      }),
    /The unlock command is for the demo only/,
  );
  assert.equal(
    unlockFromServer({
      database,
      username: 'admin',
      operator: 'lab-server-user',
      production: false,
    }),
    'admin is unlocked.',
  );

  ({ accounts, laboratory } = open());
  t.after(() => {
    laboratory.close();
    accounts.close();
  });
  assert.equal(
    (await accounts.signIn('admin', 'admin-demo', laboratory)).outcome,
    'signedIn',
  );
  assert.deepEqual(
    accessEvents(laboratory).filter(([act]) => act === 'unlock'),
    [
      [
        'unlock',
        'admin',
        'System administrator (lab-server-user)',
        'locked',
        true,
        false,
      ],
      [
        'unlock',
        'admin',
        'System administrator (lab-server-user)',
        'consecutiveFailedAttempts',
        5,
        0,
      ],
    ],
  );
});
