import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { discardOutdatedDemoDatabase, seed } from '../server/seed.ts';
import { renderCertificate } from '../src/laboratory/certificate-renderer.ts';
import type { CertificateResult } from '../src/laboratory/certificate.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import {
  auditEntriesWithin,
  currentResult,
  enteredResultOn,
  investigationOf,
  methods,
  oosApprovalBlocker,
  oosPublishBlocker,
  oosRows,
  people,
  publishQueue,
  qualify,
  newCommandId,
  type AuditEntry,
  type Person,
  signatureMeanings,
  type Sample,
} from '../src/laboratory/contracts.ts';

/** The seeded demo accounts, whose hashes signatures are verified against.
 * Each password is the user ID followed by `-demo`. */
const accounts = new Accounts(':memory:');
accounts.seed(demoAccounts);
after(() => accounts.close());
const passwordOf = (actor: string) => `${actor}-demo`;

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

const worksheets = new WeakMap<Laboratory, string>();
/** One stored calculation worksheet per lab, for Results that do not test
 * attachments themselves. */
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
/** A new calculation worksheet, for a Retest, which is calculated again. */
function retestWorksheet(lab: Laboratory) {
  return lab.storeAttachment(
    {
      filename: 'retest worksheet.csv',
      contentType: 'text/csv',
      content: Buffer.from('reading,result\n1.25,12.4\n'),
    },
    'analyst',
  ).id;
}

/** Mints a fresh key per call — a distinct laboratory act. Tests that exercise
 * replay pass their own commandId instead. */
function execute(lab: Laboratory, command: object, actor: string) {
  return lab.execute(
    { commandId: newCommandId(), ...sent(lab, command, actor) },
    actor,
  );
}
/** The command as its actor would send it: signed with the actor's own
 * password if its type requires it, and an `enterResult` referencing the
 * lab's stored worksheet, unless the test supplies its own. */
function sent(lab: Laboratory, command: object, actor: string) {
  const type = (command as { type?: string }).type ?? '';
  const withAttachment =
    type === 'enterResult' && !('attachmentId' in command)
      ? { attachmentId: worksheet(lab), ...command }
      : command;
  return Object.hasOwn(signatureMeanings, type) && !('password' in command)
    ? { password: passwordOf(actor), ...withAttachment }
    : withAttachment;
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
/** How many distinct commands the audit trail records, leaving out worksheet
 * uploads. */
const commandsAudited = (lab: Laboratory) =>
  new Set(
    lab
      .snapshot()
      .audit.filter((e) => e.commandType !== 'storeAttachment')
      .map((e) => e.commandId),
  ).size;
/** Runs a command and returns its outcome with the audit entries it wrote, in
 * the order it wrote them, as `[record, field, old, new, reason]`. */
function audited(lab: Laboratory, command: object, actor: string) {
  const commandId = newCommandId();
  const outcome = lab.execute(
    { commandId, ...sent(lab, command, actor) },
    actor,
  );
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
  const lab = new Laboratory(':memory:', {
    clock: () => NOW,
    credentials: accounts,
  });
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
  const lab = new Laboratory(':memory:', { clock: () => now });
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
  assert.deepEqual(lab.snapshot().audit, []);
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
  assert.deepEqual(lab.snapshot().audit, []);
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
  // The correction is an audit entry on the Submission, from the server time
  // it replaced to the corrected time, with the reason; it joins the history
  // of every Sample in the Submission.
  const receivedAtEntries = (submissionId: string) =>
    lab
      .auditTrail()
      .filter(
        (e) =>
          e.recordType === 'Submission' &&
          e.recordId === submissionId &&
          e.field === 'receivedAt',
      )
      .reverse()
      .map((e) => [e.oldValue, e.newValue, e.reason, e.actor, e.at]);
  assert.deepEqual(receivedAtEntries(corrected.submission!.id), [
    [null, NOW, null, 'coordinator', NOW],
    [
      NOW,
      '2026-09-10T07:40:00.000Z',
      'Delivered before the instrument run; logged once unpacked.',
      'coordinator',
      NOW,
    ],
  ]);
  for (const s of corrected.samples)
    assert.ok(
      lab
        .auditTrail(s.id)
        .some((e) => e.field === 'receivedAt' && e.reason !== null),
    );
  assert.deepEqual(receivedAtEntries(plain.submission!.id), [
    [null, NOW, null, 'coordinator', NOW],
  ]);
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
  const lab = new Laboratory(':memory:', {
    clock: () => NOW,
    methods: restricted,
  });
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

test('the demo database is kept across restarts, and one from an older build is discarded and reseeded', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-demo-database-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, 'prototype.sqlite');
  /** What the server does on start. */
  const start = () => {
    discardOutdatedDemoDatabase(file);
    const lab = new Laboratory(file, { credentials: accounts });
    seed(lab);
    return lab;
  };
  const shape = (lab: Laboratory) =>
    lab.snapshot().samples.map((x) => [x.id, x.status]);

  let lab = start();
  const seeded = shape(lab);
  assert.ok(seeded.length, 'a new database is seeded');
  // The demo shows a Retest linked to the investigation that Invalidated the
  // Result before it.
  const retests = lab.snapshot().samples.flatMap((x) =>
    x.tests.flatMap((test) =>
      test.results.flatMap((r) => {
        const i = x.investigations.find((i) => i.id === r.retestAfter);
        return i
          ? [
              [
                i.outcome,
                i.testId === test.id,
                test.results.find((p) => p.sequence === i.resultSequence)
                  ?.status,
              ],
            ]
          : [];
      }),
    ),
  );
  assert.deepEqual(retests, [['Invalidated', true, 'invalidated']]);
  const added = execute(lab, receipt, 'coordinator').submission!.id;
  lab.close();
  // A database this build wrote is current, however often it is reopened.
  for (const restart of [1, 2]) {
    lab = start();
    assert.ok(
      lab.snapshot().submissions.some((x) => x.id === added),
      `restart ${restart} keeps the records`,
    );
    lab.close();
  }

  // A database left by an older build, with its own model of a Sample.
  for (const suffix of ['', '-wal', '-shm'])
    rmSync(file + suffix, { force: true });
  const legacy = new DatabaseSync(file);
  legacy.exec(`CREATE TABLE samples (id TEXT PRIMARY KEY, status TEXT);
    INSERT INTO samples VALUES ('26-00001', 'Reviewed');`);
  legacy.close();
  lab = start();
  t.after(() => lab.close());
  assert.deepEqual(shape(lab), seeded, 'discarded and seeded afresh');
  assert.ok(!lab.snapshot().submissions.some((x) => x.id === added));
});

test('the lab-wide audit trail is narrowed to a period of whole UTC days', (t) => {
  let now = '2026-09-09T23:59:59.999Z';
  const lab = new Laboratory(':memory:', { clock: () => now });
  t.after(() => lab.close());
  let s = run(lab, receipt, 'coordinator');
  now = '2026-09-10T00:00:00.000Z';
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  now = '2026-09-11T08:00:00.000Z';
  run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst-2' },
    'coordinator',
  );
  const days = (from: string, to: string) => [
    ...new Set(
      auditEntriesWithin(lab.auditTrail(), { from, to }).map((e) =>
        e.at.slice(0, 10),
      ),
    ),
  ];
  assert.deepEqual(days('', ''), ['2026-09-11', '2026-09-10', '2026-09-09']);
  assert.deepEqual(days('2026-09-10', ''), ['2026-09-11', '2026-09-10']);
  assert.deepEqual(days('', '2026-09-10'), ['2026-09-10', '2026-09-09']);
  assert.deepEqual(days('2026-09-10', '2026-09-10'), ['2026-09-10']);
  assert.deepEqual(days('2026-09-12', ''), []);
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
  const entry = {
    commandId: newCommandId(),
    attachmentId: worksheet(lab),
    ...result(s, 'NIT-001-v1', 1),
  };
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
          e.field !== 'result.qualifier' &&
          e.field !== 'result.conformity' &&
          e.field !== 'result.attachmentId' &&
          !e.field.startsWith('result.limit.'),
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
  const lab = new Laboratory(':memory:', { clock: () => now });
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
      ['clientId', 'northstar'],
      ['client', 'Northstar Pharma'],
      ['clientKind', 'external'],
      ['clientReference', ''],
      ['receivedAt', at],
      ['receivedBy', 'coordinator'],
      ['courier', ''],
      ['trackingNumber', ''],
      ['shippingCondition', 'ambient'],
      ['packageCondition', 'intact'],
      ['chainOfCustodyReference', ''],
    ]),
    ...created('Sample 26-00001', [
      ['submissionId', 'S26-0001'],
      ['clientId', 'northstar'],
      ['client', 'Northstar Pharma'],
      ['clientSampleId', ''],
      ['materialType', 'raw material'],
      ['product', 'Demo API'],
      ['strength', ''],
      ['batch', 'API-001'],
      ['manufacturer', ''],
      ['expiryKind', 'expiry'],
      ['quantity.value', 10],
      ['quantity.unit', 'g'],
      ['containers.count', 2],
      ['containers.type', 'bottle'],
      ['conditionOnReceipt', 'Intact'],
      ['storageCondition', ''],
      ['storageLocation', ''],
      ['dueDate', '2026-10-01'],
      ['priority', 'Routine'],
      ['remarks', ''],
      ['retentionInstruction', ''],
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
    [...Array(11).fill(null), ...Array(33).fill('26-00001')],
  );
});

const deviation = {
  kind: 'broken seal',
  description: 'Tamper seal on bottle 2 broken on arrival.',
};
const instruction = (
  s: Sample,
  decision: 'proceed' | 'withdraw',
  instructedAt = '2026-09-10T11:30:00+01:00',
) => ({
  type: 'recordClientInstruction',
  ...target(s),
  decision,
  contact: 'Dana Wells, QA Northstar',
  instructedAt,
});
function held(lab: Laboratory) {
  const s = run(lab, receipt, 'coordinator');
  return run(
    lab,
    { type: 'recordReceiptDeviation', ...target(s), ...deviation },
    'coordinator',
  );
}

test('a Receipt deviation recorded at receipt puts only that Sample on hold', (t) => {
  const lab = memory(t);
  const { outcome, changes } = audited(
    lab,
    {
      ...receipt,
      samples: [{ ...finishedProduct, deviations: [deviation] }, rawMaterial],
    },
    'coordinator',
  );
  const [heldSample, clean] = outcome.samples;
  assert.equal(heldSample.status, 'On hold');
  assert.deepEqual(heldSample.deviations, [
    {
      sequence: 1,
      ...deviation,
      recordedBy: 'coordinator',
      recordedAt: NOW,
      instruction: null,
    },
  ]);
  assert.equal(clean.status, 'Received');
  assert.deepEqual(clean.deviations, []);
  assert.deepEqual(
    changes.filter(([record]) => record === 'Sample 26-00001').slice(-3),
    [
      ['Sample 26-00001', 'status', null, 'On hold', null],
      ['Sample 26-00001', 'deviations.1.kind', null, 'broken seal', null],
      [
        'Sample 26-00001',
        'deviations.1.description',
        null,
        deviation.description,
        null,
      ],
    ],
  );
  assert.throws(
    () =>
      run(
        lab,
        {
          ...receipt,
          samples: [
            {
              ...finishedProduct,
              deviations: [{ kind: 'lost', description: 'x' }],
            },
          ],
        },
        'coordinator',
      ),
    /Receipt deviation/,
  );
});

