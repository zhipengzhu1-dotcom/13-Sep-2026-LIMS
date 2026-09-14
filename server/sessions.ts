import { createHash, randomBytes } from 'node:crypto';

/** A session ends after this long without an authenticated request. */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_COOKIE = 'benchline_session';

type Session = { userId: string; lastSeen: number };

/**
 * Server-side sessions keyed by an unguessable token held only in an HttpOnly
 * cookie. Only the token's SHA-256 is kept, and each use slides the idle
 * deadline. Sessions live in memory: a restart signs everyone out. An idle
 * session stays unusable until `expire` collects it, so its expiry can be
 * recorded.
 */
export class Sessions {
  private sessions = new Map<string, Session>();
  constructor(
    private now: () => number = Date.now,
    readonly idleTimeoutMs = IDLE_TIMEOUT_MS,
  ) {}

  /** Starts a session and returns its token. */
  start(userId: string): string {
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(digest(token), { userId, lastSeen: this.now() });
    return token;
  }

  /** The user ID for a live session, refreshing its idle deadline; else null. */
  resolve(token: string | undefined): string | null {
    if (!token) return null;
    const session = this.sessions.get(digest(token));
    if (!session || this.idle(session)) return null;
    session.lastSeen = this.now();
    return session.userId;
  }

  end(token: string | undefined) {
    if (token) this.sessions.delete(digest(token));
  }

  /** Ends every session of one user, such as a Locked account's. */
  endAll(userId: string) {
    for (const [key, session] of this.sessions)
      if (session.userId === userId) this.sessions.delete(key);
  }

  /** Ends every session of one user except the one `keep` holds, as a change
   * of their own password does. */
  endOthers(userId: string, keep: string | undefined) {
    const kept = keep && digest(keep);
    for (const [key, session] of this.sessions)
      if (session.userId === userId && key !== kept) this.sessions.delete(key);
  }

  /** Ends every idle session and returns who each belonged to and when it
   * was last used. */
  expire(): Session[] {
    const expired: Session[] = [];
    for (const [key, session] of this.sessions)
      if (this.idle(session)) {
        this.sessions.delete(key);
        expired.push(session);
      }
    return expired;
  }

  private idle(session: Session) {
    return this.now() - session.lastSeen >= this.idleTimeoutMs;
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

/** `secure` in production, where the reverse proxy on the lab server serves
 * Benchline over TLS; the demo is served over plain HTTP. */
export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/${secure ? '; Secure' : ''}`;
}

export function clearedSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}
