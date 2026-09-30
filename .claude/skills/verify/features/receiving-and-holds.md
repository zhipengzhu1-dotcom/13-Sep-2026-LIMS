# Receiving and holds

The Coordinator receives a Submission of one or more Samples with its full receipt record, assigns each Sample to one Analyst, and records any Receipt deviation, which puts the Sample On hold. A held Sample waits for the Client's instruction: proceed returns it to Received, withdraw makes it Withdrawn. Nothing can be assigned or tested while it is On hold.

## Sub-features

- `recv-submission` receives a Submission and creates its Sample.
- `recv-deviation-at-receipt` receives a Sample with a Receipt deviation, which lands it On hold.
- `hold-deviation` records a Receipt deviation on a Received Sample.
- `hold-proceed` records the Client's instruction to proceed.
- `hold-withdraw` records the Client's instruction to withdraw.
- `recv-assign` assigns a Received Sample to an Analyst.

## How to get to it (user POV)

- Coordinator or Admin: header button `Receive submission` (any view) opens the dialog `Receive submission`.
- Rail `Receiving` lists Received Samples; rail `Holds` lists On hold Samples.
- In a Received Sample's panel: combobox `Assigned analyst` with `Assign`, and the region `Receipt deviations` with the disclosure `Record a Receipt deviation`.
- In a held Sample's panel, region `Receipt deviations`: combobox `Client instruction`, textbox `Given by`, the `When` date-time, and `Record instruction`.

## Driving it with agent-browser

Preconditions:

- A fresh instance, `sign-in.sh coordinator <port>`. `26-00008` is the only On hold Sample. The next receipt becomes `S26-0007` with Sample `26-00014`.

- **Receive (`recv-submission`).** `agent-browser find role button click --name "Receive submission"`, then wait for `dialog[open]`. Fill the required fields by name: `agent-browser select 'select[name=clientId]' "Northstar Pharma"`, then `for kv in "clientContactName=Dana Verify" "clientContactRole=QC Lead" "clientContactEmail=dana.verify@northstar.example" "clientContactPhone=+1 555 0199" "product-0=Verify tablets" "batch-0=VF-0001" "quantity-0=50" "conditionOnReceipt-0=Intact" "maximumDailyDose-0=40"; do agent-browser fill "input[name=${kv%%=*}]" "${kv#*=}"; done`. Set the due date: `agent-browser focus 'input[name=dueDate-0]'; for k in $(date -u -v+10d +%m%d%Y | sed 's/./& /g'); do agent-browser press $k; done`. Choose a Method: `agent-browser find label "NIT-001 v1" check`. Submit with `agent-browser find role button click --name "Receive submission"` (the header button is inert behind the modal, so this hits the dialog's). The dialog closes; the status reads `S26-0007 received with Sample 26-00014.`; the rail reads `Receiving 4`; the row `26-00014 Received <due> 0/1 Verify tablets finished product Northstar Pharma VF-0001 Unassigned` is selected with its panel open. Second view: Audit trail group `<time>ReceivedMorgan Lee26-00014, S26-0007`.
- **Deviation on a Received Sample (`hold-deviation`).** In `26-00014`'s panel, `agent-browser find text "Record a Receipt deviation" click` opens the form: combobox `Kind` (`damaged package`, `broken seal`, `temperature excursion`, `insufficient quantity`, `other`), textbox `What was found`, button `Record and hold`. Run `agent-browser select 'section[aria-label="Receipt deviations"] select[name=kind]' "temperature excursion"`, `agent-browser find label "What was found" fill "Logger shows 31 °C for 2 h in transit."`, `agent-browser find role button click --name "Record and hold"`. The header reads `On hold`; `Assigned analyst` and `Assign` disappear; the region reads `temperature excursion Logger shows 31 °C for 2 h in transit. Recorded by Morgan Lee, <date>, <time> EDT Awaiting the Client's instruction.`; the rail reads `Holds 2`. Second view: History group `Receipt Deviation RecordedMorgan Lee` with `deviations.1.kind | empty | temperature excursion`.
- **Proceed (`hold-proceed`).** `agent-browser find role button click --name "Holds"`, open `26-00014`. `agent-browser select 'select[name=decision]' "Proceed with testing"`, `agent-browser find label "Given by" fill "Dana Verify, QC Lead (phone)"`, `agent-browser find role button click --name "Record instruction"`. The region adds `Client instructed proceed: Dana Verify, QC Lead (phone), <when> · recorded by Morgan Lee, <time>`; `Assigned analyst` and `Assign` return; the rail reads `Holds 1`. Second view: History group `Client Instruction RecordedMorgan Lee` with `deviations.1.instruction.decision | empty | proceed`, `...contact`, `...instructedAt`, and `status | On hold | Received`.
- **Assign (`recv-assign`).** `agent-browser select 'section[aria-label="Sample"] select[name=assignee]' "Alex Chen"`, `agent-browser find role button click --name "Assign"`. The header reads `In progress`. Second view: History group `AssignedMorgan Lee` with `assignee | empty | analyst` and `status | Received | In progress`.
- **Withdraw (`hold-withdraw`).** Open `26-00008` in `Holds` (two deviations, `broken seal` and `temperature excursion`, both `Awaiting the Client's instruction.`). `agent-browser select 'select[name=decision]' "Withdraw the Sample"`, `agent-browser find label "Given by" fill "Priya Nair, QA Aster Laboratories (email)"`, `Record instruction`. The header reads `Withdrawn`, the region reads `Client instructed withdraw: …`, the panel keeps only `Export record copy` and `Close sample`, and the rail button reads `Holds` with no count (a zero count is hidden); the Holds view reads `No Samples are on hold for a Receipt deviation.`
- **Deviation at receipt (`recv-deviation-at-receipt`).** In the `Receive submission` dialog, also `agent-browser select 'select[name=deviationKind-0]' "damaged package"` and `agent-browser fill 'input[name=deviationDescription-0]' "Outer carton crushed; inner bottle intact."`. After `Receive submission`, the new Sample is listed in `Holds`, not `Receiving`, and the Audit trail's `Received` group carries `status | empty | On hold`, `deviations.1.kind | empty | damaged package` and `deviations.1.description`. No separate `Receipt Deviation Recorded` group is written.
- **Proof.** Screenshot plus `snapshot -i` of the dialog, each panel state and the History tab.

## Gotchas

- The receive dialog's date inputs (`manufactureDate-0`, `expiryDate-0`, `dueDate-0`) ignore `fill`; use focus and digit presses. Only `dueDate-0` is required.
- The Method checkboxes are named by their full label (`NIT-001 v1 Impurity A LC-MS/MS · Maximum-dose ceiling 100 mg/day`); `find label "NIT-001 v1" check` matches by prefix.
- `Record a Receipt deviation` is a `<summary>`, which `snapshot -i` does not list; click it with `find text`.
- The panel's combobox `Kind` is selected by CSS, `section[aria-label="Receipt deviations"] select[name=kind]`; the receive dialog's `Receipt deviation` select (`deviationKind-0`) is a different control.
- One instruction answers every open deviation on the Sample at once (`26-00008` has two).
- `When` for the instruction arrives prefilled with the current minute; leave it unless the recipe is about a backdated instruction.
- A withdrawn Sample accepts nothing; `26-00008` stays Withdrawn for the life of the instance.
