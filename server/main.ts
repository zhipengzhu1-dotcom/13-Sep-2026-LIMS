import { createServer } from 'node:http';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { api, expireSessions } from './http.ts';
import { discardOutdatedDemoDatabase, seed } from './seed.ts';
import { migrate } from './migrations.ts';
import { Sessions } from './sessions.ts';

const development = process.env.NODE_ENV !== 'production';
mkdirSync('data', { recursive: true });
const database = resolve('data/prototype.sqlite');
// Both run before either store opens the file: a discarded demo file takes
// its old accounts with it, and a migration's new tables are not pre-empted
// by the stores' own CREATE statements.
if (development) discardOutdatedDemoDatabase(database);
const migration = migrate(database);
if (migration.outcome === 'refused') {
  console.error(`Benchline did not start: ${migration.reason}`);
  process.exit(1);
}
if (migration.outcome === 'migrated')
  console.log(
    `Database migrated from schema version ${migration.from} to ${migration.to}: ${migration.applied.join('; ')}`,
  );
const accounts = new Accounts(database, {
  // Outbound mail settings come with production mode (#30). Until then a
  // lockout notice is printed here and, since nobody was emailed, recorded as
  // not sent.
  lockoutNotice: {
    systemAdministrator: 'system-administrator@benchline.invalid',
    qualityLead: 'quality-lead@benchline.invalid',
    transport: {
      send: async (mail) => {
        console.warn(
          `Lockout notice to ${mail.to.join(', ')}: ${mail.subject}\n${mail.text}`,
        );
        throw new Error(
          'outbound mail is not configured until production mode (#30); the notice was printed on the server console',
        );
      },
    },
  },
});
accounts.seed(demoAccounts);
// The core verifies Electronic signatures against these accounts' hashes and
// takes its users from them, so a user the Admin adds can act at once.
const lab = new Laboratory(database, {
  credentials: accounts,
  people: () => accounts.people(),
});
seed(lab);
const sessions = new Sessions();
const handleApi = api(lab, { accounts, sessions });
// An abandoned session is recorded as expired soon after it expires, not only
// when the next request arrives.
const sweep = setInterval(() => expireSessions(lab, sessions), 60_000);
const vite = development
  ? await (
      await import('vite')
    ).createServer({ server: { middlewareMode: true }, appType: 'spa' })
  : null;
const root = resolve('dist');
const mime: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/')) {
    void handleApi(req, res);
    return;
  }
  if (vite) {
    vite.middlewares(req, res);
    return;
  }
  try {
    const path = resolve(
      root,
      '.' + new URL(req.url ?? '/', 'http://localhost').pathname,
    );
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const file =
      path !== root && existsSync(path) ? path : resolve(root, 'index.html');
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
    });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(Number(process.env.PORT ?? 5173), '127.0.0.1', () =>
  console.log('Benchline: http://127.0.0.1:' + (process.env.PORT ?? 5173)),
);
async function shutdown() {
  clearInterval(sweep);
  await vite?.close();
  await accounts.noticesSettled();
  server.close(() => {
    lab.close();
    accounts.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
