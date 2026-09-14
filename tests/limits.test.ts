import test from 'node:test';
import assert from 'node:assert/strict';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import {
  cderSource,
  currentResult,
  methods,
  newCommandId,
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

const worksheets = new WeakMap<Laboratory, string>();
/** One stored calculation worksheet per lab, for every Result entered. */
function worksheet(lab: Laboratory) {
  if (!worksheets.has(lab))
    worksheets.set(
      lab,
      lab.storeAttachment(
        {
          filename: 'worksheet.csv',
          contentType: 'text/csv',
          content: Buffer.from('reading,result\n1.25,2.5\n'),
        },
        'analyst',
      ).id,
    );
  return worksheets.get(lab)!;
}
function run(lab: Laboratory, command: object, actor: string): Sample {
  const attachment =
    (command as { type?: string }).type === 'enterResult'
      ? { attachmentId: worksheet(lab) }
      : {};
  return lab.execute(
    { commandId: newCommandId(), ...attachment, ...command },
    actor,
  ).samples[0];
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
function clocked(
  t: { after: (fn: () => void) => void },
  options: ConstructorParameters<typeof Laboratory>[1] = {},
) {
  const clock = { now: '2026-09-10T12:00:00.000Z' };
  const lab = new Laboratory(':memory:', {
    clock: () => clock.now,
    ...options,
  });
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
/** A Manager appends an Acceptable intake entry. */
function append(
  lab: Laboratory,
  fields: object,
  actor = 'manager',
  commandId = newCommandId(),
) {
  return lab.execute(
    { commandId, type: 'appendAcceptableIntake', ...fields },
    actor,
  );
}
/**
 * Judges each `[value, limit]` by entering the value as the Test's Result
 * while an entry with that Limit is in force, appended the same day so the
 * latest appended wins. Returns each Result's qualifier and Conformity
 * statement.
 */
function judged(
  lab: Laboratory,
  cases: readonly (readonly [number, number])[],
): [string, string][] {
  let s = assigned(lab);
  return cases.map(([value, limit], i) => {
    append(lab, entry('impurity-a', limit, '2026-09-10'));
    s = run(lab, result(s, 'NIT-001-v1', value, i ? 'Re-read' : ''), 'analyst');
    const r = currentResult(s.tests[0])!;
    assert.equal(r.limit?.value, limit);
    return [r.qualifier, r.conformity];
  });
}

test('a quantified Result is rounded to the decimal places of its Limit and complies at or below it', (t) => {
  // LOD and LOQ far below every value, so each Result is quantified.
  const { lab } = clocked(t, {
    methods: methods.map((m) => ({
      ...m,
      lodLoq: { ...m.lodLoq, 'ng/day': { lod: 1e-9, loq: 2e-9 } },
    })),
  });
  const cases = [
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
    // Two decimal places, and seven written in exponent notation.
    [0.034, 0.03, 'Complies'],
    [0.035, 0.03, 'Does not comply'],
    [1.4e-7, 1e-7, 'Complies'],
    [1.5e-7, 1e-7, 'Does not comply'],
    // Half-up on the decimal value, not on its binary approximation.
    [1.45, 1.4, 'Does not comply'],
    [1.015, 1.01, 'Does not comply'],
    [1.005, 1.01, 'Complies'],
    [1.0049, 1, 'Complies'],
  ] as const;
  const outcomes = judged(
    lab,
    cases.map(([value, limit]) => [value, limit]),
  );
  cases.forEach(([value, limit, expected], i) =>
    assert.deepEqual(
      outcomes[i],
      ['quantified', expected],
      `${value} against ${limit}`,
    ),
  );
});

test('a < LOD or < LOQ Result complies only when that LOD or LOQ is below the Limit', (t) => {
  // The seeded Methods: LOD 1, LOQ 3 ng/day.
  const { lab } = clocked(t);
  const cases = [
    [2.9, 26.5, '< LOQ', 'Complies', 'LOQ below the Limit'],
    [2.9, 3, '< LOQ', 'Does not comply', 'LOQ equals the Limit'],
    [1, 2.5, '< LOQ', 'Does not comply', 'LOQ above the Limit'],
    [0.2, 2.5, '< LOD', 'Complies', 'LOD below the Limit'],
    [0.2, 1, '< LOD', 'Does not comply', 'LOD equals the Limit'],
  ] as const;
  const outcomes = judged(
    lab,
    cases.map(([value, limit]) => [value, limit]),
  );
  cases.forEach(([, , qualifier, expected, why], i) =>
    assert.deepEqual(outcomes[i], [qualifier, expected], why),
  );
});

test('the entry in force is the latest effective on or before the day the Result is entered', (t) => {
  const { lab, clock } = clocked(t);
  let s = assigned(lab);
  append(lab, entry('impurity-a', 18, '2026-10-01'));
  append(lab, entry('impurity-a', 30, '2025-01-01'));
  append(lab, entry('impurity-a', 31, '2025-01-01'));
  // Seeded: 26.5 ng/day from 2023-08-04.
  clock.now = '2023-08-03T23:59:59.999Z';
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 20), 'analyst'),
    /No Acceptable intake is in force for Impurity A/,
  );
  const cases = [
    ['2023-08-04T00:00:00.000Z', 26.5, 'effective that day'],
    ['2024-12-31T12:00:00.000Z', 26.5, 'the only one in force'],
    ['2025-01-01T00:00:00.000Z', 31, 'of equal dates, the later appended'],
    ['2026-09-30T23:59:59.999Z', 31, 'a future entry is not yet in force'],
    ['2026-10-01T00:00:00.000Z', 18, 'effective that day'],
  ] as const;
  cases.forEach(([at, expected, why], i) => {
    clock.now = at;
    s = run(lab, result(s, 'NIT-001-v1', 20, i ? 'Re-read' : ''), 'analyst');
    assert.equal(currentResult(s.tests[0])?.limit?.value, expected, why);
  });
});

