# At what granularity does a pharmaceutical analytical QC laboratory record have to attribute work to a person, and what must be retained when that attribution changes?

**Asked by:** [Reshape 1 of 3: per-test assignment and sample structure](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/25)
**Date:** 2026-09-11
**Status of sources:** Confirmed current eCFR text for 21 CFR Part 211 and Part 11 by fetching the eCFR Versioner API `full` XML endpoint at `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml` (most recent title-21 issue date available at time of research: 2026-09-09), which returns the same authoritative section text as the public eCFR pages. Confirmed the FDA data-integrity guidance is the **final** version by downloading the PDF directly from https://www.fda.gov/media/119267/download and reading its title page, which states "December 2018" and "Contains Nonbinding Recommendations" — this is the final Q&A guidance, not the earlier draft.

## Findings

### 1. 21 CFR 211.194(a) — granularity of attribution

211.194(a) requires that laboratory records include, "as follows":

> (a)(1) A description of the sample received for testing with identification of source (that is, location from where sample was obtained), quantity, lot number or other distinctive code, date sample was taken, and date sample was received for testing.

> (a)(4) A complete record of all data secured in the course of **each test**, including all graphs, charts, and spectra from laboratory instrumentation, properly identified to show the specific component, drug product container, closure, in-process material, or drug product, and lot tested.

> (a)(7) The initials or signature of the person who performs **each test** and the date(s) the tests were performed.

> (a)(8) The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards.

The operative attribution requirement in (a)(7)–(a)(8) is phrased "each test," not "each sample." Read together with (a)(3) ("A statement of the weight or measure of sample used for each test") and (a)(4) ("all data secured in the course of each test"), the regulation's unit of account throughout paragraph (a) is the individual test/determination performed on a sample, not the sample as a whole. The sample description in (a)(1) is a separate, sample-level element (source, quantity, lot number, dates) that identifies what was tested; the performer/reviewer attribution in (a)(7)–(a)(8) attaches to each test performed on that sample. Where a sample undergoes multiple tests, the text does not say a single signature covers all of them — each test's performer is to be identified, and a second person is to review "the original records" (i.e., the records generated, which per (a)(4) are organized by test).

The regulation does not use the word "assay-level" or define "test" further; it also does not explicitly address a case where one test is performed jointly by more than one analyst, or where a single analyst performs multiple tests on the same sample in one session — the text is silent on those configurations. See [What I could not establish] below.

### 2. Changes to a record — must a superseded value or attribution be retained?

**211.194** does not itself contain a "no overwrite" rule; it requires the listed elements to be recorded but does not describe what happens on correction. The retention-of-superseded-data requirement comes from **211.68(b)** (electronic/computerized systems) and, for electronic records, **Part 11**:

> 211.68(b): "Appropriate controls shall be exercised over computer or related systems to assure that changes in master production and control records or other records are instituted only by authorized personnel. Input to and output from the computer or related system of formulas or other records or data shall be checked for accuracy. ... A backup file of data entered into the computer or related system shall be maintained except where certain data ... are eliminated by computerization or other automated processes. ... Hard copy or alternative systems, such as duplicates, tapes, or microfilm, designed to assure that backup data are exact and complete and that it is secure from alteration, inadvertent erasures, or loss shall be maintained."

211.68(b) requires that changes be restricted to authorized personnel and that a backup of entered data be maintained and protected from alteration or loss — it does not use the words "audit trail" or explicitly require that a superseded value remain visible/readable alongside the current one; it requires the backup/original data to be preserved and secure.

**21 CFR 11.10(e)** (Part 11, controls for closed systems — applies to electronic records subject to the underlying predicate rule, e.g., Part 211 records kept electronically) is more explicit:

> "Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. **Record changes shall not obscure previously recorded information.** Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying."

This is the operative textual requirement that a change to an electronic record — which would include a change to who is recorded as having performed or reviewed a test — must not obscure the previously recorded information, and the record of that change (the audit trail entry) must be retained for at least as long as the underlying record. Part 11's applicability is scoped by its own provisions (it applies to electronic records created, modified, maintained, archived, retrieved, or transmitted under any records requirements set forth in Agency regulations, per 21 CFR 11.1); it does not independently create the record-keeping requirement, it governs the electronic form of records already required by Part 211.

**11.50(a)** additionally requires that a signed electronic record show, for each signature, the printed name of the signer, the date/time the signature was executed, and the meaning of the signature (review, approval, responsibility, or authorship) — supporting that "who signed as performer" and "who signed as reviewer" are distinct signature events, each independently timestamped and meaning-tagged, not a single generic "assigned to" field.

### 3. FDA Data Integrity and Compliance With Drug CGMP (final, December 2018) — attributability

The guidance defines data integrity in terms of ALCOA — data should be "attributable, legible, contemporaneously recorded, original or a true copy, and accurate" — and states these characteristics "are addressed throughout the CGMP regulations for drugs," citing for **attributable**: §§ 211.101(d), 211.122, 211.186, 211.188(b)(11), and 212.50(c)(10) (footnote 5 of the guidance; p.4).

