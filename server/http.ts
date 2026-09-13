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

const MAX_BODY_BYTES = 32768;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Authentication = { accounts: Accounts; sessions: Sessions };

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
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      const route = `${req.method} ${path}`;
      const token = readSessionCookie(req.headers.cookie);
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
        const user =
          typeof username === 'string' && typeof password === 'string'
            ? await accounts.authenticate(username.trim(), password)
            : null;
        if (!user)
          return send(401, { error: 'Incorrect username or password.' });
        sessions.end(token);
        return send(
          200,
          { user },
          { 'Set-Cookie': sessionCookie(sessions.start(user.id)) },
        );
      }
      if (route === 'POST /api/sign-out') {
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
      send(200, lab.execute(input, user.id));
    } catch (error) {
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
