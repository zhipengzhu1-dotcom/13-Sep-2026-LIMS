import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import {
  hasException,
  newCommandId,
  type Sample,
} from '../src/laboratory/contracts.ts';

const receipt = {
  type: 'receive',
  product: 'Demo API',
  client: 'Fictional Pharma',
  batch: 'B-001',
  dueDate: '2026-10-01',
  priority: 'Routine',
  notes: '',
  methodIds: ['assay', 'water'],
};
const target = (s: Sample) => ({ sampleId: s.id, revision: s.revision });

/** Mints a fresh key per call — a distinct laboratory act — and unwraps the
 * outcome. Tests that exercise replay pass their own commandId instead. */
function run(lab: Laboratory, command: object, actor: string): Sample {
  return lab.execute({ commandId: newCommandId(), ...command }, actor).sample;
}
function assigned(lab: Laboratory) {
  const s = run(lab, receipt, 'coordinator');
  return run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
}
function recorded(lab: Laboratory, s: Sample, assay = 100) {
  s = run(
    lab,
    {
      type: 'record',
      ...target(s),
      testId: 'assay',
      value: assay,
      reference: 'RUN-001',
      reason: '',
    },
    'analyst',
  );
  return run(
    lab,
    {
      type: 'record',
      ...target(s),
      testId: 'water',
      value: 0.1,
      reference: 'RUN-002',
      reason: '',
    },
    'analyst',
  );
}
function memory(t: { after: (fn: () => void) => void }) {
  const lab = new Laboratory(':memory:', () => '2026-09-10T12:00:00.000Z');
  t.after(() => lab.close());
  return lab;
}

