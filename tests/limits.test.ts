import test from 'node:test';
import assert from 'node:assert/strict';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import {
  cderSource,
  conformity,
  currentResult,
  decimalPlaces,
  limitInForce,
  newCommandId,
  type AcceptableIntake,
  type Sample,
} from '../src/laboratory/contracts.ts';

const finishedProduct = {
  product: 'Demo tablets 10 mg',
  batch: 'B-001',
  materialType: 'finished product',
  quantity: { value: 60, unit: 'units' },
  containers: { count: 2, type: 'bottle' },
  conditionOnReceipt: 'Intact',
  maximumDailyDose: 40,
  methodIds: ['NIT-001-v1', 'NIT-003-v1'],
  dueDate: '2026-10-01',
  priority: 'Routine',
};
const rawMaterial = {
  ...finishedProduct,
  product: 'Demo API',
  batch: 'API-001',
  materialType: 'raw material',
  maximumDailyDose: null,
  methodIds: ['NIT-001-v1'],
};
const target = (s: Sample) => ({ sampleId: s.id, revision: s.revision });

function run(lab: Laboratory, command: object, actor: string): Sample {
  return lab.execute({ commandId: newCommandId(), ...command }, actor)
    .samples[0];
}
function assigned(lab: Laboratory, sample: object = finishedProduct) {
  const s = run(
    lab,
    {
      type: 'receiveSubmission',
      clientId: 'northstar',
      shippingCondition: 'ambient',
      packageCondition: 'intact',
      samples: [sample],
    },
    'coordinator',
  );
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
/** A lab whose clock the test moves. */
function clocked(t: { after: (fn: () => void) => void }) {
  const clock = { now: '2026-09-10T12:00:00.000Z' };
  const lab = new Laboratory(':memory:', { clock: () => clock.now });
  t.after(() => lab.close());
  return { lab, clock };
}
const entry = (analyteId: string, value: number, effectiveFrom: string) => ({
  analyteId,
  value,
  ...cderSource,
  sourceRevisionDate: effectiveFrom,
  effectiveFrom,
  illustrative: true,
});

test('decimal places follow the Limit as written', () => {
  assert.equal(decimalPlaces(26.5), 1);
  assert.equal(decimalPlaces(96), 0);
  assert.equal(decimalPlaces(1500), 0);
  assert.equal(decimalPlaces(0.03), 2);
  assert.equal(decimalPlaces(1e-7), 7);
});

test('a quantified Result is rounded to the Limit and complies at or below it', () => {
  const lodLoq = { lod: 1, loq: 3 };
  const judge = (value: number, limit: number) =>
    conformity({ value, qualifier: 'quantified' }, lodLoq, { value: limit });
  const cases: [number, number, string][] = [
    [26.4, 26.5, 'Complies'],
    [26.5, 26.5, 'Complies'],
    [26.54, 26.5, 'Complies'],
    [26.549, 26.5, 'Complies'],
    [26.55, 26.5, 'Does not comply'],
    [26.6, 26.5, 'Does not comply'],
    [96, 96, 'Complies'],
    [96.4, 96, 'Complies'],
    [96.5, 96, 'Does not comply'],
    [1500.49, 1500, 'Complies'],
    [1500.5, 1500, 'Does not comply'],
    // Half-up on the decimal value, not on its binary approximation.
    [1.45, 1.4, 'Does not comply'],
    [1.015, 1.01, 'Does not comply'],
    [1.005, 1.01, 'Complies'],
    [1.0049, 1, 'Complies'],
  ];
  for (const [value, limit, expected] of cases)
    assert.equal(judge(value, limit), expected, `${value} against ${limit}`);
});

test('a < LOD or < LOQ Result complies only when that LOD or LOQ is below the Limit', () => {
  const lodLoq = { lod: 1, loq: 3 };
  const judge = (qualifier: '< LOD' | '< LOQ', value: number, limit: number) =>
    conformity({ value, qualifier }, lodLoq, { value: limit });
  assert.equal(judge('< LOQ', 2.9, 26.5), 'Complies', 'LOQ below the Limit');
  assert.equal(judge('< LOQ', 2.9, 3), 'Does not comply', 'LOQ equals Limit');
  assert.equal(judge('< LOQ', 1, 2.5), 'Does not comply', 'LOQ above Limit');
  assert.equal(judge('< LOD', 0.2, 2.5), 'Complies', 'LOD below the Limit');
  assert.equal(judge('< LOD', 0.2, 1), 'Does not comply', 'LOD equals Limit');
  assert.equal(
    conformity({ value: 0.2, qualifier: '< LOD' }, lodLoq, null),
    'Report',
  );
});

test('the entry in force is the latest effective on or before the evaluation time', () => {
  const entries = [
    { ...entry('impurity-a', 26.5, '2023-08-04'), id: 1 },
    { ...entry('impurity-b', 96, '2023-08-04'), id: 2 },
    { ...entry('impurity-a', 18, '2026-10-01'), id: 3 },
    { ...entry('impurity-a', 30, '2025-01-01'), id: 4 },
    { ...entry('impurity-a', 31, '2025-01-01'), id: 5 },
  ] satisfies AcceptableIntake[];
  const valueAt = (at: string) =>
    limitInForce(entries, 'impurity-a', at)?.value;
  assert.equal(valueAt('2023-08-03T23:59:59.999Z'), undefined);
  assert.equal(valueAt('2023-08-04T00:00:00.000Z'), 26.5);
  assert.equal(valueAt('2024-12-31T12:00:00.000Z'), 26.5);
  assert.equal(valueAt('2025-01-01T00:00:00.000Z'), 31, 'the later appended');
  assert.equal(valueAt('2026-09-30T23:59:59.999Z'), 31);
  assert.equal(valueAt('2026-10-01T00:00:00.000Z'), 18, 'effective that day');
  assert.equal(limitInForce(entries, 'impurity-c', '2026-10-01'), null);
});

test('Acceptable intake entries are seeded, marked illustrative and only ever appended', (t) => {
  const { lab } = clocked(t);
  const seeded = lab.snapshot().acceptableIntakes;
  const inForce = (analyteId: string) =>
    limitInForce(seeded, analyteId, '2026-09-10')?.value;
  assert.deepEqual(
    ['impurity-a', 'impurity-b', 'impurity-c'].map(inForce),
    [26.5, 96, 1500],
  );
  assert.ok(seeded.every((e) => e.illustrative));
  assert.ok(
    seeded.every(
      (e) =>
        e.sourceTitle ===
          'CDER Nitrosamine Impurity Acceptable Intake Limits' &&
        e.sourceUrl.startsWith('https://www.fda.gov/') &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.sourceRevisionDate),
    ),
  );
  const added = lab.appendAcceptableIntake(
    entry('impurity-a', 18, '2026-10-01'),
  );
  assert.equal(added.id, seeded.length + 1);
  const after = lab.snapshot().acceptableIntakes;
  assert.deepEqual(after.slice(0, seeded.length), seeded, 'nothing rewritten');
  assert.deepEqual(after.at(-1), added);
  for (const bad of [
    entry('impurity-x', 18, '2026-10-01'),
    entry('impurity-a', 0, '2026-10-01'),
    entry('impurity-a', 18, '2026-02-30'),
    { ...entry('impurity-a', 18, '2026-10-01'), sourceUrl: 'not a url' },
  ])
    assert.throws(() => lab.appendAcceptableIntake(bad));
  assert.equal(lab.snapshot().acceptableIntakes.length, after.length);
});

