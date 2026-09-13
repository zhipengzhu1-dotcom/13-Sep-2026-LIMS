# Does any primary regulatory source require a laboratory to state, control, or justify a rounding rule — and does any require a particular convention?

**Asked by:** the orchestrator (Benchline wayfinder map — rounding-rule ticket)
**Date:** 2026-09-11
**Status of sources:** All texts below were fetched as primary documents today and version-checked.
- 21 CFR Parts 11 and 211: eCFR XML API, point-in-time snapshot **2026-09-09** (the most recent issue date of Title 21; eCFR rejected a 2026-09-11 request as past the issue date).
- FDA *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production*: cover page reads **May 2022, Revision 1** — the final, current revision.
- FDA *Data Integrity and Compliance With Drug CGMP: Questions and Answers*: cover page reads **December 2018** — the final guidance, not the superseded 2016 draft.
- PIC/S PI 041-1, **1 July 2021** — confirmed still the listed current version on the PIC/S publications page.
- EU GMP Annex 11 — **January 2011 revision**, confirmed current on the EudraLex Volume 4 page. A **draft** revised Annex 11 is in stakeholder consultation (with Chapter 4 and a new Annex 22); it is not in force, and is reported separately below.
- EU GMP Chapter 6 (Quality Control) — **28 March 2014 text, in operation since 1 October 2014**.
- ICH Q6A **Step 4, 6 October 1999**; ICH Q2(R2) **Step 4, 1 November 2023 (error-corrected 30 November 2023)**; ICH Q7 **Step 4, 10 November 2000**.
- **Paywalled, not examined:** USP (General Notices and General Chapters), ASTM, ISO/IEC 17025. USP and ASTM are covered by another scout. Note that FDA's OOS guidance leans on USP General Notices at two points (quoted below), so the US convention question may terminate in a paywalled document.

## Findings

### 1. The word "round" does not appear in any of the binding or guidance texts examined

Word-boundary search for `round\w*` (case-insensitive), over the full text of each document:

| Document | `round*` | `significant figure(s)` | `significant digit(s)` | `decimal` |
|---|---|---|---|---|
| 21 CFR Part 211 (all subparts) | **0** | **0** | **0** | **0** |
| 21 CFR Part 11 | **0** | **0** | **0** | **0** |
| FDA OOS guidance (May 2022, Rev 1) | **0** | **0** | **0** | **0** |
| FDA Data Integrity Q&A (Dec 2018) | **0** | **0** | **0** | **0** |
| EU GMP Annex 11 (2011) | **0** | **0** | **0** | **0** |
| EU GMP Chapter 6 (2014) | **0** | **0** | **0** | **0** |
| ICH Q6A | **0** | **0** | **0** | **0** |
| ICH Q2(R2) | **0** | **0** | **0** | **0** |
| ICH Q7 | **0** | **0** | **0** | **0** |
| PIC/S PI 041-1 (2021) | **1** | **0** | **1** | **0** |
| Draft revised Annex 11 (consultation, not in force) | **0** | **0** | **0** | **0** |

(The apparent "round" hits in the FDA PDFs on a naive substring search are the word "BACKGROUND" in the tables of contents; with `\bround`, the count is zero.)

`precision` appears 3 times in Part 211 — all three are in § 211.160(b)(4), about **instrument calibration** ("limits for accuracy and precision"), not about reporting precision of a result. It appears 0 times in Part 11, 0 in Annex 11, 0 in Chapter 6, 0 in Q6A, 0 in Q7; the 69 occurrences in ICH Q2(R2) are the validation performance characteristic *precision* (repeatability/intermediate precision/reproducibility), not numeric reporting precision.

### 2. 21 CFR Part 211 — nothing on rounding; the obligations are recordkeeping and self-binding