test('complete sample-to-review workflow persists provenance and locks approved records', (t) => {
  const lab = memory(t);
  let s = recorded(lab, assigned(lab));
  s = run(lab, { type: 'submit', ...target(s) }, 'analyst');
  s = run(
    lab,
    {
      type: 'review',
      ...target(s),
      decision: 'approve',
      comment: 'Reviewed supporting references.',
    },
    'reviewer',
  );
  assert.equal(s.status, 'Approved');
  assert.equal(lab.snapshot().activity.length, 6);
  assert.equal(s.tests[0].results[0].analyst, 'analyst');
  assert.equal(s.tests[0].method, 'DEMO-HPLC-001 · v1');
  assert.throws(
    () =>
      run(
        lab,
        { type: 'assign', ...target(s), assignee: 'analyst-2' },
        'coordinator',
      ),
    /locked/,
  );
});
test('incomplete and unassigned samples cannot be submitted', (t) => {
  const lab = memory(t);
  let s = run(lab, receipt, 'coordinator');
  assert.throws(
    () => run(lab, { type: 'submit', ...target(s) }, 'analyst'),
    /assigned analyst/,
  );
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  assert.throws(
    () => run(lab, { type: 'submit', ...target(s) }, 'analyst'),
    /every requested test/,
  );
  assert.equal(lab.snapshot().activity.length, 2);
});
test('unauthorized actors cannot receive, record, or review', (t) => {
  const lab = memory(t);
  assert.throws(() => run(lab, receipt, 'analyst'), /coordinator/);
  assert.throws(() => run(lab, receipt, 'unknown'), /Unknown user/);
  let s = assigned(lab);
  const result = {
    type: 'record',
    ...target(s),
    testId: 'assay',
    value: 100,
    reference: 'RUN',
    reason: '',
  };
  assert.throws(() => run(lab, result, 'coordinator'), /analyst/);
  assert.throws(() => run(lab, result, 'analyst-2'), /assigned analyst/);
  s = recorded(lab, s);
  s = run(lab, { type: 'submit', ...target(s) }, 'analyst');
  assert.throws(
    () =>
      run(
        lab,
        {
          type: 'review',
          ...target(s),
          decision: 'approve',
          comment: 'My results',
        },
        'analyst',
      ),
    /reviewer/,
  );
});
test('submitted samples cannot be changed until the reviewer returns them', (t) => {
  const lab = memory(t);
  let s = recorded(lab, assigned(lab));
  s = run(lab, { type: 'submit', ...target(s) }, 'analyst');
  assert.throws(
    () =>
      run(
        lab,
        {
          type: 'record',
          ...target(s),
          testId: 'assay',
          value: 100.1,
          reference: 'RUN',
          reason: 'Correction',
        },
        'analyst',
      ),
    /stage/,
  );
  assert.throws(
    () =>
      run(
        lab,
        { type: 'assign', ...target(s), assignee: 'analyst-2' },
        'coordinator',
      ),
    /Return the sample/,
  );
  s = run(
    lab,
    {
      type: 'review',
      ...target(s),
      decision: 'return',
      comment: 'Correct reference identifier.',
    },
    'reviewer',
  );
  assert.equal(s.status, 'Returned');
  s = run(
    lab,
    {
      type: 'record',
      ...target(s),
      testId: 'assay',
      value: 100.1,
      reference: 'RUN-CORRECTED',
      reason: 'Transcription correction',
    },
    'analyst',
  );
  assert.deepEqual(
    s.tests[0].results.map((r) => r.value),
    [100, 100.1],
  );
  s = run(lab, { type: 'submit', ...target(s) }, 'analyst');
  s = run(
    lab,
    {
      type: 'review',
      ...target(s),
      decision: 'approve',
      comment: 'Correction checked.',
    },
    'reviewer',
  );
  assert.equal(s.status, 'Approved');
});
test('result revisions require reasons and failures preserve state and history', (t) => {
  const lab = memory(t);
  const s = recorded(lab, assigned(lab));
  const before = lab.snapshot();
  assert.throws(
    () =>
      run(
        lab,
        {
          type: 'record',
          ...target(s),
          testId: 'assay',
          value: 101,
          reference: 'RUN',
          reason: '',
        },
        'analyst',
      ),
    /reason/,
  );
  assert.deepEqual(lab.snapshot(), before);
});
test('historical OOS results continue to block approval after a passing revision', (t) => {
  const lab = memory(t);
  let s = recorded(lab, assigned(lab), 97);
  assert.equal(hasException(s), true);
  s = run(
    lab,
    {
      type: 'record',
      ...target(s),
      testId: 'assay',
      value: 100,
      reference: 'RUN-3',
      reason: 'Repeat test',
    },
    'analyst',
  );
  s = run(lab, { type: 'submit', ...target(s) }, 'analyst');
  assert.throws(
    () =>
      run(
        lab,
        {
          type: 'review',
          ...target(s),
          decision: 'approve',
          comment: 'Now passing',
        },
        'reviewer',
      ),
    /investigation/,
  );
  assert.equal(lab.snapshot().samples[0].status, 'In review');
});
test('specification endpoints are accepted and invalid numeric input is rejected', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  s = run(
    lab,
    {
      type: 'record',
      ...target(s),
      testId: 'assay',
      value: 98,
      reference: 'RUN',
      reason: '',
    },
    'analyst',
  );
  assert.equal(s.tests[0].results[0].inSpec, true);
  s = run(
    lab,
    {
      type: 'record',
      ...target(s),
      testId: 'assay',
      value: 102,
      reference: 'RUN',
      reason: 'Correction',
    },
    'analyst',
  );
  assert.equal(hasException(s), false);
  for (const value of [NaN, Infinity, '100', null])
    assert.throws(() =>
      run(
        lab,
        {
          type: 'record',
          ...target(s),
          testId: 'water',
          value,
          reference: 'RUN',
          reason: '',
        },
        'analyst',
      ),
    );
});
test('stale edits are rejected without overwriting newer work', (t) => {
  const lab = memory(t);
  const stale = assigned(lab);
  const current = run(
    lab,
    {
      type: 'record',
      ...target(stale),
      testId: 'water',
      value: 0.2,
      reference: 'RUN',
      reason: '',
    },
    'analyst',
  );
  assert.throws(
    () =>
      run(
        lab,
        {
          type: 'record',
          ...target(stale),
          testId: 'assay',
          value: 100,
          reference: 'RUN',
          reason: '',
        },
        'analyst',
      ),
    /changed/,
  );
  assert.deepEqual(lab.snapshot().samples[0], current);
});
test('receipt rejects unknown methods, duplicates, blank fields and invalid dates', (t) => {
  const lab = memory(t);
  for (const patch of [
    { methodIds: [] },
    { methodIds: ['missing'] },
    { methodIds: ['assay', 'assay'] },
    { product: '  ' },
    { dueDate: '2026-02-30' },
  ])
    assert.throws(() => run(lab, { ...receipt, ...patch }, 'coordinator'));
  assert.equal(lab.snapshot().samples.length, 0);
  assert.equal(lab.snapshot().activity.length, 0);
});
test('records and activity survive database reopen', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-persistence-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, 'test.sqlite');
  const first = new Laboratory(file);
  const s = recorded(first, assigned(first));
  const before = first.snapshot();
  first.close();
  const reopened = new Laboratory(file);
  t.after(() => reopened.close());
  assert.deepEqual(reopened.snapshot(), before);
  assert.equal(reopened.snapshot().samples[0].id, s.id);
});

