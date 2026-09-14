# FDA electronic records, electronic signatures and CGMP laboratory records

Research note for Benchline, 13 September 2026. The regulation text comes from the eCFR as amended through 2026-09-10. The guidance text comes from the FDA PDFs. Anything marked "(from reading code, not verified)" is a reading of `src/`, not a test result.

## 1. Sources

| Key | Title | URL | Date / revision | Status |
|---|---|---|---|---|
| P11 | 21 CFR Part 11, Electronic Records; Electronic Signatures | https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11 | eCFR current as of 2026-09-10 (62 FR 13464, 1997; §11.100 amended 88 FR 13018, 2023) | **Binding regulation** |
| 211 | 21 CFR 211.68, 211.160, 211.165, 211.166, 211.180, 211.194 | https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-211 (append `/section-211.194`, etc.) | eCFR current as of 2026-09-10 | **Binding regulation** |
| SA | Guidance for Industry, Part 11, Electronic Records; Electronic Signatures — Scope and Application | https://www.fda.gov/media/75414/download | August 2003 | Guidance, **nonbinding** |
| DI | Data Integrity and Compliance With Drug CGMP: Questions and Answers, Guidance for Industry | https://www.fda.gov/media/119267/download | December 2018 | Guidance, **nonbinding** |

Not used: the 2024 FDA guidance on electronic systems in clinical investigations. The brief allowed it only if it applied to a GMP lab, and it was not fetched.

Scope note (SA §III.A, p.4). FDA does not enforce the Part 11 requirements on validation (§11.10(a)), audit trails (§11.10(e), (k)(2)), record copies (§11.10(b)) and record retention (§11.10(c)). However, "records must still be maintained or submitted in accordance with the underlying predicate rules" (SA §I, lines 36–42). FDA *continues to enforce* access limits, operational checks, authority checks, device checks, training, accountability policies, documentation controls, and §§11.50, 11.70, 11.100, 11.200 and 11.300 (SA §III.A, lines 131–147). Benchline's predicate rule is Part 211, and 211.68(b), 211.180 and 211.194 carry the same substance anyway. ADR-0001 already chooses full Part 11.

## 2. Requirements by concern

### 2.1 Records and copies

- **Validation.** §11.10(a) requires "Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records." DI Q3 (p.6) says each CGMP workflow is an intended use that must be validated, "commensurate with the risk".
  **For Benchline:** *Partly.* ADR-0001 keeps paper as the official record until a signed validation is complete. Each workflow (receipt, Result entry, OOS investigation, Approval, Publish, Amendment) needs its own validation evidence.
- **Accurate and complete copies.** §11.10(b) requires copies "in both human readable and electronic form suitable for inspection". §211.180(c) says records "shall be readily available for authorized inspection… subject to photocopying or other means of reproduction". SA §III.C.4 (enforcement discretion) says copies should "preserve the content and meaning of the record" and keep search and sort where feasible. DI Q9 adds that a true copy must keep "all metadata required to reconstruct the CGMP activity and the static or dynamic nature of the original records".
  **For Benchline:** *Partly.* The core has an export of the audit trail, signatures and attachments. The Certificate of Analysis is stored as locked content with a SHA-256 (from reading code, not verified). No export of a complete human-readable Sample record was found.
- **Metadata.** DI Q1.b (p.4): data "should be maintained throughout the record's retention period with all associated metadata required to reconstruct the CGMP activity", and relationships between data and metadata "should be preserved in a secure and traceable manner".
  **For Benchline:** *Partly.* Each Result keeps its instrument reading, sequence ID, worksheet attachment and Method version (from reading code, not verified). The instrument's own raw data stay outside Benchline.

### 2.2 Audit trail

- **Content.** §11.10(e) requires "secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. Record changes shall not obscure previously recorded information." DI Q1.c (p.4–5) says audit trails also cover system-level actions, "such as attempts to access the system", and reprocessing needs a "change justification".
  **For Benchline:** *Satisfies for record changes* (from reading code, not verified). `AuditTrail` stores who, when, the old and new value, the reason and the command. Database triggers refuse UPDATE and DELETE. *Unknown* whether sign-in attempts and failed passwords are audited.
- **Obscuring prior entries (predicate).** DI Q12 (p.10): "data required to be created and maintained cannot be modified without a record of the modification"; storing records "in a manner that allows for manipulation without creating a permanent record" is not acceptable.
  **For Benchline:** *Satisfies* for audit entries, attachments, Certificates and publications, which are protected by immutability triggers. *Partly* for the `signatures` table, which has no update or delete trigger (from reading code, not verified).
