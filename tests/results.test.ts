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
  concludeInvestigation,
  enteredResultOn,
  oosApprovalBlocker,
  oosPublishBlocker,
  oosRows,
  openInvestigation,
  recordClientNotification,
  recordLabErrorCheck,
  recordResult,
  resultsView,
  retestLabel,
  separationOfDutiesRefusal,
  type Act,
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
    causationConfirmed: state === 'Invalidated' ? true : null,
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

/** ADR-0006's refusals of a correction outside the OOS investigation. */
const uninvestigatedCorrection: Refusal = {
  code: 'OOS uninvestigated',
  reason:
    'This Result does not comply with its Limit and has no OOS investigation, so it cannot be corrected.',
  investigationId: null,
};
const openCorrection: Refusal = {
  code: 'investigation open',
  reason:
    'OOS investigation OOS26-0001 is open on this Result, so it cannot be corrected.',
  investigationId: 'OOS26-0001',
};
const confirmedCorrection: Refusal = {
  code: 'confirmed OOS',
  reason:
    'This Result is a confirmed OOS (OOS26-0001) and cannot be corrected.',
  investigationId: 'OOS26-0001',
};
const retestCall: Refusal = {
  code: 'retest required',
  reason:
    'Result #1 was Invalidated by OOS investigation OOS26-0001, so it cannot be corrected. Enter a Retest instead.',
  investigationId: 'OOS26-0001',
};

type Accepted = {
  name: string;
  materialType?: MaterialType;
  arrange: (s: Sample) => void;
  fields: Partial<RecordResultInput>;
  kind: 'first entry' | 'correction' | 'retest';
  changes: unknown[][];
  /** The statuses of the Test's Results afterwards, oldest first. */
  statuses: Result['status'][];
  /** The correction blocker beforehand, which a Retest does not ask. */
  blocker?: Refusal;
  /** The investigation the new Result records it follows; null by default. */
  retestAfter?: string;
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
    // A Retest replaces the Invalidated result, so the trail compares with
    // it, and records the investigation it follows as an audited field.
    name: 'a Retest after an Invalidated result needs no reason and records the investigation it follows',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Invalidated');
    },
    fields: {},
    kind: 'retest',
    changes: [
      [RECORD, 'result.value', 30, 2.5, null],
      [RECORD, 'result.qualifier', 'quantified', '< LOQ', null],
      [RECORD, 'result.conformity', 'Does not comply', 'Complies', null],
      [RECORD, 'result.retestAfter', null, 'OOS26-0001', null],
    ],
    statuses: ['invalidated', 'current'],
    blocker: retestCall,
    retestAfter: 'OOS26-0001',
  },
  {
    // Only a Retest records the link: correcting one supersedes it with a
    // Result that is no Retest, and the trail says so.
    name: 'a correction of a Retest records no link',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Invalidated');
      record(s);
    },
    fields: { value: 2.6, reason: 'Re-integrated' },
    kind: 'correction',
    changes: [
      [RECORD, 'result.value', 2.5, 2.6, 'Re-integrated'],
      [RECORD, 'result.retestAfter', 'OOS26-0001', null, 'Re-integrated'],
    ],
    statuses: ['invalidated', 'superseded', 'current'],
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
    assert.deepEqual(
      view.correctionBlocker({
        hasCertificate: c.fields.hasCertificate ?? false,
      }),
      c.blocker ?? null,
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
    assert.equal(current.retestAfter, c.retestAfter ?? null);
    assert.equal(current.limit, c.materialType ? null : limit);
    // Its own reading, sequence ID and worksheet, whatever kind it is.
    assert.deepEqual(
      [current.instrumentReading, current.sequenceId, current.attachmentId],
      [
        c.fields.instrumentReading ?? 1.25,
        c.fields.sequenceId ?? 'SEQ-0001',
        'ATT-1',
      ],
    );
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
    // ADR-0006: an OOS Result nobody investigated is never corrected away.
    name: 'a correction of a Result over its Limit with no investigation',
    arrange: (s) => record(s, { value: 30 }),
    fields: { value: 3, reason: 'Transcription error' },
    blocker: uninvestigatedCorrection,
    reason: uninvestigatedCorrection.reason,
  },
  {
    name: 'a correction of an uninvestigated OOS Result, even in an Amendment',
    arrange: (s) => record(s, { value: 30 }),
    fields: { value: 3, reason: 'Transcription error', hasCertificate: true },
    blocker: uninvestigatedCorrection,
    reason: uninvestigatedCorrection.reason,
  },
  {
    name: 'an Amendment correction of a confirmed OOS without a reason',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Confirmed');
    },
    fields: { value: 3, reason: 'no', hasCertificate: true },
    blocker: null,
    reason: 'Give a reason for changing the Result.',
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
    name: 'a Retest whose worksheet was not found',
    arrange: (s) => {
      record(s, { value: 30 });
      investigate(s, 'Invalidated');
    },
    fields: { worksheet: null },
    blocker: retestCall,
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

