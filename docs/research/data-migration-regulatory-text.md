# What shape do regulatory sources say a data migration record has?

**Asked by:** Orchestrator (Benchline wayfinder map research task)
**Date:** 2026-09-11
**Status of sources:** All five source categories below were retrieved live during this session (PDF/HTML fetched directly, not reconstructed from memory or a secondary write-up). Version/currency is stated per source. The draft revised EU GMP Annex 11 (July 2025 consultation) was retrieved as the actual consultation PDF, distinct from the in-force 2011 Annex 11, and the two are not blended below.

---

## 1. EU GMP Annex 11 (Computerised Systems)

### 1a. In-force version — Revision 1, deadline for coming into operation 30 June 2011

Retrieved live from: https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf (5 pages, European Commission Health and Consumers Directorate-General, document header "SANCO/C8/AM/sl/ares(2010)1064599", "Status of the document: revision 1").

**§4.8 (Validation — data transfer/migration):**
> "If data are transferred to another data format or system, validation should include checks that data are not altered in value and/or meaning during this migration process."

**§4.1–4.2 (validation documentation and change control), quoted in full:**
> "4.1 The validation documentation and reports should cover the relevant steps of the life cycle. Manufacturers should be able to justify their standards, protocols, acceptance criteria, procedures and records based on their risk assessment.
> 4.2 Validation documentation should include change control records (if applicable) and reports on any deviations observed during the validation process."

**§7 Data Storage, quoted in full:**
> "7.1 Data should be secured by both physical and electronic means against damage. Stored data should be checked for accessibility, readability and accuracy. Access to data should be ensured throughout the retention period.
> 7.2 Regular back-ups of all relevant data should be done. Integrity and accuracy of back-up data and the ability to restore the data should be checked during validation and monitored periodically."

**§9 Audit Trails, quoted in full:**
> "Consideration should be given, based on a risk assessment, to building into the system the creation of a record of all GMP-relevant changes and deletions (a system generated "audit trail"). For change or deletion of GMP-relevant data the reason should be documented. Audit trails need to be available and convertible to a generally intelligible form and regularly reviewed."

**§16 Business Continuity, quoted in full:**
> "For the availability of computerised systems supporting critical processes, provisions should be made to ensure continuity of support for those processes in the event of a system breakdown (e.g. a manual or alternative system). The time required to bring the alternative arrangements into use should be based on risk and appropriate for a particular system and the business process it supports. These arrangements should be adequately documented and tested."

**§17 Archiving, quoted in full:**
> "Data may be archived. This data should be checked for accessibility, readability and integrity. If relevant changes are to be made to the system (e.g. computer equipment or programs), then the ability to retrieve the data should be ensured and tested."

The 2011 text has no dedicated "migration" section; §4.8 is the sole clause naming migration explicitly, framed entirely as a validation checkpoint (no alteration of value/meaning), not as a record-keeping requirement in its own right.

### 1b. Draft revision — released for consultation 7 July 2025 (consultation closed 7 October 2025 per public sources; not yet final; final publication and implementation dates were not part of the document text itself)

Retrieved live from: https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en?filename=mp_vol4_chap4_annex11_consultation_guideline_en.pdf (19 pages). This is a **draft**, not the in-force text — it is quoted here separately and should not be read as current authority.

The draft restructures the annex into 17 numbered chapters (vs. 17 unstructured clauses in 2011) and, unlike the 2011 version, contains a section titled "10. Handling of Data" with sub-clauses on transfer, migration, and encryption, plus separate chapters "16. Backup" and "17. Archiving":

**Draft §10.2 Data transfer:**
> "Where a routine work process requires that critical data be transferred from one system to another (e.g. from a laboratory instrument to a LIMS system), this should, where possible, be based on validated interfaces rather than on manual transcriptions. If critical data is transcribed manually, effective measures should be in place to ensure that this does not introduce any risk to data integrity."

**Draft §10.3 Data migration (verbatim, full clause):**
> "Where an ad hoc process requires that critical data or a whole database be migrated from one system to another (e.g. when moving data from a retired to a new system), this should be based on a validated process. Among other things, it should consider the constraints on the sending and receiving side."

**Draft §15.11 Validation and migration (in the Security chapter, re: platform end-of-life):**
> "Validation of applications on updated operating systems and platforms and migration of data should be planned and completed in due time prior to the expiry of the vendor's support."

