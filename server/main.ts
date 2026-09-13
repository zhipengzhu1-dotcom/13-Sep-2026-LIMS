import { createServer } from 'node:http';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { api } from './http.ts';
import { seed } from './seed.ts';
import { Sessions } from './sessions.ts';

mkdirSync('data', { recursive: true });
const database = resolve('data/prototype.sqlite');
const lab = new Laboratory(database);
const accounts = new Accounts(database);
accounts.seed(demoAccounts);
seed(lab);
const handleApi = api(lab, { accounts, sessions: new Sessions() });
const development = process.env.NODE_ENV !== 'production';
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
  await vite?.close();
  server.close(() => {
    lab.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
