# ISO/IEC 17025:2017 and Benchline's information system

Researched 2026-09-13. The standard is paywalled and is not quoted directly. Clause wording comes only from the sources below. PJLA's checklist rewords each clause as a question, so text from it is labelled a paraphrase.

## 1. Sources

- **S1** ISO Online Browsing Platform, ISO/IEC 17025:2017. https://www.iso.org/obp/ui/#iso:std:iso-iec:17025:ed-3:v2:en. Primary. **Not reached** (HTTP 403); nothing below relies on it.
- **S2** PJLA LF-56, _ISO/IEC 17025:2017 Working Document_ (assessor checklist), Rev. 1.1, revised 12/2020. https://www.pjlabs.com/downloads/LF-56-17025-2017.pdf. Primary (accreditation body). Covers every clause, reworded as questions; cited "(paraphrase via PJLA LF-56)".
- **S3** ILAC-G8:09/2019 _Guidelines on Decision Rules and Statements of Conformity_ (bilingual edition hosted by NAH, Hungary). https://nah.gov.hu/admin/staticmedia/Oldalakhoz_csatolt_dokumentumok/NAR_NAD/KL/ILAC_G8_09_2019-HUN-ENG%20(v02).pdf. Primary (ILAC). §2 quotes clauses 3.7, 6.2.6, 7.1.3, 7.8.3.1 and 7.8.6 word for word.
- **S4** ILAC-G17:01/2021 _Guidelines for Measurement Uncertainty in Testing_ (hosted by UKAS). https://www.ukas.com/wp-content/uploads/schedule_uploads/759162/ILAC_G17_01_2021.pdf. Primary (ILAC). Quotes 7.8.3.1 c).
- **S5** Eurachem/CITAC _Use of Uncertainty Information in Compliance Assessment_, 2nd ed., 2021. https://www.eurachem.org/images/stories/Guides/pdf/MUC2021_P1_EN.pdf. Primary (technical guide).
- **S6** European Accreditation FAQ 36.1 (LIMS). https://european-accreditation.org/sp_accordion_faqs/36-1-question-on-laboratory-information-management-system-lims/. Primary, undated.
- **S7** European Accreditation FAQ 45.2 (report amendments). https://european-accreditation.org/sp_accordion_faqs/45-2-question-on-amendments-to-test-reports-iso-iec-17025-clause-7-8-8-1/. Primary, undated.

Not used: ILAC P14 (calibration only) and ILAC P15 (inspection bodies) do not apply to a testing lab. A2LA, ANAB, UKAS and NATA checklists could not be retrieved. Unauthorized full copies of the standard found online were ignored.

## 2. Requirements by clause

### 4.1 / 4.2 Impartiality and confidentiality

The lab identifies and reduces risks to impartiality on an ongoing basis. Confidentiality commitments are legally enforceable, and customer information is confidential by default (paraphrase via PJLA LF-56).
**For Benchline:** Separation of duties (ADR-0003/0004/0005) is an impartiality control. Sign-in exists, but nothing limits which Clients' Samples a user sees (from reading code, not verified). **Partly.**

### 6.2 Personnel competence and authorization

Procedures and records for competence, training, supervision, authorization and monitoring (6.2.5). Personnel are authorized for specific activities (paraphrase via PJLA LF-56), including "analysis of results, including statements of conformity" (6.2.6, quoted in S3 §2.2).
**For Benchline:** Authorization is by role only (`actsAs`). There is no per-Method authorization or training record (from reading code, not verified). **Not.**

### 7.1 Review of requests

Requirements are defined and understood, and methods are suitable (7.1.1, paraphrase via PJLA LF-56). Clause 7.1.3 as quoted in S3 §2.3: "the decision rule shall be clearly defined. Unless inherent in the requested specification or standard, the decision rule selected shall be communicated to, and agreed with, the customer." S3 §4.2.3 expects agreement "before the measurements are taken".
**For Benchline:** Receipt records Due date, Maximum daily dose and Client reference. It records no agreed Method and no agreed decision rule. **Not.**

### 7.4 Handling of test items (chain of custody)