test('Acceptable intake entries are seeded, marked illustrative and only ever appended, by a Manager, on the audit trail', (t) => {
  const { lab } = clocked(t);
  const seeded = lab.snapshot().acceptableIntakes;
  assert.deepEqual(
    seeded.map((e) => [e.id, e.analyteId, e.value, e.effectiveFrom]),
    [
      [1, 'impurity-a', 26.5, '2023-08-04'],
      [2, 'impurity-b', 26.5, '2023-08-04'],
      [3, 'impurity-b', 96, '2025-07-01'],
      [4, 'impurity-c', 1500, '2023-08-04'],
    ],
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

  const revised = entry('impurity-a', 18, '2026-10-01');
  for (const actor of ['coordinator', 'analyst'])
    assert.throws(
      () => append(lab, revised, actor),
      (e: Error & { status: number }) =>
        e.status === 403 && /manager role/.test(e.message),
    );
  assert.throws(() => append(lab, revised, 'unknown'), /Unknown user/);
  for (const bad of [
    entry('impurity-x', 18, '2026-10-01'),
    entry('impurity-a', 0, '2026-10-01'),
    entry('impurity-a', 18, '2026-02-30'),
    { ...revised, sourceUrl: 'not a url' },
  ])
    assert.throws(() => append(lab, bad));
  assert.deepEqual(lab.snapshot().acceptableIntakes, seeded);
  assert.deepEqual(lab.auditTrail(), [], 'nothing refused is recorded');

  const commandId = newCommandId();
  const outcome = append(lab, revised, 'manager', commandId);
  assert.deepEqual(
    [outcome.outcome, outcome.submission, outcome.samples],
    ['applied', null, []],
  );
  const after = lab.snapshot().acceptableIntakes;
  assert.deepEqual(after.slice(0, seeded.length), seeded, 'nothing rewritten');
  assert.deepEqual(after.at(-1), { ...revised, id: 5 });
  assert.deepEqual(
    lab
      .auditTrail()
      .reverse()
      .map((e) => [
        e.recordType,
        e.recordId,
        e.sampleId,
        e.field,
        e.oldValue,
        e.newValue,
        e.actor,
        e.at,
        e.commandType,
        e.commandId,
      ]),
    Object.entries(revised).map(([field, value]) => [
      'Acceptable intake',
      '5',
      null,
      field,
      null,
      value,
      'manager',
      '2026-09-10T12:00:00.000Z',
      'appendAcceptableIntake',
      commandId,
    ]),
  );
  // A retry is not a second entry.
  assert.equal(append(lab, revised, 'manager', commandId).outcome, 'replayed');
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

  append(lab, entry('impurity-a', 18, '2026-09-11'));
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
  append(lab, entry('impurity-a', 3, '2026-09-11'));
  append(lab, entry('impurity-a', 2.5, '2026-09-12'));
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
  worksheet(lab);
  const before = lab.snapshot();
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 2), 'analyst'),
    /No Acceptable intake is in force for Impurity A/,
  );
  assert.deepEqual(lab.snapshot(), before);
});

test('an Admin appends an Acceptable intake entry as themselves', (t) => {
  const { lab } = clocked(t);
  const revised = entry('impurity-a', 18, '2026-10-01');
  assert.equal(append(lab, revised, 'admin').outcome, 'applied');
  assert.deepEqual(lab.snapshot().acceptableIntakes.at(-1), {
    ...revised,
    id: 5,
  });
  assert.ok(lab.auditTrail().every((e) => e.actor === 'admin'));
});