- **Retention of the trail.** §11.10(e): audit trail documentation "shall be retained for a period at least as long as that required for the subject electronic records".
  **For Benchline:** *Unknown.* No retention or archive mechanism was found.
- **Who reviews.** DI Q7 (p.8): "Personnel responsible for record review under CGMP should review the audit trails that capture changes to data associated with the record as they review the rest of the record (e.g., … 211.194(a)(8))."
  **For Benchline:** *Partly.* The Manager has an audit trail view, but Approval does not require or record that the Sample's audit trail was reviewed.
- **How often.** DI Q8 (p.8): where the regulations set the review frequency for the data, use the same frequency for the audit trail. Otherwise set it by risk assessment.
  **For Benchline:** Laboratory records are reviewed under §211.194(a)(8), so the Sample's audit trail review belongs at every Approval, including Approval of an Amendment. Lab-wide trails (Acceptable intake, attachments, access) need a documented periodic frequency.

### 2.3 Electronic signatures

- **Manifestation.** §11.50(a) requires "(1) The printed name of the signer; (2) The date and time when the signature was executed; and (3) The meaning". Under §11.50(b) these must be "included as part of any human readable form of the electronic record".
  **For Benchline:** *Satisfies on the Certificate of Analysis* (from reading code, not verified). The renderer prints meaning, printed name and a UTC time stamp. Screens showing Results as signed need the same three items. SA footnote 5 says system documentation should explain the time zone reference (UTC).
- **Linking.** §11.70: signatures "shall be linked to their respective electronic records to ensure that the signatures cannot be excised, copied, or otherwise transferred to falsify an electronic record by ordinary means."
  **For Benchline:** *Partly.* Each signature is stored with a fingerprint of the signed command, and each Certificate version has a content hash (from reading code, not verified). The `signatures` table itself can still be changed.
- **Uniqueness and identity.** §11.100(a): "unique to one individual and shall not be reused by, or reassigned to, anyone else"; (b) identity verified before issue; (c) a certification to FDA, signed by hand, that e-signatures are legally binding.
  **For Benchline:** *Partly.* Accounts are individual (ADR-0004). Identity verification and the §11.100(c) letter are procedures outside the software and are *not yet evidenced*.
- **Components and sessions.** §11.200(a)(1) requires "at least two distinct identification components such as an identification code and password". Under (i), within "a single, continuous period of controlled system access" the first signing uses all components and later signings at least one. Under (ii), signings outside such a period each use all components.
  **For Benchline:** *Satisfies* (from reading code, not verified). Every signing command re-verifies the password of the signed-in account, which is stricter than (i).
- **Password controls.** §11.300 requires (a) unique ID/password combinations, (b) periodic checking or revision ("password aging"), (c) loss management and deauthorization, and (d) "transaction safeguards to prevent unauthorized use… and to detect and report in an immediate and urgent manner any attempts at their unauthorized use".
  **For Benchline:** *Partly or not.* Passwords are salted scrypt hashes and accounts have an active flag. No password aging, lockout or alerting on failed attempts was found (from reading code, not verified). Account administration is out of scope (ADR-0004).
- **Accountability.** §11.10(j) requires written policies holding individuals "accountable and responsible for actions initiated under their electronic signatures".
  **For Benchline:** *Not in software.* This is an SOP the lab must write.

### 2.4 Access and authority

- **Access.** §11.10(d): "Limiting system access to authorized individuals" (enforced, per SA §III.A). §211.68(b) requires controls "to assure that changes in… records are instituted only by authorized personnel". DI Q4 (p.7) recommends restricting changes "by technical means where possible" and keeping "a list of authorized individuals".
  **For Benchline:** *Satisfies in part.* Sign-in and a 15-minute server-side idle timeout exist (from reading code, not verified). A list of authorized users with their privileges must be kept.
- **Authority checks.** §11.10(g) requires checks so "only authorized individuals can use the system, electronically sign a record… alter a record, or perform the operation at hand".
  **For Benchline:** *Satisfies.* `actsAs`/`requireRole` plus the bench-work bar on Approval (ADR-0003/0004/0005).
- **Independent system administrator.** DI Q4: "The system administrator role, including any rights to alter files and settings, should be assigned to personnel independent from those responsible for the record content."
  **For Benchline:** *Tension* (see §3.4). The Admin role is also an Analyst.