test('recordReceiptDeviation holds a received Sample and is audited', (t) => {
  const lab = memory(t);
  let s = run(lab, receipt, 'coordinator');
  const command = {
    type: 'recordReceiptDeviation',
    ...target(s),
    ...deviation,
  };
  for (const actor of ['analyst', 'manager'])
    assert.throws(() => run(lab, command, actor), /coordinator/);
  assert.throws(
    () => run(lab, { ...command, description: ' ' }, 'coordinator'),
    /Describe the Receipt deviation/,
  );
  const first = audited(lab, command, 'coordinator');
  assert.deepEqual(first.changes, [
    ['Sample 26-00001', 'deviations.1.kind', null, 'broken seal', null],
    [
      'Sample 26-00001',
      'deviations.1.description',
      null,
      deviation.description,
      null,
    ],
    ['Sample 26-00001', 'status', 'Received', 'On hold', null],
  ]);
  s = first.outcome.samples[0];
  // A second problem on a held Sample is added; the Sample stays on hold.
  s = run(
    lab,
    {
      type: 'recordReceiptDeviation',
      ...target(s),
      kind: 'insufficient quantity',
      description: 'Only 20 of the 60 units stated were received.',
    },
    'coordinator',
  );
  assert.equal(s.status, 'On hold');
  assert.deepEqual(
    s.deviations.map((d) => [d.sequence, d.kind]),
    [
      [1, 'broken seal'],
      [2, 'insufficient quantity'],
    ],
  );
  // Once work has started, a deviation is no longer a receipt matter.
  const busy = assigned(lab);
  assert.throws(
    () =>
      run(
        lab,
        { type: 'recordReceiptDeviation', ...target(busy), ...deviation },
        'coordinator',
      ),
    /before the Sample is assigned/,
  );
});

test('no one can assign or enter Results on a held or withdrawn Sample', (t) => {
  const lab = memory(t);
  const s = held(lab);
  // Store the worksheet up front so the snapshots compare only the commands.
  worksheet(lab);
  const blocked = (sample: Sample, pattern: RegExp) => {
    const before = lab.snapshot();
    assert.throws(
      () =>
        run(
          lab,
          { type: 'assign', ...target(sample), assignee: 'analyst' },
          'coordinator',
        ),
      pattern,
    );
    assert.throws(
      () => run(lab, result(sample, sample.tests[0].id, 2.5), 'analyst'),
      pattern,
    );
    assert.throws(
      () =>
        run(lab, { type: 'submitForApproval', ...target(sample) }, 'analyst'),
      pattern,
    );
    assert.deepEqual(lab.snapshot(), before);
  };
  blocked(s, /on hold/);
  const withdrawn = run(lab, instruction(s, 'withdraw'), 'coordinator');
  assert.equal(withdrawn.status, 'Withdrawn');
  blocked(withdrawn, /withdrew/);
  assert.throws(
    () =>
      run(
        lab,
        { type: 'recordReceiptDeviation', ...target(withdrawn), ...deviation },
        'coordinator',
      ),
    /withdrew/,
  );
  assert.throws(
    () => run(lab, instruction(withdrawn, 'proceed'), 'coordinator'),
    /withdrew/,
  );
});

test("the Client's instruction to proceed releases the Sample and keeps its deviations", (t) => {
  const lab = memory(t);
  let s = held(lab);
  const { outcome, changes } = audited(
    lab,
    instruction(s, 'proceed'),
    'coordinator',
  );
  s = outcome.samples[0];
  assert.equal(s.status, 'Received');
  assert.deepEqual(s.deviations[0].instruction, {
    decision: 'proceed',
    contact: 'Dana Wells, QA Northstar',
    instructedAt: '2026-09-10T10:30:00.000Z',
    recordedBy: 'coordinator',
    recordedAt: NOW,
  });
  assert.deepEqual(changes, [
    [
      'Sample 26-00001',
      'deviations.1.instruction.decision',
      null,
      'proceed',
      null,
    ],
    [
      'Sample 26-00001',
      'deviations.1.instruction.contact',
      null,
      'Dana Wells, QA Northstar',
      null,
    ],
    [
      'Sample 26-00001',
      'deviations.1.instruction.instructedAt',
      null,
      '2026-09-10T10:30:00.000Z',
      null,
    ],
    ['Sample 26-00001', 'status', 'On hold', 'Received', null],
  ]);
  // Released, it goes through the normal workflow with the deviation kept.
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = entered(lab, s);
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.equal(s.status, 'Approved');
  assert.equal(s.deviations.length, 1);
  assert.equal(s.deviations[0].kind, 'broken seal');
  assert.equal(s.deviations[0].instruction?.decision, 'proceed');
});

