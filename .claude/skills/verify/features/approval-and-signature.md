# Approval and signature

A Manager gives Approval to a Sample Awaiting approval with an Electronic signature (`approved by`) whose statement names what was reviewed; Approval locks the Results and issues Certificate of Analysis version 1. Instead, the Manager may return the Sample to its Analyst with a comment. Approval is blocked, with its reason shown, while an OOS investigation is open or not yet opened, and for anyone who did Bench work on the Sample, the Admin included.

## Sub-features

- `appr-sign` opens the `Sign Approval` dialog and signs it.
- `appr-return` returns a Sample to its Analyst with a required comment.
- `appr-blocked-oos` blocks `Approve…` with the OOS reason as linked text.
- `appr-separation` blocks `Approve…` for an Admin who entered a Result on the Sample.

## How to get to it (user POV)

- Manager or Admin: rail `Approval`, open a Sample, footer buttons `Return to analyst` and `Approve…` under the textbox `Comment for the analyst`.
- The Coordinator, Analyst and Quality lead have no Approval view and never see these controls.

## Driving it with agent-browser

Preconditions:

- A fresh instance. `26-00002` is Awaiting approval with no OOS; `26-00011` has `OOS26-0001` open; `26-00013` is Awaiting approval after an Invalidated result and its Retest; `26-00010` is Received and unassigned.

- **Sign Approval (`appr-sign`).** `sign-in.sh manager <port>`, `agent-browser find role button click --name "26-00002"`, `agent-browser find role button click --name "Approve…"`. A native dialog opens (`agent-browser get count 'dialog[open]'` prints `1`) with heading `Sign Approval`, the statement `I give Approval to the Results of Sample 26-00002. The Results, their calculation worksheets, the original instrument data, any OOS investigations, any Not reported Tests and their Nonconforming work Forms, and the Sample's audit trail were reviewed. This Electronic signature records approved by Taylor Brooks with the date and time.`, textbox `Password for Taylor Brooks`, and buttons `Cancel` and `Sign and approve`. Run `PW="$(awk '$1=="manager"{print $2}' demo-credentials.txt)"`, `agent-browser find label "Password for Taylor Brooks" fill "$PW" >/dev/null`, `agent-browser find role button click --name "Sign and approve"`, `agent-browser wait --fn '!document.querySelector("dialog[open]")'`. The header reads `26-00002` `Approved`; region `Electronic signatures` lists `Performed by Alex Chen <UTC>` and `Approved by Taylor Brooks <UTC>` followed by the review statement; region `Certificate of Analysis` appears with `Version 1`, `Approved <UTC>`, `Open printable view` and `Not yet Published.`; the action buttons are gone. Second view: Audit trail group `ApprovedTaylor Brooks26-00002` with `status | Awaiting approval | Approved`, `Certificate of Analysis 26-00002/v1 | version | empty | 1`, `sha256 | empty | <hash>`, `signature.meaning | empty | approved by`, `signature.signer | empty | manager`. The Coordinator's `Publish` count rises by one.
- **Return with no comment (`appr-return`).** Open `26-00013`, click `Return to analyst` with the comment empty. The status alert reads `comment: Too small: expected string to have >=3 characters` and the Sample stays Awaiting approval.
- **Return (`appr-return`).** `agent-browser find role button click --name "Dismiss message"`, `agent-browser find label "Comment for the analyst" fill "Attach the retest's chromatogram to the worksheet."`, `agent-browser find role button click --name "Return to analyst"`. The `h1` count drops by one and `26-00013` leaves the list, while its panel stays open. Second view: History group `ReturnedTaylor Brooks` with `Sample 26-00013 | status | Awaiting approval | Returned | Attach the retest's chromatogram to the worksheet.`; the Analyst sees it in `My work` with `Returned by Taylor Brooks, <time>: <comment>` in the panel.
- **Blocked by OOS (`appr-blocked-oos`).** Open `26-00011`. `Approve…` shows `[disabled]` in `snapshot -i` but is focusable, with `aria-disabled="true"`, and the footer shows `OOS investigation OOS26-0001 is open. Approval waits until it is closed.` Read the link with `agent-browser eval '(() => { const b=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Approve…"); return [b.getAttribute("aria-disabled"), document.getElementById(b.getAttribute("aria-describedby"))?.innerText]; })()'`. Clicking it (`agent-browser find role button click --name "Approve…"`) opens nothing: `agent-browser get count 'dialog[open]'` prints `0`. A Sample with a `Does not comply` Result and no investigation shows instead `The Impurity A (NIT-001 v1) Result does not comply with its Limit. An OOS investigation must be opened and closed before Approval.`
- **Admin separation of duties (`appr-separation`).** `sign-in.sh admin <port>`. Open `26-00010` in `Receiving`, `agent-browser select 'section[aria-label="Sample"] select[name=assignee]' "Jordan Park"`, `Assign`. Rail `My work`, open `26-00010`, enter a Result as in [results-entry.md](./results-entry.md) (`Result, ng/day` `2.0`, reading `20`, sequence, today, worksheet, `Save`), then `Submit for approval…` and sign with the `admin` password in `Password for Jordan Park`; wait for the dialog to close. Rail `Approval`, open `26-00010`. The footer reads `You entered a Result on Impurity A (NIT-002 v1), so another Manager must give Approval.`; `Approve…` has `aria-disabled="true"` linked to that text and opens no dialog; `Return to analyst` stays enabled.
- **Proof.** Screenshot plus `snapshot -i` of the dialog, the signed panel, each blocked footer, and the Audit trail `Approved` and `Returned` groups.

## Gotchas

- The empty-comment refusal shows a raw validation message (`comment: Too small: expected string to have >=3 characters`) rather than a sentence in `CONTEXT.md` terms. The textarea is not `required`, so the browser does not catch it first. Report it as a presentation finding.
- The status message from the Assign step is still on screen when you click `Save` or `Submit for approval…`; a wait on `saved to the laboratory record` returns at once and the next click can land before the button enables. Wait for the specific state (`Results 1/1`, dialog closed, header status).
- `wait --text "Approved"` also matches the `Approved <n>` filter button; wait on the panel header instead.
- Approving `26-00002` moves it into the Publish queue, so a later [publish-and-certificate.md](./publish-and-certificate.md) run sees `Publish 3`.
- A wrong password in `Sign Approval` was not driven here; the same refusal is proven on the submission dialog in [results-entry.md](./results-entry.md) and counts toward lockout.
