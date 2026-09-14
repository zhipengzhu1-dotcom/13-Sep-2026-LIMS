import test from 'node:test';
import assert from 'node:assert/strict';
import {
  methods,
  type AcceptableIntake,
  type MaterialType,
  type OosInvestigation,
  type Result,
  type Sample,
  type Test,
} from '../src/laboratory/contracts.ts';
import { WorkflowError } from '../src/laboratory/workflow-error.ts';
import {
  recordResult,
  resultsView,
  type RecordResultInput,
  type Refusal,
} from '../src/laboratory/results.ts';
import { recordingAudit } from './recording-audit.ts';

/**
 * Table tests for the Result & OOS investigation module, driven through its
 * interface only: a Sample built in memory, a command or a question, and the
 * refusal, the state the questions then report and the audit entries recorded.
 */

const AT = '2026-09-10T12:00:00.000Z';
const RECORD = 'Test 26-00001/NIT-001-v1';

const limit: AcceptableIntake = {
  id: 1,
  analyteId: 'impurity-a',
  value: 26.5,
  sourceTitle: 'CDER Nitrosamine Impurity Acceptable Intake Limits',
  sourceUrl: 'https://www.fda.gov/',
  sourceRevisionDate: '2023-08-04',
  effectiveFrom: '2023-08-04',
  illustrative: true,
};

function testOf(methodId: string, materialType: MaterialType): Test {
  const method = methods.find((m) => m.id === methodId)!;
  const unit = materialType === 'finished product' ? 'ng/day' : 'ppm';
  return {
    id: method.id,
    methodId: method.id,
    methodCode: method.code,
    methodVersion: method.version,
    analyteId: method.analyteId,
    analyteName: 'Impurity A',
    technique: method.technique,
    unit,
    ...method.lodLoq[unit],
    results: [],
  };
}

/** An assigned Sample with one Test and no Results, in memory. */
function sampleOf(materialType: MaterialType = 'finished product'): Sample {
  return {
    id: '26-00001',
    submissionId: 'S26-0001',
    clientId: 'northstar',
    client: 'Northstar',
    clientSampleId: '',
    product: 'Demo tablets 10 mg',
    strength: '',
    batch: 'B-001',
    manufacturer: '',
    manufactureDate: null,
    expiryDate: null,
    expiryKind: 'expiry',
    quantity: { value: 60, unit: 'units' },
    containers: { count: 2, type: 'bottle' },
    conditionOnReceipt: 'Intact',
    storageCondition: '',
    storageLocation: '',
    materialType,
    maximumDailyDose: materialType === 'finished product' ? 40 : null,
    stability: null,
    dueDate: '2026-10-01',
    priority: 'Routine',
    remarks: '',
    retentionInstruction: '',
    receivedAt: AT,
    receivedBy: 'coordinator',
    assignee: 'analyst',
    status: 'In progress',
    deviations: [],
    lastReturn: null,
    tests: [testOf('NIT-001-v1', materialType)],
    investigations: [],
    revision: 3,
  };
}

const input = (fields: Partial<RecordResultInput> = {}): RecordResultInput => ({
  testId: 'NIT-001-v1',
  value: 2.5,
  instrumentReading: 1.25,
  sequenceId: 'SEQ-0001',
  reason: '',
  limit,
  worksheet: { id: 'ATT-1' },
  hasCertificate: false,
  ...fields,
});

/** Records a Result with its own recording writer; returns what it wrote. */
function record(sample: Sample, fields: Partial<RecordResultInput> = {}) {
  const audit = recordingAudit();
  const kind = recordResult(sample, input(fields), {
    actor: 'analyst',
    at: AT,
    audit,
  });
  return {
    kind,
    changes: audit.entries.map((e) => [
      `${e.recordType} ${e.recordId}`,
      e.field,
      e.oldValue,
      e.newValue,
      e.reason,
    ]),
  };
}

/** Puts an investigation on the current Result, as the investigation
 * commands leave it. */
function investigate(
  sample: Sample,
  state: 'Open' | 'Invalidated' | 'Confirmed',
): OosInvestigation {
  const test = sample.tests[0];
  const result = test.results.find((r) => r.status === 'current')!;
  const closed = state !== 'Open';
  const investigation: OosInvestigation = {
    id: 'OOS26-0001',
    testId: test.id,
    resultSequence: result.sequence,
    status: closed ? 'Closed' : 'Open',
    openedBy: 'manager',
    openedAt: AT,
    labErrorCheck: {
      findings: 'Reviewed the preparation log.',
      errorIdentified: state === 'Invalidated',
      by: 'analyst',
      at: AT,
    },
    outcome: closed ? state : null,
    assignableCause: state === 'Invalidated' ? 'Standard diluted twice.' : null,
    closedBy: closed ? 'manager' : null,
    closedAt: closed ? AT : null,
    clientNotification: null,
  };
  result.investigationId = investigation.id;
  if (state === 'Invalidated') result.status = 'invalidated';
  sample.investigations.push(investigation);
  return investigation;
}

