import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory, WorkflowError } from '../src/laboratory/laboratory.ts';
import { Accounts, type AccountsOptions } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { verifyPasswordSync } from '../src/accounts/passwords.ts';
import { discardOutdatedDemoDatabase, seed } from './seed.ts';
import { migrate, type MigrationOutcome } from './migrations.ts';
import { smtpTransport } from './mail.ts';
import type { WorkspaceCapabilities } from '../src/instance-contracts.ts';

export type Mode = 'demo' | 'production';

/** Every consequence of an instance's mode, named, so the server and the
 * workspace read what the instance offers rather than comparing the mode. */
export type Capabilities = {
  /** The workspace is served from source through Vite, not from the build. */
  servesWorkspaceFromSource: boolean;
  /** A missing database folder is created and a database from before
   * versioned migrations is discarded. Without it, a missing database file or
   * one holding demo accounts is refused. */
  discardsOutdatedDatabase: boolean;
  /** Demo records and demo accounts are seeded at start-up. */
  seedsDemoData: boolean;
  /** The demo accounts' passwords are exempt from password aging. */
  demoPasswordsNeverExpire: boolean;
  /** The session cookie is sent only over https. */
  marksCookiesSecure: boolean;
  /** A write must come from the https origin of the TLS reverse proxy. */
  checksHttpsOrigin: boolean;
  /** The server answers the Admin's Accounts API (ADR-0011); without it every
   * `/api/accounts` request is refused, whatever the workspace shows. */
  servesAccountsApi: boolean;
  /** `npm run unlock` may unlock an account (ADR-0011). */
  allowsUnlockCommand: boolean;
  /** The System administrator's server command may run (ADR-0007). */
  allowsSystemAdministratorCommand: boolean;
  workspace: WorkspaceCapabilities;
};

/** What each mode offers, every capability written out for each mode, so a
 * mode is granted nothing by default. */
const offeredByMode: Record<Mode, Capabilities> = {
  demo: {
    servesWorkspaceFromSource: true,
    discardsOutdatedDatabase: true,
    seedsDemoData: true,
    demoPasswordsNeverExpire: true,
    marksCookiesSecure: false,
    checksHttpsOrigin: false,
    servesAccountsApi: true,
    allowsUnlockCommand: true,
    allowsSystemAdministratorCommand: false,
    workspace: {
      showsDemoBadge: true,
      listsDemoAccounts: true,
      offersAccountsScreen: true,
    },
  },
  production: {
    servesWorkspaceFromSource: false,
    discardsOutdatedDatabase: false,
    seedsDemoData: false,
    demoPasswordsNeverExpire: false,
    marksCookiesSecure: true,
    checksHttpsOrigin: true,
    servesAccountsApi: false,
    allowsUnlockCommand: false,
    allowsSystemAdministratorCommand: true,
    workspace: {
      showsDemoBadge: false,
      listsDemoAccounts: false,
      offersAccountsScreen: false,
    },
  },
};

export function capabilities(mode: Mode): Capabilities {
  return offeredByMode[mode];
}

/** The mode the environment names, or null when it names none this build
 * knows (which `readSettings` refuses with the reason). */
export function readMode(
  env: Readonly<Record<string, string | undefined>>,
): Mode | null {
  const mode = env.BENCHLINE_MODE;
  return mode === 'demo' || mode === 'production' ? mode : null;
}

/** Where and how a production instance emails a lockout notice (§11.300(d),
 * ADR-0009). The SMTP URL carries the mail password, so it is never printed. */
export type LockoutNoticeSettings = {
  smtpUrl: string;
  from: string;
  systemAdministrator: string;
  qualityLead: string;
};

export type Settings =
  | { mode: 'demo'; database: string; port: number }
  | {
      mode: 'production';
      database: string;
      port: number;
      lockoutNotice: LockoutNoticeSettings;
    };

export type SettingsOutcome =
  | { outcome: 'ready'; settings: Settings }
  /** The server must not start; each reason names the setting to fix. */
  | { outcome: 'refused'; reasons: string[] };

/** The demo keeps its database where it always was. */
const DEMO_DATABASE = 'data/prototype.sqlite';
const DEFAULT_PORT = 5173;

