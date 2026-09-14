import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Laboratory } from '../src/laboratory/laboratory.ts';
import { Accounts, type AccountsOptions } from '../src/accounts/accounts.ts';
import { demoAccounts } from '../src/accounts/demo-accounts.ts';
import { verifyPasswordSync } from '../src/accounts/passwords.ts';
import { discardOutdatedDemoDatabase, seed } from './seed.ts';
import { migrate, type MigrationOutcome } from './migrations.ts';
import { smtpTransport } from './mail.ts';

export type Mode = 'demo' | 'production';

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
  const mode = env.BENCHLINE_MODE;
  if (!mode)
    return {
      outcome: 'refused',
      reasons: ['Set BENCHLINE_MODE to demo or production.'],
    };
  if (mode !== 'demo' && mode !== 'production')
    return {
      outcome: 'refused',
      reasons: [`BENCHLINE_MODE is "${mode}"; set it to demo or production.`],
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
 * accounts. Production never discards, seeds or adds an account, and it
 * emails lockout notices through the lab's mail server.
 */
export function openInstance(settings: Settings): InstanceOutcome {
  const { database } = settings;
  mkdirSync(dirname(database), { recursive: true });
  // Both run before either store opens the file: a discarded demo file takes
  // its old accounts with it, and a migration's new tables are not pre-empted
  // by the stores' own CREATE statements.
  if (settings.mode === 'demo') discardOutdatedDemoDatabase(database);
  else {
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
    lockoutNotice:
      settings.mode === 'demo'
        ? demoLockoutNotice
        : {
            systemAdministrator: settings.lockoutNotice.systemAdministrator,
            qualityLead: settings.lockoutNotice.qualityLead,
            transport: smtpTransport(
              settings.lockoutNotice.smtpUrl,
              settings.lockoutNotice.from,
            ),
          },
  });
  if (settings.mode === 'demo') accounts.seed(demoAccounts);
  // The core verifies Electronic signatures against these accounts' hashes and
  // takes its users from them, so a user added to the accounts can act at once.
  const lab = new Laboratory(database, {
    credentials: accounts,
    people: () => accounts.people(),
  });
  if (settings.mode === 'demo') seed(lab);
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

/** The effective settings, printed at start-up so the installation record
 * can show them. The SMTP URL is printed without its user and password. */
export function describeSettings(settings: Settings): string {
  const lines = [
    `Mode: ${settings.mode}`,
    `Database: ${settings.database}`,
    `Port: ${settings.port} (127.0.0.1 only)`,
  ];
  if (settings.mode === 'demo')
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