- **§ 211.160(a)** — the self-binding hook. "The establishment of any specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms required by this subpart, including any change in such specifications, ... shall be drafted by the appropriate organizational unit and reviewed and approved by the quality control unit. **The requirements in this subpart shall be followed and shall be documented at the time of performance. Any deviation from the written specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms shall be recorded and justified.**" It says nothing about how a number is rounded; it makes whatever the firm *did* write binding, and makes departure from it a recorded, justified deviation.
- **§ 211.160(b)** requires "scientifically sound and appropriate specifications, standards, sampling plans, and test procedures" and "determination of conformity to applicable written specifications" — the comparison is required; the arithmetic of the comparison is unspecified.
- **§ 211.165(d)** — "Acceptance criteria for the sampling and testing conducted by the quality control unit shall be adequate to assure that batches of drug products meet each appropriate specification and appropriate statistical quality control criteria as a condition for their approval and release. The statistical quality control criteria shall include appropriate acceptance levels and/or appropriate rejection levels." No precision or rounding language.
- **§ 211.165(f)** — "Drug products failing to meet established standards or specifications ... shall be rejected." The regulation assumes the pass/fail determination is unambiguous; it does not say how a boundary value is resolved.
- **§ 211.194(a)(5)** — the closest text in Part 211 to a computation-disclosure requirement: "**A record of all calculations performed in connection with the test, including units of measure, conversion factors, and equivalency factors.**" It enumerates units, conversion factors and equivalency factors; it does not enumerate a rounding or significant-figures rule.
- **§ 211.194(a)(6)** — "A statement of the results of tests **and how the results compare with established standards** of identity, strength, quality, and purity...". The comparison must be recorded; the rule governing it is not specified.
- **§ 211.194(a)(8)** — second-person review of the original records "for accuracy, completeness, and compliance with established standards".
- **§ 211.68(b)** — computerised systems: "**Input to and output from the computer or related system of formulas or other records or data shall be checked for accuracy.** The degree and frequency of input/output verification shall be based on the complexity and reliability of the computer or related system. A backup file of data entered into the computer or related system shall be maintained **except where certain data, such as calculations performed in connection with laboratory analysis, are eliminated by computerization** or other automated processes. **In such instances a written record of the program shall be maintained along with appropriate validation data.**" This is the strongest CFR text on a computed value: where computerisation eliminates the hand calculation, a written record of the *program* plus validation data must be kept. It is about the program, not about a prescribed convention.

### 3. 21 CFR Part 11 — nothing bearing on a computed verdict's arithmetic

Full text of § 11.10 read. Relevant clauses:
- **§ 11.10(a)** "Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records."
- **§ 11.10(b)** "The ability to generate **accurate and complete copies of records** in both human readable and electronic form suitable for inspection, review, and copying by the agency." This is about fidelity of the *copy* to the record, not about the correctness or disclosure of a computation that produced a value. Nothing in Part 11 addresses numeric precision, rounding, or the derivation rule of a computed result. Occurrence counts in Part 11: `round*` 0, `calculat*` 0, `precision` 0, `decimal` 0.

### 4. FDA OOS guidance (May 2022, Rev 1) — silent on rounding; explicit on averaging and on borderline-but-passing results

This is a first-class absence. The guidance that defines what counts as out-of-specification contains **zero** occurrences of "round", "significant figure", "decimal", "precision", and zero of "marginal". It contains 32 occurrences of "averag*" and 2 of "borderline".

What it *does* say:
- **Section IV.C.1, Averaging** — averaging is treated as a method-defined practice: "Where averaging of separate tests is appropriately specified by the test method, a single averaged result can be reported as the final test result." And: "It may be appropriate to **specify in the test method** that the average of these multiple assays is considered one test and represents one reportable result."
- **Footnote 12** — "The term *reportable result* as used in this document means a final analytical result. This result is **appropriately defined in the written approved test method** and derived from one full execution of that method, starting from the original sample." So the guidance locates the definition of the reportable result in the firm's approved method — but names only replication/averaging, never precision or rounding, as the content of that definition.
- **Section V.B.1** — "a firm should err on the side of caution and treat the average of these values as an OOS result, even if that average is within specification. This approach is consistent with the principle outlined in the USP General Notices that an official article shall comply with the compendial standard any time a compendial test is applied."
- **Footnote 18** quotes USP directly: "USP, General Notices, Section 7.10, 'Test Results, Statistics, and Standards' states '**Analytical results observed in the laboratory (or calculated from experimental measurements) are compared with stated acceptance criteria to determine whether the article conforms to compendial requirements.**'" This is the only place in the FDA corpus examined where the comparison-to-criteria step is characterised, and FDA characterises it by quoting USP.
- **Section V.B.3, "Borderline results that are within specification"** — the guidance's only treatment of values near the limit, and it is about *low-but-passing assay* as a formulation signal, not about boundary arithmetic: "An assay result that is low, but within specifications, should also raise a concern. One cause of the result could be that the batch was not formulated properly. ... This would also be a situation where the analytical result meets specifications, but caution should be used in the release or reject decision."

