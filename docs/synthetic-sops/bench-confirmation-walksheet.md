# Bench confirmation walksheet — ticket #40

> ## READ THIS BEFORE MARKING ANYTHING UP
>
> **Provenance: `archetype-assumed`, throughout, without exception.** Every
> prediction on this sheet was produced by an agent session reasoning from
> published regulatory text, the synthetic SOP set in this directory, and the
> conventions of a generic paper/spreadsheet pharma QC laboratory. **No person
> in the deploying laboratory was observed, interviewed, or consulted.** Nothing
> below is a transcription, paraphrase, or summary of anything a real person at
> the real laboratory said or did.
>
> **This document may never be promoted to `lab-confirmed` on the strength of
> this session, or any agent session.** Promotion requires a named human —
> ideally the actual coordinator, analyst, supervisor, reviewer, QA lead, or IT
> contact addressed by each row — physically marking a column with a fact, in
> pen, at the bench.
>
> **This document discharges no reversal condition.** Several tickets on the
> wayfinder map (notably #7, #9, #15, #18, #25/#26, #29, #34, #35, #41) are
> recorded against a stated reversal condition naming a fact about the real
> laboratory. A simulated answer produced here is not that fact, no matter how
> confidently worded. Every one of those decisions stands exactly where it
> stood before this document existed, until a human overwrites a row below.
>
> **How to use this sheet at the bench:** for each row, read the question aloud
> (or in the voice given), write the real answer in the blank "Confirmed
> answer" line, and circle whether the archetype's prediction was RIGHT / WRONG
> / PARTLY. Do not skip a row because the prediction "sounds right" — that is
> exactly the failure mode this sheet exists to prevent.

---

## Persona profiles used in role-play below

These are **generic industry-archetype constructs**, not portraits of anyone
at the real laboratory. They exist so a reader can see the assumption behind
each voice and argue with it.

- **Receipt coordinator (archetype):** front-line, high sample throughput,
  cares about not being blamed for a mislabelled container, irritated by
  duplicate data entry.
- **Analyst, 2–5 years bench experience (archetype):** cares about not
  re-doing work, tolerates paper because it is familiar, irritated by
  anything that adds keystrokes without adding trust.
- **Laboratory manager / senior analyst (archetype):** cares about
  throughput and defensibility during an audit, irritated by tools that
  don't match how work is actually scheduled.
- **Supervisor (archetype):** cares about not personally becoming the
  bottleneck, irritated by qualification paperwork that lags real capability.
- **QA (archetype):** cares about audit trail integrity and OOS discipline,
  irritated by anything that looks like testing into compliance.
- **IT (archetype, sole-charge or shared-service):** cares about not owning
  a new identity system, irritated by requests that imply support burden
  it wasn't budgeted for.

Where two personas would genuinely disagree, the disagreement is written
below rather than resolved — see especially rows 6/15/34-1.

---

## A — Ticket #40's original sixteen (receipt, assignment, bench, IT, audit)

### 1. One row or several? (Receipt coordinator)
**Question asked:** "When a submission arrives in several containers, is that common — and do you think of it as one laboratory number or as several containers? Would you rather see one row or several in your work queue?"
**Prediction:** Coordinator thinks of it as **one laboratory number**; multiple containers are common only for retains/duplicates, not routine. Preference: one row, expandable to containers.
**Basis + grade:** SYNTHETIC SOP SET (SOP-001 §5 treats container as sub-unit of the laboratory number) + CONVENTION, UNSOURCED for the "how common" and "preference" parts.
**Load-bearing for:** Reshape 1 (#25) — decides whether the work queue's primary row is laboratory number or container.
**Cheapest refutation:** Ask the coordinator to describe yesterday's intake list from memory — do they name laboratory numbers or containers?
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 2. Assigned a test at a time, or a run? (Receipt coordinator)
**Prediction:** Assigned **per test**, because SOP-003 §1 documents per-test assignment as the written procedure — but the archetype predicts this diverges informally under pressure toward informal batching by analyst/day.
**Basis + grade:** SYNTHETIC SOP SET (SOP-003 §1) for the written procedure; NO BASIS — GUESS for whether real practice matches it.
**Load-bearing for:** Reshape 1 (#25) — this and Q3 together are the stated reversal condition for declining to build a "worksheet"/run entity.
**Cheapest refutation:** Ask the supervisor directly, per the ticket's own script.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 3. One test to completion, or several set up together? (Analyst, shadowed shift)
**Prediction:** Analysts **batch by instrument/method**, not by sample — e.g., load six samples' Assay preparations into one HPLC sequence — because that is the dominant real-world driver of "run" thinking (instrument dead-time), independent of what the paper record calls it.
**Basis + grade:** CONVENTION, UNSOURCED (general instrumental-analysis practice; not sourced to this lab, not sourced to any cited regulatory text — 21 CFR is silent on sequencing practice per `docs/research/bench-run-batching-practice.md`).
**Load-bearing for:** #25 (Reshape 1) reversal condition, jointly with Q2. If confirmed, Benchline needs a run/worksheet grouping entity that #25 declined to build; rebuilding it later is a second reshape.
**Cheapest refutation:** Shadow one shift for under an hour; watch whether the analyst opens one worksheet or several before touching the instrument.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 4. Peak concurrent writers (Laboratory manager/senior analyst)
**Prediction:** **3–6** analysts entering a determination simultaneously at the busiest hour, out of ~20 total users.
**Basis + grade:** NO BASIS — GUESS (this is the number the Performance budget ticket #15 itself flags as its own reversal condition and as "the single assumption most likely to be wrong").
**Load-bearing for:** #15 (Performance budget). Above ~10 concurrent writers, #15's conclusion moves from "manageable" to "constraining."
**Cheapest refutation:** Stand in the lab for 15 minutes at the busiest hour and count keyboards actively being typed into, not screens merely open.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 5. Steady trickle or end-of-shift batch review? (Laboratory manager/senior analyst)
**Prediction:** **End-of-shift batch**, roughly 10–20 results reviewed in one sitting, because paper packages accumulate on a desk through the day and get worked in a block once other duties clear.
**Basis + grade:** CONVENTION, UNSOURCED.
**Load-bearing for:** #15 (Performance budget) sizing of review-queue burst load; #18 (Work queue) — whether the reviewer's queue view needs to handle a burst render.
**Cheapest refutation:** Ask the reviewer to describe their last three days' review pattern.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 6. Walking away mid-determination, for how long? (Analyst) — DISAGREEMENT RECORDED
**Analyst's likely answer:** "All the time — to the balance, the fume hood, the instrument queue. Ten minutes, sometimes thirty." Analysts do not perceive this as risk; the workstation is just where the keyboard happens to be.
**Supervisor/IT's likely answer:** An unattended, unlocked, authenticated session for 30 minutes on a shared bench computer is exactly the failure mode FDA's shared-login warning letters describe (dated 23 Jul 2020, 17 Apr 2024 — company names withheld, per `docs/research/lab-workstation-and-session-practice.md`). Supervisor wants a short idle timeout; analyst experiences that as "the machine locks me out mid-titration."
**Prediction (if forced to pick one number):** median absence 10–20 minutes, occasional absences up to an hour (instrument runs).
**Basis + grade:** CONVENTION, UNSOURCED for the number; the disagreement itself is STRUCTURAL INFERENCE from the regulatory hook plus ordinary bench physics (instruments take time; humans leave keyboards).
**Load-bearing for:** #7 (Authentication) idle-timeout value.
**Cheapest refutation:** Time three analysts across one shift with a stopwatch, or just ask them to estimate their own longest instrument-side absence yesterday.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 7. When does re-auth become "prop the system open"? (Analyst)
**Prediction:** Somewhere **between 5 and 15 minutes** idle is where analysts start propping doors/staying logged in on purpose; #7's provisional 1 h idle / 24 h absolute is likely **too generous** relative to what analysts would tolerate being asked, though it is not too generous relative to what a strict data-integrity reading would want.
**Basis + grade:** NO BASIS — GUESS for the specific minute count. PIC/S PI 041-1 §9.5 gives direction ("shorter, rather than longer") but no number (`docs/research/lab-workstation-and-session-practice.md`) — PRIMARY REGULATORY TEXT for the direction only, not the number.
**Load-bearing for:** #7's idle-timeout constant, currently `archetype-assumed`.
**Cheapest refutation:** Ask analysts directly, per the ticket's own script; watch for winces at specific numbers.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 8. Tests per sample, and reassignment frequency (Laboratory manager)
**Prediction:** **4–6** tests per sample on average (splitting the disputed 3–8 range down the middle, matching the walkthrough's own compromise choice of 4 — `docs/synthetic-sops/walkthrough.md:59`); reassignment mid-flight is **uncommon**, mostly due to absence, not error.
**Basis + grade:** SYNTHETIC SOP SET / STRUCTURAL INFERENCE for the range (assumption-analysis.md 5–8 vs. Reshape 2's ~3); NO BASIS — GUESS for the reassignment frequency.
**Load-bearing for:** Reshape 2 (#26) sizing of `T`; assignment table row-growth estimates across the whole persistence model.
**Cheapest refutation:** Pull ten recent samples' paperwork and count tests per sample directly.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 9. OOS/investigation rate per month (Laboratory manager)
**Prediction:** **No number offered.** A scout searched twice and found no credible published rate; the circulating "2.3%, WHO" figure traces to no identifiable document and is actively regenerated by AI search summarisation rather than sourced (`docs/research/qc-lab-throughput-and-staffing-norms.md`). Any number an agent stated here would be fabricated.
**Basis + grade:** NO BASIS — GUESS if a number is forced; correctly, this is **unestimated, not merely unconfirmed**.
**Load-bearing for:** growth model for `investigations`/`retestPlans` tables — currently has no bound at all.
**Cheapest refutation:** Count OOS entries in the paper OOS log for the last three months and divide by sample volume.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 10. Trending beyond two years without a formal request (Records/audit person)
**Prediction:** **Rare** — most routine trending (e.g., stability, control charts) looks back months, not years; anything beyond two years already goes through a records request in most paper labs because the physical file has moved to archive storage.
**Basis + grade:** CONVENTION, UNSOURCED.
**Load-bearing for:** the two-year live/archive horizon in the persistence/performance budget.
**Cheapest refutation:** Ask whoever handles records requests how often a request reaches past two years.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 11–13. Existing identity system / IT would allow delegation / account lifecycle process (IT)
**Prediction:** **An organisational identity system (e.g., Microsoft 365 / Google Workspace email) exists at the parent-organisation level** even though the bench itself runs on paper — email accounts nearly always predate lab digitisation. Whether IT would **permit** a lab-built system to authenticate against it is **unpredictable** — sometimes policy forbids exactly this for a homegrown system. Account creation/removal today is **probably informal** (a manager tells IT by email when someone joins/leaves), with no written process.
**Basis + grade:** CONVENTION, UNSOURCED for existence of email; NO BASIS — GUESS for whether IT would permit delegation, and for the lifecycle process.
**Load-bearing for:** #7 (Authentication) — its own stated reversal condition. If a usable directory exists AND IT permits delegation, the entire local-password design (hashing, policy, reset flow) is replaced.
**Cheapest refutation:** One email to whoever runs IT for the site, asking exactly Q11–Q13 as written.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 14–16. Shared workstations / shared logins / shared read-only display (Analyst + supervisor) — DISAGREEMENT RECORDED
**IT's likely position:** No shared write-capable logins, ever — full stop, matching FDA's Dec 2018 DI guidance Q5 (`docs/research/lab-workstation-and-session-practice.md`).
**Bench's likely position (analyst archetype):** "We already share logins informally when someone's badge/password isn't handy" — informal shared-login practice on a shared bench PC is described by scouts as "extremely common" in the industry generally, and the ticket itself invites an answer "without judgement."
**Prediction:** A **few shared bench-station computers** exist near instruments (not one-per-analyst); informal login sharing on those machines is **plausible and likely underreported** if asked in front of a supervisor. A shared **read-only** always-on queue display would be well received.
**Basis + grade:** STRUCTURAL INFERENCE (shared instrument-adjacent computers are near-universal in benches with limited floor space) for computer count; CONVENTION, UNSOURCED for login-sharing prevalence; PRIMARY REGULATORY TEXT (FDA Dec 2018 DI guidance Q5) for the read-only-display permission being a real, usable design option, not for whether this lab wants one.
**Load-bearing for:** #7 — the idle timeout is described as "the entire user-experience cost" of the no-shared-write-account rule; getting workstation count and sharing pattern wrong makes that cost land wrong.
**Cheapest refutation:** Walk the floor and count computers; ask the "without judgement" question exactly as scripted in the ticket.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## B — From #9 (Feature scope), 4 questions

### 17. What does the reviewer actually check, and as-at when? (Reviewer)
**Prediction:** Reviewer reads reagent/reference-standard lot and calibration status **off the worksheet the analyst already filled in**, and does **not** independently re-open the certificate binder or calibration log except during an investigation.
**Basis + grade:** NO BASIS — GUESS. This is explicitly the row #9 flags as resting on "one sentence in synthetic SOP-005 §4 that nobody in the laboratory has read." 21 CFR Part 211 requires none of this per-test attestation (scouted, confirmed zero occurrences).
**Load-bearing for:** #9 — if confirmed, reagent/reference-standard control, analyst qualification and equipment calibration collapse from **seam to out**; #21 (inventory)'s temporal-status hazard stops binding for reagents; #34 (qualification enforcement) loses most of its force.
**Cheapest refutation:** Watch (or ask about) the last completed review, exactly as the ticket's script specifies.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 18. Stability pulls vs. release testing, proportion (Laboratory manager)
**Prediction:** Stability pulls are a **minority**, roughly 10–25% of monthly volume, with release testing dominant.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #9's "stability programme is out" classification. If stability pulls are a large fraction of 1000/month, that call flips.
**Cheapest refutation:** Ask the laboratory manager for last month's split by testing purpose.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 19. What does the client actually receive, and who produces it, in what program? (Laboratory manager)
**Prediction:** A **Word-based document, laid out per client template**, assembled by the supervisor or a designated report writer, from data re-keyed off the approved worksheet — i.e., a seventh uncontrolled artifact recreated at the exit door.
**Basis + grade:** SYNTHETIC SOP SET / STRUCTURAL INFERENCE (walkthrough's transcription-count argument, `docs/synthetic-sops/walkthrough.md:229`) — but explicitly the **weakest-sourced** row of the thirteen in #9's own accounting; "certificate of analysis" occurs zero times in 21 CFR Part 211.
**Load-bearing for:** #9's CoA-issuance classification (in vs. seam) and directly #24 (CoA issuance and amendments) — if layouts are client-dictated and varied, the row weakens toward seam.
**Cheapest refutation:** Ask to see the program/template used to produce the last certificate that left the building.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 20. Where does the qualification register live, who updates it, when last updated? (Supervisor)
**Prediction:** A **paper binder or single spreadsheet**, updated **irregularly** — on training completion or during audit prep, not continuously — held by the supervisor, not QA.
**Basis + grade:** STRUCTURAL INFERENCE (matches the general pattern of every other register in the SOP set, per walkthrough §5) — NO BASIS — GUESS for "irregularly."
**Load-bearing for:** #34 (qualification enforcement: who writes the rows) and #42 (divergence hazard). If the register doesn't exist or is years stale, both tickets change shape and a hard block at `assign` becomes unworkable.
**Cheapest refutation:** Ask to see it and check the date of its last entry.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## C — From #24 (CoA issuance and amendments), 4 questions

### 21 (Q17). Who releases the report — reviewer or someone else? (Report signer)
**Prediction:** **The laboratory supervisor**, distinct from the technical reviewer.
**Basis + grade:** STRUCTURAL INFERENCE (analogy to SOP-001 step 9's supervisor verification role) — #24 itself names this its **most likely error**; NO source addresses issuance authority at all.
**Load-bearing for:** #24 — if the reviewer also releases externally, or a QA-adjacent authority does, the `issue` command's role restriction moves.
**Cheapest refutation:** Ask directly, per the ticket's script.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 22 (Q18). Two acts or one? (Report signer)
**Prediction:** **Two acts in principle, collapsed into one moment in practice** — same person approves and releases back-to-back, but they are conceptually distinguishable if pressed.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #24's two-act (approve/issue) data model — if genuinely one act, the model is more machinery than needed.
**Cheapest refutation:** Ask "when you sign the certificate, is that the same pen-stroke as approving the result, or a separate one?"
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 23 (Q19). Correction/reissue frequency and cause (Supervisor/QA)
**Prediction:** **A handful per year**, mostly caused by transcription slips, occasionally by an investigation changing a result after issuance.
**Basis + grade:** NO BASIS — GUESS. #24's storage estimate range (~12,000–30,000 Certificate versions/year) is explicitly wide because this is unknown.
**Load-bearing for:** #24's storage sizing.
**Cheapest refutation:** Pull last year's reissue log, if one exists, and count.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 24 (Q20). What does the client get when one test is held up for weeks? (Supervisor/QA)
**Prediction:** **Nothing formal until everything is finished** — the archetype small lab is more likely to hold the whole submission than manage partial-issuance machinery, though an informal phone call or email update to the client is plausible.
**Basis + grade:** NO BASIS — GUESS. This directly contradicts #24's own chosen design (partial issuance permitted); flagged deliberately as a point of tension, not smoothed over.
**Load-bearing for:** #24 — if the lab holds everything until complete, the partial-issuance machinery #24 built is unnecessary; if there's an informal interim communication today, that is "the last uncontrolled output on the map."
**Cheapest refutation:** Ask supervisor/QA directly, per the ticket's script.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 25 (Q21). How does the report physically reach the client, and is delivery recorded? (Whoever sends reports)
**Prediction:** **Email, ad hoc**, sent from an individual's mailbox, with **no separate delivery record** beyond that sent-mail folder.
**Basis + grade:** CONVENTION, UNSOURCED.
**Load-bearing for:** #45 (does Benchline deliver the Certificate, or only produce it) — cannot be answered without this.
**Cheapest refutation:** Ask directly; look for a sent-items search for the last certificate.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## D — From #29 (Method and specification administration), 7 questions

### 26 (Q1). Does the workbook get retyped, or generated from the approved document? (Workbook maintainer)
**Prediction:** **Retyped by hand** from the approved method document, maintained in parallel, not generated. This is the single highest-leverage prediction on this entire sheet.
**Basis + grade:** SYNTHETIC SOP SET (SOP-002's own text: "the workbook is the de facto specification of record," `docs/synthetic-sops/walkthrough.md:124`) for the archetype claim; genuinely **NO BASIS — GUESS** for whether it is true here.
**Load-bearing for:** #29 as a whole (its own stated reversal condition) — if generated from the document instead, #29's decision flips to transcription, the intake gate loses most purpose, the executability review loses its stated reason, and the draft/review/admit chain is over-built.
**Cheapest refutation:** #29's own script: "when a limit changes, do you retype it into the workbook, or does the workbook come from somewhere?"
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 27 (Q2). Would the lab accept the workbook ceasing to exist? (Workbook maintainer)
**Prediction:** **Yes, if the replacement is at least as fast to check** — resistance would be about workflow friction, not attachment to the artifact itself.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #29's practicality case for Benchline-as-specification-of-record.
**Cheapest refutation:** Ask directly.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 28 (Q3). Who performs each of SOP-002 §6's three signatures — any overlap? (Laboratory manager)
**Prediction:** In a small lab, **overlap is likely** — the method owner may double as the only qualified supervisor for that method area at least occasionally.
**Basis + grade:** STRUCTURAL INFERENCE (small-lab headcount logic) — NO BASIS — GUESS for whether it actually happens here.
**Load-bearing for:** #29's hard invariant "executability reviewer ≠ draft author." If overlap is routine, admission deadlocks and the invariant will be bypassed in practice.
**Cheapest refutation:** Ask directly, naming the three signature roles.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 29 (Q4). Does the lab disposition method-change impact, or does it always go to QA change control? (Laboratory manager)
**Prediction:** **Always escalated to QA/site change control**, never dispositioned solely within the analytical laboratory, since disposition of already-released material is not the laboratory's call.
**Basis + grade:** STRUCTURAL INFERENCE (this is close to a regulatory boundary — disposition of released product is a quality-system act, not a bench act) — CONVENTION, UNSOURCED for whether this specific lab follows that norm.
**Load-bearing for:** #29 — if disposed internally, a second method-scoped investigation entity becomes arguable.
**Cheapest refutation:** Ask directly.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 30 (Q5). Is admitting a method version an administrator act or a supervisor act? (Laboratory manager)
**Prediction:** No prediction offered beyond #29's own coin-flip; **CONVENTION, UNSOURCED** either way. Slight lean toward **supervisor**, for consistency with #24's `issue` role by structural analogy, but #29 itself calls this a coin-flip and this sheet does not resolve it further.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #29's role assignment — cheap to change either way.
**Cheapest refutation:** Ask directly which role in practice signs off a new method version going live.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 31 (Q6). Does QA hold the controlled method file, and does a numbered change-control form exist? (Method file holder)
**Prediction:** **Yes to both** — QA custody of the master file and a numbered change-control form are close to universal in a GxP-adjacent lab even a small one, because these are cheap paper practices predating any computer system.
**Basis + grade:** CONVENTION, UNSOURCED.
**Load-bearing for:** #29's `NOT NULL` constraint on `changeRequestReference`. If no numbered form exists, those columns are mandatory with nothing to put in them.
**Cheapest refutation:** Ask to see the master file and one change-control form.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 32 (Q7). Does the lab ever back-date an effective date? (Method file holder)
**Prediction:** **Rarely, but not never** — under audit or investigation pressure, a paperwork gap between "in force" and "documented as in force" sometimes gets closed by writing an earlier date than the actual admission date.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #29's forbidding invariant (`date(admittedAt) <= effectiveDate`). If back-dating happens routinely, that invariant is wrong and the migration escape hatch is insufficient.
**Cheapest refutation:** Ask directly, and separately ask QA the same question — compare answers.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 33. How many methods and versions exist to load initially? (Method file holder)
**Prediction:** **Tens of methods, low hundreds of versions counting history** — a plausible order of magnitude for a lab of this size, not a count.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** whether initial migration is a script or an afternoon of typing; whether the no-overlapping-intervals invariant survives contact with a messy real history.
**Cheapest refutation:** Count the tabs/files in the actual method index.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## E — From #34 (Analyst qualification enforcement), 5 questions

### 34 (Q1). Does the supervisor ever proceed past a lapsed/unclear qualification, and is that recorded? (Supervisor) — DISAGREEMENT RECORDED
**Supervisor's likely position:** "Yes, sometimes — if nobody else is qualified and the paperwork is known to be behind reality, I proceed and remember it, I don't write it down." Coverage beats paperwork on a bad day.
**QA's likely position:** "That should never happen — a lapsed qualification is a lapsed qualification regardless of coverage pressure." QA would want this to invert #34's advisory-only design into a hard block.
**Prediction:** Supervisor's practice is closer to true than QA's stated ideal — advisory, undocumented overrides happen under real staffing pressure.
**Basis + grade:** NO BASIS — GUESS, though the disagreement pattern itself is STRUCTURAL INFERENCE from ordinary staffing economics.
**Load-bearing for:** #34's entire advisory-vs-block design — this is #34's single most load-bearing question. If the answer is "never," the decision inverts to a hard block with override removed.
**Cheapest refutation:** Ask exactly as scripted, and separately ask an analyst the same thing without the supervisor present.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 35 (Q2). How stale is the paper qualification register versus reality? (Supervisor)
**Prediction:** **Days to a few weeks** of lag between a qualification event and the register being updated.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #34's no-block argument rests on this gap being real and non-trivial. If updated same-day, the staleness argument weakens.
**Cheapest refutation:** Compare the register's last-updated date against the most recent known qualification event.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 36 (Q3). Qualification rows: methods per analyst, analyst count (Supervisor)
**Prediction:** **8–15 analysts**, each qualified on **a majority but not all** method versions in routine use — order a few hundred qualification rows over a two-year horizon, matching #34's own estimate.
**Basis + grade:** NO BASIS — GUESS, matching #34's own flagged "estimated rather than measured" figure.
**Load-bearing for:** sizing only.
**Cheapest refutation:** Count analysts and cross-reference against the qualification register.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 37 (Q4). Whole-pool re-qualification, or selective per SOP-002 §5? (Supervisor/QA)
**Prediction:** **Selective**, assessed per method-version change — whole-pool re-qualification is expensive and archetype labs avoid it unless the change is significant.
**Basis + grade:** SYNTHETIC SOP SET (SOP-002 §5 describes selective assessment) for what's written; NO BASIS — GUESS for whether practice matches it.
**Load-bearing for:** #34's carry-forward-qualification-on-non-impactful-change design. If whole-pool re-qualification is the norm, that path is dead weight.
**Cheapest refutation:** Ask about the last method-version change and how re-qualification was handled.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 38 (Q5). How many qualified reviewers per method version — ever exactly one? What happens if the reviewer's own qualification lapses? (Whoever assigns/reviews)
**Prediction:** For **most** commonly-run methods, 2+ qualified reviewers exist; for a **minority** of specialised or newly-introduced methods, exactly one — creating single-point-of-failure risk. When a sole reviewer's qualification lapses, work is **likely performed anyway** informally rather than waiting, because there is no alternative.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #34's stricter-at-review-than-assignment design (blocks on affirmatively-lapsed reviewer). If some method versions have only one or two qualified reviewers, the block strands samples and should become advisory like assignment, leaving only the never-review-your-own-work check as review's hard stop.
**Cheapest refutation:** For the busiest 5 methods, count qualified reviewers on the register.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## F — From #35 (Login-storm measurement), 1 question cluster

### 39. Do analysts arrive in a block or trickle in? How many minutes from 1st to 20th login? Anything that synchronises the start? Peak overlap headcount? Repeated logins through the day? (Shift supervisor)
**Prediction:** A **loose block over roughly 10–20 minutes**, synchronised informally by a fixed shift-start time rather than a formal meeting; peak overlap **20–30** if there is any shift overlap at all; analysts mostly **stay logged in** at one workstation through the day rather than re-authenticating repeatedly, given the analysis above (rows 6/14–16) that shared/bench-adjacent computers exist.
**Basis + grade:** NO BASIS — GUESS. #35 itself is explicit that "twenty simultaneous" was assumed, not observed, and is conservative.
**Load-bearing for:** #35's login-storm cost measurement (Argon2id p95 at 20 vs. 30 concurrent). If arrivals are more concentrated than assumed (many more than 20 within a minute), the safety margin found by #35 could be gone on slower hardware.
**Cheapest refutation:** Ask the shift supervisor directly, per the ticket's exact script; or, cheaper still, check login timestamps in server logs once the system exists.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## G — From #18 (Work queue and navigation), 3 questions plus a labelling note

### 40 (Q1). How many tests are open right now, at a single instant? (Supervisor)
**Prediction:** **Low hundreds** (order 100–400), not thousands — consistent with 12,000 samples/year × ~4–6 tests/sample × a turnaround measured in days-to-weeks rather than months, giving open-work inventory in that range by Little's-law-style reasoning.
**Basis + grade:** STRUCTURAL INFERENCE (arithmetic from the destination's own stated volume, combined with rows 8 and 41 predictions) — the arithmetic is sound but every input to it is itself `archetype-assumed`, so the output is NO BASIS — GUESS in substance even though the reasoning chain is shown.
**Load-bearing for:** #18's own stated reversal condition — its decision that work queues need no time horizon or pagination holds only if open work is a few hundred rows. If it is genuinely thousands, all three role views (analyst landing, reviewer queue, supervisor capacity) must be re-decided with pagination and horizons.
**Cheapest refutation:** #18's own script: ask the supervisor for a rough count right now — dozens, a few hundred, or thousands.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 41 (Q2). Typical and worst-case turnaround, receipt to approved result (Supervisor)
**Prediction:** **Typical 5–10 business days**, worst case **3–6 weeks** (investigations/OOS extending the tail).
**Basis + grade:** NO BASIS — GUESS. No credible published turnaround figure exists for pharma QC (`docs/research/qc-lab-throughput-and-staffing-norms.md`).
**Load-bearing for:** #18's default 30-day window on historical/search views, currently `archetype-assumed`. If routine turnaround regularly exceeds 30 days, that default hides live work on first paint.
**Cheapest refutation:** Ask the supervisor directly, per the ticket's script.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 42 (Q3). Do product/client names contain accented or non-Latin characters? (Receipt coordinator)
**Prediction:** **Mostly plain ASCII**, with an occasional accented character (e.g., client names with diacritics) — low but non-zero frequency.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #18's decision to skip FTS5/folding and rely on ASCII-only `LIKE`/`NOCASE` (Node's bundled SQLite ships without ICU, verified by probe per the brief). If a meaningful share of real names are non-ASCII, that call is wrong and search needs an explicit folding step.
**Cheapest refutation:** Scan the last 100 intake records for non-ASCII characters in name fields.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 43. Physical labelling practice — container-level labels, aliquot scanning, submission-number disambiguation (Receipt coordinator / whoever scans)
**Prediction:** #18's scheme (container is primary scan target, aliquot scanned at storage check-in/out, submission number resolves to a disambiguation list) is **plausible but unconfirmed**; a real lab may instead use one label per submission with no container-level distinction, especially at lower container counts.
**Basis + grade:** STRUCTURAL INFERENCE (reasoned from SOP-001's container-index mechanism) — no primary regulatory text mentions barcodes at all (zero occurrences across Part 211, Part 11, FDA 2018 DI guidance, PIC/S PI 041-1, per #18's own scouting), so this is purely a usability question, not a compliance one.
**Load-bearing for:** #18's label/scan-target design.
**Cheapest refutation:** Look at an actual label on an actual container.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## H — From #41 (Rounding rule migration), 9 questions

### 44 (Q1). Rounding elicitation — three concrete pass/fail judgements (Method owner, per method)
> a. Limit NLT 98.0%, result 97.96% — pass?
> b. Same limit, 97.95% — pass?
> c. Limit NMT 1.2%, result 1.25% — pass?

**Prediction:** (a) **pass** (round-then-compare, most common convention — ASTM E29-style rounding is widespread even where not cited); (b) **fail** (true rounding, not truncation); (c) **fail** (round-half-up is the more common convention than round-half-even in pharma, though half-even is not rare). If any method owner instead answers "I'd have to check the spreadsheet," that itself is the finding, per the ticket's own instruction — do not let the asker go look.
**Basis + grade:** CONVENTION, UNSOURCED (ASTM E29 rounding convention is broadly cited in pharmacopoeial contexts but not independently primary-verified here; USP <621>/<711> were flagged as paywalled and unread by the scout).
**Load-bearing for:** #41's Q1 is its own reversal condition; #26 (Reshape 2)'s placement of the rounding rule on the limit is wrong if two method owners disagree for the same limit.
**Cheapest refutation:** Ask exactly as scripted, record verbatim, do not let anyone go check first.
**Confirmed answer (a):** _____ **(b):** _____ **(c):** _____  RIGHT / WRONG / PARTLY

### 45 (Q2). Any method reference ASTM E29 or compare unrounded to the limit? (Method owner)
**Prediction:** **Unlikely to be stated explicitly**; most methods will implicitly compare the unrounded value, matching what "both open-source LIMS precedents, and Benchline's own prototype today" already do.
**Basis + grade:** STRUCTURAL INFERENCE (matches current prototype behaviour, per the brief) — NO BASIS — GUESS for whether any method states this explicitly.
**Load-bearing for:** whether #41's `{kind:'absolute'}` arm is load-bearing or dead weight.
**Cheapest refutation:** Read the acceptance-criteria wording of five methods.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 46 (Q3). Has "Set precision as displayed" ever been enabled in the workbook? (Workbook maintainer) — TEN-SECOND CHECK
**Prediction:** **Unknown, genuinely 50/50** — this option is obscure enough that most workbook maintainers have never touched it, but old inherited workbooks sometimes have it on for unrelated historical reasons. No lean either way.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** whether cross-checking migrated rounding rules against historical values is possible at all, or structurally impossible (Microsoft's own documentation: the lost digits cannot be recovered, per #41).
**Cheapest refutation:** Literally check the one checkbox: File → Options → Advanced → "When calculating this workbook."
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 47 (Q4). Reporting precision ever differ from limit precision? (Method owner/QA)
**Prediction:** **Occasionally** — e.g., assay reported to two decimals against a limit written to one, particularly for impurities under ICH Q3A(R2)-style conventions.
**Basis + grade:** PRIMARY REGULATORY TEXT (ICH Q3A(R2) convention cited by #41) for the pattern existing in the industry generally; NO BASIS — GUESS for whether it occurs at this lab.
**Load-bearing for:** whether #41's separate displayed-value/judged-value machinery stays active or dormant.
**Cheapest refutation:** Compare five methods' reporting precision against their limit precision.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 48 (Q5). Microbiological enumeration against powers-of-ten criteria? (QC manager)
**Prediction:** **No** — the archetype sample panel used for this map is finished-product tablet chemistry, not microbiological release testing; if the real lab does no microbiology this is moot.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** routes to #26 (limit union) or #23 (analytical QC), or closes cleanly if the lab does no microbiology.
**Cheapest refutation:** Ask directly.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 49 (Q6). Any method rounds to a non-decimal interval (nearest 0.5 mg, nearest 5 units)? (Method owner)
**Prediction:** **Rare but plausible** for gravimetric or dosage-unit-count methods; most assay/impurity methods round to decimal places.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** whether #41's knowing refusal to represent this must be revisited before that specific method is admitted.
**Cheapest refutation:** Ask directly, method by method.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 50 (Q7). Any method's precision changes with result magnitude? (Method owner)
**Prediction:** **Plausible for impurity methods**, following ICH Q3A(R2)'s own convention (below 1.0% → two decimals, at/above → one) — this is described as pharmaceutical-standard, not exotic.
**Basis + grade:** PRIMARY REGULATORY TEXT (ICH Q3A(R2) convention) for the pattern existing generally; NO BASIS — GUESS for whether this specific lab's methods use it.
**Load-bearing for:** same consequence as Q49 — the gate stops such a method at admission if it does.
**Cheapest refutation:** Ask directly, focused on impurity methods first.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 51 (Q8). Any limit uses a strict inequality? Is exactly-at-the-limit a pass? (Method owner)
**Prediction:** **Mostly inclusive ("not more than")**; a genuinely strict ("less than") limit is uncommon but not impossible.
**Basis + grade:** NO BASIS — GUESS.
**Load-bearing for:** #49 (endpoint inclusivity) — Benchline is inclusive-only today "by accident of a single line of code."
**Cheapest refutation:** Ask directly, with the concrete example given in the ticket.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

### 52 (Q9). Does the analyst record the unrounded outcome, or only an already-rounded instrument printout value? (Analyst, at the bench) — THIS CARRIES #41'S REVERSAL CONDITION
**Prediction:** The **unrounded outcome is written on the worksheet**, matching SOP-004 §6's stated procedure ("the formula used, the input values, and the unrounded outcome") — but the archetype flags real risk that in practice the analyst copies an already-rounded instrument printout number instead, in which case #41 is wrong in its premise, not its detail.
**Basis + grade:** SYNTHETIC SOP SET (SOP-004 §6, `docs/synthetic-sops/walkthrough.md:195-207`) for what's written; genuinely **NO BASIS — GUESS** for what is actually written down at the bench.
**Load-bearing for:** #41's entire premise. If the analyst's number is already rounded off an instrument printout, the rounding rule never lived in the specification workbook — it lives in an instrument data-system processing method, and the question relocates to instrument/CDS integration (currently "Not yet specified" on the map).
**Cheapest refutation:** Look at the last completed worksheet and point to where the unrounded outcome is written, exactly as the ticket instructs.
**Confirmed answer:** _______________________  RIGHT / WRONG / PARTLY

---

## Check these six first

Ranked by (blocking impact × probability the archetype prediction is wrong).
Impact is "how many downstream decisions move, and how far"; probability-wrong
is judged from how thin the basis is (NO BASIS — GUESS predictions with a
named reversal condition rank highest) and from how plausible the *opposite*
of the prediction is on ordinary bench economics.

1. **Row 26 (Q1 of #29) — is the specification workbook retyped or generated?**
   Highest rank: it is explicitly named as #29's own reversal condition, it
   also feeds the walkthrough's entire "hold-the-criterion" bottleneck
   argument (`walkthrough.md` §7), and the prediction (retyped/parallel) is a
   coin-flip against the alternative (generated). Ten minutes with the
   workbook maintainer settles both #29 and half of §7 at once.

2. **Row 52 (Q9 of #41) — does the analyst write the unrounded outcome?**
   Carries #41's reversal condition outright. If wrong, the entire rounding
   migration relocates to an unbuilt instrument/CDS integration scope — the
   single highest-impact "wrong premise" risk on this sheet, and it is
   settled by looking at one worksheet.

3. **Row 4 — peak concurrent writers.** Named by #15 itself as "the single
   assumption most likely to be wrong and the one that matters most." A
   15-minute headcount at the busiest hour settles it; the prediction (3–6) is
   a genuine guess with no source at all, and the consequence (manageable vs.
   constraining) is binary.

4. **Row 34 (Q1 of #34) — does the supervisor ever proceed past a lapsed
   qualification?** #34's whole advisory-vs-block design turns on this, two
   personas disagree sharply, and getting it backwards means shipping a block
   that halts real work on a known-stale copy, or an advisory path where a
   hard stop was actually wanted.

5. **Rows 2/3 — per-test assignment vs. run-batched bench work.** This is
   #25's explicit reversal condition for declining to build a worksheet/run
   entity. It is cheap to check (one shadowed shift, under an hour) and
   expensive to get wrong (a second reshape later).

6. **Row 17 (#9's reviewer-check question) — what does the review actually
   inspect, and as-at when?** Three rows of #9's classification (reagent
   control, qualification, calibration) collapse from seam to out if this
   goes one way; #9 itself calls SOP-005 §4 "the most expensive sentence in
   the synthetic set." One observed or asked review settles it.

---

## Vocabulary markup table — extends `walkthrough.md` §8

The rule for every row: **the laboratory wins**. Where the "real term" column
is blank, no prediction exists yet — write in the term heard at the bench.

| `CONTEXT.md` term | Archetype/SOP usage (predicted) | Predicted collision risk | Real term heard at the bench | Winner |
| --- | --- | --- | --- | --- |
| Sample | "Sample" for the laboratory-number group; "container" for sub-unit | Real lab may call the container itself "the sample" | ___________ | Laboratory |
| Result | "Result," "reportable value," "determination" used for different things | High — "result" likely used loosely for raw/calculated/approved value alike | ___________ | Laboratory |
| Review | Distinguished from release, matching `CONTEXT.md` | Low | ___________ | Laboratory |
| Exception | Never used; "OOS"/"OOT" used instead | High — analysts almost certainly say "OOS," not "exception" | ___________ | Laboratory |
| Activity record | Not a bench term at all — system/Benchline term only | Certain — expect blank stares; ask what the *paper* equivalent is called, if anything | ___________ | Laboratory |
| Specification | Used consistently | Low | ___________ | Laboratory |
| Batch | "Batch" used for client-supplied lot ID | Low, but check whether "lot" is the actual floor word | ___________ | Laboratory |
| Test | One analytical determination | Unclear — may collide with "assay" used generically for any test, not only the Assay test | ___________ | Laboratory |
| Worksheet | Not a `CONTEXT.md` term at all; SOP-003/004 term for the per-test paper record | Real lab may call this "the sheet," "the raw data sheet," or something else entirely — worth pinning down since #25's reversal condition uses the word "worksheet" to mean a *run-grouping entity* (SENAITE sense), which is a different meaning from the SOP set's per-test sense. **This ambiguity is itself worth flagging to the human**, not just the term. | ___________ | Laboratory |

---

## What this document still cannot establish

- Whether any single prediction above is true of the real laboratory. No
  claim above has been checked against reality; every "Confirmed answer"
  line is blank until a human fills it in.
- Any duration, throughput, staffing ratio, OOS rate, or rework rate not
  already flagged NO BASIS — GUESS — none of these exist in citable published
  form for pharma QC specifically (`docs/research/qc-lab-throughput-and-staffing-norms.md`).
- Whether the "run vs. per-test" disagreement (rows 2/3) and the "advisory
  vs. block" qualification disagreement (row 34) resolve the same way in
  practice as in the persona role-play above — the disagreements are recorded
  as open, not adjudicated.
- Whether the vocabulary table's "Real term" column will even be the same
  across different people in the same lab — this document assumes one
  consistent bench vocabulary; a real lab may have inconsistent usage between
  shifts, roles, or individuals, and that inconsistency would itself be a
  finding this sheet cannot anticipate.
- Which reversal conditions on the wayfinder map this sheet's confirmed
  answers will actually discharge, once filled in — that determination is the
  orchestrator's to make after a human has marked this sheet up, not this
  document's to make now.
- Whether a single hour with a human is even enough to answer all 45+ rows
  credibly — some (rows 4, 40, 41) call for a headcount or a timed
  observation, not a conversation, and a rushed verbal answer to those risks
  producing a *confident wrong number* rather than an honest "we don't
  measure that."