**Draft §16 Backup (verbatim, full chapter):**
> "16.1. Regular backup. Data and metadata should be regularly backed up following established procedures to prevent the loss of data in case of accidental or deliberate change or deletion, loss as the result of a malfunction or corruption, e.g. as the result of a cyber-attack.
> 16.2. Frequency and retention. The frequency, retention period and storage of backups is critically important to the effectiveness of the process to mitigate the loss of data. Backups should be made at suitable intervals (e.g. hourly, daily, weekly and monthly) and their retention determined through a risk-based approach (e.g. correspondingly a week, a month, a quarter, and years).
> 16.3. Physical separation. Backups should be physically separated from the server or computer holding the original data and stored at a safe distance from this, to prevent that both would be impacted by the same incident.
> 16.4. Logical separation. Backups should not be stored at the same logical network as the original data to avoid simultaneous destruction or alteration.
> 16.5. Scope. Depending on the criticality and urgency for recovery after an incident, applications and system configurations may also need to be backed up.
> 16.6. Restore test. Restore of data from backup should be tested and documented based on risk during system validation and after changes are made to the backup or restore processes and tools. Restore tests should be documented and include a verification that data is accessible on the system."

**Draft §17 Archiving, relevant clauses (verbatim):**
> "17.1. Read only. After completion of a process, e.g. release of a product, GMP data and metadata (incl. audit trails) should be protected from deletion and changes throughout the retention period. This may be by changing its status to read-only in the system where the data was generated or captured, or by moving it to a dedicated archival system via a validated interface.
> 17.2. Verification. When moving GMP data and metadata from one location to another in a system, or to a dedicated archival system, the integrity of the data should be verified by a high degree of certainty before any data is deleted, e.g. by means of a checksum. Where this is not possible, the completeness and integrity of the data should be verified manually. However, this verification does not alter the need for a validation of the archival and retrieval process, and of the systems and interfaces involved.
> 17.3. Backup. If data is archived on a server (disk), it should be regularly backed up following the same procedures as for live data (see 16 Backup). As for other backups, these should be physically and logically separated from the archived data.
> 17.4. Durability. If data is archived long-term on volatile storage media with limited durability (e.g. CD), this should follow a validated process. It should ensure that data is stored only for a verified duration according to vendor recommendations, and if necessary, transferred to new media in secure manner (see 16 Backup)."

**Draft glossary — "Migration" (verbatim, full entry):**
> "Data migration is the activity of e.g. transporting electronic data from one computer system to another, transferring data between storage media or simply the transition of data from one state to another [e.g. conversion of data to a different format]. The term "data" refers to "raw data" as well as "metadata"."

**Difference from the 2011 version:** The 2011 text mentions migration only once (§4.8, a validation checkpoint that data are "not altered in value and/or meaning"). The draft names migration in three separate places (§10.3 as a standalone requirement to base migration on "a validated process" that considers "constraints on the sending and receiving side"; §15.11 tying migration to platform end-of-life timing; and a formal glossary definition distinguishing migration from transfer). The draft also adds an explicit "Restore test" clause (§16.6) requiring that restore be *tested and documented*, which has no equivalent in the 2011 text (2011 §7.2 says only that "the ability to restore the data should be checked during validation and monitored periodically" — testing is implied but not the word "documented" tied to each restore test). This is a difference in text; this scout draws no conclusion about what, if anything, that difference should mean for a project on which validation is deferred.

---

## 2. PIC/S PI 041-1, "Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments," 1 July 2021 (final)

Retrieved live from https://picscheme.org/docview/4234 (63-page PDF, header on each page reads "PI 041-1 ... 1 July 2021"). This is the final, in-force version (not a draft).

**§9.4 "Data Transfer," item "Data transfer and migration," Expectation 2 (verbatim):**
> "Where system software (including operating system) is installed or updated, the user should ensure that existing and archived data can be read by the new software. Where necessary this may require conversion of existing archived data to the new format.
> Where conversion to the new data format of the new software is not possible, the old software should be maintained, e.g. installed in one computer or other technical solution, and also available as a backup media in order to have the opportunity to read the archived data in case of an investigation."

Under the "Potential risk of not meeting expectations" bullet list for that same item (verbatim):
> "The migration of data from one system to another should be performed in a controlled manner, in accordance with documented protocols, and should include appropriate verification of the complete migration of data."

**§9.4, Expectation 3 (verbatim, on legacy/migrated file formats):**
> "Migration to an alternative file format that retains as much as possible of the 'true copy' attributes of the data may be necessary with increasing age of the legacy data.
> Where migration with full original data functionality is not technically possible, options should be assessed based on risk and the importance of the data over time. The migration file format should be selected considering the balance of risk between long-term accessibility versus the possibility of reduced dynamic data functionality (e.g. data interrogation, trending, re-processing, etc.)"

