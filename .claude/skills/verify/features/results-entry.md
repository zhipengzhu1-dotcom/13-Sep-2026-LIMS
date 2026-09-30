# Results entry

An Analyst records a Result for each Test on a Sample assigned to them: the value in the reporting unit, the instrument reading, the injection or sequence ID, the Analysis date and a calculation worksheet. Benchline assigns the qualifier, the Limit and the Conformity statement. A Result over its Limit reads `Does not comply` and waits for a Manager to open its OOS investigation. A correction needs a reason. Once every Test has a Result, the Analyst submits for approval with an Electronic signature (`performed by`).

## Sub-features

- `res-enter` records a Result with its worksheet on an In progress Sample.
- `res-over-limit` records a Result above its Limit and shows it needs an OOS investigation.
- `res-correct` corrects a Result with a reason and keeps the earlier value in history.
- `res-submit-blocked` keeps `Submit for approval…` disabled until every Test has a Result.
- `res-submit` signs the submission; a wrong password signs nothing.

## How to get to it (user POV)

- Analyst (or an Admin with the Sample assigned to them): rail `My work`, open a Sample, `Results` tab. Each Test without a Result shows an entry form; each Result has a `Correct` button.
- The panel footer's `Submit for approval…` opens the `Sign submission for approval` dialog.

## Driving it with agent-browser

Preconditions:

- A fresh instance. `26-00009` is Received and unassigned with one Test, `NIT-001` (Impurity A, Limit 26.5 ng/day). `26-00005` is In progress for Alex Chen with `NIT-002` entered and `NIT-005` not entered.
- A worksheet file: `printf 'injection,area,conc_ng_per_mL\nSEQ-1,12345,310\n' > "$BENCHLINE_VERIFY_DIR/worksheet.csv"`.
- Coordinator assigns `26-00009`: `sign-in.sh coordinator <port>`, `agent-browser find role button click --name "26-00009"`, `agent-browser select 'section[aria-label="Sample"] select[name=assignee]' "Alex Chen"`, `agent-browser find role button click --name "Assign"`. The panel header reads `26-00009` `In progress`.

