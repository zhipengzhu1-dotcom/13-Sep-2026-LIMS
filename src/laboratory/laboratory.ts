import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  analytes,
  clients,
  commandSchema,
  limitInForce,
  type AcceptableIntake,
  type Person,
  methods,
  newCommandId,
  people,
  signatureMeaning,
  signatureMeanings,
  type Actor,
  type AuditEntry,
  type Command,
  type CommandOutcome,
  type Method,
  type Sample,
  type Signature,
  type SigningCommandType,
  type Snapshot,
  type Submission,
} from './contracts.ts';
import { AuditTrail, auditRecord } from './audit.ts';
import { type Certificate } from './certificate.ts';
import type { Attachment } from './attachment-contracts.ts';
import {
  AttachmentRejected,
  AttachmentStore,
  type Upload,
} from './attachments.ts';
import { WorkflowError, requireRole } from './workflow-error.ts';
import { AcceptableIntakeStore } from './reference-data.ts';
import { CertificateStore } from './certificate-store.ts';
import { SignatureStore } from './signature-store.ts';
import {
  appendAcceptableIntake,
  locks,
  receiveSubmission,
  sampleHandlers,
  type Context,
  type SampleCommandType,
  type SampleHandler,
  type Series,
} from './handlers.ts';

export { WorkflowError } from './workflow-error.ts';

/** The schema this build expects. A migration runner advances it; this module never does. */
export const SCHEMA_VERSION = 16;

/**
 * Verifies a signer's password against their stored hash. The accounts store
 * implements it; the core asks it once per signing command, inside the command.
 */
