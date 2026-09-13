# Is a regulatory "audit trail" defined relative to a single record/object, or as a system-wide chronological log — and does any primary source require that it be reviewable, retrievable or presentable as ONE unified stream across different kinds of subject?

**Asked by:** Orchestrator — audit-trail data-model question (three separate append-only event tables: sample, user account, method version)
**Date:** 2026-09-11
**Status of sources:** Agent-gathered primary-source text, retrieved and quoted verbatim on 2026-09-11. This is **not** a compliance determination, gap analysis, or recommendation. Every source below was fetched directly (eCFR API, FDA PDF, PIC/S PDF, European Commission PDFs) on the retrieval date, not taken from a secondary write-up. Currency checked against known traps: the FDA data-integrity guidance quoted is the **final December 2018** version (confirmed from the document's own cover and footer text, not the 2016 or 2018 drafts); PIC/S guidance is **PI 041-1, 1 July 2021** (confirmed from cover page; not the November 2018 Draft 3); EU GMP Annex 11 in force is **Revision 1, operative 30 June 2011**; a **draft revision** is quoted below and is clearly flagged as draft (consultation closed 7 October 2025, no adopted replacement confirmed). NIST HB 150 is not cited and was not consulted. eCFR texts are the version as of issue date 2026-09-09, the most recent available.

**Standing note:** No real laboratory documents, SOP text, client names, product names, batch identifiers or results appear in this file. All quoted text is public regulatory or guidance text.

## Findings

### Direct answer, stated up front

**No primary source located requires audit trail data to be stored, queried, or presented as a single unified stream across different kinds of subject.** Across the five sources checked (21 CFR Part 11, 21 CFR Part 211, FDA's December 2018 data-integrity Q&A, PIC/S PI 041-1, and EU GMP Annex 11 both in force and in draft), the obligation is consistently expressed as attaching **to an electronic record and the operator actions on it**, and two of the sources affirmatively contemplate **multiple, differently-classified audit trails within one system**. Confidence: **high** for the four texts I retrieved in full; the limits are stated under "What I could not establish."

What the sources *do* require, in place of unification, is: retention for as long as the subject record (Part 11), availability for agency review and copying (Part 11), availability in an intelligible/meaningful form (Annex 11, PI 041-1), and review at the same frequency as the data it accompanies — in practice, before batch release for critical data (FDA Q8, PI 041-1 §9.6, draft Annex 11 §12.8).

---

### 1. 21 CFR Part 11

Source: eCFR, Title 21, Part 11, version as of issue date 2026-09-09, retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`; canonical view `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`.

**§11.10(e), verbatim and in full:**

> "(e) Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. Record changes shall not obscure previously recorded information. Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying."

Grammatical subject analysis (this is the crux of the question):

- The thing recorded is **"the date and time of operator entries and actions that create, modify, or delete electronic records"** — the trail's content is *actions on records*, not a system-wide narrative. The trail is defined by what it tracks, not by where it lives.
- The word is **plural** — "audit trail**s**" — in the very clause that creates the obligation. The regulation does not say "an audit trail" or "the audit trail."
- The retention clause is explicitly **record-relative**: "retained for a period at least as long as that required for **the subject electronic records**." This ties each piece of audit trail documentation to *its* subject record. A retention period that varies per subject record is textually anticipated; that is only coherent if trails are subject-scoped.
- The availability clause is **"available for agency review and copying"** — an availability obligation, not a unification, co-location, or single-query obligation.

**§11.3 Definitions — "audit trail" is NOT defined.** Stated explicitly, as requested. §11.3(b) defines exactly nine terms: *Act, Agency, Biometrics, Closed system, Digital signature, Electronic record, Electronic signature, Handwritten signature, Open system*. "Audit trail" is not among them. Part 11 uses the term without defining it. Confidence: **high** (full text of §11.3 read directly).

**Occurrence count for "audit trail" in the whole of Part 11: 3** — all in §11.10:
- §11.10(e), twice ("audit trails" and "audit trail documentation"), quoted above;
- §11.10(k)(2), once.

**§11.10(a)–(d) and (k), verbatim, as they bear on retrieval and copying:**

> "(a) Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records."
> "(b) The ability to generate accurate and complete copies of records in both human readable and electronic form suitable for inspection, review, and copying by the agency. Persons should contact the agency if there are any questions regarding the ability of the agency to perform such review and copying of the electronic records."
> "(c) Protection of records to enable their accurate and ready retrieval throughout the records retention period."
> "(d) Limiting system access to authorized individuals."
> "(k) Use of appropriate controls over systems documentation including: (1) Adequate controls over the distribution of, access to, and use of documentation for system operation and maintenance. (2) Revision and change control procedures to maintain an audit trail that documents time-sequenced development and modification of systems documentation."

Reading on the unification question:

- **(b)** requires "accurate and complete copies **of records**" — the unit of copying is the record. It does not require a single export containing every kind of record.
- **(c)** requires "accurate and ready retrieval" of records. "Ready retrieval" is a *retrievability* standard, not a *single-store* standard; the text does not specify storage topology or a number of stores.
- **(k)(2)** is the one place in Part 11 where an audit trail is described as chronological ("time-sequenced"), and it is **scoped to a single, narrow subject: systems documentation**. Notably, this is a *different* audit trail from the §11.10(e) one, in the same section — Part 11 itself therefore contemplates at least two distinct audit trails in one system, with different subjects. That is direct textual evidence against a single-stream reading.

Confidence that Part 11 does not require a unified cross-subject trail: **high**.

---

### 2. FDA, "Data Integrity and Compliance With Drug CGMP: Questions and Answers," Guidance for Industry — final, December 2018

Source: `https://www.fda.gov/media/119267/download`. Confirmed final December 2018 from the document's own cover page and running footer ("December 2018", "Pharmaceutical Quality/Manufacturing Standards (CGMP)", "Contains Nonbinding Recommendations"). Retrieved and text-extracted 2026-09-11.

**Question 1.c, "What is an 'audit trail'?" — verbatim, in full:**

> "For purposes of this guidance, audit trail means a secure, computer-generated, time-stamped electronic record that allows for reconstruction of the course of events relating to the creation, modification, or deletion of an electronic record. For example, the audit trail for a high performance liquid chromatography (HPLC) run should include the user name, date/time of the run, the integration parameters used, and details of a reprocessing, if any. Documentation should include change justification for the reprocessing.
>
> Audit trails include those that track creation, modification, or deletion of data (such as processing parameters and results) and those that track actions at the record or system level (such as attempts to access the system or rename or delete a file).
>
> CGMP-compliant record-keeping practices prevent data from being lost or obscured and ensure that activities are documented at the time of performance (see §§ 211.68, 211.100, 211.160(a), 211.188, and 211.194). Electronic record-keeping systems, which include audit trails, can support these CGMP requirements."

This paragraph is the single most load-bearing text for the question, and it cuts two ways that both point the same direction:

- The definition is **record-relative**: "reconstruction of the course of events relating to the creation, modification, or deletion of **an electronic record**" (singular). The definition's scope object is one record.
- The worked example is **object-scoped**: "the audit trail **for** a high performance liquid chromatography (HPLC) run" — the guidance speaks of *an* audit trail belonging to *a* particular subject, and says what it should contain.
- The third sentence explicitly divides audit trails into **two kinds by subject**: (i) "those that track creation, modification, or deletion of data (such as processing parameters and results)" and (ii) "those that track actions at the record or system level (such as attempts to access the system or rename or delete a file)". FDA is describing a plurality of trails with different subjects as the normal state of affairs. It does not then require them to be merged.

Also relevant, from **Question 1.b, "What is 'metadata'?"** — verbatim excerpt:

> "Among other things, metadata for a particular piece of data could include a date/time stamp documenting when the data were acquired, a user ID of the person who conducted the test or analysis that generated the data, the instrument ID used to acquire the data, material status data, the material identification number, and audit trails.
>
> Data should be maintained throughout the record's retention period with all associated metadata required to reconstruct the CGMP activity (e.g., §§ 211.188 and 211.194). The relationships between data and their metadata should be preserved in a secure and traceable manner."

The operative phrase is "**The relationships** between data and their metadata should be preserved in a secure and traceable manner." This is a *linkage* obligation (each trail entry must remain traceably associated with its data), not a *co-location* obligation. Three tables each keyed to their subject preserve relationships by construction; the guidance does not speak to how many tables there are.

**Question 7, "Who should review audit trails?" — verbatim, in full:**

> "Audit trail review is similar to assessing cross-outs on paper when reviewing data. Personnel responsible for record review under CGMP should review the audit trails that capture changes to data associated with the record as they review the rest of the record (e.g., §§ 211.22(a), 211.101(c) and (d), 211.103, 211.182, 211.186(a), 211.192, 211.194(a)(8), and 212.20(d)). For example, all production and control records, which includes audit trails, must be reviewed and approved by the quality unit (§ 211.192). The regulations provide flexibility to have some activities reviewed by a person directly supervising or checking information (e.g., § 211.188). FDA recommends a quality system approach to implementing oversight and review of CGMP records."

This is FDA's clearest statement that review scope is **per-record, not system-wide**: "review **the audit trails that capture changes to data associated with the record** as they review **the rest of the record**." The reviewer's unit of work is the record; the trail entries in scope are those associated with that record. The plural "audit trails" recurs even within a single record's review.

**Question 8, "How often should audit trails be reviewed?" — verbatim, in full, including footnote 13:**

> "If the review frequency for the data is specified in CGMP regulations, adhere to that frequency for the audit trail review. For example, § 211.188(b) requires review after each significant step in manufacture, processing, packing, or holding, and § 211.22 requires data review before batch release. In these cases, you would apply the same review frequency for the audit trail.
>
> If the review frequency for the data is not specified in CGMP regulations, you should determine the review frequency for the audit trail using knowledge of your processes and risk assessment tools. The risk assessment should include evaluation of data criticality, control mechanisms, and impact on product quality.
>
> Your approach to audit trail review and the frequency with which you conduct it should ensure that CGMP requirements are met, appropriate controls are implemented, and the reliability of the review is proven.
>
> See the audit trail definition in 1.c. above for further information on audit trails."

> Footnote 13: "Risks to data include, but are not limited to, the potential to be deleted, amended, or excluded without authorization or without detection. Examples of audit trails that may be appropriate to review on a risk-based frequency include audit trails that capture instrument operational status, instrument communication logs, and alert records."

This is the strongest affirmative evidence *against* a unified-stream obligation in the FDA material: the review frequency is **derived from the frequency applicable to the underlying data**, which differs by subject. Batch-associated data inherits §211.22's before-release frequency; other trails (footnote 13's instrument status, communication logs, alert records) are reviewed on a risk-based frequency instead. A regime in which different trails are reviewed at different frequencies by different people presupposes that the trails are separable. It is not compatible with a requirement that all trails be one stream, and FDA nowhere states such a requirement.

**Negative finding:** A search of the extracted full text of the December 2018 guidance for "unified", "consolidated", "single audit", and "chronological" returned **zero matches**. The guidance nowhere requires a combined or single audit trail. Confidence: **high**.

---

### 3. PIC/S PI 041-1 (1 July 2021)

Source: `https://picscheme.org/docview/4234`. Retrieved successfully 2026-09-11 (63 pages). Cover page reads "PI 041-1 / 1 July 2021 / PIC/S GUIDANCE / GOOD PRACTICES FOR DATA MANAGEMENT AND INTEGRITY IN REGULATED GMP/GDP ENVIRONMENTS". This is the final in-force text, not the November 2018 Draft 3.

**Definition (Glossary, "Audit Trail") — verbatim:**

> "GMP/GDP audit trails are metadata that are a record of GMP/GDP critical information (for example the creation, modification, or deletion of GMP/GDP relevant data), which permit the reconstruction of GMP/GDP activities."

Note the definition is stated in the **plural** and classes audit trails as **metadata** — i.e. as something attached to data, not as a standalone system-wide journal.

**Section 9.6, "Audit trails for computerised systems," Expectation 1 — verbatim excerpts bearing on scope:**

> "Audit trail functionality should be verified during validation of the system to ensure that all changes and deletions of critical data associated with each manual activity are recorded and meet ALCOA+ principles.
>
> Regulated users should understand the nature and function of audit trails within systems, and should perform an assessment of the different audit trails during qualification to determine the GMP/GDP relevance of each audit trail, and to ensure the correct management and configuration of audit trails for critical and GMP/GDP relevant data. This exercise is important in determining which specific trails and which entries within trails are of significance for review with a defined frequency established. For example, following such an assessment audit trail reviews may focus on:
>
> - Identifying and reviewing entries/data that relate to changes or modification of data.
> - Review by exception – focusing on anomalous or unauthoried [sic] activities.
> - Systems with limitations that allow change of parameters/data or where activities are left open to modification
> - Note: Well-designed systems with permission settings that prevent change of parameters/data or have access restrictions that prevent changes to configuration settings may negate the need to examine related audit trails in detail"

This paragraph is decisive on sub-question 3. PIC/S expects a regulated user to **"perform an assessment of the different audit trails"** within a single system, to classify **"each audit trail"** by GMP relevance, and to determine **"which specific trails"** warrant review at what frequency. A single unified stream is not the assumed architecture; a **plurality of distinguishable trails, each classifiable by relevance**, is. (The `[sic]` marks a typo in the source, reproduced as printed.)

**Section 9.6, Expectation 1, on review scope and timing — verbatim:**

> "Companies should implement procedures that outline their policy and processes to determine the data that is required in audit trails, and the review of audit trails in accordance with risk management principles. Critical audit trails related to each operation should be independently reviewed with all other records related to the operation and prior to the review of the completion of the operation (e.g. prior to batch release) so as to ensure that critical data and changes to it are acceptable. This review should be performed by the originating department, and where necessary verified by the quality unit, e.g. during self-inspection or investigative activities.
>
> Non-critical audit trails reviews can be conducted during system reviews at a pre-defined frequency. This review should be performed by the originating department, and where necessary verified by the quality unit (e.g. during batch release, self-inspection or investigative activities)."

Scope is **per-operation**: "Critical audit trails **related to each operation** should be independently reviewed **with all other records related to the operation**." The grouping principle is the operation (and the records related to it), not the system. And PI 041-1 explicitly splits the population into **critical** trails (reviewed before batch release) and **non-critical** trails (reviewed during periodic system reviews) — again presupposing separability.

**Section 9.6, Expectation 2 — verbatim excerpts on form and retrieval:**

> "The system should provide a secure, computer generated, time stamped audit trail to independently record the date and time of entries and actions that create, modify, or delete electronic records.
>
> The audit trail should include the following parameters:
> - details of the user that undertook the action;
> - what action occurred, was changed, incl. old and new values;
> - when the action was taken, incl. date and time ;
> - why the action was taken (reason); and
> - in the case of changes or modifications to data, the name of any person authorising the change.
>
> The audit trail should allow for reconstruction of the course of events relating to the creation, modification, or deletion of an electronic record.
>
> The system should be able to print and provide an electronic copy of the audit trail, and whether viewing in the system online or in a hardcopy, the audit trail should be available in a meaningful format.
>
> If possible, the audit trail should retain the dynamic functionalities found in the computerised system, (e.g. search functionality and ability to export data such as to a spreadsheet).
>
> Note: An audit trail should not be confused with a change control system where changes may needed to appropriately controlled and approved under a PQS."

The obligations here are **capability** obligations — printable, exportable, meaningful format, searchable if possible — and again **record-relative** in scope ("reconstruction of the course of events relating to ... an electronic record", singular). Nothing here requires one physical or logical stream. The closing note also draws a boundary the question touches on: an audit trail is *not* the change control system, which is relevant because a method-version change stream sits near that boundary.

**Section 9.6, "Potential risk of not meeting expectations" — verbatim excerpt using the word "integrated":**

> "If no electronic audit trail system exists a paper based record to demonstrate changes to data may be acceptable until a fully audit trailed (integrated system or independent audit software using a validated interface) system becomes available. These hybrid systems are permitted, where they achieve equivalence to integrated audit trail, such as described in Annex 11 of the PIC/S GMP Guide."

Read carefully: "integrated audit trail" here is contrasted with **paper-based** and **hybrid** arrangements, and the parenthesis glosses it as "integrated system **or** independent audit software using a validated interface". The concern is that audit trailing be *automatic and system-generated* rather than manual and bolted on — not that all subjects share one table. Independent audit software with a validated interface is expressly allowed as equivalent. Confidence that this sentence does not impose cross-subject unification: **high**, though I flag it as the one phrase in the corpus a reader could misread that way.

**Section 9.8, "Review of data within computerised systems" — verbatim excerpts:**

> "The review of audit trails should be part of the routine data review within the approval process.
>
> The frequency, roles and responsibilities of audit trail review should be based on a risk assessment according to the GMP/GDP relevant value of the data recorded in the computerised system. For example, for changes of electronic data that can have a direct impact on the quality of the medicinal products, it would be expected to review audit trails prior to the point that the data is relied upon to make a critical decision, e.g. batch release.
>
> The regulated user should establish an SOP that describes in detail how to review audit trails, what to look for and how to perform searches etc. The procedure should determine in detail the process that the person in charge of the audit trail review should follow. The audit trail review activity should be documented and recorded."

And, on the quality unit's periodic programme:

> "The company's quality unit should establish a program and schedule to conduct ongoing reviews of audit trails based upon their criticality and the system's complexity in order to verify the effective implementation of current controls and to detect potential non-compliance issues. These reviews should be incorporated into the company's self-inspection programme."
>
> "Audit trail reviews should be both random (selected based on chance) and targeted (selected based on criticality or risk)."

"Ongoing reviews of audit trails **based upon their criticality**" — the plural possessive "their" again treats trails as individuated objects with individual criticality ratings.

**Negative finding:** A search of the extracted full text of PI 041-1 for "unified", "single audit", "one audit", and "combined audit" returned **zero matches**. The only occurrence of "consolidat*" is in §3.1.2 describing the guidance document's own purpose ("Providing consolidated, illustrative guidance on risk-based control strategies"), unrelated to audit trail architecture. The only occurrence of "chronological" is in the ALCOA+ "Consistent" attribute table ("policies or procedures that help control or standardize data (e.g. chronological sequencing, date formats, units of measurement, approaches to rounding, significant digits, etc.)") — a data-standardisation point, not an audit trail architecture point. Confidence: **high**.

---

### 4. 21 CFR 211.194 and 211.180 — and the Part 211 occurrence count

Source: eCFR, Title 21, Part 211, version as of issue date 2026-09-09, retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`.

**Occurrence count for the phrase "audit trail" in the entirety of 21 CFR Part 211: ZERO. Confirmed.** The count for the bare word "audit" in Part 211 is also **zero**. The expectation in the ticket is confirmed, not refuted. (Method: full Part 211 XML retrieved from the eCFR versioner API, tags stripped, case-insensitive string count.) Confidence: **high**.

This matters for framing: every "audit trail" obligation in the US CGMP regime reaches a laboratory either through **21 CFR Part 11 §11.10(e)** (where records are electronic) or through **FDA guidance interpreting Part 211's record and review provisions**. Part 211 itself does not use the term.

**§211.180(c) and (d), verbatim — the retrieval/availability provisions:**

> "(c) All records required under this part, or copies of such records, shall be readily available for authorized inspection during the retention period at the establishment where the activities described in such records occurred. These records or copies thereof shall be subject to photocopying or other means of reproduction as part of such inspection. Records that can be immediately retrieved from another location by computer or other electronic means shall be considered as meeting the requirements of this paragraph."
> "(d) Records required under this part may be retained either as original records or as true copies such as photocopies, microfilm, microfiche, or other accurate reproductions of the original records. Where reduction techniques, such as microfilming, are used, suitable reader and photocopying equipment shall be readily available."

The standard in (c) is **"readily available"** and **"immediately retrieved"** — an access-time standard, and the final sentence explicitly contemplates records being held **at a different location** from the activity, retrieved electronically. That is the opposite of a co-location requirement. §211.180 nowhere requires records of different kinds to be maintained together or in one chronological sequence.

**§211.194, Laboratory records** — I read the full section. It enumerates what laboratory records "shall include" — (a)(1) sample description, (a)(2) method statement, (a)(3) weight/measure, (a)(4) "A complete record of all data secured in the course of each test, including all graphs, charts, and spectra from laboratory instrumentation, properly identified to show the specific component, drug product container, closure, in-process material, or drug product, and lot tested", (a)(5) calculations, (a)(6) results vs. standards, (a)(7) "The initials or signature of the person who performs each test and the date(s) the tests were performed", (a)(8) "The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards"; and (b)–(e) complete records of method modifications, reference standards/reagents, instrument calibration, and stability testing.

**Finding: §211.194 is structured as five *separate* categories of "complete records" — (b) method modifications, (c) reference standards and reagents, (d) instrument calibration, (e) stability testing — each introduced by its own "Complete records shall be maintained of...". The regulation does not require these to be one record set, one file, or one chronological sequence.** Notably, §211.194(b) — "Complete records shall be maintained of any modification of an established method employed in testing. Such records shall include the reason for the modification and data to verify that the modification produced results that are at least as accurate and reliable for the material being tested as the established method" — is the clause closest to a method-version change stream, and it is written as a **distinct record category from the test-result records in (a)**, with different required content. The regulation's own structure separates the subjects the ticket is asking about. Confidence: **high**.

**The one chronological-order requirement in Part 211, and its scope — §211.182, verbatim in full:**

> "A written record of major equipment cleaning, maintenance (except routine maintenance such as lubrication and adjustments), and use shall be included in individual equipment logs that show the date, time, product, and lot number of each batch processed. If equipment is dedicated to manufacture of one product, then individual equipment logs are not required, provided that lots or batches of such product follow in numerical order and are manufactured in numerical sequence. In cases where dedicated equipment is employed, the records of cleaning, maintenance, and use shall be part of the batch record. The persons performing and double-checking the cleaning and maintenance (or, if the cleaning and maintenance is performed using automated equipment under § 211.68, just the person verifying the cleaning and maintenance done by the automated equipment) shall date and sign or initial the log indicating that the work was performed. Entries in the log shall be in chronological order."

A search of Part 211 for "chronological" returns exactly this one section. The requirement is "Entries in **the log** shall be in chronological order," where "the log" is an **"individual equipment log"** — i.e. one log per equipment item, chronological *within* itself. This is the clearest example in the corpus of the regulatory pattern: **chronology is required within a subject-scoped stream, never across subjects.** Confidence: **high**.

**§211.192, Production record review — verbatim in full** (cited by FDA Q7 as the source of the "all production and control records, which includes audit trails" review duty):

> "All drug product production and control records, including those for packaging and labeling, shall be reviewed and approved by the quality control unit to determine compliance with all established, approved written procedures before a batch is released or distributed. Any unexplained discrepancy (including a percentage of theoretical yield exceeding the maximum or minimum percentages established in master production and control records) or the failure of a batch or any of its components to meet any of its specifications shall be thoroughly investigated, whether or not the batch has already been distributed. The investigation shall extend to other batches of the same drug product and other drug products that may have been associated with the specific failure or discrepancy. A written record of the investigation shall be made and shall include the conclusions and followup."

The scoping word is **"All"** — all production and control records must be reviewed before release. This is a **completeness-of-review** obligation (nothing in scope may be skipped), not a **unity-of-storage** obligation. Its natural language is the language of coverage, not of a single stream. See section 6 below.

---

### 5. EU GMP Annex 11 §9 — in force, and the draft revision

**In force: Annex 11, Revision 1, operative 30 June 2011.** Source: European Commission, EudraLex Volume 4, `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`, retrieved 2026-09-11.

**§9, Audit Trails — verbatim in full:**

> "9. Audit Trails
> Consideration should be given, based on a risk assessment, to building into the system the creation of a record of all GMP-relevant changes and deletions (a system generated 'audit trail'). For change or deletion of GMP-relevant data the reason should be documented. Audit trails need to be available and convertible to a generally intelligible form and regularly reviewed."

Confirming what was asked: **§9 says nothing about audit trails being unified versus per-record.** It is silent on the question. Its three obligations are (i) risk-based consideration of building audit trailing in at all, (ii) documented reason for change or deletion, (iii) availability, convertibility to "a generally intelligible form", and regular review. The phrase "a record of all GMP-relevant changes and deletions" uses "all" as a **completeness** qualifier on *what is captured* (no GMP-relevant change may go uncaptured), and the section then reverts to the plural "Audit trail**s**" in the very next sentence — which is inconsistent with reading the earlier "a record" as mandating one physical stream. Confidence that §9 imposes no unification requirement: **high**. Confidence that the singular "a record ... (a system generated 'audit trail')" is a completeness rather than a unification phrase: **medium-high** — the text is genuinely terse and I am reasoning from its own internal plural usage, not from an explicit statement.

**DRAFT — NOT IN FORCE.** A revised Annex 11 was published for stakeholder consultation. **Status: draft; consultation opened 7 July 2025 and closed 7 October 2025, 23:59 (CEST); consultation status now "Closed"; no adopted replacement text confirmed as of 2026-09-11.** Source of the draft: `https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en?filename=mp_vol4_chap4_annex11_consultation_guideline_en.pdf`; consultation page: `https://health.ec.europa.eu/consultations/stakeholders-consultation-eudralex-volume-4-good-manufacturing-practice-guidelines-chapter-4-annex_en`. **Everything quoted below is draft text and may change or never be adopted. Do not treat it as authority.**

Draft **Glossary definition** — verbatim:

> "Audit trail
> In computerised systems, an audit trail is a secure, computer generated, time-stamped electronic record that allows reconstruction of the events relating to the creation, modification, or deletion of an electronic record."

(Draft Annex 11 would, if adopted, introduce a definition where the in-force version has none — and it is **record-relative**, matching FDA's 2018 wording almost exactly: "relating to the creation, modification, or deletion of **an electronic record**".)

Draft **§12, Audit Trails** — the provisions bearing on this question, verbatim:

> "12.1. Manual user interactions. Systems which are used to control processes, capture, hold or report data, and where users can create, modify or delete data, settings or access privileges, acknowledge alarms or execute electronic signatures etc., should have an audit trail functionality which automatically logs all manual user interactions."
>
> "12.4. Accommodate review. Systems should accommodate effective and efficient reviews of audit trail data. It should be possible for all users to sort and search audit trail data (who, what, when and why) in the system, or alternatively, to allow export of the data to a tool where this is possible."
>
> "12.7. Scope of review. Reviewing all entries in an audit trail record may not be effective. Reviews should be targeted, based on risk and adapted to local manufacturing processes. Procedures for audit trail reviews should focus on detecting any deliberate or indeliberate changes to critical processes or data that indicate a violation of GMP principles, including, but not limited to, repetition of activities, errors, omissions, unauthorised process deviations and loss of data integrity. A key element should be to verify the reason why a change is made."
>
> "12.8. Timeliness of review. Audit trail reviews should be conducted in a timely manner according to the risk of the process reviewed. The audit trail review should be conducted prior to batch release, unless the risk of a later detection of any unwarranted changes can be justified."
>
> "12.9. Electronic copy. It should be possible to obtain a complete electronic copy of system data including audit trail data. Flat and locked files are not acceptable, it should be possible to search and sort data."
>
> "12.10. Availability to QP. Audit trail reviews with direct impact on the release of a product should be available to the QP at the time of batch release."

**The single most directly on-point sentence in the entire corpus is in the draft, at §11.9 (Identity and Access Management section), verbatim:**

> "11.9. Access log. Systems should include an access log (separate, or as part of the audit trail) which, for each login, automatically logs the username, user role (if possible, to choose between several roles), the date and time for login, the date and time for logout (incl. inactivity logout). The log should be sortable and searchable, or alternatively, it should be possible to export the log to a tool which provides this functionality."

The parenthesis — **"(separate, or as part of the audit trail)"** — is an explicit regulatory statement that an access/identity-oriented log may be held **separately from** the data audit trail, at the regulated user's option. This is the draft directly declining to require unification for exactly the account-events-versus-data-events split the ticket is about. **It is draft text and must be labelled as such**; it is nonetheless evidence of what the inspectorates drafting it understand the existing expectation to be, since it is framed as a clarification rather than a new permission.

The direction of travel in the draft is toward **capability** requirements — §12.4 sortable/searchable or exportable; §12.9 complete electronic copy, "Flat and locked files are not acceptable, it should be possible to search and sort data" — and away from storage-topology requirements. Draft §12.9's "complete electronic copy of system data including audit trail data" is the closest the draft comes to a unified-export idea, but it is an export/copy obligation over system data, not a requirement that the data live in one stream. Confidence: **high** that no draft provision requires cross-subject unification; **high** that §11.9 affirmatively permits separation.

---

### 6. Is there a primary-source "audit trail review" obligation made harder or easier by having several streams?

Yes, there is a review obligation, and it is real and before-release in character. Here is the full set of primary texts that create it, with their scoping language:

| Source | Status | What must be reviewed | Scope/grouping principle | When |
|---|---|---|---|---|
| 21 CFR 211.192 | Binding rule | "All drug product production and control records" | The batch | "before a batch is released or distributed" |
| 21 CFR 211.194(a)(8) | Binding rule | "the original records ... for accuracy, completeness, and compliance with established standards" | The laboratory record | second-person review, no clock stated |
| FDA Dec 2018 Q&A, Q7 | Nonbinding guidance | "the audit trails that capture changes to data **associated with the record**" | The record | "as they review the rest of the record" |
| FDA Dec 2018 Q&A, Q8 | Nonbinding guidance | the audit trail for the data | Inherits the data's own review frequency; risk-based if none specified | §211.22 → before batch release, for data subject to it |
| FDA Dec 2018 Q&A, fn.13 | Nonbinding guidance | "instrument operational status, instrument communication logs, and alert records" | Named as examples of trails on a **risk-based** (i.e. not before-release) frequency | risk-based |
| PIC/S PI 041-1 §9.6 | Inspectorate guidance | "Critical audit trails related to each operation ... with all other records related to the operation" | **The operation** | "prior to the review of the completion of the operation (e.g. prior to batch release)" |
| PIC/S PI 041-1 §9.6 | Inspectorate guidance | "Non-critical audit trails" | The system | "during system reviews at a pre-defined frequency" |
| PIC/S PI 041-1 §9.8 | Inspectorate guidance | audit trails, "based upon their criticality and the system's complexity" | Quality unit programme, self-inspection | "ongoing ... program and schedule"; random and targeted |
| EU Annex 11 §9 (in force) | Binding EU guideline | "Audit trails" | not specified | "regularly reviewed" |
| Draft Annex 11 §12.7, §12.8 | **DRAFT ONLY** | targeted, risk-based subset ("Reviewing all entries in an audit trail record may not be effective") | The process reviewed | "prior to batch release, unless ... justified" |

**The finding on the phrasing the ticket asked about specifically:** the nearest thing to a "review all audit trails for a batch before release" requirement is **§211.192** ("**All** drug product production and control records ... shall be reviewed and approved by the quality control unit ... before a batch is released"), as glossed by **FDA Q7** ("all production and control records, **which includes audit trails**, must be reviewed and approved by the quality unit (§ 211.192)") and by **PI 041-1 §9.6** ("**Critical audit trails related to each operation** should be independently reviewed **with all other records related to the operation** and prior to ... batch release").

Every one of these is scoped by **subject matter relevance to the batch/operation/record**, not by system boundary. Note also that two sources go out of their way to say that reviewing *everything* is not the expectation: PI 041-1 §9.6 endorses "Review by exception" and notes that well-designed permission settings "may negate the need to examine related audit trails in detail"; draft Annex 11 §12.7 states outright that "Reviewing all entries in an audit trail record may not be effective" and that "Reviews should be targeted, based on risk."

**Therefore:** the review obligation is a *coverage* obligation over the records relevant to a decision, discharged at a frequency that varies by subject. Nothing in it is expressed in terms of the number of underlying stores or queries. I report this as fact and make no judgement about whether three streams make discharging it harder or easier — that is the worker's call, not mine.

---

## What I could not establish

- **Whether a revised EU GMP Annex 11 has been adopted.** The consultation closed 7 October 2025. As of 2026-09-11 the European Commission still serves the 2011 Revision 1 PDF as the EudraLex Volume 4 Annex 11, and I found no adopted replacement. I could not find a published adoption date or an in-force date for the revision. If the draft §11.9 "(separate, or as part of the audit trail)" language becomes load-bearing for a decision, its status must be re-checked at that time; it is draft today.
- **Whether PIC/S will adopt a PI 041-2 or otherwise revise PI 041-1** in line with the Annex 11 revision. PI 041-1 (1 July 2021) is the version I retrieved and confirmed; I did not search for a successor.
- **FDA's position where Part 11's §11.10(e) and §11.10(k)(2) trails interact.** Part 11 contains two distinct audit trail obligations with different subjects, and I found no FDA interpretive text addressing how they relate. The December 2018 guidance does not discuss §11.10(k)(2).
- **Any inspection-observation or enforcement evidence.** I did not search FDA warning letters, 483s, or EudraGMDP non-compliance reports, which are a different evidentiary class from the texts above and were not requested. It is possible an inspector has in practice expected a consolidated view; nothing in the *texts* requires it, and I make no claim about inspection practice.
- **ICH Q7, 21 CFR Part 212, PIC/S PI 011, and MHRA's data integrity guidance** were not fetched — none were named in the task. If any of these turns out to be load-bearing, it is not covered here.
- **A definition of "operation"** as used in PI 041-1 §9.6 ("Critical audit trails related to each operation"). The term is not defined in the PI 041-1 glossary in a way that settles whether a user-account change or a method-version approval is part of "an operation" for review-grouping purposes. This is the one genuinely open question the sources do not settle: they tell you the grouping principle is the operation/record, but not where the boundary of an operation falls for non-batch-associated subjects.

## Sources

1. **21 CFR Part 11** (Electronic Records; Electronic Signatures), eCFR, version as of issue date **2026-09-09** (most recent available). Retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`; canonical view `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`. Retrieved 2026-09-11.
2. **21 CFR Part 211** (CGMP for Finished Pharmaceuticals), eCFR, version as of issue date **2026-09-09**. Retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`; canonical view `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`. Retrieved 2026-09-11. Occurrence count of "audit trail": **0**; of "audit": **0**.
3. **FDA, "Data Integrity and Compliance With Drug CGMP: Questions and Answers," Guidance for Industry — final, December 2018.** `https://www.fda.gov/media/119267/download`. Confirmed final December 2018 from the document's own cover and footer, not the April 2016 or the draft versions. Retrieved 2026-09-11. Nonbinding recommendations, per its own footer.
4. **PIC/S PI 041-1, "Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments," 1 July 2021** (final, in force; supersedes Draft 2 of August 2016 and Draft 3 of November 2018). `https://picscheme.org/docview/4234`. 63 pages. Retrieved 2026-09-11.
5. **European Commission, EudraLex Volume 4, Annex 11: Computerised Systems, "revision 1," operative 30 June 2011** — the version in force. `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`. Retrieved 2026-09-11.
6. **DRAFT — NOT IN FORCE: European Commission, EudraLex Volume 4, draft revised Annex 11: Computerised Systems, stakeholder consultation version.** `https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en?filename=mp_vol4_chap4_annex11_consultation_guideline_en.pdf`. Retrieved 2026-09-11. Consultation opened 7 July 2025, closed 7 October 2025 23:59 CEST, status "Closed". Adoption not confirmed. **Cited only as draft.**
7. **European Commission consultation page**, "Stakeholders' Consultation on EudraLex Volume 4 — Good Manufacturing Practice Guidelines: Chapter 4, Annex 11 and New Annex 22." `https://health.ec.europa.eu/consultations/stakeholders-consultation-eudralex-volume-4-good-manufacturing-practice-guidelines-chapter-4-annex_en`. Consulted 2026-09-11 to establish the draft's status and consultation dates only.

No secondary sources (consultant blogs, vendor whitepapers, industry commentary) were relied on for any claim in this document.
