import {
  actsAs,
  analytes,
  clients,
  currentResult,
  limitInForce,
  type AcceptableIntake,
  type AcceptableIntakeEntry,
  type Person,
  isFinishedProduct,
  methods,
  people,
  methodLodLoq,
  reportingUnit,
  signatureMeanings,
  type Actor,
  type AuditEntry,
  type ClientInstruction,
  type Command,
  type ReceiptDeviation,
  type Method,
  type ReportingUnit,
  type Sample,
  type SampleStatus,
  type Signature,
  type SignatureMeaning,
  type Submission,
  type Test,
  potencyRefusal,
} from './contracts.ts';
import { auditRecord, type Audit } from './audit-writer.ts';
import {
  certificateContent,
  type Certificate,
  type CertificateContent,
  type CertificateSummary,
  type Publication,
} from './certificate.ts';
import type { Attachment } from './attachment-contracts.ts';
import { amendmentOf, changeSummary, replacedVersion } from './amendments.ts';
import { type Upload } from './attachments.ts';
import { WorkflowError, requireRole } from './workflow-error.ts';
import {
  concludeInvestigation,
  openInvestigation,
  recordClientNotification,
  recordLabErrorCheck,
  recordResult,
  resultsView,
} from './results.ts';

/**
 * The command handlers: what each verb means for the laboratory record. The
 * entry point (laboratory.ts) opens the transaction, resolves the actor,
 * validates the command and hands each handler its Context.
 */

/** Statuses in which the assigned Analyst may enter Results or submit them. */
const editableStatuses: readonly SampleStatus[] = [
  'In progress',
  'Returned',
  'Amendment in progress',
];

/** No one assigns or tests a Sample held for a Receipt deviation, or one the
 * Client withdrew. */
function requireNotHeld(sample: Sample) {
  if (sample.status === 'On hold')
    throw new WorkflowError(
      "This Sample is on hold for a Receipt deviation. Record the Client's instruction first.",
    );
  if (sample.status === 'Withdrawn')
    throw new WorkflowError('The Client withdrew this Sample.');
}

function requireAssignedAnalyst(actor: Actor, sample: Sample) {
  requireRole(actor, 'analyst');
  requireNotHeld(sample);
  if (sample.assignee !== actor.id)
    throw new WorkflowError(
      'Only the assigned analyst can enter or submit Results.',
      403,
    );
  if (!editableStatuses.includes(sample.status))
    throw new WorkflowError('Results cannot be changed at this stage.');
}

function requireAwaitingApproval(sample: Sample) {
  if (sample.status !== 'Awaiting approval')
    throw new WorkflowError(
      'Only Samples awaiting approval can be approved or returned.',
    );
}

export type CommandOf<T extends Command['type']> = Extract<
  Command,
  { type: T }
>;
export type SampleCommandType = Exclude<
  Command['type'],
  'receiveSubmission' | 'appendAcceptableIntake'
>;

/** A per-year identifier sequence. */
export type Series = 'submission' | 'sample' | 'investigation';

/**
 * What a handler is given. The entry point has already opened the transaction,
 * resolved the actor and validated the command; a handler decides only what its
 * own verb means. `at` is the single timestamp for the whole command, so every
 * row a command writes bears the same instant. `allocate` takes the next number
 * of a per-year sequence inside the same transaction, so a rejected command
 * consumes none. `audit` writes the command's field-level audit entries; every
 * command must write at least one. `limitInForce` is the Acceptable intake
 * entry for an Analyte in force at `at`. `attachment` looks up a stored
 * attachment record. `submission` loads a Sample's Submission, `signatures`
 * lists a Sample's recorded Electronic signatures (oldest first), and
 * `certificates` / `issueCertificate` read and store locked Certificate
 * versions inside the same transaction, and `recordPublication` stores the
 * publication of one version. `appendAcceptableIntake` stores a new
 * Acceptable intake entry. `people` is the user directory in force, and
 * `history` a Sample's audit entries so far, this command's included.
 */
