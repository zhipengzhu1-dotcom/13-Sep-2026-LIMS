# Instance settings

Benchline reads its start-up settings from the environment. Each instance on the lab server (production, and the Validation environment) has its own settings, changed only under the Benchline change control SOP. At start-up Benchline prints the effective settings, without the mail password, for the installation record. Invalid settings stop it from starting, with a message naming each setting to fix.

| Setting                                | `demo`                            | `production`                                                             |
| -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| `BENCHLINE_MODE`                       | `demo`                            | `production`, for the production instance and the Validation environment |
| `BENCHLINE_DATABASE`                   | optional, `data/prototype.sqlite` | required: this instance's database file                                  |
| `PORT`                                 | optional, `5173`                  | optional, `5173`; each instance its own                                  |
| `BENCHLINE_SMTP_URL`                   | not used                          | required: `smtp://` or `smtps://user:password@host:port`                 |
| `BENCHLINE_MAIL_FROM`                  | not used                          | required: the address lockout notices are sent from                      |
| `BENCHLINE_SYSTEM_ADMINISTRATOR_EMAIL` | not used                          | required: receives lockout notices                                       |
| `BENCHLINE_QUALITY_LEAD_EMAIL`         | not used                          | required: receives lockout notices                                       |

There is no default mode: without `BENCHLINE_MODE` Benchline does not start. `npm run dev` sets `demo`; `npm start` reads the instance's environment.

## What each mode does

- **`demo`** seeds demo records and the demo accounts, discards a database from before versioned migrations, prints lockout notices on the server console, lists the demo accounts on the sign-in screen, offers the Accounts screen (ADR-0011) and serves the workspace from source. `BENCHLINE_MODE=demo npm run unlock -- <username>` unlocks a demo account.
- **`production`** seeds nothing, adds no account and never discards. It refuses a database from before versioned migrations, one newer than the build, and one holding the demo accounts, each left unchanged. It emails lockout notices, refuses the Accounts screen and the unlock command, marks the session cookie `Secure` and serves the built workspace (`npm run build`). An empty database has no accounts until the System administrator's server command issues one (#66).

## Installation checks

- Benchline listens only on 127.0.0.1. The reverse proxy terminates TLS and passes on the `Host` header, since same-origin writes are checked against `https://<Host>`.
- The printed settings match the approved release record.
- A test lockout notice reaches both the System administrator and the Quality lead.
