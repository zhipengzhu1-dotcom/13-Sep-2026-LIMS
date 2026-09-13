import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  analytes,
  clients,
  commandSchema,
  enteredResultOn,
  methods,
  people,
  reportingUnit,
  type Actor,
  type Activity,
  type Command,
  type CommandOutcome,
  type Method,
  type ReportingUnit,
  type Sample,
  type SampleStatus,
  type Snapshot,
  type Submission,
  type Test,
} from './contracts.ts';

/** The schema this build expects. A migration runner advances it; this module never does. */
export const SCHEMA_VERSION = 3;

export class WorkflowError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function requireRole(actor: Actor, role: Actor['role']) {
  if (actor.role !== role)
    throw new WorkflowError(`This action requires the ${role} role.`, 403);
}

/** Statuses in which the assigned Analyst may enter Results or submit them. */
const editableStatuses: readonly SampleStatus[] = ['In progress', 'Returned'];

function requireAssignedAnalyst(actor: Actor, sample: Sample) {
  requireRole(actor, 'analyst');
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
function fingerprintOf(command: Command): Uint8Array {
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
 * consumes none.
 */
type Context = {
  at: string;
  allocate: (series: Series) => number;
  /** The Method reference data in force. */
  methods: readonly Method[];
};

/**
 * Receipt is the one verb that creates its subjects, so it returns the
 * Submission and its Samples, each with its activity detail.
 */
type ReceiptHandler = (
  command: CommandOf<'receiveSubmission'>,
  actor: Actor,
  context: Context,
) => { submission: Submission; samples: Sample[]; details: string[] };

/**
 * Every other verb acts on one Sample: it is handed the loaded Sample, mutates
 * it in place and returns only the activity detail.
 */
type SampleHandler<T extends SampleCommandType> = (
  command: CommandOf<T>,
  actor: Actor,
  sample: Sample,
  context: Context,
) => string;

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
  { at, allocate, methods },
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
    const { methodIds: _methodIds, ...record } = receipt;
    const sample: Sample = {
      id: `${yy}-${pad(allocate('sample'), 5)}`,
      submissionId: submission.id,
      clientId: client.id,
      client: client.name,
      ...record,
      receivedAt: received.receivedAt,
      receivedBy: actor.id,
      assignee: null,
      status: 'Received',
      lastReturn: null,
      tests: requested[i].map((m) => testOf(m, unit)),
      revision: 1,
    };
    submission.sampleIds.push(sample.id);
    return sample;
  });
  // Until the structured audit trail lands, a corrected received-at is
  // recorded in the activity detail as well as on the Submission itself.
  const correction = submission.receivedAtCorrection
    ? ` Received at corrected from ${submission.receivedAtCorrection.recordedAt} to ${submission.receivedAt}; reason: ${submission.receivedAtCorrection.reason}`
    : '';
  return {
    submission,
    samples,
    details: samples.map(
      (s) =>
        `Received under ${submission.id}: ${s.product}, batch ${s.batch}, ${s.materialType}, ${s.quantity.value} ${s.quantity.unit}; ${s.tests.length} Test(s).${correction}`,
    ),
  };
};

const sampleHandlers: { [T in SampleCommandType]: SampleHandler<T> } = {
  assign(command, actor, sample) {
    requireRole(actor, 'coordinator');
    if (sample.status === 'Awaiting approval')
      throw new WorkflowError(
        'Return the Sample before changing its assignment.',
      );
    const analyst = people.find(
      (p) => p.id === command.assignee && p.role === 'analyst',
    );
    if (!analyst) throw new WorkflowError('Select an analyst.');
    const detail = `Assigned to ${analyst.name} (previous: ${sample.assignee ?? 'unassigned'}).`;
    sample.assignee = analyst.id;
    if (sample.status === 'Received') sample.status = 'In progress';
    return detail;
  },

  enterResult(command, actor, sample, { at }) {
    requireAssignedAnalyst(actor, sample);
    const test = sample.tests.find((t) => t.id === command.testId);
    if (!test) throw new WorkflowError('Test not found.');
    const previous = test.results.at(-1);
    if (previous && command.reason.length < 3)
      throw new WorkflowError('Give a reason for changing the Result.');
    // The unit comes from the Test, which took it from the Material type.
    test.results.push({
      value: command.value,
      unit: test.unit,
      enteredBy: actor.id,
      enteredAt: at,
      reason: command.reason,
    });
    return `${test.analyteName} (${test.methodCode} v${test.methodVersion}): ${previous ? `${previous.value} → ` : ''}${command.value} ${test.unit}${command.reason ? `; reason: ${command.reason}` : ''}.`;
  },

  submitForApproval(_command, actor, sample) {
    requireAssignedAnalyst(actor, sample);
    if (sample.tests.some((t) => !t.results.length))
      throw new WorkflowError(
        'Enter a Result for every Test before submitting.',
      );
    sample.status = 'Awaiting approval';
    sample.lastReturn = null;
    return 'Submitted all Results for approval.';
  },

  approve(_command, actor, sample) {
    requireRole(actor, 'manager');
    requireAwaitingApproval(sample);
    if (enteredResultOn(sample, actor.id))
      throw new WorkflowError(
        'A Manager cannot approve a Sample on which they entered a Result.',
        403,
      );
    sample.status = 'Approved';
    return 'Approved.';
  },

  return(command, actor, sample, { at }) {
    requireRole(actor, 'manager');
    requireAwaitingApproval(sample);
    sample.status = 'Returned';
    sample.lastReturn = { comment: command.comment, by: actor.id, at };
    return `Returned to the analyst: ${command.comment}`;
  },
};

