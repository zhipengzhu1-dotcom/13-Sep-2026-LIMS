# Sign-in and session

Every lab user signs in with their own account before seeing any record. A wrong password is refused and recorded as a Failed attempt; signing out, or 15 minutes without activity, ends the session; any user can change their own password from the header. Each of these is an Access event in the Audit trail.

## Sub-features

- `signin-ok` signs in and lands on the role's first view.
- `signin-refused` refuses a wrong password with a visible alert and records a Failed attempt.
- `signout` ends the session and returns to the sign-in form.
- `password-change` opens the Change password dialog and refuses mismatched new passwords.
- `session-expiry` ends an idle session after 15 minutes and records why.

## How to get to it (user POV)

- Open `http://127.0.0.1:<port>/` while signed out: the form `Sign in to Benchline`.
- `Sign out` and `Change password` buttons in the workspace header, for every role.
- Leave a signed-in session idle for 15 minutes.

## Driving it with agent-browser

Preconditions:

- A fresh instance whose `doctor.sh <port>` passes.
- No one signed in: `agent-browser open http://127.0.0.1:<port>/` shows the heading `Sign in to Benchline` with textboxes `Username` and `Password` and the button `Sign in`.

- **Refused sign-in (`signin-refused`).** Run `agent-browser find label "Username" fill "coordinator"`, `agent-browser find label "Password" fill "not-the-password"`, `agent-browser find role button click --name "Sign in"`. The form stays, with an `alert` reading `Incorrect username or password.` and no rail. Second view, after the next step: `Audit trail` shows a group `<time>Failed AttemptMorgan Leecoordinator` whose row reads `Account coordinator | consecutiveFailedAttempts | 0 | 1 | Wrong password at sign-in`.
- **Sign in (`signin-ok`).** Run `.claude/skills/verify/scripts/sign-in.sh coordinator <port>`. It prints `signed in as coordinator`; `nav[aria-label="Main navigation"]` appears with `Receiving 3` first, the `h1` reads `Receiving 3`, and the header shows `Morgan Lee` / `Coordinator`. Repeat for `analyst` (`h1` `My work`), `manager` (`Approval queue`), `quality-lead` (`Sample register`). Second view: `Audit trail` group `Signed In` with `Account coordinator | session | empty | signed in`; the same group resets the counter with `consecutiveFailedAttempts | 1 | 0`.
- **Change password dialog (`password-change`).** Run `agent-browser find role button click --name "Change password"`. A dialog `Change your password` opens with textboxes `Current password for Morgan Lee`, `New password`, `Confirm new password` and buttons `Cancel` and `Change password`. Fill the current password from the credentials file (`PW="$(awk '$1=="coordinator"{print $2}' demo-credentials.txt)"`, then `agent-browser find label "Current password for Morgan Lee" fill "$PW" >/dev/null`), then `agent-browser find label "New password" fill "verify-new-pass-1"` and `agent-browser find label "Confirm new password" fill "verify-new-pass-2"`, and click `Change password`. The dialog stays open with the alert `The two new passwords do not match.` Run `agent-browser find role button click --name "Cancel"`; `agent-browser get count 'dialog[open]'` prints `0`.
- **Sign out (`signout`).** Run `agent-browser find role button click --name "Sign out"`. The form `Sign in to Benchline` returns with a `status` reading `You have signed out.`, and `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<port>/api/workspace` prints `401`. Second view (sign in again): `Audit trail` group `Signed Out` with `Account coordinator | session | signed in | empty`.
- **Session expiry (`session-expiry`).** Sign in, leave the browser untouched for 15 minutes (use a Monitor until-loop, not a foreground sleep), then click any rail button. The sign-in form returns with `Your session has ended. Sign in to continue.` Second view: `Audit trail` group `<time>Session ExpiredBenchline<account>` with `session | signed in | empty` and the reason `Ended after 15 minutes without activity; last active <ISO time>`.
- **Proof.** Screenshot and `snapshot -i` after each step, plus the Audit trail filtered to `Access events` (see [audit-trail.md](./audit-trail.md)).

## Gotchas

- The sign-in form prints the demo password rule on screen. Evidence files may show it; recipes, commits and PR text never spell a password.
- A wrong password at sign-in and a wrong password in a signing dialog count toward the same lockout of five. One refused sign-in per account per instance is plenty.
- Completing the password change would change the account's password and break `sign-in.sh` for that account on this instance. Prove the refusal and cancel, or restart the instance afterwards.
- Killing the browser leaves its session open on the server; 15 minutes later a `Session Expired` row by `Benchline` appears in the Audit trail. Expect those rows in any tally of Access events.
- Session expiry was observed only as that Audit trail row from an abandoned session; the on-screen `Your session has ended` message is the code path for a 401, not yet captured in evidence.