- **7.4.1:** A procedure for transportation, receipt, handling, protection, storage, retention and disposal or return of items.
- **7.4.2:** Unambiguous identification kept for as long as the lab holds the item, accommodating "sub-division" and "transfer of items" where appropriate.
- **7.4.3:** Receipt deviations recorded; the customer consulted when suitability is doubtful; a report disclaimer when the customer asks to proceed anyway.
- **7.4.4:** Storage conditions maintained, monitored and recorded.

(All paraphrase via PJLA LF-56.)

**For Benchline:**

- Satisfied: identification (Sample ID under a Submission); receipt data (`receivedAt`, `receivedBy`, `temperatureOnArrival`, `packageCondition`, `chainOfCustodyReference`); Receipt deviations with the Client instruction and a hold.
- Partly: the Certificate lists deviations but has no "results may be affected" disclaimer. `storageLocation`, `storageCondition` and `retentionInstruction` are free text set once at receipt and never updated or monitored (from reading code, not verified).
- Not covered: transfers, sub-samples, disposal or return.

### 7.5 Technical records

Records allow the work to be repeated. They name who performed the work and who checked it, with dates. Original observations are recorded when made. Amendments can be traced to previous versions, and original and amended data are both kept, with the date, what changed and who changed it (7.5.1–7.5.2, paraphrase via PJLA LF-56).
**For Benchline:** Satisfied: the append-only audit trail (who, when, old, new, reason), retained superseded and Invalidated Results, and signed performed-by and approved-by. Partly: the calculation is done off-system and only attached (ADR-0002).

### 7.6 Measurement uncertainty

A testing lab evaluates uncertainty, or estimates it where rigorous evaluation is impossible (7.6.3, paraphrase via PJLA LF-56). Report it when it "affects conformity to a specification limit", among other cases (7.8.3.1 c, quoted in S4). Evaluation "is still applicable" to results expressed as pass/fail (S4 §3).
**For Benchline:** No uncertainty is stored or reported. **Not.** Whether the lab keeps it on paper is unknown.

### 7.7 Ensuring validity of results

A planned monitoring procedure (reference materials, control charts, replicates, blind samples), with trends detectable, plus interlaboratory comparison (paraphrase via PJLA LF-56).
**For Benchline:** No QC, control-chart or proficiency-testing data. **Not** (possibly out of scope; unknown).

### 7.8 Reporting

**7.8.2.1** requires, among others: title; laboratory name and address; unique identification and a clear end; customer name and **contact**; method; item identification and condition; date of receipt; **dates of performance**; **date of issue**; a statement that results **relate only to the items tested**; results with units; and who authorized the report. **7.8.2.2:** state that results apply to the sample **as received** where the lab did not sample, and identify customer-supplied data (paraphrase via PJLA LF-56).
**For Benchline:** The Certificate has most items. It lacks the items in bold above: only `approvedAt` is printed, and `publishedAt` sits outside the locked content. Client-supplied Maximum daily dose is not marked as such (from reading code, not verified). **Partly.**

**7.8.6.1**, quoted in S3 §2.6: "the laboratory shall document the decision rule employed, taking into account the level of risk (such as false accept and false reject and statistical assumptions) … and apply the decision rule". **7.8.6.2** (S3 §2.7): the report identifies "a) to which results the statement of conformity applies; b) which specifications … are met or not met; c) the decision rule applied (unless it is inherent in the requested specification or standard)". A note records that no further risk consideration is needed where a customer or regulation prescribes the rule (paraphrase via PJLA LF-56).
**For Benchline:** a) to c) are satisfied: the Conformity statement is per Result, the Limit source is printed, and `decisionRule` is printed. Risk basis and Client agreement are **not** covered (§4).

**7.8.8:** Changes clearly identified, with the reason where appropriate (7.8.8.1). An amendment is a further document marked "Amendment to Report, serial number… [or as otherwise identified]" or equivalent (7.8.8.2). A complete new report is uniquely identified and references the original it replaces (7.8.8.3) (paraphrase via PJLA LF-56). Reasons for reissue are not limited, but customer requests must not compromise integrity (S7).
**For Benchline:** An Amendment carries a new version, the `Amended` marker, a reason and a before-to-after change summary, and is re-signed. **Mostly satisfied**; see §4 for the missing "replaces" reference.

