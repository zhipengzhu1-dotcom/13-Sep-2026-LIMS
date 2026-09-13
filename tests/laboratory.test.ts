import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory, SCHEMA_VERSION } from '../src/laboratory/laboratory.ts';
import {
  enteredResultOn,
  newCommandId,
  type Sample,
} from '../src/laboratory/contracts.ts';

const finishedProduct = {
  product: 'Demo tablets 10 mg',
  batch: 'B-001',
  materialType: 'finished product',
  methodIds: ['NIT-001-v1', 'NIT-003-v1'],
  dueDate: '2026-10-01',
  priority: 'Routine',
};
const rawMaterial = {
  ...finishedProduct,
  product: 'Demo API',
  batch: 'API-001',
  materialType: 'raw material',
  methodIds: ['NIT-005-v1'],
};
const receipt = {
  type: 'receiveSubmission',
  client: 'Fictional Pharma',
  samples: [finishedProduct],
};
const target = (s: Sample) => ({ sampleId: s.id, revision: s.revision });

/** Mints a fresh key per call — a distinct laboratory act. Tests that exercise
 * replay pass their own commandId instead. */
function execute(lab: Laboratory, command: object, actor: string) {
  return lab.execute({ commandId: newCommandId(), ...command }, actor);
}
/** Runs a command and unwraps the first Sample it touched. */
function run(lab: Laboratory, command: object, actor: string): Sample {
  return execute(lab, command, actor).samples[0];
}
function assigned(lab: Laboratory) {
  const s = run(lab, receipt, 'coordinator');
  return run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
}
const result = (s: Sample, testId: string, value: number, reason = '') => ({
  type: 'enterResult',
  ...target(s),
  testId,
  value,
  reason,
});
function entered(lab: Laboratory, s: Sample, value = 2.5) {
  for (const t of s.tests) s = run(lab, result(s, t.id, value), 'analyst');
  return s;
}
function submitted(lab: Laboratory) {
  const s = entered(lab, assigned(lab));
  return run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
}
function memory(t: { after: (fn: () => void) => void }) {
  const lab = new Laboratory(':memory:', () => '2026-09-10T12:00:00.000Z');
  t.after(() => lab.close());
  return lab;
}

test('a Sample moves from receipt to Approval, keeps provenance and is then locked', (t) => {
  const lab = memory(t);
  let s = run(lab, receipt, 'coordinator');
  assert.equal(s.status, 'Received');
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  assert.equal(s.status, 'In progress');
  s = entered(lab, s);
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  assert.equal(s.status, 'Awaiting approval');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.equal(s.status, 'Approved');
  assert.equal(lab.snapshot().activity.length, 6);
  assert.equal(s.tests[0].results[0].enteredBy, 'analyst');
  assert.throws(
    () =>
      run(
        lab,
        { type: 'assign', ...target(s), assignee: 'analyst-2' },
        'coordinator',
      ),
    /locked/,
  );
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 1, 'Change'), 'analyst'),
    /locked/,
  );
  assert.throws(
    () =>
      run(lab, { type: 'return', ...target(s), comment: 'Late' }, 'manager'),
    /locked/,
  );
});

test('receiveSubmission creates one Submission and all its Samples with yearly identifiers', (t) => {
  const lab = memory(t);
  const first = execute(
    lab,
    { ...receipt, samples: [finishedProduct, rawMaterial] },
    'coordinator',
  );
  assert.equal(first.submission?.id, 'S26-0001');
  assert.deepEqual(
    first.samples.map((s) => s.id),
    ['26-00001', '26-00002'],
  );
  assert.deepEqual(first.submission?.sampleIds, ['26-00001', '26-00002']);
  assert.ok(first.samples.every((s) => s.submissionId === 'S26-0001'));
  assert.equal(first.submission?.receivedAt, '2026-09-10T12:00:00.000Z');
  assert.equal(first.submission?.receivedBy, 'coordinator');
  const second = execute(lab, receipt, 'coordinator');
  assert.equal(second.submission?.id, 'S26-0002');
  assert.equal(second.samples[0].id, '26-00003');
  assert.equal(lab.snapshot().submissions.length, 2);
  assert.equal(lab.snapshot().samples.length, 3);
});

