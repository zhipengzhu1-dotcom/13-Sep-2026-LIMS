import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory, SCHEMA_VERSION } from '../src/laboratory/laboratory.ts';
import {
  currentResult,
  enteredResultOn,
  qualify,
  newCommandId,
  type AuditEntry,
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
  instrumentReading: 1.25,
  sequenceId: 'SEQ-0001',
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
/** How many distinct commands the audit trail records. */
const commandsAudited = (lab: Laboratory) =>
  new Set(lab.snapshot().audit.map((e) => e.commandId)).size;
/** Runs a command and returns its outcome with the audit entries it wrote, in
 * the order it wrote them, as `[record, field, old, new, reason]`. */
function audited(lab: Laboratory, command: object, actor: string) {
  const commandId = newCommandId();
  const outcome = lab.execute({ commandId, ...command }, actor);
  const entries = lab
    .auditTrail()
    .filter((e) => e.commandId === commandId)
    .reverse();
  return { outcome, entries, changes: entries.map(change) };
}
const change = (e: AuditEntry) => [
  `${e.recordType} ${e.recordId}`,
  e.field,
  e.oldValue,
  e.newValue,
  e.reason,
];
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
  assert.equal(commandsAudited(lab), 6);
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
  assert.deepEqual(lab.snapshot().audit, []);
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
  assert.equal(commandsAudited(lab), 3);
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
    s.tests[0].results.map((r) => [r.value, r.status, r.reason]),
    [
      [2.5, 'superseded', ''],
      [3.1, 'current', 'Dilution factor corrected'],
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

test('records and the audit trail survive database reopen', (t) => {
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
  const trail = lab.auditTrail();
  const retry = lab.execute(command, 'coordinator');
  assert.equal(first.outcome, 'applied');
  assert.equal(retry.outcome, 'replayed');
  assert.equal(retry.submission?.id, first.submission?.id);
  assert.deepEqual(retry.samples, first.samples);
  assert.equal(lab.snapshot().submissions.length, 1, 'one Submission');
  assert.equal(lab.snapshot().samples.length, 2, 'two Samples, not four');
  assert.deepEqual(lab.auditTrail(), trail, 'a replay writes no audit entry');
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

test('Tests snapshot the LOD/LOQ pair for the Material type', (t) => {
  const lab = memory(t);
  const [product, material] = execute(
    lab,
    { ...receipt, samples: [finishedProduct, rawMaterial] },
    'coordinator',
  ).samples;
  assert.deepEqual(
    product.tests.map((x) => [x.unit, x.lod, x.loq]),
    [
      ['ng/day', 1, 3],
      ['ng/day', 1, 3],
    ],
  );
  assert.deepEqual(
    material.tests.map((x) => [x.unit, x.lod, x.loq]),
    [['ppm', 0.01, 0.03]],
  );
  const methods = lab.snapshot().methods;
  assert.ok(
    methods.every(
      (m) =>
        m.lodLoq['ng/day'].lod === 1 &&
        m.lodLoq['ng/day'].loq === 3 &&
        m.lodLoq.ppm.lod === 0.01 &&
        m.lodLoq.ppm.loq === 0.03,
    ),
  );
});

test('the qualifier is assigned from the LOD and LOQ in each reporting unit, boundaries included', (t) => {
  const cases: Record<string, [number, string][]> = {
    'ng/day': [
      [0, '< LOD'],
      [0.99, '< LOD'],
      [1, '< LOQ'],
      [2.99, '< LOQ'],
      [3, 'quantified'],
      [12.6, 'quantified'],
    ],
    ppm: [
      [0, '< LOD'],
      [0.009, '< LOD'],
      [0.01, '< LOQ'],
      [0.029, '< LOQ'],
      [0.03, 'quantified'],
      [0.5, 'quantified'],
    ],
  };
  for (const [unit, rows] of Object.entries(cases)) {
    const lab = memory(t);
    const sample = unit === 'ppm' ? rawMaterial : finishedProduct;
    let s = run(lab, { ...receipt, samples: [sample] }, 'coordinator');
    s = run(
      lab,
      { type: 'assign', ...target(s), assignee: 'analyst' },
      'coordinator',
    );
    const testId = s.tests[0].id;
    rows.forEach(([value, expected], i) => {
      s = run(
        lab,
        result(s, testId, value, i ? 'Re-read the injection' : ''),
        'analyst',
      );
      const current = currentResult(s.tests[0])!;
      assert.equal(current.unit, unit);
      assert.equal(current.value, value);
      assert.equal(current.qualifier, expected, `${value} ${unit}`);
      assert.equal(qualify(value, s.tests[0]), expected);
    });
  }
});

test('a client-supplied qualifier is ignored', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  s = run(
    lab,
    { ...result(s, 'NIT-001-v1', 0.5), qualifier: 'quantified' },
    'analyst',
  );
  assert.equal(currentResult(s.tests[0])?.qualifier, '< LOD');
});

test('the instrument reading and sequence ID are required and recorded', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  const base = result(s, 'NIT-001-v1', 4);
  const { instrumentReading: _r, ...noReading } = base;
  const { sequenceId: _q, ...noSequence } = base;
  for (const command of [
    noReading,
    noSequence,
    { ...base, instrumentReading: -1 },
    { ...base, instrumentReading: Infinity },
    { ...base, instrumentReading: '1.2' },
    { ...base, sequenceId: '   ' },
  ])
    assert.throws(
      () => run(lab, command, 'analyst'),
      /instrumentReading|sequenceId/,
    );
  const trail = lab.auditTrail();
  for (const command of [
    noReading,
    noSequence,
    { ...base, instrumentReading: -1 },
    { ...base, instrumentReading: Infinity },
    { ...base, instrumentReading: '1.2' },
    { ...base, sequenceId: '   ' },
  ])
    assert.throws(() => run(lab, command, 'analyst'));
  assert.deepEqual(lab.auditTrail(), trail, 'nothing was recorded');
  s = run(
    lab,
    { ...base, instrumentReading: 0.842, sequenceId: ' INJ-26-0917-03 ' },
    'analyst',
  );
  const r = s.tests[0].results[0];
  assert.equal(r.instrumentReading, 0.842);
  assert.equal(r.sequenceId, 'INJ-26-0917-03');
  const entries = lab
    .auditTrail()
    .filter((e) => e.commandType === 'enterResult');
  assert.deepEqual(
    entries
      .filter(
        (e) =>
          e.field !== 'result.value' &&
          e.field !== 'result.unit' &&
          e.field !== 'result.qualifier',
      )
      .map(change),
    [
      [
        'Test 26-00001/NIT-001-v1',
        'result.sequenceId',
        null,
        'INJ-26-0917-03',
        null,
      ],
      [
        'Test 26-00001/NIT-001-v1',
        'result.instrumentReading',
        null,
        0.842,
        null,
      ],
    ],
  );
});

test('a correction supersedes the current Result and history keeps who, when and why', (t) => {
  let now = '2026-09-10T12:00:00.000Z';
  const lab = new Laboratory(':memory:', () => now);
  t.after(() => lab.close());
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 2), 'analyst');
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 4, '  '), 'analyst'),
    /reason/,
  );
  now = '2026-09-10T13:00:00.000Z';
  s = run(lab, result(s, 'NIT-001-v1', 4, 'Wrong dilution factor'), 'analyst');
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst-2' },
    'coordinator',
  );
  now = '2026-09-10T14:00:00.000Z';
  s = run(
    lab,
    result(s, 'NIT-001-v1', 3.5, 'Integration corrected'),
    'analyst-2',
  );
  const test = s.tests[0];
  assert.deepEqual(
    test.results.map((r) => [
      r.sequence,
      r.status,
      r.value,
      r.qualifier,
      r.enteredBy,
      r.enteredAt,
      r.reason,
    ]),
    [
      [1, 'superseded', 2, '< LOQ', 'analyst', '2026-09-10T12:00:00.000Z', ''],
      [
        2,
        'superseded',
        4,
        'quantified',
        'analyst',
        '2026-09-10T13:00:00.000Z',
        'Wrong dilution factor',
      ],
      [
        3,
        'current',
        3.5,
        'quantified',
        'analyst-2',
        '2026-09-10T14:00:00.000Z',
        'Integration corrected',
      ],
    ],
  );
  assert.equal(currentResult(test)?.value, 3.5);
  assert.equal(test.results.filter((r) => r.status === 'current').length, 1);
});