const firstEntryChanges = [
  [RECORD, 'result.value', null, 2.5, null],
  [RECORD, 'result.unit', null, 'ng/day', null],
  [RECORD, 'result.qualifier', null, '< LOQ', null],
  [RECORD, 'result.instrumentReading', null, 1.25, null],
  [RECORD, 'result.sequenceId', null, 'SEQ-0001', null],
  [RECORD, 'result.attachmentId', null, 'ATT-1', null],
  [RECORD, 'result.limit.entry', null, 1, null],
  [RECORD, 'result.limit.value', null, 26.5, null],
  [RECORD, 'result.conformity', null, 'Complies', null],
];

type Accepted = {
  name: string;
  materialType?: MaterialType;
  arrange: (s: Sample) => void;
  fields: Partial<RecordResultInput>;
  kind: 'first entry' | 'correction' | 'retest';
  changes: unknown[][];
  /** The statuses of the Test's Results afterwards, oldest first. */
  statuses: Result['status'][];
};

const accepted: Accepted[] = [
  {
    name: 'a first entry writes every field, the Limit as entry and value',
    arrange: () => {},
    fields: {},
    kind: 'first entry',
    changes: firstEntryChanges,
    statuses: ['current'],
  },
  {
    name: 'a correction with a reason writes only what changed, with the reason',
    arrange: (s) => record(s),
    fields: {
      value: 3.1,
      instrumentReading: 1.55,
      reason: 'Dilution factor corrected',
    },
    kind: 'correction',
    changes: [
      [RECORD, 'result.value', 2.5, 3.1, 'Dilution factor corrected'],
      [
        RECORD,
        'result.qualifier',
        '< LOQ',
        'quantified',
        'Dilution factor corrected',
      ],
      [
        RECORD,
        'result.instrumentReading',
        1.25,
        1.55,
        'Dilution factor corrected',
      ],
    ],
    statuses: ['superseded', 'current'],
  },
  {
    name: 're-entering an unchanged value is still recorded',
    arrange: (s) => record(s),
    fields: { reason: 'Re-integrated' },
    kind: 'correction',
    changes: [[RECORD, 'result.value', 2.5, 2.5, 'Re-integrated']],
    statuses: ['superseded', 'current'],
  },
  {
    // Today's permissive rule, which #22 changes (ADR-0006): a Result over its
    // Limit with no investigation can still be corrected.
    name: 'a Result over its Limit with no investigation can be corrected',
    arrange: (s) => record(s, { value: 30 }),
    fields: { value: 3, reason: 'Transcription error' },
    kind: 'correction',
    changes: [
      [RECORD, 'result.value', 30, 3, 'Transcription error'],
      [
        RECORD,
        'result.conformity',
        'Does not comply',
        'Complies',
        'Transcription error',
      ],
    ],
    statuses: ['superseded', 'current'],
  },
  {
    name: 'a confirmed OOS is corrected once the Sample has a Certificate',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Confirmed');
    },
    fields: {
      value: 3,
      reason: 'Amendment: transcription error',
      hasCertificate: true,
    },
    kind: 'correction',
    changes: [
      [RECORD, 'result.value', 30, 3, 'Amendment: transcription error'],
      [
        RECORD,
        'result.conformity',
        'Does not comply',
        'Complies',
        'Amendment: transcription error',
      ],
    ],
    statuses: ['superseded', 'current'],
  },
  {
    name: 'a Retest after an Invalidated result needs no reason',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Invalidated');
    },
    fields: {},
    kind: 'retest',
    changes: firstEntryChanges,
    statuses: ['invalidated', 'current'],
  },
  {
    name: 'a raw material Result has no Limit, whatever is in force',
    materialType: 'raw material',
    arrange: () => {},
    fields: { value: 0.5 },
    kind: 'first entry',
    changes: [
      [RECORD, 'result.value', null, 0.5, null],
      [RECORD, 'result.unit', null, 'ppm', null],
      [RECORD, 'result.qualifier', null, 'quantified', null],
      [RECORD, 'result.instrumentReading', null, 1.25, null],
      [RECORD, 'result.sequenceId', null, 'SEQ-0001', null],
      [RECORD, 'result.attachmentId', null, 'ATT-1', null],
      [RECORD, 'result.conformity', null, 'Report', null],
    ],
    statuses: ['current'],
  },
];

for (const c of accepted)
  test(`recordResult: ${c.name}`, () => {
    const s = sampleOf(c.materialType);
    c.arrange(s);
    const view = resultsView(s).test('NIT-001-v1');
    assert.equal(
      view.correctionBlocker({
        hasCertificate: c.fields.hasCertificate ?? false,
      }),
      null,
    );
    const { kind, changes } = record(s, c.fields);
    assert.equal(kind, c.kind);
    assert.deepEqual(changes, c.changes);
    assert.deepEqual(
      view.history.map((h) => h.result.status),
      c.statuses,
      'the view recomputes after the command',
    );
    const current = view.current!;
    assert.equal(current.value, c.fields.value ?? 2.5);
    assert.equal(current.enteredBy, 'analyst');
    assert.equal(current.enteredAt, AT);
    assert.equal(current.sequence, c.statuses.length);
    assert.equal(current.investigationId, null);
    assert.equal(current.limit, c.materialType ? null : limit);
  });