- **Blocked submit (`res-submit-blocked`).** `sign-in.sh analyst <port>`, `agent-browser find role button click --name "26-00009"`. The Test row reads `— ng/day`, `—`, `Not entered`, followed by the entry form: spinbutton `Result, ng/day`, spinbutton `Instrument reading, ng/mL`, textbox `Injection / sequence ID`, the `Analysis date` date input, button `Calculation worksheet` (`No file chosen`) and `Save`. The footer reads `0 of 1 Tests recorded or not reported` beside `Submit for approval…` `[disabled]`.
- **Over-Limit Result (`res-enter`, `res-over-limit`).** Run `agent-browser find label "Result, ng/day" fill "31.0"`, `agent-browser find label "Instrument reading, ng/mL" fill "310"`, `agent-browser find label "Injection / sequence ID" fill "SEQ-26-00009-01-1"`, `agent-browser focus 'input[name=analysedOn]'; for k in $(date +%m%d%Y | sed 's/./& /g'); do agent-browser press $k; done`, `agent-browser upload 'input[name=worksheet]' "$BENCHLINE_VERIFY_DIR/worksheet.csv"`, `agent-browser find role button click --name "Save"`. The status reads `26-00009 saved to the laboratory record.`, the tab reads `Results 1/1`, and the row shows `31ng/day 310 ng/mL · SEQ-26-00009-01-1 · Analysed <today> · worksheet.csv` (the file name is a link), Conformity `Does not comply Limit 26.5 ng/day · from 2023-08-04 Investigation required`, and `Correct` with `aria-disabled="true"` and the visible reason `This Result does not comply with its Limit and has no OOS investigation, so it cannot be corrected.` The panel region `OOS investigations` reads `Not opened`, `Investigation required`, `A Manager opens the OOS investigation.` No investigation exists yet; the Manager opens it (see [oos-investigations.md](./oos-investigations.md)).
- **Second view of the entry.** `agent-browser find role tab click --name "History"`. The newest group is `<time>Result EnteredAlex Chen` with rows `Test Impurity A (NIT-001 v1)` for `result.value | empty | 31`, `result.instrumentReading`, `result.sequenceId`, `result.attachmentId`, `result.analysedOn`, `result.limit.value | empty | 26.5` and `result.conformity | empty | Does not comply`. The `Audit trail` view also shows a `Worksheet Uploaded` group by Alex Chen, named by the attachment's id.
- **Wrong password on submit (`res-submit`).** `agent-browser find role tab click --name "Results"`, `agent-browser find role button click --name "Submit for approval…"`. The dialog `Sign submission for approval` states `I performed the Tests on Sample 26-00009 and submit their Results for approval. This Electronic signature records performed by Alex Chen with the date and time.` with textbox `Password for Alex Chen` and buttons `Cancel` and `Sign and submit`. Fill `wrong-password` and click `Sign and submit`: the dialog stays with the alert `The password is incorrect. Nothing was signed or saved.` Second view: `Audit trail` group `Failed AttemptAlex Chenanalyst` with reason `Wrong password on an Electronic signature (submitForApproval, Sample 26-00009)`.
- **Submit (`res-submit`).** `PW="$(awk '$1=="analyst"{print $2}' demo-credentials.txt)"`, `agent-browser find label "Password for Alex Chen" fill "$PW" >/dev/null`, `agent-browser find role button click --name "Sign and submit"`, `agent-browser wait --fn '!document.querySelector("dialog[open]")'`. The header reads `26-00009` `Awaiting approval`; region `Electronic signatures` lists `Performed by` `Alex Chen` with a UTC time; the Sample leaves `My work`. Second view: History group `Submitted` with `status | In progress | Awaiting approval`, `signature.meaning | empty | performed by`, `signature.signer | empty | analyst`. The Manager's `Approval` queue shows the row `26-00009 OOS`.
- **Correction (`res-correct`).** Open `26-00005` freshly (`agent-browser find role button click --name "26-00005"`) and click `Correct` on the `NIT-002` row. A correction form opens with `Result, ppm` prefilled `0.02`, empty `Instrument reading, ng/mL`, `Injection / sequence ID` and worksheet, and a textbox `Reason for correction`. Fill it scoped to that form: `F='form:has(input[name=reason])'`, then `agent-browser fill "$F input[name=value]" "0.021"`, `agent-browser fill "$F input[name=instrumentReading]" "0.21"`, `agent-browser fill "$F input[name=sequenceId]" "SEQ-26-00005-01-2"`, `agent-browser upload "$F input[name=worksheet]" "$BENCHLINE_VERIFY_DIR/worksheet.csv"`, `agent-browser fill "$F input[name=reason]" "Integration corrected after peak review."`, `agent-browser click "$F button"`. The row now reads `< LOQ0.021ppm 0.21 ng/mL · SEQ-26-00005-01-2` with a `History (2)` disclosure. Second view: History group `Result EnteredAlex Chen` with `result.value | 0.02 | 0.021 | Integration corrected after peak review.` and the same reason on every changed field.
- **Result with no Limit (`res-enter`).** On `26-00005`, fill the `NIT-005` form (`Result, ppm` `0.05`, reading `0.5`, sequence `SEQ-26-00005-02-1`, today, worksheet) and `Save`. The row reads `0.05ppm` with Conformity `Report No Limit`, the tab reads `Results 2/2`, and `Submit for approval…` is enabled.
- **Proof.** Screenshot plus `snapshot -i` after each step; the History tab and the Audit trail as second views.

## Gotchas

- An over-Limit Result does not open an OOS investigation by itself. It shows `Investigation required`, and a Manager opens it from the Approval queue panel.
- `Submit for approval…` is a plain `disabled` button whose reason (`0 of 1 Tests recorded or not reported`) is footer text with no `aria-describedby` link, unlike `Correct` and `Approve…`, which use `aria-disabled` plus a linked reason. A presentation-rules review should flag it.
- A correction is recorded under the event name `Result Entered`; the old value and the reason are what distinguish it.
- While a correction form is open, the `NIT-005` entry form below has the same field labels; `find label` then hits the first. Scope by form as above.
- After scrolling a long Results tab, the sticky table header can cover `Correct`, and the click fails with `covered by <th>`. Reopen the Sample so the panel is at the top.
- The `Save` status message persists, so a wait on it right after another action returns before the save lands. Wait for `Results 1/1` or the new row text.
- An analyst's `My work` lists only In progress, Returned and Amendment in progress Samples assigned to them. Once submitted, the Sample is reachable only by the Manager's queues until it is returned.
