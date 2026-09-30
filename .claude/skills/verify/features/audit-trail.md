# Audit trail

Every command and Access event writes audit trail entries that nobody can edit or delete. The lab-wide `Audit trail` view, open to every role, lists them newest first, grouped by event, with who, when, the record, the field, the old and new values and the reason, and filters by event type and UTC date. Each Sample's `History` tab shows the same entries for that Sample, and is the second view every other recipe checks.

## Sub-features

- `audit-columns` shows grouped entries with Record, Field, Old value, New value and Reason.
- `audit-type` narrows to Access events or Record changes.
- `audit-dates` narrows by `From (UTC)` and `To (UTC)`.
- `audit-history` shows one Sample's entries in its `History` tab.

## How to get to it (user POV)

- Every role: rail `Audit trail`.
- Every role that can open a Sample: panel tab `History <n>`.

## Driving it with agent-browser

Preconditions:

- A fresh instance with at least one refused sign-in and one recorded action (for example after the first steps of [sign-in-and-session.md](./sign-in-and-session.md) and [receiving-and-holds.md](./receiving-and-holds.md)), signed in as any account.

- **Columns (`audit-columns`).** `agent-browser find role button click --name "Audit trail"`. The `h1` reads `Audit trail`; column headers are `Record`, `Field`, `Old value`, `New value`, `Reason`. Each event is a `rowheader` reading `<Mon D, HH:MM><Event><Printed name><record ids or account>`, such as `Sep 29, 19:39AssignedMorgan Lee26-00014` or `Sep 29, 19:21Failed AttemptMorgan Leecoordinator`, followed by one row per changed field, such as `Sample 26-00014 | assignee | empty | analyst`. An absent value reads `empty`. Newest events come first. Save the whole trail with `agent-browser get text body > "$BENCHLINE_VERIFY_DIR/evidence/<run>/audit.txt"` and grep it for the group a recipe names.
- **Event type (`audit-type`).** The combobox `Event type` offers `All entries`, `Access events`, `Record changes`. Run `agent-browser select 'select:has(option[value]):not([name])' "Access events"`. Only account groups remain (`Signed In`, `Signed Out`, `Failed Attempt`, `Session Expired`), each with a `Record` of `Account <username>`, and a count `N of M entries` appears beside the filters. `"Record changes"` shows the complement, and the two counts add up to `M`.
- **Dates (`audit-dates`).** Run `agent-browser select 'select:has(option[value]):not([name])' "All entries"`, then `agent-browser focus 'input[type=date]'` (the first date input is `From (UTC)`) and `for k in $(date -u -v+1d +%m%d%Y | sed 's/./& /g'); do agent-browser press $k; done`. The count reads `0 of M entries` and no group remains. Enter today's UTC date instead (`date -u +%m%d%Y`, after `ArrowLeft` twice) to get today's entries back.
- **Sample History (`audit-history`).** Open any Sample and `agent-browser find role tab click --name "History"`. The tabpanel has the same five columns, only that Sample's groups (its Submission's `Received` group included), newest first. The tab's count rises after each action on the Sample.
- **Proof.** Screenshot plus `snapshot -i` of the unfiltered view, each filter state, and the saved `audit.txt`.

## Gotchas

- Displayed times are in the browser's local time zone (the host's; EDT on the demo machine), not UTC, while `From (UTC)` and `To (UTC)` filter by UTC dates (issue #92). Evening runs cross the UTC day boundary; compute dates with `date -u`.
- The type select and date inputs have no `name`; the selectors above are the stable handles. `fill` leaves the date inputs empty.
- Each `sign-in.sh` call adds `Signed Out` and `Signed In` groups, and each abandoned browser adds a `Session Expired` group by `Benchline` 15 minutes later. Count record changes, not Access events, when a recipe's proof is a tally.
- `Worksheet Uploaded` groups name the attachment's UUID, not the Sample; they sit next to the `Result Entered` group that uses the attachment.
- Signature groups show `signature.meaning` and `signature.signer` (the account id, such as `manager`); the printed name is in the group header.
- The view renders every entry at once (over a thousand after a few recipes). Use `get text body` and grep rather than `snapshot -i`.
