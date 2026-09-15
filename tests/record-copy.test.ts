import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inflateRawSync } from 'node:zlib';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import {
  renderRecordCopy,
  type RecordDocument,
} from '../src/laboratory/record-copy.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import {
  laboratoryDay,
  newCommandId,
  signatureMeanings,
  type Sample,
} from '../src/laboratory/contracts.ts';

/** The seeded demo accounts, whose hashes signatures are verified against.
 * Each password is the user ID followed by `-demo`. */
const accounts = new Accounts(':memory:');
accounts.seed(demoAccounts);
after(() => accounts.close());

const NOW = '2026-09-10T12:00:00.000Z';
const receipt = {
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
      methodIds: ['NIT-001-v1'],
      dueDate: '2026-10-01',
      priority: 'Routine',
    },
  ],
};

function laboratory() {
  const lab = new Laboratory(':memory:', {
    clock: () => NOW,
    credentials: accounts,
  });
  after(() => lab.close());
  return lab;
}

/** Runs a command as its actor would send it, signed with their demo password
 * where it must be, and returns the Sample it touched. */
function run(lab: Laboratory, command: Record<string, unknown>, actor: string) {
  const type = String(command.type);
  const signed = Object.hasOwn(signatureMeanings, type)
    ? { password: `${actor}-demo` }
    : {};
  return lab.execute(
    { commandId: newCommandId(), ...signed, ...command },
    actor,
  ).samples[0];
}
const target = (s: Sample) => ({ sampleId: s.id, revision: s.revision });

const worksheetBytes = Buffer.from('reading,result\n1.25,2.5\n');
function worksheet(lab: Laboratory, content = worksheetBytes) {
  return lab.storeAttachment(
    { filename: 'worksheet.csv', contentType: 'text/csv', content },
    'analyst',
  );
}

function entered(
  lab: Laboratory,
  s: Sample,
  value: number,
  attachmentId: string,
  reason = '',
) {
  return run(
    lab,
    {
      type: 'enterResult',
      ...target(s),
      testId: s.tests[0].id,
      value,
      instrumentReading: 1.25,
      sequenceId: 'SEQ-0001',
      attachmentId,
      analysedOn: laboratoryDay(s.receivedAt),
      reason,
    },
    'analyst',
  );
}

/** A finished product Sample taken through to Approval, its Result entered
 * once unless `corrected` enters it again on a second worksheet. */
function approved(lab: Laboratory, { corrected = false } = {}) {
  let s = run(lab, receipt, 'coordinator');
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = entered(lab, s, 2.5, worksheet(lab).id);
  if (corrected)
    s = entered(
      lab,
      s,
      2.4,
      worksheet(lab, Buffer.from('reading,result\n1.20,2.4\n')).id,
      'Recalculated with the corrected dilution',
    );
  s = run(lab, { type: 'submitForApproval', ...target(s) }, 'analyst');
  return run(lab, { type: 'approve', ...target(s) }, 'manager');
}

/** The worksheets of a Sample's Results, in the order its Results were
 * entered. */
function worksheetsOf(lab: Laboratory, s: Sample) {
  const { attachments } = lab.snapshot();
  return s.tests[0].results.map((r) =>
    attachments.find((a) => a.id === r.attachmentId)!,
  );
}

/** A laboratory on a database file, which the test can alter as someone
 * holding the file could, with the signature triggers dropped first. */
function onFile() {
  const folder = mkdtempSync(join(tmpdir(), 'lims-record-copy-'));
  const file = join(folder, 'test.sqlite');
  const lab = new Laboratory(file, { clock: () => NOW, credentials: accounts });
  after(() => {
    lab.close();
    rmSync(folder, { recursive: true, force: true });
  });
  const tamper = (sql: string, ...params: string[]) => {
    const db = new DatabaseSync(file);
    db.exec(`DROP TRIGGER IF EXISTS signaturesNoUpdate;`);
    db.prepare(sql).run(...params);
    db.close();
  };
  return { lab, tamper };
}

/** The JSON record inside a Record copy. */
async function recordOf(lab: Laboratory, sampleId: string, actor = 'manager') {
  const files = unzip((await lab.exportRecord(sampleId, actor)).content);
  return {
    files,
    record: JSON.parse(files.get('record.json')!.toString('utf8')),
  };
}

const sha256 = (content: Uint8Array) =>
  createHash('sha256').update(content).digest('hex');

