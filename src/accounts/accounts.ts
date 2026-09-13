import { DatabaseSync } from 'node:sqlite';
import { hashPassword, verifyPassword } from './passwords.ts';

/** What the rest of the system may know about a signed-in person. The
 * password hash never leaves this module. */
export type User = { id: string; name: string; role: string };

export type SeedAccount = User & { password: string };

/** Compared against when the username is unknown, so a miss costs the same
 * scrypt work as a wrong password and does not reveal which accounts exist. */
const DECOY_HASH = hashPassword('decoy-password-never-matches');

/**
 * Lab user accounts: ID (also the sign-in username), printed name, role,
 * active flag and a salted scrypt password hash. Accounts are seeded; there is
 * no account administration in this release.
 */
export class Accounts {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      passwordHash TEXT NOT NULL)`);
  }

  close() {
    this.db.close();
  }

  /** Adds accounts that do not exist yet; existing accounts are left alone. */
  seed(accounts: readonly SeedAccount[]) {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO users (id, name, role, active, passwordHash) VALUES (?, ?, ?, 1, ?)',
    );
    for (const a of accounts)
      if (!this.find(a.id))
        insert.run(a.id, a.name, a.role, hashPassword(a.password));
  }

  /** An active user by ID, or null. */
  find(id: string): User | null {
    const row = this.db
      .prepare('SELECT id, name, role FROM users WHERE id = ? AND active = 1')
      .get(id) as User | undefined;
    return row ? { id: row.id, name: row.name, role: row.role } : null;
  }

  /** The active user whose credentials these are, or null. */
  async authenticate(username: string, password: string): Promise<User | null> {
    const row = this.db
      .prepare('SELECT id, active, passwordHash FROM users WHERE id = ?')
      .get(username) as
      { id: string; active: number; passwordHash: string } | undefined;
    const matches = await verifyPassword(
      password,
      row?.passwordHash ?? DECOY_HASH,
    );
    return row && matches && row.active ? this.find(row.id) : null;
  }
}