test("recordClientInstruction is the Coordinator's, needs contact and time, and only answers a hold", (t) => {
  const lab = memory(t);
  const s = held(lab);
  for (const actor of ['analyst', 'manager'])
    assert.throws(
      () => run(lab, instruction(s, 'proceed'), actor),
      /coordinator/,
    );
  const { contact: _c, ...noContact } = instruction(s, 'proceed');
  const { instructedAt: _i, ...noTime } = instruction(s, 'proceed');
  assert.throws(
    () => run(lab, noContact, 'coordinator'),
    /Client contact who gave the instruction/,
  );
  assert.throws(
    () =>
      run(lab, { ...instruction(s, 'proceed'), contact: ' ' }, 'coordinator'),
    /Client contact/,
  );
  assert.throws(
    () => run(lab, noTime, 'coordinator'),
    /when the Client gave the instruction/,
  );
  assert.throws(
    () =>
      run(
        lab,
        { ...instruction(s, 'proceed'), decision: 'retest' },
        'coordinator',
      ),
    /proceed or withdraw/,
  );
  assert.throws(
    () =>
      run(
        lab,
        instruction(s, 'proceed', '2026-09-10T12:00:01Z'),
        'coordinator',
      ),
    /cannot be later than the time of saving/,
  );
  assert.equal(lab.snapshot().samples[0].status, 'On hold');
  const plain = run(lab, receipt, 'coordinator');
  assert.throws(
    () => run(lab, instruction(plain, 'proceed'), 'coordinator'),
    /only for a Sample on hold/,
  );
  // Withdrawing answers every open deviation and closes the Sample.
  let two = run(
    lab,
    {
      type: 'recordReceiptDeviation',
      ...target(s),
      kind: 'temperature excursion',
      description: 'Logger shows 31 °C for 6 hours in transit.',
    },
    'coordinator',
  );
  two = run(lab, instruction(two, 'withdraw'), 'coordinator');
  assert.equal(two.status, 'Withdrawn');
  assert.deepEqual(
    two.deviations.map((d) => d.instruction?.decision),
    ['withdraw', 'withdraw'],
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
    [record, 'result.attachmentId', null, worksheet(lab), null],
    [record, 'result.limit.entry', null, 1, null],
    [record, 'result.limit.value', null, 26.5, null],
    [record, 'result.conformity', null, 'Complies', null],
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

test('submitting, returning and approving audit the status and each signature, with the return comment as reason', (t) => {
  const lab = memory(t);
  let s = entered(lab, assigned(lab));
  const submit = audited(
    lab,
    { type: 'submitForApproval', ...target(s) },
    'analyst',
  );
  assert.deepEqual(submit.changes, [
    ['Sample 26-00001', 'status', 'In progress', 'Awaiting approval', null],
    ['Sample 26-00001', 'signature.meaning', null, 'performed by', null],
    ['Sample 26-00001', 'signature.signer', null, 'analyst', null],
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
    ['Sample 26-00001', 'signature.meaning', null, 'performed by', null],
    ['Sample 26-00001', 'signature.signer', null, 'analyst', null],
  ]);
  s = resubmit.outcome.samples[0];
  const approved = audited(lab, { type: 'approve', ...target(s) }, 'manager');
  const certificate = 'Certificate of Analysis 26-00001/v1';
  assert.deepEqual(approved.changes, [
    ['Sample 26-00001', 'status', 'Awaiting approval', 'Approved', null],
    [certificate, 'version', null, 1, null],
    [certificate, 'sha256', null, lab.certificate(s.id).sha256, null],
    ['Sample 26-00001', 'signature.meaning', null, 'approved by', null],
    ['Sample 26-00001', 'signature.signer', null, 'manager', null],
  ]);
});

test('a rejected command writes no audit entry', (t) => {
  const lab = memory(t);
  // Stored, and audited, before any command is attempted.
  worksheet(lab);
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

test('submission and Approval are Electronic signatures with printed name, time, meaning and the signed command', (t) => {
  const lab = memory(t);
  let s = entered(lab, assigned(lab));
  const submit = {
    commandId: newCommandId(),
    type: 'submitForApproval',
    ...target(s),
    password: 'analyst-demo',
  };
  s = lab.execute(submit, 'analyst').samples[0];
  // Returning is an unsigned, commented act.
  s = run(
    lab,
    { type: 'return', ...target(s), comment: 'Check the worksheet.' },
    'manager',
  );
  assert.equal(lab.snapshot().signatures.length, 1, 'a return is not signed');
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  const approve = {
    commandId: newCommandId(),
    type: 'approve',
    ...target(s),
    password: 'manager-demo',
  };
  s = lab.execute(approve, 'manager').samples[0];
  assert.equal(s.status, 'Approved');
  const [first, second, third] = lab.snapshot().signatures;
  assert.deepEqual(first, {
    sampleId: s.id,
    signerId: 'analyst',
    printedName: 'Alex Chen',
    signedAt: '2026-09-10T12:00:00.000Z',
    meaning: 'performed by',
    command: {
      commandId: submit.commandId,
      type: 'submitForApproval',
      sampleId: s.id,
      revision: submit.revision,
    },
  });
  assert.equal(second.meaning, 'performed by');
  assert.deepEqual(third, {
    sampleId: s.id,
    signerId: 'manager',
    printedName: 'Taylor Brooks',
    signedAt: '2026-09-10T12:00:00.000Z',
    meaning: 'approved by',
    command: {
      commandId: approve.commandId,
      type: 'approve',
      sampleId: s.id,
      revision: approve.revision,
    },
  });
  assert.match(third.signedAt, /T\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$/);
});

test('a wrong password applies nothing, writes no signature and releases the key', (t) => {
  const lab = memory(t);
  const s = entered(lab, assigned(lab));
  const before = lab.snapshot();
  const commandId = newCommandId();
  const submit = { commandId, type: 'submitForApproval', ...target(s) };
  for (const password of ['wrong', 'manager-demo', 'Analyst-demo', ' '])
    assert.throws(
      () => lab.execute({ ...submit, password }, 'analyst'),
      (e: Error & { status: number }) =>
        e.status === 403 && /password is incorrect/.test(e.message),
      `a password of ${JSON.stringify(password)} does not sign`,
    );
  assert.throws(() => lab.execute(submit, 'analyst'), /Enter your password/);
  assert.throws(
    () => lab.execute({ ...submit, password: '' }, 'analyst'),
    /Enter your password/,
  );
  assert.deepEqual(
    lab.snapshot(),
    before,
    'no Sample, audit entry or signature',
  );
  const applied = lab.execute(
    { ...submit, password: 'analyst-demo' },
    'analyst',
  );
  assert.equal(applied.outcome, 'applied', 'the same key is usable again');
  const awaiting = applied.samples[0];

  const approve = {
    commandId: newCommandId(),
    type: 'approve',
    ...target(awaiting),
  };
  const signed = lab.snapshot();
  assert.throws(
    () => lab.execute({ ...approve, password: 'analyst-demo' }, 'manager'),
    /password is incorrect/,
  );
  assert.deepEqual(lab.snapshot(), signed);
  assert.equal(
    lab.execute({ ...approve, password: 'manager-demo' }, 'manager').outcome,
    'applied',
  );
  assert.deepEqual(
    lab.snapshot().signatures.map((x) => x.meaning),
    ['performed by', 'approved by'],
  );
});

test('a retry with the wrong password is refused, not replayed as a success', (t) => {
  const lab = memory(t);
  const s = entered(lab, assigned(lab));
  const submit = {
    commandId: newCommandId(),
    type: 'submitForApproval',
    ...target(s),
  };
  lab.execute({ ...submit, password: 'analyst-demo' }, 'analyst');
  assert.throws(
    () => lab.execute({ ...submit, password: 'guess' }, 'analyst'),
    /password is incorrect/,
  );
  assert.equal(
    lab.execute({ ...submit, password: 'analyst-demo' }, 'analyst').outcome,
    'replayed',
  );
  assert.equal(lab.snapshot().signatures.length, 1, 'signed once');
});

test('the password is not part of the command fingerprint', () => {
  // Credentials that accept any password isolate the fingerprint: the same act
  // retried with a differently typed password is still the same act.
  const lab = new Laboratory(':memory:', {
    credentials: { checkPassword: () => true },
  });
  const s = entered(lab, assigned(lab));
  const submit = {
    commandId: newCommandId(),
    type: 'submitForApproval',
    ...target(s),
  };
  lab.execute({ ...submit, password: 'first' }, 'analyst');
  assert.equal(
    lab.execute({ ...submit, password: 'second' }, 'analyst').outcome,
    'replayed',
  );
  lab.close();
});

test('the password never reaches stored or returned data', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-signature-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, 'test.sqlite');
  const lab = new Laboratory(file, { credentials: accounts });
  let s = entered(lab, assigned(lab));
  const outcomes = [
    lab.execute(
      {
        commandId: newCommandId(),
        type: 'submitForApproval',
        ...target(s),
        password: 'analyst-demo',
      },
      'analyst',
    ),
  ];
  s = outcomes[0].samples[0];
  const approve = {
    commandId: newCommandId(),
    type: 'approve',
    ...target(s),
    password: 'manager-demo',
  };
  assert.throws(() =>
    lab.execute({ ...approve, password: 'rejected-guess' }, 'manager'),
  );
  outcomes.push(
    lab.execute(approve, 'manager'),
    lab.execute(approve, 'manager'),
  );
  assert.deepEqual(
    outcomes.map((o) => o.outcome),
    ['applied', 'applied', 'replayed'],
  );
  const snapshot = JSON.stringify(lab.snapshot());
  lab.close();
  const stored = [file, `${file}-wal`, `${file}-journal`]
    .filter(existsSync)
    .map((f) => readFileSync(f).toString('latin1'))
    .join('');
  assert.match(stored, /Taylor Brooks/, 'the store is readable as text');
  for (const secret of ['analyst-demo', 'manager-demo', 'rejected-guess']) {
    assert.ok(!stored.includes(secret), `${secret} is not in the database`);
    assert.ok(!snapshot.includes(secret), `${secret} is not in the snapshot`);
    assert.ok(
      !JSON.stringify(outcomes).includes(secret),
      `${secret} is not in an outcome`,
    );
  }
});

test('a laboratory without credentials refuses every signature', () => {
  const lab = new Laboratory(':memory:');
  const s = entered(lab, assigned(lab));
  assert.throws(
    () =>
      run(
        lab,
        { type: 'submitForApproval', ...target(s), password: 'analyst-demo' },
        'analyst',
      ),
    /cannot be verified/,
  );
  assert.equal(lab.snapshot().samples[0].status, 'In progress');
  lab.close();
});

test('a Result must reference a stored worksheet attachment', (t) => {
  const lab = memory(t);
  const s = assigned(lab);
  const before = lab.snapshot();
  assert.throws(
    () =>
      run(
        lab,
        { ...result(s, 'NIT-001-v1', 4), attachmentId: undefined },
        'analyst',
      ),
    /attachmentId/,
    'missing',
  );
  assert.throws(
    () =>
      run(lab, { ...result(s, 'NIT-001-v1', 4), attachmentId: ' ' }, 'analyst'),
    /attachmentId/,
    'blank',
  );
  assert.throws(
    () =>
      run(
        lab,
        { ...result(s, 'NIT-001-v1', 4), attachmentId: newCommandId() },
        'analyst',
      ),
    /worksheet attachment was not found/,
    'unknown',
  );
  assert.deepEqual(lab.snapshot(), before, 'nothing was recorded');

  const content = Buffer.from('%PDF-1.7\nworksheet\n');
  const stored = lab.storeAttachment(
    {
      filename: 'C:\\bench\\NIT-001 worksheet.pdf',
      contentType: 'application/pdf',
      content,
    },
    'analyst',
  );
  assert.deepEqual(
    { ...stored, id: undefined },
    {
      id: undefined,
      filename: 'NIT-001 worksheet.pdf',
      contentType: 'application/pdf',
      size: content.byteLength,
      sha256: createHash('sha256').update(content).digest('hex'),
      uploadedBy: 'analyst',
      uploadedAt: NOW,
    },
  );
  const { outcome, changes } = audited(
    lab,
    { ...result(s, 'NIT-001-v1', 4), attachmentId: stored.id },
    'analyst',
  );
  assert.equal(outcome.samples[0].tests[0].results[0].attachmentId, stored.id);
  assert.deepEqual(lab.snapshot().attachments, [stored]);
  // Storing it is on the audit trail: who uploaded which file, when, and its
  // SHA-256.
  assert.deepEqual(
    lab
      .auditTrail()
      .filter((e) => e.commandType === 'storeAttachment')
      .reverse()
      .map((e) => [
        `${e.recordType} ${e.recordId}`,
        e.sampleId,
        e.field,
        e.oldValue,
        e.newValue,
        e.actor,
        e.at,
      ]),
    [
      ['filename', 'NIT-001 worksheet.pdf'],
      ['contentType', 'application/pdf'],
      ['size', content.byteLength],
      ['sha256', stored.sha256],
    ].map(([field, value]) => [
      `Attachment ${stored.id}`,
      null,
      field,
      null,
      value,
      'analyst',
      NOW,
    ]),
  );
  // The trail names the worksheet; its record holds the filename and hash.
  assert.deepEqual(
    changes.find(([, field]) => field === 'result.attachmentId'),
    ['Test 26-00001/NIT-001-v1', 'result.attachmentId', null, stored.id, null],
  );
  const read = lab.readAttachment(stored.id)!;
  assert.deepEqual(Buffer.from(read.content), content);
  assert.equal(lab.readAttachment(newCommandId()), null);
});

test('only Analysts store worksheets, of an accepted type and size', (t) => {
  const lab = memory(t);
  const upload = (patch: object, actor = 'analyst') =>
    lab.storeAttachment(
      {
        filename: 'sheet.csv',
        contentType: 'text/csv',
        content: Buffer.from('a,b\n'),
        ...patch,
      },
      actor,
    );
  for (const actor of ['coordinator', 'manager'])
    assert.throws(() => upload({}, actor), /analyst role/);
  const refusals: [object, number][] = [
    [{ filename: 'run.exe', contentType: 'application/octet-stream' }, 415],
    [{ filename: 'sheet.pdf' }, 415],
    [{ filename: 'image.png', contentType: 'image/png' }, 415],
    [{ content: Buffer.from([0x61, 0, 0x62]) }, 415],
    [{ content: new Uint8Array(0) }, 400],
    [{ filename: '  ' }, 400],
    [{ content: Buffer.alloc(10 * 1024 * 1024 + 1, 0x61) }, 413],
  ];
  for (const [patch, status] of refusals)
    assert.throws(
      () => upload(patch),
      (e: Error & { status: number }) => e.status === status,
      JSON.stringify(Object.keys(patch)),
    );
  assert.equal(lab.snapshot().attachments.length, 0);
  assert.deepEqual(lab.auditTrail(), [], 'a refused upload is not audited');
  const xlsx = upload({
    filename: 'sheet.XLSX',
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: Buffer.from([0x50, 0x4b, 0x03, 0x04, 1]),
  });
  assert.equal(xlsx.filename, 'sheet.XLSX');
  const full = upload({ content: Buffer.alloc(10 * 1024 * 1024, 0x61) });
  assert.equal(full.size, 10 * 1024 * 1024);
});

/** A finished product Sample whose Impurity A Result (NIT-001, Limit 26.5
 * ng/day) does not comply, submitted for approval. */
function outOfSpecification(lab: Laboratory) {
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 30), 'analyst');
  s = run(lab, result(s, 'NIT-003-v1', 2.5), 'analyst');
  return run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
}
const openOos = (s: Sample, testId = 'NIT-001-v1') => ({
  type: 'openOosInvestigation',
  ...target(s),
  testId,
});
const labErrorCheck = (s: Sample, investigationId: string) => ({
  type: 'recordLabErrorCheck',
  ...target(s),
  investigationId,
  findings: 'Standard preparation log shows a dilution error.',
  errorIdentified: true,
});
const conclude = (
  s: Sample,
  investigationId: string,
  outcome: 'Invalidated' | 'Confirmed',
  assignableCause = '',
  causationConfirmed = outcome === 'Invalidated',
) => ({
  type: 'concludeOosInvestigation',
  ...target(s),
  investigationId,
  outcome,
  assignableCause,
  causationConfirmed,
});

test('a Result over its Limit is flagged and blocks Approval until an investigation is opened and closed', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  const flagged = currentResult(s.tests[0])!;
  assert.equal(flagged.conformity, 'Does not comply');
  assert.equal(flagged.investigationId, null);
  assert.deepEqual(
    oosRows(lab.snapshot().samples).map((r) => [
      r.sample.id,
      r.test.id,
      r.investigation?.status,
    ]),
    [[s.id, 'NIT-001-v1', undefined]],
    'the Manager list shows the Result still needing an investigation',
  );
  const before = lab.snapshot();
  assert.throws(
    () => run(lab, { type: 'approve', ...target(s) }, 'manager'),
    /Impurity A \(NIT-001\) Result does not comply.*opened and closed before Approval/,
  );
  assert.deepEqual(lab.snapshot(), before, 'nothing signed or saved');

  s = run(lab, openOos(s), 'manager');
  const [investigation] = s.investigations;
  assert.deepEqual(investigation, {
    id: 'OOS26-0001',
    testId: 'NIT-001-v1',
    resultSequence: 1,
    status: 'Open',
    openedBy: 'manager',
    openedAt: '2026-09-10T12:00:00.000Z',
    labErrorCheck: null,
    outcome: null,
    assignableCause: null,
    causationConfirmed: null,
    closedBy: null,
    closedAt: null,
    clientNotification: null,
  });
  assert.equal(currentResult(s.tests[0])!.investigationId, 'OOS26-0001');
  assert.throws(
    () => run(lab, { type: 'approve', ...target(s) }, 'manager'),
    /OOS investigation OOS26-0001 is open/,
  );
  s = run(lab, labErrorCheck(s, investigation.id), 'analyst');
  assert.throws(
    () => run(lab, { type: 'approve', ...target(s) }, 'manager'),
    /is open/,
    'a recorded error check does not close the investigation',
  );
  assert.equal(lab.snapshot().samples[0].status, 'Awaiting approval');
});

test('Invalidated: the Result stays on record with its cause and reference, and a retest allows Approval', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  const id = s.investigations[0].id;
  s = run(lab, labErrorCheck(s, id), 'analyst');
  assert.deepEqual(s.investigations[0].labErrorCheck, {
    findings: 'Standard preparation log shows a dilution error.',
    errorIdentified: true,
    by: 'analyst',
    at: '2026-09-10T12:00:00.000Z',
  });
  for (const cause of ['', '  ', 'no'])
    assert.throws(
      () => run(lab, conclude(s, id, 'Invalidated', cause), 'manager'),
      /assignable cause/,
    );
  s = run(
    lab,
    conclude(s, id, 'Invalidated', 'Standard diluted twice (prep log p. 14).'),
    'manager',
  );
  assert.deepEqual(
    [
      s.investigations[0].status,
      s.investigations[0].outcome,
      s.investigations[0].assignableCause,
      s.investigations[0].closedBy,
    ],
    [
      'Closed',
      'Invalidated',
      'Standard diluted twice (prep log p. 14).',
      'manager',
    ],
  );
  const invalidated = s.tests[0].results[0];
  assert.equal(invalidated.status, 'invalidated');
  assert.equal(invalidated.value, 30);
  assert.equal(
    investigationOf(s, invalidated)?.assignableCause,
    'Standard diluted twice (prep log p. 14).',
  );
  assert.equal(currentResult(s.tests[0]), undefined, 'a retest is required');
  assert.throws(
    () => run(lab, { type: 'approve', ...target(s) }, 'manager'),
    /retest Result is required on Impurity A \(NIT-001\)/,
  );
  assert.throws(
    () => run(lab, openOos(s), 'manager'),
    /current Result/,
    'an invalidated Result is not investigated again',
  );

  s = run(
    lab,
    { type: 'return', ...target(s), comment: 'Retest NIT-001 per OOS26-0001.' },
    'manager',
  );
  // The retest is a new Result on the same Test; no correction reason is
  // needed because nothing current is being replaced. It is calculated
  // again, so the Invalidated result's worksheet is refused.
  const before = lab.snapshot();
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 12.4), 'analyst'),
    (e: Error & { status: number }) =>
      e.status === 400 &&
      e.message ===
        "This calculation worksheet is Result #1's, which OOS investigation OOS26-0001 Invalidated. A Retest needs its own calculation worksheet.",
  );
  assert.deepEqual(lab.snapshot(), before, 'the refusal writes nothing');
  s = run(
    lab,
    {
      ...result(s, 'NIT-001-v1', 12.4),
      attachmentId: retestWorksheet(lab),
    },
    'analyst',
  );
  assert.deepEqual(
    s.tests[0].results.map((r) => [
      r.sequence,
      r.status,
      r.value,
      r.conformity,
      r.investigationId,
      r.retestAfter,
    ]),
    [
      [1, 'invalidated', 30, 'Does not comply', 'OOS26-0001', null],
      [2, 'current', 12.4, 'Complies', null, 'OOS26-0001'],
    ],
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.equal(s.status, 'Approved');
  // Never deleted: the Invalidated result is still in the approved record.
  const approved = lab.snapshot().samples[0];
  assert.equal(approved.tests[0].results[0].status, 'invalidated');
  assert.equal(approved.investigations.length, 1);
  assert.deepEqual(
    oosRows(lab.snapshot().samples).map((r) => [
      r.result.sequence,
      r.investigation?.outcome,
    ]),
    [[1, 'Invalidated']],
  );
});