/** The files of a ZIP archive by name, read from its central directory. */
function unzip(archive: Uint8Array): Map<string, Buffer> {
  const zip = Buffer.from(archive);
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'The archive has no end of central directory.');
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(at), 0x02014b50);
    const method = zip.readUInt16LE(at + 10);
    const crc = zip.readUInt32LE(at + 16);
    const compressed = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    const dataAt =
      local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(dataAt, dataAt + compressed);
    const content = method === 8 ? inflateRawSync(data) : Buffer.from(data);
    const { crc32 } = process.getBuiltinModule('node:zlib');
    assert.equal(crc32(content), crc, `${name} fails its CRC-32.`);
    files.set(name, content);
    at += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

/** A manifest in `sha256sum` format: each file's SHA-256 and name. */
function manifestOf(files: Map<string, Buffer>) {
  const text = files.get('manifest.sha256')?.toString('utf8') ?? '';
  return new Map(
    text
      .trim()
      .split('\n')
      .map((line) => {
        const [, hash, name] = line.match(/^([0-9a-f]{64}) {2}(.+)$/) ?? [];
        return [name, hash] as const;
      }),
  );
}

test('a Record copy is a ZIP of the readable PDF, the JSON record and each worksheet, with a manifest of their SHA-256', async () => {
  const lab = laboratory();
  const s = approved(lab);
  const [attachment] = lab.snapshot().attachments;

  const copy = await lab.exportRecord(s.id, 'manager');

  assert.equal(copy.filename, `Sample ${s.id} record copy.zip`);
  const files = unzip(copy.content);
  const worksheetName = `worksheets/${attachment.id}/worksheet.csv`;
  assert.deepEqual(
    [...files.keys()].sort(),
    ['manifest.sha256', 'record.json', 'record.pdf', worksheetName].sort(),
  );
  assert.equal(files.get('record.pdf')!.subarray(0, 5).toString(), '%PDF-');
  assert.deepEqual(files.get(worksheetName), worksheetBytes);
  const manifest = manifestOf(files);
  assert.deepEqual(
    [...manifest.keys()].sort(),
    ['record.json', 'record.pdf', worksheetName].sort(),
  );
  for (const [name, hash] of manifest)
    assert.equal(sha256(files.get(name)!), hash, `${name} fails the manifest.`);
  assert.equal(copy.manifestSha256, sha256(files.get('manifest.sha256')!));
});

test("each Record copy joins its Sample's history: who made it, when, and the SHA-256 of its manifest", async () => {
  const lab = laboratory();
  const s = approved(lab);

  const copy = await lab.exportRecord(s.id, 'manager');

  const [newest] = lab.auditTrail(s.id);
  assert.deepEqual(
    {
      recordType: newest.recordType,
      recordId: newest.recordId,
      sampleId: newest.sampleId,
      field: newest.field,
      oldValue: newest.oldValue,
      newValue: newest.newValue,
      actor: newest.actor,
      at: newest.at,
      commandType: newest.commandType,
    },
    {
      recordType: 'Sample',
      recordId: s.id,
      sampleId: s.id,
      field: 'recordCopy.manifestSha256',
      oldValue: null,
      newValue: copy.manifestSha256,
      actor: 'manager',
      at: NOW,
      commandType: 'exportRecordCopy',
    },
  );
  // A copy changes nothing on the Sample itself.
  assert.deepEqual(
    lab.snapshot().samples.find((x) => x.id === s.id),
    s,
  );
});

test('the Quality lead, who runs no command, can make a Record copy', async () => {
  const lab = laboratory();
  const s = approved(lab);

  const copy = await lab.exportRecord(s.id, 'quality-lead');

  assert.equal(lab.auditTrail(s.id)[0].actor, 'quality-lead');
  assert.equal(lab.auditTrail(s.id)[0].newValue, copy.manifestSha256);
});