test('after invalidation the correction blocker calls for a Retest, and recording one keeps the Invalidated result', () => {
  const s = sampleOf();
  const view = resultsView(s).test('NIT-001-v1');
  assert.equal(view.history.length, 0);
  assert.equal(view.correctionBlocker({ hasCertificate: false }), null);
  record(s, { value: 30 });
  investigate(s, 'Invalidated');
  assert.equal(view.current, undefined, 'an Invalidated result is not current');
  for (const hasCertificate of [false, true])
    assert.deepEqual(view.correctionBlocker({ hasCertificate }), retestCall);
  // Entering a Result now never supersedes the Invalidated result: the
  // command records a Retest.
  assert.equal(record(s, { value: 2.5 }).kind, 'retest');
  assert.deepEqual(
    view.history.map((h) => [h.result.status, h.investigation?.id]),
    [
      ['invalidated', 'OOS26-0001'],
      ['current', undefined],
    ],
  );
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

// OOS investigation steps and blockers, driven through the real commands.

const INVESTIGATION = 'OOS investigation OOS26-0001';
const ID = 'OOS26-0001';
const SECOND = 'OOS26-0002';
const EARLIER = '2026-09-10T11:59:59.000Z';

/** The writer a refusal test watches; commands otherwise get their own. */
let watched: ReturnType<typeof recordingAudit> | null = null;

/** Runs a command as `actor` with a recording writer; returns what it gave
 * back and the entries it wrote. */
function acted<T>(actor: string, command: (act: Act) => T) {
  const audit = watched ?? recordingAudit();
  const outcome = command({ actor, at: AT, audit });
  return {
    outcome,
    changes: audit.entries.map((e) => [
      `${e.recordType} ${e.recordId}`,
      e.field,
      e.oldValue,
      e.newValue,
      e.reason,
    ]),
  };
}

const open = (s: Sample, testId = 'NIT-001-v1', allocate = () => 1) =>
  acted('manager', (act) => openInvestigation(s, { testId, allocate }, act));
const check = (s: Sample, errorIdentified = true, investigationId = ID) =>
  acted('analyst', (act) =>
    recordLabErrorCheck(
      s,
      {
        investigationId,
        findings: 'Standard preparation log shows a dilution error.',
        errorIdentified,
      },
      act,
    ),
  );
/** Concludes as the Manager; Invalidated confirms causation unless told not
 * to. */
const conclude = (
  s: Sample,
  outcome: 'Invalidated' | 'Confirmed',
  assignableCause = '',
  investigationId = ID,
  causationConfirmed = outcome === 'Invalidated',
) =>
  acted('manager', (act) =>
    concludeInvestigation(
      s,
      { investigationId, outcome, assignableCause, causationConfirmed },
      act,
    ),
  );
const notify = (
  s: Sample,
  notifiedAt: () => string = () => AT,
  investigationId = ID,
) =>
  acted('coordinator', (act) =>
    recordClientNotification(
      s,
      { investigationId, contact: 'Priya Nair, QA (phone)', notifiedAt },
      act,
    ),
  );

type Stage =
  | 'empty'
  | 'complying'
  | 'uninvestigated'
  | 'open'
  | 'checked'
  | 'error identified'
  | 'invalidated'
  | 'retested'
  | 'retested over its Limit'
  | 'retest corrected'
  | 'invalidated again'
  | 'retested again'
  | 'confirmed'
  | 'notified';

/** A one-Test Sample brought to a stage of its OOS investigation through the
 * module's own commands. */
function staged(stage: Stage): Sample {
  const s = sampleOf();
  if (stage === 'empty') return s;
  if (stage === 'complying') {
    record(s);
    return s;
  }
  record(s, { value: 30 });
  if (stage === 'uninvestigated') return s;
  open(s);
  if (stage === 'open') return s;
  // 'checked' found no laboratory error; 'error identified' and the
  // invalidated paths found one.
  const invalidated = [
    'invalidated',
    'retested',
    'retested over its Limit',
    'retest corrected',
    'invalidated again',
    'retested again',
  ];
  check(s, stage === 'error identified' || invalidated.includes(stage));
  if (stage === 'checked' || stage === 'error identified') return s;
  if (invalidated.includes(stage)) {
    conclude(s, 'Invalidated', 'Standard diluted twice.');
    if (stage === 'invalidated') return s;
    if (stage === 'retested' || stage === 'retest corrected') record(s);
    else record(s, { value: 31 });
    if (stage === 'retest corrected')
      record(s, { value: 2.6, reason: 'Re-integrated' });
    if (stage === 'invalidated again' || stage === 'retested again') {
      // The Retest over its Limit is its own OOS, investigated and
      // Invalidated in turn.
      open(s, 'NIT-001-v1', () => 2);
      check(s, true, SECOND);
      conclude(s, 'Invalidated', 'Column overloaded.', SECOND);
      if (stage === 'retested again') record(s);
    }
    return s;
  }
  conclude(s, 'Confirmed');
  if (stage === 'notified') notify(s);
  return s;
}

/** The handler's check of the notification time, which the module must ask
 * only once its own rules pass. */
const tooEarly = () => {
  throw new Error('The notification time was asked before the rules.');
};

type RefusedStep = {
  name: string;
  stage: Stage;
  command: (s: Sample, allocate: () => number) => unknown;
  reason: string;
  /** The question answering for the same rule, and the refusal it gives
   * (null when the rule is checked on the command's input only). */
  question?: (s: Sample) => Refusal | null;
  refusal?: Refusal;
};

const notComplying =
  'Only a current Result that does not comply with its Limit needs an OOS investigation.';
const noLaboratoryError =
  'The laboratory error check identified no laboratory error, so the Result cannot be Invalidated.';
const causationUnconfirmed =
  'Confirm that the laboratory error the check identified caused the value before invalidating the Result.';
const confirmedWithCausation =
  'A confirmed OOS has no laboratory error confirmed as its cause. Choose Invalidated to confirm one.';

const refusedSteps: RefusedStep[] = [
  {
    name: 'opening on a complying Result',
    stage: 'complying',
    command: (s, allocate) => open(s, 'NIT-001-v1', allocate),
    reason: notComplying,
  },
  {
    name: 'opening on a Test with no Result',
    stage: 'empty',
    command: (s, allocate) => open(s, 'NIT-001-v1', allocate),
    reason: notComplying,
  },
  {
    name: 'opening on an Invalidated result',
    stage: 'invalidated',
    command: (s, allocate) => open(s, 'NIT-001-v1', allocate),
    reason: notComplying,
  },
  {
    name: 'opening on an already investigated Result',
    stage: 'confirmed',
    command: (s, allocate) => open(s, 'NIT-001-v1', allocate),
    reason: 'This Result already has OOS investigation OOS26-0001.',
  },
  {
    name: 'opening on a Test the Sample does not have',
    stage: 'uninvestigated',
    command: (s, allocate) => open(s, 'NIT-009-v1', allocate),
    reason: 'Test not found.',
  },
  {
    name: 'a second Laboratory error check',
    stage: 'checked',
    command: (s) => check(s, false),
    reason:
      'The laboratory error check is already recorded for this investigation.',
  },
  {
    name: 'a Laboratory error check on a closed investigation',
    stage: 'confirmed',
    command: (s) => check(s),
    reason: 'OOS investigation OOS26-0001 is already closed.',
  },
  {
    name: 'a Laboratory error check on an unknown investigation',
    stage: 'open',
    command: (s) => check(s, true, 'OOS26-0099'),
    reason: 'OOS investigation not found.',
  },
  {
    name: 'concluding before the Laboratory error check',
    stage: 'open',
    command: (s) => conclude(s, 'Confirmed'),
    reason:
      'The assigned analyst must record the laboratory error check before the investigation is concluded.',
    question: (s) =>
      resultsView(s).investigation(ID).concludeBlocker('Confirmed'),
    refusal: {
      code: 'check pending',
      reason:
        'The assigned analyst must record the laboratory error check before the investigation is concluded.',
      investigationId: ID,
    },
  },
  {
    name: 'concluding a closed investigation',
    stage: 'invalidated',
    command: (s) => conclude(s, 'Invalidated', 'Late cause'),
    reason: 'OOS investigation OOS26-0001 is already closed.',
    question: (s) =>
      resultsView(s).investigation(ID).concludeBlocker('Invalidated'),
    refusal: {
      code: 'investigation closed',
      reason: 'OOS investigation OOS26-0001 is already closed.',
      investigationId: ID,
    },
  },
  {
    name: 'concluding an unknown investigation',
    stage: 'checked',
    command: (s) => conclude(s, 'Confirmed', '', 'OOS26-0099'),
    reason: 'OOS investigation not found.',
  },
  // ADR-0006: Invalidated needs the error the check identified, the
  // Manager's confirmation that it caused the value, and an assignable cause.
  ...[true, false].map((causationConfirmed): RefusedStep => ({
    name: `invalidating when the check identified no laboratory error${causationConfirmed ? ', even with causation confirmed' : ''}`,
    stage: 'checked',
    command: (s) =>
      conclude(
        s,
        'Invalidated',
        'Standard diluted twice.',
        ID,
        causationConfirmed,
      ),
    reason: noLaboratoryError,
    question: (s) =>
      resultsView(s).investigation(ID).concludeBlocker('Invalidated'),
    refusal: {
      code: 'no laboratory error',
      reason: noLaboratoryError,
      investigationId: ID,
    },
  })),
  {
    // The Analyst's flag alone never invalidates: the refusal stands although
    // the check identified an error.
    name: 'invalidating without the Manager confirming the error caused the value',
    stage: 'error identified',
    command: (s) =>
      conclude(s, 'Invalidated', 'Standard diluted twice.', ID, false),
    reason: causationUnconfirmed,
    question: (s) =>
      resultsView(s).investigation(ID).concludeBlocker('Invalidated'),
  },
  ...['', 'no'].map((cause): RefusedStep => ({
    name: `invalidating with causation confirmed and the assignable cause "${cause}"`,
    stage: 'error identified',
    command: (s) => conclude(s, 'Invalidated', cause),
    reason: 'Give the assignable cause for invalidating the Result.',
    question: (s) =>
      resultsView(s).investigation(ID).concludeBlocker('Invalidated'),
  })),
  {
    name: 'confirming with causation confirmed',
    stage: 'error identified',
    command: (s) => conclude(s, 'Confirmed', '', ID, true),
    reason: confirmedWithCausation,
    question: (s) =>
      resultsView(s).investigation(ID).concludeBlocker('Confirmed'),
  },
  {
    name: 'concluding a closed investigation again with another cause',
    stage: 'invalidated',
    command: (s) => conclude(s, 'Invalidated', 'A different cause.'),
    reason: 'OOS investigation OOS26-0001 is already closed.',
  },
  {
    name: 'confirming with an assignable cause',
    stage: 'checked',
    command: (s) => conclude(s, 'Confirmed', 'Some cause'),
    reason:
      'A confirmed OOS has no assignable cause. Choose Invalidated to record one.',
    question: (s) =>
      resultsView(s).investigation(ID).concludeBlocker('Confirmed'),
  },
  {
    name: 'Client notification while the investigation is open',
    stage: 'checked',
    command: (s) => notify(s, tooEarly),
    reason: 'Client notification is recorded only for a confirmed OOS.',
  },
  {
    name: 'Client notification for an Invalidated OOS',
    stage: 'invalidated',
    command: (s) => notify(s, tooEarly),
    reason: 'Client notification is recorded only for a confirmed OOS.',
  },
  {
    name: 'a second Client notification',
    stage: 'notified',
    command: (s) => notify(s, tooEarly),
    reason: 'The Client notification for OOS26-0001 is already recorded.',
  },
  {
    name: 'a Client notification before the investigation was closed',
    stage: 'confirmed',
    command: (s) => notify(s, () => EARLIER),
    reason:
      'The Client cannot have been informed of a confirmed OOS before the investigation was concluded.',
  },
  {
    name: 'a Client notification for an unknown investigation',
    stage: 'confirmed',
    command: (s) => notify(s, tooEarly, 'OOS26-0099'),
    reason: 'OOS investigation not found.',
  },
];

for (const c of refusedSteps)
  test(`OOS investigation refuses ${c.name}, writing, allocating and changing nothing`, () => {
    const s = staged(c.stage);
    if (c.question) assert.deepEqual(c.question(s), c.refusal ?? null);
    if (c.refusal) assert.equal(c.refusal.reason, c.reason);
    let allocated = 0;
    const before = structuredClone(s);
    const audit = recordingAudit();
    watched = audit;
    try {
      assert.throws(
        () => c.command(s, () => ++allocated),
        (e) => e instanceof WorkflowError && e.message === c.reason,
      );
    } finally {
      watched = null;
    }
    assert.deepEqual(audit.entries, []);
    assert.equal(allocated, 0, 'no investigation number consumed');
    assert.deepEqual(s, before);
  });

test('openInvestigation on a current OOS Result links both ways and audits each field', () => {
  const s = staged('uninvestigated');
  let allocated = 0;
  const { outcome: investigation, changes } = open(s, 'NIT-001-v1', () => {
    allocated++;
    return 12;
  });
  assert.equal(allocated, 1);
  assert.deepEqual(investigation, {
    id: 'OOS26-0012',
    testId: 'NIT-001-v1',
    resultSequence: 1,
    status: 'Open',
    openedBy: 'manager',
    openedAt: AT,
    labErrorCheck: null,
    outcome: null,
    assignableCause: null,
    causationConfirmed: null,
    closedBy: null,
    closedAt: null,
    clientNotification: null,
  });
  const record = 'OOS investigation OOS26-0012';
  assert.deepEqual(changes, [
    [record, 'testId', null, 'NIT-001-v1', null],
    [record, 'resultSequence', null, 1, null],
    [record, 'status', null, 'Open', null],
    [record, 'openedBy', null, 'manager', null],
    [record, 'openedAt', null, AT, null],
    [RECORD, 'result.investigationId', null, 'OOS26-0012', null],
  ]);
  const view = resultsView(s);
  const opened = view.investigation('OOS26-0012');
  assert.equal(opened.state, 'open');
  assert.equal(opened.result.investigationId, 'OOS26-0012');
  assert.equal(opened.test.id, 'NIT-001-v1');
  assert.equal(view.test('NIT-001-v1').history[0].investigation, investigation);
  assert.deepEqual(s.investigations, [investigation]);
  assert.throws(
    () => view.investigation('OOS26-0099'),
    (e) =>
      e instanceof WorkflowError &&
      e.message === 'OOS investigation not found.',
  );
});

test('recordLabErrorCheck audits the findings, the flag, who and when', () => {
  const s = staged('open');
  const { changes } = check(s);
  assert.deepEqual(changes, [
    [
      INVESTIGATION,
      'labErrorCheck.findings',
      null,
      'Standard preparation log shows a dilution error.',
      null,
    ],
    [INVESTIGATION, 'labErrorCheck.errorIdentified', null, true, null],
    [INVESTIGATION, 'labErrorCheck.by', null, 'analyst', null],
    [INVESTIGATION, 'labErrorCheck.at', null, AT, null],
  ]);
  const view = resultsView(s).investigation(ID);
  assert.equal(view.state, 'open', 'a check does not close the investigation');
  assert.equal(view.concludeBlocker('Invalidated'), null);
  assert.equal(view.concludeBlocker('Confirmed'), null);
});

test('concluding Invalidated keeps the Result on record, marked by its investigation, and requires a Retest', () => {
  const s = staged('error identified');
  const cause = 'Standard diluted twice.';
  const { changes } = conclude(s, 'Invalidated', cause);
  assert.deepEqual(changes, [
    [INVESTIGATION, 'outcome', null, 'Invalidated', null],
    [INVESTIGATION, 'assignableCause', null, cause, null],
    [INVESTIGATION, 'causationConfirmed', null, true, null],
    [INVESTIGATION, 'status', 'Open', 'Closed', null],
    [INVESTIGATION, 'closedBy', null, 'manager', null],
    [INVESTIGATION, 'closedAt', null, AT, null],
    [RECORD, 'result.status', 'current', 'invalidated', cause],
  ]);
  const view = resultsView(s);
  assert.equal(view.investigation(ID).state, 'invalidated');
  const t = view.test('NIT-001-v1');
  assert.equal(t.current, undefined);
  assert.equal(t.retestRequired, true);
  assert.deepEqual(
    t.history.map((h) => [
      h.result.status,
      h.result.value,
      h.investigation?.id,
      h.investigation?.assignableCause,
    ]),
    [['invalidated', 30, ID, cause]],
  );
  // The Invalidated result stays on record with its cause, the Manager's
  // confirmation and the check findings that cause rests on.
  const { investigation } = t.history[0];
  assert.deepEqual(
    [
      investigation?.labErrorCheck,
      investigation?.assignableCause,
      investigation?.causationConfirmed,
      investigation?.closedBy,
      investigation?.closedAt,
    ],
    [
      {
        findings: 'Standard preparation log shows a dilution error.',
        errorIdentified: true,
        by: 'analyst',
        at: AT,
      },
      cause,
      true,
      'manager',
      AT,
    ],
  );
});

/** Which outcomes a Manager may conclude, by what the check found. Confirmed
 * stays allowed whatever the check found; its confirmation is never stored. */
const concluded: [Stage, 'Invalidated' | 'Confirmed', boolean | null][] = [
  ['error identified', 'Invalidated', true],
  ['error identified', 'Confirmed', null],
  ['checked', 'Confirmed', null],
];

for (const [stage, outcome, stored] of concluded)
  test(`an investigation ${stage === 'checked' ? 'whose check found no laboratory error' : 'whose check identified a laboratory error'} concludes ${outcome}`, () => {
    const s = staged(stage);
    const view = resultsView(s).investigation(ID);
    assert.equal(view.concludeBlocker(outcome), null);
    conclude(
      s,
      outcome,
      outcome === 'Invalidated' ? 'Standard diluted twice.' : '',
    );
    assert.equal(view.state, outcome.toLowerCase());
    assert.equal(s.investigations[0].causationConfirmed, stored);
  });

test('concluding Confirmed writes no assignable cause and leaves the Result current', () => {
  const s = staged('checked');
  const { changes } = conclude(s, 'Confirmed');
  assert.deepEqual(changes, [
    [INVESTIGATION, 'outcome', null, 'Confirmed', null],
    [INVESTIGATION, 'status', 'Open', 'Closed', null],
    [INVESTIGATION, 'closedBy', null, 'manager', null],
    [INVESTIGATION, 'closedAt', null, AT, null],
  ]);
  const view = resultsView(s);
  assert.equal(view.investigation(ID).state, 'confirmed');
  assert.equal(view.test('NIT-001-v1').current?.investigationId, ID);
  assert.equal(view.test('NIT-001-v1').retestRequired, false);
});

test('recordClientNotification audits the contact and time, and stores who recorded it', () => {
  const s = staged('confirmed');
  let asked = 0;
  const { changes } = notify(s, () => {
    asked++;
    return AT;
  });
  assert.equal(asked, 1);
  assert.deepEqual(changes, [
    [
      INVESTIGATION,
      'clientNotification.contact',
      null,
      'Priya Nair, QA (phone)',
      null,
    ],
    [INVESTIGATION, 'clientNotification.notifiedAt', null, AT, null],
  ]);
  assert.deepEqual(s.investigations[0].clientNotification, {
    contact: 'Priya Nair, QA (phone)',
    notifiedAt: AT,
    recordedBy: 'coordinator',
    recordedAt: AT,
  });
});

const uninvestigatedBlocker: Refusal = {
  code: 'OOS uninvestigated',
  reason:
    'The Impurity A (NIT-001) Result does not comply with its Limit. An OOS investigation must be opened and closed before Approval.',
  investigationId: null,
};
const openBlocker: Refusal = {
  code: 'investigation open',
  reason:
    'OOS investigation OOS26-0001 is open. Approval waits until it is closed.',
  investigationId: ID,
};

const approvalBlockers: [Stage, Refusal | null][] = [
  ['empty', null],
  ['complying', null],
  ['uninvestigated', uninvestigatedBlocker],
  ['open', openBlocker],
  ['checked', openBlocker],
  [
    'invalidated',
    {
      code: 'retest required',
      reason:
        'A retest Result is required on Impurity A (NIT-001) before Approval.',
      investigationId: ID,
    },
  ],
  ['retested', null],
  ['retested over its Limit', uninvestigatedBlocker],
  ['confirmed', null],
  ['notified', null],
];

for (const [stage, blocker] of approvalBlockers)
  test(`the Approval blocker for a Sample ${stage}`, () => {
    const s = staged(stage);
    assert.deepEqual(resultsView(s).approvalBlocker, blocker);
    assert.equal(oosApprovalBlocker(s), blocker?.reason ?? null);
  });

const publishBlockers: [Stage, Refusal | null][] = [
  ['uninvestigated', null],
  ['open', null],
  ['invalidated', null],
  ['retested', null],
  [
    'confirmed',
    {
      code: 'notification pending',
      reason:
        'OOS investigation OOS26-0001 confirmed an OOS. Record that the Client was informed before publishing.',
      investigationId: ID,
    },
  ],
  ['notified', null],
];

for (const [stage, blocker] of publishBlockers)
  test(`the Publish blocker for a Sample ${stage}`, () => {
    const s = staged(stage);
    assert.deepEqual(resultsView(s).publishBlocker, blocker);
    assert.equal(oosPublishBlocker(s), blocker?.reason ?? null);
  });

const retests: [Stage, boolean, { id: string; outcome: string }[]][] = [
  ['empty', false, []],
  ['complying', false, []],
  ['uninvestigated', false, []],
  ['open', false, []],
  ['invalidated', true, [{ id: ID, outcome: 'Invalidated' }]],
  ['retested', false, [{ id: ID, outcome: 'Invalidated' }]],
  ['confirmed', false, [{ id: ID, outcome: 'Confirmed' }]],
];

for (const [stage, required, entries] of retests)
  test(`retest required and Certificate investigations for a Sample ${stage}`, () => {
    const t = resultsView(staged(stage)).test('NIT-001-v1');
    assert.equal(t.retestRequired, required);
    assert.deepEqual(t.certificateInvestigations, entries);
  });

test('Bench work lists who entered, corrected or retested each Result, of every status, and who recorded each Laboratory error check', () => {
  const s = sampleOf();
  const as = (actor: string, fields: Partial<RecordResultInput>) =>
    recordResult(s, input(fields), { actor, at: AT, audit: recordingAudit() });
  as('analyst', {});
  as('analyst-2', { value: 3, reason: 'Re-integrated' });
  as('analyst-2', { value: 30, reason: 'Dilution factor' });
  // The Manager opens and concludes; the check is recorded by the Admin
  // assigned the Sample (ADR-0005).
  open(s);
  acted('admin', (act) =>
    recordLabErrorCheck(
      s,
      {
        investigationId: ID,
        findings: 'Dilution error.',
        errorIdentified: true,
      },
      act,
    ),
  );
  conclude(s, 'Invalidated', 'Standard diluted twice.');
  as('admin', { value: 2.5 });
  const testId = 'NIT-001-v1';
  assert.deepEqual(resultsView(s).benchWork, [
    { person: 'analyst', act: 'entered', testId, resultSequence: 1 },
    { person: 'analyst-2', act: 'corrected', testId, resultSequence: 2 },
    { person: 'analyst-2', act: 'corrected', testId, resultSequence: 3 },
    { person: 'admin', act: 'retested', testId, resultSequence: 4 },
    {
      person: 'admin',
      act: 'Laboratory error check',
      testId,
      investigationId: ID,
    },
  ]);
  // Opening or concluding an investigation is not Bench work (ADR-0005).
  for (const [person, did] of [
    ['analyst', true],
    ['analyst-2', true],
    ['admin', true],
    ['manager', false],
    ['coordinator', false],
  ] as const)
    assert.equal(enteredResultOn(s, person), did, person);
});

/** Whose Bench work bars Approval, and the message naming the act. */
const separated: {
  stage: Stage;
  person: string;
  refusal: Refusal | null;
}[] = [
  {
    stage: 'complying',
    person: 'analyst',
    refusal: {
      code: 'separation of duties',
      reason:
        'You entered a Result on Impurity A (NIT-001), so another Manager must give Approval.',
      investigationId: null,
    },
  },
  {
    stage: 'retested',
    person: 'retester',
    refusal: {
      code: 'separation of duties',
      reason:
        'You retested Impurity A (NIT-001), so another Manager must give Approval.',
      investigationId: null,
    },
  },
  {
    stage: 'checked',
    person: 'checker',
    refusal: {
      code: 'separation of duties',
      reason:
        'You recorded the Laboratory error check for OOS26-0001, so another Manager must give Approval.',
      investigationId: ID,
    },
  },
  { stage: 'confirmed', person: 'manager', refusal: null },
  { stage: 'invalidated', person: 'manager', refusal: null },
  { stage: 'notified', person: 'coordinator', refusal: null },
];

for (const c of separated)
  test(`separation of duties for ${c.person} on a Sample ${c.stage}`, () => {
    const s = staged(c.stage);
    // Hand the act under test to its own person.
    if (c.person === 'retester') s.tests[0].results[1].enteredBy = 'retester';
    if (c.person === 'checker')
      s.investigations[0].labErrorCheck!.by = 'checker';
    const own = resultsView(s).benchWork.find((e) => e.person === c.person);
    assert.deepEqual(own ? separationOfDutiesRefusal(s, own) : null, c.refusal);
  });

test('the separation-of-duties message names a correction, and a person is refused for their first act', () => {
  const s = sampleOf();
  record(s, { value: 2.5 });
  recordResult(s, input({ value: 3, reason: 'Re-integrated' }), {
    actor: 'analyst-2',
    at: AT,
    audit: recordingAudit(),
  });
  const own = resultsView(s).benchWork.find((e) => e.person === 'analyst-2')!;
  assert.deepEqual(separationOfDutiesRefusal(s, own), {
    code: 'separation of duties',
    reason:
      'You corrected a Result on Impurity A (NIT-001), so another Manager must give Approval.',
    investigationId: null,
  });
  // The analyst entered the Result and recorded the check: the first act, the
  // entry, is named.
  record(s, { value: 30, reason: 'Dilution factor' });
  open(s);
  check(s);
  const first = resultsView(s).benchWork.find((e) => e.person === 'analyst')!;
  assert.equal(
    separationOfDutiesRefusal(s, first).reason,
    'You entered a Result on Impurity A (NIT-001), so another Manager must give Approval.',
  );
});

test('OOS rows list investigations and uninvestigated OOS Results, those needing action first', () => {
  const dated = (s: Sample, id: string, day: string) => {
    s.id = id;
    const at = `2026-09-${day}T00:00:00.000Z`;
    for (const i of s.investigations) i.openedAt = at;
    for (const t of s.tests) for (const r of t.results) r.enteredAt = at;
    return s;
  };
  const closed = dated(staged('confirmed'), '26-00001', '01');
  const opened = dated(staged('open'), '26-00002', '03');
  const required = dated(staged('uninvestigated'), '26-00003', '05');
  const olderOpen = dated(staged('checked'), '26-00004', '02');
  const none = dated(staged('complying'), '26-00005', '01');
  assert.deepEqual(
    oosRows([closed, opened, required, olderOpen, none]).map((r) => [
      r.sample.id,
      r.investigation?.status,
    ]),
    [
      ['26-00003', undefined],
      ['26-00004', 'Open'],
      ['26-00002', 'Open'],
      ['26-00001', 'Closed'],
    ],
  );
  assert.deepEqual(resultsView(opened).oosRows, oosRows([opened]));
  assert.deepEqual(resultsView(none).oosRows, []);
  assert.deepEqual(
    resultsView(staged('retested')).oosRows.map((r) => [
      r.result.sequence,
      r.investigation?.outcome,
    ]),
    [[1, 'Invalidated']],
    'a complying Retest is not listed; its Invalidated result stays',
  );
});

// ADR-0006: a Result over its Limit is decided only by its OOS investigation.

/** Per stage: the correction blocker without a Certificate, and in an
 * Amendment. */
const correctionBlockers: [Stage, Refusal | null, Refusal | null][] = [
  ['empty', null, null],
  ['complying', null, null],
  ['uninvestigated', uninvestigatedCorrection, uninvestigatedCorrection],
  ['open', openCorrection, openCorrection],
  ['checked', openCorrection, openCorrection],
  ['invalidated', retestCall, retestCall],
  ['retested', null, null],
  [
    'retested over its Limit',
    uninvestigatedCorrection,
    uninvestigatedCorrection,
  ],
  ['confirmed', confirmedCorrection, null],
  ['notified', confirmedCorrection, null],
];

for (const [stage, without, inAmendment] of correctionBlockers)
  for (const [hasCertificate, blocker] of [
    [false, without],
    [true, inAmendment],
  ] as const)
    test(`the correction blocker for a Sample ${stage}${hasCertificate ? ' in an Amendment' : ''}, and the command agrees`, () => {
      const s = staged(stage);
      const view = resultsView(s).test('NIT-001-v1');
      assert.deepEqual(view.correctionBlocker({ hasCertificate }), blocker);
      // Only a current Result can be corrected; without one the command
      // records a first entry or a Retest instead.
      if (!blocker || !view.current) return;
      const before = structuredClone(s);
      const audit = recordingAudit();
      assert.throws(
        () =>
          recordResult(
            s,
            input({ value: 3, reason: 'Transcription error', hasCertificate }),
            { actor: 'analyst', at: AT, audit },
          ),
        (e) => e instanceof WorkflowError && e.message === blocker.reason,
      );
      assert.deepEqual(audit.entries, []);
      assert.deepEqual(s, before);
    });

test('a refused correction leaves the uninvestigated OOS Result current and in the OOS queue', () => {
  const s = staged('uninvestigated');
  assert.throws(() => record(s, { value: 3, reason: 'Transcription error' }));
  const view = resultsView(s);
  assert.equal(view.test('NIT-001-v1').current?.value, 30);
  assert.deepEqual(
    view.oosRows.map((r) => [r.result.sequence, r.investigation]),
    [[1, undefined]],
  );
  assert.deepEqual(view.approvalBlocker, uninvestigatedBlocker);
});

test('an Amendment corrects a confirmed OOS with a reason, keeps it on record with its investigation, and a corrected value over its Limit needs its own investigation', () => {
  const s = staged('notified');
  const reason = 'Recalculated with the dilution factor on the worksheet.';
  const corrected = acted('admin', (act) =>
    recordResult(s, input({ value: 28, reason, hasCertificate: true }), act),
  );
  assert.equal(corrected.outcome, 'correction');
  assert.deepEqual(corrected.changes, [
    [RECORD, 'result.value', 30, 28, reason],
  ]);
  const view = resultsView(s);
  const t = view.test('NIT-001-v1');
  assert.deepEqual(
    t.history.map((h) => [
      h.result.value,
      h.result.status,
      h.result.conformity,
      h.investigation?.id,
      h.investigation?.outcome,
    ]),
    [
      [30, 'superseded', 'Does not comply', ID, 'Confirmed'],
      [28, 'current', 'Does not comply', undefined, undefined],
    ],
    'the confirmed OOS Result and its investigation stay on record, linked',
  );
  // The corrected value is judged afresh: still over its Limit, it is a new
  // OOS that only its own investigation decides.
  assert.deepEqual(
    t.correctionBlocker({ hasCertificate: true }),
    uninvestigatedCorrection,
  );
  const before = structuredClone(s);
  const audit = recordingAudit();
  assert.throws(
    () =>
      recordResult(
        s,
        input({
          value: 2.5,
          reason: 'Recalculated again.',
          hasCertificate: true,
        }),
        { actor: 'analyst', at: AT, audit },
      ),
    (e) =>
      e instanceof WorkflowError &&
      e.message === uninvestigatedCorrection.reason,
  );
  assert.deepEqual(audit.entries, []);
  assert.deepEqual(s, before);
  assert.deepEqual(view.approvalBlocker, uninvestigatedBlocker);
  // The Amendment correction is Bench work, so the Admin who made it cannot
  // give the re-approval.
  assert.deepEqual(
    view.benchWork.findLast((e) => e.person === 'admin'),
    {
      person: 'admin',
      act: 'corrected',
      testId: 'NIT-001-v1',
      resultSequence: 2,
    },
  );
  assert.equal(enteredResultOn(s, 'admin'), true);
});

// A Retest records the OOS investigation it follows, and through it the
// Invalidated result.

/** Per stage: each Result's recorded link, oldest first, and the
 * investigation a Retest would follow now. */
const retestLinks: [Stage, (string | null)[], string | undefined][] = [
  ['empty', [], undefined],
  ['complying', [null], undefined],
  ['uninvestigated', [null], undefined],
  ['open', [null], undefined],
  ['confirmed', [null], undefined],
  ['invalidated', [null], ID],
  ['retested', [null, ID], undefined],
  ['retested over its Limit', [null, ID], undefined],
  ['retest corrected', [null, ID, null], undefined],
  ['invalidated again', [null, ID], SECOND],
  ['retested again', [null, ID, SECOND], undefined],
];

for (const [stage, links, due] of retestLinks)
  test(`the Retest links for a Sample ${stage}`, () => {
    const t = resultsView(staged(stage)).test('NIT-001-v1');
    assert.deepEqual(
      t.history.map((h) => h.result.retestAfter),
      links,
    );
    assert.deepEqual(
      t.history.map((h) => h.retestOf?.investigation.id ?? null),
      links,
      'the history resolves each link',
    );
    assert.equal(t.retestDue?.investigation.id, due);
    assert.equal(t.retestRequired, due !== undefined);
  });

test('through its link a Retest reaches the closed investigation that Invalidated a Result on its Test, its cause and the Invalidated result', () => {
  const s = staged('invalidated again');
  const t = resultsView(s).test('NIT-001-v1');
  const due = t.retestDue!;
  assert.equal(
    retestLabel(t.test, due),
    'Retest after OOS26-0002 · Invalidated result #2, 31 ng/day',
    '"Retest required" names the investigation the Retest will follow',
  );
  const before = structuredClone(s.tests[0].results);
  const { changes } = record(s);
  // The earlier Results are untouched: the Retest only adds a Result.
  assert.deepEqual(s.tests[0].results.slice(0, 2), [
    { ...before[0] },
    { ...before[1] },
  ]);
  assert.ok(
    changes.some(
      ([, field, , value]) =>
        field === 'result.retestAfter' && value === SECOND,
    ),
    'the trail alone connects the Retest to its justification',
  );
  const lineage = t.history.map((h) => {
    const r = h.retestOf;
    return (
      r && [
        r.investigation.id,
        r.investigation.status,
        r.investigation.outcome,
        r.investigation.testId,
        r.investigation.assignableCause,
        r.investigation.causationConfirmed,
        r.invalidated.sequence,
        r.invalidated.status,
        r.invalidated.value,
        retestLabel(t.test, r),
      ]
    );
  });
  assert.deepEqual(lineage, [
    undefined,
    [
      ID,
      'Closed',
      'Invalidated',
      'NIT-001-v1',
      'Standard diluted twice.',
      true,
      1,
      'invalidated',
      30,
      'Retest after OOS26-0001 · Invalidated result #1, 30 ng/day',
    ],
    [
      SECOND,
      'Closed',
      'Invalidated',
      'NIT-001-v1',
      'Column overloaded.',
      true,
      2,
      'invalidated',
      31,
      'Retest after OOS26-0002 · Invalidated result #2, 31 ng/day',
    ],
  ]);
  assert.equal(t.retestDue, undefined);
  assert.equal(t.current?.sequence, 3);
});

test('an investigation whose Result cannot be found is a programming error, not a refusal', () => {
  const s = staged('open');
  s.investigations[0].resultSequence = 9;
  assert.throws(
    () => resultsView(s).investigation(ID),
    (e) => e instanceof Error && !(e instanceof WorkflowError),
  );
});