export type Context = {
  at: string;
  people: readonly Person[];
  history: (sample: Sample) => AuditEntry[];
  allocate: (series: Series) => number;
  audit: Audit;
  limitInForce: (analyteId: string) => AcceptableIntake | null;
  /** The Method reference data in force. */
  methods: readonly Method[];
  attachment: (id: string) => Attachment | null;
  submission: (id: string) => Submission;
  signatures: (sampleId: string) => Signature[];
  certificates: (sampleId: string) => CertificateSummary[];
  issueCertificate: (content: CertificateContent) => Certificate;
  recordPublication: (publication: Publication) => void;
  appendAcceptableIntake: (entry: AcceptableIntakeEntry) => AcceptableIntake;
};

/**
 * Statuses that lock a Sample, each with the only commands still allowed on
 * it: its named transitions. Everything else is refused before any handler
 * runs.
 */
export const locks: Partial<
  Record<SampleStatus, { message: string; allows: Command['type'][] }>
> = {
  Approved: {
    message: 'Approved samples are locked.',
    // Publishing, and the Client notification a Confirmed OOS requires first.
    allows: ['publish', 'recordClientOosNotification'],
  },
  // A correction to a Published Certificate starts an Amendment.
  Published: {
    message: 'Published Samples are locked.',
    allows: ['startAmendment'],
  },
  Withdrawn: {
    message: 'The Client withdrew this Sample, so it is closed.',
    allows: [],
  },
};

/** An instant a Coordinator entered, which cannot lie after the saving. */
function recordedInstant(value: string, at: string, message: string) {
  const instant = new Date(value).toISOString();
  if (instant > at) throw new WorkflowError(message);
  return instant;
}

/**
 * Receipt is the one verb that creates its subjects, so it returns the
 * Submission and its Samples.
 */
type ReceiptHandler = (
  command: CommandOf<'receiveSubmission'>,
  actor: Actor,
  context: Context,
) => { submission: Submission; samples: Sample[] };

/**
 * Every other verb acts on one Sample: it is handed the loaded Sample, mutates
 * it in place, auditing each change.
 */
export type SampleHandler<T extends SampleCommandType> = (
  command: CommandOf<T>,
  actor: Actor,
  sample: Sample,
  context: Context,
) => void;

const pad = (n: number, width: number) => String(n).padStart(width, '0');

function testOf(method: Method, unit: ReportingUnit): Test {
  const analyte = analytes.find((a) => a.id === method.analyteId)!;
  return {
    id: method.id,
    methodId: method.id,
    methodCode: method.code,
    methodVersion: method.version,
    analyteId: analyte.id,
    analyteName: analyte.name,
    technique: method.technique,
    unit,
    ...methodLodLoq(method, unit),
    maximumDoseCeiling: unit === 'ng/day' ? method.maximumDoseCeiling : null,
    results: [],
  };
}

/**
 * The received date and time is the server time of the receipt unless the
 * Coordinator corrects it. A correction needs a reason, may not lie after the
 * moment of saving, and keeps the server time it replaced on the record.
 */
function receivedAtOf(
  correction: CommandOf<'receiveSubmission'>['receivedAt'],
  serverTime: string,
): Pick<Submission, 'receivedAt' | 'receivedAtCorrection'> {
  if (!correction)
    return { receivedAt: serverTime, receivedAtCorrection: null };
  if (correction.reason.length < 3)
    throw new WorkflowError(
      'Give a reason for correcting the received date and time.',
    );
  const corrected = new Date(correction.at).toISOString();
  if (corrected > serverTime)
    throw new WorkflowError(
      'The received date and time cannot be later than the time of saving.',
    );
  return {
    receivedAt: corrected,
    receivedAtCorrection: { recordedAt: serverTime, reason: correction.reason },
  };
}