test('record.json carries each Electronic signature and Certificate version exactly as stored, with its SHA-256 and whether it verified', async () => {
  const lab = laboratory();
  const s = approved(lab);

  const { record } = await recordOf(lab, s.id);

  assert.deepEqual(
    record.signatures.map((x: { meaning: string; printedName: string }) => [
      x.meaning,
      x.printedName,
    ]),
    [
      ['performed by', 'Alex Chen'],
      ['approved by', 'Taylor Brooks'],
    ],
  );
  for (const x of record.signatures) {
    // The rule ADR-0008 binds a signature with, recomputed from the copy
    // alone: SHA-256 over the JSON array of its stored fields.
    const bound = createHash('sha256')
      .update(
        JSON.stringify([
          x.commandId.replaceAll('-', ''),
          x.sampleId,
          x.signerId,
          x.printedName,
          x.signedAt,
          x.meaning,
          x.command,
          x.signedContent,
        ]),
      )
      .digest('hex');
    assert.equal(x.sha256, bound);
    assert.equal(x.verified, true);
    assert.equal(typeof x.signedContent, 'string');
  }
  const approval = JSON.parse(record.signatures[1].signedContent);
  assert.equal(approval.reviewStatement, record.signatures[1].reviewStatement);
  assert.equal(approval.certificate.sha256, lab.certificate(s.id, 1).sha256);

  const [certificate] = record.certificates;
  assert.equal(certificate.version, 1);
  assert.equal(certificate.sha256, lab.certificate(s.id, 1).sha256);
  assert.equal(
    certificate.sha256,
    sha256(Buffer.from(certificate.content, 'utf8')),
  );
  assert.equal(certificate.verified, true);
  assert.deepEqual(
    JSON.parse(certificate.content),
    lab.certificate(s.id, 1).content,
  );
});

test('a Sample with an altered Electronic signature still gets a Record copy, which shows the signature failing its check', async () => {
  const { lab, tamper } = onFile();
  const s = approved(lab);
  tamper(
    "UPDATE signatures SET printedName = 'Someone Else' WHERE meaning = 'approved by'",
  );

  const { record } = await recordOf(lab, s.id, 'quality-lead');

  assert.deepEqual(
    record.signatures.map((x: { printedName: string; verified: boolean }) => [
      x.printedName,
      x.verified,
    ]),
    [
      ['Alex Chen', true],
      ['Someone Else', false],
    ],
  );
});

test("a Record copy holds every worksheet a Result ever referenced and the Sample's whole audit trail up to the copy, uploads included", async () => {
  const lab = laboratory();
  const s = approved(lab, { corrected: true });
  const [first, second] = worksheetsOf(lab, s);
  const before = lab.auditTrail(s.id);
  const uploads = lab
    .auditTrail()
    .filter((e) => e.commandType === 'storeAttachment');

  const { files, record } = await recordOf(lab, s.id);

  assert.deepEqual(
    record.worksheets.map((w: { id: string; sha256: string }) => [
      w.id,
      w.sha256,
    ]),
    [
      [first.id, first.sha256],
      [second.id, second.sha256],
    ],
  );
  assert.ok(files.has(`worksheets/${first.id}/worksheet.csv`));
  assert.ok(files.has(`worksheets/${second.id}/worksheet.csv`));
  assert.deepEqual(
    record.auditTrail.entries,
    [...before, ...uploads].sort((a, b) => a.sequence - b.sequence),
  );
  assert.equal(record.auditTrail.throughSequence, before[0].sequence);
  assert.deepEqual(
    record.people.find((p: { id: string }) => p.id === 'analyst'),
    {
      id: 'analyst',
      name: 'Alex Chen',
      role: 'analyst',
    },
  );

  // A later copy's trail holds the entry for the copy before it.
  const { record: later } = await recordOf(lab, s.id);
  assert.equal(later.auditTrail.entries.at(-1).commandType, 'exportRecordCopy');
});

/** A document section's fields by label, or its table rows. */
function sectionOf(doc: RecordDocument, part: string, heading: string) {
  const section = doc.parts
    .find((p) => p.heading === part)
    ?.sections.find((s) => s.heading === heading);
  assert.ok(section, `${part} has no section ${heading}.`);
  return section;
}
function fieldsOf(doc: RecordDocument, part: string, heading: string) {
  const section = sectionOf(doc, part, heading);
  assert.equal(section.kind, 'fields');
  return new Map(section.fields.map((f) => [f.label, f.value]));
}
function rowsOf(doc: RecordDocument, part: string, heading: string) {
  const section = sectionOf(doc, part, heading);
  assert.equal(section.kind, 'table');
  return section.rows;
}

