# Before Go-live, the Admin manages accounts on an Accounts screen

Benchline is still a demo: paper is the official record and Benchline's developer holds the Admin role with full permissions (ADR-0001, ADR-0007). Accounts were fixed in code, so adding a person, changing a role or letting a Locked account back in took a code change, and ADR-0009's server command (#66) does not exist yet.

We decided that, until Go-live, the Admin manages accounts on an Accounts screen in the workspace: add a user with a username, printed name, role and password; change a printed name or role; deactivate or reactivate; set a new password; and unlock a Locked account, clearing its consecutive Failed attempts. The Admin may change their own account, but never leave Benchline without an active Admin. Laboratory users come from the accounts store, so a user added on the screen can act and sign at once. Every change is an Access event in the audit trail (ADR-0010), naming the Admin and never the password. A username is never reused, and a deactivated user stays in the user list so the record keeps naming them.

If the only Admin locks themselves out, a demo server command on the lab server (`BENCHLINE_MODE=demo npm run unlock -- <username>`) unlocks the account, recorded as an unlock Access event naming the operating-system user who ran it. It refuses to run in production, where the System administrator's server command (#66) unlocks with a One-time password and the approved Form.

## Considered Options

- **Wait for the System administrator's server command (#66).** It is the Go-live design, but it leaves the demo with no way to add a person or unlock an account without a code change.
- **Unlock with a One-time password.** Part of the Go-live design (ADR-0009, #65); the demo keeps its known passwords instead.
- **Nobody changes their own account (#52).** Kept for Go-live; set aside for the demo, where one person holds the Admin role.

## Consequences

- This departs from ADR-0007, ADR-0009 and #52 for the demo only. Before Go-live, the Accounts screen is removed or handed to the System administrator, and account changes follow the approved Form (#52, #66). That work is a Go-live blocker.
- A Locked account's past Failed attempts and its lockout stay in the audit trail after an unlock; only the count is cleared.
- Renaming a user changes the name the workspace shows on their past audit entries, which record the username; Electronic signatures keep the printed name at signing.
- No identity check, One-time password or password aging applies to accounts added this way (§11.100(b), §11.300(b)–(c)).