test('receipt audits every field of the new Submission, Sample and Test', (t) => {
  const lab = memory(t);
  const { outcome, entries, changes } = audited(
    lab,
    { ...receipt, samples: [rawMaterial] },
    'coordinator',
  );
  const at = '2026-09-10T12:00:00.000Z';
  const created = (record: string, fields: [string, unknown][]) =>
    fields.map(([field, value]) => [record, field, null, value, null]);
  assert.deepEqual(changes, [
    ...created('Submission S26-0001', [
      ['client', 'Fictional Pharma'],
      ['receivedAt', at],
      ['receivedBy', 'coordinator'],
    ]),
    ...created('Sample 26-00001', [
      ['submissionId', 'S26-0001'],
      ['client', 'Fictional Pharma'],
      ['product', 'Demo API'],
      ['batch', 'API-001'],
      ['materialType', 'raw material'],
      ['dueDate', '2026-10-01'],
      ['priority', 'Routine'],
      ['receivedAt', at],
      ['receivedBy', 'coordinator'],
      ['status', 'Received'],
    ]),
    ...created('Test 26-00001/NIT-005-v1', [
      ['methodId', 'NIT-005-v1'],
      ['methodCode', 'NIT-005'],
      ['methodVersion', 1],
      ['analyteId', 'impurity-c'],
      ['analyteName', 'Impurity C'],
      ['technique', 'LC-MS/MS'],
      ['unit', 'ppm'],
      ['lod', 0.01],
      ['loq', 0.03],
    ]),
  ]);
  assert.equal(outcome.samples[0].id, '26-00001');
  for (const e of entries) {
    assert.equal(e.actor, 'coordinator');
    assert.equal(e.at, at);
    assert.equal(e.commandType, 'receiveSubmission');
  }
  assert.deepEqual(
    entries.map((e) => e.sampleId),
    [null, null, null, ...Array(19).fill('26-00001')],
  );
});

