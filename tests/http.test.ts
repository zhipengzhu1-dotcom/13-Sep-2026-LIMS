import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { api } from '../server/http.ts';
import type { Mode } from '../server/startup.ts';
import { IDLE_TIMEOUT_MS, Sessions } from '../server/sessions.ts';
import { createHash } from 'node:crypto';
import { laboratoryDay, newCommandId } from '../src/laboratory/contracts.ts';

const json = { 'Content-Type': 'application/json' };
const receipt = () => ({
  commandId: newCommandId(),
  type: 'receiveSubmission',
  clientId: 'northstar',
  clientContact: {
    name: 'Dana Wells',
    role: 'QA Manager',
    email: 'dana.wells@northstar.example',
    phone: '+1 555 0100',
  },
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
});

/** A real server on an ephemeral port over an in-memory core, with a clock
 * the test can move to exercise session inactivity. */
async function serve(t: TestContext, mode: Mode = 'demo') {
  const clock = { now: Date.parse('2026-09-13T09:00:00Z') };
  const accounts = new Accounts(':memory:', {
    clock: () => new Date(clock.now).toISOString(),
  });
  accounts.seed(demoAccounts);
  const lab = new Laboratory(':memory:', {
    credentials: accounts,
    people: () => accounts.people(),
  });
  const server = createServer(
    api(lab, { accounts, sessions: new Sessions(() => clock.now), mode }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    lab.close();
    accounts.close();
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown, headers = {}) =>
    fetch(url + path, {
      method: 'POST',
      headers: { ...json, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  async function signIn(username: string, password: string) {
    const response = await post('/api/sign-in', { username, password });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie')!;
    return { Cookie: cookie.split(';')[0] };
  }
  /** Posts raw file bytes to the attachment route. */
  const upload = (
    filename: string,
    contentType: string,
    body: Uint8Array,
    headers = {},
  ) =>
    fetch(`${url}/api/attachments?filename=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Content-Type': contentType, ...headers },
      body: new Uint8Array(body),
    });
  return { lab, accounts, url, clock, post, signIn, upload };
}

test('sign-in with correct credentials starts an HttpOnly session', async (t) => {
  const { url, post } = await serve(t);
  const response = await post('/api/sign-in', {
    username: 'coordinator',
    password: 'coordinator-demo',
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).user, {
    id: 'coordinator',
    name: 'Morgan Lee',
    role: 'coordinator',
  });
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /^benchline_session=[\w-]{40,};/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  const session = await fetch(url + '/api/session', {
    headers: { Cookie: cookie.split(';')[0] },
  });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user.name, 'Morgan Lee');
});

test('a One-time password starts no session; setting a new password signs the user in', async (t) => {
  const { lab, accounts, url, post } = await serve(t, 'production');
  const oneTimePassword = accounts.issueAccount(
    { username: 'robin', name: 'Robin Hale', role: 'analyst' },
    'System administrator (lab-server-user)',
    'Change record CR-2026-014',
    lab,
  );
  const signIn = await post('/api/sign-in', {
    username: 'robin',
    password: oneTimePassword,
  });
  assert.equal(signIn.status, 403);
  assert.equal(signIn.headers.get('set-cookie'), null);
  assert.deepEqual(await signIn.json(), {
    error:
      'This is a One-time password. Set a password of your own to continue.',
    code: 'oneTimePassword',
  });

  const short = await post('/api/password', {
    username: 'robin',
    password: oneTimePassword,
    newPassword: 'short',
  });
  assert.equal(short.status, 400);
  assert.deepEqual(await short.json(), {
    error: 'A password needs at least 12 characters.',
  });
  const wrong = await post('/api/password', {
    username: 'robin',
    password: 'not-the-one-time',
    newPassword: 'robin-own-password',
  });
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), {
    error: 'Incorrect username or password.',
  });

  const set = await post('/api/password', {
    username: 'robin',
    password: oneTimePassword,
    newPassword: 'robin-own-password',
  });
  assert.equal(set.status, 200);
  assert.deepEqual((await set.json()).user, {
    id: 'robin',
    name: 'Robin Hale',
    role: 'analyst',
  });
  const cookie = set.headers.get('set-cookie')!;
  assert.match(cookie, /Secure/);
  const session = await fetch(url + '/api/session', {
    headers: { Cookie: cookie.split(';')[0] },
  });
  assert.equal((await session.json()).user.id, 'robin');
});

test('an expired password starts no session and only sets a new one, and an expired One-time password is refused', async (t) => {
  const { lab, accounts, url, clock, post } = await serve(t);
  const oneTimePassword = accounts.issueAccount(
    { username: 'robin', name: 'Robin Hale', role: 'analyst' },
    'System administrator (lab-server-user)',
    'Change record CR-2026-014',
    lab,
  );
  clock.now += 90 * 24 * 3_600_000;

  const signIn = await post('/api/sign-in', {
    username: 'manager',
    password: 'manager-demo',
  });
  assert.equal(signIn.status, 403);
  assert.equal(signIn.headers.get('set-cookie'), null);
  assert.deepEqual(await signIn.json(), {
    error: 'Your password has expired. Set a new password to continue.',
    code: 'passwordExpired',
  });
  const set = await post('/api/password', {
    username: 'manager',
    password: 'manager-demo',
    newPassword: 'taylor-new-password',
  });
  assert.equal(set.status, 200);
  const session = await fetch(url + '/api/session', {
    headers: { Cookie: set.headers.get('set-cookie')!.split(';')[0] },
  });
  assert.equal((await session.json()).user.id, 'manager');

  const stale = await post('/api/sign-in', {
    username: 'robin',
    password: oneTimePassword,
  });
  assert.equal(stale.status, 403);
  assert.deepEqual(await stale.json(), {
    error:
      'This One-time password has expired. Ask the System administrator for a new one.',
    code: 'oneTimePasswordExpired',
  });
});

test('a signed-in user changes their own password with the current one, which ends their other sessions but not this one', async (t) => {
  const { url, post, signIn } = await serve(t);
  const here = await signIn('analyst', 'analyst-demo');
  const elsewhere = await signIn('analyst', 'analyst-demo');
  const manager = await signIn('manager', 'manager-demo');
  const status = async (headers: Record<string, string>) =>
    (await fetch(url + '/api/session', { headers })).status;
  const change = (body: object, headers: Record<string, string> = here) =>
    post('/api/own-password', body, headers);

  assert.equal(
    (
      await change(
        { password: 'analyst-demo', newPassword: 'alex-chosen-password' },
        {},
      )
    ).status,
    401,
  );
  const wrong = await change({
    password: 'not-mine',
    newPassword: 'alex-chosen-password',
  });
  assert.equal(wrong.status, 403);
  assert.deepEqual(await wrong.json(), {
    error: 'The current password is incorrect. Nothing was changed.',
  });
  const short = await change({ password: 'analyst-demo', newPassword: 'x' });
  assert.equal(short.status, 400);
  assert.deepEqual(await short.json(), {
    error: 'A password needs at least 12 characters.',
  });
  assert.equal(await status(elsewhere), 200);

  // A username in the request names nobody: only the signed-in user changes.
  const changed = await change({
    username: 'manager',
    password: 'analyst-demo',
    newPassword: 'alex-chosen-password',
  });
  assert.equal(changed.status, 200);
  assert.deepEqual(await changed.json(), { changed: true });
  assert.equal(await status(here), 200);
  assert.equal(await status(elsewhere), 401);
  assert.equal(await status(manager), 200);
  assert.equal(
    (
      await post('/api/sign-in', {
        username: 'manager',
        password: 'manager-demo',
      })
    ).status,
    200,
  );
  await signIn('analyst', 'alex-chosen-password');

  // Guessing the current password from a live session locks the account.
  for (let i = 1; i < 5; i++)
    assert.equal(
      (
        await change({
          password: `guess-${i}`,
          newPassword: 'another-password',
        })
      ).status,
      403,
    );
  const locked = await change({
    password: 'guess-5',
    newPassword: 'another-password',
  });
  assert.equal(locked.status, 401);
  assert.deepEqual(await locked.json(), {
    error: 'This account is locked. Contact the System administrator.',
    code: 'accountLocked',
  });
  assert.match(locked.headers.get('set-cookie')!, /Max-Age=0/);
  assert.equal(await status(here), 401);
});

test('wrong credentials are rejected with a clear message', async (t) => {
  const { post } = await serve(t);
  for (const body of [
    { username: 'coordinator', password: 'wrong' },
    { username: 'coordinator', password: 'analyst-demo' },
    { username: 'nobody', password: 'coordinator-demo' },
    // The Reviewer role is retired; its old demo account no longer exists.
    { username: 'reviewer', password: 'reviewer-demo' },
    { username: 'coordinator' },
  ]) {
    const response = await post('/api/sign-in', body);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.deepEqual(await response.json(), {
      error: 'Incorrect username or password.',
    });
  }
});

test('reads and writes without a valid session are rejected', async (t) => {
  const { lab, url, post } = await serve(t);
  assert.equal((await fetch(url + '/api/session')).status, 401);
  assert.equal((await fetch(url + '/api/workspace')).status, 401);
  // The retired demo actor header grants nothing.
  const withHeader = await post('/api/commands', receipt(), {
    'X-Demo-Actor': 'coordinator',
  });
  assert.equal(withHeader.status, 401);
  assert.match((await withHeader.json()).error, /Sign in/);
  const forged = await post('/api/commands', receipt(), {
    Cookie: 'benchline_session=forged-token',
  });
  assert.equal(forged.status, 401);
  assert.equal(lab.snapshot().samples.length, 0);
});

test('the actor for a command is the session user, not anything the browser claims', async (t) => {
  const { lab, url, post, signIn } = await serve(t);
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  const applied = await post('/api/commands', receipt(), {
    ...coordinator,
    'X-Demo-Actor': 'analyst',
  });
  assert.equal(applied.status, 200);
  assert.equal((await applied.json()).samples[0].receivedBy, 'coordinator');
  const workspace = await (
    await fetch(url + '/api/workspace', { headers: coordinator })
  ).json();
  assert.equal(workspace.submissions.length, 1);
  assert.equal(workspace.samples.length, 1);
  assert.ok(workspace.audit.length);
  assert.ok(
    workspace.audit.every((e: { actor: string }) => e.actor === 'coordinator'),
  );

  // An analyst cannot borrow the coordinator's role by claiming it.
  const analyst = await signIn('analyst', 'analyst-demo');
  const refused = await post('/api/commands', receipt(), {
    ...analyst,
    'X-Demo-Actor': 'coordinator',
  });
  assert.equal(refused.status, 403);
  assert.match((await refused.json()).error, /coordinator/);
  assert.equal(lab.snapshot().samples.length, 1);
});

test('cross-origin, malformed and oversized writes are still rejected', async (t) => {
  const { lab, post, signIn } = await serve(t);
  const session = await signIn('coordinator', 'coordinator-demo');
  const crossOrigin = { ...session, Origin: 'https://untrusted.example' };
  assert.equal(
    (await post('/api/commands', receipt(), crossOrigin)).status,
    403,
  );
  assert.equal(
    (
      await post(
        '/api/sign-in',
        { username: 'coordinator', password: 'coordinator-demo' },
        { Origin: 'https://untrusted.example' },
      )
    ).status,
    403,
  );
  assert.equal((await post('/api/sign-out', {}, crossOrigin)).status, 403);
  assert.equal((await post('/api/commands', '{', session)).status, 400);
  assert.equal(
    (
      await post(
        '/api/commands',
        { ...receipt(), clientReference: 'x'.repeat(40000) },
        session,
      )
    ).status,
    413,
  );
  assert.equal(lab.snapshot().samples.length, 0);
  // The session survived the rejected cross-origin sign-out.
  assert.equal((await post('/api/commands', receipt(), session)).status, 200);
});

test('sign-out ends the session', async (t) => {
  const { url, post, signIn } = await serve(t);
  const session = await signIn('coordinator', 'coordinator-demo');
  const out = await post('/api/sign-out', {}, session);
  assert.equal(out.status, 200);
  assert.match(out.headers.get('set-cookie')!, /Max-Age=0/);
  assert.equal(
    (await fetch(url + '/api/session', { headers: session })).status,
    401,
  );
  assert.equal((await post('/api/commands', receipt(), session)).status, 401);
});

test('an inactive session expires, and activity keeps it alive', async (t) => {
  const { url, clock, post, signIn } = await serve(t);
  const session = await signIn('coordinator', 'coordinator-demo');
  const check = async () =>
    (await fetch(url + '/api/session', { headers: session })).status;

  clock.now += IDLE_TIMEOUT_MS - 1000;
  assert.equal(await check(), 200);
  clock.now += IDLE_TIMEOUT_MS - 1000;
  assert.equal(await check(), 200);
  clock.now += IDLE_TIMEOUT_MS;
  assert.equal(await check(), 401);
  assert.equal((await post('/api/commands', receipt(), session)).status, 401);
});

/** Access events oldest first: act, account, actor, field, old and new value. */
const accessEvents = (lab: Laboratory) =>
  lab
    .auditTrail()
    .filter((e) => e.recordType === 'Account')
    .reverse()
    .map((e) => [
      e.commandType,
      e.recordId,
      e.actor,
      e.field,
      e.oldValue,
      e.newValue,
    ]);

test('sign-in, sign-out and session expiry are Access events', async (t) => {
  const { lab, url, clock, post, signIn } = await serve(t);
  const signedInAt = new Date(clock.now).toISOString();
  assert.equal(
    (
      await post('/api/sign-in', {
        username: 'coordinator',
        password: 'analyst-demo',
      })
    ).status,
    401,
  );
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  assert.equal((await post('/api/sign-out', {}, coordinator)).status, 200);
  // Signing out of a session that has already ended records nothing more.
  assert.equal((await post('/api/sign-out', {}, coordinator)).status, 200);
  const analyst = await signIn('analyst', 'analyst-demo');
  clock.now += IDLE_TIMEOUT_MS;
  assert.equal(
    (await fetch(url + '/api/session', { headers: analyst })).status,
    401,
  );
  assert.deepEqual(accessEvents(lab), [
    [
      'failedAttempt',
      'coordinator',
      'coordinator',
      'consecutiveFailedAttempts',
      0,
      1,
    ],
    ['signIn', 'coordinator', 'coordinator', 'session', null, 'signed in'],
    ['signIn', 'coordinator', 'coordinator', 'consecutiveFailedAttempts', 1, 0],
    ['signOut', 'coordinator', 'coordinator', 'session', 'signed in', null],
    ['signIn', 'analyst', 'analyst', 'session', null, 'signed in'],
    ['sessionExpiry', 'analyst', 'Benchline', 'session', 'signed in', null],
  ]);
  assert.equal(
    lab.auditTrail()[0].reason,
    `Ended after 15 minutes without activity; last active ${signedInAt}`,
  );
  const trail = JSON.stringify(lab.auditTrail());
  for (const password of ['coordinator-demo', 'analyst-demo'])
    assert.ok(!trail.includes(password));
});

test('locking an account on a signature ends its sessions, and its own password no longer signs in', async (t) => {
  const { lab, url, post, signIn, upload } = await serve(t);
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  const analyst = await signIn('analyst', 'analyst-demo');
  const elsewhere = await signIn('analyst', 'analyst-demo');
  const command = (body: object, session: object) =>
    post('/api/commands', { commandId: newCommandId(), ...body }, session);
  let sample = (await (await command(receipt(), coordinator)).json())
    .samples[0];
  const act = async (body: object, session: object) => {
    const response = await command(
      { sampleId: sample.id, revision: sample.revision, ...body },
      session,
    );
    if (response.status === 200) sample = (await response.json()).samples[0];
    return response;
  };
  await act({ type: 'assign', assignee: 'analyst' }, coordinator);
  const { attachment } = await (
    await upload('sheet.csv', 'text/csv', Buffer.from('a,b\n1,2\n'), analyst)
  ).json();
  await act(
    {
      type: 'enterResult',
      testId: 'NIT-001-v1',
      value: 0.02,
      instrumentReading: 0.2,
      sequenceId: 'SEQ-0001',
      analysedOn: laboratoryDay(new Date().toISOString()),
      attachmentId: attachment.id,
      reason: '',
    },
    analyst,
  );
  const submit = { type: 'submitForApproval', password: 'wrong' };
  for (let i = 0; i < 4; i++)
    assert.equal((await act(submit, analyst)).status, 403);
  const locked = await act(submit, analyst);
  assert.equal(locked.status, 401);
  assert.deepEqual(await locked.json(), {
    error:
      'This account is locked, so nothing was signed or saved. Contact the System administrator.',
    code: 'accountLocked',
  });
  assert.match(locked.headers.get('set-cookie')!, /Max-Age=0/);
  for (const session of [analyst, elsewhere])
    assert.equal(
      (await fetch(url + '/api/session', { headers: session })).status,
      401,
    );
  const refused = await post('/api/sign-in', {
    username: 'analyst',
    password: 'analyst-demo',
  });
  assert.equal(refused.status, 403);
  assert.equal(refused.headers.get('set-cookie'), null);
  assert.deepEqual(await refused.json(), {
    error: 'This account is locked. Contact the System administrator.',
    code: 'accountLocked',
  });
  assert.equal(lab.snapshot().samples[0].status, 'In progress');
  assert.equal(lab.snapshot().signatures.length, 0);
});

test('a lock from Failed attempts at sign-in ends the sessions already open', async (t) => {
  const { lab, url, post, signIn } = await serve(t);
  const manager = await signIn('manager', 'manager-demo');
  const guess = (i: number) =>
    post('/api/sign-in', { username: 'manager', password: `guess-${i}` });
  for (let i = 0; i < 4; i++) {
    const response = await guess(i);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: 'Incorrect username or password.',
    });
  }
  const locking = await guess(4);
  assert.equal(locking.status, 403);
  assert.deepEqual(await locking.json(), {
    error: 'This account is locked. Contact the System administrator.',
    code: 'accountLocked',
  });
  // The session ended with the lock, so signing out of it records nothing.
  assert.equal((await post('/api/sign-out', {}, manager)).status, 200);
  assert.equal(
    (await fetch(url + '/api/session', { headers: manager })).status,
    401,
  );
  assert.deepEqual(
    accessEvents(lab)
      .map(([act]) => act)
      .filter((act) => act !== 'failedAttempt'),
    ['signIn', 'lockout', 'lockoutNotice'],
  );
});

test('in production the Accounts screen is refused, even to the Admin, and the session cookie is Secure', async (t) => {
  // Accounts are seeded here only to have an Admin to sign in as; production
  // itself never adds them.
  const { url, post, signIn } = await serve(t, 'production');
  assert.deepEqual(await (await fetch(url + '/api/instance')).json(), {
    mode: 'production',
  });
  const signedIn = await post('/api/sign-in', {
    username: 'admin',
    password: 'admin-demo',
  });
  assert.match(signedIn.headers.get('set-cookie')!, /; Secure/);
  const admin = await signIn('admin', 'admin-demo');

  const listing = await fetch(url + '/api/accounts', { headers: admin });
  const change = await post(
    '/api/accounts',
    { type: 'unlockAccount', username: 'manager' },
    admin,
  );
  const nested = await fetch(url + '/api/accounts/admin', { headers: admin });
  for (const refused of [listing, change, nested]) {
    assert.equal(refused.status, 403);
    assert.deepEqual(await refused.json(), {
      error:
        'Accounts are not managed in the workspace in production. The System administrator manages them on the lab server.',
    });
  }
  const signedOut = await post('/api/sign-out', {}, admin);
  assert.match(signedOut.headers.get('set-cookie')!, /; Secure/);

  // The browser reaches production through the TLS reverse proxy, so its own
  // origin is https; plain http from the browser is not this origin.
  const host = new URL(url).host;
  const credentials = { username: 'admin', password: 'admin-demo' };
  assert.equal(
    (await post('/api/sign-in', credentials, { Origin: `https://${host}` }))
      .status,
    200,
  );
  assert.equal(
    (await post('/api/sign-in', credentials, { Origin: `http://${host}` }))
      .status,
    403,
  );
});

test('the demo reports its mode and keeps a session cookie without Secure', async (t) => {
  const { url, post } = await serve(t);
  assert.deepEqual(await (await fetch(url + '/api/instance')).json(), {
    mode: 'demo',
  });
  const signedIn = await post('/api/sign-in', {
    username: 'admin',
    password: 'admin-demo',
  });
  assert.doesNotMatch(signedIn.headers.get('set-cookie')!, /Secure/);
});

test('only the Admin manages accounts over HTTP, and a deactivated user is signed out', async (t) => {
  const { url, post, signIn } = await serve(t);
  const admin = await signIn('admin', 'admin-demo');
  const analyst = await signIn('analyst', 'analyst-demo');
  const accountsOf = (session: Record<string, string>) =>
    fetch(url + '/api/accounts', { headers: session });

  assert.equal((await fetch(url + '/api/accounts')).status, 401);
  assert.equal((await accountsOf(analyst)).status, 403);
  const refused = await post(
    '/api/accounts',
    { type: 'unlockAccount', username: 'manager' },
    analyst,
  );
  assert.equal(refused.status, 403);
  assert.deepEqual(await refused.json(), {
    error: 'Only the Admin manages accounts.',
  });
  assert.equal(
    (
      await post(
        '/api/accounts',
        { type: 'unlockAccount', username: 'manager' },
        { ...admin, Origin: 'https://untrusted.example' },
      )
    ).status,
    403,
  );

  const listing = await (await accountsOf(admin)).text();
  assert.deepEqual(
    JSON.parse(listing).accounts.map((a: { id: string }) => a.id),
    ['coordinator', 'analyst', 'analyst-2', 'manager', 'admin', 'quality-lead'],
  );
  assert.ok(!listing.includes('scrypt'), 'no password hash is listed');

  const added = await post(
    '/api/accounts',
    {
      type: 'addAccount',
      username: 'analyst-3',
      name: 'Robin Diaz',
      role: 'analyst',
      password: 'robin-password',
    },
    admin,
  );
  assert.equal(added.status, 200);
  assert.equal((await added.json()).accounts.at(-1).name, 'Robin Diaz');
  const workspace = await (
    await fetch(url + '/api/workspace', { headers: admin })
  ).json();
  assert.deepEqual(workspace.people.at(-1), {
    id: 'analyst-3',
    name: 'Robin Diaz',
    role: 'analyst',
    active: true,
  });
  const duplicate = await post(
    '/api/accounts',
    {
      type: 'addAccount',
      username: 'analyst-3',
      name: 'Someone Else',
      role: 'analyst',
      password: 'another-password',
    },
    admin,
  );
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), {
    error: 'The username analyst-3 is already taken.',
  });

  const deactivated = await post(
    '/api/accounts',
    { type: 'updateAccount', username: 'analyst', active: false },
    admin,
  );
  assert.equal(deactivated.status, 200);
  assert.equal(
    (await fetch(url + '/api/session', { headers: analyst })).status,
    401,
  );
  assert.equal(
    (
      await post('/api/sign-in', {
        username: 'analyst',
        password: 'analyst-demo',
      })
    ).status,
    401,
  );
});

test('a wrong signing password is refused without ending the session', async (t) => {
  const { url, post, signIn, upload } = await serve(t);
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  const analyst = await signIn('analyst', 'analyst-demo');
  const command = async (body: object, session: object) => {
    const response = await post(
      '/api/commands',
      { commandId: newCommandId(), ...body },
      session,
    );
    return { status: response.status, body: await response.json() };
  };
  let sample = (await command(receipt(), coordinator)).body.samples[0];
  const act = async (body: object, session: object) => {
    const response = await command(
      { sampleId: sample.id, revision: sample.revision, ...body },
      session,
    );
    if (response.status === 200) sample = response.body.samples[0];
    return response;
  };
  await act({ type: 'assign', assignee: 'analyst' }, coordinator);
  const { attachment } = await (
    await upload('sheet.csv', 'text/csv', Buffer.from('a,b\n1,2\n'), analyst)
  ).json();
  await act(
    {
      type: 'enterResult',
      testId: 'NIT-001-v1',
      value: 0.02,
      instrumentReading: 0.2,
      sequenceId: 'SEQ-0001',
      analysedOn: laboratoryDay(new Date().toISOString()),
      attachmentId: attachment.id,
      reason: '',
    },
    analyst,
  );
  const wrong = await act(
    { type: 'submitForApproval', password: 'coordinator-demo' },
    analyst,
  );
  // 403, not 401: the signer stays signed in and can re-enter the password.
  assert.equal(wrong.status, 403);
  assert.match(wrong.body.error, /password is incorrect/);
  assert.equal(
    (await fetch(url + '/api/session', { headers: analyst })).status,
    200,
  );
  const signed = await act(
    { type: 'submitForApproval', password: 'analyst-demo' },
    analyst,
  );
  assert.equal(signed.status, 200);
  assert.equal(signed.body.samples[0].status, 'Awaiting approval');
  const workspace = await (
    await fetch(url + '/api/workspace', { headers: analyst })
  ).text();
  assert.equal(JSON.parse(workspace).signatures[0].printedName, 'Alex Chen');
  assert.ok(!workspace.includes('analyst-demo'));
});

const MB = 1024 * 1024;
const pdf = (size: number) => {
  const bytes = Buffer.alloc(size, 0x20);
  bytes.write('%PDF-1.7\n');
  return bytes;
};

test('uploading a worksheet needs a session, the same origin and an Analyst', async (t) => {
  const { lab, upload, signIn } = await serve(t);
  const anonymous = await upload('sheet.pdf', 'application/pdf', pdf(1000));
  assert.equal(anonymous.status, 401);
  assert.match((await anonymous.json()).error, /Sign in/);
  const forged = await upload('sheet.pdf', 'application/pdf', pdf(1000), {
    Cookie: 'benchline_session=forged-token',
  });
  assert.equal(forged.status, 401);
  const analyst = await signIn('analyst', 'analyst-demo');
  const crossOrigin = await upload('sheet.pdf', 'application/pdf', pdf(1000), {
    ...analyst,
    Origin: 'https://untrusted.example',
  });
  assert.equal(crossOrigin.status, 403);
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  assert.equal(
    (await upload('sheet.pdf', 'application/pdf', pdf(1000), coordinator))
      .status,
    403,
  );
  assert.equal(lab.snapshot().attachments.length, 0);
});

test('worksheet uploads are limited to 10 MB and the accepted file types', async (t) => {
  const { lab, upload, signIn } = await serve(t);
  const analyst = await signIn('analyst', 'analyst-demo');
  const tooLarge = await upload(
    'big.pdf',
    'application/pdf',
    pdf(10 * MB + 1),
    analyst,
  );
  assert.equal(tooLarge.status, 413);
  assert.match((await tooLarge.json()).error, /10 MB/);
  for (const [filename, type, body] of [
    ['run.exe', 'application/octet-stream', Buffer.from('MZ')],
    ['notes.txt', 'text/plain', Buffer.from('hello')],
    ['sheet.pdf', 'text/csv', pdf(100)],
    ['photo.png', 'image/png', pdf(100)],
    ['sheet.xls', 'application/vnd.ms-excel', Buffer.from('not ole')],
  ] as const) {
    const refused = await upload(filename, type, body, analyst);
    assert.equal(refused.status, 415, filename);
  }
  assert.equal(
    (await upload('empty.csv', 'text/csv', new Uint8Array(0), analyst)).status,
    400,
  );
  assert.equal(lab.snapshot().attachments.length, 0);

  // The command route's 32 KB limit does not apply: 10 MB exactly is accepted.
  const accepted = await upload(
    'full.pdf',
    'application/pdf',
    pdf(10 * MB),
    analyst,
  );
  assert.equal(accepted.status, 201);
  assert.equal((await accepted.json()).attachment.size, 10 * MB);
  for (const [filename, type, bytes] of [
    ['sheet.csv', 'text/csv; charset=utf-8', Buffer.from('a,b\n1,2\n')],
    ['photo.jpeg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0])],
    [
      'calc.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]),
    ],
  ] as const)
    assert.equal(
      (await upload(filename, type, bytes, analyst)).status,
      201,
      filename,
    );
});

test('a Result carries its worksheet, which Analyst and Manager download intact', async (t) => {
  const { lab, url, post, signIn, upload } = await serve(t);
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  const analyst = await signIn('analyst', 'analyst-demo');
  const manager = await signIn('manager', 'manager-demo');
  let sample = (
    await (await post('/api/commands', receipt(), coordinator)).json()
  ).samples[0];
  sample = (
    await (
      await post(
        '/api/commands',
        {
          commandId: newCommandId(),
          type: 'assign',
          sampleId: sample.id,
          revision: sample.revision,
          assignee: 'analyst',
        },
        coordinator,
      )
    ).json()
  ).samples[0];

  const bytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 250, 251, 252,
  ]);
  const uploaded = await upload('Calcul feuille é.png', 'image/png', bytes, {
    ...analyst,
    'X-Demo-Actor': 'manager',
  });
  assert.equal(uploaded.status, 201);
  const { attachment } = await uploaded.json();
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(attachment.sha256, hash);
  assert.equal(attachment.size, bytes.byteLength);
  assert.equal(attachment.contentType, 'image/png');
  assert.equal(attachment.filename, 'Calcul feuille é.png');
  assert.equal(
    attachment.uploadedBy,
    'analyst',
    'the uploader is the session user',
  );
  assert.match(attachment.uploadedAt, /^\d{4}-\d{2}-\d{2}T/);

  const entry = (attachmentId: string) => ({
    commandId: newCommandId(),
    type: 'enterResult',
    sampleId: sample.id,
    revision: sample.revision,
    testId: sample.tests[0].id,
    value: 0.05,
    instrumentReading: 1.2,
    sequenceId: 'SEQ-1',
    analysedOn: laboratoryDay(new Date().toISOString()),
    attachmentId,
    reason: '',
  });
  const unknown = await post('/api/commands', entry(newCommandId()), analyst);
  assert.equal(unknown.status, 400);
  assert.match(
    (await unknown.json()).error,
    /worksheet attachment was not found/,
  );
  const entered = await post('/api/commands', entry(attachment.id), analyst);
  assert.equal(entered.status, 200);
  const result = (await entered.json()).samples[0].tests[0].results[0];
  assert.equal(result.attachmentId, attachment.id);

  for (const session of [analyst, manager]) {
    const workspace = await (
      await fetch(url + '/api/workspace', { headers: session })
    ).json();
    const id = workspace.samples[0].tests[0].results[0].attachmentId;
    assert.deepEqual(
      workspace.attachments.find((a: { id: string }) => a.id === id),
      attachment,
    );
    const download = await fetch(`${url}/api/attachments/${id}`, {
      headers: session,
    });
    assert.equal(download.status, 200);
    const received = Buffer.from(await download.arrayBuffer());
    assert.equal(createHash('sha256').update(received).digest('hex'), hash);
    assert.deepEqual(received, bytes);
    assert.equal(download.headers.get('content-type'), 'image/png');
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(
      download.headers.get('repr-digest'),
      `sha-256=:${Buffer.from(hash, 'hex').toString('base64')}:`,
    );
    assert.match(
      download.headers.get('content-disposition')!,
      /^attachment; .*filename\*=UTF-8''Calcul%20feuille%20%C3%A9\.png$/,
    );
  }

  // No route replaces stored content, and downloads need a session.
  for (const method of ['PUT', 'POST', 'DELETE'])
    assert.equal(
      (
        await fetch(`${url}/api/attachments/${attachment.id}`, {
          method,
          headers: { ...analyst, 'Content-Type': 'image/png' },
          body: method === 'DELETE' ? undefined : Buffer.from('replacement'),
        })
      ).status,
      404,
      method,
    );
  assert.equal(
    (await fetch(`${url}/api/attachments/${attachment.id}`)).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${url}/api/attachments/${newCommandId()}`, {
        headers: manager,
      })
    ).status,
    404,
  );
  const again = Buffer.from(
    await (
      await fetch(`${url}/api/attachments/${attachment.id}`, {
        headers: manager,
      })
    ).arrayBuffer(),
  );
  assert.deepEqual(again, bytes);
  assert.equal(lab.snapshot().attachments.length, 1);
});

test("an approved Sample's Certificate is retrieved by signed-in users", async (t) => {
  const { url, post, signIn, upload } = await serve(t);
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  const analyst = await signIn('analyst', 'analyst-demo');
  const manager = await signIn('manager', 'manager-demo');
  const command = async (body: object, session: object) => {
    const response = await post(
      '/api/commands',
      { commandId: newCommandId(), ...body },
      session,
    );
    assert.equal(response.status, 200);
    return (await response.json()).samples[0];
  };
  let sample = await command(receipt(), coordinator);
  const act = async (body: object, session: object) => {
    sample = await command(
      { sampleId: sample.id, revision: sample.revision, ...body },
      session,
    );
  };
  const get = (path: string, headers = {}) => fetch(url + path, { headers });
  const path = `/api/samples/${sample.id}/certificates`;
  assert.deepEqual(await (await get(path, coordinator)).json(), {
    certificates: [],
  });
  assert.equal((await get(`${path}/1`, coordinator)).status, 404);

  await act({ type: 'assign', assignee: 'analyst' }, coordinator);
  const { attachment } = await (
    await upload('sheet.csv', 'text/csv', Buffer.from('a,b\n1,2\n'), analyst)
  ).json();
  await act(
    {
      type: 'enterResult',
      testId: 'NIT-001-v1',
      value: 0.05,
      instrumentReading: 0.5,
      sequenceId: 'SEQ-0001',
      analysedOn: laboratoryDay(new Date().toISOString()),
      attachmentId: attachment.id,
      reason: '',
    },
    analyst,
  );
  await act({ type: 'submitForApproval', password: 'analyst-demo' }, analyst);
  await act({ type: 'approve', password: 'manager-demo' }, manager);
  assert.equal(sample.status, 'Approved');

  // Publishing is a command like any other, the Coordinator's alone.
  const { certificate: issued } = await (
    await get(`${path}/1`, coordinator)
  ).json();
  const publication = {
    type: 'publish',
    recipients: ['QA Release, Northstar Pharma'],
    channel: 'print',
    channelDetail: '',
    publishedAt: issued.approvedAt,
  };
  const refused = await post(
    '/api/commands',
    {
      commandId: newCommandId(),
      sampleId: sample.id,
      revision: sample.revision,
      ...publication,
    },
    manager,
  );
  assert.equal(refused.status, 403);
  await act(publication, coordinator);
  assert.equal(sample.status, 'Published');

  for (const session of [coordinator, analyst, manager]) {
    const response = await get(`${path}/1`, session);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { certificate } = await response.json();
    assert.equal(certificate.sampleId, sample.id);
    assert.equal(certificate.version, 1);
    assert.equal(certificate.content.results[0].conformity, 'Report');
    assert.deepEqual(certificate.publication, {
      sampleId: sample.id,
      version: 1,
      recipients: ['QA Release, Northstar Pharma'],
      channel: 'print',
      channelDetail: '',
      publishedAt: issued.approvedAt,
      publishedBy: 'coordinator',
      recordedAt: certificate.publication.recordedAt,
    });
    assert.deepEqual(
      certificate.content.signatures.map(
        (x: { meaning: string; printedName: string }) => [
          x.meaning,
          x.printedName,
        ],
      ),
      [
        ['performed by', 'Alex Chen'],
        ['approved by', 'Taylor Brooks'],
      ],
    );
    assert.deepEqual(await (await get(path, session)).json(), {
      certificates: [certificate],
    });
  }
  const workspace = await (await get('/api/workspace', manager)).json();
  assert.equal(workspace.certificates[0].version, 1);

  assert.equal((await get(path)).status, 401);
  assert.equal((await get(`${path}/1`)).status, 401);
  assert.equal(
    (await get(`${path}/1`, { Cookie: 'benchline_session=forged' })).status,
    401,
  );
  assert.equal((await get(`${path}/2`, manager)).status, 404);
  assert.equal(
    (await get('/api/samples/26-99999/certificates/1', manager)).status,
    404,
  );
  // No route replaces or adds a Certificate.
  assert.equal((await post(`${path}/1`, {}, manager)).status, 404);
});

test('an Admin signs in and acts in every role over HTTP, as themselves and within separation of duties', async (t) => {
  const { lab, url, post, signIn, upload } = await serve(t);
  const response = await post('/api/sign-in', {
    username: 'admin',
    password: 'admin-demo',
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).user, {
    id: 'admin',
    name: 'Jordan Park',
    role: 'admin',
  });
  const admin = await signIn('admin', 'admin-demo');

  const received = await post('/api/commands', receipt(), admin);
  assert.equal(received.status, 200);
  let sample = (await received.json()).samples[0];
  assert.equal(sample.receivedBy, 'admin');
  const act = async (command: object, status = 200) => {
    const r = await post(
      '/api/commands',
      {
        commandId: newCommandId(),
        sampleId: sample.id,
        revision: sample.revision,
        ...command,
      },
      admin,
    );
    const body = await r.json();
    assert.equal(r.status, status, JSON.stringify(body));
    if (r.status === 200) sample = body.samples[0];
    return body;
  };
  await act({ type: 'assign', assignee: 'admin' });
  const stored = await upload(
    'sheet.csv',
    'text/csv',
    Buffer.from('a,b\n1,2\n'),
    admin,
  );
  assert.equal(stored.status, 201);
  const { attachment } = await stored.json();
  await act({
    type: 'enterResult',
    testId: 'NIT-001-v1',
    value: 0.02,
    instrumentReading: 0.2,
    sequenceId: 'SEQ-0001',
    analysedOn: laboratoryDay(new Date().toISOString()),
    attachmentId: attachment.id,
    reason: '',
  });
  const wrong = await act(
    { type: 'submitForApproval', password: 'coordinator-demo' },
    403,
  );
  assert.match(wrong.error, /password is incorrect/);
  await act({ type: 'submitForApproval', password: 'admin-demo' });
  assert.equal(sample.status, 'Awaiting approval');
  const refused = await act({ type: 'approve', password: 'admin-demo' }, 403);
  assert.equal(
    refused.error,
    'You entered a Result on Impurity A (NIT-001 v1), so another Manager must give Approval.',
  );
  assert.equal(lab.snapshot().samples[0].status, 'Awaiting approval');

  const workspace = await (
    await fetch(url + '/api/workspace', { headers: admin })
  ).json();
  assert.ok(
    workspace.audit.every((e: { actor: string }) => e.actor === 'admin'),
  );
});

test('a Quality lead signs in and reads every Sample and the lab-wide audit trail, and every write is refused', async (t) => {
  const { url, post, signIn, upload } = await serve(t);
  const coordinator = await signIn('coordinator', 'coordinator-demo');
  assert.equal(
    (await post('/api/commands', receipt(), coordinator)).status,
    200,
  );
  const qualityLead = await signIn('quality-lead', 'quality-lead-demo');

  const workspace = await fetch(`${url}/api/workspace`, {
    headers: qualityLead,
  });
  assert.equal(workspace.status, 200);
  const snapshot = await workspace.json();
  assert.equal(snapshot.samples.length, 1);
  assert.ok(
    snapshot.audit.some(
      (e: { commandType: string; recordId: string }) =>
        e.commandType === 'signIn' && e.recordId === 'quality-lead',
    ),
    'the lab-wide audit trail, Access events included',
  );

  const refusal = {
    error:
      'The Quality lead reviews the laboratory record and runs no command.',
  };
  const received = await post('/api/commands', receipt(), qualityLead);
  assert.equal(received.status, 403);
  assert.deepEqual(await received.json(), refusal);
  const uploaded = await upload(
    'worksheet.csv',
    'text/csv',
    Buffer.from('reading,result\n1.25,2.5\n'),
    qualityLead,
  );
  assert.equal(uploaded.status, 403);
  assert.deepEqual(await uploaded.json(), refusal);
  const accounts = await fetch(`${url}/api/accounts`, { headers: qualityLead });
  assert.equal(accounts.status, 403);
});
