# Does any primary regulatory source impose an obligation to record that a report/Certificate of Analysis was transmitted to a client (to whom, when) — and is there LIMS precedent for a client/recipient identity and a report-delivery log as entities distinct from the report content?

**Asked by:** Ticket #45 ("Does Benchline deliver the Certificate, or only produce it?")
**Date:** 2026-09-11
**Status of sources:**
- eCFR Part 211 and Part 11 fetched today (2026-09-11) via the eCFR versioner API for the issue date `2026-09-10` (the most recent issue date the API would serve), full section text parsed directly from the returned XML — not a rendering, summary, or cached secondary copy.
- FDA's Data Integrity guidance was fetched from `https://www.fda.gov/media/119267/download` and confirmed by its own title page to be the December 2018 final "Data Integrity and Compliance With Drug CGMP — Questions and Answers" guidance — the version this project's sourcing rule requires, not the superseded draft.
- ISO/IEC 17025:2017 itself is paywalled (`https://www.iso.org/standard/66912.html`) and was not purchased or reproduced. Findings on clause 7.8 are from the same two independent guidance-tier sources already vetted and dated in this repo's prior scouting pass (`docs/research/iso17025-report-amendment-clause.md`, read first for method): European Accreditation's public FAQ series, and NIST Office of Weights and Measures' February 2018 crosswalk (confirmed dated for the 2017 edition of the standard, not the withdrawn NIST HB 150-2020). I fetched the crosswalk PDF fresh and extracted its full text for this pass rather than relying on the prior pass's paraphrase.
- ICH Q7 §11.4 findings are taken from this repo's already-completed reading of the FDA-hosted PDF (`docs/research/coa-content-requirements.md`, finding 1) — not re-fetched, since that document already quotes clauses 11.40–11.44 verbatim from the primary FDA-hosted PDF and I have no reason to re-derive it.
- OpenELIS Global was read from an existing shallow clone at `/private/tmp/openelis_scout/OpenELIS-Global-2`, branch `develop`, commit `b27664ea09c0fdacaf141c4afcc6492f0b099f13` (commit timestamp 2026-09-12 00:09:25 +0300; this is the same commit the prior scouting pass in `docs/research/delivery-level-receipt-facts-lims-precedent.md` used, so it is the same live-tip snapshot, not independently re-cloned). No tags are available in a shallow clone, so no release number can be cited.
- SENAITE's `SendLog` field (`ResultsReport.SendLog`, subfields `actor`, `actor_fullname`, `email_send_date`, `email_recipients`, `email_responsibles`, `email_subject`, `email_body`, `email_attachments`) was **not re-derived**; it is taken as given per the task instruction, already documented at `docs/research/open-lims-module-scope-inventory.md:139`.
- LabKey's specimen module and Baobab LIMS were not reached, consistent with the prior scouting pass — not substituted with secondary sources.

## Findings — Part A: regulatory basis for recording transmission of a report/CoA to a client

### 1. 21 CFR Part 211 — zero occurrences

Fetched the full text of §211.194 (Laboratory records), §211.180 (General requirements), and §211.68 (Automatic, mechanical, and electronic equipment) directly from eCFR's versioner API (issue date 2026-09-10, the current version).

- **§211.194** requires laboratory records to include sample description/source, test method, weight/measure used, raw data, calculations, results-vs-specification comparisons, tester's and reviewer's initials/signatures, and records of method modifications, reference-standard testing, instrument calibration, and stability testing. **It contains no reference to distributing, sending, or transmitting a report or Certificate of Analysis to anyone outside the firm, and no field for recipient identity or transmission date.**
- **§211.180** sets retention periods and inspection-availability requirements for "production, control, or distribution" records, and requires periodic quality review and internal notification of investigations/recalls/inspection findings to responsible officials. **It says nothing about recording who a report was sent to or when.**
- **§211.68** governs computer/electronic system controls (calibration, backup, input/output verification). **No transmission-to-recipient content.**
- A full-text scan of Part 211 for "certificate" returns **exactly one occurrence**, in §211.84(d)(3), referring to a supplier's "certificate of testing" for containers/closures accepted in lieu of the manufacturer's own testing — unrelated to CoA transmission to a client.
- A full-text scan for "recipient," "customer," and "transmit" returns **zero occurrences** anywhere in Part 211.
- **§211.196 (Distribution records)**, found via a scan for "distribut," is the section that most resembles the question on its face but is not on point: it requires records of "the name and strength of the product and description of the dosage form, name and address of the consignee, date and quantity shipped, and lot or control number of the drug product." This is a record of the physical **drug product** shipment (to a distributor/consignee), not a record of a **report or Certificate of Analysis** being sent to a client. It is reported here explicitly to distinguish it from what the question asks, not as a hit.