export const receiveSubmission: ReceiptHandler = (
  command,
  actor,
  { at, allocate, audit, methods },
) => {
  requireRole(actor, 'coordinator');
  const client = clients.find((c) => c.id === command.clientId);
  if (!client) throw new WorkflowError('Choose a Client from the Client list.');
  const received = receivedAtOf(command.receivedAt, at);
  // Every Sample is checked before any identifier is allocated.
  const requested = command.samples.map((receipt, i) => {
    const label = command.samples.length > 1 ? `Sample ${i + 1}: ` : '';
    const finished = isFinishedProduct(receipt.materialType);
    if (finished && receipt.maximumDailyDose === null)
      throw new WorkflowError(
        `${label}Enter the Maximum daily dose (mg/day) supplied by the Client for a finished product.`,
      );
    if (!finished && receipt.maximumDailyDose !== null)
      throw new WorkflowError(
        `${label}A raw material does not take a Maximum daily dose.`,
      );
    if (!finished && receipt.stability)
      throw new WorkflowError(
        `${label}Only a finished product can be a Stability sample.`,
      );
    if (
      receipt.manufactureDate &&
      receipt.expiryDate &&
      receipt.expiryDate <= receipt.manufactureDate
    )
      throw new WorkflowError(
        `${label}The ${receipt.expiryKind} date must be after the manufacture date.`,
      );
    if (new Set(receipt.methodIds).size !== receipt.methodIds.length)
      throw new WorkflowError(`${label}Request each Method only once.`);
    const dose = receipt.maximumDailyDose;
    return receipt.methodIds.map((id) => {
      const method = methods.find((m) => m.id === id);
      if (!method)
        throw new WorkflowError(`${label}Method ${id} is not available.`);
      if (!method.materialTypes.includes(receipt.materialType))
        throw new WorkflowError(
          `${label}${method.code} v${method.version} does not apply to a ${receipt.materialType}.`,
        );
      // Above the ceiling the Method's ng/day LOQ would claim a sensitivity
      // it does not have at this dose.
      if (dose !== null && dose > method.maximumDoseCeiling)
        throw new WorkflowError(
          `${label}The Maximum daily dose of ${dose} mg/day is above the ${method.maximumDoseCeiling} mg/day Maximum-dose ceiling of ${method.code} v${method.version}.`,
        );
      return method;
    });
  });
  const yy = at.slice(2, 4);
  const submission: Submission = {
    id: `S${yy}-${pad(allocate('submission'), 4)}`,
    clientId: client.id,
    client: client.name,
    clientKind: client.kind,
    clientReference: command.clientReference,
    clientContact: command.clientContact,
    ...received,
    receivedBy: actor.id,
    courier: command.courier,
    trackingNumber: command.trackingNumber,
    shippingCondition: command.shippingCondition,
    temperatureOnArrival: command.temperatureOnArrival,
    packageCondition: command.packageCondition,
    chainOfCustodyReference: command.chainOfCustodyReference,
    sampleIds: [],
  };
  const samples = command.samples.map((receipt, i): Sample => {
    const unit = reportingUnit(receipt.materialType);
    const { methodIds: _methodIds, deviations, ...record } = receipt;
    const sample: Sample = {
      id: `${yy}-${pad(allocate('sample'), 5)}`,
      submissionId: submission.id,
      clientId: client.id,
      client: client.name,
      ...record,
      receivedAt: received.receivedAt,
      receivedBy: actor.id,
      assignee: null,
      // A deviation found at receipt holds the Sample from the start.
      status: deviations.length ? 'On hold' : 'Received',
      deviations: deviations.map((d, j) => ({
        sequence: j + 1,
        ...d,
        recordedBy: actor.id,
        recordedAt: at,
        instruction: null,
      })),
      lastReturn: null,
      tests: requested[i].map((m) => testOf(m, unit)),
      investigations: [],
      revision: 1,
    };
    submission.sampleIds.push(sample.id);
    return sample;
  });
  // The Submission is created at the server time; a corrected received-at is
  // then its own entry, from the server time it replaced, with the reason.
  const submissionRecord = auditRecord.submission(submission);
  audit.compare(
    submissionRecord,
    null,
    { ...submission, receivedAt: at },
    { omit: ['id', 'sampleIds', 'receivedAtCorrection'] },
  );
  if (submission.receivedAtCorrection)
    audit.change(
      submissionRecord,
      'receivedAt',
      submission.receivedAtCorrection.recordedAt,
      submission.receivedAt,
      submission.receivedAtCorrection.reason,
    );
  for (const sample of samples) {
    audit.compare(auditRecord.sample(sample), null, sample, {
      omit: [
        'id',
        'tests',
        'investigations',
        'revision',
        'lastReturn',
        'deviations',
      ],
    });
    for (const deviation of sample.deviations)
      auditDeviation(audit, sample, deviation);
    for (const test of sample.tests)
      audit.compare(auditRecord.test(sample, test), null, test, {
        omit: ['id', 'results'],
      });
  }
  return { submission, samples };
};