test('a receipt with one invalid Sample creates nothing and consumes no identifier', (t) => {
  const lab = memory(t);
  const before = lab.snapshot();
  assert.throws(
    () =>
      run(
        lab,
        {
          ...receipt,
          samples: [
            finishedProduct,
            { ...rawMaterial, methodIds: ['NIT-999'] },
          ],
        },
        'coordinator',
      ),
    /Sample 2: Method NIT-999 is not available/,
  );
  assert.deepEqual(lab.snapshot(), before);
  const next = execute(lab, receipt, 'coordinator');
  assert.equal(next.submission?.id, 'S26-0001');
  assert.equal(next.samples[0].id, '26-00001');
});

test('identifier sequences reset each calendar year', (t) => {
  let now = '2026-12-31T23:59:00.000Z';
  const lab = new Laboratory(':memory:', () => now);
  t.after(() => lab.close());
  execute(
    lab,
    { ...receipt, samples: [finishedProduct, rawMaterial] },
    'coordinator',
  );
  now = '2027-01-01T00:01:00.000Z';
  const next = execute(lab, receipt, 'coordinator');
  assert.equal(next.submission?.id, 'S27-0001');
  assert.equal(next.samples[0].id, '27-00001');
  now = '2027-01-02T09:00:00.000Z';
  assert.equal(execute(lab, receipt, 'coordinator').submission?.id, 'S27-0002');
});

test('Tests snapshot Method code, version and Analyte, and the unit follows the Material type', (t) => {
  const lab = memory(t);
  const [product, material] = execute(
    lab,
    { ...receipt, samples: [finishedProduct, rawMaterial] },
    'coordinator',
  ).samples;
  assert.deepEqual(
    product.tests.map((x) => [
      x.methodCode,
      x.methodVersion,
      x.analyteName,
      x.technique,
      x.unit,
    ]),
    [
      ['NIT-001', 1, 'Impurity A', 'LC-MS/MS', 'ng/day'],
      ['NIT-003', 1, 'Impurity B', 'LC-MS/MS', 'ng/day'],
    ],
  );
  assert.deepEqual(
    material.tests.map((x) => [x.methodCode, x.analyteName, x.unit]),
    [['NIT-005', 'Impurity C', 'ppm']],
  );
  let s = run(
    lab,
    { type: 'assign', ...target(material), assignee: 'analyst' },
    'coordinator',
  );
  // A unit supplied by the client is not part of the command and is ignored.
  s = run(lab, { ...result(s, 'NIT-005-v1', 0.02), unit: 'ng/day' }, 'analyst');
  assert.equal(s.tests[0].results[0].unit, 'ppm');
});

test('receipt rejects unknown or duplicate Methods, blank fields, bad Material types and invalid dates', (t) => {
  const lab = memory(t);
  for (const patch of [
    { methodIds: [] },
    { methodIds: ['missing'] },
    { methodIds: ['NIT-001-v1', 'NIT-001-v1'] },
    { product: '  ' },
    { batch: '' },
    { materialType: 'tablet' },
    { dueDate: '2026-02-30' },
    { priority: 'Soon' },
  ])
    assert.throws(() =>
      run(
        lab,
        { ...receipt, samples: [{ ...finishedProduct, ...patch }] },
        'coordinator',
      ),
    );
  assert.throws(() => run(lab, { ...receipt, samples: [] }, 'coordinator'));
  assert.throws(() => run(lab, { ...receipt, client: ' ' }, 'coordinator'));
  assert.equal(lab.snapshot().submissions.length, 0);
  assert.equal(lab.snapshot().samples.length, 0);
  assert.equal(lab.snapshot().activity.length, 0);
});

test('incomplete and unassigned Samples cannot be submitted', (t) => {
  const lab = memory(t);
  let s = run(lab, receipt, 'coordinator');
  assert.throws(
    () => run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst'),
    /assigned analyst/,
  );
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = run(lab, result(s, 'NIT-001-v1', 1), 'analyst');
  assert.throws(
    () => run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst'),
    /every Test/,
  );
  assert.equal(lab.snapshot().activity.length, 3);
});