test('the PDF prints the whole record: who made the copy, receipt, every Result version, signatures with their check, each Certificate version, worksheets and the audit trail in UTC', async () => {
  const lab = laboratory();
  const s = approved(lab, { corrected: true });
  const [first, second] = worksheetsOf(lab, s);
  const { record } = await recordOf(lab, s.id);

  const doc = renderRecordCopy(record);

  assert.deepEqual(
    doc.parts.map((p) => p.heading),
    [
      'About this copy',
      'Receipt',
      'Results',
      'Electronic signatures',
      'Certificates of Analysis',
      'Worksheets',
      'Audit trail',
    ],
  );
  const about = fieldsOf(doc, 'About this copy', 'Record copy');
  assert.equal(about.get('Sample'), s.id);
  assert.equal(about.get('Client'), 'Northstar Pharma');
  assert.match(
    about.get('Confidentiality')!,
    /^Confidential: Northstar Pharma\./,
  );
  assert.equal(about.get('Made by'), 'Taylor Brooks');
  assert.equal(about.get('Made at'), '2026-09-10 12:00:00 UTC');
  const notHere = sectionOf(doc, 'About this copy', 'Not in this copy');
  assert.equal(notHere.kind, 'text');
  assert.match(
    notHere.paragraphs.join(' '),
    /instrument data system.*SEQ-0001/,
  );

  const superseded = fieldsOf(
    doc,
    'Results',
    'Impurity A (NIT-001 v1), Result 1',
  );
  assert.equal(superseded.get('Status'), 'Superseded by a correction');
  assert.equal(superseded.get('Value'), '2.5 ng/day');
  assert.equal(superseded.get('Entered'), 'Alex Chen, 2026-09-10 12:00:00 UTC');
  const current = fieldsOf(doc, 'Results', 'Impurity A (NIT-001 v1), Result 2');
  assert.equal(current.get('Status'), 'Current');
  assert.equal(current.get('Value'), '2.4 ng/day');
  assert.equal(
    current.get('Reason'),
    'Recalculated with the corrected dilution',
  );
  assert.equal(
    current.get('Worksheet'),
    `worksheet.csv, SHA-256 ${second.sha256}`,
  );

  const signatures = rowsOf(
    doc,
    'Electronic signatures',
    'Electronic signatures',
  );
  assert.deepEqual(
    signatures.map((row) => row.slice(0, 5)),
    [
      ['Performed by', 'Alex Chen', '2026-09-10 12:00:00 UTC', '—', 'Verified'],
      [
        'Approved by',
        'Taylor Brooks',
        '2026-09-10 12:00:00 UTC',
        "The Results, their calculation worksheets, the original instrument data, any OOS investigations, any Not reported Tests and their Nonconforming work Forms, and the Sample's audit trail were reviewed.",
        'Verified',
      ],
    ],
  );

  const version = fieldsOf(doc, 'Certificates of Analysis', 'Version 1');
  assert.equal(version.get('SHA-256'), lab.certificate(s.id, 1).sha256);
  assert.equal(version.get('Check'), 'Verified');
  sectionOf(doc, 'Certificates of Analysis', 'Version 1 · Results');

  assert.deepEqual(
    rowsOf(doc, 'Worksheets', 'Worksheets').map((row) => [row[0], row.at(-1)]),
    [
      ['worksheet.csv', `worksheets/${first.id}/worksheet.csv`],
      ['worksheet.csv', `worksheets/${second.id}/worksheet.csv`],
    ],
  );

  const trail = rowsOf(doc, 'Audit trail', 'Audit trail');
  assert.equal(trail.length, record.auditTrail.entries.length);
  assert.deepEqual(trail[0].slice(1, 4), [
    '2026-09-10 12:00:00 UTC',
    'Received',
    'Morgan Lee',
  ]);
});

test('record.json is marked confidential for its Client and says what the copy does not hold, as the PDF does', async () => {
  const lab = laboratory();
  const s = approved(lab);

  const { record } = await recordOf(lab, s.id);

  assert.match(record.confidentiality, /^Confidential: Northstar Pharma\./);
  assert.match(
    record.notInThisCopy.join(' '),
    /instrument data system.*SEQ-0001/,
  );
  const doc = renderRecordCopy(record);
  assert.equal(
    fieldsOf(doc, 'About this copy', 'Record copy').get('Confidentiality'),
    record.confidentiality,
  );
  const notHere = sectionOf(doc, 'About this copy', 'Not in this copy');
  assert.equal(notHere.kind, 'text');
  assert.deepEqual(notHere.paragraphs, record.notInThisCopy);
});

