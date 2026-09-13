import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { api } from '../server/http.ts';
import { newCommandId } from '../src/laboratory/contracts.ts';

test('HTTP transport validates writes and returns a persisted workspace', async (t) => {
  const lab = new Laboratory(':memory:');
  const server = createServer(api(lab));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    lab.close();
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const command = {
    commandId: newCommandId(),
    type: 'receive',
    product: 'Demo',
    client: 'Fictional',
    batch: '001',
    dueDate: '2026-10-01',
    priority: 'Routine',
    notes: '',
    methodIds: ['assay'],
  };
  const headers = {
    'Content-Type': 'application/json',
    'X-Demo-Actor': 'coordinator',
  };
  assert.equal(
    (
      await fetch(url + '/api/commands', {
        method: 'POST',
        headers,
        body: JSON.stringify(command),
      })
    ).status,
    200,
  );
  const snapshot = await (await fetch(url + '/api/workspace')).json();
  assert.equal(snapshot.samples.length, 1);
  assert.equal(snapshot.activity.length, 1);
  assert.equal(
    (await fetch(url + '/api/commands', { method: 'POST', headers, body: '{' }))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(url + '/api/commands', {
        method: 'POST',
        headers: { ...headers, Origin: 'https://untrusted.example' },
        body: JSON.stringify(command),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url + '/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url + '/api/commands', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...command, notes: 'x'.repeat(40000) }),
      })
    ).status,
    413,
  );
  assert.equal(lab.snapshot().samples.length, 1);
});