test('a finished product Result links the Limit in force and keeps it after a newer entry is added', (t) => {
  const { lab, clock } = clocked(t);
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 20), 'analyst');
  const first = currentResult(s.tests[0])!;
  assert.equal(first.limit?.value, 26.5);
  assert.equal(first.limit?.analyteId, 'impurity-a');
  assert.equal(first.conformity, 'Complies');
  const seededEntry = first.limit;

  lab.appendAcceptableIntake(entry('impurity-a', 18, '2026-09-11'));
  // Entered before the new entry takes effect: still the old Limit.
  s = run(lab, result(s, 'NIT-003-v1', 20), 'analyst');
  assert.equal(currentResult(s.tests[1])?.limit?.value, 96);

  clock.now = '2026-09-11T08:00:00.000Z';
  const reread = lab.snapshot().samples.find((x) => x.id === s.id)!;
  assert.deepEqual(
    currentResult(reread.tests[0])?.limit,
    seededEntry,
    'the earlier Result is not re-judged',
  );
  assert.equal(currentResult(reread.tests[0])?.conformity, 'Complies');

  // A correction entered now is judged against the entry in force now.
  s = run(lab, result(s, 'NIT-001-v1', 20, 'Integration corrected'), 'analyst');
  assert.deepEqual(
    s.tests[0].results.map((r) => [r.status, r.limit?.value, r.conformity]),
    [
      ['superseded', 26.5, 'Complies'],
      ['current', 18, 'Does not comply'],
    ],
  );
  // The trail names the Limit entry and value, not every field of its source.
  const correction = lab
    .auditTrail(s.id)
    .filter((e) => e.commandType === 'enterResult')
    .filter((e) => e.at === '2026-09-11T08:00:00.000Z')
    .map((e) => [e.field, e.oldValue, e.newValue, e.reason]);
  const added = lab.snapshot().acceptableIntakes.at(-1)!;
  assert.deepEqual(
    correction.sort(),
    [
      [
        'result.conformity',
        'Complies',
        'Does not comply',
        'Integration corrected',
      ],
      [
        'result.limit.entry',
        seededEntry!.id,
        added.id,
        'Integration corrected',
      ],
      ['result.limit.value', 26.5, 18, 'Integration corrected'],
    ].sort(),
  );
});