**Finding: the OOS guidance never addresses what to do with a value that is out of specification before rounding and within specification after it (or vice versa).** It does not use the concept.

### 5. Computerised-system calculations: Annex 11, PIC/S PI 041-1, FDA DI 2018

- **EU GMP Annex 11 (2011)** — note the clause numbering differs from the numbering in the question. The relevant clauses are: **§ 5 Data** (not 4): "Computerised systems exchanging data electronically with other systems should include appropriate built-in checks for the correct and secure entry and processing of data, in order to minimize the risks." **§ 6 Accuracy Checks**: "For critical data entered manually, there should be an additional check on the accuracy of the data. This check may be done by a second operator or by validated electronic means." (§ 6 is about *manually entered* data, not computed data.) **§ 7.1 Data Storage**: "Data should be secured by both physical and electronic means against damage. Stored data should be checked for accessibility, readability and accuracy. Access to data should be ensured throughout the retention period." **§ 9 Audit Trails**: "Consideration should be given, based on a risk assessment, to building into the system the creation of a record of all GMP-relevant changes and deletions (a system generated 'audit trail'). For change or deletion of GMP-relevant data the reason should be documented. Audit trails need to be available and convertible to a generally intelligible form and regularly reviewed." Also **§ 4.7** (validation): "Evidence of appropriate test methods and test scenarios should be demonstrated. Particularly, system (process) parameter limits, data limits and error handling should be considered." Annex 11 contains **zero** occurrences of "calculat*", "formula", "algorithm", "round*", "precision".
- **PIC/S PI 041-1 (1 July 2021), § 7.5, ALCOA+ attribute "Consistent"** — **the only occurrence of "rounding" in any source examined, and the only one of "significant digits":**
  > "Information should be created, processed, and stored in a logical manner that has a defined consistency. **This includes policies or procedures that help control or standardize data (e.g. chronological sequencing, date formats, units of measurement, approaches to rounding, significant digits, etc.).**"

  This is an inspectorate guidance expectation that a rounding approach be *controlled by the firm's own policy or procedure*. It prescribes **no convention** and does not say in which document the approach must live.
