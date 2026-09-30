# OOS investigations

When a Result does not comply with its Limit, a Manager opens an OOS investigation on it. The assigned Analyst records the Laboratory error check, stating the findings and whether a laboratory error was identified. The Manager then concludes the investigation as Invalidated (a Retest follows) or Confirmed, which closes it. Approval waits until every investigation on the Sample is closed, and a Confirmed OOS must be communicated to the Client before Publishing.

## Sub-features

- `oos-open` opens an investigation on a `Does not comply` Result.
- `oos-list` lists every investigation in the Manager's OOS view.
- `oos-lab-check` records the Analyst's Laboratory error check.
- `oos-conclude` concludes and closes an investigation as Confirmed.
- `oos-invalidate-blocked` refuses Invalidated when the check found no laboratory error.
- `oos-blocks-approval` keeps `Approve…` blocked while an investigation is open or not yet opened.

## How to get to it (user POV)

- Manager or Admin: rail `Approval`, open a Sample whose Result reads `Investigation required`, button `Open investigation` in the panel's `OOS investigations` region.
- Manager or Admin: rail `OOS` (`OOS <n>` counts out-of-specification Results whose investigation is open or not yet opened), the investigation number button (`OOS26-0001`) opens its Sample.
- Analyst: the Sample's panel, region `OOS investigations`. The Analyst reaches that panel only through `My work`, so only while the Sample is In progress, Returned or Amendment in progress (issue #95).

## Driving it with agent-browser

Preconditions:

- A fresh instance. `26-00011` is Awaiting approval with `OOS26-0001` open and its Laboratory error check awaiting Alex Chen.
- For `oos-open`, first run [results-entry.md](./results-entry.md) through **Submit**, so `26-00009` is Awaiting approval with a `Does not comply` Result and no investigation.

- **List (`oos-list`).** `sign-in.sh manager <port>`, `agent-browser find role button click --name "OOS"`. The `h1` reads `OOS investigations`; the region `OOS investigations` has columns `Investigation`, `Status`, `Sample`, `Test`, `Result`, `Opened`, `Lab error check`, `Outcome · cause`, and rows `OOS26-0001` (`Investigation open`, `26-00011`, `Awaiting analyst`), `OOS26-0002` (`Confirmed OOS`, `26-00012`, `No error identified`, `Confirmed`) and `OOS26-0003` (`Invalidated`, `26-00013`, `Error identified`, with the assignable cause).
- **Blocked while open (`oos-blocks-approval`).** `agent-browser find role button click --name "Approval"`, `agent-browser find role button click --name "26-00011"`. `Approve…` shows `[disabled]` in `snapshot -i`; `agent-browser get text 'section[aria-label="Sample"] footer'` begins `OOS investigation OOS26-0001 is open. Approval waits until it is closed.` `Return to analyst` stays enabled.
- **Open (`oos-open`).** Open `26-00009` in the Approval queue. The footer reads `The Impurity A (NIT-001 v1) Result does not comply with its Limit. An OOS investigation must be opened and closed before Approval.` and `Approve…` is blocked. Run `agent-browser find role button click --name "Open investigation"` (no dialog, no signature). The panel region reads `OOS26-0004`, `Investigation open`, `Opened Taylor Brooks, <time>`, `Laboratory error check Awaiting Alex Chen.`, `Conclusion Concluded by a Manager after the laboratory error check.`, and the `OOS` view gains a row `OOS26-0004` `Investigation open` `26-00009`. Second view: History group `OOS Investigation OpenedTaylor Brooks` with `status | empty | Open` and `Test Impurity A (NIT-001 v1) | result.investigationId | empty | OOS26-0004`.
- **Return so the Analyst can reach it.** On `26-00011`, `agent-browser find label "Comment for the analyst" fill "Record the laboratory error check on OOS26-0001."`, `agent-browser find role button click --name "Return to analyst"`. The Sample leaves the Approval queue (see [approval-and-signature.md](./approval-and-signature.md)).
- **Laboratory error check (`oos-lab-check`).** `sign-in.sh analyst <port>`, `agent-browser find role button click --name "26-00011"`. The panel shows `Returned by Taylor Brooks, <time>: Record the laboratory error check on OOS26-0001.` and, in `section[aria-label="Sample"] section[aria-label="OOS investigations"]`, a textbox `Laboratory error check findings`, a checkbox `A laboratory error was identified` and the button `Record check`. Run `agent-browser find label "Laboratory error check findings" fill "Reviewed standard preparation, dilutions and integration; no laboratory error found."`, `agent-browser find role button click --name "Record check"`. The region reads `No laboratory error identified. <findings> Alex Chen, <time>` and `A Manager concludes and closes the investigation.` Second view: Audit trail group `Lab Error Check RecordedAlex Chen26-00011`.
- **Invalidated refused (`oos-invalidate-blocked`).** `sign-in.sh manager <port>`, `agent-browser find role button click --name "OOS"`, `agent-browser find role button click --name "OOS26-0001"`. The conclusion form has radios `Invalidated` (`aria-disabled="true"`) and `Confirmed`, the text `The laboratory error check identified no laboratory error, so the Result cannot be Invalidated.`, and the button `Conclude and close`.
- **Conclude Confirmed (`oos-conclude`).** `agent-browser find role radio click --name "Confirmed"`, `agent-browser find role button click --name "Conclude and close"`. The region reads `Conclusion Confirmed Closed by Taylor Brooks, <time>` and `Client informed Not yet recorded. The Coordinator records it before publishing.`; the rail reads `OOS 1` if `oos-open` ran on this instance (`OOS26-0004` still open), otherwise `OOS` with no count; the list row reads `Confirmed OOS`. Second view: Audit trail group `OOS Investigation ConcludedTaylor Brooks26-00011`.
- **Approval unblocked.** `sign-in.sh analyst <port>`, open `26-00011`, `Submit for approval…`, sign with the analyst password, wait for the dialog to close; the header reads `Awaiting approval`. As `manager`, open `26-00011` in `Approval`: `Approve…` no longer has `aria-disabled`.
- **Proof.** Screenshot plus `snapshot -i` of the OOS list, the panel region before and after each step, and the Audit trail groups named above.

## Gotchas

- The Analyst has no route to a Sample that is Awaiting approval: `My work` excludes it and the Analyst has no Samples or OOS view. The Laboratory error check form renders for the assigned Analyst on an open investigation, but in practice it is reachable only after the Manager returns the Sample. This looks like a workflow gap, not a recipe choice; report it rather than routing around it.
- The `OOS <n>` rail count includes Results still needing an investigation opened, by design (`OOS 2` with one open investigation and one `Investigation required`). Assert on the list rows, not the count.
- Two regions are named `OOS investigations` in the Manager's OOS view (the list and the open panel). Scope reads to `section[aria-label="Sample"] section[aria-label="OOS investigations"]`.
- `--name "OOS"` resolves to the rail button because the rail precedes the `OOS26-…` buttons in DOM order; use the full investigation number for a row.
- The Invalidated conclusion (Laboratory error check with `A laboratory error was identified` checked, then an assignable cause) was not driven. The seeded `OOS26-0003` on `26-00013` shows its end state.
- `26-00011` and `26-00012` are the only seeded Samples with an open and a Confirmed investigation respectively. Restart the instance to get them back.
