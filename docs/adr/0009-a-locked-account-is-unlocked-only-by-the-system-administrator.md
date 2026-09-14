# A Locked account is unlocked only by the System administrator, and no credential is kept in git

21 CFR 11.300(d) requires safeguards that prevent unauthorized use of passwords and detect and report attempted use in an immediate and urgent manner, and §11.300(b)–(c) require password aging and handling of lost or compromised passwords (see `docs/regulatory/fda-electronic-records-and-lab-records.md`, checklist item 13). Until #52 is released, accounts are issued as code changes under the Benchline change control SOP, so git history is the account log (zhipengzhu1-dotcom/13-Sep-2026-SOP-Management#10).

We decided that consecutive Failed attempts, at sign-in and at signing counted together, lock the account once they reach a limit set by lab policy and kept as a constant in the code. The lock ends the session and notifies the System administrator and the Quality lead by email at once. A Locked account never unlocks itself. The System administrator unlocks it with a server command that records the approved Form, and in doing so issues a One-time password that the user replaces at their next sign-in. New accounts start the same way: the code change that issues an account carries its username, printed name and role but no credential, and the One-time password is given to the user in person after checking who they are.

## Considered Options

- **Unlock automatically after a waiting period.** Convenient, but a lockout can be an attempted misuse, and access would come back before anyone looked. Someone guessing a password would simply wait.
- **Unlock by a code change and deploy.** It fits the #52 bridge, but a release just to let one Analyst back in is out of proportion.
- **Put a hashed temporary password in the account's code change.** Anyone with repository access who cracks a weak temporary password could sign and act as that user.
- **Let the first sign-in choose the password.** Whoever knows a username first could take the account.
- **Count failed signature passwords separately.** Someone who has taken over a live session could keep guessing the signature password.

## Consequences

- A user who locks themselves out waits for the System administrator; the lab's Account and access control SOP says how quickly.
- The email is the urgent notice, not the incident record: the System administrator still assesses each lockout and reports it to the Quality lead as an incident, or records why it was not one.
- Changing the lockout limit or the password aging period is a release under change control, not a setting.
- Demo accounts seeded in `demo` mode keep their known passwords and never expire; lockout still applies to them.
