import { userInfo } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { WorkflowError } from '../src/laboratory/workflow-error.ts';
import { migrate } from './migrations.ts';
import { readSettings } from './startup.ts';

/**
 * Unlocks a Locked account from the lab server, so a lone Admin who locked
 * themselves out can get back in. Demo only (ADR-0011): production refuses
 * it, before asking for any other setting, until the System administrator's
 * server command (#66). It reads the same settings the server starts with.
 * The unlock is an Access event naming the operating-system user who ran it.
 */
export function unlockFromServer({
  env,
  username,
  operator,
}: {
  env: Readonly<Record<string, string | undefined>>;
  username: string;
  operator: string;
}): string {
  if (env.BENCHLINE_MODE === 'production')
    throw new WorkflowError(
      'The unlock command is for the demo only. In production the System administrator unlocks accounts (#66).',
      403,
    );
  const read = readSettings(env);
  if (read.outcome === 'refused')
    throw new WorkflowError(read.reasons.join(' '), 400);
  const database = resolve(read.settings.database);
  // As the server does, so the stores never open a file ahead of its
  // migrations.
  const migration = migrate(database);
  if (migration.outcome === 'refused')
    throw new WorkflowError(migration.reason, 409);
  const accounts = new Accounts(database);
  const lab = new Laboratory(database, {
    credentials: accounts,
    people: () => accounts.people(),
  });
  try {
    accounts.unlockByServerCommand(
      username,
      `System administrator (${operator})`,
      lab,
    );
    return `${username} is unlocked.`;
  } finally {
    lab.close();
    accounts.close();
  }
}

// `BENCHLINE_MODE=demo npm run unlock -- <username>`
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: BENCHLINE_MODE=demo npm run unlock -- <username>');
    process.exit(1);
  }
  try {
    console.log(
      unlockFromServer({
        env: process.env,
        username,
        operator: userInfo().username,
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