test('Confirmed: Approval is allowed with the Result still Does not comply and linked to its investigation', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  const id = s.investigations[0].id;
  s = run(
    lab,
    {
      ...labErrorCheck(s, id),
      findings: 'No laboratory error found.',
      errorIdentified: false,
    },
    'analyst',
  );
  assert.throws(
    () => run(lab, conclude(s, id, 'Confirmed', 'Some cause'), 'manager'),
    /confirmed OOS has no assignable cause/,
  );
  s = run(lab, conclude(s, id, 'Confirmed'), 'manager');
  assert.deepEqual(
    [
      s.investigations[0].status,
      s.investigations[0].outcome,
      s.investigations[0].assignableCause,
    ],
    ['Closed', 'Confirmed', null],
  );
  assert.equal(oosApprovalBlocker(s), null);
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.equal(s.status, 'Approved');
  const current = currentResult(s.tests[0])!;
  assert.equal(current.conformity, 'Does not comply');
  assert.equal(current.investigationId, id);
  assert.equal(investigationOf(s, current)?.outcome, 'Confirmed');
});

test('OOS commands check roles, the assigned analyst and the order of the investigation', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  const refused = (command: object, actor: string, pattern: RegExp) => {
    const before = lab.snapshot();
    assert.throws(() => run(lab, command, actor), pattern);
    assert.deepEqual(lab.snapshot(), before, 'nothing applied or audited');
  };
  for (const actor of ['coordinator', 'analyst'])
    refused(openOos(s), actor, /requires the manager role/);
  refused(openOos(s, 'NIT-003-v1'), 'manager', /does not comply/);
  refused(openOos(s, 'NIT-999'), 'manager', /Test not found/);
  s = run(lab, openOos(s), 'manager');
  const id = s.investigations[0].id;
  refused(openOos(s), 'manager', /already has OOS investigation OOS26-0001/);
  refused(
    conclude(s, id, 'Confirmed'),
    'manager',
    /laboratory error check before/,
  );
  refused(labErrorCheck(s, id), 'manager', /requires the analyst role/);
  refused(labErrorCheck(s, id), 'analyst-2', /assigned analyst/);
  refused(labErrorCheck(s, 'OOS26-0099'), 'analyst', /not found/);
  refused({ ...labErrorCheck(s, id), findings: ' ' }, 'analyst', /findings/);
  s = run(lab, labErrorCheck(s, id), 'analyst');
  refused(labErrorCheck(s, id), 'analyst', /already recorded/);
  for (const actor of ['coordinator', 'analyst'])
    refused(conclude(s, id, 'Confirmed'), actor, /requires the manager role/);
  refused(
    { ...conclude(s, id, 'Confirmed'), outcome: 'Withdrawn' },
    'manager',
    /outcome/,
  );
  s = run(lab, conclude(s, id, 'Confirmed'), 'manager');
  refused(
    conclude(s, id, 'Invalidated', 'Late cause'),
    'manager',
    /already closed/,
  );
  refused(labErrorCheck(s, id), 'analyst', /already closed/);
});

test('the server invalidates only on an identified laboratory error the concluding Manager confirms caused the value, on the audit trail as themselves', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  s = run(lab, labErrorCheck(s, 'OOS26-0001'), 'analyst');
  const cause = 'Standard diluted twice (prep log p. 14).';
  const refused = (command: object, reason: string) => {
    const before = lab.snapshot();
    const entries = lab.auditTrail().length;
    assert.throws(
      () => run(lab, command, 'manager'),
      (e: Error & { status: number }) =>
        e.status === 400 && e.message === reason,
    );
    assert.deepEqual(lab.snapshot(), before);
    assert.equal(lab.auditTrail().length, entries, 'no audit entry');
  };
  refused(
    conclude(s, 'OOS26-0001', 'Invalidated', cause, false),
    'Confirm that the laboratory error the check identified caused the value before invalidating the Result.',
  );
  // The command must state the confirmation; it is never assumed.
  const { causationConfirmed: _, ...unstated } = conclude(
    s,
    'OOS26-0001',
    'Invalidated',
    cause,
  );
  assert.throws(
    () => run(lab, unstated, 'manager'),
    (e: Error & { status: number }) =>
      e.status === 400 && /causationConfirmed/.test(e.message),
  );

  const concluded = audited(
    lab,
    conclude(s, 'OOS26-0001', 'Invalidated', cause),
    'admin',
  );
  const confirmation = concluded.entries.find(
    (e) => e.field === 'causationConfirmed',
  );
  assert.deepEqual(
    confirmation && [
      confirmation.recordType,
      confirmation.recordId,
      confirmation.oldValue,
      confirmation.newValue,
      confirmation.actor,
      confirmation.at,
      confirmation.commandType,
    ],
    [
      'OOS investigation',
      'OOS26-0001',
      null,
      true,
      'admin',
      NOW,
      'concludeOosInvestigation',
    ],
  );
  assert.ok(
    concluded.entries.every((e) => e.actor === 'admin' && e.at === NOW),
  );
  const [investigation] = concluded.outcome.samples[0].investigations;
  assert.deepEqual(
    [
      investigation.causationConfirmed,
      investigation.closedBy,
      investigation.closedAt,
    ],
    [true, 'admin', NOW],
  );
  assert.ok(
    lab
      .auditTrail(s.id)
      .some((e) => e.field === 'causationConfirmed' && e.newValue === true),
    "the confirmation is in the Sample's exported audit trail",
  );
});

test('the server refuses Invalidated when the laboratory error check identified no error, and allows Confirmed', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  s = run(
    lab,
    { ...labErrorCheck(s, 'OOS26-0001'), errorIdentified: false },
    'analyst',
  );
  const before = lab.snapshot();
  assert.throws(
    () =>
      run(
        lab,
        conclude(s, 'OOS26-0001', 'Invalidated', 'Standard diluted twice.'),
        'manager',
      ),
    (e: Error & { status: number }) =>
      e.status === 400 &&
      e.message ===
        'The laboratory error check identified no laboratory error, so the Result cannot be Invalidated.',
  );
  assert.deepEqual(lab.snapshot(), before);
  s = run(lab, conclude(s, 'OOS26-0001', 'Confirmed'), 'manager');
  assert.deepEqual(
    [s.investigations[0].outcome, s.investigations[0].causationConfirmed],
    ['Confirmed', null],
  );
});

test('an Admin assigned the Sample records the laboratory error check as themselves', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  s = run(
    lab,
    { type: 'return', ...target(s), comment: 'Reassigning for the OOS.' },
    'manager',
  );
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'admin' },
    'coordinator',
  );
  assert.throws(
    () => run(lab, labErrorCheck(s, 'OOS26-0001'), 'analyst'),
    /assigned analyst/,
  );
  const checked = audited(lab, labErrorCheck(s, 'OOS26-0001'), 'admin');
  assert.ok(checked.entries.length > 0);
  assert.ok(checked.entries.every((e) => e.actor === 'admin' && e.at === NOW));
  assert.equal(
    checked.outcome.samples[0].investigations[0].labErrorCheck?.by,
    'admin',
  );
});

test('the server refuses correcting an uninvestigated OOS Result on its own, linking no worksheet and writing nothing', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 30), 'analyst');
  // The Analyst uploads the corrected worksheet before saving.
  const upload = lab.storeAttachment(
    {
      filename: 'corrected worksheet.csv',
      contentType: 'text/csv',
      content: Buffer.from('reading,result\n1.25,3\n'),
    },
    'analyst',
  );
  const before = lab.snapshot();
  const entries = lab.auditTrail().length;
  assert.throws(
    () =>
      run(
        lab,
        {
          ...result(s, 'NIT-001-v1', 3, 'Transcription error.'),
          attachmentId: upload.id,
        },
        'analyst',
      ),
    (e: Error & { status: number }) =>
      e.status === 400 &&
      e.message ===
        'This Result does not comply with its Limit and has no OOS investigation, so it cannot be corrected.',
  );
  assert.deepEqual(lab.snapshot(), before);
  assert.equal(lab.auditTrail().length, entries);
  assert.ok(
    !lab
      .snapshot()
      .samples.some((x) =>
        x.tests.some((y) =>
          y.results.some((r) => r.attachmentId === upload.id),
        ),
      ),
    'the uploaded worksheet is linked to no Result',
  );
  assert.deepEqual(
    oosRows(lab.snapshot().samples).map((r) => [
      r.result.value,
      r.investigation,
    ]),
    [[30, undefined]],
    'the OOS Result stays in the queue',
  );
});

test('a Result under investigation cannot be corrected around it', (t) => {
  const lab = memory(t);
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 30), 'analyst');
  s = run(lab, openOos(s), 'manager');
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 3, 'Re-integrated'), 'analyst'),
    /OOS investigation OOS26-0001 is open on this Result/,
  );
  s = run(lab, labErrorCheck(s, 'OOS26-0001'), 'analyst');
  s = run(lab, conclude(s, 'OOS26-0001', 'Confirmed'), 'manager');
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 3, 'Re-integrated'), 'analyst'),
    /confirmed OOS \(OOS26-0001\) and cannot be corrected/,
  );
  // The other Test is unaffected, and a second out-of-specification Result
  // gets its own investigation number.
  s = run(lab, result(s, 'NIT-003-v1', 120), 'analyst');
  s = run(lab, openOos(s, 'NIT-003-v1'), 'manager');
  assert.deepEqual(
    s.investigations.map((i) => [i.id, i.testId, i.status]),
    [
      ['OOS26-0001', 'NIT-001-v1', 'Closed'],
      ['OOS26-0002', 'NIT-003-v1', 'Open'],
    ],
  );
});

test('opening, checking and concluding an investigation audit each change', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  const record = 'OOS investigation OOS26-0001';
  const at = '2026-09-10T12:00:00.000Z';
  const opened = audited(lab, openOos(s), 'manager');
  assert.deepEqual(opened.changes, [
    [record, 'testId', null, 'NIT-001-v1', null],
    [record, 'resultSequence', null, 1, null],
    [record, 'status', null, 'Open', null],
    [record, 'openedBy', null, 'manager', null],
    [record, 'openedAt', null, at, null],
    [
      'Test 26-00001/NIT-001-v1',
      'result.investigationId',
      null,
      'OOS26-0001',
      null,
    ],
  ]);
  s = opened.outcome.samples[0];
  const checked = audited(lab, labErrorCheck(s, 'OOS26-0001'), 'analyst');
  assert.deepEqual(checked.changes, [
    [
      record,
      'labErrorCheck.findings',
      null,
      'Standard preparation log shows a dilution error.',
      null,
    ],
    [record, 'labErrorCheck.errorIdentified', null, true, null],
    [record, 'labErrorCheck.by', null, 'analyst', null],
    [record, 'labErrorCheck.at', null, at, null],
  ]);
  s = checked.outcome.samples[0];
  const cause = 'Standard diluted twice.';
  const concluded = audited(
    lab,
    conclude(s, 'OOS26-0001', 'Invalidated', cause),
    'manager',
  );
  assert.deepEqual(concluded.changes, [
    [record, 'outcome', null, 'Invalidated', null],
    [record, 'assignableCause', null, cause, null],
    [record, 'causationConfirmed', null, true, null],
    [record, 'status', 'Open', 'Closed', null],
    [record, 'closedBy', null, 'manager', null],
    [record, 'closedAt', null, at, null],
    [
      'Test 26-00001/NIT-001-v1',
      'result.status',
      'current',
      'invalidated',
      cause,
    ],
  ]);
  assert.ok(
    lab.auditTrail(s.id).some((e) => e.recordType === 'OOS investigation'),
    "investigation entries join the Sample's history",
  );
});