- **PI 041-1 § 8.8** (review of records): "Check that the secondary reviews of data include a **verification of any calculations used**. View original data (where possible) to confirm that the correct data was transcribed for the calculation."
- **PI 041-1 § 9.1.5.1–9.1.5.2**: "In dealing with raw data, the complete capture and retention of raw data would normally be required in order to **reconstruct** the manufacturing event or analysis. In dealing with metadata, some metadata is critical in reconstruction of events, (e.g. user identification, times, critical process parameters, **units of measure**), and would be considered as 'relevant metadata' that should be fully captured and managed."
- **PI 041-1 § 9.3** (validation reports): "The report should explain how the original data are retained with relevant metadata **in a form that permits the reconstruction of the manufacturing process or the analytical activity**."
- **PI 041-1 § 9.2** table on validation: "The number of tests should be guided by a risk assessment but the critical functionalities should be at least identified and tested, e.g., certain PLCs and systems **based on basic algorithms or logic sets**, the functional testing may provide adequate assurance of reliability of the computerised system."
- **FDA Data Integrity Q&A (Dec 2018)** — zero occurrences of "round*", "borderline", "significant figure", "decimal". Relevant:
  - Q1.d, on dynamic records: a dynamic record "may allow the user to **modify formulas or entries in a spreadsheet used to compute test results** or other information such as calculated yield." (Identifies computation rules as user-modifiable content, without requiring their disclosure.)
  - Q3, on workflow validation: "qualifying the Manufacturing Execution System (MES) platform ... does not demonstrate that a given MPCR generated by the MES contains the correct calculations. In this example, **validating the workflow ensures that the intended steps, requirements, and calculations in the MPCR are accurate and perform properly**."
  - Q1.b, on metadata: "Data should be maintained throughout the record's retention period **with all associated metadata required to reconstruct the CGMP activity** (e.g., §§ 211.188 and 211.194). The relationships between data and their metadata should be preserved in a secure and traceable manner."
  - Q1.c, definition of audit trail: "a secure, computer-generated, time-stamped electronic record that **allows for reconstruction of the course of events relating to the creation, modification, or deletion of an electronic record**. For example, the audit trail for a high performance liquid chromatography (HPLC) run should include the user name, date/time of the run, **the integration parameters used**, and details of a reprocessing, if any."
  - **Draft revised Annex 11 (consultation text, not in force), § 9.6**: "Increased focus should be on testing a system's handling of key functional requirements, on functionality intended to ensure that activities are conducted according to GMP, and on functionality designed to ensure data integrity. This includes but is not limited to access privileges, **release of products and results, calculations, audit trails**, error handling, handling of alarms and warnings, boundary and negative testing, reports and interfaces, and restore from backup." Still zero occurrences of "round*" or "significant digit".

### 6. Retrievability of the rule behind a derived value

No source examined states, in those words, that the rule used to compute a value must be retrievable after the fact. The nearest primary texts, in descending strength:
- **21 CFR 211.68(b)** (binding): where computerisation eliminates the recorded calculation, "**a written record of the program shall be maintained along with appropriate validation data**."
- **21 CFR 211.194(a)(5)** (binding): a record of all calculations performed, including units, conversion factors and equivalency factors.
- **PI 041-1 § 9.1.5.1 / § 9.3** (guidance): retention must permit *reconstruction* of the analytical activity.
- **FDA DI Q&A 1.b / 1.c** (guidance): metadata sufficient to *reconstruct the CGMP activity*; the HPLC example lists "the integration parameters used" as audit-trail content — the closest analogue to "the processing rule applied", and it is an example, not a requirement.
- **Annex 11 § 9** (guidance): audit trail of GMP-relevant *changes and deletions*, "available and convertible to a generally intelligible form". Annex 11's audit-trail clause is about change history, not about the derivation of a value.

So: "reconstructable" is required in guidance; "the rounding rule must be stored with the result" is nowhere stated.

### 7. Does anything require the rounding convention to be in the approved method or specification?

**No.** Stated plainly, because the absence is the finding:
- **ICH Q6A** (Step 4, 6 Oct 1999) — the guideline on specifications and acceptance criteria. Zero occurrences of "round*", "significant figure", "decimal", "precision". It sets out what attributes and acceptance criteria a specification should contain (universal and specific tests, decision trees, justification) and never addresses numeric reporting precision or how a result is arithmetically compared to a criterion.
- **ICH Q2(R2)** (Step 4, 1 Nov 2023) — zero occurrences of "round*", "significant figure", "decimal". Its § 2.3 Reportable Range acknowledges the computation without constraining its precision: "**Mathematical calculations are typically required to generate reportable results.**" § 2.1: "Relevant data collected during validation (**and any methodology used for calculating validation results**) should be submitted..." Nothing requires a rounding statement in the procedure.
- **EU GMP Chapter 6** (2014) — zero occurrences of "round*", "significant figure", "precision". § 6.16: "The results obtained should be recorded. ... **Any calculations should be critically examined.**" § 6.17 lists required record content: "iv. Test results, including observations and calculations, and reference to any certificates of analysis; ... vii. Initials of the persons who verified the testing **and the calculations**, where appropriate; viii. A clear statement of approval or rejection (or other status decision)...". Calculations must be recorded and verified; no convention, and no requirement that a convention be stated in the method.
- **ICH Q7 § 11.1** (Laboratory Controls) — § 11.11 "There should be documented procedures describing sampling, testing, approval or rejection of materials, and recording and storage of laboratory data."; § 11.12 "All specifications, sampling plans, and test procedures should be scientifically sound and appropriate...". Q7 § 6.6 (laboratory control records) mirrors 211.194(a)(5) verbatim in substance: "A record of all calculations performed in connection with the test, including, for example, units of measure, conversion factors, and equivalency factors" and "A statement of the test results and how they compare with established acceptance criteria". Zero occurrences of "round*" in Q7.