test('every command checks the role of the actor', (t) => {
  const lab = memory(t);
  for (const actor of ['analyst', 'manager'])
    assert.throws(() => run(lab, receipt, actor), /coordinator/);
  assert.throws(() => run(lab, receipt, 'unknown'), /Unknown user/);
  assert.throws(() => run(lab, receipt, 'reviewer'), /Unknown user/);
  let s = run(lab, receipt, 'coordinator');
  for (const actor of ['analyst', 'manager'])
    assert.throws(
      () =>
        run(lab, { type: 'assign', ...target(s), assignee: 'analyst' }, actor),
      /coordinator/,
    );
  assert.throws(
    () =>
      run(
        lab,
        { type: 'assign', ...target(s), assignee: 'manager' },
        'coordinator',
      ),
    /Select an analyst/,
  );
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  for (const actor of ['coordinator', 'manager'])
    assert.throws(
      () => run(lab, result(s, 'NIT-001-v1', 1), actor),
      /requires the analyst role/,
    );
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 1), 'analyst-2'),
    /assigned analyst/,
  );
  s = entered(lab, s);
  assert.throws(
    () => run(lab, { type: 'submitForApproval', ...target(s) }, 'manager'),
    /analyst/,
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  for (const actor of ['coordinator', 'analyst']) {
    assert.throws(
      () => run(lab, { type: 'approve', ...target(s) }, actor),
      /manager/,
    );
    assert.throws(
      () =>
        run(
          lab,
          { type: 'return', ...target(s), comment: 'Please fix' },
          actor,
        ),
      /manager/,
    );
  }
  assert.equal(lab.snapshot().samples[0].status, 'Awaiting approval');
});

test('a Manager is never independent of Results they entered', (t) => {
  const lab = memory(t);
  const s = submitted(lab);
  // Only an assigned Analyst can enter Results today, so the rule is checked
  // through the shared predicate that approve enforces; #15 makes a Manager's
  // own Amendment correction reachable through commands.
  assert.equal(enteredResultOn(s, 'analyst'), true);
  assert.equal(enteredResultOn(s, 'manager'), false);
  assert.equal(
    enteredResultOn(
      {
        ...s,
        tests: s.tests.map((x, i) =>
          i === 0
            ? {
                ...x,
                results: [
                  ...x.results,
                  { ...x.results[0], enteredBy: 'manager' },
                ],
              }
            : x,
        ),
      },
      'manager',
    ),
    true,
    'an earlier or later Result by the Manager counts, not only the current one',
  );
  assert.equal(
    run(lab, { type: 'approve', ...target(s) }, 'manager').status,
    'Approved',
  );
});

test('Samples awaiting approval cannot change until a Manager returns them with a comment', (t) => {
  const lab = memory(t);
  let s = submitted(lab);
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 3, 'Correction'), 'analyst'),
    /stage/,
  );
  assert.throws(
    () =>
      run(
        lab,
        { type: 'assign', ...target(s), assignee: 'analyst-2' },
        'coordinator',
      ),
    /Return the Sample/,
  );
  assert.throws(() =>
    run(lab, { type: 'return', ...target(s), comment: 'no' }, 'manager'),
  );
  s = run(
    lab,
    { type: 'return', ...target(s), comment: 'Check the dilution factor.' },
    'manager',
  );
  assert.equal(s.status, 'Returned');
  assert.deepEqual(s.lastReturn, {
    comment: 'Check the dilution factor.',
    by: 'manager',
    at: '2026-09-10T12:00:00.000Z',
  });
  assert.throws(
    () => run(lab, { type: 'approve', ...target(s) }, 'manager'),
    /awaiting approval/,
  );
  s = run(
    lab,
    result(s, 'NIT-001-v1', 3.1, 'Dilution factor corrected'),
    'analyst',
  );
  assert.deepEqual(
    s.tests[0].results.map((r) => [r.value, r.reason]),
    [
      [2.5, ''],
      [3.1, 'Dilution factor corrected'],
    ],
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  assert.equal(s.lastReturn, null);
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.equal(s.status, 'Approved');
});

test('a Coordinator may reassign a Sample before it is submitted', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst-2' },
    'coordinator',
  );
  assert.equal(s.assignee, 'analyst-2');
  assert.equal(s.status, 'In progress');
});

