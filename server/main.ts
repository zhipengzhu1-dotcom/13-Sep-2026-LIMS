import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { api, expireSessions } from './http.ts';
import { Sessions } from './sessions.ts';
import {
  capabilities,
  describeSettings,
  openInstance,
  readSettings,
} from './startup.ts';
import { currentCheckout, packageVersion, runningVersion } from './release.ts';

/** A refused start is written to standard error, which the service manager
 * on the lab server keeps in its log. */
function refuse(reason: string): never {
  console.error(`Benchline did not start: ${reason}`);
  process.exit(1);
}

const read = readSettings(process.env);
if (read.outcome === 'refused') refuse(read.reasons.join(' '));
const { settings } = read;
// The release is named on the audit entries of the Methods it puts in force.
const version = runningVersion(packageVersion(), currentCheckout());
const instance = openInstance(settings, undefined, version);
if (instance.outcome === 'refused') refuse(instance.reason);
const { lab, accounts, migration, close } = instance;
console.log(describeSettings(settings, version));
if (migration.outcome === 'created')
  console.log(`Created a new, empty database at ${settings.database}`);
if (migration.outcome === 'migrated')
  console.log(
    `Database migrated from schema version ${migration.from} to ${migration.to}: ${migration.applied.join('; ')}`,
  );
const sessions = new Sessions();
const handleApi = api(lab, {
  accounts,
  sessions,
  mode: settings.mode,
  version,
});
// An abandoned session is recorded as expired soon after it expires, not only
// when the next request arrives.
const sweep = setInterval(() => expireSessions(lab, sessions), 60_000);
// The demo serves the workspace from source; production serves the build.
const vite = capabilities(settings.mode).servesWorkspaceFromSource
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
server.listen(settings.port, '127.0.0.1', () =>
  console.log('Benchline: http://127.0.0.1:' + settings.port),
);
async function shutdown() {
  clearInterval(sweep);
  await vite?.close();
  await accounts.noticesSettled();
  server.close(() => {
    close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