test('assign audits the assignee and the status it starts', (t) => {
  const lab = memory(t);
  let s = run(lab, receipt, 'coordinator');
  const first = audited(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  assert.deepEqual(first.changes, [
    ['Sample 26-00001', 'assignee', null, 'analyst', null],
    ['Sample 26-00001', 'status', 'Received', 'In progress', null],
  ]);
  s = first.outcome.samples[0];
  const before = lab.snapshot();
  assert.throws(
    () =>
      run(
        lab,
        { type: 'assign', ...target(s), assignee: 'analyst' },
        'coordinator',
      ),
    /already assigned/,
  );
  assert.deepEqual(lab.snapshot(), before);
  assert.deepEqual(
    audited(
      lab,
      { type: 'assign', ...target(s), assignee: 'analyst-2' },
      'coordinator',
    ).changes,
    [['Sample 26-00001', 'assignee', 'analyst', 'analyst-2', null]],
  );
});

test('enterResult audits old and new Result values with the reason for a change', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  const record = 'Test 26-00001/NIT-001-v1';
  const first = audited(lab, result(s, 'NIT-001-v1', 2.5), 'analyst');
  assert.deepEqual(first.changes, [
    [record, 'result.value', null, 2.5, null],
    [record, 'result.unit', null, 'ng/day', null],
    [record, 'result.qualifier', null, '< LOQ', null],
    [record, 'result.instrumentReading', null, 1.25, null],
    [record, 'result.sequenceId', null, 'SEQ-0001', null],
  ]);
  s = first.outcome.samples[0];
  const corrected = audited(
    lab,
    {
      ...result(s, 'NIT-001-v1', 3.1, 'Dilution factor corrected'),
      instrumentReading: 1.55,
    },
    'analyst',
  );
  // Only the fields that changed are written, each with the reason; the
  // superseded Result stays in the record, so the trail needs no status entry.
  assert.deepEqual(corrected.changes, [
    [record, 'result.value', 2.5, 3.1, 'Dilution factor corrected'],
    [
      record,
      'result.qualifier',
      '< LOQ',
      'quantified',
      'Dilution factor corrected',
    ],
    [
      record,
      'result.instrumentReading',
      1.25,
      1.55,
      'Dilution factor corrected',
    ],
  ]);
  assert.deepEqual(
    corrected.outcome.samples[0].tests[0].results.map((r) => r.status),
    ['superseded', 'current'],
  );
  s = corrected.outcome.samples[0];
  // Re-entering the same value is still recorded, with its reason.
  assert.deepEqual(
    audited(
      lab,
      {
        ...result(s, 'NIT-001-v1', 3.1, 'Re-integrated'),
        instrumentReading: 1.55,
      },
      'analyst',
    ).changes,
    [[record, 'result.value', 3.1, 3.1, 'Re-integrated']],
  );
});

