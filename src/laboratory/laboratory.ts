import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  commandSchema,
  methods,
  people,
  hasException,
  type Actor,
  type Activity,
  type Command,
  type CommandOutcome,
  type Sample,
  type Snapshot,
} from './contracts.ts';

/** The schema this build expects. A migration runner advances it; this module never does. */
export const SCHEMA_VERSION = 1;

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
    throw new WorkflowError(`This action requires a ${role}.`, 403);
}

function requireAssignedAnalyst(actor: Actor, sample: Sample) {
  requireRole(actor, 'analyst');
  if (sample.assignee !== actor.id)
    throw new WorkflowError(
      'Only the assigned analyst can record or submit results.',
      403,
    );
  if (!['In progress', 'Returned'].includes(sample.status))
    throw new WorkflowError('Results cannot be changed at this stage.');
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

type CommandOf<T extends Command['type']> = Extract<Command, { type: T }>;
type MutatingType = Exclude<Command['type'], 'receive'>;

/**
 * What a handler is given. The entry point has already opened the transaction,
 * resolved the actor and validated the command; a handler decides only what its
 * own verb means. `at` is the single timestamp for the whole command, so every
 * row a command writes bears the same instant.
 */
type Context = { at: string; nextSequence: () => number };

/**
 * Receipt is the one verb that creates its subject, so it returns the sample.
 * Every other verb is handed the loaded sample and mutates it in place,
 * returning only the activity detail.
 */
type ReceiveHandler = (
  command: CommandOf<'receive'>,
  actor: Actor,
  context: Context,
) => { sample: Sample; detail: string };

type MutatingHandler<T extends MutatingType> = (
  command: CommandOf<T>,
  actor: Actor,
  sample: Sample,
  context: Context,
) => string;

const receive: ReceiveHandler = (command, actor, { at, nextSequence }) => {
  requireRole(actor, 'coordinator');
  const selected = methods.filter((m) => command.methodIds.includes(m.id));
  if (selected.length !== command.methodIds.length)
    throw new WorkflowError('Choose unique, available methods.');
  const sample: Sample = {
    id: `LAB-${at.slice(0, 4)}-${String(nextSequence()).padStart(4, '0')}`,
    product: command.product,
    client: command.client,
    batch: command.batch,
    dueDate: command.dueDate,
    priority: command.priority,
    notes: command.notes,
    receivedAt: at,
    receivedBy: actor.id,
    assignee: null,
    status: 'Received',
    revision: 1,
    tests: selected.map((m) => ({ ...m, results: [] })),
  };
  return {
    sample,
    detail: `Received ${sample.product}, batch ${sample.batch}; ${selected.length} test(s).`,
  };
};

const mutating: { [T in MutatingType]: MutatingHandler<T> } = {
  assign(command, actor, sample) {
    requireRole(actor, 'coordinator');
    if (sample.status === 'In review')
      throw new WorkflowError(
        'Return the sample before changing its assignment.',
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

  record(command, actor, sample, { at }) {
    requireAssignedAnalyst(actor, sample);
    const test = sample.tests.find((t) => t.id === command.testId);
    if (!test) throw new WorkflowError('Test not found.');
    const previous = test.results.at(-1);
    if (previous && command.reason.length < 3)
      throw new WorkflowError('Give a reason for changing the result.');
    const inSpec = command.value >= test.min && command.value <= test.max;
    test.results.push({
      value: command.value,
      reference: command.reference,
      reason: command.reason,
      analyst: actor.id,
      recordedAt: at,
      inSpec,
    });
    return `${test.name}: ${previous ? `${previous.value} → ` : ''}${command.value} ${test.unit}; ${inSpec ? 'within specification' : 'outside specification'}; reference: ${command.reference}${command.reason ? `; reason: ${command.reason}` : ''}.`;
  },

  submit(_command, actor, sample) {
    requireAssignedAnalyst(actor, sample);
    if (sample.tests.some((t) => !t.results.length))
      throw new WorkflowError('Record every requested test before submitting.');
    sample.status = 'In review';
    return 'Submitted all test results for independent review.';
  },

  review(command, actor, sample) {
    requireRole(actor, 'reviewer');
    if (sample.status !== 'In review')
      throw new WorkflowError('Only submitted samples can be reviewed.');
    // Dynamic separation of duties: whoever recorded any result on this sample
    // may not be the second person who reviews it.
    if (sample.tests.some((t) => t.results.some((r) => r.analyst === actor.id)))
      throw new WorkflowError(
        'An analyst cannot review their own results.',
        403,
      );
    // Scans every result, not the latest: a later passing revision must never
    // erase an earlier out-of-specification flag.
    if (command.decision === 'approve' && hasException(sample))
      throw new WorkflowError(
        'Current or historical out-of-specification results need investigation. Routine approval is blocked.',
      );
    sample.status = command.decision === 'approve' ? 'Approved' : 'Returned';
    return `${command.decision === 'approve' ? 'Approved' : 'Returned for correction'}: ${command.comment}`;
  },
};

export class Laboratory {
  private db: DatabaseSync;
  constructor(
    path: string,
    private clock = () => new Date().toISOString(),
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS samples (id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY, sampleId TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, detail TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (commandId BLOB PRIMARY KEY, actorId TEXT NOT NULL, commandType TEXT NOT NULL, fingerprint BLOB NOT NULL, receivedAt TEXT NOT NULL) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS commandReplays (id INTEGER PRIMARY KEY, commandId BLOB NOT NULL REFERENCES commands(commandId), at TEXT NOT NULL, actorId TEXT NOT NULL);`);
    // Additive and idempotent: #46 put commandId on every stream, and the
    // replay path resolves a command's subject through it.
    const activityColumns = this.db
      .prepare('PRAGMA table_info(activity)')
      .all() as { name: string }[];
    if (!activityColumns.some((c) => c.name === 'commandId'))
      this.db.exec('ALTER TABLE activity ADD COLUMN commandId BLOB');
    this.db.exec(
      'CREATE INDEX IF NOT EXISTS idx_activity_commandId ON activity(commandId)',
    );
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
      samples: (
        this.db
          .prepare('SELECT document FROM samples ORDER BY id DESC')
          .all() as { document: string }[]
      ).map((r) => JSON.parse(r.document)),
      activity: this.db
        .prepare(
          'SELECT id, sampleId, action, actor, at, detail FROM activity ORDER BY id DESC',
        )
        .all() as Activity[],
      people,
      methods,
    };
  }

  /**
   * The single entry point, and the only place that opens a transaction.
   * It resolves the actor, validates the command, loads and guards the subject,
   * dispatches to exactly one handler, and writes the sample and its activity
   * row together. Nothing below this method may call BEGIN.
   */
  execute(input: unknown, actorId: string): CommandOutcome {
    const actor = people.find((p) => p.id === actorId);
    if (!actor) throw new WorkflowError('Choose a demo user.', 403);
    const parsed = commandSchema.safeParse(input);
    if (!parsed.success)
      throw new WorkflowError(
        parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      );
    const command = parsed.data;
    const key = keyOf(command.commandId);
    const fingerprint = fingerprintOf(command);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const context: Context = {
        at: this.clock(),
        nextSequence: () => this.nextSequence(),
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
      let sample: Sample;
      let detail: string;
      if (command.type === 'receive') {
        ({ sample, detail } = receive(command, actor, context));
      } else {
        sample = this.load(command.sampleId);
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
        const handler = mutating[command.type] as MutatingHandler<MutatingType>;
        detail = handler(command, actor, sample, context);
        sample.revision++;
      }
      this.persist(sample, command.type, actor, context.at, detail, key);
      this.db.exec('COMMIT');
      return { outcome: 'applied', sample };
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
        'SELECT actorId, fingerprint, receivedAt FROM commands WHERE commandId=?',
      )
      .get(key) as {
      actorId: string;
      fingerprint: Uint8Array;
      receivedAt: string;
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
    const row = this.db
      .prepare('SELECT sampleId FROM activity WHERE commandId=? LIMIT 1')
      .get(key) as { sampleId: string } | undefined;
    if (!row)
      throw new WorkflowError(
        'That change is still being applied. Reload the workspace before trying again.',
        409,
      );
    this.db
      .prepare(
        'INSERT INTO commandReplays (commandId, at, actorId) VALUES (?, ?, ?)',
      )
      .run(key, at, actor.id);
    return {
      outcome: 'replayed',
      sample: this.load(row.sampleId),
      originallyAppliedAt: original.receivedAt,
      originalActorId: original.actorId,
    };
  }

  private load(sampleId: string): Sample {
    const row = this.db
      .prepare('SELECT document FROM samples WHERE id=?')
      .get(sampleId) as { document: string } | undefined;
    if (!row) throw new WorkflowError('Sample not found.', 404);
    return JSON.parse(row.document);
  }

  private nextSequence(): number {
    const { n } = this.db
      .prepare('SELECT COUNT(*) AS n FROM samples')
      .get() as { n: number };
    return Number(n) + 1;
  }

  private persist(
    sample: Sample,
    action: Command['type'],
    actor: Actor,
    at: string,
    detail: string,
    commandId: Uint8Array,
  ) {
    this.db
      .prepare(
        'INSERT INTO samples (id, document) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET document=excluded.document',
      )
      .run(sample.id, JSON.stringify(sample));
    this.db
      .prepare(
        'INSERT INTO activity (sampleId, action, actor, at, detail, commandId) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(sample.id, action, actor.id, at, detail, commandId);
  }
}
