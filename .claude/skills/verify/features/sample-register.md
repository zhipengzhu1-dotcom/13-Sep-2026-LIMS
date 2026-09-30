# Sample register

Every list of Samples in the workspace is one register: a queue per role, narrowed by status filter buttons, Client, Material type and Due date, searchable, and driven by keyboard. Choosing a Sample opens its panel beside the list, with `Results`, `Receipt` and `History` tabs and only the actions the signed-in role may take.

## Sub-features

- `reg-queues` shows each role its own queues with live counts.
- `reg-status` narrows by status with the filter buttons.
- `reg-refine` narrows by Client, Material type and `Due on or before`.
- `reg-search` focuses search with `/`, matches text, and clears with `Esc`.
- `reg-keys` moves the selection with `j`/`k`, closes the panel with `Esc`, and refreshes.
- `reg-panel` opens a Sample and shows its Results, Receipt and History tabs.
- `reg-readonly` shows the Quality lead the same panel with no actions.

## How to get to it (user POV)

- Coordinator: rail `Receiving` (Received), `Holds` (On hold), `Publish` (Approved, awaiting Publishing), `Samples` (every Sample).
- Analyst: rail `My work` (their In progress, Returned and Amendment in progress Samples only).
- Manager: rail `Approval` (Awaiting approval).
- Admin: every queue above. Quality lead: `Samples` and `Invalid signatures`.
- In any queue: the Sample number button in a row, or `j`/`k`.

## Driving it with agent-browser

Preconditions:

- A fresh instance, signed in with `.claude/skills/verify/scripts/sign-in.sh coordinator <port>`.