/** Why production refuses a database file that is not there: it creates no
 * database by itself, so a wrong path is never taken for a new instance. */
export const missingDatabase = (file: string) =>
  `There is no database file ${file}. A production database is created only by the System administrator’s create-database act, under an approved change record. Nothing was created.`;
const EMAIL = /^[^\s@]+@[^\s@]+$/;

/**
 * Reads the instance's start-up settings from its environment. The mode is
 * required, so a misconfigured server never falls back to demo. Production,
 * whether the production instance or the Validation environment, names its
 * own database file and the outbound mail for lockout notices; demo needs
 * neither.
 */
export function readSettings(
  env: Readonly<Record<string, string | undefined>>,
): SettingsOutcome {
  const mode = readMode(env);
  if (!env.BENCHLINE_MODE)
    return {
      outcome: 'refused',
      reasons: ['Set BENCHLINE_MODE to demo or production.'],
    };
  if (!mode)
    return {
      outcome: 'refused',
      reasons: [
        `BENCHLINE_MODE is "${env.BENCHLINE_MODE}"; set it to demo or production.`,
      ],
    };
  const reasons: string[] = [];
  const port = env.PORT ? Number(env.PORT) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    reasons.push('PORT must be a port number.');
  if (mode === 'demo')
    return reasons.length
      ? { outcome: 'refused', reasons }
      : {
          outcome: 'ready',
          settings: {
            mode,
            database: env.BENCHLINE_DATABASE || DEMO_DATABASE,
            port,
          },
        };

  /** A required setting, with what to set it to when it is missing. */
  const required = (name: string, missing: string) => {
    const value = env[name]?.trim();
    if (!value) reasons.push(`Set ${name} to ${missing}.`);
    return value ?? '';
  };
  const email = (name: string, missing: string) => {
    const value = required(name, missing);
    if (value && !EMAIL.test(value))
      reasons.push(`${name} must be an email address.`);
    return value;
  };
  const database = required(
    'BENCHLINE_DATABASE',
    'this instance’s database file',
  );
  const smtpUrl = required(
    'BENCHLINE_SMTP_URL',
    'the outbound mail server, e.g. smtps://user:password@mail.example:465',
  );
  // The value is never echoed: it carries the mail password.
  if (smtpUrl && !/^smtps?:$/.test(URL.parse(smtpUrl)?.protocol ?? ''))
    reasons.push('BENCHLINE_SMTP_URL must be an smtp:// or smtps:// URL.');
  const from = email(
    'BENCHLINE_MAIL_FROM',
    'the address lockout notices are sent from',
  );
  const systemAdministrator = email(
    'BENCHLINE_SYSTEM_ADMINISTRATOR_EMAIL',
    'the System administrator’s address for lockout notices',
  );
  const qualityLead = email(
    'BENCHLINE_QUALITY_LEAD_EMAIL',
    'the Quality lead’s address for lockout notices',
  );
  if (reasons.length) return { outcome: 'refused', reasons };
  return {
    outcome: 'ready',
    settings: {
      mode,
      database,
      port,
      lockoutNotice: { smtpUrl, from, systemAdministrator, qualityLead },
    },
  };
}

export type InstanceOutcome =
  | {
      outcome: 'opened';
      lab: Laboratory;
      accounts: Accounts;
      migration: MigrationOutcome;
      close(): void;
    }
  /** The server must not start; the database was left as it was. */
  | { outcome: 'refused'; reason: string };

/** A demo lockout notice is printed on the server console and, since nobody
 * was emailed, recorded as not sent. */
const demoLockoutNotice: AccountsOptions['lockoutNotice'] = {
  systemAdministrator: 'system-administrator@benchline.invalid',
  qualityLead: 'quality-lead@benchline.invalid',
  transport: {
    send: async (mail) => {
      console.warn(
        `Lockout notice to ${mail.to.join(', ')}: ${mail.subject}\n${mail.text}`,
      );
      throw new Error(
        'the demo sends no email; the notice was printed on the server console',
      );
    },
  },
};

/**
 * Opens the instance's database as its mode requires. Demo discards a
 * database from before versioned migrations and seeds demo records and demo
 * accounts. Production never creates its database file (the System
 * administrator's create-database act does), and never discards, seeds or
 * adds an account, and it
 * emails lockout notices through the lab's mail server. Only in demo do the
 * demo accounts' passwords never expire. `clock` is the server time the
 * accounts age passwords by.
 */
