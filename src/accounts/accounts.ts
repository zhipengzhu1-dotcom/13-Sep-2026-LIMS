import { DatabaseSync } from 'node:sqlite';
import type {
  AccessEventLog,
  SignerCredentials,
} from '../laboratory/laboratory.ts';
import type { Person, Role } from '../laboratory/contracts.ts';
import { WorkflowError } from '../laboratory/workflow-error.ts';
import {
  accountCommandSchema,
  type AccountCommand,
  type AccountSummary,
} from './account-contracts.ts';
import {
  hashPassword,
  verifyPassword,
  verifyPasswordSync,
} from './passwords.ts';

/** What the rest of the system may know about a signed-in person. The
 * password hash never leaves this module. */
export type User = { id: string; name: string; role: string };

export type SeedAccount = User & { password: string };

/** Consecutive Failed attempts, at sign-in and signing together, that lock an
 * account (ADR-0009). Set by the lab's policy (SOP-Management#19, to be
 * confirmed before Go-live); changing it is a release under change control. */
export const LOCKOUT_LIMIT = 5;

/** Compared against when the username is unknown, so a miss costs the same
 * scrypt work as a wrong password and does not reveal which accounts exist. */
const DECOY_HASH = hashPassword('decoy-password-never-matches');

type Credentials = { id: string; active: number; passwordHash: string };

/** One outbound email. */
export type Mail = { to: readonly string[]; subject: string; text: string };

/** The outbound mail boundary; `send` rejects when the mail was not sent. */
export type MailTransport = { send(mail: Mail): Promise<void> };

export type AccountsOptions = {
  /** Who is told of a lockout at once, and how (§11.300(d), ADR-0009).
   * Absent, every lockout notice is recorded as not sent. */
  lockoutNotice?: {
    systemAdministrator: string;
    qualityLead: string;
    transport: MailTransport;
  };
};

/**
 * Lab user accounts: ID (also the sign-in username), printed name, role,
 * active flag and a salted scrypt password hash, with each typed username's
 * consecutive Failed attempts and whether it is locked. Accounts are seeded,
 * and before Go-live the Admin manages them (ADR-0011).
 */