**§9.9 "Storage, archival and disposal of electronic data," Expectation 3, on restoration being tested (verbatim):**
> "There should be in place a procedure for restoring archived data in case an investigation is needed. The procedure in place for restoring archived data should be regularly tested."

**§9.9, Expectation 1, on backup controls generally (verbatim, selected):**
> "If the data is backed up, or copies of it are made, then the backup and copies should also have the same appropriate levels of controls so as to prohibit unauthorised access to, changes to and deletion of data or their alteration... Systems should allow backup and restoration of all data, including meta-data and audit trails."

**Glossary — Archiving vs. Back-up, quoted in full (these are presented as two distinct defined terms):**
> "Archiving: Long term, permanent retention of completed data and relevant metadata in its final form for the purposes of reconstruction of the process or activity."
>
> "Back-up: A copy of current (editable) data, metadata and system configuration settings (e.g. variable settings which relate to an analytical run) maintained for the purpose of disaster recovery."

PIC/S PI 041-1 treats these as distinct concepts by definition: back-up exists for disaster recovery of *current, editable* data; archiving is the *final, permanent* record for reconstruction purposes. Both concepts are quoted; the document does not merge them.

---

## 3. FDA, "Data Integrity and Compliance With Drug CGMP: Questions and Answers," December 2018 (final guidance)

Retrieved live from https://www.fda.gov/media/119267/download. Document title page confirms "December 2018," Center for Drug Evaluation and Research (CDER)/CBER/CVM — this is the **final** version, not the earlier superseded draft.

**Q&A e, "How does FDA use the term 'backup' in § 211.68(b)?" (verbatim, full answer):**
> "FDA uses the term backup in § 211.68(b) to refer to a true copy of the original record that is maintained securely throughout the record retention period (e.g., § 211.180). Backup data must be exact, complete, and secure from alteration, inadvertent erasures, or loss (§ 211.68(b)). The backup file should contain the data (which includes associated metadata) and should be in the original format or in a format compatible with the original format.
> FDA's use of the term backup is consistent with the term archive as used in guidance for industry and FDA staff General Principles of Software Validation.
> Temporary backup copies (e.g., in case of a computer crash or other interruption) would not satisfy the requirement in § 211.68(b) to maintain a backup file of data."

**Q&A 9, "Can electronic copies be used as accurate reproductions of paper or electronic records?" (verbatim):**
> "Yes. Electronic copies can be used as true copies of paper or electronic records, provided the copies preserve the content and meaning of the original record, which includes all metadata required to reconstruct the CGMP activity and the static or dynamic nature of the original records.
> True copies of dynamic electronic records may be made and maintained in the format of the original records or in a format that allows for the content and meaning of the original records to be preserved if a suitable reader and copying equipment (e.g., software and hardware, including media readers) are readily available (§§ 211.180(d) and 212.110)."

**Note on migration:** The word "migration" does not appear in this document. A text search of the full guidance for "migrat" returned no results. **This guidance says nothing directly about data migration between systems.** Its statements on "backup," "true copy," and retaining original records (quoted above) are the closest applicable material, but they are framed around record retention and reproduction generally, not around the act of moving records from one schema or system to another.

---

## 4. 21 CFR §211.180 and §211.68(b)

Retrieved live via the eCFR versioner API (https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211), current as of the eCFR's own "up_to_date_as_of: 2026-09-09" marker, latest amendment to Title 21 dated 2026-09-08 per the eCFR titles index. Canonical browse URL: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211.

**§211.68(b), quoted in full:**
> "Appropriate controls shall be exercised over computer or related systems to assure that changes in master production and control records or other records are instituted only by authorized personnel. Input to and output from the computer or related system of formulas or other records or data shall be checked for accuracy. The degree and frequency of input/output verification shall be based on the complexity and reliability of the computer or related system. A backup file of data entered into the computer or related system shall be maintained except where certain data, such as calculations performed in connection with laboratory analysis, are eliminated by computerization or other automated processes. In such instances a written record of the program shall be maintained along with appropriate validation data. Hard copy or alternative systems, such as duplicates, tapes, or microfilm, designed to assure that backup data are exact and complete and that it is secure from alteration, inadvertent erasures, or loss shall be maintained."
> [43 FR 45077, Sept. 29, 1978, as amended at 60 FR 4091, Jan. 20, 1995; 73 FR 51932, Sept. 8, 2008]

**§211.180(d), quoted in full:**
> "Records required under this part may be retained either as original records or as true copies such as photocopies, microfilm, microfiche, or other accurate reproductions of the original records. Where reduction techniques, such as microfilming, are used, suitable reader and photocopying equipment shall be readily available."
> [43 FR 45077, Sept. 29, 1978, as amended at 60 FR 4091, Jan. 20, 1995]