test('a changed Result needs a reason and a failure preserves state and history', (t) => {
  const lab = memory(t);
  const s = entered(lab, assigned(lab));
  const before = lab.snapshot();
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 4), 'analyst'),
    /reason/,
  );
  assert.deepEqual(lab.snapshot(), before);
});

test('Result values must be finite, non-negative numbers', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 0), 'analyst');
  assert.equal(s.tests[0].results[0].value, 0);
  for (const value of [-0.1, NaN, Infinity, '1', null])
    assert.throws(() =>
      run(lab, { ...result(s, 'NIT-003-v1', 0), value }, 'analyst'),
    );
  assert.throws(
    () => run(lab, result(s, 'NIT-005-v1', 1), 'analyst'),
    /Test not found/,
  );
});

test('stale edits are rejected without overwriting newer work', (t) => {
  const lab = memory(t);
  const stale = assigned(lab);
  const current = run(lab, result(stale, 'NIT-003-v1', 1), 'analyst');
  assert.throws(
    () => run(lab, result(stale, 'NIT-001-v1', 1), 'analyst'),
    /changed/,
  );
  assert.deepEqual(lab.snapshot().samples[0], current);
});

test('records and activity survive database reopen', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-persistence-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, 'test.sqlite');
  const first = new Laboratory(file);
  const s = entered(first, assigned(first));
  const before = first.snapshot();
  first.close();
  const reopened = new Laboratory(file);
  t.after(() => reopened.close());
  assert.deepEqual(reopened.snapshot(), before);
  assert.equal(reopened.snapshot().samples[0].id, s.id);
  // The sequence is stored, so a reopened database continues it.
  assert.equal(
    execute(reopened, receipt, 'coordinator').submission?.id.endsWith('-0002'),
    true,
  );
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
  assert.equal(
    schemaVersion(),
    SCHEMA_VERSION,
    'a new database is stamped at the current version',
  );
  // A migration runner advances the version on its own connection and closes
  // before Laboratory is constructed, which is what #32 requires of it.
  const runner = new DatabaseSync(file);
  runner.exec(`PRAGMA user_version=${SCHEMA_VERSION + 1}`);
  runner.close();
  const reopened = new Laboratory(file);
  t.after(() => reopened.close());
  assert.equal(
    schemaVersion(),
    SCHEMA_VERSION + 1,
    'constructing Laboratory must not stomp a migrated schema version',
  );
});

test('a retried command is replayed, not applied a second time', () => {
  const lab = new Laboratory(':memory:');
  const command = {
    commandId: newCommandId(),
    ...receipt,
    samples: [finishedProduct, rawMaterial],
  };
  const first = lab.execute(command, 'coordinator');
  const retry = lab.execute(command, 'coordinator');
  assert.equal(first.outcome, 'applied');
  assert.equal(retry.outcome, 'replayed');
  assert.equal(retry.submission?.id, first.submission?.id);
  assert.deepEqual(retry.samples, first.samples);
  assert.equal(lab.snapshot().submissions.length, 1, 'one Submission');
  assert.equal(lab.snapshot().samples.length, 2, 'two Samples, not four');
  assert.equal(
    lab.snapshot().activity.length,
    2,
    'a replay writes no activity row',
  );
  if (retry.outcome === 'replayed')
    assert.equal(retry.originalActorId, 'coordinator');
  const s = lab.execute(
    {
      commandId: newCommandId(),
      type: 'assign',
      ...target(first.samples[0]),
      assignee: 'analyst',
    },
    'coordinator',
  ).samples[0];
  const entry = { commandId: newCommandId(), ...result(s, 'NIT-001-v1', 1) };
  lab.execute(entry, 'analyst');
  const again = lab.execute(entry, 'analyst');
  assert.equal(again.outcome, 'replayed');
  assert.equal(again.submission, null);
  assert.equal(again.samples[0].tests[0].results.length, 1);
  lab.close();
});

test('a genuinely repeated act under a fresh key is recorded separately', () => {
  const lab = new Laboratory(':memory:');
  // Two deliveries of the same product and batch, received the same day. The
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
    () =>
      lab.execute(
        {
          commandId,
          ...receipt,
          samples: [{ ...finishedProduct, batch: 'B-002' }],
        },
        'coordinator',
      ),
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
