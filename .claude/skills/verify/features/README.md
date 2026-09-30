# Benchline verification map

This directory holds the recipes for proving what Benchline's workspace does, one file per feature. Read this index before driving, then open the feature file for the change and drive every entry point it lists. Every handle here was observed in the running demo; the commands assume the exports and scripts in [`../SKILL.md`](../SKILL.md).

## Baseline preconditions

- Start your own instance on your own port with `.claude/skills/verify/scripts/start.sh <port>`, and require every line of `doctor.sh <port>` to read `ok`. A `note` about uncommitted `src/` changes is expected while a UI change is in progress.
- Set `AGENT_BROWSER_SESSION=benchline-verify-<port>` so your browser never touches another driver's.
- Sign in with `.claude/skills/verify/scripts/sign-in.sh <account> <port>`. It signs out whoever is signed in first.
- A freshly started instance holds the same seed every time. Sample numbers are stable; due dates are relative to the start day.

| Sample | State on a fresh instance | Used by |
| --- | --- | --- |
| `26-00001` | Approved, no OOS, Northstar Pharma | publish-and-certificate |
| `26-00002` | Awaiting approval, no OOS, Urgent | approval-and-signature |
| `26-00003`, `26-00004` | Published (`26-00004` carries an Amendment) | sample-register |
| `26-00005` | In progress, Alex Chen, raw material, Test `NIT-005` not entered | results-entry |
| `26-00006` | Returned, Alex Chen, raw material | sample-register |
| `26-00007`, `26-00009`, `26-00010` | Received, unassigned, finished products | results-entry, approval-and-signature |
| `26-00008` | On hold with two Receipt deviations, the only held Sample | receiving-and-holds |
| `26-00011` | Awaiting approval, `OOS26-0001` open, Laboratory error check awaiting Alex Chen | oos-investigations, approval-and-signature |
| `26-00012` | Approved with Confirmed `OOS26-0002`, Client not yet informed | publish-and-certificate |
| `26-00013` | Awaiting approval, `OOS26-0003` Invalidated with a Retest | approval-and-signature |

The next Submission received is `S26-0007` with Sample `26-00014`. The next OOS investigation opened is `OOS26-0004`.

Accounts and printed names: `coordinator` Morgan Lee, `analyst` Alex Chen, `analyst-2` Sam Rivera, `manager` Taylor Brooks, `admin` Jordan Park, `quality-lead` Casey Morgan.

Rail names on a fresh instance (a count is dropped when it is zero, as in `OOS` or `My work`):

| Account | Rail buttons |
| --- | --- |
| `coordinator` | `Receiving 3`, `Holds 1`, `Publish 2`, `Samples`, `Methods`, `Audit trail` |
| `analyst` | `My work 2`, `Methods`, `Audit trail` |
| `manager` | `Approval 3`, `OOS 1`, `Methods`, `Audit trail` |
| `admin` | `Receiving 3`, `Holds 1`, `Samples`, `Publish 2`, `My work`, `Approval 3`, `OOS 1`, `Methods`, `Audit trail`, `Accounts` |
| `quality-lead` | `Samples`, `Invalid signatures`, `Methods`, `Audit trail` |

## Driving conventions