On granularity, the guidance's Q&A on shared login accounts (Question 5) states directly:

> "you must implement documentation controls that ensure that the actions as described in question 4 are attributable to a specific individual (see §§ 211.68(b), 211.188(b)(11), 211.194(a)(7) and (8), and 212.50(c)(10)). Shared, read-only user accounts that do not allow the user to modify data or settings are acceptable for viewing data, but they do not conform with the part 211 and 212 requirements for **actions, such as second person review, to be attributable to a specific individual**."

This ties attributability explicitly to 211.194(a)(7) and (8) — i.e., to the performer signature and the second-person review signature — and frames the unit of attribution as an "action" (an individual act such as performing a test or reviewing it), consistent with the per-test framing found in the regulation text itself, not a single blanket attribution for a sample or a batch.

The guidance's discussion of audit trails (Question 1c and Question "Who should review audit trails?") reiterates that audit trails must allow "reconstruction of the course of events relating to the creation, modification, or deletion of an electronic record," and that audit trail review is "similar to assessing cross-outs on paper when reviewing data" — the reviewer is expected to see both the current value and the fact/nature of prior changes, not only the current state.

The guidance does not use the word "reassignment" or discuss analyst reassignment as a scenario. It does not state a rule specific to changing who is recorded as the performer or reviewer of a test after the fact; the general audit-trail and attributability principles above are the closest applicable text.

### 4. 211.194(a)(1) — sample identification; multiple containers; lab-number uniqueness

211.194(a)(1) requires a sample description with: "identification of source (that is, location from where sample was obtained), quantity, lot number or other distinctive code, date sample was taken, and date sample was received for testing."

This is the complete text of the sample-identification requirement in 211.194. It says nothing about:
- multiple physical containers being received or tracked under one sample identity,
- how a laboratory must assign, structure, or format its internal sample/lab numbers,
- whether lab numbers must be unique or must never be reused.

A related but distinct provision, **211.84(c)(5)** (Subpart E, component/container/closure sampling — not analytical QC testing of the drug product itself, but the incoming-component sampling analog), does specify what must be recorded when a sample is drawn: "the name of the material sampled, the lot number, the container from which the sample was taken, the date on which the sample was taken, and the name of the person who collected the sample," and 211.84(c)(6) requires that "containers from which samples have been taken shall be marked to show that samples have been removed from them" — this shows the regulation elsewhere does contemplate a sample being drawn from a specific container (implying multiple containers can exist for one lot), but this provision is written for component/container/closure sampling, not for 211.194 laboratory testing records, and does not use the phrase "multiple containers under one sample identity." Nothing found in Part 211 addresses uniqueness or non-reuse of laboratory/sample numbers as an explicit numbered requirement.

## What I could not establish

- Whether 211.194(a)(7)/(a)(8) permits or forbids a single test being attributed to more than one performer, or how the regulation would treat a test performed collaboratively — the text is silent; it speaks in the singular ("the person who performs each test").
- Whether the regulation or the December 2018 guidance specifies anything about how a change to the *identity of the analyst recorded against a completed test* (as opposed to a change to a data value) must be documented — no provision was found that names this scenario specifically. The general 11.10(e) "record changes shall not obscure previously recorded information" and 211.68(b) backup/authorized-change requirements are the only textual hooks that would bear on it, by extension rather than by direct statement.
- Whether laboratory/sample-number uniqueness or non-reuse is required anywhere in Part 211 — not found in 211.194, 211.84, or elsewhere reviewed. This may be addressed by internal SOP practice or by other FDA guidance not reviewed here (e.g., laboratory-specific guidance documents), which were out of scope for this pass.
- Whether "multiple containers under one sample identity" is addressed anywhere in Part 211 outside the component-sampling context of 211.84 — not found for finished-product/in-process laboratory testing under 211.194.
- Part 11's scope of applicability to a given system (i.e., whether/when a hybrid paper-electronic Benchline system would be treated as within Part 11's "electronic records" scope) is governed by 21 CFR 11.1 and further FDA scope-and-application guidance, which was not reviewed in this pass; this research addresses only what 11.10(e) and 11.50(a) say, not whether/when they would apply to a specific system design.

## Sources

- 21 CFR 211.194 (Laboratory records), current eCFR text as of the 2026-09-09 title-21 issue, retrieved via eCFR Versioner API `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`. Public page: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-J/section-211.194
- 21 CFR 211.68 (Automatic, mechanical, and electronic equipment), same source/date. Public page: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-D/section-211.68
- 21 CFR 211.84(c) (Testing and approval or rejection of components, drug product containers, and closures — sampling procedures), same source/date.
- 21 CFR 11.10 (Controls for closed systems) and 21 CFR 11.50 (Signature manifestations), current eCFR text as of the 2026-09-09 title-21 issue, retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`. Public page: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- FDA, *Data Integrity and Compliance With Drug CGMP — Questions and Answers, Guidance for Industry*, CDER/CBER/CVM, **December 2018** (final; confirmed by title page of the PDF, "Contains Nonbinding Recommendations"). https://www.fda.gov/media/119267/download
