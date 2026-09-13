import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory, SCHEMA_VERSION } from '../src/laboratory/laboratory.ts';
import {
  enteredResultOn,
  methods,
  newCommandId,
  type Sample,
} from '../src/laboratory/contracts.ts';

/** The mandatory receipt record only; every optional field is left out. */
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
  quantity: { value: 10, unit: 'g' },
  maximumDailyDose: null,
  methodIds: ['NIT-005-v1'],
};
const receipt = {
  type: 'receiveSubmission',
  clientId: 'northstar',
  shippingCondition: 'ambient',
  packageCondition: 'intact',
  samples: [finishedProduct],
};
const NOW = '2026-09-10T12:00:00.000Z';
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
  const lab = new Laboratory(':memory:', () => NOW);
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
  assert.throws(() => run(lab, { ...receipt, clientId: ' ' }, 'coordinator'));
  assert.throws(
    () => run(lab, { ...receipt, clientId: 'unknown' }, 'coordinator'),
    /Client list/,
  );
  for (const patch of [
    { shippingCondition: 'warm' },
    { packageCondition: 'wet' },
    { temperatureOnArrival: '4' },
  ])
    assert.throws(() => run(lab, { ...receipt, ...patch }, 'coordinator'));
  assert.equal(lab.snapshot().submissions.length, 0);
  assert.equal(lab.snapshot().samples.length, 0);
  assert.equal(lab.snapshot().activity.length, 0);
});

test('a receipt keeps the full Submission and Sample record', (t) => {
  const lab = memory(t);
  const stabilitySample = {
    ...finishedProduct,
    clientSampleId: 'STAB-7-ACC-3M',
    product: 'Demo tablets',
    strength: '10 mg',
    manufacturer: 'Fictional Pharma, Site 1',
    manufactureDate: '2026-01-15',
    expiryDate: '2028-01-14',
    storageCondition: '15–25 °C',
    storageLocation: 'Store R2',
    priority: 'Urgent',
    remarks: 'Protect from light.',
    retentionInstruction: 'Retain 12 months',
    stability: { studyId: 'STAB-7', timePoint: '3M', condition: 'ACC' },
  };
  const outcome = execute(
    lab,
    {
      ...receipt,
      clientId: 'formulation-development',
      clientReference: 'PO-42',
      courier: 'World Courier',
      trackingNumber: 'WC-1',
      shippingCondition: 'refrigerated',
      temperatureOnArrival: 4.5,
      chainOfCustodyReference: 'COC-9',
      samples: [stabilitySample, rawMaterial],
    },
    'coordinator',
  );
  const { id: _id, sampleIds: _ids, ...submission } = outcome.submission!;
  assert.deepEqual(submission, {
    clientId: 'formulation-development',
    client: 'Formulation Development',
    clientKind: 'internal',
    clientReference: 'PO-42',
    receivedAt: NOW,
    receivedAtCorrection: null,
    receivedBy: 'coordinator',
    courier: 'World Courier',
    trackingNumber: 'WC-1',
    shippingCondition: 'refrigerated',
    temperatureOnArrival: 4.5,
    packageCondition: 'intact',
    chainOfCustodyReference: 'COC-9',
  });
  const [stability, material] = outcome.samples;
  const { methodIds: _m, ...fields } = stabilitySample;
  for (const [key, value] of Object.entries(fields))
    assert.deepEqual(stability[key as keyof Sample], value, key);
  assert.equal(stability.client, 'Formulation Development');
  assert.equal(stability.expiryKind, 'expiry');
  // Optional fields left out are stored empty, never missing.
  assert.deepEqual(
    [
      material.clientSampleId,
      material.strength,
      material.manufactureDate,
      material.expiryDate,
      material.maximumDailyDose,
      material.stability,
      material.remarks,
    ],
    ['', '', null, null, null, null, ''],
  );
});

