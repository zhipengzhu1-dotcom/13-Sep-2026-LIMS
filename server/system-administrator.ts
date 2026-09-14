import { closeSync, existsSync, openSync, rmSync } from 'node:fs';
import { userInfo } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts } from '../src/accounts/accounts.ts';
import { WorkflowError } from '../src/laboratory/workflow-error.ts';
import {
  auditedActLabels,
  auditEntriesOfEventType,
  auditEntriesWithin,
} from '../src/laboratory/contracts.ts';
import { migrate, type MigrationOutcome } from './migrations.ts';
import {
  capabilities,
  missingDatabase,
  readMode,
  readSettings,
} from './startup.ts';
import { backupDatabase, verifyDatabase, type Verification } from './backup.ts';
import { currentCheckout, packageVersion, runningVersion } from './release.ts';

/** A verification's report, ending with the SHA-256 of the backup it is
 * about. One that failed is refused, so the command exits with an error once
 * its failure is on record; `refused` ends the refusal. */
function reported(
  subject: string,
  verification: Verification,
  backupSha256 = verification.sha256,
  refused?: string,
) {
  const checks = [
    ...verification.checks,
    `SHA-256 of the backup: ${backupSha256}`,
  ];
  if (!verification.passed)
    throw new WorkflowError(
      [
        `${subject} failed its checks.`,
        ...verification.problems,
        ...checks,
        ...(refused ? [refused] : []),
      ].join('\n'),
      422,
    );
  return [`${subject} passed every check.`, ...checks].join('\n');
}

const USAGE = `Usage: npm run system-administrator -- <act> ...
  create-database --change-record <reference>
  issue-account <username> --name <printed name> --role <role> --change-record <reference>
  unlock <username> --form <reference>
  issue-one-time-password <username> --form <reference>
  access-events --from <YYYY-MM-DD> --to <YYYY-MM-DD>
  unsent-notices
  backup <new backup file>
  verify-backup <backup file>
  restore <backup file> --change-record <reference>`;

/**
 * The System administrator's server command (ADR-0007, ADR-0009, ADR-0010),
 * run on the lab server against the instance's own settings, since the
 * System administrator has no Benchline account. Every act that changes
 * anything is an audit trail entry naming the System administrator, the
 * operating-system user who ran it, and the approved Form or change record
 * it cites. Returns what to print.
 */