export class Accounts implements SignerCredentials {
  private db: DatabaseSync;
  private lockoutNotice: AccountsOptions['lockoutNotice'];
  /** Lockout notices still being sent. */
  private notices = new Set<Promise<void>>();
  constructor(path: string, options: AccountsOptions = {}) {
    this.lockoutNotice = options.lockoutNotice;
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      passwordHash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS accessState (
      username TEXT PRIMARY KEY,
      failedAttempts INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID`);
  }

  close() {
    this.db.close();
  }

  /** Resolves once every lockout notice under way is sent or recorded as
   * failed; a shutdown waits for it. */
  async noticesSettled() {
    await Promise.all(this.notices);
  }

  /** Adds accounts that do not exist yet; existing accounts are left alone. */
  seed(accounts: readonly SeedAccount[]) {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO users (id, name, role, active, passwordHash) VALUES (?, ?, ?, 1, ?)',
    );
    for (const a of accounts)
      if (!this.credentials(a.id))
        insert.run(a.id, a.name, a.role, hashPassword(a.password));
  }

  /** Every user, in the order they were added, deactivated ones included so
   * the record still names who did what. */
  people(): Person[] {
    return (
      this.db
        .prepare('SELECT id, name, role, active FROM users ORDER BY rowid')
        .all() as { id: string; name: string; role: Role; active: number }[]
    ).map(({ id, name, role, active }) => ({
      id,
      name,
      role,
      active: Boolean(active),
    }));
  }

  /** Every account with its status, for the Admin alone. */
  accountsFor(by: string): AccountSummary[] {
    this.requireAdmin(by);
    return this.list();
  }

  private requireAdmin(by: string) {
    if (this.find(by)?.role !== 'admin')
      throw new WorkflowError('Only the Admin manages accounts.', 403);
  }

  /** Every account with its status. */
  private list(): AccountSummary[] {
    return (
      this.db
        .prepare(
          `SELECT u.id, u.name, u.role, u.active,
             COALESCE(a.locked, 0) AS locked,
             COALESCE(a.failedAttempts, 0) AS failedAttempts
           FROM users u LEFT JOIN accessState a ON a.username = u.id
           ORDER BY u.rowid`,
        )
        .all() as {
        id: string;
        name: string;
        role: Role;
        active: number;
        locked: number;
        failedAttempts: number;
      }[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      active: Boolean(row.active),
      locked: Boolean(row.locked),
      failedAttempts: Number(row.failedAttempts),
    }));
  }

  /**
   * An account change by the Admin, recorded through `log` as an Access
   * event. Before Go-live only (ADR-0007); returns every account afterwards.
   */
  administer(
    input: unknown,
    by: string,
    log: AccessEventLog,
  ): AccountSummary[] {
    this.requireAdmin(by);
    const parsed = accountCommandSchema.safeParse(input);
    if (!parsed.success)
      throw new WorkflowError(
        parsed.error.issues.map((issue) => issue.message).join(' '),
      );
    const command = parsed.data;
    switch (command.type) {
      case 'addAccount':
        this.addAccount(command, by, log);
        break;
      case 'updateAccount':
        this.updateAccount(command, by, log);
        break;
      case 'setPassword':
        this.setPassword(command, by, log);
        break;
      case 'unlockAccount':
        this.unlockAccount(command, by, log);
    }
    return this.list();
  }

  /** The account a change names, or a refusal naming the username. */
  private account(username: string): AccountSummary {
    const account = this.list().find((a) => a.id === username);
    if (!account)
      throw new WorkflowError(`There is no account ${username}.`, 404);
    return account;
  }

  /** A new password the Admin typed, usable at the next sign-in. */
  private setPassword(
    { username, password }: Extract<AccountCommand, { type: 'setPassword' }>,
    by: string,
    log: AccessEventLog,
  ) {
    this.account(username);
    this.db
      .prepare('UPDATE users SET passwordHash = ? WHERE id = ?')
      .run(hashPassword(password), username);
    log.recordAccessEvent({ type: 'passwordSet', by, username });
  }

  /** Lets a Locked account back in. Its Failed attempts and lockout stay in
   * the audit trail; only the count is cleared. */
  private unlockAccount(
    { username }: Extract<AccountCommand, { type: 'unlockAccount' }>,
    by: string,
    log: AccessEventLog,
  ) {
    const account = this.account(username);
    if (!account.locked)
      throw new WorkflowError(`${account.name} is not locked.`, 409);
    this.db
      .prepare(
        'UPDATE accessState SET locked = 0, failedAttempts = 0 WHERE username = ?',
      )
      .run(username);
    log.recordAccessEvent({
      type: 'unlock',
      by,
      username,
      clearedFailedAttempts: account.failedAttempts,
    });
  }

  private addAccount(
    {
      username,
      name,
      role,
      password,
    }: Extract<AccountCommand, { type: 'addAccount' }>,
    by: string,
    log: AccessEventLog,
  ) {
    // A username is never reused, deactivated or not.
    if (this.credentials(username))
      throw new WorkflowError(
        `The username ${username} is already taken.`,
        409,
      );
    this.db
      .prepare(
        'INSERT INTO users (id, name, role, active, passwordHash) VALUES (?, ?, ?, 1, ?)',
      )
      .run(username, name, role, hashPassword(password));
    // Failed attempts typed under this username before it was an account
    // stay in the audit trail; the new account starts unlocked.
    this.db.prepare('DELETE FROM accessState WHERE username = ?').run(username);
    log.recordAccessEvent({ type: 'accountAdded', by, username, name, role });
  }

  /** Changes a printed name or role, or deactivates or reactivates, never
   * leaving Benchline without an Admin who can act. */
  private updateAccount(
    { username, ...next }: Extract<AccountCommand, { type: 'updateAccount' }>,
    by: string,
    log: AccessEventLog,
  ) {
    const accounts = this.list();
    const current = this.account(username);
    const after = {
      name: next.name ?? current.name,
      role: next.role ?? current.role,
      active: next.active ?? current.active,
    };
    const changes = (['name', 'role', 'active'] as const)
      .filter((field) => after[field] !== current[field])
      .map((field) => ({ field, from: current[field], to: after[field] }));
    if (!changes.length) throw new WorkflowError('Nothing to change.');
    const admins = accounts
      .map((a) => (a.id === username ? { ...a, ...after } : a))
      .filter((a) => a.role === 'admin' && a.active && !a.locked);
    if (!admins.length)
      throw new WorkflowError(
        'Benchline needs at least one active Admin, so this change was not saved.',
        409,
      );
    this.db
      .prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?')
      .run(after.name, after.role, after.active ? 1 : 0, username);
    log.recordAccessEvent({ type: 'accountChanged', by, username, changes });
  }

  /** An active user by ID who is not locked, or null. Every session of a
   * Locked account is refused on its next request. */
  find(id: string): User | null {
    const row = this.db
      .prepare(
        `SELECT id, name, role FROM users WHERE id = ? AND active = 1
         AND NOT EXISTS (SELECT 1 FROM accessState WHERE username = id AND locked = 1)`,
      )
      .get(id) as User | undefined;
    return row ? { id: row.id, name: row.name, role: row.role } : null;
  }

  /**
   * A sign-in attempt. A wrong password, or an unknown username, is a Failed
   * attempt, recorded through `log` with the username that was typed. A
   * Locked username is refused whatever the password, so guessing on past the
   * lock learns nothing.
   */
  async signIn(
    username: string,
    password: string,
    log: AccessEventLog,
  ): Promise<
    | { outcome: 'signedIn'; user: User }
    | { outcome: 'incorrect' }
    | { outcome: 'locked' }
  > {
    const row = this.credentials(username);
    const matches = await verifyPassword(
      password,
      row?.passwordHash ?? DECOY_HASH,
    );
    if (!row?.active || !matches)
      return this.recordFailedAttempt(
        username,
        'Wrong password at sign-in',
        log,
      )
        ? { outcome: 'locked' }
        : { outcome: 'incorrect' };
    if (this.isLocked(row.id)) return { outcome: 'locked' };
    log.recordAccessEvent({
      type: 'signIn',
      username: row.id,
      clearedFailedAttempts: this.resetFailedAttempts(row.id),
    });
    return { outcome: 'signedIn', user: this.find(row.id)! };
  }

  /** Whether this is the active user's own password, for an Electronic
   * signature; anything else is a Failed attempt, recorded through `log`. An
   * unknown or inactive user costs the same work and never matches. */
  verifySigner(
    userId: string,
    password: string,
    log: AccessEventLog,
    attempt: string,
  ): 'verified' | 'incorrect' | 'locked' {
    const row = this.credentials(userId);
    const matches = verifyPasswordSync(
      password,
      row?.passwordHash ?? DECOY_HASH,
    );
    if (!row?.active || !matches)
      return this.recordFailedAttempt(userId, attempt, log)
        ? 'locked'
        : 'incorrect';
    if (this.isLocked(userId)) return 'locked';
    this.resetFailedAttempts(userId);
    return 'verified';
  }

  private credentials(id: string): Credentials | null {
    return (
      (this.db
        .prepare('SELECT id, active, passwordHash FROM users WHERE id = ?')
        .get(id) as Credentials | undefined) ?? null
    );
  }

  private isLocked(username: string) {
    return Boolean(
      this.db
        .prepare('SELECT 1 FROM accessState WHERE username = ? AND locked = 1')
        .get(username),
    );
  }

  /** Clears the count after a success, returning what it was. A Locked
   * account never unlocks itself. */
  private resetFailedAttempts(username: string): number {
    const row = this.db
      .prepare('SELECT failedAttempts FROM accessState WHERE username = ?')
      .get(username) as { failedAttempts: number } | undefined;
    this.db
      .prepare('UPDATE accessState SET failedAttempts = 0 WHERE username = ?')
      .run(username);
    return Number(row?.failedAttempts ?? 0);
  }

  /** Counts and records a Failed attempt, locking the username when it
   * reaches the limit. Returns whether the username is now locked. */
  private recordFailedAttempt(
    username: string,
    reason: string,
    log: AccessEventLog,
  ): boolean {
    const { failedAttempts, locked } = this.db
      .prepare(
        `INSERT INTO accessState (username, failedAttempts) VALUES (?, 1)
         ON CONFLICT(username) DO UPDATE SET failedAttempts = failedAttempts + 1
         RETURNING failedAttempts, locked`,
      )
      .get(username) as { failedAttempts: number; locked: number };
    const consecutive = Number(failedAttempts);
    log.recordAccessEvent({
      type: 'failedAttempt',
      username,
      consecutive,
      reason,
    });
    if (locked) return true;
    if (consecutive < LOCKOUT_LIMIT) return false;
    this.db
      .prepare('UPDATE accessState SET locked = 1 WHERE username = ?')
      .run(username);
    log.recordAccessEvent({ type: 'lockout', username, consecutive });
    this.notifyLockout(username, consecutive, log);
    return true;
  }

  /** Emails the lockout notice without holding up the refusal, then records
   * whether it was sent. A failure never unlocks the account. */
  private notifyLockout(
    username: string,
    consecutive: number,
    log: AccessEventLog,
  ) {
    const notice = this.lockoutNotice;
    if (!notice) {
      log.recordAccessEvent({
        type: 'lockoutNotice',
        username,
        sent: false,
        reason:
          'No outbound mail is configured, so the lockout notice was not sent.',
      });
      return;
    }
    const to = [notice.systemAdministrator, notice.qualityLead];
    const sending = notice.transport
      .send({
        to,
        subject: `Benchline: account ${username} is locked`,
        text: [
          `The account ${username} was locked after ${consecutive} consecutive Failed attempts at sign-in or signing.`,
          'It stays locked until the System administrator unlocks it. Review its Access events in the audit trail and assess whether this was an attempted misuse.',
        ].join('\n\n'),
      })
      .then(
        () =>
          log.recordAccessEvent({
            type: 'lockoutNotice',
            username,
            sent: true,
            reason: `Emailed to ${to.join(', ')}`,
          }),
        (error: unknown) =>
          log.recordAccessEvent({
            type: 'lockoutNotice',
            username,
            sent: false,
            reason: `Email to ${to.join(', ')} failed: ${error instanceof Error ? error.message : String(error)}`,
          }),
      )
      // The lock holds either way; an outcome that cannot be recorded is at
      // least reported where the System administrator reads the server log.
      .catch((error: unknown) =>
        console.error(
          `The lockout notice for ${username} could not be recorded.`,
          error,
        ),
      )
      .finally(() => this.notices.delete(sending));
    this.notices.add(sending);
  }
}