test('the schema version is stamped once and is never stomped by reopening', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-schema-version-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, 'test.sqlite');
  const schemaVersion = () => {
    const db = new DatabaseSync(file);
    const row = db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    db.close();
    return row.user_version;
  };
  new Laboratory(file).close();
  assert.equal(schemaVersion(), 1, 'a new database is stamped at version 1');
  // A migration runner advances the version on its own connection and closes
  // before Laboratory is constructed, which is what #32 requires of it.
  const runner = new DatabaseSync(file);
  runner.exec('PRAGMA user_version=2');
  runner.close();
  const reopened = new Laboratory(file);
  t.after(() => reopened.close());
  assert.equal(
    schemaVersion(),
    2,
    'constructing Laboratory must not stomp a migrated schema version',
  );
});

test('a retried command is replayed, not applied a second time', () => {
  const lab = new Laboratory(':memory:');
  const command = { commandId: newCommandId(), ...receipt };
  const first = lab.execute(command, 'coordinator');
  const retry = lab.execute(command, 'coordinator');
  assert.equal(first.outcome, 'applied');
  assert.equal(retry.outcome, 'replayed');
  assert.equal(retry.sample.id, first.sample.id);
  assert.equal(lab.snapshot().samples.length, 1, 'one sample, not two');
  assert.equal(
    lab.snapshot().activity.length,
    1,
    'a replay writes no activity row',
  );
  if (retry.outcome === 'replayed')
    assert.equal(retry.originalActorId, 'coordinator');
  lab.close();
});

test('a genuinely repeated act under a fresh key is recorded separately', () => {
  const lab = new Laboratory(':memory:');
  // Two containers of the same product and batch, received the same day. The
  // bodies are byte-identical; only the key distinguishes them, which is why a
  // content-derived key would destroy the second.
  const one = run(lab, receipt, 'coordinator');
  const two = run(lab, receipt, 'coordinator');
  assert.notEqual(one.id, two.id);
  assert.equal(lab.snapshot().samples.length, 2);
  lab.close();
});

test('a reused key carrying a different body or actor is refused', () => {
  const lab = new Laboratory(':memory:');
  const commandId = newCommandId();
  lab.execute({ commandId, ...receipt }, 'coordinator');
  assert.throws(
    () => lab.execute({ commandId, ...receipt, batch: 'B-002' }, 'coordinator'),
    (e: Error & { status: number }) => e.status === 422,
    'a different body under the same key is a client defect, not a retry',
  );
  // Attributing an applied act to a second person is the one outcome that could
  // put the wrong name on a record, so it fails rather than reporting success.
  assert.throws(
    () => lab.execute({ commandId, ...receipt }, 'analyst'),
    (e: Error & { status: number }) => e.status === 422,
  );
  assert.equal(lab.snapshot().samples.length, 1);
  lab.close();
});

test('a rejected command releases its key and may be resubmitted', () => {
  const lab = new Laboratory(':memory:');
  const commandId = newCommandId();
  // Rejected by a role check, so the transaction rolls back and takes the claim
  // with it. Only committed effects are deduplicated.
  assert.throws(() => lab.execute({ commandId, ...receipt }, 'analyst'));
  const retried = lab.execute({ commandId, ...receipt }, 'coordinator');
  assert.equal(retried.outcome, 'applied', 'the same key is usable again');
  assert.equal(lab.snapshot().samples.length, 1);
  lab.close();
});