export async function administerFromServer({
  env,
  args,
  operator,
}: {
  env: Readonly<Record<string, string | undefined>>;
  args: readonly string[];
  operator: string;
}): Promise<string> {
  // An unknown mode falls through to `readSettings`, which refuses it.
  const mode = readMode(env);
  if (mode && !capabilities(mode).allowsSystemAdministratorCommand)
    throw new WorkflowError(
      'The System administrator’s command is for production. In the demo, the Admin manages accounts on the Accounts screen and `npm run unlock` unlocks a lone Admin.',
      403,
    );
  const read = readSettings(env);
  if (read.outcome === 'refused')
    throw new WorkflowError(read.reasons.join(' '), 400);
  const { settings } = read;
  const by = `System administrator (${operator})`;
  const [act, ...rest] = args;
  const database = resolve(settings.database);
  switch (act) {
    // Production creates no database by itself, so a new Production instance
    // or Validation environment gets its empty database here.
    case 'create-database': {
      const { values } = parse(rest, {
        'change-record': { type: 'string' },
      });
      const reference = cited(values['change-record'], 'change record');
      const exists = () =>
        new WorkflowError(
          `${settings.database} already exists; a database is created only where there is none. Nothing was changed.`,
          409,
        );
      // Created exclusively, so a file that appears after any check is still
      // never taken over.
      try {
        closeSync(openSync(database, 'wx'));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw exists();
        throw error;
      }
      try {
        return opened(database, ({ lab, migration }) => {
          if (migration.outcome !== 'created') throw exists();
          lab.recordDatabaseCreated({
            by,
            file: database,
            schemaVersion: migration.version,
            reason: `Change record ${reference}`,
          });
          return `A new, empty database is created at ${settings.database} under change record ${reference}.`;
        });
      } catch (error) {
        // Left behind, a half-made file would pass for a created database.
        for (const suffix of ['', '-wal', '-shm'])
          rmSync(`${database}${suffix}`, { force: true });
        throw error;
      }
    }
    case 'issue-account': {
      const { values, positionals } = parse(rest, {
        name: { type: 'string' },
        role: { type: 'string' },
        'change-record': { type: 'string' },
      });
      const reference = cited(values['change-record'], 'change record');
      return opened(database, ({ accounts, lab }) => {
        const username = positionals[0] ?? '';
        const name = values.name ?? '';
        const oneTimePassword = accounts.issueAccount(
          { username, name, role: values.role ?? '' },
          by,
          `Change record ${reference}`,
          lab,
        );
        return [
          `Account ${username} (${name}, ${values.role}) is issued under change record ${reference}.`,
          `One-time password: ${oneTimePassword}`,
          `Give it to ${name} in person after checking who they are. It is not shown again, and it must be replaced at the next sign-in.`,
        ].join('\n');
      });
    }
    case 'unlock': {
      const { values, positionals } = parse(rest, {
        form: { type: 'string' },
      });
      const reference = cited(values.form, 'Form');
      const username = positionals[0] ?? '';
      return opened(database, ({ accounts, lab }) => {
        const oneTimePassword = accounts.unlockWithOneTimePassword(
          username,
          by,
          `Form ${reference}`,
          lab,
        );
        return [
          `${username} is unlocked under Form ${reference}.`,
          `One-time password: ${oneTimePassword}`,
          'Give it to its user in person after checking who they are. It is not shown again, and it must be replaced at the next sign-in.',
        ].join('\n');
      });
    }
    case 'issue-one-time-password': {
      const { values, positionals } = parse(rest, {
        form: { type: 'string' },
      });
      const reference = cited(values.form, 'Form');
      const username = positionals[0] ?? '';
      return opened(database, ({ accounts, lab }) => {
        const oneTimePassword = accounts.issueOneTimePassword(
          username,
          by,
          `Form ${reference}`,
          lab,
        );
        return [
          `A new One-time password is issued for ${username} under Form ${reference}.`,
          `One-time password: ${oneTimePassword}`,
          'Give it to its user in person after checking who they are. It is not shown again, and it must be replaced at the next sign-in.',
        ].join('\n');
      });
    }
    case 'access-events': {
      const { values } = parse(rest, {
        from: { type: 'string' },
        to: { type: 'string' },
      });
      const { from = '', to = '' } = values;
      if (![from, to].every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)))
        throw new WorkflowError(
          'Give --from and --to as UTC dates, YYYY-MM-DD.',
          400,
        );
      return opened(database, ({ lab }) => {
        const events = auditEntriesOfEventType(
          auditEntriesWithin(lab.auditTrail(), { from, to }),
          'accessEvents',
        ).reverse();
        const failed = events.filter(
          (e) => e.commandType === 'failedAttempt',
        ).length;
        return [
          `Access events from ${from} to ${to} (UTC), oldest first:`,
          ...events.map(
            (e) =>
              `${e.at}  ${auditedActLabels[e.commandType]}  ${e.recordId}  by ${e.actor}  ${e.field}: ${e.oldValue} → ${e.newValue}${e.reason ? `  (${e.reason})` : ''}`,
          ),
          `${failed} ${failed === 1 ? 'Failed attempt' : 'Failed attempts'}.`,
        ].join('\n');
      });
    }
    case 'unsent-notices':
      return opened(database, ({ lab }) => {
        const unsent = lab
          .auditTrail()
          .filter(
            (e) => e.commandType === 'lockoutNotice' && e.newValue === 'failed',
          )
          .reverse();
        return unsent.length
          ? [
              'Lockout notices not sent:',
              ...unsent.map((e) => `${e.at}  ${e.recordId}  ${e.reason}`),
            ].join('\n')
          : 'Every lockout notice was sent.';
      });
    case 'backup': {
      const destination = parse(rest, {}).positionals[0];
      if (!destination) throw new WorkflowError(USAGE, 400);
      if (!existsSync(database))
        throw new WorkflowError(missingDatabase(database), 404);
      if (existsSync(destination))
        throw new WorkflowError(
          `${destination} already exists; a backup never overwrites a file. Nothing was changed.`,
          409,
        );
      const record = (passed: boolean, sha256: string, problems: string[]) =>
        opened(database, ({ lab }) =>
          lab.recordBackup({
            type: 'backup',
            by,
            file: destination,
            passed,
            sha256,
            reason: problems.join(' ') || undefined,
          }),
        );
      try {
        await backupDatabase(database, resolve(destination));
      } catch (error) {
        // A copy that could not be made is a failed backup, on record too.
        record(false, '', [
          `The copy could not be made: ${error instanceof Error ? error.message : String(error)}`,
        ]);
        throw error;
      }
      const verification = verifyDatabase(destination);
      record(verification.passed, verification.sha256, verification.problems);
      return reported(`The backup ${destination}`, verification);
    }
    // The only way ADR-0008 allows an invalid signature to be cleared, so
    // only a verified backup, only onto a clean server, and only under an
    // approved change record.
    case 'restore': {
      const { values, positionals } = parse(rest, {
        'change-record': { type: 'string' },
      });
      const reference = cited(values['change-record'], 'change record');
      const file = positionals[0];
      if (!file) throw new WorkflowError(USAGE, 400);
      if (existsSync(settings.database))
        throw new WorkflowError(
          `${settings.database} already exists. A backup is restored only onto a clean server, so nothing recorded there is lost. Nothing was changed.`,
          409,
        );
      if (!existsSync(file))
        throw new WorkflowError(`There is no backup ${file}.`, 404);
      const backupVerification = verifyDatabase(file);
      // There is no database yet to record a refusal in; it is reported.
      if (!backupVerification.passed)
        reported(
          `The backup ${file}`,
          backupVerification,
          undefined,
          'Nothing was restored.',
        );
      await backupDatabase(file, database);
      const restored = verifyDatabase(database);
      opened(database, ({ lab }) =>
        lab.recordBackup({
          type: 'restore',
          by,
          file,
          passed: restored.passed,
          sha256: backupVerification.sha256,
          reason: [`Change record ${reference}`, ...restored.problems].join(
            ' ',
          ),
        }),
      );
      return reported(
        `The backup ${file} is restored to ${settings.database} under change record ${reference}, and the restored database`,
        restored,
        backupVerification.sha256,
      );
    }
    // Only reads the file, so it changes nothing and is not audited.
    case 'verify-backup': {
      const file = parse(rest, {}).positionals[0];
      if (!file) throw new WorkflowError(USAGE, 400);
      if (!existsSync(file))
        throw new WorkflowError(`There is no backup ${file}.`, 404);
      return reported(`The backup ${file}`, verifyDatabase(file));
    }
    default:
      throw new WorkflowError(USAGE, 400);
  }
}

