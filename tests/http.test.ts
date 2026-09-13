import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { api } from '../server/http.ts';
import { IDLE_TIMEOUT_MS, Sessions } from '../server/sessions.ts';
import { newCommandId } from '../src/laboratory/contracts.ts';

const json = { 'Content-Type': 'application/json' };
const receipt = () => ({
  commandId: newCommandId(),
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
});

/** A real server on an ephemeral port over an in-memory core, with a clock
 * the test can move to exercise session inactivity. */
async function serve(t: TestContext) {
  const accounts = new Accounts(':memory:');
  accounts.seed(demoAccounts);
  const lab = new Laboratory(':memory:', { credentials: accounts });
  const clock = { now: Date.parse('2026-09-13T09:00:00Z') };
  const server = createServer(
    api(lab, { accounts, sessions: new Sessions(() => clock.now) }),
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
  return { lab, url, clock, post, signIn };
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

test('a wrong signing password is refused without ending the session', async (t) => {
  const { url, post, signIn } = await serve(t);
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
  await act(
    {
      type: 'enterResult',
      testId: 'NIT-001-v1',
      value: 0.02,
      instrumentReading: 0.2,
      sequenceId: 'SEQ-0001',
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