test('Approval freezes Certificate version 1 for a finished product with a Receipt deviation and a Confirmed OOS', (t) => {
  const lab = memory(t);
  let s = run(
    lab,
    {
      ...receipt,
      clientReference: 'PO-4471',
      samples: [
        {
          ...finishedProduct,
          clientSampleId: 'NP-STB-06',
          strength: '10 mg',
          manufacturer: 'Northstar Pharma, Plant 2',
          manufactureDate: '2026-01-15',
          expiryDate: '2028-01-14',
          stability: {
            studyId: 'STB-2026-04',
            timePoint: '6M',
            condition: 'ACC',
          },
          deviations: [deviation],
        },
      ],
    },
    'coordinator',
  );
  s = run(lab, instruction(s, 'proceed'), 'coordinator');
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = run(lab, result(s, 'NIT-001-v1', 30), 'analyst');
  s = run(lab, result(s, 'NIT-003-v1', 0.5), 'analyst');
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, openOos(s), 'manager');
  s = run(
    lab,
    {
      ...labErrorCheck(s, 'OOS26-0001'),
      findings: 'No laboratory error found.',
      errorIdentified: false,
    },
    'analyst',
  );
  s = run(lab, conclude(s, 'OOS26-0001', 'Confirmed'), 'manager');
  assert.deepEqual(lab.certificates(s.id), [], 'none before Approval');
  assert.throws(
    () => lab.certificate(s.id),
    (e: Error & { status: number }) =>
      e.status === 404 && /no Certificate of Analysis yet/.test(e.message),
  );

  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  const certificates = lab.certificates(s.id);
  assert.equal(certificates.length, 1);
  const [certificate] = certificates;
  assert.deepEqual(
    { ...certificate, content: undefined },
    {
      sampleId: s.id,
      version: 1,
      approvedAt: NOW,
      sha256: createHash('sha256')
        .update(JSON.stringify(certificate.content))
        .digest('hex'),
      content: undefined,
      publication: null,
      supersededBy: null,
    },
  );
  assert.deepEqual(lab.certificate(s.id), certificate);
  assert.deepEqual(lab.certificate(s.id, 1), certificate);
  assert.deepEqual(lab.snapshot().certificates, [
    {
      sampleId: s.id,
      version: 1,
      approvedAt: NOW,
      sha256: certificate.sha256,
      publication: null,
      supersededBy: null,
    },
  ]);
  t.assert.snapshot(certificate.content);

  const document = renderCertificate(certificate.content);
  assert.equal(document.reference, 'Sample 26-00001 · Version 1');
  assert.equal(document.marker, null);
  const table = document.sections.find((x) => x.kind === 'table');
  assert.deepEqual(table && [table.columns, table.rows], [
    [
      'Analyte',
      'Method',
      'Result',
      'Unit',
      'Limit',
      'Conformity statement',
      'OOS investigation',
    ],
    [
      [
        'Impurity A',
        'NIT-001 v1 (LC-MS/MS)',
        '30',
        'ng/day',
        '26.5 ng/day',
        'Does not comply',
        ['OOS26-0001, Confirmed, for Result 30 ng/day'],
      ],
      [
        'Impurity B',
        'NIT-003 v1 (LC-MS/MS)',
        '< LOD (1)',
        'ng/day',
        '96 ng/day',
        'Complies',
        '—',
      ],
    ],
  ]);
  assert.deepEqual(
    document.sections.map((x) => x.heading),
    [
      'Client and Submission',
      'Sample',
      'Stability study',
      'Receipt deviations',
      'Results',
      'Decision rule',
      'Electronic signatures',
    ],
  );
  assert.deepEqual(document.sections.at(-1), {
    kind: 'signatures',
    heading: 'Electronic signatures',
    signatures: [
      {
        meaning: 'Performed by',
        name: 'Alex Chen',
        signedAt: '2026-09-10 12:00:00 UTC',
      },
      {
        meaning: 'Approved by',
        name: 'Taylor Brooks',
        signedAt: '2026-09-10 12:00:00 UTC',
      },
    ],
  });

  // The labels are locked, hashed content: a changed label is a different
  // Certificate.
  const relabelled = structuredClone(certificate.content);
  relabelled.results[0].investigations[0].result.value = 29;
  assert.notEqual(
    createHash('sha256').update(JSON.stringify(relabelled)).digest('hex'),
    certificate.sha256,
  );
  // A `< LOQ` or `< LOD` decided Result is labelled as the Certificate reports
  // Results, with its unit.
  const labels = (investigations: CertificateResult['investigations']) => {
    const content = structuredClone(certificate.content);
    content.results[0].investigations = investigations;
    const doc = renderCertificate(content).sections.find(
      (x) => x.kind === 'table',
    );
    return doc?.kind === 'table' && doc.rows[0].at(-1);
  };
  assert.deepEqual(
    labels([
      {
        id: 'OOS26-0001',
        outcome: 'Invalidated',
        result: { value: 2, qualifier: '< LOQ', unit: 'ng/day' },
      },
      {
        id: 'OOS26-0002',
        outcome: 'Confirmed',
        result: { value: 0.5, qualifier: '< LOD', unit: 'ppm' },
      },
    ]),
    [
      'OOS26-0001, Invalidated, for Result < LOQ (3) ng/day',
      'OOS26-0002, Confirmed, for Result < LOD (1) ppm',
    ],
  );
});

test('a raw material Certificate reports each Result with Report and no Limit', (t) => {
  const lab = memory(t);
  let s = run(
    lab,
    {
      ...receipt,
      samples: [{ ...rawMaterial, methodIds: ['NIT-001-v1', 'NIT-005-v1'] }],
    },
    'coordinator',
  );
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = run(lab, result(s, 'NIT-001-v1', 0.02), 'analyst');
  s = run(lab, result(s, 'NIT-005-v1', 0.05), 'analyst');
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  const { content } = lab.certificate(s.id);
  assert.deepEqual(
    content.results.map((r) => [r.qualifier, r.conformity, r.limit]),
    [
      ['< LOQ', 'Report', null],
      ['quantified', 'Report', null],
    ],
  );
  t.assert.snapshot(content);
  const table = renderCertificate(content).sections.find(
    (x) => x.kind === 'table',
  );
  assert.deepEqual(table && [table.columns, table.rows, table.notes], [
    [
      'Analyte',
      'Method',
      'Result',
      'Unit',
      'Conformity statement',
      'OOS investigation',
    ],
    [
      [
        'Impurity A',
        'NIT-001 v1 (LC-MS/MS)',
        '< LOQ (0.03)',
        'ppm',
        'Report',
        '—',
      ],
      ['Impurity C', 'NIT-005 v1 (LC-MS/MS)', '0.05', 'ppm', 'Report', '—'],
    ],
    [],
  ]);
});

test('a Certificate stays as issued through replays, reference data changes and reopening', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-certificate-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, 'lab.sqlite');
  const lab = new Laboratory(file, { clock: () => NOW, credentials: accounts });
  let s = submitted(lab);
  const approve = {
    commandId: newCommandId(),
    type: 'approve',
    ...target(s),
    password: 'manager-demo',
  };
  s = lab.execute(approve, 'manager').samples[0];
  const issued = lab.certificate(s.id);
  assert.equal(issued.content.results[0].limit?.value, 26.5);
  assert.equal(lab.execute(approve, 'manager').outcome, 'replayed');
  assert.deepEqual(lab.certificates(s.id), [issued], 'nothing issued again');

  // A revised Acceptable intake now in force for the certified Analyte.
  execute(
    lab,
    {
      type: 'appendAcceptableIntake',
      analyteId: 'impurity-a',
      value: 18,
      sourceTitle: 'CDER Nitrosamine Impurity Acceptable Intake Limits',
      sourceUrl: 'https://www.fda.gov/example-revision',
      sourceRevisionDate: '2026-09-01',
      effectiveFrom: '2026-09-01',
      illustrative: true,
    },
    'manager',
  );
  assert.deepEqual(lab.certificate(s.id), issued);
  lab.close();

  // Reopened with changed Method reference data.
  const reopened = new Laboratory(file, {
    clock: () => NOW,
    credentials: accounts,
    methods: methods.map((m) => ({
      ...m,
      version: 2,
      technique: 'GC-MS',
      lodLoq: { 'ng/day': { lod: 5, loq: 10 }, ppm: { lod: 1, loq: 2 } },
    })),
  });
  t.after(() => reopened.close());
  assert.deepEqual(reopened.certificates(s.id), [issued]);
  assert.throws(
    () => reopened.certificate(s.id, 2),
    (e: Error & { status: number }) => e.status === 404,
  );
  assert.throws(
    () => reopened.certificates('26-99999'),
    (e: Error & { status: number }) => e.status === 404,
  );
});

/** A Sample taken from receipt through Approval. */
function throughApproval(lab: Laboratory, s: Sample) {
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = entered(lab, s);
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  return run(lab, { type: 'approve', ...target(s) }, 'manager');
}
const publish = (s: Sample, fields: object = {}) => ({
  type: 'publish',
  ...target(s),
  recipients: ['Dana Whitfield, QA Release'],
  channel: 'email',
  channelDetail: 'qa-release@northstar.example',
  publishedAt: NOW,
  ...fields,
});
const notifyClient = (s: Sample, investigationId: string, fields = {}) => ({
  type: 'recordClientOosNotification',
  ...target(s),
  investigationId,
  contact: 'Priya Nair, QA (phone)',
  sent: SENT_TO_CLIENT,
  notifiedAt: NOW,
  ...fields,
});
const SENT_TO_CLIENT =
  'OOS26-0001 data, worksheet and Laboratory error check findings, by email.';
/** A finished product approved with a Confirmed OOS (OOS26-0001). */
function approvedWithConfirmedOos(lab: Laboratory) {
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  s = run(
    lab,
    {
      ...labErrorCheck(s, 'OOS26-0001'),
      findings: 'No laboratory error found.',
      errorIdentified: false,
    },
    'analyst',
  );
  s = run(lab, conclude(s, 'OOS26-0001', 'Confirmed'), 'manager');
  return run(lab, { type: 'approve', ...target(s) }, 'manager');
}