test('received date/time, quantity, condition on receipt and batch/lot are mandatory', (t) => {
  const lab = memory(t);
  const sample = (patch: object) => ({
    ...receipt,
    samples: [rawMaterial, { ...finishedProduct, ...patch }],
  });
  for (const [command, message] of [
    [sample({ batch: ' ' }), /Sample 2, batch: Enter the batch or lot/],
    [sample({ batch: undefined }), /Sample 2, batch: Enter the batch or lot/],
    [
      sample({ conditionOnReceipt: '' }),
      /Sample 2, conditionOnReceipt: Enter the condition on receipt/,
    ],
    [sample({ quantity: undefined }), /Sample 2, quantity: Enter the quantity/],
    [
      sample({ quantity: { value: 0, unit: 'g' } }),
      /Sample 2, quantity.value: The quantity received must be a positive number/,
    ],
    [sample({ quantity: { value: -5, unit: 'g' } }), /positive number/],
    [sample({ quantity: { value: 5 } }), /Sample 2, quantity.unit/],
    [
      sample({ quantity: { value: '5', unit: 'g' } }),
      /quantity received as a number/,
    ],
    [
      { ...receipt, receivedAt: { at: '', reason: 'Late entry' } },
      /Enter a valid received date and time/,
    ],
    [
      { ...receipt, receivedAt: { reason: 'Late entry' } },
      /Enter a valid received date and time/,
    ],
  ] as const)
    assert.throws(() => run(lab, command, 'coordinator'), message);
  assert.equal(lab.snapshot().samples.length, 0);
  assert.equal(lab.snapshot().activity.length, 0);
});

test('received at defaults to server time; a correction needs a reason and is kept on the record', (t) => {
  const lab = memory(t);
  const plain = execute(lab, receipt, 'coordinator');
  assert.equal(plain.submission?.receivedAt, NOW);
  assert.equal(plain.samples[0].receivedAt, NOW);
  assert.equal(plain.submission?.receivedAtCorrection, null);
  // Leaving the received-at out is the same as not correcting it.
  const ignored = execute(
    lab,
    { ...receipt, receivedAt: undefined, samples: [rawMaterial] },
    'coordinator',
  );
  assert.equal(ignored.submission?.receivedAt, NOW);

  for (const [receivedAt, message] of [
    [{ at: '2026-09-10T07:40:00Z', reason: '' }, /reason/],
    [{ at: '2026-09-10T07:40:00Z', reason: '  ok ' }, /reason/],
    [
      { at: '2026-09-10T12:00:01Z', reason: 'Logged after unpacking' },
      /cannot be later than the time of saving/,
    ],
    [{ at: '10 September', reason: 'Logged late' }, /valid received date/],
  ] as const)
    assert.throws(
      () => run(lab, { ...receipt, receivedAt }, 'coordinator'),
      message,
    );
  assert.equal(lab.snapshot().submissions.length, 2);

  const corrected = execute(
    lab,
    {
      ...receipt,
      receivedAt: {
        at: '2026-09-10T09:40:00+02:00',
        reason: 'Delivered before the instrument run; logged once unpacked.',
      },
      samples: [finishedProduct, rawMaterial],
    },
    'coordinator',
  );
  assert.equal(corrected.submission?.receivedAt, '2026-09-10T07:40:00.000Z');
  assert.deepEqual(corrected.submission?.receivedAtCorrection, {
    recordedAt: NOW,
    reason: 'Delivered before the instrument run; logged once unpacked.',
  });
  assert.ok(
    corrected.samples.every((s) => s.receivedAt === '2026-09-10T07:40:00.000Z'),
  );
  // The correction is audit-trailed for every Sample it applies to, with the
  // server time it replaced and the reason.
  const trail = lab
    .snapshot()
    .activity.filter((a) => corrected.samples.some((s) => s.id === a.sampleId));
  assert.equal(trail.length, 2);
  for (const entry of trail) {
    assert.equal(entry.actor, 'coordinator');
    assert.equal(entry.at, NOW);
    assert.match(
      entry.detail,
      /Received at corrected from 2026-09-10T12:00:00.000Z to 2026-09-10T07:40:00.000Z; reason: Delivered before the instrument run/,
    );
  }
  assert.doesNotMatch(
    lab.snapshot().activity.find((a) => a.sampleId === plain.samples[0].id)!
      .detail,
    /corrected/,
  );
});