/** A new Receipt deviation's content; who recorded it and when are the
 * entry's own columns. */
function auditDeviation(audit: Audit, sample: Sample, d: ReceiptDeviation) {
  const record = auditRecord.sample(sample);
  const field = `deviations.${d.sequence}`;
  audit.change(record, `${field}.kind`, null, d.kind);
  audit.change(record, `${field}.description`, null, d.description);
}

/**
 * A changed Acceptable intake is a new entry, appended by a Manager; no entry
 * is ever edited or removed, so Results keep the Limit they were judged
 * against. There is no maintenance screen in this release.
 */
export function appendAcceptableIntake(
  command: CommandOf<'appendAcceptableIntake'>,
  actor: Actor,
  { audit, appendAcceptableIntake }: Context,
) {
  requireRole(actor, 'manager');
  const { commandId: _commandId, type: _type, ...fields } = command;
  if (!analytes.some((a) => a.id === fields.analyteId))
    throw new WorkflowError(`Analyte ${fields.analyteId} is not known.`);
  const refusal = potencyRefusal(fields);
  if (refusal) throw new WorkflowError(refusal);
  const entry = appendAcceptableIntake(fields);
  audit.compare(auditRecord.acceptableIntake(entry), null, fields);
}

export const sampleHandlers: { [T in SampleCommandType]: SampleHandler<T> } = {
  recordReceiptDeviation(command, actor, sample, { at, audit }) {
    requireRole(actor, 'coordinator');
    if (sample.status !== 'Received' && sample.status !== 'On hold')
      throw new WorkflowError(
        'A Receipt deviation can only be recorded before the Sample is assigned.',
      );
    const deviation: ReceiptDeviation = {
      sequence: sample.deviations.length + 1,
      kind: command.kind,
      description: command.description,
      recordedBy: actor.id,
      recordedAt: at,
      instruction: null,
    };
    sample.deviations.push(deviation);
    auditDeviation(audit, sample, deviation);
    audit.set(auditRecord.sample(sample), sample, 'status', 'On hold');
  },

  recordClientInstruction(command, actor, sample, { at, audit }) {
    requireRole(actor, 'coordinator');
    if (sample.status !== 'On hold')
      throw new WorkflowError(
        "A Client's instruction is recorded only for a Sample on hold.",
      );
    const instructedAt = new Date(command.instructedAt).toISOString();
    if (instructedAt > at)
      throw new WorkflowError(
        "The time of the Client's instruction cannot be later than the time of saving.",
      );
    const instruction: ClientInstruction = {
      decision: command.decision,
      contact: command.contact,
      instructedAt,
      recordedBy: actor.id,
      recordedAt: at,
    };
    const record = auditRecord.sample(sample);
    // One instruction answers every deviation the Sample is held for.
    for (const deviation of sample.deviations) {
      if (deviation.instruction) continue;
      deviation.instruction = instruction;
      const field = `deviations.${deviation.sequence}.instruction`;
      audit.change(record, `${field}.decision`, null, instruction.decision);
      audit.change(record, `${field}.contact`, null, instruction.contact);
      audit.change(record, `${field}.instructedAt`, null, instructedAt);
    }
    audit.set(
      record,
      sample,
      'status',
      command.decision === 'proceed' ? 'Received' : 'Withdrawn',
    );
  },

  assign(command, actor, sample, { audit, people }) {
    requireRole(actor, 'coordinator');
    requireNotHeld(sample);
    if (sample.status === 'Awaiting approval')
      throw new WorkflowError(
        'Return the Sample before changing its assignment.',
      );
    const analyst = people.find(
      (p) => p.id === command.assignee && p.active && actsAs(p, 'analyst'),
    );
    if (!analyst) throw new WorkflowError('Select an analyst.');
    if (sample.assignee === analyst.id)
      throw new WorkflowError(
        `The Sample is already assigned to ${analyst.name}.`,
      );
    const record = auditRecord.sample(sample);
    audit.set(record, sample, 'assignee', analyst.id);
    if (sample.status === 'Received')
      audit.set(record, sample, 'status', 'In progress');
  },

  enterResult(
    command,
    actor,
    sample,
    { at, audit, limitInForce, attachment, certificates },
  ) {
    requireAssignedAnalyst(actor, sample);
    // The module decides what the Result is and whether it may be recorded;
    // the handler looks up what it needs as values.
    const { test } = resultsView(sample).test(command.testId);
    recordResult(
      sample,
      {
        testId: test.id,
        value: command.value,
        instrumentReading: command.instrumentReading,
        sequenceId: command.sequenceId,
        analysedOn: command.analysedOn,
        reason: command.reason,
        limit: limitInForce(test.analyteId),
        worksheet: attachment(command.attachmentId),
        worksheetOf: attachment,
        hasCertificate: certificates(sample.id).length > 0,
      },
      { actor: actor.id, at, audit },
    );
  },

  submitForApproval(_command, actor, sample, { audit, certificates, history }) {
    requireAssignedAnalyst(actor, sample);
    if (sample.tests.some((t) => !currentResult(t)))
      throw new WorkflowError(
        'Enter a Result for every Test before submitting.',
      );
    // A Sample with a Certificate is back at the bench only in an Amendment,
    // which exists to correct a Result.
    if (
      certificates(sample.id).length &&
      !changeSummary(sample, history(sample))
    )
      throw new WorkflowError(
        'Correct at least one Result, with a reason, before submitting the Amendment.',
      );
    audit.set(
      auditRecord.sample(sample),
      sample,
      'status',
      'Awaiting approval',
    );
    sample.lastReturn = null;
  },

  approve(
    _command,
    actor,
    sample,
    {
      at,
      audit,
      submission,
      signatures,
      certificates,
      issueCertificate,
      history,
    },
  ) {
    requireRole(actor, 'manager');
    requireAwaitingApproval(sample);
    // Separation of duties first: corrections, retests, Amendment corrections
    // and Laboratory error checks are Bench work too (ADR-0005), and the
    // refusal names the approver's first act. Then the OOS gate.
    const refused = resultsView(sample).approvalRefusal(actor.id);
    if (refused)
      throw new WorkflowError(
        refused.reason,
        refused.code === 'separation of duties' ? 403 : 400,
      );
    audit.set(auditRecord.sample(sample), sample, 'status', 'Approved');
    // Approval freezes the next Certificate version. It carries the latest
    // "performed by" and, for a version issued by an Amendment, the "amended
    // by" of the submission that led here; this Approval's own signature is
    // recorded by the entry point with the same signer and time.
    const issued = certificates(sample.id);
    const version = (issued.at(-1)?.version ?? 0) + 1;
    const signed = signatures(sample.id);
    const latest = (meaning: SignatureMeaning) => {
      const found = signed.filter((x) => x.meaning === meaning).at(-1);
      if (!found)
        throw new Error(`Sample ${sample.id} has no "${meaning}" signature.`);
      return {
        meaning: found.meaning,
        signerId: found.signerId,
        printedName: found.printedName,
        signedAt: found.signedAt,
      };
    };
    // Every version after the first is issued by an Amendment, which states
    // the version it replaces, why it was started and, from the audit trail,
    // what it changed.
    let amendment = null;
    if (version > 1) {
      const entries = history(sample);
      const start = amendmentOf(entries);
      const changes = changeSummary(sample, entries);
      const replaces = replacedVersion(issued);
      if (!start || !changes || replaces === null)
        throw new Error(`Sample ${sample.id} has no Amendment to approve.`);
      amendment = {
        replacesVersion: replaces,
        reason: start.reason,
        changeSummary: changes,
      };
    }
    const certificate = issueCertificate(
      certificateContent({
        sample,
        submission: submission(sample.submissionId),
        version,
        amendment,
        approvedAt: at,
        signatures: [
          latest('performed by'),
          ...(version > 1 ? [latest('amended by')] : []),
          {
            meaning: signatureMeanings.approve,
            signerId: actor.id,
            printedName: actor.name,
            signedAt: at,
          },
        ],
      }),
    );
    const record = auditRecord.certificate(sample, version);
    audit.change(record, 'version', null, version);
    audit.change(record, 'sha256', null, certificate.sha256);
  },

  startAmendment(command, actor, sample, { audit }) {
    requireRole(actor, 'coordinator', 'manager');
    if (sample.status !== 'Published')
      throw new WorkflowError(
        'Only a Published Certificate of Analysis can be amended.',
      );
    // The reason is the reason for the change of status; the Certificate
    // issued at the Amendment's Approval states it.
    audit.set(
      auditRecord.sample(sample),
      sample,
      'status',
      'Amendment in progress',
      command.reason,
    );
    sample.lastReturn = null;
  },

  return(command, actor, sample, { at, audit }) {
    requireRole(actor, 'manager');
    requireAwaitingApproval(sample);
    // The comment is the reason for the change of status.
    audit.set(
      auditRecord.sample(sample),
      sample,
      'status',
      'Returned',
      command.comment,
    );
    sample.lastReturn = { comment: command.comment, by: actor.id, at };
  },

  openOosInvestigation(command, actor, sample, { at, allocate, audit }) {
    requireRole(actor, 'manager');
    // A held Sample has no Results in play; Withdrawn is refused in execute.
    requireNotHeld(sample);
    openInvestigation(
      sample,
      {
        testId: command.testId,
        allocate: () => allocate('investigation'),
      },
      { actor: actor.id, at, audit },
    );
  },

  recordLabErrorCheck(command, actor, sample, { at, audit }) {
    requireRole(actor, 'analyst');
    if (sample.assignee !== actor.id)
      throw new WorkflowError(
        'Only the assigned analyst can record the laboratory error check.',
        403,
      );
    recordLabErrorCheck(
      sample,
      {
        investigationId: command.investigationId,
        findings: command.findings,
        errorIdentified: command.errorIdentified,
      },
      { actor: actor.id, at, audit },
    );
  },

  concludeOosInvestigation(command, actor, sample, { at, audit }) {
    requireRole(actor, 'manager');
    concludeInvestigation(
      sample,
      {
        investigationId: command.investigationId,
        outcome: command.outcome,
        assignableCause: command.assignableCause,
        causationConfirmed: command.causationConfirmed,
      },
      { actor: actor.id, at, audit },
    );
  },

  recordClientOosNotification(command, actor, sample, { at, audit }) {
    requireRole(actor, 'coordinator');
    recordClientNotification(
      sample,
      {
        investigationId: command.investigationId,
        contact: command.contact,
        sent: command.sent,
        notifiedAt: () =>
          recordedInstant(
            command.notifiedAt,
            at,
            'The time the Client was informed cannot be later than the time of saving.',
          ),
      },
      { actor: actor.id, at, audit },
    );
  },

  publish(
    command,
    actor,
    sample,
    { at, audit, certificates, recordPublication },
  ) {
    requireRole(actor, 'coordinator');
    if (sample.status !== 'Approved')
      throw new WorkflowError('Only approved Samples can be published.');
    const blocked = resultsView(sample).publishBlocker;
    if (blocked) throw new WorkflowError(blocked.reason);
    // Approval issued the version being published; an Amendment's Approval
    // issues the next one, which is published the same way.
    const certificate = certificates(sample.id).at(-1);
    if (!certificate || certificate.publication)
      throw new Error(
        `Sample ${sample.id} has no unpublished Certificate to publish.`,
      );
    const recipients = command.recipients;
    if (
      new Set(recipients.map((r) => r.toLowerCase())).size !== recipients.length
    )
      throw new WorkflowError('List each recipient once.');
    if (command.channel === 'other' && !command.channelDetail)
      throw new WorkflowError('Describe how the Certificate was issued.');
    const publishedAt = recordedInstant(
      command.publishedAt,
      at,
      'The time of publishing cannot be later than the time of saving.',
    );
    if (publishedAt < certificate.approvedAt)
      throw new WorkflowError(
        'A Certificate cannot have been published before its Approval.',
      );
    const publication: Publication = {
      sampleId: sample.id,
      version: certificate.version,
      recipients,
      channel: command.channel,
      channelDetail: command.channelDetail,
      publishedAt,
      publishedBy: actor.id,
      recordedAt: at,
    };
    audit.set(auditRecord.sample(sample), sample, 'status', 'Published');
    audit.compare(auditRecord.certificate(sample, certificate.version), null, {
      publication: {
        recipients,
        channel: publication.channel,
        channelDetail: publication.channelDetail,
        publishedAt,
      },
    });
    recordPublication(publication);
  },
};