export function openInstance(
  settings: Settings,
  clock?: () => string,
  release?: string,
): InstanceOutcome {
  const { database } = settings;
  const offers = capabilities(settings.mode);
  // Both run before either store opens the file: a discarded demo file takes
  // its old accounts with it, and a migration's new tables are not pre-empted
  // by the stores' own CREATE statements.
  if (offers.discardsOutdatedDatabase) {
    mkdirSync(dirname(database), { recursive: true });
    discardOutdatedDemoDatabase(database);
  } else {
    // A mistyped path or a wrong mount must not start on an empty record set.
    if (!existsSync(database))
      return { outcome: 'refused', reason: missingDatabase(database) };
    const demo = demoAccountsIn(database);
    if (demo.length)
      return {
        outcome: 'refused',
        reason: `The database holds the demo accounts ${demo.join(', ')}, whose passwords are published, so it is a demo database and cannot be used in production. Nothing was changed.`,
      };
  }
  const migration = migrate(database);
  if (migration.outcome === 'refused')
    return { outcome: 'refused', reason: migration.reason };
  const accounts = new Accounts(database, {
    clock,
    agingExempt: offers.demoPasswordsNeverExpire
      ? demoAccounts.map((account) => account.id)
      : [],
    lockoutNotice:
      'lockoutNotice' in settings
        ? {
            systemAdministrator: settings.lockoutNotice.systemAdministrator,
            qualityLead: settings.lockoutNotice.qualityLead,
            transport: smtpTransport(
              settings.lockoutNotice.smtpUrl,
              settings.lockoutNotice.from,
            ),
          }
        : demoLockoutNotice,
  });
  if (offers.seedsDemoData) accounts.seed(demoAccounts);
  // The core verifies Electronic signatures against these accounts' hashes and
  // takes its users from them, so a user added to the accounts can act at once.
  let lab: Laboratory;
  try {
    lab = new Laboratory(database, {
      credentials: accounts,
      people: () => accounts.people(),
      release,
    });
  } catch (error) {
    accounts.close();
    // A Method changed in place is refused, as a bad database is.
    if (error instanceof WorkflowError)
      return { outcome: 'refused', reason: error.message };
    throw error;
  }
  if (offers.seedsDemoData) seed(lab);
  return {
    outcome: 'opened',
    lab,
    accounts,
    migration,
    close() {
      lab.close();
      accounts.close();
    },
  };
}

/** The accounts in a database file that still sign in with their published
 * demo password, read without changing the file. A real account that only
 * shares a demo username has a password of its own, so it is not one. */
function demoAccountsIn(file: string): string[] {
  if (!existsSync(file)) return [];
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    if (
      !db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'",
        )
        .get()
    )
      return [];
    const hashes = new Map(
      (
        db.prepare('SELECT id, passwordHash FROM users').all() as {
          id: string;
          passwordHash: string;
        }[]
      ).map((row) => [row.id, row.passwordHash]),
    );
    return demoAccounts
      .filter((a) => {
        const hash = hashes.get(a.id);
        return hash !== undefined && verifyPasswordSync(a.password, hash);
      })
      .map((a) => a.id);
  } finally {
    db.close();
  }
}

/** The running version and effective settings, printed at start-up so the
 * installation record can show them. The SMTP URL is printed without its user
 * and password. */
export function describeSettings(settings: Settings, version: string): string {
  const lines = [
    `Version: ${version}`,
    `Mode: ${settings.mode}`,
    `Database: ${settings.database}`,
    `Port: ${settings.port} (127.0.0.1 only)`,
  ];
  if (!('lockoutNotice' in settings))
    return [
      ...lines,
      'Lockout notices: printed on the server console, not emailed',
    ].join('\n');
  const { smtpUrl, from, systemAdministrator, qualityLead } =
    settings.lockoutNotice;
  const server = new URL(smtpUrl);
  return [
    ...lines,
    `Lockout notices: to ${systemAdministrator} and ${qualityLead}, from ${from}, through ${server.protocol}//${server.host}`,
  ].join('\n');
}
