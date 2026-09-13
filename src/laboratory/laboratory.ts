import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  acceptableIntakeEntrySchema,
  analytes,
  clients,
  commandSchema,
  conformity,
  currentResult,
  limitInForce,
  seededAcceptableIntakes,
  type AcceptableIntake,
  type AcceptableIntakeEntry,
  enteredResultOn,
  heldStatuses,
  methods,
  people,
  qualify,
  reportingUnit,
  signatureMeanings,
  type Actor,
  type AuditEntry,
  type ClientInstruction,
  type Command,
  type ReceiptDeviation,
  type CommandOutcome,
  type Method,
  type ReportingUnit,
  type Result,
  type Sample,
  type SampleStatus,
  type Signature,
  type SigningCommandType,
  type Snapshot,
  type Submission,
  type Test,
} from './contracts.ts';
import { AuditTrail, auditRecord, type Audit } from './audit.ts';

/** The schema this build expects. A migration runner advances it; this module never does. */
export const SCHEMA_VERSION = 8;

export class WorkflowError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/**
 * Verifies a signer's password against their stored hash. The accounts store
 * implements it; the core asks it once per signing command, inside the command.
 */
export interface SignerCredentials {
  checkPassword(userId: string, password: string): boolean;
}

function requireRole(actor: Actor, role: Actor['role']) {
  if (actor.role !== role)
    throw new WorkflowError(`This action requires the ${role} role.`, 403);
}

/** Statuses in which the assigned Analyst may enter Results or submit them. */
const editableStatuses: readonly SampleStatus[] = ['In progress', 'Returned'];

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

/** The 16 raw bytes of a UUID. #54 stores the key as a BLOB in a WITHOUT ROWID
 * table, so the primary key is the access path and pays for no second B-tree. */
function keyOf(commandId: string): Uint8Array {
  return Uint8Array.from(Buffer.from(commandId.replace(/-/g, ''), 'hex'));
}

/** A hash of the command body with its key removed, so a retry of the same act
 * matches and a different body under a reused key is detected. */
