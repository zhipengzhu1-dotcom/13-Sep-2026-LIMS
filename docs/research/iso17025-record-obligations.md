# What record must exist at each step of the sample-to-report chain, according to ISO/IEC 17025:2017?

**Asked by:** Orchestrator, scout task "scout-22-iso17025-record-obligations"
**Date:** 2026-09-11
**Status of sources:** ISO/IEC 17025:2017 itself is paywalled (https://www.iso.org/standard/66912.html) and was **not purchased or reproduced verbatim** here, per the no-reproduction constraint. All clause content below is reported from secondary sources that summarise or excerpt the standard — accreditation-body guidance (UKAS, A2LA, ANAB), accredited-body training slide decks (pjlabs.com, iso17025.training), and industry explainer sites (ISOBudgets, 17025store, Clarity Standards Laboratory). Every claim is tagged with which source it came from. No claim below is checked against the ISO text itself. Where a source's reliability is uncertain (marketing-oriented LIMS vendor blogs), I have flagged it as lower-confidence. I did **not** use a PDF of the full standard text that surfaced in search results (dastmardi.ir), since it appears to be an unauthorized copy and using it would conflict with the no-reproduction-of-paywalled-text constraint.

I did not have separate ILAC-G8/G17 documents open at ilac.org directly; ILAC-G8 content is reported via the ISOBudgets and Fluke secondary explanations of it, not the ILAC PDF itself. This is flagged in "What I could not establish."

## Findings

### Record obligations by workflow step

**Receipt (coordinator's step) — Clause 7.4, Handling of test or calibration items.**
Per UKAS/pjlabs-referenced summaries (via 17025store and search-aggregated clause text), the laboratory must have a documented procedure covering transportation, receipt, handling, protection, storage, retention, and disposal/return of items, including provisions to protect item integrity and the interests of both lab and customer. Any deviation, abnormality or damage found at receipt must be recorded and the customer consulted before work proceeds. Where storage/conditioning has defined environmental requirements, those conditions must be maintained, monitored and recorded. (Source: search-aggregated clause summary drawing on UKAS/pjlabs training material; not independently verified against the ISO text.)

**Contract/intake agreement — Clause 7.1, Review of requests, tenders and contracts.**
Before work begins, the laboratory must resolve any difference between what the customer requested and what the laboratory can deliver, and the resulting agreement (methods, requirements, capability) must be acceptable to both parties. Any customer-requested deviation must not compromise the integrity of the laboratory or the validity of results. (Source: pjlabs.com webinar slide summary of 7.1, as surfaced in search; secondary source, unverified against the standard directly.)

**Method selection — Clause 7.2, Selection, verification and validation of methods (7.2.1).**
The laboratory must use methods and procedures appropriate for the activity, kept current, and available to personnel. Methods must be verified (and validated, if non-standard) as fit for purpose before use. (Source: general secondary summary; the detail that current methods must be "available to personnel" is reported from general knowledge of the clause structure and was not independently confirmed against a cited source in this pass — flagged as lower-confidence.)

**Sampling — Clause 7.3.**
Applies where the laboratory itself draws the sample from a population/process according to a sampling plan and procedure, with records of the sampling method, identification, environmental conditions and any deviations from the plan. For a laboratory that **receives** samples already drawn by the customer or a third party, 7.3 does not govern the intake — that activity falls under 7.4 (handling of items) and 7.1/7.2 (whether the received sample and requested test are within the lab's validated scope), not 7.3. This distinction is drawn from the structure of the standard as summarized in secondary sources (17025store clause outline); it is a reasonable reading rather than a verified statement of the clause text.

**Testing and technical record — Clause 7.5, Technical records.**
This is the core "what must exist" clause. Per the search-aggregated summary (echoing UKAS-type guidance): technical records must contain sufficient information for a competent person to repeat the activity under conditions as close as possible to the original, including results, report, and enough data (raw observations, calculations, derived data, identification of personnel and equipment involved) to permit an uncertainty evaluation. Records must be made at the time the observation, calculation or activity is performed and be identifiable to the specific task.

**QC check on results — Clause 7.7, Ensuring the validity of results.**
The laboratory must have a documented procedure for monitoring the validity of results — described in secondary sources as including quality control, use of control charts where applicable, and (7.7.2) participation in proficiency testing or interlaboratory comparisons relevant to scope. Monitoring data must be recorded, analysed, and acted on (e.g. trend/failure triggers corrective action). (Source: search-aggregated summary; ISOBudgets/pjlabs-type secondary material.)

**Measurement uncertainty — Clause 7.6.**
Laboratories testing (not just calibrating) must evaluate measurement uncertainty; where the method itself precludes rigorous statistical evaluation, an estimate based on theoretical understanding or practical/historical data is required instead. (Source: search-aggregated secondary summary.)

**Review — Clause 6.2, Personnel, and 7.5/7.8 read together.**
Per A2LA-sourced summary, clause 6.2.5 requires the laboratory to have both a procedure and retained records for: determining competence requirements, selecting personnel, training, supervision, **authorization** of personnel, and monitoring of personnel competence. Personnel must be formally authorized by management (based on demonstrated competence) before performing, reviewing, or signing off on specific activities — i.e., the standard requires a documented record of *who is authorized to do what*, not just that a review happened. (Source: A2LA "Explaining ISO/IEC 17025 Competency Requirements," as summarized in search results.)

**Reporting — Clause 7.8, Reporting of results.**
- 7.8.1 (general) and 7.8.2 (common requirements) require reports to contain information needed to interpret results and to be complete, accurate, and traceable — not independently verified in detail this pass.
- 7.8.3 sets test-report-specific content requirements — not independently verified in detail this pass; flagged as unverified/general-knowledge.
- **7.8.6, Statements of conformity**, was directly summarized from a secondary source: when a laboratory issues a statement of conformity (pass/fail, in/out of tolerance) against a specification, it must document and apply a **decision rule**, and the report must state whether measurement uncertainty was taken into account in that decision rule, which decision rule (or reference document) was applied, and the resulting statement. (Source: ISOBudgets.com summary of 7.8.6.1–7.8.6.2, and a search-aggregated paraphrase consistent with it.)

**Nonconforming work — Clause 7.10.**
Covers the case where testing activity, or its results, does not conform to the lab's own procedures or the agreed customer requirements (e.g. wrong test run, mislabeled sample, equipment out of calibration used). Per the secondary summary (Clarity Standards Laboratory / search aggregation), the laboratory must have a procedure that is implemented when nonconforming work is identified, defining responsibilities and authorities, evaluation of the significance of the nonconformity, corrective action, and, where necessary, halting or repeating the work and notifying the customer. This implies a record of the nonconformity and its disposition, though the precise record-content requirement was not independently verified against the standard's text in this pass.

**Data/LIMS control — Clause 7.11, Control of data and information management.**
Described in secondary sources as a clause new to the 2017 revision, covering any software/system (including a LIMS) used to acquire, process, record, report, store or retrieve data: the system must be validated for its intended functionality before use, protected against unauthorized access, and protected against loss or corruption of data (including backup), and failures or malfunctions of the system must themselves be recorded. (Source: search-aggregated summary combining Elsmar Quality Forum discussion and multiple LIMS-vendor explainer pages; note several of these sources are LIMS vendor marketing content and are lower-confidence as a paraphrase of the standard, though they converge on the same substance.)

### Clause 7.5.2 — Amendments to technical records (detailed)

Per the search-aggregated summary (drawing on UKAS-adjacent training material): when a technical record is amended, both the **original recorded value/observation and the amended value** must be retained — the amendment does not overwrite or delete the original. Each amendment must be traceable to **who** made the change and **when** it was made ("tracked to previous versions or to the original observations," with "date of alteration, altered aspects and personnel responsible"). This is the core "no silent overwrite" requirement and is the closest analogue in 17025 to the ALCOA+ tracked-change expectation seen in FDA data-integrity guidance. I was not able to independently verify the exact clause wording (e.g. whether it specifies electronic vs. paper records separately) against the standard itself.

### Clause 7.8.8 — Amendments to reports (detailed)

Not independently located in a cited secondary source during this pass. General structural knowledge of the standard (unverified in this research) is that when a report requires amendment after issue, any change must be issued as a *further document*, or transfer of data, that is clearly identified and references the original it supersedes — an amended report is not a silent replacement of the original but an additional, traceable document. **This is flagged as unverified** — I found no secondary source in this session that stated the 7.8.8 mechanism with a citation, so it should be treated as general knowledge, not a sourced finding, until confirmed.

### Decision rules and statements of conformity (7.8.6 + ILAC-G8)

A **decision rule**, per ISO/IEC 17025:2017's own definition as paraphrased by ISOBudgets (citing clause 3.7), is "a rule that describes how measurement uncertainty is accounted for when stating conformity with a specified requirement." This differs from a bare comparison of a measured value against a specification limit: a decision rule requires the laboratory to state explicitly how the measurement uncertainty around that value is factored into the pass/fail call (e.g., whether the uncertainty band must fall entirely within limits, or whether "simple acceptance" with shared risk is used). ILAC-G8 (referenced only via the ISOBudgets secondary summary, not fetched directly from ilac.org in this session) is described as providing worked methodologies for this, including "simple acceptance" and guard-banding approaches. **I did not independently confirm the ILAC-G8 content from ilac.org** — this should be treated as a secondary-source paraphrase, not a verified reading of the ILAC guidance itself.

### Where 17025 diverges from 21 CFR 211 (no cGMP equivalent)

Based on general knowledge of both frameworks (not independently re-verified against 21 CFR 211 text in this session, but consistent with prior research already in this repository on cGMP requirements — see `docs/research/account-controls-regulatory-text.md` and related files), the following 17025 obligations have no direct counterpart in 21 CFR Part 211:
- **Measurement uncertainty evaluation (7.6)** — Part 211 does not require a laboratory to compute or report measurement uncertainty for a result.
- **Decision rules / guard-banding for conformity statements (7.8.6)** — Part 211 requires results to meet specifications but does not require a documented decision rule accounting for uncertainty when declaring conformance.
- **Proficiency testing / interlaboratory comparison (7.7.2)** — not a Part 211 requirement; Part 211 relies on internal validation and QC rather than external PT schemes as a baseline expectation.
- **Impartiality and conflict-of-interest management (17025 Clause 4)** — not addressed in Part 211 in comparable terms.
- **Formal contract/tender review (7.1)** — Part 211 does not have an analogous "review of request/contract before work begins" requirement in the same form; its closest relative is batch-record and specification agreement, but not a contract-review clause.

## What I could not establish

- The exact wording and mechanism of **7.8.8 (amendments to reports)** — I could not find a cited secondary source describing it in this session; what I noted above is unverified general knowledge and should not be relied on without confirmation.
- The precise content requirements of **7.8.2 (common report requirements)** and **7.8.3 (test-report-specific content)** — not independently verified against a cited source this pass.
- Whether **7.2.1**'s "methods available to personnel" language is exact or paraphrase — reported as general knowledge, unverified.
- The exact ILAC-G8 and ILAC-G17 text — not fetched from ilac.org directly in this session; reported only via a secondary paraphrase (ISOBudgets, Fluke).
- Clause **8.4 (control of records)** retention/legibility/identification specifics — search did not surface a clearly sourced summary distinct from general document-control language; not established with a specific citation in this pass.
- Whether any 17025 clause imposes a **specific retention period** (e.g., in years) — not found in the sources consulted; 17025 is generally understood to leave retention duration to the laboratory's own policy/regulatory context rather than mandating a number, but this was not confirmed against a cited source.

## Sources

- ISO/IEC 17025:2017 standard page (not purchased/reproduced): https://www.iso.org/standard/66912.html
- ISOBudgets, "Statements of Conformity and Decision Rules for ISO 17025": https://www.isobudgets.com/statements-of-conformity-and-decision-rules/ (fetched 2026-09-11)
- A2LA, "Explaining ISO/IEC 17025 Competency Requirements": https://a2la.org/explaining-iso-iec-17025-competency-requirements/ (surfaced via search, 2026-09-11)
- 17025store, "Clause 7: Process Requirements": https://17025store.com/iso-iec-17025-2017-requirements/clause-7-process-requirements/ (surfaced via search, 2026-09-11)
- Clarity Standards Laboratory, "ISO 17025 Clause 7.10 Nonconforming Work": https://claritystdlab.com/iso-17025-clause-7-10-nonconforming-work-managing-errors-with-integrity/ (surfaced via search, 2026-09-11)
- pjlabs.com training slide decks on ISO/IEC 17025:2017 sections 7.1, 7.4, 7.10 (accreditation-training material, not the standard itself): https://www.pjlabs.com/downloads/webinar_slides/ (various, surfaced via search, 2026-09-11)
- Fluke, "Decision Rules in Calibration | Applying ILAC G8 and ISO/IEC Guide 98-4": https://www.fluke.com/en-us/learn/blog/calibration-software/decision-rules-conformity-assessment (surfaced via search, 2026-09-11)
- Elsmar Quality Forum thread on Clause 7.11: https://elsmar.com/elsmarqualityforum/threads/is-iso-iec-17025-2017-clause-7-sub-clause-7-11-control-of-data-and-information-management.77879/ (surfaced via search, 2026-09-11; forum discussion, lower-confidence secondary source)
- ILAC guidance series index (not fetched directly; content reported only via secondary paraphrase above): https://ilac.org/publications-and-resources/ilac-guidance-series/
- UKAS LAB 13, "Guidance on the Application of ISO/IEC 17025" (surfaced in search results but not fetched/read directly in this session — listed for completeness, not used as a confirmed source): https://www.ukas.com/wp-content/uploads/schedule_uploads/759162/LAB-13-Guidance-on-the-Application-of-ISO-IEC-17025-Opinions-and-Interpretations.pdf

**Note on scope:** Nothing in this document is a compliance determination or a recommendation. ISO/IEC 17025 accreditation is out of scope for the Benchline project; this research uses 17025 solely as a lens on what a complete analytical record looks like.