**Net:** the only primary source in this corpus that mentions rounding at all is PIC/S PI 041-1 § 7.5, and what it asks for is that the firm's **own policies or procedures** control or standardise the approach. That places the rounding rule in the same category as the five prior tickets: binding on the laboratory through 21 CFR 211.160(a) once written, but authored by the laboratory and rewritable by it, with no regulator-specified convention and no regulator-specified home document.

## What I could not establish

- **Whether a particular convention is mandated by a compendium.** USP General Notices is paywalled and was not read. FDA's OOS guidance cites USP General Notices § 7.10 for the comparison-to-acceptance-criteria principle (quoted above) and cites General Notices again for the "complies any time a compendial test is applied" principle. If a binding US rounding convention exists, it is most likely in USP General Notices § 7 rather than in any FDA or ICH text — I could not verify the content or section title of any USP clause beyond the § 7.10 sentence FDA itself reproduces. Another scout holds USP/ASTM.
- **ISO/IEC 17025** (paywalled, not examined) — its decision-rule clause bears on statements of conformity and measurement uncertainty, which is adjacent to but distinct from rounding. Not assessed here.
- **Whether any FDA warning letter or inspection practice treats an unstated rounding rule as a 211.160(a) or 211.194 deficiency.** Warning letters are primary agency documents but were outside the scope of this search; no conclusion is offered.
- **The status of the draft revised Annex 11.** I confirmed the consultation exists on the Commission's consultations page and read the draft text; I did not establish a closing date or adoption timetable. It is not in force and nothing in it mentions rounding.
- **EU GMP Part II / other annexes** beyond Chapter 6 and Annex 11 were not searched.

## Sources

1. 21 CFR Part 211 — eCFR full-text XML, point-in-time 2026-09-09. https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211 (API: `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?chapter=I&subchapter=A&part=211`)
2. 21 CFR Part 11 — eCFR full-text XML, point-in-time 2026-09-09. https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
3. FDA, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production — Guidance for Industry*, May 2022, Revision 1. https://www.fda.gov/media/158416/download
4. FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers — Guidance for Industry*, December 2018 (final). https://www.fda.gov/media/119267/download
5. PIC/S PI 041-1, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, 1 July 2021. https://picscheme.org/docview/4234 (version confirmed at https://picscheme.org/en/publications)
6. EU GMP Annex 11, *Computerised Systems*, January 2011 revision (in force). https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf
7. EU GMP Chapter 6, *Quality Control*, 28 March 2014, in operation 1 October 2014. https://health.ec.europa.eu/document/download/c74c8720-27bf-4252-808f-d65a206a90bb_en?filename=2014-11_vol4_chapter_6.pdf
8. Draft revised Annex 11 (stakeholder consultation; **not in force**). https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en?filename=mp_vol4_chap4_annex11_consultation_guideline_en.pdf ; consultation page https://health.ec.europa.eu/consultations/stakeholders-consultation-eudralex-volume-4-good-manufacturing-practice-guidelines-chapter-4-annex_en
9. ICH Q6A, Step 4, 6 October 1999. https://database.ich.org/sites/default/files/Q6A%20Guideline.pdf
10. ICH Q2(R2), Step 4, 1 November 2023 (error correction 30 November 2023). https://database.ich.org/sites/default/files/ICH_Q2%28R2%29_Guideline_2023_1130.pdf
11. ICH Q7, Step 4, 10 November 2000. https://database.ich.org/sites/default/files/Q7%20Guideline.pdf
12. EudraLex Volume 4 index (used to confirm current versions of Annex 11 and Chapter 6). https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en