function parse<O extends ParseArgsOptionsConfig>(
  args: readonly string[],
  options: O,
) {
  try {
    return parseArgs({ args: [...args], options, allowPositionals: true });
  } catch (error) {
    throw new WorkflowError(
      `${error instanceof Error ? error.message : String(error)}\n${USAGE}`,
      400,
    );
  }
}

/** The approved Form or change record an act cites; none is refused. */
function cited(reference: string | boolean | undefined, what: string) {
  const text = typeof reference === 'string' ? reference.trim() : '';
  if (!text)
    throw new WorkflowError(
      `Cite the approved ${what} this is done under. Nothing was changed.`,
      400,
    );
  return text;
}

/** Runs an act on the instance's database, migrated first as the server
 * does, so the stores never open a file ahead of its migrations. */
function opened<T>(
  database: string,
  act: (stores: {
    accounts: Accounts;
    lab: Laboratory;
    migration: MigrationOutcome;
  }) => T,
): T {
  // Production creates no database by itself, so a missing file is a wrong
  // path, never a new instance.
  if (!existsSync(database))
    throw new WorkflowError(missingDatabase(database), 404);
  const migration = migrate(database);
  if (migration.outcome === 'refused')
    throw new WorkflowError(migration.reason, 409);
  const accounts = new Accounts(database);
  let lab: Laboratory;
  try {
    lab = new Laboratory(database, {
      credentials: accounts,
      people: () => accounts.people(),
      release: runningVersion(packageVersion(), currentCheckout()),
    });
  } catch (error) {
    accounts.close();
    throw error;
  }
  try {
    return act({ accounts, lab, migration });
  } finally {
    lab.close();
    accounts.close();
  }
}

// `npm run system-administrator -- <act> ...` with the instance's environment.
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  administerFromServer({
    env: process.env,
    args: process.argv.slice(2),
    operator: userInfo().username,
  }).then(
    (output) => console.log(output),
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    },
  );
}
