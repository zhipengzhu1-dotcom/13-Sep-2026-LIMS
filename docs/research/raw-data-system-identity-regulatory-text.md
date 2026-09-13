# Is the raw-data system a second entity, and what does a suspect window scope to?

**Asked by:** Ticket #55, orchestrator
**Date:** 2026-09-11
**Status of sources:**

- **21 CFR Part 211** — retrieved as XML from the eCFR Versioner API at issue date **2026-09-09** (the API rejects 2026-09-11 as later than the title's current issue), `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`. Same version prior ticket #43 used.
- **21 CFR Part 11** — retrieved as XML from the same API, same issue date, `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`.
- **EU GMP Annex 11 "Computerised Systems"** — PDF from the European Commission, `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`. Cover page reads "Status of the document: revision 1," "Deadline for coming into operation: 30 June 2011." This is the version in force at retrieval time; a 2025 draft revision exists but was in public consultation (closed October 2025) and had not been adopted as of this retrieval, per the ECA Academy guideline page reporting the consultation window — **I did not read the 2025 draft and am not citing it; everything below is the 2011 revision-1 text currently in force.**
- **PIC/S PI 041-1, "Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments"** — PDF from `https://www.gmp-compliance.org/files/guidemgr/PI%20041-1.pdf`, cross-checked against `https://picscheme.org/docview/4234` (identical file, 975,750 bytes, both). Every page footer reads "PI 041-1 … 1 July 2021." This is the final, in-force version (not a draft — the search results distinguish this from "Draft 2" dated 10 August 2016 and "Draft 3" dated 30 November 2018, both at different URLs).
- **MHRA "GXP" Data Integrity Guidance and Definitions** — PDF from `https://assets.publishing.service.gov.uk/media/5aa2b9ede5274a3e391e37f3/MHRA_GxP_data_integrity_guide_March_edited_Final.pdf`. Cover and footer both read "MHRA GXP Data Integrity Guidance and Definitions; Revision 1: March 2018." 21 pages.
- **FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*, December 2018** — PDF from `https://www.fda.gov/media/119267/download`. This is the same document ticket #43's scout confirmed as the final Level 1 guidance (docket FDA-2018-D-3984), not the superseded 2016 draft.
- **FDA, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production*, May 2022, Revision 1** — PDF from `https://www.fda.gov/media/158416/download`. Confirmed Level 2 Revised Guidance, docket FDA-1998-D-0019, matching ticket #43's finding.
- **USP General Chapter 〈621〉 Chromatography — not read, paywalled.** Not consulted for this ticket either; where 〈621〉 content is relevant below I quote only FDA's own characterisation of it.

All occurrence counts below were produced by extracting each document to plain text (`pdftotext -layout` for PDFs; XML-tag stripping for the two eCFR parts) and running case-insensitive substring counts and `grep -n -i` context searches. The scripts are not part of the repository; the counts are reported as findings, with the search term stated.

---

## 1. Does any primary source require a laboratory record to identify the software/data system, as distinct from the instrument?

### 21 CFR Part 211

Term counts across the full text of Part 211 (60 sections, Subparts A–K):

| Term | Count |
|---|---|
| "computer" | 7 |
| "software" | 0 |
| "data system" | 0 |
| "electronic" | 4 |
| "system" | 29 |
| "chromatography data system" | 0 |
| "CDS" | 0 |
| "sequence" | 1 |
| "injection" | 0 |
| "acquisition" | 0 |
| "instrument" | 4 |
| "raw data" | 0 |

**All 7 occurrences of "computer" are in §211.68** (Subpart D, Equipment), not §211.194. Read in context:

> §211.68(a): "Automatic, mechanical, or electronic equipment or other types of equipment, including computers, or related systems that will perform a function satisfactorily, may be used in the manufacture, processing, packing, and holding of a drug product. If such equipment is so used, it shall be routinely calibrated, inspected, or checked according to a written program designed to assure proper performance. Written records of those calibration checks and inspections shall be maintained."
>
> §211.68(b): "Appropriate controls shall be exercised over computer or related systems to assure that changes in master production and control records or other records are instituted only by authorized personnel. Input to and output from the computer or related system of formulas or other records or data shall be checked for accuracy. … A backup file of data entered into the computer or related system shall be maintained except where certain data, such as calculations performed in connection with laboratory analysis, are eliminated by computerization or other automated processes."

Note the final clause: §211.68(b) itself contemplates laboratory-analysis calculations being "eliminated by computerization," and its remedy is a backup-file and validation-data requirement on the computer system, not a requirement that any record name that system.

**§211.194 — the laboratory-record section — contains zero occurrences of "computer," "software," "system," or "electronic."** The word "instrument" in §211.194 occurs only in (a)(4)'s phrase "graphs, charts, and spectra from laboratory instrumentation" (requiring the *output* to be captured, not the instrument to be named) and in (d) (calibration records of "laboratory instruments, apparatus, gauges, and recording devices"). This confirms and extends ticket #43's finding: **Part 211 requires neither the instrument nor the acquiring software/data system to be named in the laboratory test record.** There is no textual basis in Part 211 for a software/data-system identification requirement of any kind — it is not merely un-required for the test record, the concept does not appear anywhere in the part.

### 21 CFR Part 11

Term counts across the full text of Part 11:

| Term | Count |
|---|---|
| "data system" | 0 |
| "chromatography data system" | 0 |
| "CDS" | 0 |
| "sequence" | 1 |
| "injection" | 0 |
| "acquisition" | 0 |
| "instrument" | 1 |
| "raw data" | 0 |
| "software" | 1 |
| "system" | 25 |
| "computer" | 5 |

§11.10 governs closed systems. Two clauses are load-bearing for this ticket, quoted verbatim:

> §11.10(b): "The ability to generate accurate and complete copies of records in both human readable and electronic form suitable for inspection, review, and copying by the agency."
>
> §11.10(e): "Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. **Record changes shall not obscure previously recorded information.** Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying."

**Neither §11.10(b) nor §11.10(e) — nor any other provision of Part 11 that I located — requires a record to identify the system that produced it.** §11.10(b) is about copy fidelity (accurate and complete copies), not system provenance. §11.10(e) binds the *audit trail mechanism itself* (it must exist, must be secure, computer-generated, time-stamped, and must not permit record changes to obscure prior information); it says nothing about naming the system in the substantive record. Part 11's single "instrument" hit and single "software" hit are both in unrelated context (checked individually; neither is a system-naming requirement).

### EU GMP Annex 11

Retrieved in full (5-page PDF, revision 1, in force since 30 June 2011). Term counts:

| Term | Count |
|---|---|
| "system" | 51 |
| "computer" | 22 |
| "software" | 8 |
| "raw data" | 0 |
| "instrument" | 0 |
| "sequence" | 1 |
| "injection" | 0 |

Annex 11 is *about* computerised systems throughout, so "system" is dense, but I read every clause for a record-must-name-its-system requirement and found none stated that way. The closest clauses:

> Clause 4.3: "An up to date listing of all relevant systems and their GMP functionality (inventory) should be available. For critical systems an up to date system description detailing the physical and logical arrangements, data flows and interfaces with other systems or processes, any hardware and software pre-requisites, and security measures should be available."

This requires a **system inventory and system description to exist as its own document** — it does not require an individual GMP record (e.g., a test result) to carry a pointer to which system produced it.

> Clause 12.4: "Management systems for data and for documents should be designed to record the identity of operators entering, changing, confirming or deleting data including date and time."

This requires operator identity in the audit trail, not system identity.

**Verified negative: no clause of Annex 11 requires a GMP record to name its originating system.** The Annex requires systems to be inventoried, validated, and access-controlled, and requires audit trails to capture *who* acted and *when* — not which software system holds a given record.

### PIC/S PI 041-1 (1 July 2021)

Definitions, quoted verbatim (both found in the Glossary, pp. 61–63 of the PDF pagination):

> **Raw Data:** "Raw data is defined as the original record (data) which can be described as the first-capture of information, whether recorded on paper or electronically. Information that is originally captured in a dynamic state should remain available in that state." (Footnoted to MHRA, March 2018 — see below; the two definitions are word-for-word identical.)

> **Metadata:** "In-file data that describes the attributes of other data, and provides context and meaning. Typically, these are data that describe the structure, data elements, inter-relationships and other characteristics of data e.g. audit trails. Metadata also permit data to be attributable to an individual (or if automatically generated, to the original data source). Metadata form an integral part of the original record. Without the context provided by metadata the data has no meaning."

Earlier in the body text, the "Original" ALCOA element is defined (p. ~5 in the ALCOA table):

> "**Original** The original record can be described as the first-capture of information, whether recorded on paper (static) or electronically (usually dynamic, depending on the complexity of the system). Information that is originally captured in a dynamic state should remain available in that state."

**Neither the Raw Data definition nor the Metadata definition requires identification of the acquiring system.** Metadata's description ("date/time stamp," implicitly attribution to "an individual … or, if automatically generated, to the original data source") gestures at attribution to a *data source*, but the document does not define "data source" as a system identifier, does not enumerate "system ID," "instrument ID," or "software name" as required metadata elements, and does not name a unit of acquisition (run, sequence, batch, session) anywhere in these definitions.

Term counts across the full 63-page document:

| Term | Count |
|---|---|
| "acquiring system" | 0 |
| "chromatography data system" | 0 |
| "CDS" | 0 |
| "acquisition" | 5 |
| "instrument" | 1 |
| "sequence" | 7 |
| "injection" | 0 |
| "suspect" | 0 |
| "invalidat-" | 1 |
| "exclud-" | 1 |
| "malfunction" | 1 |
| "system suitability" | 0 |
| "raw data" | 12 |

**Verified negative: "suspect," "injection," "system suitability," "CDS," and "chromatography data system" all occur zero times in PI 041-1**, notwithstanding this being described (correctly, on definitions) as PIC/S's most developed data-integrity text. The single "malfunction" hit is generic system-risk language (§ on critical/non-critical system tiering: "Consideration should also be given to those systems with higher potential for disaster, malfunction or situations in which the system becomes inoperative"), not a data-invalidation clause. The single "invalidat-" hit concerns electronic-signature invalidation on data change, not analytical data invalidation. The single "exclud-" hit is about scope of an investigation ("a justification for any part of the operation that the regulated user proposes to exclude"), not about excluding a data point.

### MHRA GXP Data Integrity Guidance and Definitions (March 2018, Revision 1)

Definitions, quoted verbatim (§6.2, §6.3):

> **§6.2 Raw data** (synonymous with 'source data' which is defined in ICH GCP): "Raw data is defined as the original record (data) which can be described as the first-capture of information, whether recorded on paper or electronically. Information that is originally captured in a dynamic state should remain available in that state. Raw data must permit full reconstruction of the activities. Where this has been captured in a dynamic state and generated electronically, paper copies cannot be considered as 'raw data'. In the case of basic electronic equipment that does not store electronic data, or provides only a printed data output (e.g. balances or pH meters), then the printout constitutes the raw data. Where the basic electronic equipment does store electronic data permanently and only holds a certain volume before overwriting; this data should be periodically reviewed and where necessary reconciled against paper records and extracted as electronic data where this is supported by the equipment itself. In all definitions, the term 'data' includes raw data."

> **§6.3 Metadata**: "Metadata are data that describe the attributes of other data and provide context and meaning. Typically, these are data that describe the structure, data elements, inter-relationships and other characteristics of data e.g. audit trails. Metadata also permit data to be attributable to an individual (or if automatically generated, to the original data source). Metadata form an integral part of the original record. Without the context provided by metadata the data has no meaning."

**Neither definition requires identification of the acquiring system**, matching PI 041-1 (which quotes MHRA's raw-data definition verbatim, footnoted).

Term counts across the 21-page document: "chromatography data system" 0; "CDS" 1 (unread in context beyond the count, not load-bearing to any load-bearing clause I located); "acquisition" 0; "instrument" 1; "sequence" 2; "injection" 0; "suspect" 0; "system suitability" 0; "audit trail" 31; "software" 15.

### FDA, Data Integrity and Compliance With Drug CGMP Q&A (December 2018)

Term counts: "chromatography data system" 0; "CDS" 0; "acquisition" 1; "instrument ID" 1 (the phrase); "instrument" 9; "sequence" 1; "injection" 6; "suspect" 3; "software" 6; "data system" 0; "system suitability" 6.

The one "instrument ID" hit, quoted in full (Q1.b, "What is 'metadata'?"):

> "Metadata is the contextual information required to understand data. … Among other things, metadata for a particular piece of data could include a date/time stamp documenting when the data were acquired, a user ID of the person who conducted the test or analysis that generated the data, **the instrument ID used to acquire the data**, material status data, the material identification number, and audit trails. Data should be maintained throughout the record's retention period with all associated metadata required to reconstruct the CGMP activity (e.g., §§ 211.188 and 211.194)."

This is instrument ID, offered as one item in an open, non-exhaustive example list ("could include") — it is not a system/software identifier, and the guidance nowhere in this document lists "acquiring system," "data system," or "CDS name" as an example metadata element. **This guidance does not address identifying the software/data system**, as distinct from the instrument, anywhere I located.

On completeness of a chromatographic run (Q14, "Is it acceptable to only save the final results from reprocessed laboratory chromatography?"):

> "No. Analytical methods should be accurate and precise. For most lab analyses, reprocessing data should not be regularly needed. If chromatography is reprocessed, written procedures must be established and followed and each result retained for review (see §§ 211.160, 211.165(c), 211.194(a)(4), and 212.60(a)). FDA requires complete data in laboratory records, which includes but is not limited to notebooks, worksheets, graphs, charts, spectra, and other types of data from laboratory instruments (§§ 211.194(a) and 212.60(g)(3))."

This defines "complete data" by an open list of record *types* (notebooks, worksheets, graphs, charts, spectra, "other types of data from laboratory instruments"), grounded in §211.194(a) generally and (a)(4) specifically — it does not enumerate a system-identity field, and it does not say what constitutes a "complete" record set for one chromatographic run in terms of injections, sequences, or files.

Q13 (system suitability using actual samples) is the other system-suitability-adjacent passage, quoted in full because it is the only place FDA states a positive requirement about what CGMP original records must contain in this context:

> "CGMP original records must be complete (e.g., §§ 211.68(b), 211.188, 211.194) and subjected to adequate review (§§ 211.68(b), 211.186(a), 211.192, and 211.194(a)(8)). Transparency is necessary. All data—including obvious errors and failing, passing, and suspect data—must be in the CGMP records that are retained and subject to review and oversight. An investigation with documented, scientifically sound justification is necessary for data to be invalidated and not used in determining conformance to specification for a batch (see §§ 211.160, 211.165, 211.188, and 211.192)."

This is the sentence closest to the ticket's question of what happens when data is later found unusable: invalidation requires "an investigation with documented, scientifically sound justification" — it does not say at what granularity (run, injection, instrument, time window) the invalidation applies; see §2 below.

---

## 2. Scope of a system-suitability failure — is there a named unit?

### FDA, Investigating OOS Test Results (May 2022, Revision 1) — the p.4 passage

Quoted in full, with the sentence immediately preceding and following it, exactly as it appears on the page (context confirms this is the "system suitability" subsection):

> "Certain analytical methods have system suitability requirements, and systems not meeting these requirements should not be used. For example, in chromatographic systems, reference standard solutions may be injected at intervals throughout chromatographic runs to measure drift, noise, and repeatability. **If reference standard responses indicate that the system is not functioning properly, all of the data collected during the suspect time period should be properly identified and should not be used.** The cause of the malfunction should be identified and, if possible, corrected before a decision is made whether to use any data prior to the suspect period. Analysts should check the data for compliance with test specifications before discarding test preparations or standard preparations."

**The unit named is "the suspect time period"/"the suspect period" — a temporal window, not a run, an injection, a sequence, or an instrument.** The passage says the failure indicates "the system is not functioning properly," implying the *system* is the failing entity, but the *scope of exclusion* it prescribes is stated purely in time ("during the suspect time period," "prior to the suspect period"), with no boundary condition given for how that window's start or end is determined (e.g., by injection, by bracket, by sequence, by instrument session). The guidance leaves that determination to "The cause of the malfunction should be identified and, if possible, corrected before a decision is made whether to use any data prior to the suspect period" — i.e., root-cause analysis decides the window's extent, not a stated rule.

### Term-occurrence check, full document (823 lines of extracted text)

| Term | Count | Notes |
|---|---|---|
| "sequence" | 0 | Verified negative |
| "run" | 2 | Both in the chromatographic-runs sentence quoted above, and one in "a series of complete tests (full run-throughs of the test procedure)" — neither is a named unit of invalidation scope |
| "injection" | 3 | (1) "reference standard solutions may be injected"; (2) "reinjections can provide strong evidence that the problem should be attributed to the instrument" (discussing reinjection as investigative evidence, not as a scope boundary); (3) "averaging the peak responses from a number of consecutive, replicate injections" (a calculation practice, unrelated to invalidation scope) |
| "bracket" | 0 | Verified negative |
| "system suitability" | 1 | The heading/topic sentence quoted above |
| "chromatograph" (stem) | 2 | Both within the same passage quoted above ("chromatographic systems," "chromatographic runs") |
| "suspect" | 9 | See below |

All 9 "suspect" occurrences, in context: (1)–(2) the p.4 passage above ("suspect time period," "suspect period"); (3) "identify anomalous or suspect information" (data-review step, unrelated to scope); (4) "reinjected as part of an investigation where a transient equipment malfunction is suspected" (adjective use, investigative); (5) "a possible sample handling problem, for example, a suspected dilution error" (adjective use); (6) "the batch is suspect and must be rejected or held pending further investigation (§ 211.165(f))" — **here "suspect" scopes to the batch**, but this is a different clause, about an unsatisfactory batch evaluation, not about the system-suitability/reference-standard passage; (7) "All test results, both passing and suspect, should be reported … and considered in batch release decisions"; (8) "should not be used to invalidate the suspect result" (outlier-test discussion, scoping to a single result); (9) "the suspect result is invalidated" (same discussion).

**No sentence in this document states that a system-suitability failure invalidates data at the level of an instrument, a run, a sequence, or an injection as a defined unit.** The only unit the reference-standard passage itself names is a time period ("suspect time period"). Separately and in a different part of the document, "suspect" is also used to scope to "the batch" (§211.165(f) context) and to "the suspect result" (a single test result, in the outlier discussion) — three different scopes appear across the document depending on which clause is being discussed, and the document does not reconcile them or state which applies to a chromatographic-system malfunction specifically.

### 21 CFR §211.160(b)(4) and §211.165(e)

Quoted in full from the eCFR text:

> §211.160(b)(4): "Laboratory controls shall include: … (4) The calibration of instruments, apparatus, gauges, and recording devices at suitable intervals in accordance with an established written program containing specific directions, schedules, limits for accuracy and precision, and provisions for remedial action in the event accuracy and/or precision limits are not met. **Instruments, apparatus, gauges, and recording devices not meeting established specifications shall not be used.**"

> §211.165(e): "The accuracy, sensitivity, specificity, and reproducibility of test methods employed by the firm shall be established and documented. Such validation and documentation may be accomplished in accordance with § 211.194(a)(2)."

**Neither section names a unit of invalidation scope.** §211.160(b)(4)'s operative rule is a use-prohibition on the instrument itself ("shall not be used") tied to the calibration programme, not a rule about which prior data collected on that instrument becomes suspect or for how long. §211.165(e) is about method validation generally and contains no invalidation-scope language at all. **This is a verified negative for both sections: neither "run," "sequence," "injection," "time period," nor any other scope unit appears in either provision.**

---

## 3. Data acquired by a later-found-malfunctioning system — granularity of "properly identified" exclusion

FDA's OOS guidance is the only source among those read that uses the phrase "properly identified" in connection with excluded data (quoted above, §2): "all of the data collected during the suspect time period should be properly identified and should not be used." **"Properly identified" is not itself defined** anywhere in the OOS guidance — I searched for a definition or elaboration and found none; the phrase appears exactly once, in the sentence already quoted.

PI 041-1 does not use "suspect" at all (verified negative, §1 above) and its single "exclud-" hit and single "invalidat-" hit (also above) are not about analytical data exclusion granularity. **PI 041-1 does not address, anywhere I located, the granularity at which data from a malfunctioning system must be flagged.**

MHRA's guidance (checked for the same purpose): term counts above show "suspect" at 0 and "system suitability" at 0. **MHRA's March 2018 guidance does not address this question either**, at least not under this vocabulary; I did not do a full secondary-term sweep of MHRA beyond the terms specified in the task (this is a "not checked" rather than a "verified negative" for MHRA on invalidation granularity specifically, since I did not search MHRA for e.g. "quarantine," "flag," or "exclude" beyond the single "exclud-"-type stem check applied to PI 041-1, not to MHRA).

FDA DI 2018's governing sentence on invalidation generally (Q13, quoted in full in §1): "An investigation with documented, scientifically sound justification is necessary for data to be invalidated and not used in determining conformance to specification for a batch." This states a *process precondition* (documented investigation with scientific justification) for invalidation, and states the *outcome scope* only as "for a batch" — i.e., what the invalidated data may not be used for is batch-conformance determination — but again does not state the *granularity of the data itself* that must be flagged (single injection vs. whole run vs. whole instrument-session vs. calendar window).

---

## 4. Does anything require a record to survive when data is marked unusable?

Quoted verbatim, already given above, repeated here as the direct answer to this sub-question:

> §11.10(e): "Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. **Record changes shall not obscure previously recorded information.** Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying."

**What this clause binds:** it binds the audit-trail mechanism of a closed electronic-record system — it requires the audit trail to independently and securely record operator entries/actions with date and time on records that are created, modified, or deleted, and it prohibits a record *change* from obscuring what was previously recorded. It does not itself say anything about marking data "unusable" or "suspect"; that vocabulary comes from the OOS and DI guidances, not from Part 11. The DI 2018 guidance's Q13 language ("All data—including obvious errors and failing, passing, and suspect data—must be in the CGMP records that are retained and subject to review and oversight") is the guidance-level statement that pairs with §11.10(e): both, read together, support that a record marked suspect or invalidated must remain present and legible rather than deleted — but I note this as a pairing of two separately-sourced statements, not as a single provision that states it directly.

---

## 5. Verified negatives, consolidated

| Term | Part 211 | Part 11 | Annex 11 | PI 041-1 |
|---|---|---|---|---|
| "chromatography data system" | 0 | 0 | not checked* | 0 |
| "CDS" | 0 | 0 | not checked* | 0 |
| "sequence" | 1 | 1 | 1 | 7 |
| "injection" | 0 | 0 | 0 | 0 |
| "acquisition" | 0 | 0 | not checked* | 5 |
| "instrument" | 4 | 1 | 0 | 1 |

\* Annex 11 was checked for "system," "computer," "software," "raw data," "instrument," "sequence," "injection" (reported in §1 above) but not separately re-run for "CDS"/"chromatography data system"/"acquisition" as distinct terms; given Annex 11's "instrument" count is a verified 0 and its "raw data" count is a verified 0, and given the document's short length (5 pages) was read in full, the absence of any chromatography/CDS-specific vocabulary is consistent with the full-text read but I am not reporting a formal zero count for those three specific strings on Annex 11 to avoid overstating what was mechanically checked.

Searches run: case-insensitive substring `str.count()` over `pdftotext -layout` output (Annex 11, PI 041-1, MHRA, FDA DI 2018, FDA OOS 2022) and over XML-tag-stripped text (Part 211, Part 11).

---

## What I could not establish

1. **Whether any primary source treats "the raw data system" as a distinct regulated entity from "the instrument."** None of the six sources read (Part 211, Part 11, Annex 11, PI 041-1, MHRA 2018, FDA DI 2018) uses a term that distinguishes an acquiring software/data system from the physical instrument as separately-named regulatory objects. Annex 11's Principle section defines "a computerised system" as "a set of software and hardware components which together fulfill certain functionalities" — a definition that bundles software and hardware into one object, which is some evidence against treating them as separately regulated entities in this text, but Annex 11 does not address the laboratory record-identification question this ticket asks, so this is not a direct answer.

2. **The precise granularity ("properly identified" at what unit) FDA intends in the OOS guidance's suspect-time-period sentence.** The guidance states a temporal scope and leaves its boundaries to the root-cause investigation. No source read defines "properly identified" or gives worked boundary rules (by injection, by sequence, by instrument log-in session).

3. **How MHRA's document treats invalidation granularity.** "Suspect" and "system suitability" are both verified zero-occurrence in MHRA's text; I did not extend the search to a broader vocabulary (e.g., "flag," "quarantine," "exclude") for MHRA specifically, so this is reported as not fully checked rather than a verified negative for MHRA on this sub-question.

4. **USP 〈621〉's own system-suitability text** — paywalled, not read, consistent with ticket #43's prior finding; not re-attempted here.

5. **Whether the 2025 draft revision of Annex 11 changes any of the above.** Not read; reported only as existing and in consultation, per search-result metadata, not fetched or quoted.

---

## Sources

1. **21 CFR Part 211**, Current Good Manufacturing Practice for Finished Pharmaceuticals. eCFR Versioner API, issue date 2026-09-09. `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`.
2. **21 CFR Part 11**, Electronic Records; Electronic Signatures. eCFR Versioner API, issue date 2026-09-09. `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`.
3. **EU GMP Annex 11: Computerised Systems**, EudraLex Volume 4, revision 1, in force since 30 June 2011. `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`.
4. **PIC/S PI 041-1, Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments**, 1 July 2021 (final, not a draft). `https://www.gmp-compliance.org/files/guidemgr/PI%20041-1.pdf`, cross-checked byte-identical against `https://picscheme.org/docview/4234`.
5. **MHRA, 'GXP' Data Integrity Guidance and Definitions; Revision 1: March 2018**. `https://assets.publishing.service.gov.uk/media/5aa2b9ede5274a3e391e37f3/MHRA_GxP_data_integrity_guide_March_edited_Final.pdf`.
6. **FDA, Data Integrity and Compliance With Drug CGMP: Questions and Answers, Guidance for Industry, December 2018.** `https://www.fda.gov/media/119267/download`. Final Level 1 Guidance, docket FDA-2018-D-3984 (per prior ticket #43's landing-page check; not re-verified against the landing page in this session, but the PDF's own cover date, December 2018, matches).
7. **FDA, Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production, May 2022, Revision 1.** `https://www.fda.gov/media/158416/download`. Final Level 2 Revised Guidance, docket FDA-1998-D-0019 (per prior ticket #43's landing-page check).
8. **USP General Chapter 〈621〉 Chromatography — not read, paywalled.** Not accessed in this session; consistent with ticket #43's finding.
