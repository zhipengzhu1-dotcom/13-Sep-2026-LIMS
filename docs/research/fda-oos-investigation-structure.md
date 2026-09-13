# What does FDA's current OOS guidance require of an out-of-specification investigation, structurally — states, outcome vocabulary, and the record left behind?

**Asked by:** Reshape 3 of 3: investigation as an entity, and temporal status (ticket)
**Date:** 2026-09-11
**Status of sources:**
- FDA guidance: confirmed as the **May 2022 "Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production, Level 2 revision"**, downloaded directly as PDF from `https://www.fda.gov/media/158416/download` (linked from the FDA guidance-search landing page, which itself labels it "Final Level 2 Revised Guidance," docket FDA-1998-D-0019). This is distinct from the older October 2006 version (hosted separately at `https://www.fda.gov/media/71001/download`), which I did not use as a source of any claim below. Page/section references below are to the May 2022 PDF (14 numbered content pages plus front matter; section headers cited as printed).
- 21 CFR 211.192 and 211.194(a): retrieved via the eCFR Versioner API for the most recent available issue date at query time, **2026-09-09** (the API rejected 2026-09-11 as beyond the title's latest issue date). Full XML text pulled directly, not a mirror or summary site.

## Findings

### 1. Phase I vs Phase II

The guidance names two explicit phases:

- **"III. IDENTIFYING AND ASSESSING OOS TEST RESULTS — PHASE I: LABORATORY INVESTIGATION"** (p.3). Phase I is the laboratory's own initial assessment, done by the analyst and laboratory supervisor, ideally "before test preparations ... are discarded," so that "hypotheses regarding laboratory error or instrument malfunctions can be tested using the same test preparations." Its purpose is to determine whether the OOS result is attributable to laboratory/measurement error. The guidance lists specific supervisor steps (discuss method with analyst, examine raw data, verify calculations, confirm instrument performance, confirm reference standards/reagents, evaluate method performance, "fully document and preserve records of this laboratory assessment").
- **"IV. INVESTIGATING OOS TEST RESULTS — PHASE II: FULL-SCALE OOS INVESTIGATION"** (p.6). Trigger: "When the initial assessment does not determine that laboratory error caused the OOS result and testing results appear to be accurate, a full-scale OOS investigation using a predefined procedure should be conducted." Phase II is conducted by the Quality Unit (QU) "and should involve all other departments that could be implicated, including manufacturing, process development, maintenance, and engineering," including other sites if manufacturing is off-site. For contract laboratories specifically: "the laboratory should convey its data, findings, and supporting documentation to the manufacturing firm's quality unit (QU). The manufacturing firm's QU should then initiate the Phase 2 (full-scale) OOS investigation, whenever no clearly causative laboratory error was identified" (p.3).

What each phase concludes with:
- Phase I concludes with either (a) identification of a clear, documented laboratory error — in which case the result may be invalidated (see §2 below) — or (b) no clear laboratory error found, which triggers Phase II.
- Phase II concludes with a written record containing: "1. A clear statement of the reason for the investigation. 2. A summary of the aspects of the manufacturing process that may have caused the problem. 3. The results of a documentation review, with the assignment of actual or probable cause. 4. The results of a review made to determine if the problem has occurred previously. 5. A description of corrective actions taken" (p.6). If this confirms the OOS result and finds root cause, "the OOS investigation may be terminated and the product rejected," but "a failure investigation that extends to other batches or products that may have been associated with the specific failure must be completed (§ 211.192)" (p.7).

### 2. Invalidation with assignable cause

Exact language: "Invalidation of a discrete test result may be done only upon the observation and documentation of a test event that can reasonably be determined to have caused the OOS result" (p.12, section V.A).

Also: "In summary, when clear evidence of laboratory error exists, laboratory testing results should be invalidated. When evidence of laboratory error remains unclear, a full-scale OOS investigation should be conducted... OOS test results should not be attributed to analytical error without completing an investigation that clearly establishes a laboratory root cause" (p.5).

So the guidance requires a **confirmed, documented, observed cause** — not a hypothesis or plausible theory. It uses "clearly identified," "clear evidence," and "clearly establishes" repeatedly; it does not permit invalidation on a merely hypothesized or suspected error. The example error types given (spilled sample, incomplete transfer, damaged dosage unit, incomplete extraction) are all observed physical/procedural events, not statistical inference.

On what happens to the invalidated result: "In the case of a clearly identified laboratory error, the retest results would substitute for the original test result. However, **all original data must be retained (§ 211.180) and an explanation should be recorded**. This record should be initialed and dated by the involved persons and include a discussion of the error and supervisory comments" (p.8, section IV.B.1). So the invalidated result is superseded *for use* (the retest substitutes as the operative result) but is not erased or removed from the record — the original data and the explanation for invalidation persist alongside it.

Explicit converse: "If no laboratory or calculation errors are identified in the first test, there is no scientific basis for invalidating initial OOS results in favor of passing retest results. All test results, both passing and suspect, should be reported and considered in batch release decisions" (p.8).

### 3. Outcome vocabulary

The guidance's own terms, quoted:

- **"confirmed OOS result"** — "In those cases where the investigation indicates an OOS result is caused by a factor affecting the batch quality (i.e., an OOS result is confirmed), the result should be used in evaluating the quality of the batch or lot. A confirmed OOS result indicates that the batch does not meet established standards or specifications and should result in the batch's rejection, in accordance with § 211.165(f)" (p.12).
- **"invalidated"** / invalidation "upon the observation and documentation of a test event" (p.12) — this is the guidance's term for the laboratory-error outcome; the guidance does not use a fixed noun phrase like "laboratory error result" as a formal category label, though it discusses "laboratory error" extensively as the underlying cause.
- **"inconclusive"** (used as an adjective, "inconclusive investigations") — "For inconclusive investigations — in cases where an investigation (1) does not reveal a cause for the OOS test result and (2) does not confirm the OOS result — the OOS result should be given full consideration in the batch or lot disposition decision" (p.12).
- The guidance also uses **"batch failure investigation"** as the label for what a Phase II investigation becomes once OOS is confirmed: "the investigation changes from an OOS investigation into a batch failure investigation, which must be extended to other batches or products that may have been associated with the specific failure (§ 211.192)" (p.12).

Terms the guidance does **not** use as formal category labels, despite being common industry shorthand: "assignable cause" appears in the guidance (e.g., "does not determine an assignable cause," p.12) as a description of whether a cause was found, not as a defined outcome category with a fixed name. "Laboratory error" is used descriptively throughout but the guidance never presents a closed, numbered taxonomy of outcome states — the three states extractable from the text (confirmed / invalidated-for-lab-error / inconclusive) are my synthesis of scattered language, not a table or list the guidance itself presents as such. This is a structural absence worth flagging: **the guidance narrates outcomes in prose and does not enumerate a fixed vocabulary or state list.**

### 4. Retesting vs reanalysis vs resampling

The guidance distinguishes only **retesting** and **resampling** (it does not use the term "reanalysis" as a distinct category anywhere in the document):

- **Retesting** (section IV.B.1, p.7): "analysis of the original, homogenous sample material" — a portion of the same original sample composite/aliquot already collected and tested.
- **Resampling** (section IV.B.2, p.8): "involves analyzing a specimen from any additional units collected as part of the original sampling procedure or from a new sample collected from the batch, should that be necessary."

On the retest plan: "It is often important for the predefined retesting plan to include retests performed by an analyst other than the one who performed the original test" (p.7) — note "often important," not an absolute mandate on every retest.

On approval and sequencing, where retesting goes beyond the SOP-specified maximum: "In such cases, before starting additional retesting, a protocol should be prepared (**subject to approval by the QU**) that describes the additional testing to be performed and specifies the scientific and/or technical handling of the data" (p.8). This is explicit: protocol before testing begins, approved by the QU, and only required to be a distinct written protocol in the specific case of exceeding the pre-set maximum number of retests in the SOP.

More generally: "The maximum number of retests to be performed on a sample should be specified in advance in a written standard operating procedure (SOP)... The number of retests should not be adjusted depending on the results obtained. The firm's predetermined retesting procedures should contain a point at which the additional testing ends and the batch is evaluated" (pp.7–8). The guidance explicitly condemns "testing into compliance": "some firms use a strategy of repeated testing until a passing result is obtained, then disregarding the OOS results without scientific justification. This practice of 'testing into compliance' is unscientific and objectionable under CGMP" (p.7).

For resampling, if the original sampling method is found inherently inadequate: "a new accurate sampling method must be developed, documented, and reviewed and approved by the QU (§§ 211.160 and 211.165(c))" (p.8) — again, approval precedes use.

### 5. Averaging and outliers

**Averaging** (section IV.C.1, pp.8–10):
- Averaging is permitted only where it was part of the *original*, pre-specified test method (e.g., optical rotation, microbiological assays, HPLC replicate injections averaged into "one test and one result") — "These appropriate uses of averaging test data should be used during an OOS investigation only if they were used during the original testing that produced the OOS result."
- Explicitly forbidden: "averaging the result(s) of the original test that prompted the investigation with additional retest or resample results obtained during the OOS investigation is not appropriate because it hides variability among the individual results."
- Worked example given: an 89% initial OOS result plus 90% and 91% retests averaging to a passing 90% — "this average would meet specification, [but] the additional test results also tend to confirm the original OOS result." The guidance's rule: "the individual results, not the average, should be used to evaluate the quality of the product."
- Cautions section (V.B.1) goes further: where a series of assay results is intended to produce one reportable result and some individual replicates are OOS, "a firm should err on the side of caution and treat the average of these values as an OOS result, even if that average is within specification."

**Outlier tests** (section IV.C.2, pp.10–11):
- Permitted for biological assays with high inherent variability (citing USP <111>), where "the outlier observation is omitted from calculations," with a caution against "arbitrary rejection... without investigation as to cause."
- **Forbidden for chemical assay data on homogeneous samples**: "For validated chemical tests with relatively small variance, and if the sample being tested can be considered homogeneous... an outlier test is only a statistical analysis of the data obtained from testing and retesting. It will not identify the cause of an extreme observation and, therefore, **should not be used to invalidate the suspect result**." A footnote cites *U.S. v. Barr Laboratories* (D.N.J. 1993) for "outlier testing should not be used to invalidate chemical assays."
- Also forbidden where the test purpose is to measure variability itself (content uniformity, dissolution, release rate): "a value perceived to be an outlier may in fact be an accurate result of a nonuniform product."
- Any outlier test used must be specified in advance in an SOP, with the specific test, parameters, and minimum sample size for statistical significance pre-defined.

### 6. The record

The guidance requires **both** the original and any invalidated/superseded result to persist in the record — a passing retest does not erase the OOS result:

- "all original data must be retained (§ 211.180) and an explanation should be recorded. This record should be initialed and dated by the involved persons and include a discussion of the error and supervisory comments" (p.8).
- "as with all analytical testing conducted to evaluate the quality of a drug, all records pertaining to the OOS test result should be retained. Records must be kept of complete data derived from all tests performed to ensure compliance with established specifications and standards (§ 211.194)" (p.14, section V.B.3).
- "All test results, both passing and suspect, should be reported and considered in batch release decisions" (p.8), with a footnote clarifying "reported" means included in quality control reports, batch records, and Certificates of Analysis per §§ 211.188 and 211.192.
- Even where laboratory error is confirmed and the retest "substitutes" as the operative result for disposition purposes, this is a substitution of *which value is used to judge the batch*, not a deletion of the original from the record.

From eCFR, 21 CFR 211.192 (Production record review), current text: "A written record of the investigation shall be made and shall include the conclusions and followup." 21 CFR 211.194(a) (Laboratory records) requires "complete data derived from all tests necessary to assure compliance with established specifications and standards," itemized as: sample description/source/date, the test method used, weight/measure of sample, "a complete record of all data secured in the course of each test," calculations, "a statement of the results of tests and how the results compare with established standards," the analyst's initials/signature and date, and "the initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards" (211.194(a)(1)–(8)).

### 7. Timing/sequence constraints

Explicit ordering language extracted from the guidance:

- Phase I assessment should occur, "whenever possible," **before** test preparations are discarded (p.3).
- Analysts "should not knowingly continue an analysis they expect to invalidate at a later time for an assignable cause" — i.e., no continuing/completing an analysis after an obvious error is known, "for the sole purpose of seeing what results can be obtained" (p.4).
- The Phase II full-scale investigation is triggered only **after** Phase I fails to determine laboratory error (p.3, p.6).
- When retesting beyond the SOP-defined maximum is contemplated, the protocol "should be prepared" and is "subject to approval by the QU" **before starting additional retesting** (p.8) — approval precedes execution.
- If the original sampling method is found inadequate, a new sampling method "must be developed, documented, and reviewed and approved by the QU" (p.8) — again approval precedes use, though the guidance does not state explicitly whether this approval must precede or may follow the resampling event itself when using an *existing* validated method (only the case of a *new* method carries an explicit "must be... approved" before use).
- Batch failure investigation (extension to other batches/products) "must be completed" once OOS is confirmed (§ 211.192, cited p.7 and p.12) — the guidance does not state a specific time limit for this extension in the main text.
- Field Alert Report timing (section V.C, p.14, citing 21 CFR 314.81(b)(1)(ii)): a FAR must be submitted within **3 working days** of information concerning failure of a distributed batch to meet specifications, unless "the OOS result on the distributed batch is found to be invalid within 3 days." A **follow-up FAR** must be submitted "when the OOS investigation is completed" — establishing an explicit two-stage report (initial, then follow-up-on-completion) tied to the investigation's own completion event.
- "Once a batch has been rejected, there is no limit to further testing to determine the cause of the failure so that a corrective action can be taken" (p.12) — i.e., batch disposition (rejection) does not close the investigation; further testing may continue after disposition.
- "Batch rejection does not negate the need to perform the investigation" (p.3) — disposition and investigation completion are explicitly decoupled.

## What I could not establish

- The guidance does not present a single enumerated, closed list of investigation "outcome states" — the terms "confirmed OOS," "invalidated," and "inconclusive" are drawn from separate passages in prose, not from one definitional table. Any fixed three- (or more-) state vocabulary is an inference from the text, not a verbatim FDA taxonomy.
- The guidance does not define "reanalysis" as distinct from "retesting"; that three-way distinction (retest/reanalysis/resample) appears to be industry-convention vocabulary not present in this document. I did not find "reanalysis" used anywhere in the May 2022 text.
- The guidance does not specify a maximum time limit for completing a Phase II investigation or a batch-failure investigation extension to other batches — only the FAR timing (3 working days / follow-up at completion) is numerically bound.
- The guidance does not state whether QU approval of a resampling method using an *already-validated* existing method must precede the resampling act, only that a *new* method "must be... approved" before use — this leaves an open question for otherwise-routine resampling under an existing validated method.
- I did not identify, in either the 2022 or 2006 text, any place where the guidance itself flags what changed between versions in a structural way (e.g., phase definitions, outcome terms); this document's May 2022 content was read directly rather than diffed against the 2006 PDF line-by-line, so any additional 2006-to-2022 structural differences beyond what I encountered are not confirmed absent.

## Sources

- FDA, CDER, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production, Level 2 revision — Guidance for Industry*, May 2022. PDF: https://www.fda.gov/media/158416/download. Landing/search page: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/investigating-out-specification-oos-test-results-pharmaceutical-production-level-2-revision (page shows "Content current as of: 08/01/2024," docket FDA-1998-D-0019, labeled "Final Level 2 Revised Guidance").
- 21 CFR § 211.192, Production record review — eCFR, retrieved via Versioner API for issue date 2026-09-09 (most recent available at query time): https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-J/section-211.192
- 21 CFR § 211.194, Laboratory records — eCFR, same retrieval, issue date 2026-09-09: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-J/section-211.194