- **Shared logins.** DI Q5: shared credentials mean "a unique individual cannot be identified". Shared read-only accounts are acceptable for viewing, but not for "second person review".
  **For Benchline:** *Satisfies* by design (individual accounts). Seeded demo accounts must never reach production.
- **Device checks.** §11.10(h) calls for device checks "as appropriate".
  **For Benchline:** *Unknown.* Likely low relevance for a browser client.
- **Training.** §11.10(i). DI Q16 includes data-integrity training.
  **For Benchline:** *Procedural*, outside the software.

### 2.5 Sequencing

- **Operational checks.** §11.10(f): "operational system checks to enforce permitted sequencing of steps and events, as appropriate".
  **For Benchline:** *Satisfies* (from reading code, not verified). The status workflow requires Awaiting approval before Approval, blocks Approval while an OOS investigation is open, and locks approved Samples.
- **Contemporaneous recording.** §211.160(a): requirements "shall be documented at the time of performance. Any deviation from the written… test procedures… shall be recorded and justified." DI Q12 describes a LIMS that saves "automatically… after each entry", combined with a procedure to enter data "immediately when generated".
  **For Benchline:** *Partly.* Each entry is committed and audited when made. Under ADR-0002, however, the calculation happens off-system, and Benchline has no field for procedural deviations.

### 2.6 Retention

- **Retention period.** §211.180(a): batch-associated control records are retained "for at least 1 year after the expiration date of the batch" (or 3 years after distribution for certain exempt OTC products). §211.180(d) allows "original records or as true copies".
  **For Benchline:** *Unknown.* Sample expiry is captured, so a retention date can be computed. No deletion path was found, but no archive or backup was found either.
- **Backup.** §211.68(b): backup data must be "exact and complete" and "secure from alteration, inadvertent erasures, or loss". DI Q1.e says backup means "a true copy of the original record that is maintained securely throughout the record retention period", and "Temporary backup copies… would not satisfy" it.
  **For Benchline:** *Not found.* The SQLite database needs a validated backup and restore.
- **Protection for retrieval.** §11.10(c) (enforcement discretion, SA §III.C.5; the §211.180 predicate still applies).
  **For Benchline:** *Unknown.*

### 2.7 Laboratory records content (§211.194)

- **(a)** "complete data derived from all tests necessary to assure compliance with established specifications and standards".
  **For Benchline:** The record is the Sample and its Results *plus* worksheets and instrument data held elsewhere.
- **(a)(1)** Sample description with source, quantity, lot or code, date sampled and date received.
  **For Benchline:** *Unknown / partly.* Submission and Sample receipt data exist. Whether every element (especially date sampled) is captured was not checked.
- **(a)(2)** "A statement of each method used", indicating "the location of data that establish that the methods… meet proper standards of accuracy and reliability"; suitability "verified under actual conditions of use".
  **For Benchline:** *Partly.* Each Test records its Method and version. No reference to validation data or system suitability was found.
- **(a)(3)** Weight or measure of sample used.
  **For Benchline:** *Only in the worksheet attachment*, if it is there at all.
- **(a)(4)** "A complete record of all data secured in the course of each test, including all graphs, charts, and spectra from laboratory instrumentation".
  **For Benchline:** *Not in Benchline.* Only the sequence ID points to the chromatograms (see §3.2).
- **(a)(5)** "A record of all calculations… including units of measure, conversion factors, and equivalency factors."
  **For Benchline:** *Partly*, through the ADR-0002 worksheet (see §3.2).
- **(a)(6)** Results and "how the results compare with established standards".
  **For Benchline:** *Satisfies.* The Result, its Limit and the Conformity statement.
- **(a)(7)** "The initials or signature of the person who performs each test and the date(s) the tests were performed."
  **For Benchline:** *Partly.* The Analyst's "performed by" Electronic signature is dated at submission, and no field for the analysis date was found (from reading code, not verified).
- **(b)** Method modifications: complete records with reason and verification data.
  **For Benchline:** *Partly.* Methods are versioned, but no modification record was found.
- **(c)** Records of "testing and standardization of laboratory reference standards, reagents, and standard solutions".
  **For Benchline:** *Not in Benchline.*
- **(d)** Calibration records per §211.160(b)(4) ("Instruments… not meeting established specifications shall not be used").
  **For Benchline:** *Not in Benchline.* No instrument or calibration-status check exists at Result entry.