test("a command recorded while a Record copy is being made is in that copy, so the copy's entry never follows history the copy lacks", async () => {
  const lab = laboratory();
  let s = run(lab, receipt, 'coordinator');

  const making = lab.exportRecord(s.id, 'manager');
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  const files = unzip((await making).content);

  const record = JSON.parse(files.get('record.json')!.toString('utf8'));
  const [copied, assigned] = lab.auditTrail(s.id);
  assert.equal(copied.commandType, 'exportRecordCopy');
  assert.equal(assigned.commandType, 'assign');
  assert.equal(record.auditTrail.throughSequence, assigned.sequence);
  assert.equal(record.sample.assignee, 'analyst');
  assert.equal(copied.newValue, sha256(files.get('manifest.sha256')!));
});

test('the PDF prints an Invalidated result, its OOS investigation and the Retest that follows it, with both worksheets', async () => {
  const lab = laboratory();
  let s = run(lab, receipt, 'coordinator');
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = entered(lab, s, 30, worksheet(lab).id);
  s = run(
    lab,
    { type: 'openOosInvestigation', ...target(s), testId: s.tests[0].id },
    'manager',
  );
  const id = s.investigations[0].id;
  s = run(
    lab,
    {
      type: 'recordLabErrorCheck',
      ...target(s),
      investigationId: id,
      findings: 'Standard preparation log shows a dilution error.',
      errorIdentified: true,
    },
    'analyst',
  );
  s = run(
    lab,
    {
      type: 'concludeOosInvestigation',
      ...target(s),
      investigationId: id,
      outcome: 'Invalidated',
      assignableCause: 'Standard diluted twice (prep log p. 14).',
      causationConfirmed: true,
    },
    'manager',
  );
  s = entered(
    lab,
    s,
    2.5,
    worksheet(lab, Buffer.from('reading,result\n1.25,2.5\nretest\n')).id,
  );
  const [original, retest] = worksheetsOf(lab, s);

  const { files, record } = await recordOf(lab, s.id);
  const doc = renderRecordCopy(record);

  const invalidated = fieldsOf(
    doc,
    'Results',
    'Impurity A (NIT-001 v1), Result 1',
  );
  assert.equal(invalidated.get('Status'), 'Invalidated');
  assert.equal(invalidated.get('Value'), '30 ng/day');
  assert.equal(invalidated.get('OOS investigation'), id);
  const retested = fieldsOf(
    doc,
    'Results',
    'Impurity A (NIT-001 v1), Result 2',
  );
  assert.equal(retested.get('Status'), 'Current');
  assert.equal(retested.get('Retest after'), `OOS investigation ${id}`);
  const investigation = fieldsOf(doc, 'OOS investigations', id);
  assert.equal(investigation.get('Outcome'), 'Invalidated');
  assert.equal(
    investigation.get('Assignable cause'),
    'Standard diluted twice (prep log p. 14).',
  );
  assert.equal(
    investigation.get('Laboratory error check'),
    'Laboratory error identified: Standard preparation log shows a dilution error. (Alex Chen, 2026-09-10 12:00:00 UTC)',
  );
  assert.equal(
    investigation.get('Closed'),
    'Taylor Brooks, 2026-09-10 12:00:00 UTC',
  );
  assert.ok(files.has(`worksheets/${original.id}/worksheet.csv`));
  assert.ok(files.has(`worksheets/${retest.id}/worksheet.csv`));
});

