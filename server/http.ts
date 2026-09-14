import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  WorkflowError,
  type Laboratory,
} from '../src/laboratory/laboratory.ts';
import type { Accounts } from '../src/accounts/accounts.ts';
import {
  clearedSessionCookie,
  readSessionCookie,
  sessionCookie,
  type Sessions,
} from './sessions.ts';
import { HttpError } from './http-error.ts';
import { handleAttachments } from './attachments.ts';

const MAX_BODY_BYTES = 32768;

export type Authentication = { accounts: Accounts; sessions: Sessions };

/** Ends idle sessions, recording each expiry as an Access event. */
export function expireSessions(lab: Laboratory, sessions: Sessions) {
  const minutes = sessions.idleTimeoutMs / 60000;
  for (const { userId, lastSeen } of sessions.expire())
    lab.recordAccessEvent({
      type: 'sessionExpiry',
      username: userId,
      reason: `Ended after ${minutes} minutes without activity; last active ${new Date(lastSeen).toISOString()}`,
    });
}

export function api(lab: Laboratory, { accounts, sessions }: Authentication) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const send = (
      status: number,
      data: unknown,
      headers: Record<string, string> = {},
    ) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...headers,
      });
      res.end(JSON.stringify(data));
    };
    const token = readSessionCookie(req.headers.cookie);
    try {
      // Collected before any session is used, so an idle one is on record as
      // expired rather than silently refused.
      expireSessions(lab, sessions);
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const route = `${req.method} ${path}`;
      /** The signed-in user, taken from the session and nothing else the
       * browser sends. */
      const currentUser = () => {
        const userId = sessions.resolve(token);
        const user = userId ? accounts.find(userId) : null;
        if (!user) {
          sessions.end(token);
          throw new HttpError(
            401,
            token
              ? 'Your session has ended. Sign in to continue.'
              : 'Sign in to continue.',
          );
        }
        return user;
      };

      if (route === 'GET /api/session')
        return send(200, { user: currentUser() });
      if (route === 'GET /api/workspace') {
        currentUser();
        return send(200, lab.snapshot());
      }
      if (path === '/api/attachments' || path.startsWith('/api/attachments/'))
        return await handleAttachments(lab, req, res, url, currentUser);
      // GET /api/samples/:sampleId/certificates lists every version with its
      // locked content; .../certificates/:version returns one.
      const certificates = path.match(
        /^\/api\/samples\/([^/]+)\/certificates(?:\/(\d+))?$/,
      );
      if (req.method === 'GET' && certificates) {
        currentUser();
        const sampleId = decodeURIComponent(certificates[1]);
        return certificates[2] === undefined
          ? send(200, { certificates: lab.certificates(sampleId) })
          : send(200, {
              certificate: lab.certificate(sampleId, Number(certificates[2])),
            });
      }
      if (
        ![
          'POST /api/sign-in',
          'POST /api/sign-out',
          'POST /api/commands',
        ].includes(route)
      )
        return send(404, { error: 'Not found' });

      // Every write, sign-in included, must come from this origin as JSON.
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      )
        return send(403, { error: 'Cross-origin writes are not allowed.' });
      if (!req.headers['content-type']?.startsWith('application/json'))
        return send(415, { error: 'Use application/json.' });
      const input = await readJson(req);

      if (route === 'POST /api/sign-in') {
        const { username, password } = (input ?? {}) as Record<string, unknown>;
        if (typeof username !== 'string' || typeof password !== 'string')
          return send(401, { error: 'Incorrect username or password.' });
        const typed = username.trim();
        const attempt = await accounts.signIn(typed, password, lab);
        if (attempt.outcome === 'incorrect')
          return send(401, { error: 'Incorrect username or password.' });
        // The lock ends every session of the account at once (ADR-0009).
        if (attempt.outcome === 'locked') {
          sessions.endAll(typed);
          return send(403, {
            error: 'This account is locked. Contact the System administrator.',
            code: 'accountLocked',
          });
        }
        sessions.end(token);
        return send(
          200,
          { user: attempt.user },
          { 'Set-Cookie': sessionCookie(sessions.start(attempt.user.id)) },
        );
      }
      if (route === 'POST /api/sign-out') {
        const userId = sessions.resolve(token);
        if (userId)
          lab.recordAccessEvent({ type: 'signOut', username: userId });
        sessions.end(token);
        return send(
          200,
          { signedOut: true },
          { 'Set-Cookie': clearedSessionCookie() },
        );
      }
      const user = currentUser();
      // The outcome carries whether this applied or replayed; the client must
      // be able to tell an "already recorded" from a fresh save.
      try {
        send(200, lab.execute(input, user.id));
      } catch (error) {
        // Locking on a signature ends every session of the account at once.
        if (error instanceof WorkflowError && error.code === 'accountLocked')
          sessions.endAll(user.id);
        throw error;
      }
    } catch (error) {
      if (error instanceof WorkflowError && error.code === 'accountLocked')
        return send(
          error.status,
          { error: error.message, code: error.code },
          { 'Set-Cookie': clearedSessionCookie() },
        );
      if (error instanceof HttpError || error instanceof WorkflowError)
        return send(error.status, { error: error.message });
      console.error(error);
      send(500, {
        error:
          'The workspace could not save this change. Your input has been preserved.',
      });
    }
  };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES)
      throw new HttpError(413, 'Request too large.');
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
