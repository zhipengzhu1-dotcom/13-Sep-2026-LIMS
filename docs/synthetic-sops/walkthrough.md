# Walkthrough — one synthetic sample, receipt to approved result

> ## THIS IS A SIMULATION, NOT AN OBSERVATION
>
> **Provenance: `archetype-assumed`.** This document is a constructed narrative built
> from published sources (21 CFR Part 211, the FDA 2018 Data Integrity Q&A, the FDA
> 2022 OOS guidance, PIC/S PI 041-1, secondary summaries of ISO/IEC 17025:2017) and
> from the synthetic SOP set already in this directory (SOP-001 through SOP-006).
>
> **No person in the deploying laboratory was observed.** No coordinator, analyst or
> reviewer at the real laboratory walked their part of the process for this document.
> Nothing here is a transcription, a quote, or a paraphrase of anything said by a real
> person at the real laboratory.
>
> **Authorisation:** written on 2026-09-11, the user stated: *"you do the simulation,
> we do not need real inputs for now, stick to iso and fda."* This document is the
> product of that instruction, standing in for ticket
> [#22](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/22)'s original
> ask — *watch three people do the work* — which it explicitly does **not** satisfy.
>
> **It may never be promoted to `lab-confirmed` on the strength of this session.**
> Promotion requires a person with access to the real laboratory's effective SOPs,
> and ideally the real coordinator/analyst/reviewer, to walk this document against
> what actually happens and record every difference. Until that happens, every claim
> below about hand-offs, timings-as-counts, workarounds and vocabulary is a
> **prediction about a conventional paper/spreadsheet pharma QC lab**, not a fact
> about this one.
>
> No real SOP text, client name, product name, batch identifier, analyst name or
> result appears anywhere below. All identifiers are fictional, in the
> `LAB-{year}-{6 digits}` form already used by this synthetic SOP set.

---

## 1. The synthetic sample

**Fictional identifiers only.**

- Laboratory number: `LAB-2026-004471`
- Batch identifier (client-supplied, fictional): `SYN-BATCH-0091`
- Material: a synthetic finished-product tablet lot, submitted for release testing
  (archetype-assumed material category; chosen because it is the case SOP-001–006
  are written against)
- Containers: **2** — a primary sample and a duplicate retain portion, sharing one
  laboratory number with distinct container indices (SOP-001 §5)
- Assumption stated explicitly: two containers per submission is the low end of what
  SOP-001 contemplates ("multiple containers... each container receives the same
  laboratory number and a distinct container index," SOP-001 §5). It was picked
  because a two-container submission is enough to exercise the container-index
  mechanism without inflating the walkthrough. **It is not a claim about how many
  containers this laboratory typically receives** — that is Reshape-1 question 1,
  still open.

### Test panel — the open disagreement, not silently resolved

`assumption-analysis.md` estimates 5–8 tests per sample from the archetype
(`docs/synthetic-sops/assumption-analysis.md:16`); Reshape 2 assumed ~3
(named directly in the Performance-budget comment on #22, 2026-09-11, question 3).
This walkthrough picks **4 tests** for the panel below, stated as a compromise point
inside the disputed 3–8 range chosen only so the walk has something concrete to
narrate — **not** a resolution of the 3–8 disagreement, which remains open and is
Performance-budget handover question 3.

| Test | Method version (fictional) | Determination type |
| --- | --- | --- |
| Assay | MTH-014 v3 | Single numeric result vs. NLT/NMT limits |
| Related substances | MTH-021 v2 | Numeric result, multiple impurities summed |
| Dissolution | MTH-030 v1 | Multiple replicate determinations, Q-value comparison |
| Water content | MTH-009 v5 | Single numeric result vs. NMT limit |

Assay is walked through OOS below because it is the simplest single-value case;
the mechanism generalises to the others.

---

## 2. The walk: receipt to approved result

Each step: actor/role, action, record produced and its physical form, where it is
stored, who signs and what the signature means (drawn directly from the SOPs, not
invented), and the precondition for the step.

### Step 1 — Submission arrives (Coordinator, SOP-001)

- **Action:** Coordinator confirms the delivery against submission paperwork,
  inspects both containers, records condition and seal integrity.
- **Record:** Sample receipt record — pre-printed paper form
  (`docs/synthetic-sops/SOP-001-sample-receipt-and-login.md:52`).
- **Stored:** Laboratory records file, by laboratory number.
- **Precondition:** Submission paperwork complete and legible, material undamaged
  (SOP-001 §3). If not, the process stops before a laboratory number is issued.

### Step 2 — Laboratory number assigned (Coordinator)

- **Action:** Next number from the controlled sequence assigned:
  `LAB-2026-004471`. Never reused, never issued out of order (SOP-001 §4).
- **Record:** An entry in the laboratory number register — a bound sequential
  logbook (SOP-001 §"Records produced").
- **Stored:** Retained permanently at the receipt bench.
- **First place a spreadsheet appears:** the register is duplicated into a workbook
  "so that sample status can be filtered and reported... The two diverge"
  (SOP-001, "Where a spreadsheet appears today"). This is a re-entry: the same
  laboratory number is written once into the bound book (the record) and once,
  separately, into the workbook (the working tool used for actual status
  reporting).

### Step 3 — Containers labelled and specification snapshotted (Coordinator)

- **Action:** Both containers labelled `LAB-2026-004471` with container indices
  1 and 2. Requested tests recorded. For each, the method version current *at this
  moment* is recorded and its specification **copied onto the receipt record**
  (SOP-001 §6).
- **Record:** Same receipt record, specification snapshot section.
- **Signature (step 8):** Coordinator — *"I performed this receipt... the
  laboratory number was assigned from the controlled sequence"*
  (SOP-001, signatures table).
- **This is where SOP-002's controlled `(method, version, effective date,
  specification)` tuple is copied, once, and becomes immutable for this sample's
  life** — the central invariant this simulation must not blur (SOP-002 §8,
  `docs/synthetic-sops/SOP-002-method-and-specification-administration.md:39`).
- **Second place a spreadsheet appears — and the most consequential one named in
  the SOP set:** the value copied here is not necessarily copied from the
  approved method document at all. SOP-002 states plainly that "every
  specification" is held as cells in a workbook, "alongside the rounding rule,"
  and that "the workbook is the de facto specification of record even though the
  approved document is the controlled artifact. This is the single most
  consequential spreadsheet in the laboratory" (SOP-002, "Where a spreadsheet
  appears today"). The snapshot mechanism at this step is sound; whether its
  *source* was controlled is a separate question this step cannot answer, and is
  taken up structurally in §7.

### Step 4 — Supervisor verifies receipt (Laboratory supervisor)

- **Action:** Verifies laboratory number, requested tests and the copied
  specification.
- **Signature (step 9):** Supervisor — *"I verified this receipt... This is a
  verification of the record, not a second inspection of the material"*
  (SOP-001, signatures table). Distinct meaning from the coordinator's signature —
  the walkthrough must not collapse the two into "signed off."
- **Hand-off 1:** Coordinator → Supervisor. The paper receipt record physically
  moves desks or is placed in an in-tray; nothing routes it electronically.

### Step 5 — Storage transfer (Coordinator, SOP-009 referenced, not written)

- **Action:** Material moved to storage per required condition; transfer recorded
  in the chain-of-custody continuation form (SOP-001 §7).
- Note: SOP-009 itself was never written (`docs/synthetic-sops/README.md`, "Status"
  section) — this walkthrough can name that a hand-off happens here but cannot
  narrate its procedure. **Fog, not fact.**

### Step 6 — Assignment (Supervisor, SOP-003)

- **Action:** Each of the 4 tests is assigned **individually** — per test, not per
  sample (SOP-003 §1) — potentially to different analysts, on different days. For
  this walkthrough, Assay goes to Analyst A on day 2.
- Before assigning: supervisor checks the qualification register (SOP-008, not
  written) for MTH-014 v3, checks reagent/reference-standard release status
  (SOP-007, not written) and equipment calibration (SOP-010, not written)
  (SOP-003 §2–4). **Three more unwritten SOPs are load-bearing at this single step**
  — a gap this walkthrough inherits rather than fills.
- **Record:** Test assignment record — one row per test on an assignment sheet
  filed with the sample's worksheet package (SOP-003, "Records produced").
- **Signature:** Supervisor (assigns) then Analyst A (accepts) — two distinct
  signatures with two distinct meanings (SOP-003, signatures table): *"I assign
  this test"* vs *"I accept this assignment... I am qualified."*
- **Third place a spreadsheet appears:** the workload schedule — a whiteboard,
  "transcribed weekly into a workbook," carrying due-date and capacity information
  "that exists nowhere in the record" (SOP-003, "Where a spreadsheet appears
  today"). This is a genuine re-entry: assignment already exists as a signed paper
  record, and is written a second time, on a different cadence, into a tool that
  is what the supervisor actually manages the lab from.
- **Hand-off 2:** Supervisor → Analyst A. Assignment sheet moves to the bench.

### Step 7 — Determination performed (Analyst A, SOP-004)

- **Action:** Analyst A obtains the controlled worksheet for MTH-014 v3, records
  date, analyst, equipment ID, reference-standard/reagent lots
  (SOP-004 §1–2). Runs the instrument. The **instrument produces a printout**,
  signed and dated by the analyst and attached to the worksheet, **and** an
  electronic record in the instrument data system holding integration parameters,
  audit trail and reprocessing history (SOP-004 §3–4).
- **This is the structural point where a paper process cannot hold the complete
  record:** "A printout alone is not a complete record where the electronic system
  retains integration parameters, audit trail, or reprocessing history"
  (SOP-004 §4). FDA's 2018 Data Integrity Q&A makes the same point in its own
  words: a printout is *static*, the underlying instrument file is *dynamic*, and
  "a static record or printout... would not satisfy CGMP requirements to retain
  original records or true copies" where the electronic system holds more
  (`docs/research/fda-paper-lab-failure-points.md`, Q10 quote). Benchline's own
  architecture already names this seam and defers it: "Instrument imports can
  become another caller of result-recording commands after raw-file provenance is
  modeled" (`docs/architecture.md:15`).
- **Fourth place a spreadsheet appears — the calculation itself (SOP-004
  prediction, confirmed by walking the procedure):** step 6 of SOP-004 requires
  "the calculation stated in the method version," recording "the formula used, the
  input values, and the unrounded outcome" (SOP-004 §6). In the archetype narrative
  this happens in an unlocked workbook on a shared drive, and **the analyst
  transcribes the workbook's output back onto the paper worksheet by hand**
  (SOP-004, "Where a spreadsheet appears today": *"the workbook is typically
  unlocked, unversioned, uncalculated-by-anyone-else... This is the largest single
  data-integrity exposure in the archetype"*). Ticket #22's own framing predicted
  exactly this ("SOP-004 predicts the calculation itself lives in an unversioned
  workbook; confirm or refute") — the SOP-set author's own annotation is what is
  being confirmed here, by re-reading the SOP, not by any new observation.
- **Rounding applied once, at the end** (SOP-004 §7), and the reportable value
  compared to the specification snapshot from Step 3 (SOP-004 §8).
- **Signature (step 10):** Analyst — attests to completeness, "no determination has
  been omitted" (SOP-004, signatures table).

### Step 7a — Transcription count for one Assay value

Tracing a single numeric outcome from instrument to reported result, per SOP-004:

1. Instrument reading → instrument printout (physical, signed) — origin, not a
   transcription.
2. Instrument electronic record (parallel, not sequential — this is the actual
   raw record per SOP-004 §4, and is never transcribed *into* the paper chain at
   all — a structural gap, not a step).
3. Printout value → hand-copied onto the paper worksheet as an input
   (SOP-004 §3: "the worksheet entry is a transcription of it").
4. Worksheet input values → re-typed into the calculation workbook (Step 7's
   "spreadsheet appears" note).
5. Workbook's unrounded outcome → hand-copied back onto the paper worksheet as the
   reportable value (SOP-004 §6–7).
6. Reportable value → re-keyed by the reviewer independently from raw data, not
   copied from the analyst's figure (SOP-005 §5: "Do not check the analyst's
   arithmetic by inspection; compute it again") — this is a deliberate,
   *controlled* second transcription, not a workaround, and is the one re-entry
   the SOP requires rather than merely tolerates.
7. Approved value → Certificate of Analysis (SOP-013, not written; assumed final
   destination) — a further, uncounted transcription this walkthrough cannot trace
   because SOP-013 does not exist yet.

**Count: at minimum four transcriptions of the same numeric value before it is
approved (steps 3, 4, 5, 6 above), plus at least one more into the CoA that this
document cannot detail.** This is a structural count derived from reading the
SOPs' own procedure steps, not a timed observation, and not an error-rate claim.
PIC/S PI 041-1 names exactly this boundary as the place requiring "adequate
controls and secondary checks... Original data should be retained following
transcription and processing" (`docs/research/fda-paper-lab-failure-points.md`,
PI 041-1 §9.10 quote) — it does not say how often transcription errors occur here,
and neither does this document.

### Step 8 — Submission to review (Hand-off 3: Analyst → Reviewer)

- Worksheet package (worksheet, printout, calculation sheet, assignment record)
  physically bundled and routed to a second-person reviewer, who **must not be**
  Analyst A (SOP-005 §1, a hard invariant, matching the Benchline system's own
  analyst≠reviewer rule named in the map's standing decisions).
- **Fifth place a spreadsheet appears — the review queue:** "Which packages are
  awaiting review, for how long, and against which due date, is tracked in a
  workbook or on a whiteboard. Nothing in the record set answers 'what is waiting
  for me'" (SOP-005, "Where a spreadsheet appears today"). This is the queue named
  directly in #22's own text as "the view most likely to decide whether the lab
  adopts anything" and is squarely #18's territory.

### Step 9 — Independent review (Reviewer B, SOP-005)

- Reviewer re-performs the calculation independently from raw data (not by
  inspection), verifies reference-standard/reagent/equipment status **as at the
  determination timestamp, not as at review time** (SOP-005 §4 — the temporal-
  status requirement Reshape 3 already built the data model for), verifies the
  conformance verdict against the specification snapshot (SOP-005 §7).
- **Signature:** *"I independently verified this determination... This attests to
  the verification, not to having performed the test"* (SOP-005, signatures
  table) — explicitly not a re-performance of the test, and explicitly not an
  electronic signature; Benchline records this as an **activity record**, never
  as a signature in the cryptographic/regulatory Part-11 sense
  (`docs/architecture.md:34`, "no electronic signatures").
- **Approve → locked result.** *"This is not batch release... The disposition of
  the manufactured material is a separate decision, made outside the laboratory,
  by Quality Assurance"* (SOP-005, boxed note) — the review-vs-release distinction
  this walkthrough must keep visible.

---

## 3. OOS excursion branch — walked from Step 7

Suppose Assay's reportable value falls outside the NLT/NMT limits snapshotted at
receipt (SOP-004 §8: "Where the value is outside the limit, stop and initiate
SOP-006 before proceeding").

1. **Analyst stops.** No repeat, re-injection, re-integration or recalculation
   before reporting the observation (SOP-006 §1). The original observation is
   retained permanently.
2. **Primary-sourced timing constraint, not invented:** FDA's OOS guidance states
   Phase I "should include an initial assessment of the accuracy of the
   laboratory's data... whenever possible, this should be done before test
   preparations... are discarded," and that the analyst must retain the
   preparation, if stable, and inform the supervisor *before* discarding anything
   (`docs/research/fda-paper-lab-failure-points.md`, OOS-guidance quotes). In the
   paper process this is a bench-level judgment call with no system prompt behind
   it — nothing forces the analyst to pause before clearing the bench; the SOP
   relies entirely on training and habit.
3. **Hand-off 4:** Analyst → Supervisor, immediate and informal (a conversation,
   not a routed document) — the SOP requires notification but does not specify its
   form. This is itself a gap the archetype leaves open.
4. Investigation record opened within one working day (SOP-006 §2) — a further
   record type (not itself the sixth spreadsheet, which is the OOS log/control-chart
   workbook named in §5), held by Quality Assurance, cross-referenced from the worksheet
   package by investigation number (SOP-006, "Storage").
5. Phase I: analyst and supervisor jointly examine method-followed, calculation,
   standard/reagent status, calibration, sample prep, the instrument's own
   integration/reprocessing records (SOP-006 §3).
6. If assignable cause found and QA approves: original result marked
   **invalidated**, never deleted, cause and approval attached (SOP-006 §4). If no
   assignable cause: **the result stands**, and Phase II begins (SOP-006 §5) — "a
   result without an assignable cause is a real result."
7. Any retest requires a written plan **approved before retesting begins**
   (SOP-006 §7) — the timestamp-ordering invariant Reshape 3 already models.
   Testing into compliance and outlier-rejection of a chemical result are
   explicitly prohibited (SOP-006 §7).
8. **The OOS flag is never removed by a later passing result** (SOP-006 §12) — a
   hard invariant this walkthrough leaves fully intact and does not touch.

**Where the paper process strains most visibly in this branch:** the investigation
record is a sixth physical artifact (on top of receipt record, register,
assignment sheet, worksheet package, review record) that the reviewer or an
auditor must **manually cross-reference** by investigation number across two
separate filing locations (QA's file and the sample's worksheet package,
SOP-006 "Storage"). No source counts how often this reconciliation fails; the
structural exposure — two independently-filed records that must stay consistent
by discipline alone — is what this walkthrough can assert, not a failure rate.

---

## 4. Every hand-off, listed

| # | From → To | What physically moves | Queue implied |
| --- | --- | --- | --- |
| 1 | Coordinator → Supervisor | Receipt record | In-tray / desk |
| 2 | Supervisor → Analyst | Assignment sheet | Bench pickup, whiteboard-scheduled |
| 3 | Analyst → Reviewer | Full worksheet package | Review queue (workbook/whiteboard, unanswerable "what's waiting for me") |
| 4 | Analyst → Supervisor (OOS only) | Verbal + retained preparation | None — informal, no routed record |
| 5 | Supervisor/Analyst → QA (OOS only) | Investigation file | QA's own OOS log (a further, sixth, spreadsheet — SOP-006 "Where a spreadsheet appears today") |
| 6 | Reviewer → Reporting (approved) | Locked result | Not modelled — SOP-013 (CoA issuance) not written |

Six hand-offs for one test's non-exception path already; the OOS branch adds two
more (4 and 5). **This count is per test.** A 4-test sample multiplies steps 6–9
by up to 4 (fewer if tests share an analyst/reviewer), which is exactly the
per-test-assignment shape Reshape 1 already chose and this walkthrough does not
disturb.

---

## 5. Every place a spreadsheet appears — summary table

| # | SOP | What it is | What it actually does | Authority vs. controlled record | Where it can diverge |
| --- | --- | --- | --- | --- | --- |
| 1 | SOP-001 | Laboratory number register workbook | Filterable status reporting | None — the bound register is the record | Workbook edited without updating the register, or vice versa |
| 2 | SOP-002 | Method index and specification workbook | Holds every limit, unit and rounding rule as cells; rounding "frequently applied by a formula rather than stated in prose" | **None on paper, but functions as one in practice** — SOP-002 names this directly: "The workbook is the de facto specification of record even though the approved document is the controlled artifact. This is the single most consequential spreadsheet in the laboratory" (`docs/synthetic-sops/SOP-002-method-and-specification-administration.md:81-87`) | The value snapshotted onto a sample at receipt (§2 Step 3) may already trace to a limit or a rounding rule that only exists correctly in this workbook, not in the approved document |
| 3 | SOP-003 | Workload schedule workbook (ex-whiteboard) | Actual day-to-day capacity and due-date management | None — the assignment sheet is the record | Whiteboard state during the week is never in any record at all |
| 4 | SOP-004 | Calculation workbook | Performs the GxP-relevant calculation | None — described as "unlocked, unversioned... not validated, not access-controlled, no audit trail" | The number a reviewer re-derives may not match what the workbook produced if the workbook's formula silently changed |
| 5 | SOP-005 | Review queue workbook/whiteboard | The only place "what's waiting for me" is answerable | None | A package can sit unreviewed with nothing in the controlled record showing it |
| 6 | SOP-006 | OOS log / control-chart workbook | Defines OOT itself — "the *only* basis on which an OOT is recognised" | None — described as "typically neither controlled nor validated" | An OOT determination rests entirely on an uncontrolled trend dataset |

**Six spreadsheets, not five** — named directly by the six written SOPs, one per
SOP. Row 2 (SOP-002) was the omission in an earlier draft of this document and is
the one the SOP set itself ranks highest: "the single most consequential
spreadsheet in the laboratory" (SOP-002, "Where a spreadsheet appears today").
**Reagent/reference-standard control (SOP-007) and equipment calibration
(SOP-010) were not written** and almost certainly carry at least one more each
(lot registers, calibration due-date trackers) — this walkthrough cannot confirm
that; it is fog, listed in §9.

---

## 6. Exit-points, re-entries and workarounds register

This is the section the ticket asked for most directly, and the one this
simulation can least directly supply — a workaround is, by definition, something a
person invents under real pressure, and no person under real pressure was
consulted. What follows is **structurally implied by the SOP text itself**, not
observed:

| Exit/re-entry point | Evidence it exists | What it is not |
| --- | --- | --- |
| Register → status workbook (SOP-001) | SOP-001 text: "The two diverge" | Not a workaround — a designed duplication with no reconciliation step named |
| Approved method/specification document → method-index and specification workbook (SOP-002) | SOP-002 text: "The workbook is the de facto specification of record even though the approved document is the controlled artifact" | Not a transcription of a *result* at all — a re-entry of the **criterion a result is judged against**, upstream of every determination that cites it |
| Assignment sheet → whiteboard/workload workbook (SOP-003) | SOP-003 text: workbook "carries due-date and capacity information that exists nowhere in the record" | Necessary re-entry, not optional |
| Worksheet → calculation workbook → worksheet (SOP-004) | SOP-004 text, "Where a spreadsheet appears today" | The single highest-consequence transcription boundary in the walk, per FDA/PIC/S framing above |
| Worksheet package → review-queue workbook (SOP-005) | SOP-005 text | Not a transcription of *data*, but of *status* — equally undocumented in the controlled record |
| Trend data → OOT judgement (SOP-006) | SOP-006 text | A workaround dressed as infrastructure: the acceptance criterion for OOT lives entirely outside the controlled system |

**What this walkthrough cannot supply, and must not pretend to:** the moment a
person under deadline pressure actually improvises — skips a signature line and
comes back to it later, phones a result across the room instead of writing it,
keeps a personal scratch sheet the SOP prohibits (the exact failure mode FDA's
2018 Q&A names as unacceptable: "recording data on pieces of paper that will be
discarded after the data are transcribed," `docs/research/fda-paper-lab-failure-points.md`).
FDA describing this as a real, cited failure mode in the industry at large is
**evidence the pattern exists somewhere**; it is not evidence it exists here, and
this document does not claim otherwise.

---

## 7. The bottleneck argument — from counts, not timings

**Per constraint 3, no duration numbers are asserted anywhere in this document.**
A scout searched hard and found no credible, sourced timing data for pharma QC
step durations, review durations, or rework rates
(`.scratch/scout-22-qc-lab-cycle-time-evidence.md`, "What has NO credible published
basis"). Where duration would matter, it is left as an explicit unknown below.

**The counts assembled above:**

- 4+ separate physical/electronic records per test before approval (receipt
  record, assignment sheet, worksheet+printout, review record), plus the
  instrument's own electronic record that none of the paper artifacts capture.
- 4–5 transcriptions of a single reportable value from instrument to approved
  result (§2, Step 7a).
- 6 hand-offs on the non-exception path per test, 8 on the OOS path.
- **6** uncontrolled spreadsheets, one per written SOP (§5), each doing work the
  controlled record does not do at all.
- 3 of the 6 spreadsheets (register, workload schedule, review queue) exist
  **specifically because the controlled paper record cannot answer a status/
  queue question** — "what is due," "what is waiting for me," "what is
  outstanding" — a navigation gap, not a data-capture gap.

**Test against the prototype review's hypothesis** — that Benchline today
"records the destination of an analysis more than the analysis itself": the six
spreadsheets sort into **three categories, not two**, and the hypothesis holds
cleanly for only one of them:

1. **Locate-the-work** (SOP-001 register, SOP-003 workload schedule, SOP-005
   review queue — 3 of 6): exist purely to answer a status/queue question the
   controlled record structurally cannot answer, because that record is organised
   around one determination at a time, not around anyone's worklist. This is the
   category the hypothesis is about, and it holds cleanly here.
2. **Perform-the-calculation** (SOP-004 — 1 of 6): exists to *produce* a result,
   not to locate one. Flagged independently as the largest data-integrity
   exposure in the set. The hypothesis does not hold for this row; it is a
   different failure, not a smaller instance of the same one.
3. **Hold-the-criterion** (SOP-002 — 1 of 6, plus SOP-006's control-chart
   workbook, which defines OOT the same way — arguably 2 of 6): exists to hold
   the thing a result is *judged against* — the acceptance limit and its rounding
   rule — outside the controlled record. This is neither locating work nor
   performing a calculation; it is the **criterion of judgement** living
   uncontrolled. It is the sharpest point in this document and the hypothesis
   does not describe it at all: a wrong or drifted limit in this workbook does
   not just misplace one analysis, it silently reclassifies every result judged
   against it, conforming and non-conforming alike, for as long as it goes
   unnoticed.

**This bears directly on the standing distinction that a specification is
snapshotted onto the sample at receipt (§2 Step 3, SOP-001 §6, SOP-002 §8).** The
snapshot mechanism itself is sound — once taken, it is immutable and correctly
insulates an existing sample from a later method revision. But SOP-002's own text
says the de facto specification the receipt coordinator actually copies from is
this workbook, not the approved controlled document. **The snapshot is sound; its
source may not be.** A perfectly-implemented immutable snapshot still reproduces
whatever error was sitting in the workbook at the moment it was taken. Digitising
the snapshot without first governing what it is taken *from* does not fix this —
it locks the error in per sample instead of leaving it correctable lab-wide, which
is arguably worse, not better.

SOP-002 also names a second, narrower problem: rounding is "frequently applied by
a formula rather than stated in prose." Reshape 2 decided the rounding rule
travels with the limit and the conformance verdict is computed on the *rounded*
value. If the rounding rule genuinely only exists as a spreadsheet formula rather
than a written rule, then digitising it is not a data-entry task — it is a
**migration problem**: someone has to read the formula out of the workbook,
confirm it is what the method version actually intends, and turn it into a stated
rule before it can be trusted as an input to a computed verdict. Nothing in the
existing map names this migration step; this walkthrough surfaces it as new fog
(§9 below carries it forward).

**Reconciling with `README.md`'s existing position** (SOP-002 "digitised first,"
on the architectural ground that "digitising the judgment before the criterion is
governed yields signed results traced to uncontrolled specifications"): this
walkthrough **corroborates that argument from a second direction**, not a
competing one. The README's argument was structural/architectural, reasoned from
where §211.160(a) puts specifications under change control. This walkthrough
arrives at the same conclusion by tracing one concrete sample through the SOPs as
written and finding that the specification workbook is already, today, doing the
work of the controlled document — independent of any argument about build order.
It does not resolve live ticket #29 (Method and specification administration);
it supplies one more piece of evidence for the position #29 inherits, stated
plainly so #29 does not have to re-derive it.

**What this conclusion is not:** a claim about where this laboratory's time
actually goes, nor a claim about how often the SOP-002 workbook and the approved
document actually diverge in practice — this document asserts the exposure
exists in the archetype's own description of itself, not that it is frequent or
severe here. Confirming or refuting the bottleneck for real requires exactly what
#22 asked for and this document explicitly did not do — a person with a
stopwatch and three shadowed shifts. **The reversal condition:** if a real walk
finds the specification workbook and the approved document are reconciled
reliably (e.g., the workbook is generated *from* the approved document rather
than maintained in parallel), the hold-the-criterion category collapses and the
locate-the-work category (navigation, #18's territory) again dominates. If the
calculation workbook (SOP-004) turns out to be universal and error-prone in
practice, the bottleneck is squarely data integrity at the calculation step, and
#9 (feature scope) should prioritise an in-system calculation surface. Both
reversal conditions can be true at once; they are not mutually exclusive.

---


## 8. Archetype vocabulary vs. `CONTEXT.md` — predictions to test, not findings

**No real laboratory vocabulary was collected. Nothing below is a finding.** These
are terms from the SOP set and the regulatory sources, offered as **predictions**
for the eventual real walk to confirm or refute, per constraint 5.

| `CONTEXT.md` term | Archetype/SOP usage | Predicted collision |
| --- | --- | --- |
| Sample | SOP-001 uses "sample," but also treats "container" as a first-class sub-unit sharing one laboratory number | A real lab may use "sample" to mean the container, not the laboratory-number group — worth asking directly (this is Reshape-1 handover question 1, already on the ticket) |
| Result | SOP-004/005 use "result," "reportable value," and "determination" for different things in the same sentence | A real analyst may use "result" loosely for any of raw reading, calculated value, or approved value — collision risk highest here |
| Review | SOP-005 explicitly distinguishes review (verification) from release (a QA/manufacturing decision) — matching `CONTEXT.md`'s own warning ("_Avoid_: Batch release") | Predicted low collision, since both the archetype and `CONTEXT.md` already separate these deliberately |
| Exception | SOP-006 uses "OOS" and "OOT" as the working terms almost exclusively; "exception" does not appear in the SOP text at all | High predicted collision — real analysts likely say "OOS," not "exception," day to day |
| Activity record | Not a bench term in any SOP — it is a Benchline/system term matched against the SOPs' "signature" | Expect this term to be entirely unfamiliar to a real analyst; the interesting question is what they call the *paper* equivalent, if anything |
| Specification | Used consistently in SOP-001/002 | Low predicted collision |
| Batch | Used consistently as "the client-supplied lot identifier" | Low predicted collision, but worth checking whether "lot" is the word actually used on the floor rather than "batch" |

---

## 9. What this document cannot establish

- **Whether any of the above actually happens at the real laboratory.** This is
  the whole of #22's original intent and this document supplies none of it.
- **Any duration, throughput, staffing ratio, or rework rate.** None exists in
  published, citable form for pharma QC specifically
  (`.scratch/scout-22-qc-lab-cycle-time-evidence.md`), and none is asserted here.
- **Any OOS or OOT rate.** The only located figure ("2.3%, WHO") was traced to no
  identifiable WHO source and is explicitly rejected, not merely omitted
  (`.scratch/scout-22-qc-lab-cycle-time-evidence.md`, §5).
- **The real vocabulary.** §8 above is a question list, not a glossary correction.
- **Whether the calculation-workbook pattern (SOP-004) is universal or occasional**
  at the real lab, which is the single fact most likely to redirect the bottleneck
  argument in §7.
- **Any answer to the 16 questions already standing on #22** (Reshape 1: 3;
  Performance budget: 5; Authentication: 8). This walkthrough touches several of
  their topics but resolves none of them; each remains open on the ticket.
- **Whether SOP-007, SOP-008, SOP-009, SOP-010, SOP-012 and SOP-013 — none of
  which exist yet — introduce further spreadsheets, hand-offs or transcription
  points.** Five to six SOPs' worth of process is entirely missing from this walk
  and this document cannot narrate what it does not have.
- **How often the SOP-002 specification workbook and the approved controlled
  document actually diverge.** §7 establishes that the archetype's own text makes
  the workbook the de facto specification of record; it does not and cannot
  establish that divergence is frequent, or that it has ever produced a wrong
  conformance verdict. This is the reversal condition on the hold-the-criterion
  category.
- **Whether the rounding rule exists anywhere as a stated rule** rather than only
  as a spreadsheet formula (SOP-002: rounding is "frequently applied by a formula
  rather than stated in prose"). If it does not, digitising it is a **migration
  problem** — someone must read each formula out of the workbook and confirm it
  against what the method version intends — and no ticket on the map currently
  owns that step. Carried forward as new fog.
- **17025 clause content cited by `iso17025-record-obligations.md` is itself
  secondary-sourced** (the standard is paywalled) — every 17025 reference in this
  walkthrough inherits that caveat and is a lens, never a verified text.

