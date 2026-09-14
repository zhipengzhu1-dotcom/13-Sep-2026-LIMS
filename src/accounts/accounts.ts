import { DatabaseSync } from 'node:sqlite';
import type {
  AccessEventLog,
  SignerCredentials,
} from '../laboratory/laboratory.ts';
import type {
  PasswordSetReason,
  Person,
  Role,
} from '../laboratory/contracts.ts';
import { WorkflowError } from '../laboratory/workflow-error.ts';
import {
  accountCommandSchema,
  issuedAccountSchema,
  leavesNoActiveAdmin,
  ownPasswordSchema,
  NO_ACTIVE_ADMIN_LEFT,
  ONE_TIME_PASSWORD_HOURS,
  PASSWORD_AGING_DAYS,
  type AccountCommand,
  type AccountSummary,
} from './account-contracts.ts';
import {
  generateOneTimePassword,
  hashPassword,
  verifyPassword,
  verifyPasswordSync,
} from './passwords.ts';

/** What the rest of the system may know about a signed-in person. The
 * password hash never leaves this module. */
export type User = { id: string; name: string; role: string };

export type SeedAccount = User & { password: string };

/** Consecutive Failed attempts, at sign-in and signing together, that lock an
 * account (ADR-0009), as the lab's policy decided (SOP-Management#19);
 * changing it is a release under change control. */
export const LOCKOUT_LIMIT = 5;

const HOUR_MS = 60 * 60 * 1000;

/** Compared against when the username is unknown, so a miss costs the same
 * scrypt work as a wrong password and does not reveal which accounts exist. */
const DECOY_HASH = hashPassword('decoy-password-never-matches');

/** The longest typed username recorded as typed; a longer one is recorded
 * cut to this length and marked, so scripted guessing can't bloat the trail. */
const TYPED_USERNAME_LIMIT = 100;
const recordable = (typed: string) =>
  typed.length > TYPED_USERNAME_LIMIT
    ? `${typed.slice(0, TYPED_USERNAME_LIMIT)}…`
    : typed;

type Credentials = {
  id: string;
  active: number;
  passwordHash: string;
  oneTimePassword: number;
  /** Server time the password was set; null for one set before this was
   * recorded, which counts as expired. */
  passwordSetAt: string | null;
};

/** Whether a right password may be used: a password of the user's own that
 * is still good, one past its aging period, a One-time password, which only
 * sets a new one, or a One-time password past its time, which does nothing. */
