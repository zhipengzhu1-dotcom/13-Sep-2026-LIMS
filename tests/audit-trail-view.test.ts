import test from 'node:test';
import assert from 'node:assert/strict';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { newCommandId, type Snapshot } from '../src/laboratory/contracts.ts';
import { recordLabel } from '../src/ui/audit-trail.tsx';

/** A Laboratory with one finished product received under NIT-001 v1
 * (Impurity A) and NIT-003 v1 (Impurity B). */
function received(t: test.TestContext) {
  const lab = new Laboratory(':memory:', {
    clock: () => '2026-09-10T12:00:00.000Z',
  });
  t.after(() => lab.close());
  const outcome = lab.execute(
    {
      commandId: newCommandId(),
      type: 'receiveSubmission',
      clientId: 'northstar',
      clientContact: {
        name: 'Dana Wells',
        role: 'QA Manager',
        email: 'dana.wells@northstar.example',
        phone: '+1 555 0100',
      },
      shippingCondition: 'ambient',
      packageCondition: 'intact',
      samples: [
        {
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
        },
      ],
    },
    'coordinator',
  );
  const [sample] = outcome.samples;
  return { lab, sample, data: lab.snapshot() };
}

const testLabels = (data: Snapshot, showSample: boolean) =>
  [
    ...new Set(
      data.audit
        .filter((e) => e.recordType === 'Test')
        .map((e) => recordLabel(e, data, showSample)),
    ),
  ].sort();

/** The same trail with the NIT-003 v1 Test, and the entries on it, under an id
 * that doesn't spell out the Method code and version, which receipt now
 * refuses. It shows the label never reads the code and version from the id. */
function withLegacyTestId(data: Snapshot, sampleId: string): Snapshot {
  const legacy = (id: string) => (id === 'NIT-003-v1' ? 'impurity-b-lcms' : id);
  return {
    ...data,
    samples: data.samples.map((s) =>
      s.id === sampleId
        ? {
            ...s,
            tests: s.tests.map((x) => ({
              ...x,
              id: legacy(x.id),
              methodId: legacy(x.methodId),
            })),
          }
        : s,
    ),
    audit: data.audit.map((e) =>
      e.recordType === 'Test' && e.recordId === `${sampleId}/NIT-003-v1`
        ? { ...e, recordId: `${sampleId}/impurity-b-lcms` }
        : e,
    ),
  };
}

test('an audit trail entry on a Test names its Sample, Analyte and the Method code and version it copied', (t) => {
  const { sample, data } = received(t);
  assert.deepEqual(testLabels(data, true), [
    `Test ${sample.id} · Impurity A (NIT-001 v1)`,
    `Test ${sample.id} · Impurity B (NIT-003 v1)`,
  ]);
});

test("a Sample's history names a Test by its Analyte and Method code and version alone", (t) => {
  const { data } = received(t);
  assert.deepEqual(testLabels(data, false), [
    'Test Impurity A (NIT-001 v1)',
    'Test Impurity B (NIT-003 v1)',
  ]);
});

test("a Test whose id doesn't spell out its Method code and version is still named by the code and version it copied", (t) => {
  const { sample, data } = received(t);
  assert.deepEqual(testLabels(withLegacyTestId(data, sample.id), true), [
    `Test ${sample.id} · Impurity A (NIT-001 v1)`,
    `Test ${sample.id} · Impurity B (NIT-003 v1)`,
  ]);
});

test('the stored audit entries on a Test keep their record id', (t) => {
  const { lab, sample } = received(t);
  const ids = new Set(
    lab
      .auditTrail()
      .filter((e) => e.recordType === 'Test')
      .map((e) => e.recordId),
  );
  assert.deepEqual([...ids].sort(), [
    `${sample.id}/NIT-001-v1`,
    `${sample.id}/NIT-003-v1`,
  ]);
});

test('an entry on a Test the workspace cannot find shows its stored record id', (t) => {
  const { sample, data } = received(t);
  assert.deepEqual(testLabels({ ...data, samples: [] }, true), [
    `Test ${sample.id}/NIT-001-v1`,
    `Test ${sample.id}/NIT-003-v1`,
  ]);
});

test('an audit trail entry on any other record is labelled by its record type and stored id', (t) => {
  const { sample, data } = received(t);
  const labelOf = (type: string, id: string) => {
    const entry = data.audit.find(
      (e) => e.recordType === type && e.recordId === id,
    );
    return entry && recordLabel(entry, data, true);
  };
  assert.equal(labelOf('Sample', sample.id), `Sample ${sample.id}`);
  assert.equal(
    labelOf('Submission', sample.submissionId),
    `Submission ${sample.submissionId}`,
  );
  assert.equal(labelOf('Method', 'NIT-001-v1'), 'Method NIT-001-v1');
});