- **Names are substrings.** `agent-browser find role button click --name "<text>"` matches any button whose name contains the text and clicks the first in DOM order. The rail comes first, so `--name "Publish"` opens the Publish queue, `--name "OOS"` the OOS view and `--name "History"` the History tab. Give a panel button its full name (`"Publish version 1"`, `"Approve…"`, `"Submit for approval…"`).
- **Passwords.** Read a signer's password into a variable at run time and never print it: `PW="$(awk '$1=="manager"{print $2}' demo-credentials.txt)"`, then `agent-browser find label "Password for Taylor Brooks" fill "$PW" >/dev/null`.
- **Selects.** Use `agent-browser select '<css>' "<option text>"`. Form selects have stable names (`select[name=assignee]`, `select[name=decision]`, `select[name=channel]`, `select[name=clientId]`). The register and Audit trail filters have none, so address them by an option they hold, as in `select:has(option[value="northstar"])`. `find label ... select` does not exist, and `label:has-text(...)` selectors report `Done` while doing nothing.
- **Date inputs.** `fill` leaves a `type=date` input empty. Focus it, then press each digit of `MMDDYYYY`: `agent-browser focus 'input[name=analysedOn]'; for k in $(date +%m%d%Y | sed 's/./& /g'); do agent-browser press $k; done`. A date input you already edited keeps focus on its year segment; press `ArrowLeft` twice first. `datetime-local` inputs (Client instruction, Client informed, Publish) arrive filled with the current time.
- **Keys.** `agent-browser press` is safe for `j`, `k`, `/`, `Escape`, `Enter`, arrows, and digits in a focused date input, because the page consumes them. A printable key the page does not consume, such as `r` or `n`, makes agent-browser 0.37.1 repeat the keydown thousands of times a second: the workspace refetches `/api/workspace` in a loop and the browser wedges within a minute. Press the `Refresh` or `Receive submission` button instead.
- **Waiting.** Every successful command shows the status `<Sample> saved to the laboratory record.` and it stays until dismissed, so a second wait on it returns at once. Wait on the end state: `agent-browser wait --fn '!document.querySelector("dialog[open]")'` after signing, or `agent-browser wait --fn 'document.querySelector("section[aria-label=Sample] header")?.innerText.includes("Approved")'` for a status change. `wait --text "<Status>"` alone also matches the status filter buttons.
- **Reading the panel.** The open Sample is `section[aria-label="Sample"]`; its header shows the Sample number and status, its footer the actions and any blocker. `agent-browser get text '<css>'` is the compact read. `snapshot -s` prints each node twice; pipe it through `awk '!seen[$0]++'`.
- **Region names repeat.** In the OOS view, the list and the open Sample's panel are both regions named `OOS investigations`. Scope the panel's with `section[aria-label="Sample"] section[aria-label="OOS investigations"]`.
- **Restarting.** Mutations are permanent on an instance. When a recipe needs a Sample in its fresh state and an earlier recipe moved it, run `stop.sh <port> && start.sh <port>`. If the browser stops answering, `agent-browser close` and sign in again; an abandoned session later appears in the Audit trail as `Session Expired` by `Benchline`.
- **Failed attempts.** Five consecutive Failed attempts, counting sign-in and signing together, lock an account until an Admin unlocks it. Keep wrong-password probes to one per account per instance.

## Proof and skip reporting

- Capture the action and the resulting state as a screenshot plus `agent-browser snapshot -i > <name>.a11y.txt`, per step, under `$BENCHLINE_VERIFY_DIR/evidence/<run>/`.
- Prove every mutation in a second view: the Sample's `History` tab (newest first, grouped as `<time><Event><person>` with Record, Field, Old value, New value and Reason columns) and the `Audit trail` view.
- Prove a blocked control as a role it blocks: read its `aria-disabled`, its `aria-describedby` text, and that clicking it opens nothing. Prove a hidden control as a role that can never use it (the Quality lead sees no action at all).
- Record the feature ID, account and Sample with every artifact.
- Report an entry point you could not drive with the command tried and the unmet precondition. Never report it as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 and one paragraph on the user-visible behaviour, then exactly four H2 sections in this order.

1. `Sub-features` lists short IDs, one line each.
2. `How to get to it (user POV)` lists every entry point by role.
3. `Driving it with agent-browser` starts with `Preconditions:` and pairs each action with exact commands and the observable end state that proves it.
4. `Gotchas` lists what can waste or invalidate a run.

Name only user paths, stable handles, required state, commands and observable proof. Use `CONTEXT.md` terms.

## Features

- [Sign-in and session](./sign-in-and-session.md) covers sign-in, refusal of a wrong password, sign-out, the Change password dialog and session expiry.
- [Sample register](./sample-register.md) covers each role's queues, status filters, Client, Material type and Due filters, search, keyboard movement and the Sample panel's Results, Receipt and History tabs.
- [Results entry](./results-entry.md) covers an Analyst entering a Result with its worksheet, a Result over its Limit, a correction, and submitting for approval with an Electronic signature.
- [OOS investigations](./oos-investigations.md) covers opening an investigation, the Laboratory error check, the Manager's conclusion, and what blocks Approval meanwhile.
- [Approval and signature](./approval-and-signature.md) covers Approval with its Electronic signature, Return to analyst, a blocked Approve with its reason, and the Admin's separation of duties.
- [Receiving and holds](./receiving-and-holds.md) covers receiving a Submission, recording a Receipt deviation, the Client's instruction, and assignment.
- [Publish and certificate](./publish-and-certificate.md) covers the Certificate of Analysis dialog, recording that the Client was informed of a Confirmed OOS, Publishing, and starting an Amendment.
- [Audit trail](./audit-trail.md) covers the Audit trail view's columns and filters and the Sample History tab as the second view.