type Refused = {
  name: string;
  arrange: (s: Sample) => void;
  fields: Partial<RecordResultInput>;
  /** The refusal the correction blocker gives, when the rule is one. */
  blocker: Refusal | null;
  reason: string;
};

const refused: Refused[] = [
  {
    name: 'a correction without a reason',
    arrange: (s) => record(s),
    fields: { value: 4, reason: 'no' },
    blocker: null,
    reason: 'Give a reason for changing the Result.',
  },
  {
    name: 'a correction while its investigation is open',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Open');
    },
    fields: { value: 3, reason: 'Re-integrated', hasCertificate: true },
    blocker: {
      code: 'investigation open',
      reason:
        'OOS investigation OOS26-0001 is open on this Result, so it cannot be corrected.',
      investigationId: 'OOS26-0001',
    },
    reason:
      'OOS investigation OOS26-0001 is open on this Result, so it cannot be corrected.',
  },
  {
    name: 'a confirmed OOS correction before the Sample has a Certificate',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Confirmed');
    },
    fields: { value: 3, reason: 'Re-integrated' },
    blocker: {
      code: 'confirmed OOS',
      reason:
        'This Result is a confirmed OOS (OOS26-0001) and cannot be corrected.',
      investigationId: 'OOS26-0001',
    },
    reason:
      'This Result is a confirmed OOS (OOS26-0001) and cannot be corrected.',
  },
  {
    name: 'the investigation is refused before a missing reason',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Open');
    },
    fields: { value: 3, reason: '' },
    blocker: {
      code: 'investigation open',
      reason:
        'OOS investigation OOS26-0001 is open on this Result, so it cannot be corrected.',
      investigationId: 'OOS26-0001',
    },
    reason:
      'OOS investigation OOS26-0001 is open on this Result, so it cannot be corrected.',
  },
  {
    name: 'a finished product Result with no Limit in force',
    arrange: () => {},
    fields: { limit: null },
    blocker: null,
    reason: 'No Acceptable intake is in force for Impurity A.',
  },
  {
    name: 'a Result whose worksheet was not found',
    arrange: () => {},
    fields: { worksheet: null },
    blocker: null,
    reason:
      'The worksheet attachment was not found. Upload the calculation worksheet again.',
  },
  {
    name: 'a Result on a Test the Sample does not have',
    arrange: () => {},
    fields: { testId: 'NIT-009-v1' },
    blocker: null,
    reason: 'Test not found.',
  },
];

for (const c of refused)
  test(`recordResult refuses ${c.name}, writing and changing nothing`, () => {
    const s = sampleOf();
    c.arrange(s);
    if (c.fields.testId === undefined) {
      const blocker = resultsView(s)
        .test('NIT-001-v1')
        .correctionBlocker({
          hasCertificate: c.fields.hasCertificate ?? false,
        });
      assert.deepEqual(blocker, c.blocker);
    }
    const before = structuredClone(s);
    const audit = recordingAudit();
    assert.throws(
      () =>
        recordResult(s, input(c.fields), { actor: 'analyst', at: AT, audit }),
      (e) => e instanceof WorkflowError && e.message === c.reason,
    );
    assert.deepEqual(audit.entries, []);
    assert.deepEqual(s, before);
  });

test('the correction blocker has nothing to block without a current Result', () => {
  const s = sampleOf();
  const view = resultsView(s).test('NIT-001-v1');
  assert.equal(view.current, undefined);
  assert.deepEqual(view.history, []);
  assert.equal(view.correctionBlocker({ hasCertificate: false }), null);
  record(s, { value: 30 });
  investigate(s, 'Invalidated');
  assert.equal(view.current, undefined, 'an Invalidated result is not current');
  assert.equal(view.correctionBlocker({ hasCertificate: false }), null);
});

test('Result history lists every Result oldest first with its investigation', () => {
  const s = sampleOf();
  record(s, { value: 30 });
  const investigation = investigate(s, 'Invalidated');
  record(s, { value: 2.5 });
  record(s, { value: 2.6, reason: 'Re-integrated' });
  const view = resultsView(s);
  assert.deepEqual(
    view.tests.map((t) => t.test.id),
    ['NIT-001-v1'],
  );
  assert.deepEqual(
    view
      .test('NIT-001-v1')
      .history.map((h) => [
        h.result.sequence,
        h.result.status,
        h.result.value,
        h.investigation?.id,
      ]),
    [
      [1, 'invalidated', 30, investigation.id],
      [2, 'superseded', 2.5, undefined],
      [3, 'current', 2.6, undefined],
    ],
  );
  assert.equal(view.test('NIT-001-v1').current?.value, 2.6);
  assert.throws(
    () => view.test('NIT-009-v1'),
    (e) => e instanceof WorkflowError && e.message === 'Test not found.',
  );
});