- **Queues (`reg-queues`).** Run `agent-browser snapshot -i | grep 'button "'`. The rail reads `Receiving 3`, `Holds 1`, `Publish 2`, `Samples`, `Methods`, `Audit trail`, and the `h1` reads `Receiving 3` with rows `26-00007`, `26-00009`, `26-00010`. Run `agent-browser find role button click --name "Samples"`; the `h1` reads `Sample register 13` and the grid `Sample register` lists 11 rows. Sign in as `analyst`: `h1` `My work 2` with rows `26-00005` and `26-00006` only. As `manager`: `h1` `Approval queue 3` with `26-00002`, `26-00013`, `26-00011`.
- **Status filters (`reg-status`).** On `Samples`, the buttons read `Active 11`, `On hold 1`, `Received 3`, `In progress 2`, `Returned 1`, `Awaiting approval 3`, `Approved 2`, `Published 2`, `Amendment in progress 0`, `Withdrawn 0`, `All 13`, with `Active` pressed. Run `agent-browser find role button click --name "Published 2"`. The rows become `26-00004` and `26-00003`, and `agent-browser eval '[...document.querySelectorAll("button[aria-pressed=true]")].map(b=>b.textContent)'` returns only the Published button. Click `All 13` to see all 13.
- **Client (`reg-refine`).** Run `agent-browser select 'select:has(option[value="northstar"])' "Harbor Health Products"`. Rows become `26-00012`, `26-00013`, `26-00011`, and the filter buttons recount (`Active 3`, `All 3`). Reset with `"All Clients"`.
- **Material type (`reg-refine`).** Run `agent-browser select 'select:has(option[value="raw material"])' "raw material"`. Rows become `26-00005` and `26-00006`. Reset with `"All"`.
- **Due on or before (`reg-refine`).** Run `agent-browser focus 'input[type="date"]'` and press the digits of the day three days after the instance started: `for k in $(date -u -v+3d +%m%d%Y | sed 's/./& /g'); do agent-browser press $k; done` (a UTC date: the seed's Due dates are UTC days). With `All` pressed the buttons read `All 7`, and the last row is `26-00005` (due in 3 days). `agent-browser get value 'input[type="date"]'` prints the ISO date. Then clear it with `agent-browser find role button click --name "Clear filters"` (shown only while a filter is set); every later step assumes no refine.
- **Search (`reg-search`).** Take focus out of any input with `agent-browser eval 'document.activeElement.blur()'` (`Escape` does not leave the date input), then `agent-browser press /`. `agent-browser eval 'document.activeElement.getAttribute("aria-label")'` prints `Search samples`. Run `agent-browser keyboard type "olmesartan"`; the rows become `26-00012`, `26-00013`, `26-00011`, and the footer reads `3 of 13 shown`. Press `Escape`; the search box is empty and loses focus.
- **Keyboard selection (`reg-keys`).** With focus outside any input, `agent-browser press j` selects the first row (its `row` shows `[selected]` in `snapshot -i`) and opens its panel; a second `j` moves to the next row and the panel follows; `k` moves back. `agent-browser press Escape` closes the panel: `agent-browser get count 'section[aria-label="Sample"]'` prints `0`. For refresh, click `Refresh`; the footer `Updated HH:MM` stamp moves to the current minute.
- **Panel tabs (`reg-panel`).** Run `agent-browser find role button click --name "26-00011"`. `section[aria-label="Sample"]` opens: header `26-00011` `Awaiting approval` `Urgent`, buttons `Export record copy` and `Close sample`, heading `Olmesartan medoxomil tablets 40 mg`, tablist `Sample details` with tabs `Results 2/2` (selected), `Receipt`, `History <n>`. The Results tab shows columns `Test`, `Result`, `Conformity`, `Entered`, the region `OOS investigations` (`OOS26-0001` `Investigation open`) and the region `Electronic signatures` (`Performed by` `Alex Chen` with a UTC time). Run `agent-browser find role tab click --name "Receipt"`; the tabpanel lists the Submission (`S26-0006`, Client contact `Grace Lindqvist`, `Received by Morgan Lee`, courier, temperature) and the Sample (`Client sample ID HH-OLM-40-01`, `Maximum daily dose 40 mg/day`, `Due date`, `Priority Urgent`). Run `agent-browser find role tab click --name "History"`; the tabpanel has columns `Record`, `Field`, `Old value`, `New value`, `Reason`, newest group first (`<time>OOS Investigation OpenedTaylor Brooks`).
- **Read-only panel (`reg-readonly`).** Sign in as `quality-lead`, click `All 13`, open `26-00012`. The panel has only `Export record copy`, `Close sample` and the Certificate's `Open printable view`; no Publish, Client informed, Assign or signing control exists.
- **Proof.** For each step, `agent-browser screenshot $BENCHLINE_VERIFY_DIR/evidence/<run>/reg-<id>.png` and `agent-browser snapshot -i > .../reg-<id>.a11y.txt`.

## Gotchas

- The status filter buttons recount for Client, Material type and Due, but not for search; the footer `N of M shown` reflects search.
- `In progress` includes Returned Samples; `Returned` narrows to them. `Active` hides Published and Withdrawn.
- `snapshot -i` never prints the pressed state of a filter button; read `aria-pressed` with `eval`.
- `fill` does nothing on the Due date input; use focus and digit presses. Due dates are relative to the UTC day the instance started, so compute the date with `date -u` rather than hard-coding it.
- `Escape` does not leave a focused date input (the window key handler ignores inputs); click an empty part of the page or run `agent-browser eval 'document.activeElement.blur()'` before pressing `/`.
- Pressing `r` or `n` through `agent-browser press` floods the page with repeated keydowns and wedges the browser (agent-browser 0.37.1). The `r` shortcut refreshes once when a real keyboard presses it; with agent-browser, prove refresh with the `Refresh` button and say the `r` key was not driven.
- A panel's heading is the product name, not the Sample number; the number is in the panel header.
- Switching rail views closes the panel, even when the Sample is listed in the new view; reopen it by its number. Within one view the panel stays open after an action moves the Sample out of that queue (a returned Sample stays open in the Approval queue).
