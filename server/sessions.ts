import { createHash, randomBytes } from 'node:crypto';

/** A session ends after this long without an authenticated request. */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_COOKIE = 'benchline_session';

type Session = { userId: string; lastSeen: number };

/**
 * Server-side sessions keyed by an unguessable token held only in an HttpOnly
 * cookie. Only the token's SHA-256 is kept, and each use slides the idle
 * deadline. Sessions live in memory: a restart signs everyone out.
 */
export class Sessions {
  private sessions = new Map<string, Session>();
  constructor(
    private now: () => number = Date.now,
    private idleTimeoutMs = IDLE_TIMEOUT_MS,
  ) {}

  /** Starts a session and returns its token. */
  start(userId: string): string {
    this.prune();
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(digest(token), { userId, lastSeen: this.now() });
    return token;
  }

  /** The user ID for a live session, refreshing its idle deadline; else null. */
  resolve(token: string | undefined): string | null {
    if (!token) return null;
    const key = digest(token);
    const session = this.sessions.get(key);
    if (!session) return null;
    if (this.now() - session.lastSeen >= this.idleTimeoutMs) {
      this.sessions.delete(key);
      return null;
    }
    session.lastSeen = this.now();
    return session.userId;
  }

  end(token: string | undefined) {
    if (token) this.sessions.delete(digest(token));
  }

  private prune() {
    const now = this.now();
    for (const [key, s] of this.sessions)
      if (now - s.lastSeen >= this.idleTimeoutMs) this.sessions.delete(key);
  }
}

function digest(token: string) {
  return createHash('sha256').update(token).digest('base64url');
}

export function readSessionCookie(header: string | undefined) {
  for (const part of header?.split(';') ?? []) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return undefined;
}

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