- **(e)** "Complete records… of all stability testing performed in accordance with § 211.166."
  **For Benchline:** *Partly.* Stability samples carry study, time point and condition. The §211.166 stability program itself belongs to the Client.
- **§211.165(a), (e).** Conformance determined before release; method "accuracy, sensitivity, specificity, and reproducibility… established and documented".
  **For Benchline:** *Partly.* LOD and LOQ are stored per Method, but the validation data live outside Benchline.

### 2.8 Second-person review

- **§211.194(a)(8)** requires "The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards." DI Q10 (p.9): "You must ensure that original laboratory records, including paper and electronic records, are subject to second-person review (§ 211.194(a)(8))". DI Q5 says that review must be attributable to an individual.
  **For Benchline:** *Partly* (see §3.1). Manager Approval is a signed second-person act. What it attests to covers the Result and the worksheet, not the chromatographic original records or the audit trail.

### 2.9 Data integrity practices

- **Invalidating results.** DI Q2 (p.6) requires "a valid, documented, scientifically sound justification", and "the full CGMP batch record… would include the original (invalidated) data, along with the investigation report".
  **For Benchline:** *Satisfies* (ADR-0006, CONTEXT "Invalidated result" stays on record).
- **Testing into compliance.** DI Q13 (p.11): "All data—including obvious errors and failing, passing, and suspect data—must be in the CGMP records"; testing "until the desired passing result is obtained" is prohibited.
  **For Benchline:** *Partly.* OOS Results cannot be corrected outside an investigation (ADR-0006). Trial or extra injections are only visible in the instrument's data, which Benchline does not see.
- **Reprocessing.** DI Q14: saving only final reprocessed results is not acceptable; "each result retained for review"; complete data includes "notebooks, worksheets, graphs, charts, spectra".
  **For Benchline:** *Not verifiable in Benchline.* This depends on the instrument's data system plus review.
- **Blank forms.** DI Q6: "blank forms (e.g., electronic worksheets…) should be controlled by the quality unit or by another document control method"; erroneous forms are kept with a justification.
  **For Benchline:** *Not addressed.* Worksheet templates are uncontrolled, and a superseded worksheet attachment must stay on record.
- **Dynamic vs static.** DI Q1.d: a spreadsheet that lets a user "modify formulas or entries… used to compute test results" is a *dynamic* record. DI Q10: a static printout "would not satisfy CGMP requirements to retain original records or true copies (§ 211.180(d))" when the original is dynamic.
  **For Benchline:** *Tension* (see §3.2).
- **Tips and falsification.** DI Q15 requires these to be investigated within the quality system.
  **For Benchline:** *Procedural.*

## 3. Tensions with existing ADRs

### 3.1 ADR-0003 (single Manager Approval) vs §211.194(a)(8)

§211.194(a)(8) requires a *second person* to sign that "the original records have been reviewed for accuracy, completeness, and compliance with established standards". It does not require a peer analyst, a separate step, or a particular role. DI Q7 also allows review by "a person directly supervising or checking information".

**A single Manager Approval can satisfy (a)(8)**, provided that:
- the approver is never the person who did the bench work (ADR-0003/0004/0005 enforce this); and
- the review actually covers the *original records*.

That second condition is the gap. The original records include the instrument data under (a)(4) and, per DI Q10, electronic originals. Per DI Q7, they include the audit trail "as they review the rest of the record". ADR-0003 and ADR-0002 describe the Manager checking the Result and worksheet attachment only. Nothing records that chromatograms, integration, the sequence audit trail or the Benchline audit trail were reviewed.

**Recommendation:** make the Approval's meaning or checklist explicitly attest to review of the raw data and audit trails (a candidate ADR amendment).

A second, smaller point concerns an Amendment's corrected Result. It gets a new Approval, so (a)(8) is met again, but only if the same scope of review applies.

### 3.2 ADR-0002 (manual calculation, attached worksheet) vs §211.194(a)(4)/(5) and DI original records