test('Maximum daily dose is required for finished products and not accepted for raw materials', (t) => {
  const lab = memory(t);
  for (const [samples, message] of [
    [
      [rawMaterial, { ...finishedProduct, maximumDailyDose: null }],
      /Sample 2: Enter the Maximum daily dose \(mg\/day\)/,
    ],
    [
      [{ ...finishedProduct, maximumDailyDose: undefined }],
      /Enter the Maximum daily dose/,
    ],
    [
      [{ ...finishedProduct, maximumDailyDose: 0 }],
      /positive number of mg\/day/,
    ],
    [
      [{ ...finishedProduct, maximumDailyDose: -1 }],
      /positive number of mg\/day/,
    ],
    [
      [{ ...rawMaterial, maximumDailyDose: 100 }],
      /raw material does not take a Maximum daily dose/,
    ],
  ] as const)
    assert.throws(
      () => run(lab, { ...receipt, samples }, 'coordinator'),
      message,
    );
  assert.equal(lab.snapshot().samples.length, 0);
  const [product, material] = execute(
    lab,
    { ...receipt, samples: [finishedProduct, rawMaterial] },
    'coordinator',
  ).samples;
  assert.equal(product.maximumDailyDose, 40);
  assert.equal(material.maximumDailyDose, null);
});

test('requested Methods must apply to the Sample Material type', (t) => {
  // Every seeded Method applies to both Material types, so the rule is
  // exercised over reference data holding one finished-product-only Method.
  const restricted = [
    ...methods,
    {
      ...methods[0],
      id: 'NIT-900-v1',
      code: 'NIT-900',
      materialTypes: ['finished product'] as const,
    },
  ];
  const lab = new Laboratory(':memory:', () => NOW, { methods: restricted });
  t.after(() => lab.close());
  assert.throws(
    () =>
      run(
        lab,
        {
          ...receipt,
          samples: [
            { ...finishedProduct, methodIds: ['NIT-900-v1'] },
            { ...rawMaterial, methodIds: ['NIT-005-v1', 'NIT-900-v1'] },
          ],
        },
        'coordinator',
      ),
    /Sample 2: NIT-900 v1 does not apply to a raw material/,
  );
  assert.equal(lab.snapshot().samples.length, 0);
  const s = run(
    lab,
    {
      ...receipt,
      samples: [{ ...finishedProduct, methodIds: ['NIT-900-v1'] }],
    },
    'coordinator',
  );
  assert.deepEqual(
    s.tests.map((x) => x.methodCode),
    ['NIT-900'],
  );
  assert.deepEqual(
    lab.snapshot().methods.map((m) => m.id),
    restricted.map((m) => m.id),
  );
});

test('a Stability sample is a finished product with study ID, time point and condition from fixed lists', (t) => {
  const lab = memory(t);
  const stability = { studyId: 'STAB-7', timePoint: '1M', condition: 'RT' };
  for (const [patch, message] of [
    [
      { stability: { ...stability, timePoint: '2M' } },
      /stability.timePoint: Choose a stability time point from the list/,
    ],
    [
      { stability: { ...stability, condition: '37 °C' } },
      /stability.condition: Choose a stability storage condition from the list/,
    ],
    [
      { stability: { ...stability, studyId: ' ' } },
      /Enter the stability study ID/,
    ],
    [
      { ...rawMaterial, stability },
      /Only a finished product can be a Stability sample/,
    ],
  ] as const)
    assert.throws(
      () =>
        run(
          lab,
          { ...receipt, samples: [{ ...finishedProduct, ...patch }] },
          'coordinator',
        ),
      message,
    );
  for (const timePoint of ['Initial', '3M', '36M'])
    for (const condition of ['RT', 'ACC'])
      assert.deepEqual(
        run(
          lab,
          {
            ...receipt,
            samples: [
              {
                ...finishedProduct,
                stability: { ...stability, timePoint, condition },
              },
            ],
          },
          'coordinator',
        ).stability,
        { studyId: 'STAB-7', timePoint, condition },
      );
});

test('receipt checks container count and that expiry or retest follows manufacture', (t) => {
  const lab = memory(t);
  for (const [patch, message] of [
    [{ containers: { count: 0, type: 'vial' } }, /at least 1/],
    [{ containers: { count: 1.5, type: 'vial' } }, /containers.count/],
    [{ containers: { count: 1, type: 'crate' } }, /containers.type/],
    [
      { manufactureDate: '2026-05-01', expiryDate: '2026-05-01' },
      /expiry date must be after the manufacture date/,
    ],
    [
      {
        manufactureDate: '2026-05-01',
        expiryDate: '2026-04-01',
        expiryKind: 'retest',
      },
      /retest date must be after the manufacture date/,
    ],
    [{ expiryDate: '2026-13-01' }, /expiryDate/],
  ] as const)
    assert.throws(
      () =>
        run(
          lab,
          { ...receipt, samples: [{ ...finishedProduct, ...patch }] },
          'coordinator',
        ),
      message,
    );
  assert.equal(lab.snapshot().samples.length, 0);
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