### 7.9 Complaints

A documented, tracked process whose outcomes are reviewed by someone not involved in the work (paraphrase via PJLA LF-56).
**For Benchline:** No complaint concept. **Not** covered by the system (a paper process is unknown).

### 7.10 Nonconforming work

When work does not conform to procedures or agreed requirements, the lab defines who is responsible, takes risk-based action (halt work, withhold reports), evaluates significance "including an impact analysis on previous results", decides acceptability, notifies or recalls where necessary, authorizes resumption, keeps records, and takes corrective action if the problem could recur (7.10.1–7.10.3, paraphrase via PJLA LF-56).
**For Benchline:** The OOS investigation and the Receipt deviation hold are narrow instances. There is no general nonconformity record, impact analysis or recall. **Partly.**

### 7.11 Control of data and information management

- **7.11.2:** A LIMS is "validated for functionality, including the proper functioning of interfaces … before introduction". Changes, including configuration changes, are authorized, documented and validated before implementation. Note 2: commercial off-the-shelf software in general use can be considered validated.
- **7.11.3:** Protected from unauthorized access, safeguarded against tampering and loss, and with system failures recorded.
- **7.11.6:** Calculations and data transfers are checked systematically.

(Paraphrase via PJLA LF-56.) S6: "the software of LIMS shall always be documented and validated for its functionality before implementation by the lab".

**For Benchline:**

- Satisfied: access control and signatures.
- Partly: tamper resistance, via append-only triggers and a SHA-256 hash per Certificate (from reading code, not verified); the Manager's worksheet check (7.11.6).
- Planned: validation before introduction (ADR-0001).
- Unknown or not covered: change validation, back-up, failure log.

### 8.4 Control of records / 8.7 Corrective action

Controls for record storage, protection, back-up, archive, retrieval, retention time and disposal (8.4.2). Record each nonconformity, its causes, the actions taken and their effectiveness (8.7) (paraphrase via PJLA LF-56).
**For Benchline:** Records are never deleted, but there is no retention period, back-up policy or corrective action record. **Not.**

## 3. Is Benchline "basically chain of custody"?

**No.** Chain of custody is clause 7.4 (plus the receipt date in 7.8.2.1 h), one of about fifteen clause areas that touch a LIMS. Benchline's current design splits roughly as follows:

- **Records integrity** (7.5, 7.11, 8.4), about half: audit trail, Electronic signatures, versioned Results, locked hashed Certificates.
- **Review, conformity and reporting** (6.2.6, 7.8, 7.10), about a third: Approval, separation of duties, Conformity statement, OOS investigation, Certificate, Amendment.
- **Custody** (7.4), about a sixth: Submission, Sample identification, receipt data, Receipt deviations. It covers only the moment of **receipt**.

Custody gaps:

- No record of **internal transfers** between people or storage (`storageLocation` is set once).
- No **sub-sample** identification.
- **Storage conditions** are a label, not maintained, monitored or recorded (7.4.4).
- **Retention and disposal** are a free-text instruction with no dated record of what was actually done.

"Chain of custody" fits the receiving screen, not the project. A better frame is "a 17025/Part 11 system of record from receipt to report".

## 4. Tensions and gaps

1. **Decision rule and uncertainty.**
   - Rounding to the Limit's decimal places and comparing, with no uncertainty, is ILAC G8's **simple acceptance (w = 0), "shared risk"**. At the Limit, the chance of a wrong acceptance "may be as high as 50%" (S3 §4.1). Rounding itself is a legitimate part of a decision rule (S5 §4.1).
   - 7.8.6.2 c) is met, because the rule is printed.
   - 7.1.3 is **not** met: no record shows the rule was agreed with the Client. The rule could only be "inherent" in the specification if FDA's Acceptable intake list stated one, and whether it does is **unverified**.
   - 7.8.6.1's risk consideration is waived only if a regulation or the Client prescribes the rule, and no prescription is recorded.
   - With no uncertainty evaluated, the lab cannot show under 7.8.3.1 c) whether uncertainty affects conformity near the Limit (S4).
   - The `< LOD`/`< LOQ` comparison is also part of the decision rule and needs the same agreement.