test('publish moves an approved Sample to Published and records recipients, channel and time', (t) => {
  const lab = memory(t);
  let s = submitted(lab);
  assert.throws(
    () => run(lab, publish(s), 'coordinator'),
    /Only approved Samples can be published/,
  );
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  const issued = lab.certificate(s.id);
  assert.equal(issued.publication, null);

  for (const [fields, message] of [
    [{ recipients: [] }, /at least one recipient/],
    [{ recipients: [' '] }, /Enter the recipient/],
    [{ recipients: ['QA', 'qa'] }, /each recipient once/],
    [{ channel: 'fax' }, /email, portal, print or other/],
    [{ channel: 'other', channelDetail: '' }, /Describe how the Certificate/],
    [{ publishedAt: 'yesterday' }, /when the Certificate was issued/],
    [{ publishedAt: '2026-09-10T12:00:01.000Z' }, /later than the time/],
    [{ publishedAt: '2026-09-10T11:59:59.000Z' }, /before its Approval/],
  ] as const)
    assert.throws(() => run(lab, publish(s, fields), 'coordinator'), message);
  assert.equal(lab.snapshot().samples[0].status, 'Approved');

  const recipients = [
    'Dana Whitfield, QA Release',
    'Formulation Development archive',
  ];
  const command = {
    commandId: newCommandId(),
    ...publish(s, {
      recipients,
      channel: 'portal',
      channelDetail: 'Northstar supplier portal',
      // Entered with the Coordinator's offset; kept as the same instant.
      publishedAt: '2026-09-10T08:00:00-04:00',
    }),
  };
  const outcome = lab.execute(command, 'coordinator');
  s = outcome.samples[0];
  assert.equal(s.status, 'Published');
  const certificate = 'Certificate of Analysis 26-00001/v1';
  assert.deepEqual(
    lab
      .auditTrail()
      .filter((e) => e.commandId === command.commandId)
      .reverse()
      .map(change),
    [
      ['Sample 26-00001', 'status', 'Approved', 'Published', null],
      [certificate, 'publication.recipients.0', null, recipients[0], null],
      [certificate, 'publication.recipients.1', null, recipients[1], null],
      [certificate, 'publication.channel', null, 'portal', null],
      [
        certificate,
        'publication.channelDetail',
        null,
        'Northstar supplier portal',
        null,
      ],
      [certificate, 'publication.publishedAt', null, NOW, null],
    ],
  );
  const publication = {
    sampleId: s.id,
    version: 1,
    recipients,
    channel: 'portal',
    channelDetail: 'Northstar supplier portal',
    publishedAt: NOW,
    publishedBy: 'coordinator',
    recordedAt: NOW,
  };
  assert.deepEqual(lab.certificate(s.id), { ...issued, publication });
  assert.deepEqual(lab.certificates(s.id), [{ ...issued, publication }]);
  assert.deepEqual(
    lab.snapshot().certificates.map((c) => c.publication),
    [publication],
  );
  assert.equal(
    lab.certificate(s.id).sha256,
    issued.sha256,
    'the locked content is unchanged',
  );

  assert.equal(lab.execute(command, 'coordinator').outcome, 'replayed');
  assert.deepEqual(lab.certificate(s.id).publication, publication);
});

test('only a Coordinator publishes or records that the Client was informed', (t) => {
  const lab = memory(t);
  const s = approvedWithConfirmedOos(lab);
  for (const actor of ['analyst', 'manager']) {
    assert.throws(
      () => run(lab, notifyClient(s, 'OOS26-0001'), actor),
      /requires the coordinator role/,
    );
    assert.throws(
      () => run(lab, publish(s), actor),
      /requires the coordinator role/,
    );
  }
  assert.throws(() => run(lab, publish(s), 'unknown'), /Unknown user/);
  assert.equal(lab.snapshot().samples[0].status, 'Approved');
  assert.equal(
    lab.snapshot().samples[0].investigations[0].clientNotification,
    null,
  );
});

test('a Confirmed OOS blocks Publishing until the Client notification is recorded', (t) => {
  const lab = memory(t);
  let s = approvedWithConfirmedOos(lab);
  const blocked =
    /OOS investigation OOS26-0001 confirmed an OOS\. Record that the Client was informed before publishing\./;
  assert.match(oosPublishBlocker(s)!, blocked);
  assert.throws(() => run(lab, publish(s), 'coordinator'), blocked);
  assert.equal(lab.snapshot().samples[0].status, 'Approved');

  for (const [fields, message] of [
    [{ investigationId: 'OOS26-9999' }, /OOS investigation not found/],
    [{ contact: ' ' }, /Client contact who was informed/],
    [{ notifiedAt: '' }, /when the Client was informed/],
    [{ notifiedAt: '2026-09-10T12:00:01.000Z' }, /later than the time/],
    [{ sent: undefined }, /what was sent to the Client/],
    [
      { sent: ' - ' },
      /^State what data and Laboratory error check findings were sent to the Client\.$/,
    ],
    [{ sent: 'x'.repeat(2001) }, /what was sent to the Client/],
  ] as const) {
    const before = lab.snapshot();
    const entries = lab.auditTrail().length;
    assert.throws(
      () => run(lab, notifyClient(s, 'OOS26-0001', fields), 'coordinator'),
      (e: Error & { status: number }) =>
        e.status === 400 && message.test(e.message),
    );
    assert.deepEqual(lab.snapshot(), before);
    assert.equal(lab.auditTrail().length, entries, 'a refusal writes nothing');
  }

  const notified = audited(lab, notifyClient(s, 'OOS26-0001'), 'coordinator');
  assert.deepEqual(notified.changes, [
    [
      'OOS investigation OOS26-0001',
      'clientNotification.contact',
      null,
      'Priya Nair, QA (phone)',
      null,
    ],
    [
      'OOS investigation OOS26-0001',
      'clientNotification.sent',
      null,
      SENT_TO_CLIENT,
      null,
    ],
    [
      'OOS investigation OOS26-0001',
      'clientNotification.notifiedAt',
      null,
      NOW,
      null,
    ],
  ]);
  // On the Sample's audit trail as the Coordinator, at the server's time.
  assert.deepEqual(
    lab
      .auditTrail(s.id)
      .filter((e) => e.field === 'clientNotification.sent')
      .map((e) => [e.actor, e.at, e.commandType, e.newValue]),
    [['coordinator', NOW, 'recordClientOosNotification', SENT_TO_CLIENT]],
  );
  s = notified.outcome.samples[0];
  assert.equal(s.status, 'Approved', 'recording it is not a transition');
  assert.deepEqual(s.investigations[0].clientNotification, {
    contact: 'Priya Nair, QA (phone)',
    sent: SENT_TO_CLIENT,
    notifiedAt: NOW,
    recordedBy: 'coordinator',
    recordedAt: NOW,
  });
  assert.equal(oosPublishBlocker(s), null);
  assert.throws(
    () => run(lab, notifyClient(s, 'OOS26-0001'), 'coordinator'),
    /already recorded/,
  );
  s = run(lab, publish(s), 'coordinator');
  assert.equal(s.status, 'Published');
  assert.equal(
    lab.certificate(s.id).content.results[0].conformity,
    'Does not comply',
  );
});

test('Client notification is recorded only for a confirmed OOS', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  const onlyConfirmed = /only for a confirmed OOS/;
  assert.throws(
    () => run(lab, notifyClient(s, 'OOS26-0001'), 'coordinator'),
    onlyConfirmed,
    'not while the investigation is open',
  );
  s = run(lab, labErrorCheck(s, 'OOS26-0001'), 'analyst');
  s = run(
    lab,
    conclude(s, 'OOS26-0001', 'Invalidated', 'Dilution error in the standard.'),
    'manager',
  );
  assert.throws(
    () => run(lab, notifyClient(s, 'OOS26-0001'), 'coordinator'),
    onlyConfirmed,
  );
  s = run(
    lab,
    { type: 'return', ...target(s), comment: 'Retest NIT-001 per OOS26-0001.' },
    'manager',
  );
  s = run(
    lab,
    { ...result(s, 'NIT-001-v1', 2.5), attachmentId: retestWorksheet(lab) },
    'analyst',
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.equal(
    oosPublishBlocker(s),
    null,
    'an Invalidated OOS needs no notice',
  );
  // The Certificate still names the investigation behind the retest, with the
  // value it invalidated; the row's Conformity statement is the Retest's own.
  const { content } = lab.certificate(s.id);
  assert.deepEqual(
    content.results.map((r) => [r.value, r.conformity, r.investigations]),
    [
      [
        2.5,
        'Complies',
        [
          {
            id: 'OOS26-0001',
            outcome: 'Invalidated',
            result: { value: 30, qualifier: 'quantified', unit: 'ng/day' },
          },
        ],
      ],
      [2.5, 'Complies', []],
    ],
  );
  const table = renderCertificate(content).sections.find(
    (x) => x.kind === 'table',
  );
  assert.deepEqual(table?.kind === 'table' && table.rows, [
    [
      'Impurity A',
      'NIT-001 v1 (LC-MS/MS)',
      '< LOQ (3)',
      'ng/day',
      '26.5 ng/day',
      'Complies',
      ['OOS26-0001, Invalidated, for Result 30 ng/day'],
    ],
    [
      'Impurity B',
      'NIT-003 v1 (LC-MS/MS)',
      '< LOQ (3)',
      'ng/day',
      '96 ng/day',
      'Complies',
      '—',
    ],
  ]);
  assert.equal(run(lab, publish(s), 'coordinator').status, 'Published');
});

test('a Published Sample is locked against every command but starting an Amendment', (t) => {
  const lab = memory(t);
  let s = approvedWithConfirmedOos(lab);
  s = run(lab, notifyClient(s, 'OOS26-0001'), 'coordinator');
  s = run(lab, publish(s), 'coordinator');
  const before = lab.snapshot();
  const attempts: [object, string][] = [
    [{ type: 'assign', ...target(s), assignee: 'analyst-2' }, 'coordinator'],
    [result(s, 'NIT-003-v1', 1, 'Change'), 'analyst'],
    [{ type: 'submitForApproval', ...target(s) }, 'analyst'],
    [{ type: 'approve', ...target(s) }, 'manager'],
    [{ type: 'return', ...target(s), comment: 'Too late' }, 'manager'],
    [publish(s), 'coordinator'],
    [notifyClient(s, 'OOS26-0001'), 'coordinator'],
    [
      { type: 'recordReceiptDeviation', ...target(s), ...deviation },
      'coordinator',
    ],
    [instruction(s, 'proceed'), 'coordinator'],
    [openOos(s, 'NIT-003-v1'), 'manager'],
    [labErrorCheck(s, 'OOS26-0001'), 'analyst'],
    [conclude(s, 'OOS26-0001', 'Confirmed'), 'manager'],
  ];
  for (const [command, actor] of attempts)
    assert.throws(
      () => run(lab, command, actor),
      /Published Samples are locked/,
      (command as { type: string }).type,
    );
  assert.deepEqual(lab.snapshot(), before, 'nothing changed');
  assert.equal(lab.certificates(s.id).length, 1);
});

test('the Publish queue lists approved Samples by Due date', (t) => {
  const lab = memory(t);
  const received = execute(
    lab,
    {
      ...receipt,
      samples: [
        { ...finishedProduct, dueDate: '2026-10-05' },
        { ...rawMaterial, dueDate: '2026-10-01' },
        { ...finishedProduct, dueDate: '2026-10-01', priority: 'Urgent' },
        { ...finishedProduct, dueDate: '2026-09-20' },
      ],
    },
    'coordinator',
  ).samples;
  const approved = received.slice(0, 3).map((s) => throughApproval(lab, s));
  const queue = () => publishQueue(lab.snapshot().samples).map((s) => s.id);
  assert.deepEqual(
    queue(),
    ['26-00003', '26-00002', '26-00001'],
    'earliest Due date first, urgent first on the same day; unapproved Samples are not listed',
  );
  run(lab, publish(approved[2]), 'coordinator');
  assert.deepEqual(queue(), ['26-00002', '26-00001']);
});

const amendmentReason = 'Client query found a transcription error on NIT-001.';
const startAmendment = (s: Sample, reason = amendmentReason) => ({
  type: 'startAmendment',
  ...target(s),
  reason,
});
const versions = (lab: Laboratory, s: Sample) =>
  lab.certificates(s.id).map((c) => [c.version, c.supersededBy]);

