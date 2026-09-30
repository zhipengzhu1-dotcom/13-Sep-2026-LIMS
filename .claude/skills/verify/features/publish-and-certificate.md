# Publish and certificate

An Approved Sample's Certificate of Analysis is issued at Approval and viewed from the Sample panel in a printable dialog. The Coordinator Publishes it by recording the recipients, channel and time (Benchline does not send it), which never changes its date of issue. A Confirmed OOS blocks Publishing until the Coordinator records that the Client was informed. A Published Sample can have an Amendment started, with a reason, by the Coordinator or a Manager.

## Sub-features

- `coa-view` opens the Certificate dialog and shows its ISO/IEC 17025 content.
- `pub-blocked-oos` blocks `Publish version 1` until the Client is recorded as informed of a Confirmed OOS.
- `pub-client-informed` records who was informed, what was sent and when.
- `pub-publish` records the publication.
- `amend-start` starts an Amendment with a reason.

## How to get to it (user POV)

- Anyone who can see the Sample: panel region `Certificate of Analysis`, button `Open printable view`.
- Coordinator or Admin: rail `Publish` lists Approved Samples; the panel shows textbox `Recipients`, combobox `Issued by` (`email`, `portal`, `print`, `other`), textbox `Details (optional)`, the `When` date-time, and `Publish version <n>`.
- Coordinator or Admin, on a Confirmed OOS: panel region `OOS investigations`, textbox `Client contact who was informed`, textarea `What data and Laboratory error check findings were sent to the Client`, `When the Client was informed`, button `Record Client informed`.
- Coordinator, Manager or Admin, on a Published Sample: textbox `Reason for the Amendment`, button `Start amendment`.

## Driving it with agent-browser

Preconditions:

- A fresh instance, `sign-in.sh coordinator <port>`. `26-00001` is Approved with no OOS; `26-00012` is Approved with Confirmed `OOS26-0002` and the Client not yet informed. The rail reads `Publish 2`.

- **Certificate dialog (`coa-view`).** `agent-browser find role button click --name "Publish"`, `agent-browser find role button click --name "26-00001"`. Region `Certificate of Analysis` reads `Version 1`, `Approved <UTC>`, `Open printable view`, `Not yet Published.` Run `agent-browser find role button click --name "Open printable view"`. A dialog named `Certificate of Analysis, Sample 26-00001, version 1` opens with buttons `Print or save as PDF` and `Close`, and sections `Certificate` (`Date of issue`, `Dates of testing`), `Client and Submission`, `Sample`, `Results` (columns `Analyte`, `Method`, `Analysis date`, `Result`, `Unit`, `Limit`, `Conformity statement`, `OOS investigation`), the Limit source per Analyte, `Decision rule`, `Statements`, the `†` note for Client-supplied information, `Electronic signatures` (`Meaning`, `Printed name`, `Date and time`, with `Performed by Alex Chen` and `Approved by Taylor Brooks`), a `SHA-256` line and `End of Certificate of Analysis`. `agent-browser get text 'dialog[open]'` captures it all. Close with `agent-browser find role button click --name "Close"`.
- **Publish (`pub-publish`).** Click `Publish version 1` with `Recipients` empty: nothing happens, because the browser's own `required` check stops the form (`validity.valid` is false; no alert appears). Then `agent-browser find label "Recipients" fill "priya.raman@northstar.example"`, `agent-browser select 'section[aria-label="Sample"] select[name=channel]' "portal"`, `agent-browser find role button click --name "Publish version 1"`, `agent-browser wait --fn 'document.querySelector("section[aria-label=Sample] header")?.innerText.includes("Published")'`. No signature is asked for. The header reads `Published`; the Certificate region ends `Published <UTC> by Morgan Lee, portal, to priya.raman@northstar.example`; the publish form is replaced by `Reason for the Amendment` and `Start amendment`; the `h1` count drops by one. Second view: Audit trail group `PublishedMorgan Lee26-00001` with `status | Approved | Published` and `Certificate of Analysis 26-00001/v1 | publication.recipients.0 | empty | priya.raman@northstar.example`.
- **Start an Amendment (`amend-start`).** `agent-browser find label "Reason for the Amendment" fill "Client reported a transcription error in the batch number."`, `agent-browser find role button click --name "Start amendment"`, wait for the header to read `Amendment in progress`. The footer reads `Results are entered by Alex Chen.` Second view: Audit trail group `Amendment StartedMorgan Lee26-00001` with `status | Published | Amendment in progress | <reason>`.
- **Blocked by a Confirmed OOS (`pub-blocked-oos`).** Open `26-00012` in `Publish`. `Publish version 1` has `aria-disabled="true"` linked to `OOS investigation OOS26-0002 confirmed an OOS. Record that the Client was informed before publishing.` The panel region `OOS investigations` shows the three `Client informed` fields, each labelled with a visible `required`, and `Record Client informed`.
- **Client informed (`pub-client-informed`).** `agent-browser find label "Client contact who was informed" fill "Grace Lindqvist, QC Laboratory Supervisor (phone)"`, `agent-browser find label "What data and Laboratory error check findings were sent" fill "Result 28.7 ng/day against Limit 26.5 ng/day, worksheet and Laboratory error check findings."`, `agent-browser find role button click --name "Record Client informed"`, `agent-browser wait --text "recorded by Morgan Lee"`. The region reads `Client informed Grace Lindqvist, …, <time> recorded by Morgan Lee, <time>` and `Sent to the Client: <text>`; `Publish version 1` loses `aria-disabled`. Publish it as above; the header reads `Published`. Second view: Audit trail group `Client Informed Of Confirmed OOSMorgan Lee26-00012`.
- **OOS on the Certificate.** On a published Sample with a Confirmed OOS, `Open printable view` shows the Result row with `Does not comply` and `OOS26-…, Confirmed, for Result <value> ng/day` in the `OOS investigation` column. A Sample received with a Receipt deviation whose Client said proceed also prints `Receipt deviations` with `Disclaimer: the Client instructed the laboratory to proceed despite this deviation, so these Results may be affected by it: Impurity A (NIT-001 v1).`
- **Proof.** Screenshot (`--full` for the dialog) plus `snapshot -i` of the Certificate dialog, each panel state, and the Audit trail groups.

## Gotchas

- `Print or save as PDF` opens the browser's print flow; it was not driven headless. Prove the Certificate from the dialog's text and a full-page screenshot.
- `find role button click --name "Publish"` opens the rail's Publish queue because the rail precedes the panel; use `"Publish version 1"` for the panel button.
- An empty `Recipients` gives no on-screen message in a headless run; check `validity.valid` if the refusal itself is under test.
- `26-00012` is the only seeded Approved Sample with a Confirmed OOS; after it is Published, restart for another run.
- Approving `26-00002` in another recipe adds it to the Publish queue (`Publish 3`).
- Starting an Amendment was driven as the Coordinator only. The Manager's entry point comes from `role-permissions.txt`; drive it separately before claiming it.
- `wait --text "Published"` matches the `Published <n>` filter button; wait on the panel header.