test('the Result equal to its Limit complies and rounding decides just above it', (t) => {
  const { lab } = clocked(t);
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 26.5), 'analyst');
  assert.equal(currentResult(s.tests[0])?.conformity, 'Complies');
  s = run(lab, result(s, 'NIT-001-v1', 26.54, 'Re-read'), 'analyst');
  assert.equal(currentResult(s.tests[0])?.conformity, 'Complies');
  s = run(lab, result(s, 'NIT-001-v1', 26.55, 'Re-read'), 'analyst');
  assert.equal(currentResult(s.tests[0])?.conformity, 'Does not comply');
  s = run(lab, result(s, 'NIT-003-v1', 96.4), 'analyst');
  assert.equal(currentResult(s.tests[1])?.conformity, 'Complies');
  s = run(lab, result(s, 'NIT-003-v1', 96.5, 'Re-read'), 'analyst');
  assert.equal(currentResult(s.tests[1])?.conformity, 'Does not comply');
});

test('a < LOQ Result complies when the LOQ is below the Limit and not otherwise', (t) => {
  const { lab, clock } = clocked(t);
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 2), 'analyst');
  let r = currentResult(s.tests[0])!;
  assert.deepEqual(
    [r.qualifier, r.limit?.value, r.conformity],
    ['< LOQ', 26.5, 'Complies'],
  );
  // An illustrative Limit at the LOQ (3 ng/day), then below it.
  lab.appendAcceptableIntake(entry('impurity-a', 3, '2026-09-11'));
  lab.appendAcceptableIntake(entry('impurity-a', 2.5, '2026-09-12'));
  clock.now = '2026-09-11T09:00:00.000Z';
  s = run(lab, result(s, 'NIT-001-v1', 2, 'Re-injected'), 'analyst');
  r = currentResult(s.tests[0])!;
  assert.deepEqual(
    [r.qualifier, r.limit?.value, r.conformity],
    ['< LOQ', 3, 'Does not comply'],
  );
  clock.now = '2026-09-12T09:00:00.000Z';
  s = run(lab, result(s, 'NIT-001-v1', 0.5, 'Re-injected'), 'analyst');
  r = currentResult(s.tests[0])!;
  assert.deepEqual(
    [r.qualifier, r.limit?.value, r.conformity],
    ['< LOD', 2.5, 'Complies'],
  );
});

test('raw material Results link no Limit and show Report', (t) => {
  const { lab } = clocked(t);
  let s = assigned(lab, rawMaterial);
  for (const [value, reason] of [
    [0.005, ''],
    [0.02, 'Re-read'],
    [999, 'Re-read'],
  ] as const) {
    s = run(lab, result(s, 'NIT-001-v1', value, reason), 'analyst');
    const r = currentResult(s.tests[0])!;
    assert.equal(r.limit, null);
    assert.equal(r.conformity, 'Report');
  }
});

test('a finished product Result with no Acceptable intake in force is refused and records nothing', (t) => {
  const { lab, clock } = clocked(t);
  const s = assigned(lab);
  clock.now = '2023-08-03T12:00:00.000Z';
  const before = lab.snapshot();
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 2), 'analyst'),
    /No Acceptable intake is in force for Impurity A/,
  );
  assert.deepEqual(lab.snapshot(), before);
});