type PasswordState =
  'good' | 'expired' | 'oneTimePassword' | 'oneTimePasswordExpired';

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
  /** The server time, as an ISO string. */
  clock?: () => string;
  /** Usernames whose passwords never expire: the demo seed's, in `demo` mode
   * only. Production passes none. */
  agingExempt?: readonly string[];
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
  private clock: () => string;
  private agingExempt: ReadonlySet<string>;
  /** Lockout notices still being sent. */
  private notices = new Set<Promise<void>>();
  constructor(path: string, options: AccountsOptions = {}) {
    this.lockoutNotice = options.lockoutNotice;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.agingExempt = new Set(options.agingExempt);
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      passwordHash TEXT NOT NULL,
      oneTimePassword INTEGER NOT NULL DEFAULT 0,
      passwordSetAt TEXT);
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
      'INSERT OR IGNORE INTO users (id, name, role, active, passwordHash, passwordSetAt) VALUES (?, ?, ?, 1, ?, ?)',
    );
    for (const a of accounts)
      if (!this.credentials(a.id))
        insert.run(
          a.id,
          a.name,
          a.role,
          hashPassword(a.password),
          this.clock(),
        );
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
      .prepare(
        'UPDATE users SET passwordHash = ?, passwordSetAt = ? WHERE id = ?',
      )
      .run(hashPassword(password), this.clock(), username);
    log.recordAccessEvent({ type: 'passwordSet', by, username });
  }

  /**
   * A new account the System administrator issues under its approved change
   * record (ADR-0009), starting with a One-time password. Returns that
   * password, the only time it exists outside its hash.
   */
  issueAccount(
    account: { username: string; name: string; role: string },
    by: string,
    reference: string,
    log: AccessEventLog,
  ): string {
    const parsed = issuedAccountSchema.safeParse(account);
    if (!parsed.success)
      throw new WorkflowError(
        parsed.error.issues.map((issue) => issue.message).join(' '),
      );
    const { username, name, role } = parsed.data;
    const oneTimePassword = generateOneTimePassword();
    this.insertAccount(
      { username, name, role, password: oneTimePassword },
      true,
    );
    log.recordAccessEvent({
      type: 'accountAdded',
      by,
      username,
      name,
      role,
      reference,
    });
    log.recordAccessEvent({
      type: 'oneTimePasswordIssued',
      by,
      username,
      reference,
    });
    return oneTimePassword;
  }

  /**
   * The System administrator's unlock under its approved Form (ADR-0009): the
   * account's password becomes a new One-time password, returned the only
   * time it exists outside its hash, so whoever locked it cannot simply carry
   * on guessing the old one.
   */
  unlockWithOneTimePassword(
    username: string,
    by: string,
    reference: string,
    log: AccessEventLog,
  ): string {
    const account = this.account(username);
    if (!account.locked)
      throw new WorkflowError(
        `${account.name} is not locked. Nothing was changed.`,
        409,
      );
    let oneTimePassword: string;
    // Both at once, so an unlocked account never keeps its old password.
    // The Access events are written after, through the audit trail's own
    // connection, which would wait on this transaction's lock.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare(
          'UPDATE accessState SET locked = 0, failedAttempts = 0 WHERE username = ?',
        )
        .run(username);
      oneTimePassword = this.replaceWithOneTimePassword(username);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    log.recordAccessEvent({
      type: 'unlock',
      by,
      username,
      clearedFailedAttempts: account.failedAttempts,
      reference,
    });
    log.recordAccessEvent({
      type: 'oneTimePasswordIssued',
      by,
      username,
      reference,
    });
    return oneTimePassword;
  }

  /** The demo server command's unlock, for a lone Admin locked out, named as
   * the System administrator who ran it (ADR-0011). */
  unlockByServerCommand(username: string, by: string, log: AccessEventLog) {
    this.unlockAccount({ type: 'unlockAccount', username }, by, log);
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
    this.insertAccount({ username, name, role, password }, false);
    log.recordAccessEvent({ type: 'accountAdded', by, username, name, role });
  }

  /** A new, active account, its password hashed and marked one-time or not. */
  private insertAccount(
    account: { username: string; name: string; role: string; password: string },
    oneTimePassword: boolean,
  ) {
    const { username, name, role, password } = account;
    // A username is never reused, deactivated or not.
    if (this.credentials(username))
      throw new WorkflowError(
        `The username ${username} is already taken.`,
        409,
      );
    this.db
      .prepare(
        'INSERT INTO users (id, name, role, active, passwordHash, oneTimePassword, passwordSetAt) VALUES (?, ?, ?, 1, ?, ?, ?)',
      )
      .run(
        username,
        name,
        role,
        hashPassword(password),
        oneTimePassword ? 1 : 0,
        this.clock(),
      );
    // Failed attempts typed under this username before it was an account
    // stay in the audit trail; the new account starts unlocked.
    this.db.prepare('DELETE FROM accessState WHERE username = ?').run(username);
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
    if (leavesNoActiveAdmin(accounts, username, after))
      throw new WorkflowError(NO_ACTIVE_ADMIN_LEFT, 409);
    this.db
      .prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?')
      .run(after.name, after.role, after.active ? 1 : 0, username);
    log.recordAccessEvent({ type: 'accountChanged', by, username, changes });
  }

  /** An active user by ID who is not locked and has a password of their own
   * that has not expired, or null. Every session of a Locked account, or of
   * one whose password expired, is refused on its next request. */
  find(id: string): User | null {
    const row = this.db
      .prepare(
        `SELECT id, name, role FROM users WHERE id = ? AND active = 1
         AND NOT EXISTS (SELECT 1 FROM accessState WHERE username = id AND locked = 1)`,
      )
      .get(id) as User | undefined;
    const credentials = this.credentials(id);
    if (!row || !credentials || this.passwordState(credentials) !== 'good')
      return null;
    return { id: row.id, name: row.name, role: row.role };
  }

  /** What a right password may be used for, at the server's time now. */
  private passwordState(row: Credentials): PasswordState {
    const age =
      row.passwordSetAt === null
        ? Infinity
        : Date.parse(this.clock()) - Date.parse(row.passwordSetAt);
    if (row.oneTimePassword)
      return age < ONE_TIME_PASSWORD_HOURS * HOUR_MS
        ? 'oneTimePassword'
        : 'oneTimePasswordExpired';
    if (this.agingExempt.has(row.id)) return 'good';
    return age < PASSWORD_AGING_DAYS * 24 * HOUR_MS ? 'good' : 'expired';
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
    /** The password is right but one-time: it only sets a new one. */
    | { outcome: 'oneTimePassword' }
    /** The password is right but past its aging period: it only sets a new
     * one. The account is not locked. */
    | { outcome: 'expired' }
    /** The One-time password is right but past its time: only a new one from
     * the System administrator lets the user in. */
    | { outcome: 'oneTimePasswordExpired' }
  > {
    const row = await this.passwordOf(
      username,
      password,
      'Wrong password at sign-in',
      log,
    );
    if ('outcome' in row) return row;
    const state = this.passwordState(row);
    if (state !== 'good') return { outcome: state };
    return this.signedIn(row.id, log);
  }

  /**
   * The unlocked, active account this password belongs to, or the refusal. A
   * wrong password or an unknown username is a Failed attempt, recorded with
   * `reason`; a miss costs the same scrypt work as a wrong password.
   */
  private async passwordOf(
    username: string,
    password: string,
    reason: string,
    log: AccessEventLog,
  ): Promise<Credentials | { outcome: 'incorrect' } | { outcome: 'locked' }> {
    const row = this.credentials(username);
    const matches = await verifyPassword(
      password,
      row?.passwordHash ?? DECOY_HASH,
    );
    if (!row?.active || !matches)
      return this.recordFailedAttempt(username, reason, log)
        ? { outcome: 'locked' }
        : { outcome: 'incorrect' };
    if (this.isLocked(row.id)) return { outcome: 'locked' };
    return row;
  }

  /**
   * Replaces a One-time password, or a password past its aging period, with
   * a new password of the user's own, which then signs them in (ADR-0009).
   * The new password is checked before the current one, so a refusal never
   * tells whether it was right; a wrong current password is a Failed attempt.
   */
  async replaceExpiredPassword(
    username: string,
    current: string,
    newPassword: string,
    log: AccessEventLog,
  ): ReturnType<Accounts['signIn']> {
    this.checkNewPassword(current, newPassword);
    const row = await this.passwordOf(
      username,
      current,
      'Wrong current password when setting a new password',
      log,
    );
    if ('outcome' in row) return row;
    const state = this.passwordState(row);
    if (state === 'oneTimePasswordExpired') return { outcome: state };
    if (state === 'good')
      throw new WorkflowError(
        `The password of ${this.find(row.id)?.name ?? row.id} has not expired, so there is nothing to replace. Sign in and change it there.`,
        409,
      );
    this.setOwnPassword(
      row.id,
      newPassword,
      state === 'oneTimePassword'
        ? 'Replaced a One-time password'
        : 'Replaced an expired password',
      log,
    );
    return this.signedIn(row.id, log);
  }

  /**
   * A signed-in user's change of their own password, at any time, with the
   * current one (§11.300(c)). It is not an account change (ADR-0007). A wrong
   * current password is a Failed attempt, so a taken-over session cannot
   * guess on past the lockout (ADR-0009).
   */
  async changePassword(
    userId: string,
    current: string,
    newPassword: string,
    log: AccessEventLog,
  ): Promise<'changed' | 'incorrect' | 'locked'> {
    this.checkNewPassword(current, newPassword);
    const row = await this.passwordOf(
      userId,
      current,
      'Wrong current password when changing the password',
      log,
    );
    if ('outcome' in row) return row.outcome;
    this.resetFailedAttempts(row.id);
    this.setOwnPassword(row.id, newPassword, 'Changed by the user', log);
    return 'changed';
  }

  /**
   * A new One-time password the System administrator issues under its
   * approved Form for an active account that is not locked: its One-time
   * password expired, or its password was lost or compromised
   * (§11.300(c)). Returns it, the only time it exists outside its hash.
   */
  issueOneTimePassword(
    username: string,
    by: string,
    reference: string,
    log: AccessEventLog,
  ): string {
    const account = this.account(username);
    if (account.locked)
      throw new WorkflowError(
        `${account.name} is locked. Unlock it under its Form, which issues a One-time password. Nothing was changed.`,
        409,
      );
    if (!account.active)
      throw new WorkflowError(
        `${account.name} is deactivated. Nothing was changed.`,
        409,
      );
    const oneTimePassword = this.replaceWithOneTimePassword(username);
    log.recordAccessEvent({
      type: 'oneTimePasswordIssued',
      by,
      username,
      reference,
    });
    return oneTimePassword;
  }

  /** Replaces an account's password with a new One-time password, usable for
   * its hours from now, and returns it. */
  private replaceWithOneTimePassword(username: string): string {
    const oneTimePassword = generateOneTimePassword();
    this.db
      .prepare(
        'UPDATE users SET passwordHash = ?, oneTimePassword = 1, passwordSetAt = ? WHERE id = ?',
      )
      .run(hashPassword(oneTimePassword), this.clock(), username);
    return oneTimePassword;
  }

  /** Refuses a new password that breaks the lab's rules (SOP-Management#19):
   * too short, or the same as the current one. */
  private checkNewPassword(current: string, newPassword: string) {
    const rule = ownPasswordSchema.safeParse(newPassword);
    if (!rule.success)
      throw new WorkflowError(
        rule.error.issues.map((issue) => issue.message).join(' '),
      );
    if (newPassword === current)
      throw new WorkflowError(
        'Choose a new password, different from the current one.',
      );
  }

  /** A password the user chose, good for the aging period from now, recorded
   * with why it was set. */
  private setOwnPassword(
    username: string,
    password: string,
    reason: PasswordSetReason,
    log: AccessEventLog,
  ) {
    this.db
      .prepare(
        'UPDATE users SET passwordHash = ?, oneTimePassword = 0, passwordSetAt = ? WHERE id = ?',
      )
      .run(hashPassword(password), this.clock(), username);
    log.recordAccessEvent({
      type: 'passwordSet',
      by: username,
      username,
      reason,
    });
  }

  /** A successful sign-in, which clears the consecutive Failed attempts. */
  private signedIn(
    id: string,
    log: AccessEventLog,
  ): { outcome: 'signedIn'; user: User } {
    log.recordAccessEvent({
      type: 'signIn',
      username: id,
      clearedFailedAttempts: this.resetFailedAttempts(id),
    });
    return { outcome: 'signedIn', user: this.find(id)! };
  }

  /** Whether this is the active user's own password, for an Electronic
   * signature; anything else, a One-time password included, is a Failed
   * attempt, recorded through `log`. An unknown or inactive user costs the
   * same work and never matches. A right password past its aging period
   * signs nothing, but is no Failed attempt. */
  verifySigner(
    userId: string,
    password: string,
    log: AccessEventLog,
    attempt: string,
  ): 'verified' | 'incorrect' | 'locked' | 'expired' {
    const row = this.credentials(userId);
    const matches = verifyPasswordSync(
      password,
      row?.passwordHash ?? DECOY_HASH,
    );
    if (!row?.active || !matches || row.oneTimePassword)
      return this.recordFailedAttempt(userId, attempt, log)
        ? 'locked'
        : 'incorrect';
    if (this.isLocked(userId)) return 'locked';
    if (this.passwordState(row) === 'expired') return 'expired';
    this.resetFailedAttempts(userId);
    return 'verified';
  }

  private credentials(id: string): Credentials | null {
    return (
      (this.db
        .prepare(
          'SELECT id, active, passwordHash, oneTimePassword, passwordSetAt FROM users WHERE id = ?',
        )
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
    typed: string,
    reason: string,
    log: AccessEventLog,
  ): boolean {
    const username = recordable(typed);
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