test('the Record copy holds a Test closed as not reported, reopened and closed again, with each reason and Form reference', async () => {
  const lab = laboratory();
  let s = run(lab, receipt, 'coordinator');
  s = run(
    lab,
    { type: 'assign', ...target(s), assignee: 'analyst' },
    'coordinator',
  );
  s = entered(lab, s, 30, worksheet(lab).id);
  const testId = s.tests[0].id;
  s = run(
    lab,
    { type: 'openOosInvestigation', ...target(s), testId },
    'manager',
  );
  const id = s.investigations[0].id;
  s = run(
    lab,
    {
      type: 'recordLabErrorCheck',
      ...target(s),
      investigationId: id,
      findings: 'Standard preparation log shows a dilution error.',
      errorIdentified: true,
    },
    'analyst',
  );
  s = run(
    lab,
    {
      type: 'concludeOosInvestigation',
      ...target(s),
      investigationId: id,
      outcome: 'Invalidated',
      assignableCause: 'Standard diluted twice (prep log p. 14).',
      causationConfirmed: true,
    },
    'manager',
  );
  const close = (reason: string, formReference: string) => ({
    type: 'closeTestAsNotReported',
    ...target(s),
    testId,
    reason,
    formReference,
  });
  s = run(lab, close('No retained material', 'NCW-26-013'), 'manager');
  s = run(
    lab,
    {
      type: 'reopenNotReportedTest',
      ...target(s),
      testId,
      reason: 'Retained material found in the second store.',
    },
    'manager',
  );
  s = run(lab, close('Retest maximum reached', 'NCW-26-014'), 'manager');

  const { record } = await recordOf(lab, s.id);
  assert.deepEqual(record.sample.tests[0].notReported, {
    reason: 'Retest maximum reached',
    formReference: 'NCW-26-014',
    by: 'manager',
    at: NOW,
  });
  const doc = renderRecordCopy(record);
  assert.equal(
    fieldsOf(doc, 'Results', 'Impurity A (NIT-001 v1)').get('Not reported'),
    'Retest maximum reached, Nonconforming work Form NCW-26-014 (closed by Taylor Brooks, 2026-09-10 12:00:00 UTC)',
  );
  assert.deepEqual(
    rowsOf(doc, 'Audit trail', 'Audit trail')
      .filter((row) => String(row[5]).startsWith('notReported.'))
      .map((row) => row.slice(2)),
    [
      [
        'Test closed as not reported',
        'Taylor Brooks',
        'Test Impurity A (NIT-001 v1)',
        'notReported.reason',
        'empty',
        'No retained material',
        '—',
      ],
      [
        'Test closed as not reported',
        'Taylor Brooks',
        'Test Impurity A (NIT-001 v1)',
        'notReported.formReference',
        'empty',
        'NCW-26-013',
        '—',
      ],
      [
        'Not reported Test reopened',
        'Taylor Brooks',
        'Test Impurity A (NIT-001 v1)',
        'notReported.reason',
        'No retained material',
        'empty',
        'Retained material found in the second store.',
      ],
      [
        'Not reported Test reopened',
        'Taylor Brooks',
        'Test Impurity A (NIT-001 v1)',
        'notReported.formReference',
        'NCW-26-013',
        'empty',
        'Retained material found in the second store.',
      ],
      [
        'Test closed as not reported',
        'Taylor Brooks',
        'Test Impurity A (NIT-001 v1)',
        'notReported.reason',
        'empty',
        'Retest maximum reached',
        '—',
      ],
      [
        'Test closed as not reported',
        'Taylor Brooks',
        'Test Impurity A (NIT-001 v1)',
        'notReported.formReference',
        'empty',
        'NCW-26-014',
        '—',
      ],
    ],
  );
});

test('the PDF shows a signature that fails its check as failing', async () => {
  const { lab, tamper } = onFile();
  const s = approved(lab);
  tamper(
    "UPDATE signatures SET meaning = 'amended by' WHERE meaning = 'approved by'",
  );
  const { record } = await recordOf(lab, s.id);

  const rows = rowsOf(
    renderRecordCopy(record),
    'Electronic signatures',
    'Electronic signatures',
  );

  assert.deepEqual(
    rows.map((row) => row[4]),
    ['Verified', 'Failed: does not match its SHA-256'],
  );
});

test('a deactivated account or an unknown Sample gets no Record copy, and nothing is recorded', async () => {
  const lab = new Laboratory(':memory:', {
    clock: () => NOW,
    credentials: accounts,
    people: [
      {
        id: 'coordinator',
        name: 'Morgan Lee',
        role: 'coordinator',
        active: true,
      },
      { id: 'former', name: 'Pat Doe', role: 'manager', active: false },
    ],
  });
  after(() => lab.close());
  const s = run(lab, receipt, 'coordinator');
  const entries = lab.auditTrail().length;

  await assert.rejects(lab.exportRecord(s.id, 'former'), {
    message: 'This account is deactivated.',
    status: 403,
  });
  await assert.rejects(lab.exportRecord('26-99999', 'coordinator'), {
    message: 'Sample not found.',
    status: 404,
  });
  assert.equal(lab.auditTrail().length, entries);
});