test('submitting, returning and approving audit the status, with the return comment as reason', (t) => {
  const lab = memory(t);
  let s = entered(lab, assigned(lab));
  const submit = audited(
    lab,
    { type: 'submitForApproval', ...target(s) },
    'analyst',
  );
  assert.deepEqual(submit.changes, [
    ['Sample 26-00001', 'status', 'In progress', 'Awaiting approval', null],
  ]);
  s = submit.outcome.samples[0];
  const returned = audited(
    lab,
    { type: 'return', ...target(s), comment: 'Check the dilution factor.' },
    'manager',
  );
  assert.deepEqual(returned.changes, [
    [
      'Sample 26-00001',
      'status',
      'Awaiting approval',
      'Returned',
      'Check the dilution factor.',
    ],
  ]);
  assert.equal(returned.entries[0].actor, 'manager');
  s = returned.outcome.samples[0];
  const resubmit = audited(
    lab,
    { type: 'submitForApproval', ...target(s) },
    'analyst',
  );
  assert.deepEqual(resubmit.changes, [
    ['Sample 26-00001', 'status', 'Returned', 'Awaiting approval', null],
  ]);
  s = resubmit.outcome.samples[0];
  assert.deepEqual(
    audited(lab, { type: 'approve', ...target(s) }, 'manager').changes,
    [['Sample 26-00001', 'status', 'Awaiting approval', 'Approved', null]],
  );
});

test('a rejected command writes no audit entry', (t) => {
  const lab = memory(t);
  const rejected = (command: object, actor: string) => {
    const before = lab.auditTrail();
    assert.throws(() => execute(lab, command, actor));
    assert.deepEqual(lab.auditTrail(), before);
  };
  rejected(receipt, 'analyst');
  rejected(
    { ...receipt, samples: [{ ...finishedProduct, methodIds: ['x'] }] },
    'coordinator',
  );
  let s = assigned(lab);
  rejected(
    { type: 'assign', ...target(s), assignee: 'manager' },
    'coordinator',
  );
  rejected(result(s, 'NIT-001-v1', 1), 'analyst-2');
  rejected(result(s, 'NIT-001-v1', -1), 'analyst');
  rejected({ type: 'submitForApproval', ...target(s) }, 'analyst');
  const stale = s;
  s = entered(lab, s);
  rejected(result(stale, 'NIT-001-v1', 1), 'analyst');
  rejected(result(s, 'NIT-001-v1', 4), 'analyst');
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  rejected({ type: 'return', ...target(s), comment: 'no' }, 'manager');
  rejected({ type: 'approve', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  rejected({ type: 'approve', ...target(s) }, 'manager');
});

test('the audit trail reads newest first, lab-wide or for one Sample and its Submission', (t) => {
  const lab = memory(t);
  const { outcome } = audited(
    lab,
    { ...receipt, samples: [finishedProduct, rawMaterial] },
    'coordinator',
  );
  const [product, material] = outcome.samples;
  run(
    lab,
    { type: 'assign', ...target(product), assignee: 'analyst' },
    'coordinator',
  );
  run(
    lab,
    { type: 'assign', ...target(material), assignee: 'analyst-2' },
    'coordinator',
  );
  run(lab, receipt, 'coordinator');

  const all = lab.auditTrail();
  assert.deepEqual(lab.snapshot().audit, all);
  const sequences = all.map((e) => e.sequence);
  assert.deepEqual(
    sequences,
    [...sequences].sort((a, b) => b - a),
    'newest first',
  );
  assert.equal(new Set(sequences).size, all.length);
  assert.equal(all[0].recordId, '26-00003/NIT-003-v1');

  const history = lab.auditTrail(material.id);
  assert.deepEqual(
    [...new Set(history.map((e) => e.recordId))],
    ['26-00002', '26-00002/NIT-005-v1', 'S26-0001'],
  );
  assert.deepEqual(history.slice(0, 2).map(change), [
    ['Sample 26-00002', 'status', 'Received', 'In progress', null],
    ['Sample 26-00002', 'assignee', null, 'analyst-2', null],
  ]);
  assert.deepEqual(
    history,
    all.filter(
      (e) =>
        e.sampleId === material.id ||
        (e.sampleId === null && e.recordId === 'S26-0001'),
    ),
  );
  assert.throws(
    () => lab.auditTrail('26-99999'),
    (e: Error & { status: number }) => e.status === 404,
  );
});