**Conclusion for Part 211: no occurrence found that imposes an obligation to record that a report/CoA was transmitted to a client, to whom, or when.**

### 2. 21 CFR Part 11 — zero occurrences

Full text fetched from eCFR's versioner API (same issue date). A scan for "certificate," "recipient," "customer," "sent to," and "send" returns **zero occurrences** in Part 11. "Transmit" occurs four times and "distribut(ed/ion)" twice; every occurrence is about the creation, modification, maintenance, or transmission of **electronic records within a firm's closed or open computer system** (§11.1(b), §11.10, §11.30, the definition of "electronic record" in §11.3, and §11.10(k)(1) on controlling distribution of *systems documentation*, not of issued reports). None addresses a report or certificate leaving the firm to a client, or names a recipient/date-sent as a required record.

**Conclusion for Part 11: no occurrence found on point.**

### 3. ICH Q7 §11.4 — addresses content and forward chain-of-custody, not a transmission log

Per this repo's prior reading of the primary FDA-hosted text (`docs/research/coa-content-requirements.md`, finding 1, clauses 11.40–11.44 quoted verbatim there): §11.4 requires that a CoA be issued "for each batch ... on request" and specifies what information the certificate itself must contain (product identity, batch number, release/expiry/retest date, tests performed with results, dated signature of quality-unit personnel, manufacturer's name/address/phone). Clauses 11.43–11.44 require a certificate to *name* the manufacturer, repacker, or reprocessor and reference an original manufacturer's certificate when one is being repackaged/relabelled forward through a supply chain — this is an identity-of-the-issuer requirement on the document itself, not a log of the act of sending it to a specific client, and it does not require recording a recipient or a transmission date. No clause in §11.4 (or elsewhere in Q7, per that prior pass) uses "transmit," "send," "deliver," or "recipient." Q7 also does not apply to finished dosage-form products (it governs APIs/intermediates); this is a scope note, not a finding about content.

**Conclusion for ICH Q7 §11.4: it requires the certificate to identify who issued it, but imposes no requirement to record that it was sent to a client, to whom, or when.**

### 4. FDA Data Integrity guidance (December 2018, final) — zero occurrences

Fetched and confirmed as the December 2018 final version (title page reads "December 2018," not the superseded draft). A full-text scan of the extracted PDF text for "certificate of analysis," "recipient," "transmit," "distribut," and "send"/"sent to" returns **zero occurrences of every one of these terms**. The guidance's Q&A format addresses topics such as audit trails, data review, shared logins, and computer system access controls — it does not address, in either direction, the transmission of an issued report or certificate to a customer.

**Conclusion: no occurrence found on point.**

### 5. ISO/IEC 17025:2017 clause 7.8 (Reporting of results) — no distribution/recipient-logging clause identified in the guidance-tier sources reached

Two independent guidance-tier sources were used, consistent with this repo's established method for this paywalled standard (`docs/research/iso17025-report-amendment-clause.md`):