test('an Amendment corrects a Published Certificate and issues version n+1 marked Amended, keeping version n', (t) => {
  const lab = memory(t);
  let s = submitted(lab);
  const onlyPublished =
    /Only a Published Certificate of Analysis can be amended/;
  assert.throws(
    () => run(lab, startAmendment(s), 'coordinator'),
    onlyPublished,
  );
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.throws(
    () => run(lab, startAmendment(s), 'manager'),
    /Approved samples are locked/,
    'an approved Certificate is Published before it can be amended',
  );
  s = run(lab, publish(s), 'coordinator');
  const v1 = lab.certificate(s.id, 1);

  // Starting: a Coordinator or Manager, with a reason.
  assert.throws(
    () => run(lab, startAmendment(s), 'analyst'),
    (e: Error & { status: number }) =>
      e.status === 403 && /coordinator or manager role/.test(e.message),
  );
  assert.throws(() => run(lab, startAmendment(s), 'unknown'), /Unknown user/);
  for (const reason of ['', '  ', 'no'])
    assert.throws(
      () => run(lab, startAmendment(s, reason), 'coordinator'),
      /Give a reason for the Amendment/,
    );
  assert.equal(lab.snapshot().samples[0].status, 'Published');
  const started = audited(lab, startAmendment(s), 'manager');
  assert.deepEqual(started.changes, [
    [
      'Sample 26-00001',
      'status',
      'Published',
      'Amendment in progress',
      amendmentReason,
    ],
  ]);
  s = started.outcome.samples[0];
  assert.equal(s.status, 'Amendment in progress');
  assert.deepEqual(lab.certificates(s.id), [v1], 'starting issues nothing');
  assert.throws(
    () => run(lab, startAmendment(s), 'coordinator'),
    onlyPublished,
    'one Amendment at a time',
  );

  // Correcting: the assigned Analyst, each change with a reason.
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 3.1, 'Typo'), 'analyst-2'),
    /assigned analyst/,
  );
  assert.throws(
    () => run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst'),
    /Correct at least one Result, with a reason, before submitting the Amendment/,
  );
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 3.1), 'analyst'),
    /Give a reason for changing the Result/,
  );
  const misread = 'Keyed from the wrong injection.';
  const transcribed = 'Transcription error: the worksheet gives 3.1 ng/day.';
  s = run(lab, result(s, 'NIT-001-v1', 3, misread), 'analyst');
  s = run(lab, result(s, 'NIT-001-v1', 3.1, transcribed), 'analyst');
  assert.deepEqual(
    s.tests[0].results.map((r) => [r.value, r.status, r.enteredBy, r.reason]),
    [
      [2.5, 'superseded', 'analyst', ''],
      [3, 'superseded', 'analyst', misread],
      [3.1, 'current', 'analyst', transcribed],
    ],
  );

  // Submitting and re-approving are signed, and a return keeps the Amendment.
  assert.throws(
    () =>
      run(
        lab,
        { type: 'submitForApproval', ...target(s), password: 'wrong' },
        'analyst',
      ),
    /password is incorrect/,
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  assert.equal(s.status, 'Awaiting approval');
  s = run(
    lab,
    {
      type: 'return',
      ...target(s),
      comment: 'Attach the corrected worksheet.',
    },
    'manager',
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  assert.throws(
    () =>
      run(lab, { type: 'approve', ...target(s), password: 'wrong' }, 'manager'),
    /password is incorrect/,
  );
  const approval = audited(lab, { type: 'approve', ...target(s) }, 'manager');
  s = approval.outcome.samples[0];
  assert.equal(s.status, 'Approved');

  const v2 = lab.certificate(s.id);
  assert.equal(v2.version, 2);
  const changeSummary =
    'Impurity A (NIT-001 v1): Result 2.5 → 3.1 ng/day, qualifier < LOQ → quantified (reasons: "Keyed from the wrong injection."; "Transcription error: the worksheet gives 3.1 ng/day.")';
  assert.deepEqual(v2.content.amendment, {
    reason: amendmentReason,
    changeSummary,
  });
  assert.deepEqual(
    approval.changes.filter(([record]) => String(record).endsWith('/v2')),
    [
      ['Certificate of Analysis 26-00001/v2', 'version', null, 2, null],
      ['Certificate of Analysis 26-00001/v2', 'sha256', null, v2.sha256, null],
    ],
  );
  assert.deepEqual(
    v2.content,
    {
      ...v1.content,
      version: 2,
      amendment: v2.content.amendment,
      results: [
        { ...v1.content.results[0], value: 3.1, qualifier: 'quantified' },
        v1.content.results[1],
      ],
      signatures: v2.content.signatures,
    },
    'otherwise the same content, with this approval’s signatures',
  );
  // The Analyst's Amendment submissions are signed "amended by"; the
  // re-approval is "approved by".
  assert.deepEqual(
    lab
      .snapshot()
      .signatures.map((x) => [x.meaning, x.signerId, x.command.type]),
    [
      ['performed by', 'analyst', 'submitForApproval'],
      ['approved by', 'manager', 'approve'],
      ['amended by', 'analyst', 'submitForApproval'],
      ['amended by', 'analyst', 'submitForApproval'],
      ['approved by', 'manager', 'approve'],
    ],
  );
  assert.deepEqual(
    v2.content.signatures.map((x) => [x.meaning, x.signerId]),
    [
      ['performed by', 'analyst'],
      ['amended by', 'analyst'],
      ['approved by', 'manager'],
    ],
  );
  assert.deepEqual(
    v1.content.signatures.map((x) => x.meaning),
    ['performed by', 'approved by'],
  );
  const document = renderCertificate(v2.content);
  assert.deepEqual(
    document.sections
      .flatMap((x) => (x.kind === 'signatures' ? x.signatures : []))
      .map((x) => x.meaning),
    ['Performed by', 'Amended by', 'Approved by'],
  );
  assert.equal(document.reference, 'Sample 26-00001 · Version 2');
  assert.equal(document.marker, 'Amended');
  assert.deepEqual(
    document.sections.find((x) => x.heading === 'Amendment'),
    {
      kind: 'text',
      heading: 'Amendment',
      paragraphs: [`Reason: ${amendmentReason}`, `Changes: ${changeSummary}`],
    },
  );
  assert.equal(renderCertificate(v1.content).marker, null);
  assert.deepEqual(
    lab.certificate(s.id, 1),
    v1,
    'version 1 is kept as issued, not superseded until version 2 is Published',
  );
  assert.deepEqual(versions(lab, s), [
    [1, null],
    [2, null],
  ]);

  // Publishing version 2 supersedes version 1, which stays retrievable.
  s = run(lab, publish(s), 'coordinator');
  assert.equal(s.status, 'Published');
  assert.deepEqual(versions(lab, s), [
    [1, 2],
    [2, null],
  ]);
  assert.deepEqual(lab.certificate(s.id, 1), { ...v1, supersededBy: 2 });
  assert.equal(lab.certificate(s.id).publication?.version, 2);
  assert.deepEqual(
    lab.snapshot().certificates.map((c) => [c.version, c.supersededBy]),
    [
      [1, 2],
      [2, null],
    ],
  );

  // A later Amendment summarises only its own corrections.
  s = run(
    lab,
    startAmendment(s, 'NIT-003 sequence ID recorded against the wrong run.'),
    'coordinator',
  );
  s = run(
    lab,
    {
      ...result(s, 'NIT-003-v1', 2.5, 'Sequence ID of the reported run.'),
      sequenceId: 'SEQ-0002',
    },
    'analyst',
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.deepEqual(lab.certificate(s.id).content.amendment, {
    reason: 'NIT-003 sequence ID recorded against the wrong run.',
    changeSummary:
      'Impurity B (NIT-003 v1): sequence ID SEQ-0001 → SEQ-0002 (reason: "Sequence ID of the reported run.")',
  });
  s = run(lab, publish(s), 'coordinator');
  assert.deepEqual(versions(lab, s), [
    [1, 2],
    [2, 3],
    [3, null],
  ]);
  assert.deepEqual(
    lab.certificates(s.id).map((c) => [c.sha256, c.content.results[0].value]),
    [
      [v1.sha256, 2.5],
      [v2.sha256, 3.1],
      [lab.certificate(s.id, 3).sha256, 3.1],
    ],
    'every version keeps the content the Client received',
  );
});

test('an Amendment corrects a confirmed OOS Result with a reason, keeping its investigation, and the correction passes the OOS gate afresh', (t) => {
  const lab = memory(t);
  let s = outOfSpecification(lab);
  s = run(lab, openOos(s), 'manager');
  s = run(
    lab,
    {
      ...labErrorCheck(s, 'OOS26-0001'),
      findings: 'No laboratory error found.',
      errorIdentified: false,
    },
    'analyst',
  );
  s = run(lab, conclude(s, 'OOS26-0001', 'Confirmed'), 'manager');
  s = run(
    lab,
    { type: 'return', ...target(s), comment: 'Check the NIT-003 run.' },
    'manager',
  );
  // Before a Certificate is Published, a confirmed OOS stands.
  const stands = /confirmed OOS \(OOS26-0001\) and cannot be corrected/;
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 2.5, 'Recalculated.'), 'analyst'),
    stands,
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  s = run(lab, notifyClient(s, 'OOS26-0001'), 'coordinator');
  s = run(lab, publish(s), 'coordinator');
  s = run(lab, startAmendment(s), 'coordinator');

  // In the Amendment it is corrected like any Result: with a reason.
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 28), 'analyst'),
    /Give a reason for changing the Result/,
  );
  const recalculated =
    'Recalculated with the dilution factor on the worksheet.';
  s = run(lab, result(s, 'NIT-001-v1', 28, recalculated), 'analyst');
  assert.deepEqual(
    s.tests[0].results.map((r) => [
      r.value,
      r.status,
      r.conformity,
      r.investigationId,
    ]),
    [
      [30, 'superseded', 'Does not comply', 'OOS26-0001'],
      [28, 'current', 'Does not comply', null],
    ],
    'the investigation stays linked to the Result it decided',
  );
  assert.deepEqual(
    s.investigations.map((i) => [i.id, i.status, i.outcome]),
    [['OOS26-0001', 'Closed', 'Confirmed']],
  );

  // Still out of specification: re-approval waits for its own investigation,
  // and an open one blocks a further correction.
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  assert.throws(
    () => run(lab, { type: 'approve', ...target(s) }, 'manager'),
    /does not comply with its Limit\. An OOS investigation must be opened and closed before Approval/,
  );
  s = run(lab, openOos(s), 'manager');
  s = run(
    lab,
    { type: 'return', ...target(s), comment: 'Retest per OOS26-0002.' },
    'manager',
  );
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 2.5, 'Retested.'), 'analyst'),
    /OOS investigation OOS26-0002 is open on this Result, so it cannot be corrected/,
  );
  s = run(lab, labErrorCheck(s, 'OOS26-0002'), 'analyst');
  s = run(
    lab,
    conclude(s, 'OOS26-0002', 'Invalidated', 'Dilution error in the standard.'),
    'manager',
  );
  s = run(
    lab,
    { ...result(s, 'NIT-001-v1', 2.5), attachmentId: retestWorksheet(lab) },
    'analyst',
  );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');

  const v2 = lab.certificate(s.id);
  assert.equal(v2.version, 2);
  const [corrected] = v2.content.results;
  // Each investigation is labelled with the Result it decided: the confirmed
  // OOS with the superseded value, the invalidation with the corrected value.
  const decided = (value: number) => ({
    value,
    qualifier: 'quantified',
    unit: 'ng/day',
  });
  assert.deepEqual(
    [corrected.value, corrected.conformity, corrected.investigations],
    [
      2.5,
      'Complies',
      [
        { id: 'OOS26-0001', outcome: 'Confirmed', result: decided(30) },
        { id: 'OOS26-0002', outcome: 'Invalidated', result: decided(28) },
      ],
    ],
  );
  assert.equal(
    v2.sha256,
    createHash('sha256').update(JSON.stringify(v2.content)).digest('hex'),
    'the labels are part of the hashed content',
  );
  const v1 = lab.certificate(s.id, 1);
  assert.deepEqual(v1.content.results[0].investigations, [
    { id: 'OOS26-0001', outcome: 'Confirmed', result: decided(30) },
  ]);
  assert.equal(
    v1.sha256,
    createHash('sha256').update(JSON.stringify(v1.content)).digest('hex'),
    'version 1 keeps its labels as issued',
  );
  const amended = renderCertificate(v2.content);
  assert.equal(amended.marker, 'Amended');
  const rows = amended.sections.find((x) => x.kind === 'table');
  assert.deepEqual(rows?.kind === 'table' && rows.rows[0], [
    'Impurity A',
    'NIT-001 v1 (LC-MS/MS)',
    '< LOQ (3)',
    'ng/day',
    '26.5 ng/day',
    'Complies',
    [
      'OOS26-0001, Confirmed, for Result 30 ng/day',
      'OOS26-0002, Invalidated, for Result 28 ng/day',
    ],
  ]);
  assert.deepEqual(
    amended.sections.find((x) => x.heading === 'Decision rule'),
    {
      kind: 'text',
      heading: 'Decision rule',
      paragraphs: [v2.content.decisionRule, v2.content.individualJudgement],
    },
  );
  // ISO/IEC 17025 7.8.8.1: the Retest's value change is a change to the
  // report, so the summary names it; its link to OOS26-0002 is on the trail
  // but is no change to report.
  assert.equal(
    v2.content.amendment!.changeSummary,
    'Impurity A (NIT-001 v1): Result 30 → 2.5 ng/day, qualifier quantified → < LOQ, Conformity statement Does not comply → Complies, worksheet replaced (reason: "Recalculated with the dilution factor on the worksheet.")',
  );
  assert.deepEqual(
    lab
      .auditTrail(s.id)
      .filter((e) => e.field === 'result.retestAfter')
      .map((e) => [e.commandType, e.actor, e.recordId, e.oldValue, e.newValue]),
    [['enterResult', 'analyst', `${s.id}/NIT-001-v1`, null, 'OOS26-0002']],
  );
  assert.equal(oosPublishBlocker(s), null, 'the Client was already informed');
  assert.equal(run(lab, publish(s), 'coordinator').status, 'Published');
});

