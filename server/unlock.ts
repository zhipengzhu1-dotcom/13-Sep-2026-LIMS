import { userInfo } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { WorkflowError } from '../src/laboratory/workflow-error.ts';

/**
 * Unlocks a Locked account from the lab server, so a lone Admin who locked
 * themselves out can get back in. Demo only (ADR-0011): production refuses
 * it until the System administrator's server command (#66). The unlock is an
 * Access event naming the operating-system user who ran it.
 */
export function unlockFromServer({
  database,
  username,
  operator,
  production,
}: {
  database: string;
  username: string;
  operator: string;
  production: boolean;
}): string {
  if (production)
    throw new WorkflowError(
      'The unlock command is for the demo only. In production the System administrator unlocks accounts (#66).',
      403,
    );
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

// `npm run unlock -- <username>`
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: npm run unlock -- <username>');
    process.exit(1);
  }
  try {
    console.log(
      unlockFromServer({
        database: resolve('data/prototype.sqlite'),
        username,
        operator: userInfo().username,
        production: process.env.NODE_ENV === 'production',
      }),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