- The NIST Office of Weights and Measures crosswalk (February 2018, mapping the 2005 edition's clauses onto the 2017 edition's 7.8.x structure) was fetched fresh and its full text extracted. Its entries for 7.8.1 through 7.8.8 cover: review/authorization before issue (7.8.1.1); accurate/clear/unambiguous/objective reporting (7.8.1.2); core report content — title, lab name/address, unique identification, customer name/contact, method ID, item description, receipt/sampling/calibration/issue dates, results, statement restricting results to items tested, identification of the person authorizing the certificate (7.8.2.1); customer-supplied-information handling (7.8.2.2); test-report and calibration-certificate specific content (7.8.3, 7.8.4); decision rules (7.8.6); opinions and interpretations, with an explicit note to "record verbal communication to customer" for that specific sub-topic (7.8.7); and amendment mechanics (7.8.8, already the subject of `docs/research/iso17025-report-amendment-clause.md`). **None of these line items, as summarized in this crosswalk, describes a requirement to record that the finished report was sent/transmitted/delivered to the customer, or to whom, or when.** The one place the crosswalk mentions "record[ing]... to customer" is specific to verbal communication of an opinion or interpretation (7.8.7), a narrower and different topic than logging delivery of the report itself.
- A European Accreditation FAQ on clause 7.8 generally (FAQ 45.1) was also checked; it quotes only that "Clause 7.8.2.1 of EN ISO/IEC 17025:2017 requires reports to contain information to minimize any possibility of misunderstanding or misuse of results" — again a content requirement, with no clause text found addressing delivery tracking.
- A general web search for ISO/IEC 17025 clause text on report "sent," "delivered," or "issued to" a customer surfaced only secondary commentary repeating the same 7.8.2.1 content list (title, lab ID, unique report number, customer information, method reference, item description, dates, results, signatures, amendment provisions) — no source located in this pass cites a clause requiring a record of the act of sending the report.

**This is reported as a negative found through guidance-tier sources, not as a verified reading of the standard's full text** (17025 itself was not purchased). It is possible language on this point exists in clause 7.8 and was not captured by the two crosswalk/FAQ sources used; see "What I could not establish."

## Findings — Part B: LIMS precedent for client/recipient identity and a delivery-log entity

### 1. OpenELIS Global — client/organization/contact modeled as entities distinct from the sample's client reference: yes

Read directly from source (`.java` value-holder classes and Hibernate mappings), not documentation:

- `Organization` (`src/main/java/org/openelisglobal/organization/valueholder/Organization.java`, table backed by `Organization.hbm.xml`) is its own entity — name, address fields (`streetAddress`, `city`, `state`, `zipCode`), `phone`, `fax`, `email`, `internetAddress`, a CLIA number, and a set of `OrganizationType`s. This is the entity that models "the client" (a submitting/referring organization), separate from any individual `Sample` row.
- `SampleOrganization` (`src/main/java/org/openelisglobal/sampleorganization/valueholder/SampleOrganization.java`) is a **distinct join entity** linking a `Sample` to an `Organization` with a `sampleOrganizationType` — i.e., the sample's reference to its client/organization is itself a separate row, not an inline field on `Sample`, and the same `Organization` can be the referenced client/organization for many samples via many `SampleOrganization` rows.
- `OrganizationContact` (`src/main/java/org/openelisglobal/organization/valueholder/OrganizationContact.java`) is a further distinct entity — an `organizationId` foreign key plus a `Person` reference and a `position` string — modeling an individual contact person **at** an organization, separate from the organization record itself and separate from the sample.
- `OrganizationAddress` (`src/main/java/org/openelisglobal/address/valueholder/OrganizationAddress.java`) is yet another distinct entity, a typed key/value address-part row keyed to an organization ID (composite PK of organization ID + address-part ID), allowing more than one typed address per organization.

**This directly answers the first sub-question**: OpenELIS models client/organization, a contact at that organization, and an address for that organization as separate persisted entities, not as fields on the sample. This is a stronger separation than SENAITE's `SendLog.email_recipients`, which is a field on the report content object itself, not a reference to any client/contact/organization entity at all.

### 2. OpenELIS Global — a report-delivery/send-log entity distinct from report content: a close analogue exists (`NotificationLog`), but it is not wired to Certificate/report delivery specifically

Read directly from source:

- `NotificationLog` (`src/main/java/org/openelisglobal/notification/valueholder/NotificationLog.java`, JPA `@Entity`, table `notification_log`) is a genuinely distinct persisted entity recording **one row per notification fire-instance per recipient**. Its own file-header comment states: "One row per notification fire-instance per recipient — backs the Sent Messages admin tab." Fields present: `eventCode`, `firedAt` (timestamp), `triggeredByUserId` (the actor), `recipientType` (an enum), `recipientDisplayName`, `recipientEmail`, `recipientPhone`, `referenceAccession` and `referenceWorkflow` (linking back to the triggering lab object), `renderedSubject`/`renderedMessage` (the literal bytes sent — not just a pointer to a template), `overallStatus` (SENT/FAILED), and a `resentFromId` self-reference forming a linked-list for resend chains.
- A child entity, `NotificationLogChannel` (`@Embeddable`, table `notification_log_channel`), records **per-channel outcome**: `channel` (an enum — currently `EMAIL`, `WHATSAPP`), `status` (SUCCESS/FAILED), `errorMessage`, `attempts`, and `lastAttemptedAt`.
- Together, `NotificationLog` + `NotificationLogChannel` satisfy the shape the question asks about — **actor, timestamp, recipient, and channel for an act of sending, persisted separately from the content/report itself** — more explicitly than SENAITE's `SendLog` field, because it is a first-class entity with its own table, ID, and DAO/service layer (`NotificationLogDAO`, `NotificationLogService`), rather than a records-field on the report content object.
- **However, this mechanism is not, on the evidence read, specific to Certificate/report delivery to a client.** The only two seeded event codes found in the Liquibase changelogs are `REFERRAL_OUT` (`src/main/resources/liquibase/3.5.x.x/043-notification-trigger-config.xml`, referral-out notification, defaulted `enabled=false`) and `SAMPLE_RESAMPLED` (`050-resample-notification-trigger.xml`) — both lab-workflow events (specimen referred to another lab; a sample re-collected), not "a results report or Certificate of Analysis was issued/sent to a client." The `NotificationRecipientType` enum (`ORDERING_PROVIDER`, `SUBMITTING_USER`, `COC_CONTACT`) likewise reflects clinical/chain-of-custody referral roles, not a "client" or "customer" recipient type. `NotificationChannel` currently supports only `EMAIL` and `WHATSAPP` — no generic "handed to a courier" or "printed and mailed" channel value was found.
- I did not find, in the files reached, any event code, trigger config, or code path that fires a `NotificationLog` row when a results report or CoA-equivalent artifact is issued or transmitted. **The entity shape exists and is real, persisted, actor/timestamp/recipient/channel-bearing infrastructure; its current wiring, on the evidence read, is to referral and resample notifications, not to report/CoA delivery.**

### 3. SENAITE — `SendLog`, as already established, is a field, not a separate entity

Per the task's given fact (`docs/research/open-lims-module-scope-inventory.md:139`), SENAITE's `ResultsReport.SendLog` is a `RecordsField` on the report content object itself, carrying `actor`, `actor_fullname`, `email_send_date`, `email_recipients`, `email_responsibles`, `email_subject`, `email_body`, `email_attachments` per record. This is not re-derived here. Contrasted against OpenELIS's `NotificationLog`, SENAITE's mechanism has actor + timestamp + recipient + a subject/body/attachments record, comparable in the facts it carries, but it lives as a field on the artifact rather than as an independently queryable, ID-bearing entity with its own table.

### 4. LabKey, Baobab LIMS — not reached

Consistent with the prior scouting pass (`docs/research/delivery-level-receipt-facts-lims-precedent.md`), neither system was reachable from this environment's network path within the time available. No finding, positive or negative, is reported for either.

## What I could not establish