- **(a)(5) calculations.** The attachment can satisfy it only if the worksheet shows units, conversion factors and the Maximum daily dose used. The attachment is immutable and SHA-256 hashed (from reading code, not verified).
- **Static vs dynamic.** If the analyst's original is a spreadsheet with formulas, it is a *dynamic* record (DI Q1.d). A PDF or image attachment would then not be the original or a true copy (DI Q9, Q10; §211.180(d)). Either the native file must be attached and kept readable, or the lab must fix the worksheet as a controlled, validated template (DI Q6; §211.68(b) requires "a written record of the program… along with appropriate validation data" where calculations are computerized).
- **(a)(4) all instrument data.** The attachment does not satisfy it. Benchline holds only `instrumentReading` and `sequenceId`. The chromatograms are dynamic (DI Q10, Q14) and must be retained in the instrument data system with its audit trail, and must be reviewed. Benchline's laboratory record is therefore *hybrid* (SA §III.C.5, footnote 8), and the SOP must say where each part of the complete record lives.
- **Contemporaneous recording.** The calculation happens outside the system (§211.160(a); DI Q12). A worksheet that is replaced before upload leaves no trace. ADR-0002 acknowledges this ("the system cannot re-derive a Result").

### 3.3 Audit trail review expectations vs ADR-0001

ADR-0001 builds the trail but sets no review step. DI Q8 ties the frequency to data review, which means at Approval. There is no recorded evidence that it happened.

The lab-wide changes to Acceptable intake, attachments and access are not Sample-specific and need a documented periodic review (DI Q8, risk-based).

### 3.4 ADR-0004 (Admin in every role) vs DI Q4

DI Q4 recommends that the system administrator, "including any rights to alter files and settings", be "independent from those responsible for the record content". ADR-0004's Admin is a record-content role (Analyst) and not a system administrator (account administration is out of scope). The tension becomes real if account, Method, Limit or configuration rights are ever given to Admin. It also exists today if the Admin can reach the SQLite file or the server (unknown). This is nonbinding guidance, but a small lab would need a documented justification.

### 3.5 Signature and access controls not yet covered by any ADR

§11.300(b)–(d) (password aging, deauthorization, detecting and reporting failed attempts) and §11.100(c) (the certification letter to FDA) are enforced under SA §III.A and are not addressed by any ADR.

## 4. Developer checklist

1. Never UPDATE or DELETE an audit entry, attachment, Certificate version, publication or signature. Make corrections as new entries carrying a reason. (§11.10(e); DI Q12)
2. Add an immutability trigger to `signatures` to match the other record tables, and test that UPDATE and DELETE abort. (§11.70; §11.10(e))
3. Every command that creates or changes a Sample, Result, investigation, Certificate or reference data writes at least one audit entry with actor, server time, old value and new value, in the same transaction. (§11.10(e); DI Q1.c)
4. Take time stamps from the server clock in UTC, never from the client, and keep the UTC reference documented. (§11.10(e); SA footnote 5)
5. Every signing command re-verifies the signer's own password. Never cache a signature or sign on behalf of another account. (§11.200(a)(1)–(2); §11.100(a))
6. Every human-readable view or printout of a signed record shows printed name, date and time, and meaning. (§11.50(a)–(b))
7. Store each signature bound to a hash of exactly what was signed, and fail verification if the record changes. (§11.70)
8. Route every permission decision through `actsAs`/`requireRole`, and add a refusal test for each role that must not act. (§11.10(g); §211.68(b))
9. Keep the bar that nobody gives Approval to a Sample on which they did bench work, including under an Amendment and for an Admin. (§211.194(a)(8); ADR-0003/0005)
10. Enforce the workflow order in the core, not only in the UI: no Approval before submission or while an OOS investigation is open, and no edits after Approval except through an Amendment. (§11.10(f))
11. Never let a Result be deleted or overwritten. Invalidated results stay visible with cause and investigation. (DI Q2, Q13)
12. Require an attachment for every Result and never allow it to be replaced silently. A new worksheet is a new attachment, audited with a reason, and the old one stays. (§211.194(a)(5); DI Q6)
13. Never persist or log a password or its plaintext; store only salted hashes. Audit failed sign-in and signature attempts. (§11.300(d); DI Q1.c)
14. Record the Method version, instrument reading and sequence ID on every Result so it traces to the raw data held outside Benchline. (§211.194(a)(2), (a)(4); DI Q1.b)
15. Give the Approval screen the Sample's audit trail and attachments, and record in the Approval that they were reviewed. (§211.194(a)(8); DI Q7, Q8)
16. Any export or copy of a record must include its audit trail, signatures and attachment metadata in both human-readable and electronic form. (§11.10(b); §211.180(c); DI Q9)
17. Never add a shared or generic account, and never ship seeded demo credentials to production. (DI Q5; §11.100(a); §11.300(a))
18. Treat every change to Benchline as requiring change control and revalidation of the affected workflow before release. (§11.10(a), (k)(2); DI Q3)