export interface SignerCredentials {
  checkPassword(userId: string, password: string): boolean;
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

export type LaboratoryOptions = {
  /** The server time; defaults to the system clock. */
  clock?: () => string;
  /** Verifies signers' passwords. Absent, every Electronic signature is refused. */
  credentials?: SignerCredentials | null;
  /** The Method reference data in force; defaults to the seeded Methods. */
  methods?: readonly Method[];
  /** The user directory in force; defaults to the seeded people. A person's
   * role may change over time, while the record keeps what they did. */
  people?: readonly Person[];
};

/** The Submission and Samples a command acted on, kept with its key so a
 * replay returns the same subjects. */
type Subject = { submissionId: string | null; sampleIds: string[] };

export class Laboratory {
  private db: DatabaseSync;
  private audit: AuditTrail;
  private attachments: AttachmentStore;
  private acceptableIntakeStore: AcceptableIntakeStore;
  private certificateStore: CertificateStore;
  private signatureStore: SignatureStore;
  private clock: () => string;
  /** Absent, every Electronic signature is refused. */
  private credentials: SignerCredentials | null;
  /** Seeded Method reference data; replaceable so rules over it can be exercised. */
  private methods: readonly Method[];
  private people: readonly Person[];
  constructor(path: string, options: LaboratoryOptions = {}) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.credentials = options.credentials ?? null;
    this.methods = options.methods ?? methods;
    this.people = options.people ?? people;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS samples (id TEXT PRIMARY KEY, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sequences (series TEXT NOT NULL, year INTEGER NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (series, year)) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS commands (commandId BLOB PRIMARY KEY, actorId TEXT NOT NULL, commandType TEXT NOT NULL, fingerprint BLOB NOT NULL, receivedAt TEXT NOT NULL, subject TEXT) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS commandReplays (id INTEGER PRIMARY KEY, commandId BLOB NOT NULL REFERENCES commands(commandId), at TEXT NOT NULL, actorId TEXT NOT NULL);`);
    this.acceptableIntakeStore = new AcceptableIntakeStore(this.db);
    this.certificateStore = new CertificateStore(this.db);
    this.signatureStore = new SignatureStore(this.db);
    // Stamp the schema version only on a database that has none. A migration
    // runner owns this value afterwards; overwriting it here would silently
    // undo a migration and defeat the version gate the runner reads.
    const { user_version: version } = this.db
      .prepare('PRAGMA user_version')
      .get() as { user_version: number };
    if (version === 0) this.db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);
    this.audit = new AuditTrail(this.db);
    this.attachments = new AttachmentStore(this.db);
  }

  close() {
    this.db.close();
  }

  /**
   * Stores a calculation worksheet so a later `enterResult` can reference it.
   * Kept outside `execute`: it creates no laboratory record by itself, and the
   * stored file is immutable, so a retried upload only adds an unused copy.
   * The upload is still on the audit trail, in the same transaction: who
   * stored which file, when, and its SHA-256.
   */
  storeAttachment(upload: Upload, actorId: string): Attachment {
    const actor = this.people.find((p) => p.id === actorId);
    if (!actor) throw new WorkflowError('Unknown user.', 403);
    requireRole(actor, 'analyst');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const at = this.clock();
      const attachment = this.attachments.store(upload, actor.id, at);
      const { filename, contentType, size, sha256 } = attachment;
      this.audit
        .writer({
          actor: actor.id,
          at,
          commandType: 'storeAttachment',
          commandId: newCommandId(),
        })
        .compare(auditRecord.attachment(attachment), null, {
          filename,
          contentType,
          size,
          sha256,
        });
      this.db.exec('COMMIT');
      return attachment;
    } catch (error) {
      this.db.exec('ROLLBACK');
      if (error instanceof AttachmentRejected)
        throw new WorkflowError(error.message, error.status);
      throw error;
    }
  }

  /** An attachment's record and bytes, or null if there is none. */
  readAttachment(id: string) {
    return this.attachments.read(id);
  }

  snapshot(): Snapshot {
    return {
      submissions: this.documents('submissions'),
      samples: this.documents('samples'),
      audit: this.audit.entries(),
      signatures: this.signatureStore.list(),
      attachments: this.attachments.list(),
      people: this.people,
      clients,
      analytes,
      methods: this.methods,
      acceptableIntakes: this.acceptableIntakes(),
      certificates: this.certificateStore.summaries(),
    };
  }

  /**
   * Every Certificate of Analysis version of a Sample, oldest first, each
   * with its locked content and its publication, if any. Empty until the
   * Sample is approved.
   */
  certificates(sampleId: string): Certificate[] {
    this.load(sampleId);
    return this.certificateStore.certificates(sampleId);
  }

  /** One Certificate version of a Sample, or its latest when no version is
   * given. */
  certificate(sampleId: string, version?: number): Certificate {
    const all = this.certificates(sampleId);
    const found =
      version === undefined
        ? all.at(-1)
        : all.find((c) => c.version === version);
    if (!found)
      throw new WorkflowError(
        version === undefined
          ? `Sample ${sampleId} has no Certificate of Analysis yet.`
          : `Sample ${sampleId} has no Certificate of Analysis version ${version}.`,
        404,
      );
    return found;
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
    return this.acceptableIntakeStore.list();
  }

  /**
   * The single entry point, and the only place that opens a transaction.
   * It resolves the actor, validates the command, loads and guards the subject,
   * dispatches to exactly one handler, and writes the records and their
   * audit entries together. Nothing below this method may call BEGIN.
   */
  execute(input: unknown, actorId: string): CommandOutcome {
    const actor = this.people.find((p) => p.id === actorId);
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
        people: this.people,
        history: (sample) => this.audit.entries(sample),
        allocate: (series) => this.allocate(series, at),
        audit,
        limitInForce: (analyteId) =>
          limitInForce(this.acceptableIntakes(), analyteId, at),
        methods: this.methods,
        attachment: (id) => this.attachments.find(id),
        submission: (id) => {
          const found = this.find<Submission>('submissions', id);
          if (!found) throw new Error(`Submission ${id} not found.`);
          return found;
        },
        signatures: (sampleId) => this.signatureStore.list(sampleId),
        certificates: (sampleId) => this.certificateStore.summaries(sampleId),
        issueCertificate: (content) =>
          this.certificateStore.issue(content, key),
        recordPublication: (publication) =>
          this.certificateStore.recordPublication(publication, key),
        appendAcceptableIntake: (entry) =>
          this.acceptableIntakeStore.append([entry])[0],
      };
      // Verified before the key is claimed or a replay answered, so a wrong
      // password applies nothing, is never reported as an earlier success, and
      // rolls back with the key released for resubmission.
      const signing = this.verifySignature(command.type, actor, password);
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
      } else if (command.type === 'appendAcceptableIntake') {
        appendAcceptableIntake(command, actor, context);
        samples = [];
      } else {
        const sample = this.load(command.sampleId);
        if (sample.revision !== command.revision)
          throw new WorkflowError(
            'This sample changed. Refresh the workspace before saving again.',
            409,
          );
        const lock = locks[sample.status];
        if (lock && !lock.allows.includes(command.type))
          throw new WorkflowError(lock.message);
        // One cast, localised here, because TypeScript cannot correlate the
        // narrowed command with the handler selected by its own discriminant.
        // Each handler in the registry is individually typed to its own verb.
        const handler = sampleHandlers[
          command.type
        ] as SampleHandler<SampleCommandType>;
        // A Sample that already has a Certificate is in an Amendment, which
        // some signatures mean differently; decided before Approval issues one.
        const inAmendment =
          this.certificateStore.summaries(sample.id).length > 0;
        handler(command, actor, sample, context);
        sample.revision++;
        this.save('samples', sample.id, sample);
        if (signing)
          this.recordSignature(
            sample.id,
            actor,
            signatureMeaning(signing, inAmendment),
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
   * Whether a command requires an Electronic signature, as the signing command
   * type, once the signer's password matches their stored hash. Anything else
   * rejects the whole command. Every command type listed in
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
    return type as SigningCommandType;
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
    this.signatureStore.record(
      {
        sampleId,
        signerId: signer.id,
        printedName: signer.name,
        signedAt: at,
        meaning,
        command,
      },
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