- Whether ISO/IEC 17025:2017 clause 7.8 (in its full, purchased text) contains any language on recording report distribution/recipient identity that the two guidance-tier sources used here (NIST crosswalk, EA FAQs) did not surface. The standard itself was not purchased; this is a guidance-tier negative, not a verified reading.
- Whether any USP compendial general chapter addresses CoA transmission recording — USP is paywalled and was not accessed in this pass (consistent with the prior pass's finding on this point in `docs/research/coa-content-requirements.md`).
- Whether EU GMP Volume 4 (Chapter 6 or Annex 16) addresses CoA transmission recording — out of scope for this pass; not investigated here (the prior pass, `docs/research/coa-content-requirements.md`, read these for CoA *content*, not transmission, and did not report on transmission).
- Whether `NotificationLog`'s infrastructure in OpenELIS Global is used, in a branch or feature not reached in this read, for a results-report or CoA-equivalent delivery event — only two seeded event codes (`REFERRAL_OUT`, `SAMPLE_RESAMPLED`) were found in the Liquibase changelogs read; a broader search of every changelog and every controller was not exhaustively performed, so this is reported as "not found in what was read," not as a confirmed absence across the whole codebase.
- LabKey's specimen module and Baobab LIMS — not reached at all; no finding either way.
- Whether OpenELIS's `Organization`/`SampleOrganization`/`OrganizationContact` construct is ever the *target* of a `NotificationLog` row (i.e., whether the recipient-identity model and the delivery-log model are cross-wired to each other) — the `NotificationRecipientType` enum values read (`ORDERING_PROVIDER`, `SUBMITTING_USER`, `COC_CONTACT`) do not obviously map onto `Organization`/`OrganizationContact`, and no code path joining the two was found in this pass.

## Sources

- eCFR, 21 CFR Part 211, Title 21, Chapter I, Subchapter A (current, issue date 2026-09-10, fetched via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-10/title-21.xml?part=211` on 2026-09-11): §211.194, §211.180, §211.68, §211.84(d)(3), §211.196 — full text parsed directly from returned XML.
- eCFR, 21 CFR Part 11, Title 21, Chapter I, Subchapter A (current, issue date 2026-09-10, fetched via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-10/title-21.xml?part=11` on 2026-09-11) — full text parsed directly from returned XML.
- FDA, *Data Integrity and Compliance With Drug CGMP — Questions and Answers, Guidance for Industry*, CDER/CBER/CVM, December 2018 (confirmed final, not the superseded draft): https://www.fda.gov/media/119267/download — retrieved and full-text-scanned 2026-09-11.
- NIST Office of Weights and Measures, "ISO/IEC 17025 Crosswalk — Reporting the Results" (February 2018): https://www.nist.gov/system/files/documents/2020/01/03/7-8-17025-crosswalk-reporting-results-20180201.pdf — fetched and full text extracted 2026-09-11; not the withdrawn HB 150-2020 document.
- European Accreditation, FAQ 45.1, "Question on Test Reports, ISO/IEC 17025 Clause 7.8": https://european-accreditation.org/sp_accordion_faqs/45-1-question-on-test-reports-iso-iec-17025-clause-7-8/ — fetched 2026-09-11.
- This repository, `docs/research/coa-content-requirements.md` (2026-09-11) — reused without re-derivation for ICH Q7 §11.4 clause text (already sourced there from FDA's own hosted PDF).
- This repository, `docs/research/iso17025-report-amendment-clause.md` (2026-09-11) — reused for sourcing method and currency checks on the ISO 17025 guidance-tier sources.
- This repository, `docs/research/open-lims-module-scope-inventory.md:139` (2026-09-11) — SENAITE `SendLog` field definition, taken as given per task instruction, not re-derived.
- This repository, `docs/research/delivery-level-receipt-facts-lims-precedent.md` (2026-09-11) — reused for OpenELIS/SENAITE clone provenance and citation method.
- `github.com/DIGI-UW/OpenELIS-Global-2`, branch `develop`, commit `b27664ea09c0fdacaf141c4afcc6492f0b099f13` (shallow clone at `/private/tmp/openelis_scout/OpenELIS-Global-2`; no tags available):
  - `src/main/java/org/openelisglobal/organization/valueholder/Organization.java`
  - `src/main/java/org/openelisglobal/organization/valueholder/OrganizationContact.java`
  - `src/main/java/org/openelisglobal/address/valueholder/OrganizationAddress.java`
  - `src/main/java/org/openelisglobal/sampleorganization/valueholder/SampleOrganization.java`
  - `src/main/java/org/openelisglobal/notification/valueholder/NotificationLog.java`
  - `src/main/java/org/openelisglobal/notification/valueholder/NotificationLogChannel.java`
  - `src/main/java/org/openelisglobal/notification/valueholder/NotificationTriggerConfig.java`
  - `src/main/java/org/openelisglobal/notification/valueholder/NotificationRecipientType.java`
  - `src/main/java/org/openelisglobal/notification/valueholder/NotificationChannel.java`
  - `src/main/java/org/openelisglobal/notification/service/NotificationLogEventListener.java`
  - `src/main/resources/liquibase/3.5.x.x/043-notification-trigger-config.xml`
  - `src/main/resources/liquibase/3.5.x.x/050-resample-notification-trigger.xml`
  - `src/main/resources/liquibase/3.5.x.x/045-notification-log.xml`