§211.180 and §211.68 do not use the word "migration"; they speak in terms of "backup," "true copies," and "accurate reproductions."

---

## 5. 21 CFR Part 11, §11.10 (Controls for closed systems)

Retrieved live via the eCFR versioner API (https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11), same currency marker as above. Canonical browse URL: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11.

**§11.10(a), (b), (c), (e), quoted in full (the introductory sentence to the whole list is included for context):**
> "Persons who use closed systems to create, modify, maintain, or transmit electronic records shall employ procedures and controls designed to ensure the authenticity, integrity, and, when appropriate, the confidentiality of electronic records, and to ensure that the signer cannot readily repudiate the signed record as not genuine. Such procedures and controls shall include the following:
> (a) Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records.
> (b) The ability to generate accurate and complete copies of records in both human readable and electronic form suitable for inspection, review, and copying by the agency. Persons should contact the agency if there are any questions regarding the ability of the agency to perform such review and copying of the electronic records.
> (c) Protection of records to enable their accurate and ready retrieval throughout the records retention period.
> ...
> (e) Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. Record changes shall not obscure previously recorded information. Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying."

Part 11 §11.10 likewise does not use the word "migration"; its relevant hooks for a migration record are the general validation clause (a), the accurate-and-complete-copies clause (b), the retrievability clause (c), and the audit-trail-non-obscuring clause (e).

---

## What I could not establish

- **No source defines a "migration record" as a distinct document type with prescribed contents.** None of the five sources (2011 Annex 11, the Annex 11 draft, PIC/S PI 041-1, the FDA Q&A guidance, or 21 CFR Parts 11/211) specifies required fields, a required report format, or a required approval chain for a migration record as such. What each source specifies instead are *properties the migrated data/record must retain* (value/meaning unaltered, true-copy status, completeness, accessibility, retrievability, audit-trail continuity) and, in PIC/S and the Annex 11 draft only, a requirement that the migration *process* be "controlled," "documented," and "verified" — without further specifying what that documentation must contain.
- **The FDA December 2018 guidance is silent on migration** as a term and as a concept; I did not find text addressing it directly, only adjacent text on backup and true copies. I state this as an absence, not as a favorable or unfavorable finding.
- **The in-force (2011) Annex 11 has no separate migration record requirement** — its single migration-related clause (§4.8) is a validation checkpoint, not a record-keeping clause. Any expectation about the *shape* of a migration record in EU GMP terms currently rests on inference from §4.1–4.2 (validation documentation, change control) and §7 (storage/backup), not on explicit text about migration itself.
- **The draft revised Annex 11 is not in force** and its final wording, adoption date, and implementation timeline were not settled at the time of this research (public secondary sources describe a consultation that closed 7 October 2025 and cite an expected mid-2026 final publication and Q1 2027 implementation estimate, but those secondary reports were not verified against a primary EC announcement of a final adoption date, because no final version exists yet to check against). I did not treat those secondary-source dates as confirmed; I report them only as what public reporting says about timeline, distinct from the verbatim draft text above, which was fetched directly from the European Commission's own consultation page.
- **None of the sources specifies who must approve a migration** (e.g., a named quality role) or what retention period applies to the migration record itself, as opposed to the underlying data. Retention periods in the sources (e.g., §211.180(a)/(b)) attach to production/control/distribution records, not explicitly to records-of-a-migration-event.

---

## Sources

1. EU GMP Annex 11: Computerised Systems (in-force, Revision 1, deadline for coming into operation 30 June 2011). https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf — fetched and read in full (5 pages).
2. EU GMP Annex 11: Computerised Systems (draft revision, consultation released 7 July 2025). https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en?filename=mp_vol4_chap4_annex11_consultation_guideline_en.pdf — fetched and read in full (19 pages). **Draft, not in force.**
3. PIC/S PI 041-1, "Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments," 1 July 2021 (final). https://picscheme.org/docview/4234 — fetched and read in full (63 pages).
4. FDA, "Data Integrity and Compliance With Drug CGMP: Questions and Answers," Guidance for Industry, December 2018 (final; supersedes earlier draft). https://www.fda.gov/media/119267/download — fetched and read in full.
5. 21 CFR §211.68(b) and §211.180(d). eCFR, Title 21, Part 211 — fetched live via eCFR versioner API, up-to-date-as-of marker 2026-09-09 (latest Title 21 amendment 2026-09-08). Canonical view: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211
6. 21 CFR §11.10(a)-(e). eCFR, Title 21, Part 11 — fetched live via eCFR versioner API, same currency marker as above. Canonical view: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