2. **Amendment marking (7.8.8).**
   - `Amended` plus "Version N" is likely an acceptable equivalent under 7.8.8.2.
   - But each version is a complete new report, and under 7.8.8.3 it must reference the version it replaces. The printed Certificate does not (`supersededBy` is derived and not printed; from reading code, not verified).
   - CONTEXT.md's Amendment only corrects Results, so a wrong batch number or other receipt data has no amendment path.
3. **7.11 validation vs ADR-0001.**
   - ADR-0001's signed UAT plan covers validation "before introduction".
   - 7.11.2 also requires every **change**, configuration included, to be validated before implementation, including interfaces. No ADR covers change control.
   - Benchline is custom software, so the Note 2 off-the-shelf exemption does not apply.
4. **7.10 vs Receipt deviation and OOS investigation.**
   - CONTEXT.md is right to keep Receipt deviation apart from "non-conformance": it is a 7.4.3 matter about the item.
   - A laboratory error found by an OOS investigation _is_ nonconforming work, which calls for an impact analysis on other Samples and Certificates, possible recall, and corrective action (7.10.1 c, e; 8.7).
   - Benchline stops at Invalidated plus a Retest.
   - Nonconformities that are not OOS (an instrument fault, a missed storage condition, an error found after Publishing) have nowhere to be recorded.

## 5. Developer checklist

1. Record the Client's agreed decision rule, with who recorded it and when. Refuse `Complies` or `Does not comply` without one, unless the rule is flagged as prescribed by regulation. _(7.1.3; S3)_
2. Print the applied decision rule from the locked Certificate content. _(7.8.6.2 c; S3)_
3. Store measurement uncertainty, or a documented "not evaluated" reason, per Method version, and copy it into each Result. _(7.6.3; S2)_
4. Print expanded uncertainty with k when the Client requires it or it affects conformity. _(7.8.3.1 c; S4)_
5. Print on each Amendment version the version it replaces. _(7.8.8.3; S2)_
6. Allow an Amendment to correct receipt or Sample data, with a reason and re-approval. _(7.8.8.1, 7.5.2; S2)_
7. Lock the date of issue, the testing dates, the Client contact, "results relate only to the items tested" and "as received" into Certificate content. _(7.8.2.1 e, i, j, l; 7.8.2.2; S2)_
8. Mark Client-supplied data, such as Maximum daily dose, on the Certificate. _(7.8.2.2; S2)_
9. When a Sample proceeds despite a Receipt deviation, print a disclaimer naming the affected Results. _(7.4.3; S2)_
10. Audit-trail every change of storage location or custodian. _(7.4.1, 7.4.2; S2)_
11. Record disposal or return as a dated, attributed event, and block it before the retention instruction allows. _(7.4.1; S2)_
12. Give each sub-sample an identifier linked to its parent Sample. _(7.4.2; S2)_
13. Assign Tests only to Analysts authorized for that Method version. _(6.2.5 e, 6.2.6; S2, S3)_
14. When an OOS investigation concludes Invalidated, require an impact assessment linking the other Samples and Certificates affected. _(7.10.1 c, e; S2)_
15. Provide a nonconforming work record, separate from OOS, covering action taken, decision, Client notification and resumption. _(7.10.1–7.10.2; S2)_
16. Record corrective actions with their cause and an effectiveness review. _(8.7.1, 8.7.3; S2)_
17. Refuse deployment of any code or configuration change without an authorization and validation evidence. _(7.11.2; S2, S6)_
18. Log system failures and the actions taken. _(7.11.3 e; S2)_
19. Enforce retention periods per record type, and test back-up and restore. _(8.4.2; S2)_
20. Restrict Client data visibility by role, and log access to Certificates. _(4.2.1, 8.4.2; S2)_