/** The Submission and Samples a command acted on, kept with its key so a
 * replay returns the same subjects. */
type Subject = { submissionId: string | null; sampleIds: string[] };

export class Laboratory {
  private db: DatabaseSync;
  constructor(
    path: string,
    private clock = () => new Date().toISOString(),
    /** Seeded reference data; replaceable so rules over it can be exercised. */
    private reference: { methods: readonly Method[] } = { methods },
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS samples (id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sequences (series TEXT NOT NULL, year INTEGER NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (series, year)) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY, sampleId TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, detail TEXT NOT NULL, commandId BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (commandId BLOB PRIMARY KEY, actorId TEXT NOT NULL, commandType TEXT NOT NULL, fingerprint BLOB NOT NULL, receivedAt TEXT NOT NULL, subject TEXT) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS commandReplays (id INTEGER PRIMARY KEY, commandId BLOB NOT NULL REFERENCES commands(commandId), at TEXT NOT NULL, actorId TEXT NOT NULL);`);
    // Stamp the schema version only on a database that has none. A migration
    // runner owns this value afterwards; overwriting it here would silently
    // undo a migration and defeat the version gate the runner reads.
    const { user_version: version } = this.db
      .prepare('PRAGMA user_version')
      .get() as { user_version: number };
    if (version === 0) this.db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);
  }

  close() {
    this.db.close();
  }

  snapshot(): Snapshot {
    return {
      submissions: this.documents('submissions'),
      samples: this.documents('samples'),
      activity: this.db
        .prepare(
          'SELECT id, sampleId, action, actor, at, detail FROM activity ORDER BY id DESC',
        )
        .all() as Activity[],
      people,
      clients,
      analytes,
      methods: this.reference.methods,
    };
  }

  /**
   * The single entry point, and the only place that opens a transaction.
   * It resolves the actor, validates the command, loads and guards the subject,
   * dispatches to exactly one handler, and writes the records and their
   * activity rows together. Nothing below this method may call BEGIN.
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
    const key = keyOf(command.commandId);
    const fingerprint = fingerprintOf(command);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const context: Context = {
        at: this.clock(),
        allocate: (series) => this.allocate(series, context.at),
        methods: this.reference.methods,
      };
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
        const receipt = receiveSubmission(command, actor, context);
        ({ submission, samples } = receipt);
        this.save('submissions', submission.id, submission);
        samples.forEach((s, i) =>
          this.persist(
            s,
            command.type,
            actor,
            context,
            receipt.details[i],
            key,
          ),
        );
      } else {
        const sample = this.load(command.sampleId);
        if (sample.revision !== command.revision)
          throw new WorkflowError(
            'This sample changed. Refresh the workspace before saving again.',
            409,
          );
        if (sample.status === 'Approved')
          throw new WorkflowError('Approved samples are locked.');
        // One cast, localised here, because TypeScript cannot correlate the
        // narrowed command with the handler selected by its own discriminant.
        // Each handler in the registry is individually typed to its own verb.
        const handler = sampleHandlers[
          command.type
        ] as SampleHandler<SampleCommandType>;
        const detail = handler(command, actor, sample, context);
        sample.revision++;
        this.persist(sample, command.type, actor, context, detail, key);
        samples = [sample];
      }
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

  private persist(
    sample: Sample,
    action: Command['type'],
    actor: Actor,
    { at }: Context,
    detail: string,
    commandId: Uint8Array,
  ) {
    this.save('samples', sample.id, sample);
    this.db
      .prepare(
        'INSERT INTO activity (sampleId, action, actor, at, detail, commandId) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(sample.id, action, actor.id, at, detail, commandId);
  }
}
