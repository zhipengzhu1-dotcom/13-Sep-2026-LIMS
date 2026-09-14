# Instance settings

Benchline reads its start-up settings from the environment. Each instance on the lab server (the Production instance and the Validation environment, see `CONTEXT.md`) has its own settings, changed only under the Benchline change control SOP. Both run in `production` mode: the mode names how an instance behaves, not whether its records are official. At start-up Benchline prints the effective settings, without the mail password, for the installation record. Invalid settings stop it from starting, with a message naming each setting to fix.

| Setting                                | `demo`                            | `production`                                                             |
| -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| `BENCHLINE_MODE`                       | `demo`                            | `production`, for the Production instance and the Validation environment |
| `BENCHLINE_DATABASE`                   | optional, `data/prototype.sqlite` | required: this instance's database file                                  |
| `PORT`                                 | optional, `5173`                  | optional, `5173`; each instance its own                                  |
| `BENCHLINE_SMTP_URL`                   | not used                          | required: `smtp://` or `smtps://user:password@host:port`                 |
| `BENCHLINE_MAIL_FROM`                  | not used                          | required: the address lockout notices are sent from                      |
| `BENCHLINE_SYSTEM_ADMINISTRATOR_EMAIL` | not used                          | required: receives lockout notices                                       |
| `BENCHLINE_QUALITY_LEAD_EMAIL`         | not used                          | required: receives lockout notices                                       |

There is no default mode: without `BENCHLINE_MODE` Benchline does not start. `npm run dev` sets `demo`; `npm start` reads the instance's environment.

## What each mode does

- **`demo`** seeds demo records and the demo accounts, discards a database from before versioned migrations, prints lockout notices on the server console, lists the demo accounts on the sign-in screen, offers the Accounts screen (ADR-0011) and serves the workspace from source. `BENCHLINE_MODE=demo npm run unlock -- <username>` unlocks a demo account.
- **`production`** creates no database, seeds nothing, adds no account and never discards. It refuses a database file that does not exist, naming the path, so a mistyped path or a wrong mount never starts on an empty record set. It also refuses a database from before versioned migrations, one newer than the build, and one holding the demo accounts, each left unchanged. It emails lockout notices, refuses the Accounts screen and the unlock command, marks the session cookie `Secure` and serves the built workspace (`npm run build`).

A new Production instance or Validation environment gets its database in two acts of the System administrator's command, each under its approved change record: `create-database` makes the empty database, then `issue-account` issues the first account (#66). A database that was lost is restored from its backup with `restore`, not created again; the change record says why a new, empty database is created instead.

## The System administrator's command

The System administrator has no Benchline account (ADR-0007). On the lab server, with the instance's own settings, `npm run system-administrator -- <act>` runs one act. It refuses in `demo`. Each act that changes anything is an audit trail entry naming `System administrator (<operating-system user>)` and the approved Form or change record it cites.

| Act                                                                          | What it does                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-database --change-record <ref>`                                      | Creates the instance's empty database at `BENCHLINE_DATABASE`, at this build's schema version, and records it. It refuses a file that already exists, leaving it unchanged. Every other act, and start-up, refuses a database file that does not exist.                      |
| `issue-account <username> --name <name> --role <role> --change-record <ref>` | Adds the account and prints its One-time password once. The password is stored only as a hash, and it signs in only to set the user's own password.                                                                                                                          |
| `unlock <username> --form <ref>`                                             | Unlocks a Locked account, replacing its password with a One-time password printed once. Its Failed attempts and lockout stay in the audit trail.                                                                                                                             |
| `issue-one-time-password <username> --form <ref>`                            | Replaces the password of an active account that is not locked with a new One-time password printed once: for a One-time password that expired after 72 hours, or a password that was lost or compromised.                                                                    |
| `access-events --from <YYYY-MM-DD> --to <YYYY-MM-DD>`                        | Prints the Access events of those whole UTC days, oldest first, with the number of Failed attempts.                                                                                                                                                                          |
| `unsent-notices`                                                             | Lists the lockout notices that were not sent.                                                                                                                                                                                                                                |
| `backup <new file>`                                                          | Takes an online backup of the running database, attachments included. It checks the copy (integrity, every Electronic signature, signing audit entries against signatures, every Certificate of Analysis and attachment hash) and records the result and the copy's SHA-256. |
| `verify-backup <file>`                                                       | Runs the same checks on a backup, without changing it.                                                                                                                                                                                                                       |
| `restore <file> --change-record <ref>`                                       | Restores a backup that passes its checks onto a clean server whose database file does not exist yet. It checks the result, and the restored database records the restore.                                                                                                    |

A failed check exits with an error after it is recorded. Where backups are kept, how they are protected and how long they are retained is set by the Backup, restore and record retention SOP.

## Installation checks

- Benchline listens only on 127.0.0.1. The reverse proxy terminates TLS and passes on the `Host` header, since same-origin writes are checked against `https://<Host>`.
- The printed version is the approved release's version and commit, without `not the release` (see `docs/releases.md`), and the printed settings match the approved release record.
- A test lockout notice reaches both the System administrator and the Quality lead.
- Certificates of Analysis are printed or saved as PDF from Chrome or Edge, the browsers their print output is validated in. Each printed page then carries the Certificate's Sample number, version and "Page x of y" (ISO/IEC 17025 7.8.2.1 d, #85). Firefox and Safari print the end statement but no page footer. Check that a printed multi-page Certificate shows the footer on every page.