test('a Manager never approves a Sample on which they entered or corrected a Result, including in an Amendment', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'lims-separation-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, 'test.sqlite');
  const open = (directory: readonly Person[] = people) =>
    new Laboratory(file, {
      clock: () => NOW,
      credentials: accounts,
      people: directory,
    });
  // Sam Rivera (analyst-2) works as an Analyst on two Samples.
  const lab = open();
  let [entered, amended] = execute(
    lab,
    { ...receipt, samples: [finishedProduct, finishedProduct] },
    'coordinator',
  ).samples;
  entered = run(
    lab,
    { type: 'assign', ...target(entered), assignee: 'analyst-2' },
    'coordinator',
  );
  for (const x of entered.tests)
    entered = run(lab, result(entered, x.id, 2.5), 'analyst-2');
  entered = run(
    lab,
    { type: 'submitForApproval', ...target(entered) },
    'analyst-2',
  );
  // Alex Chen tests the other; Sam corrects it in its Amendment.
  amended = run(lab, publish(throughApproval(lab, amended)), 'coordinator');
  amended = run(lab, startAmendment(amended), 'coordinator');
  amended = run(
    lab,
    { type: 'assign', ...target(amended), assignee: 'analyst-2' },
    'coordinator',
  );
  amended = run(
    lab,
    result(amended, 'NIT-001-v1', 3.1, 'Transcription error.'),
    'analyst-2',
  );
  amended = run(
    lab,
    { type: 'submitForApproval', ...target(amended) },
    'analyst-2',
  );
  assert.equal(enteredResultOn(amended, 'analyst-2'), true);
  lab.close();

  // Sam is then given the Manager role; the record of their work remains.
  const promoted = open(
    people.map((p) =>
      p.id === 'analyst-2' ? { ...p, role: 'manager' as const } : p,
    ),
  );
  t.after(() => promoted.close());
  const pending = promoted.snapshot().samples;
  assert.deepEqual(
    pending.map((x) => [x.id, x.status]),
    [
      [amended.id, 'Awaiting approval'],
      [entered.id, 'Awaiting approval'],
    ],
  );
  // Each refusal names the act that applies.
  const acts = new Map([
    [amended.id, 'corrected a Result on'],
    [entered.id, 'entered a Result on'],
  ]);
  for (const x of pending)
    assert.throws(
      () => run(promoted, { type: 'approve', ...target(x) }, 'analyst-2'),
      (e: Error & { status: number }) =>
        e.status === 403 &&
        e.message ===
          `You ${acts.get(x.id)} Impurity A (NIT-001), so another Manager must give Approval.`,
    );
  assert.deepEqual(promoted.snapshot().samples, pending, 'nothing changed');
  assert.equal(promoted.certificates(amended.id).length, 1);

  // Taylor Brooks entered nothing on either and approves both.
  for (const x of pending)
    assert.equal(
      run(promoted, { type: 'approve', ...target(x) }, 'manager').status,
      'Approved',
    );
  assert.equal(promoted.certificate(amended.id).version, 2);
  assert.deepEqual(
    promoted
      .certificate(amended.id)
      .content.signatures.map((x) => [x.meaning, x.signerId]),
    [
      ['performed by', 'analyst'],
      ['amended by', 'analyst-2'],
      ['approved by', 'manager'],
    ],
  );
});

test('an Admin acts in every role as themselves, and is refused Approval of a Sample on which they entered a Result', (t) => {
  const lab = memory(t);
  const trailOf = (s: Sample) =>
    lab.snapshot().audit.filter((e) => e.sampleId === s.id);

  // As Coordinator: receipt, a Receipt deviation and the Client's instruction.
  let s = run(lab, receipt, 'admin');
  assert.equal(s.receivedBy, 'admin');
  s = run(
    lab,
    { type: 'recordReceiptDeviation', ...target(s), ...deviation },
    'admin',
  );
  assert.equal(s.status, 'On hold');
  s = run(lab, instruction(s, 'proceed'), 'admin');
  assert.equal(s.status, 'Received');

  // An Admin can be assigned as the Analyst, and then enters the Results.
  s = run(lab, { type: 'assign', ...target(s), assignee: 'admin' }, 'admin');
  assert.equal(s.assignee, 'admin');
  const sheet = lab.storeAttachment(
    {
      filename: 'admin-sheet.csv',
      contentType: 'text/csv',
      content: Buffer.from('reading,result\n1.25,2.5\n'),
    },
    'admin',
  );
  assert.equal(sheet.uploadedBy, 'admin');
  for (const x of s.tests)
    s = run(lab, { ...result(s, x.id, 2.5), attachmentId: sheet.id }, 'admin');
  assert.ok(s.tests.every((x) => currentResult(x)?.enteredBy === 'admin'));

  // Signing needs the Admin's own password, not anyone else's.
  const submit = { type: 'submitForApproval', ...target(s) };
  assert.throws(
    () => run(lab, { ...submit, password: 'manager-demo' }, 'admin'),
    /password is incorrect/,
  );
  s = run(lab, submit, 'admin');
  assert.equal(s.status, 'Awaiting approval');

  // Separation of duties (ADR-0003, ADR-0004) binds the Admin too.
  const before = lab.snapshot();
  assert.throws(
    () => run(lab, { type: 'approve', ...target(s) }, 'admin'),
    (e: Error & { status: number }) =>
      e.status === 403 &&
      e.message ===
        'You entered a Result on Impurity A (NIT-001), so another Manager must give Approval.',
  );
  assert.deepEqual(lab.snapshot(), before, 'nothing applied or audited');

  // As Manager: return; then a Manager who entered nothing approves.
  s = run(lab, { type: 'return', ...target(s), comment: 'Recheck' }, 'admin');
  assert.equal(s.status, 'Returned');
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'admin');
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  // As Coordinator again: Publish, then start an Amendment.
  s = run(lab, publish(s), 'admin');
  assert.equal(s.status, 'Published');
  assert.equal(lab.certificate(s.id).publication?.publishedBy, 'admin');
  s = run(lab, startAmendment(s), 'admin');
  assert.equal(s.status, 'Amendment in progress');
  assert.deepEqual(
    lab
      .certificate(s.id)
      .content.signatures.map((x) => [x.meaning, x.signerId, x.printedName]),
    [
      ['performed by', 'admin', 'Jordan Park'],
      ['approved by', 'manager', 'Taylor Brooks'],
    ],
  );
  assert.ok(
    trailOf(s)
      .filter((e) => e.commandType !== 'approve')
      .every((e) => e.actor === 'admin'),
    'every act is attributed to the Admin’s own account',
  );

  // An OOS Sample tested by an Analyst: the Admin investigates as Manager,
  // approves with their own signature and informs the Client as Coordinator.
  let oos = outOfSpecification(lab);
  oos = run(lab, openOos(oos), 'admin');
  const id = oos.investigations[0].id;
  assert.throws(
    () => run(lab, labErrorCheck(oos, id), 'admin'),
    /assigned analyst/,
    'the laboratory error check stays with the assigned Analyst',
  );
  oos = run(
    lab,
    { ...labErrorCheck(oos, id), errorIdentified: false },
    'analyst',
  );
  oos = run(lab, conclude(oos, id, 'Confirmed'), 'admin');
  assert.throws(
    () =>
      run(lab, { type: 'approve', ...target(oos), password: 'admin' }, 'admin'),
    /password is incorrect/,
  );
  oos = run(lab, { type: 'approve', ...target(oos) }, 'admin');
  assert.equal(oos.status, 'Approved');
  assert.deepEqual(lab.certificate(oos.id).content.signatures.at(-1), {
    meaning: 'approved by',
    signerId: 'admin',
    printedName: 'Jordan Park',
    signedAt: NOW,
  });
  oos = run(lab, notifyClient(oos, id), 'admin');
  assert.equal(run(lab, publish(oos), 'admin').status, 'Published');
});

test('an Admin who recorded the Laboratory error check is refused Approval with 403, also in the Amendment; opening and concluding do not bar Approval', (t) => {
  const lab = memory(t);
  const checkRefusal =
    'You recorded the Laboratory error check for OOS26-0001, so another Manager must give Approval.';
  const refused = (s: Sample, actor: string) => {
    const before = lab.snapshot();
    assert.throws(
      () => run(lab, { type: 'approve', ...target(s) }, actor),
      (e: Error & { status: number }) =>
        e.status === 403 && e.message === checkRefusal,
    );
    // No change, no audit entry and no Electronic signature.
    assert.deepEqual(lab.snapshot(), before);
  };

  // The Analyst enters the Results; the Admin then takes the Sample over.
  let s = assigned(lab);
  s = run(lab, result(s, 'NIT-001-v1', 30), 'analyst');
  s = run(lab, result(s, 'NIT-003-v1', 2.5), 'analyst');
  s = run(lab, { type: 'assign', ...target(s), assignee: 'admin' }, 'admin');
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'admin');
  s = run(lab, openOos(s), 'manager');
  const id = s.investigations[0].id;
  s = run(lab, { ...labErrorCheck(s, id), errorIdentified: false }, 'admin');
  assert.equal(enteredResultOn(s, 'admin'), true);
  // Separation of duties is checked before the open investigation.
  assert.notEqual(oosApprovalBlocker(s), null);
  refused(s, 'admin');
  s = run(lab, conclude(s, id, 'Confirmed'), 'manager');
  refused(s, 'admin');

  // The Manager who opened and concluded the investigation gives Approval,
  // signing with their own password.
  assert.throws(
    () =>
      run(
        lab,
        { type: 'approve', ...target(s), password: 'admin-demo' },
        'manager',
      ),
    /password is incorrect/,
  );
  s = run(lab, { type: 'approve', ...target(s) }, 'manager');
  assert.equal(s.status, 'Approved');
  const approval = lab.snapshot().signatures.at(-1)!;
  assert.deepEqual(
    [approval.meaning, approval.signerId, Object.keys(approval.command).sort()],
    ['approved by', 'manager', ['commandId', 'revision', 'sampleId', 'type']],
  );

  // The check stays Bench work in the Amendment.
  s = run(lab, notifyClient(s, id), 'coordinator');
  s = run(lab, publish(s), 'coordinator');
  s = run(lab, startAmendment(s), 'coordinator');
  s = run(lab, { type: 'assign', ...target(s), assignee: 'analyst' }, 'admin');
  s = run(lab, result(s, 'NIT-003-v1', 2.6, 'Transcription error.'), 'analyst');
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  refused(s, 'admin');
  assert.equal(
    run(lab, { type: 'approve', ...target(s) }, 'manager').status,
    'Approved',
  );
  assert.equal(lab.certificate(s.id).version, 2);
});

test('an Admin is not a role anyone else acquires: the other roles are still refused outside their own', (t) => {
  const lab = memory(t);
  for (const actor of ['analyst', 'manager'])
    assert.throws(() => run(lab, receipt, actor), /coordinator role/);
  let s = run(lab, receipt, 'coordinator');
  // Only an Analyst or an Admin can be assigned.
  for (const assignee of ['coordinator', 'manager'])
    assert.throws(
      () => run(lab, { type: 'assign', ...target(s), assignee }, 'coordinator'),
      /Select an analyst/,
    );
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  // Assigned to someone else, an Admin enters no Result on the Sample.
  assert.throws(
    () => run(lab, result(s, 'NIT-001-v1', 1), 'admin'),
    /assigned analyst/,
  );
});
