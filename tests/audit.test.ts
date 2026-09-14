import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  AuditTrail,
  type Audit,
  type AuditRecord,
} from '../src/laboratory/audit.ts';
import { recordingAudit } from './recording-audit.ts';

const sample: AuditRecord = { type: 'Sample', id: 'S-1', sampleId: 'S-1' };
const submission: AuditRecord = {
  type: 'Submission',
  id: 'SUB-1',
  sampleId: null,
};

/**
 * Runs the same calls against the SQLite writer and the recording writer, and
 * returns what each kept: the stored entries (oldest first, command fields
 * stripped) and the recorded entries.
 */
function both(calls: (audit: Audit) => void) {
  const trail = new AuditTrail(new DatabaseSync(':memory:'));
  const sqlite = trail.writer({
    actor: 'analyst',
    at: '2026-09-13T10:00:00.000Z',
    commandType: 'enterResult',
    commandId: 'cmd-1',
  });
  calls(sqlite);
  const stored = trail
    .entries()
    .reverse()
    .map(({ sequence, actor, at, commandType, commandId, ...entry }) => entry);
  const recording = recordingAudit();
  calls(recording);
  assert.equal(recording.written, sqlite.written);
  return { stored, recorded: recording.entries };
}

test('the recording writer records exactly what the SQLite writer stores', () => {
  const { stored, recorded } = both((audit) => {
    audit.change(sample, 'status', 'Received', 'In testing', 'Started');
    audit.change(submission, 'client', null, 'Acme');
    audit.change(sample, 'quantity.value', 60, 59, '');
    audit.change(sample, 'retained', false, true);
  });
  assert.equal(stored.length, 4);
  assert.deepEqual(recorded, stored);
  assert.deepEqual(recorded[0], {
    recordType: 'Sample',
    recordId: 'S-1',
    sampleId: 'S-1',
    field: 'status',
    oldValue: 'Received',
    newValue: 'In testing',
    reason: 'Started',
  });
  assert.equal(recorded[2].reason, null);
});

test('compare flattens nested values and skips omitted paths in both writers', () => {
  const before = {
    id: 'S-1',
    quantity: { value: 60, unit: 'units' },
    methodIds: ['NIT-001-v1', 'NIT-003-v1'],
    tests: [{ id: 'T-1' }],
    note: 'kept',
    dropped: 'gone',
  };
  const after = {
    id: 'S-1',
    quantity: { value: 59, unit: 'units' },
    methodIds: ['NIT-001-v1'],
    tests: [{ id: 'T-2' }],
    note: 'kept',
    added: true,
  };
  const counts: number[] = [];
  const { stored, recorded } = both((audit) => {
    counts.push(
      audit.compare(sample, before, after, {
        reason: 'Corrected',
        omit: ['id', 'tests'],
      }),
    );
  });
  assert.deepEqual(counts, [4, 4]);
  assert.deepEqual(recorded, stored);
  assert.deepEqual(
    recorded.map((e) => [e.field, e.oldValue, e.newValue, e.reason]),
    [
      ['quantity.value', 60, 59, 'Corrected'],
      ['added', null, true, 'Corrected'],
      ['methodIds.1', 'NIT-003-v1', null, 'Corrected'],
      ['dropped', 'gone', null, 'Corrected'],
    ],
  );
});

test('compare writes every field of a new record in both writers', () => {
  const { stored, recorded } = both((audit) => {
    audit.compare(
      submission,
      null,
      {
        id: 'SUB-1',
        client: 'Acme',
        contact: { name: 'Ada', phone: null },
        notes: undefined,
      },
      { omit: ['id'] },
    );
  });
  assert.deepEqual(recorded, stored);
  assert.deepEqual(
    recorded.map((e) => [e.field, e.oldValue, e.newValue]),
    [
      ['client', null, 'Acme'],
      ['contact.name', null, 'Ada'],
    ],
  );
});

test('compare and set write nothing for unchanged values in both writers', () => {
  const { stored, recorded } = both((audit) => {
    audit.compare(sample, { a: 1, b: { c: 'x' } }, { a: 1, b: { c: 'x' } });
    const target = { status: 'Received', count: 2 };
    audit.set(sample, target, 'status', 'Received');
    audit.set(sample, target, 'count', 2, 'No change');
  });
  assert.deepEqual(stored, []);
  assert.deepEqual(recorded, []);
});

test('set changes the target and records the old value in both writers', () => {
  const targets: { status: string; count: number }[] = [];
  const { stored, recorded } = both((audit) => {
    const target = { status: 'Received', count: 2 };
    audit.set(sample, target, 'status', 'In testing', 'Started');
    audit.set(sample, target, 'count', 3);
    targets.push(target);
  });
  assert.deepEqual(targets, [
    { status: 'In testing', count: 3 },
    { status: 'In testing', count: 3 },
  ]);
  assert.deepEqual(recorded, stored);
  assert.deepEqual(
    recorded.map((e) => [e.field, e.oldValue, e.newValue, e.reason]),
    [
      ['status', 'Received', 'In testing', 'Started'],
      ['count', 2, 3, null],
    ],
  );
});

test('the recording writer keeps its entries in order and frozen', () => {
  const audit = recordingAudit();
  audit.change(sample, 'status', 'Received', 'In testing');
  const first = audit.entries[0];
  audit.change(sample, 'status', 'In testing', 'Tested');
  assert.equal(audit.entries.length, 2);
  assert.equal(audit.entries[0], first);
  assert.ok(Object.isFrozen(audit.entries[0]));
});