function fingerprintOf(command: { commandId: string }): Uint8Array {
  const { commandId: _ignored, ...body } = command;
  const canonical = JSON.stringify(
    Object.fromEntries(
      Object.entries(body).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
  return Uint8Array.from(
    createHash('sha256').update(canonical).digest().subarray(0, 16),
  );
}

/** A schema issue in words a Coordinator can act on: an issue inside a
 * receipt names its Sample by position rather than by array index. */
function describeIssue({
  path,
  message,
}: {
  path: PropertyKey[];
  message: string;
}) {
  if (path[0] === 'samples' && typeof path[1] === 'number') {
    const field = path.slice(2).map(String).join('.');
    return `Sample ${path[1] + 1}${field ? `, ${field}` : ''}: ${message}`;
  }
  return `${path.map(String).join('.')}: ${message}`;
}

type CommandOf<T extends Command['type']> = Extract<Command, { type: T }>;
type SampleCommandType = Exclude<Command['type'], 'receiveSubmission'>;

/** A per-year identifier sequence. */
type Series = 'submission' | 'sample';

/**
 * What a handler is given. The entry point has already opened the transaction,
 * resolved the actor and validated the command; a handler decides only what its
 * own verb means. `at` is the single timestamp for the whole command, so every
 * row a command writes bears the same instant. `allocate` takes the next number
 * of a per-year sequence inside the same transaction, so a rejected command
 * consumes none. `audit` writes the command's field-level audit entries; every
 * command must write at least one. `limitInForce` is the Acceptable intake
 * entry for an Analyte in force at `at`.
 */
type Context = {
  at: string;
  allocate: (series: Series) => number;
  audit: Audit;
  limitInForce: (analyteId: string) => AcceptableIntake | null;
  /** The Method reference data in force. */
  methods: readonly Method[];
};

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
type SampleHandler<T extends SampleCommandType> = (
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
    ...method.lodLoq[unit],
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

const receiveSubmission: ReceiptHandler = (
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
    const finished = receipt.materialType === 'finished product';
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
    return receipt.methodIds.map((id) => {
      const method = methods.find((m) => m.id === id);
      if (!method)
        throw new WorkflowError(`${label}Method ${id} is not available.`);
      if (!method.materialTypes.includes(receipt.materialType))
        throw new WorkflowError(
          `${label}${method.code} v${method.version} does not apply to a ${receipt.materialType}.`,
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
      omit: ['id', 'tests', 'revision', 'lastReturn', 'deviations'],
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

const sampleHandlers: { [T in SampleCommandType]: SampleHandler<T> } = {
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

  assign(command, actor, sample, { audit }) {
    requireRole(actor, 'coordinator');
    requireNotHeld(sample);
    if (sample.status === 'Awaiting approval')
      throw new WorkflowError(
        'Return the Sample before changing its assignment.',
      );
    const analyst = people.find(
      (p) => p.id === command.assignee && p.role === 'analyst',
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

  enterResult(command, actor, sample, { at, audit, limitInForce }) {
    requireAssignedAnalyst(actor, sample);
    const test = sample.tests.find((t) => t.id === command.testId);
    if (!test) throw new WorkflowError('Test not found.');
    const previous = currentResult(test);
    if (previous && command.reason.length < 3)
      throw new WorkflowError('Give a reason for changing the Result.');
    // Finished products are judged against the entry in force now; raw
    // materials have no Limit.
    const limit =
      sample.materialType === 'finished product'
        ? limitInForce(test.analyteId)
        : null;
    if (sample.materialType === 'finished product' && !limit)
      throw new WorkflowError(
        `No Acceptable intake is in force for ${test.analyteName}.`,
      );
    // The unit and LOD/LOQ come from the Test, which took them from the
    // Material type at receipt; the qualifier is never entered.
    const qualifier = qualify(command.value, test);
    const next: Result = {
      sequence: test.results.length + 1,
      status: 'current' as const,
      value: command.value,
      unit: test.unit,
      qualifier,
      instrumentReading: command.instrumentReading,
      sequenceId: command.sequenceId,
      enteredBy: actor.id,
      enteredAt: at,
      reason: command.reason,
      limit,
      conformity: conformity({ value: command.value, qualifier }, test, limit),
    };
    // The actor, time and reason are the entry's own columns, and the sequence
    // and status only say which Result is current, so only the Result's
    // content is compared, field by field, with the current Result. The Limit
    // is a copy of reference data, so the trail names its entry and value
    // rather than every field of the source it was published in.
    const audited = (r: Result) => ({
      result: {
        ...r,
        limit: r.limit && { entry: r.limit.id, value: r.limit.value },
      },
    });
    const record = auditRecord.test(sample, test);
    const reason = command.reason;
    const changed = audit.compare(
      record,
      previous ? audited(previous) : null,
      audited(next),
      {
        reason,
        omit: [
          'result.sequence',
          'result.status',
          'result.enteredBy',
          'result.enteredAt',
          'result.reason',
        ],
      },
    );
    // Re-entering an unchanged value is still an act the trail must show.
    if (!changed)
      audit.change(record, 'result.value', previous!.value, next.value, reason);
    if (previous) previous.status = 'superseded';
    test.results.push(next);
  },

  submitForApproval(_command, actor, sample, { audit }) {
    requireAssignedAnalyst(actor, sample);
    if (sample.tests.some((t) => !currentResult(t)))
      throw new WorkflowError(
        'Enter a Result for every Test before submitting.',
      );
    audit.set(
      auditRecord.sample(sample),
      sample,
      'status',
      'Awaiting approval',
    );
    sample.lastReturn = null;
  },

  approve(_command, actor, sample, { audit }) {
    requireRole(actor, 'manager');
    requireAwaitingApproval(sample);
    if (enteredResultOn(sample, actor.id))
      throw new WorkflowError(
        'A Manager cannot approve a Sample on which they entered a Result.',
        403,
      );
    audit.set(auditRecord.sample(sample), sample, 'status', 'Approved');
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
};

export type LaboratoryOptions = {
  /** The server time; defaults to the system clock. */
  clock?: () => string;
  /** Verifies signers' passwords. Absent, every Electronic signature is refused. */
  credentials?: SignerCredentials | null;
  /** The Method reference data in force; defaults to the seeded Methods. */
  methods?: readonly Method[];
};

/** The Submission and Samples a command acted on, kept with its key so a
 * replay returns the same subjects. */
type Subject = { submissionId: string | null; sampleIds: string[] };

export class Laboratory {
  private db: DatabaseSync;
  private audit: AuditTrail;
  private clock: () => string;
  /** Absent, every Electronic signature is refused. */
  private credentials: SignerCredentials | null;
  /** Seeded Method reference data; replaceable so rules over it can be exercised. */
  private methods: readonly Method[];
  constructor(path: string, options: LaboratoryOptions = {}) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.credentials = options.credentials ?? null;
    this.methods = options.methods ?? methods;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS samples (id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sequences (series TEXT NOT NULL, year INTEGER NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (series, year)) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS signatures (id INTEGER PRIMARY KEY, sampleId TEXT NOT NULL, signerId TEXT NOT NULL, printedName TEXT NOT NULL, signedAt TEXT NOT NULL, meaning TEXT NOT NULL, command TEXT NOT NULL, commandId BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (commandId BLOB PRIMARY KEY, actorId TEXT NOT NULL, commandType TEXT NOT NULL, fingerprint BLOB NOT NULL, receivedAt TEXT NOT NULL, subject TEXT) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS commandReplays (id INTEGER PRIMARY KEY, commandId BLOB NOT NULL REFERENCES commands(commandId), at TEXT NOT NULL, actorId TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS acceptableIntakes (id INTEGER PRIMARY KEY, analyteId TEXT NOT NULL, value REAL NOT NULL, sourceTitle TEXT NOT NULL, sourceUrl TEXT NOT NULL, sourceRevisionDate TEXT NOT NULL, effectiveFrom TEXT NOT NULL, illustrative INTEGER NOT NULL);
      CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoUpdate BEFORE UPDATE ON acceptableIntakes BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;
      CREATE TRIGGER IF NOT EXISTS acceptableIntakesNoDelete BEFORE DELETE ON acceptableIntakes BEGIN SELECT RAISE(ABORT, 'Acceptable intake entries are append-only.'); END;`);
    // Reference data: a new database starts with the seeded entries, written
    // as one statement so it is never half seeded.
    const { entries } = this.db
      .prepare('SELECT COUNT(*) AS entries FROM acceptableIntakes')
      .get() as { entries: number };
    if (!entries) this.insertAcceptableIntakes(seededAcceptableIntakes);
    // Stamp the schema version only on a database that has none. A migration
    // runner owns this value afterwards; overwriting it here would silently
    // undo a migration and defeat the version gate the runner reads.
    const { user_version: version } = this.db
      .prepare('PRAGMA user_version')
      .get() as { user_version: number };
    if (version === 0) this.db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);
    this.audit = new AuditTrail(this.db);
  }

  close() {
    this.db.close();
  }

  snapshot(): Snapshot {
    return {
      submissions: this.documents('submissions'),
      samples: this.documents('samples'),
      audit: this.audit.entries(),
      signatures: (
        this.db
          .prepare(
            'SELECT sampleId, signerId, printedName, signedAt, meaning, command FROM signatures ORDER BY signedAt, id',
          )
          .all() as (Omit<Signature, 'command'> & { command: string })[]
      ).map((row) => ({ ...row, command: JSON.parse(row.command) })),
      people,
      clients,
      analytes,
      methods: this.methods,
      acceptableIntakes: this.acceptableIntakes(),
    };
  }

  /** The audit trail, newest first: lab-wide, or one Sample's history
   * (the Sample, its Tests and Results, and its Submission). */
  auditTrail(sampleId?: string): AuditEntry[] {
    return this.audit.entries(
      sampleId === undefined ? undefined : this.load(sampleId),
    );
  }

  /** Every Acceptable intake entry, current and historical, in append order. */
  acceptableIntakes(): AcceptableIntake[] {
    return (
      this.db
        .prepare('SELECT * FROM acceptableIntakes ORDER BY id')
        .all() as (Omit<AcceptableIntake, 'illustrative'> & {
        illustrative: number;
      })[]
    ).map((row) => ({ ...row, illustrative: row.illustrative === 1 }));
  }

  /**
   * Appends a new Acceptable intake entry. Entries are reference data with no
   * maintenance screen in this release; a changed Acceptable intake is added
   * this way and never overwrites an earlier entry, so Results keep the Limit
   * they were judged against.
   */
  appendAcceptableIntake(input: unknown): AcceptableIntake {
    const parsed = acceptableIntakeEntrySchema.safeParse(input);
    if (!parsed.success)
      throw new WorkflowError(
        parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      );
    if (!analytes.some((a) => a.id === parsed.data.analyteId))
      throw new WorkflowError(`Analyte ${parsed.data.analyteId} is not known.`);
    return this.insertAcceptableIntakes([parsed.data])[0];
  }

  private insertAcceptableIntakes(
    entries: readonly AcceptableIntakeEntry[],
  ): AcceptableIntake[] {
    const rows = this.db
      .prepare(
        `INSERT INTO acceptableIntakes (analyteId, value, sourceTitle, sourceUrl, sourceRevisionDate, effectiveFrom, illustrative)
         VALUES ${entries.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')} RETURNING id`,
      )
      .all(
        ...entries.flatMap((e) => [
          e.analyteId,
          e.value,
          e.sourceTitle,
          e.sourceUrl,
          e.sourceRevisionDate,
          e.effectiveFrom,
          e.illustrative ? 1 : 0,
        ]),
      ) as { id: number }[];
    return entries.map((e, i) => ({ ...e, id: Number(rows[i].id) }));
  }

  /**
   * The single entry point, and the only place that opens a transaction.
   * It resolves the actor, validates the command, loads and guards the subject,
   * dispatches to exactly one handler, and writes the records and their
   * audit entries together. Nothing below this method may call BEGIN.
   */
  execute(input: unknown, actorId: string): CommandOutcome {
    const actor = people.find((p) => p.id === actorId);
    if (!actor) throw new WorkflowError('Unknown user.', 403);
    const parsed = commandSchema.safeParse(input);
    if (!parsed.success)
      throw new WorkflowError(
        parsed.error.issues.map(describeIssue).join('; '),
      );
    const command = parsed.data;
    // The password is taken out once, here. Only the unsigned command is
    // fingerprinted, stored with a signature or handed on.
    const { password, ...unsigned } = command as Command & {
      password?: string;
    };
    const key = keyOf(command.commandId);
    const fingerprint = fingerprintOf(unsigned);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const at = this.clock();
      const audit = this.audit.writer({
        actor: actor.id,
        at,
        commandType: command.type,
        commandId: command.commandId,
      });
      const context: Context = {
        at,
        allocate: (series) => this.allocate(series, at),
        audit,
        limitInForce: (analyteId) =>
          limitInForce(this.acceptableIntakes(), analyteId, at),
        methods: this.methods,
      };
      // Verified before the key is claimed or a replay answered, so a wrong
      // password applies nothing, is never reported as an earlier success, and
      // rolls back with the key released for resubmission.
      const meaning = this.verifySignature(command.type, actor, password);
      // Claim the key as the first statement inside the transaction, before any
      // validation or domain work. A suppressed insert returns no row, which is
      // the duplicate test — decided inside the transaction, with no separate
      // read and therefore no time-of-check/time-of-use window.
      const claimed = this.db
        .prepare(
          `INSERT INTO commands (commandId, actorId, commandType, fingerprint, receivedAt)
           VALUES (?, ?, ?, ?, ?) ON CONFLICT(commandId) DO NOTHING RETURNING commandId`,
        )
        .get(key, actor.id, command.type, fingerprint, context.at);
      if (!claimed) {
        const outcome = this.replay(key, fingerprint, actor, context.at);
        this.db.exec('COMMIT');
        return outcome;
      }
      let submission: Submission | null = null;
      let samples: Sample[];
      if (command.type === 'receiveSubmission') {
        ({ submission, samples } = receiveSubmission(command, actor, context));
        this.save('submissions', submission.id, submission);
        for (const s of samples) this.save('samples', s.id, s);
      } else {
        const sample = this.load(command.sampleId);
        if (sample.revision !== command.revision)
          throw new WorkflowError(
            'This sample changed. Refresh the workspace before saving again.',
            409,
          );
        if (sample.status === 'Approved')
          throw new WorkflowError('Approved samples are locked.');
        if (sample.status === 'Withdrawn')
          throw new WorkflowError(
            'The Client withdrew this Sample, so it is closed.',
          );
        // One cast, localised here, because TypeScript cannot correlate the
        // narrowed command with the handler selected by its own discriminant.
        // Each handler in the registry is individually typed to its own verb.
        const handler = sampleHandlers[
          command.type
        ] as SampleHandler<SampleCommandType>;
        handler(command, actor, sample, context);
        sample.revision++;
        this.save('samples', sample.id, sample);
        if (meaning)
          this.recordSignature(
            sample.id,
            actor,
            meaning,
            unsigned as Signature['command'],
            context,
            key,
          );
        samples = [sample];
      }
      // A command that changed nothing on the record must not pass silently.
      if (!audit.written)
        throw new Error(`${command.type} wrote no audit entry.`);
      const subject: Subject = {
        submissionId: submission?.id ?? null,
        sampleIds: samples.map((s) => s.id),
      };
      this.db
        .prepare('UPDATE commands SET subject=? WHERE commandId=?')
        .run(JSON.stringify(subject), key);
      this.db.exec('COMMIT');
      return { outcome: 'applied', submission, samples };
    } catch (error) {
      // The claim rolls back with everything else, so only committed effects are
      // deduplicated and a rejected command may be resubmitted under the same key.
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * The Electronic signature a command requires, if any: the meaning it will be
   * recorded with once the signer's password matches their stored hash.
   * Anything else rejects the whole command. Every command type listed in
   * `signatureMeanings` is signed this way, with no per-handler code.
   */
  private verifySignature(
    type: Command['type'],
    actor: Actor,
    password: string | undefined,
  ) {
    if (!Object.hasOwn(signatureMeanings, type)) return null;
    if (!this.credentials)
      throw new WorkflowError(
        'Electronic signatures cannot be verified on this server.',
        503,
      );
    if (!password || !this.credentials.checkPassword(actor.id, password))
      throw new WorkflowError(
        'The password is incorrect. Nothing was signed or saved.',
        403,
      );
    return signatureMeanings[type as SigningCommandType];
  }

  private recordSignature(
    sampleId: string,
    signer: Actor,
    meaning: Signature['meaning'],
    command: Signature['command'],
    { at, audit }: Context,
    commandId: Uint8Array,
  ) {
    // The signature joins the Sample's history beside the change it signs.
    // Only its manifestation is audited: never the password.
    const record = { type: 'Sample', id: sampleId, sampleId } as const;
    audit.change(record, 'signature.meaning', null, meaning);
    audit.change(record, 'signature.signer', null, signer.id);
    this.db
      .prepare(
        'INSERT INTO signatures (sampleId, signerId, printedName, signedAt, meaning, command, commandId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        sampleId,
        signer.id,
        signer.name,
        at,
        meaning,
        JSON.stringify(command),
        commandId,
      );
  }

  /**
   * A key already claimed. The command is either a retry of the same act — in
   * which case the original result is returned and the attempt recorded — or a
   * client defect, which fails loudly rather than silently succeeding.
   */
  private replay(
    key: Uint8Array,
    fingerprint: Uint8Array,
    actor: Actor,
    at: string,
  ): CommandOutcome {
    const original = this.db
      .prepare(
        'SELECT actorId, fingerprint, receivedAt, subject FROM commands WHERE commandId=?',
      )
      .get(key) as {
      actorId: string;
      fingerprint: Uint8Array;
      receivedAt: string;
      subject: string | null;
    };
    if (
      Buffer.compare(
        Buffer.from(original.fingerprint),
        Buffer.from(fingerprint),
      ) !== 0
    )
      throw new WorkflowError(
        'This request reuses the identifier of a different change. Reload the workspace and try again.',
        422,
      );
    // Returning "already applied" while attributing the act to a different
    // person is the one outcome that could produce a false attribution.
    if (original.actorId !== actor.id)
      throw new WorkflowError(
        'This request reuses the identifier of a change made by someone else.',
        422,
      );
    if (!original.subject)
      throw new WorkflowError(
        'That change is still being applied. Reload the workspace before trying again.',
        409,
      );
    const subject = JSON.parse(original.subject) as Subject;
    this.db
      .prepare(
        'INSERT INTO commandReplays (commandId, at, actorId) VALUES (?, ?, ?)',
      )
      .run(key, at, actor.id);
    return {
      outcome: 'replayed',
      submission: subject.submissionId
        ? this.find<Submission>('submissions', subject.submissionId)
        : null,
      samples: subject.sampleIds.map((id) => this.load(id)),
      originallyAppliedAt: original.receivedAt,
      originalActorId: original.actorId,
    };
  }

  private documents<T>(table: 'submissions' | 'samples'): T[] {
    return (
      this.db
        .prepare(`SELECT document FROM ${table} ORDER BY id DESC`)
        .all() as { document: string }[]
    ).map((r) => JSON.parse(r.document));
  }

  private find<T>(table: 'submissions' | 'samples', id: string): T | null {
    const row = this.db
      .prepare(`SELECT document FROM ${table} WHERE id=?`)
      .get(id) as { document: string } | undefined;
    return row ? JSON.parse(row.document) : null;
  }

  private load(sampleId: string): Sample {
    const sample = this.find<Sample>('samples', sampleId);
    if (!sample) throw new WorkflowError('Sample not found.', 404);
    return sample;
  }

  /** The next number in a per-year sequence. It is a stored counter, never a
   * row count, and it resets because each calendar year has its own row. */
  private allocate(series: Series, at: string): number {
    const { value } = this.db
      .prepare(
        `INSERT INTO sequences (series, year, value) VALUES (?, ?, 1)
         ON CONFLICT(series, year) DO UPDATE SET value = value + 1 RETURNING value`,
      )
      .get(series, Number(at.slice(0, 4))) as { value: number };
    return Number(value);
  }

  private save(table: 'submissions' | 'samples', id: string, document: object) {
    this.db
      .prepare(
        `INSERT INTO ${table} (id, document) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET document=excluded.document`,
      )
      .run(id, JSON.stringify(document));
  }
}
