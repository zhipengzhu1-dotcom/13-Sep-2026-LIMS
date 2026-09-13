# Where do system-level operational events (maintenance-window transitions, scheduled backups, archive/certificate sweeps, restore rehearsals) conventionally live — in the same database as GxP records, or in a separate operational log? Is there a primary regulatory source that requires or is silent on this?

**Asked by:** the orchestrator (system-operational-event-recording ticket)
**Date:** 2026-09-11
**Status of sources:**
- Open-source repos cloned fresh into a scratch directory (`/tmp/scout-scratch`, not this repository's working tree) on **2026-09-11** and read from source, not from documentation summaries.
- EU GMP Annex 11 read from the European Commission's own hosted PDF (`health.ec.europa.eu`), the 2011 revision — this is the current version; no later EU revision has come into force as of 2026-09-11 (a stakeholder consultation on a *future* Annex 11 revision is open, but nothing has superseded the 2011 text).
- PIC/S PI 041-1 read from the PIC/S website's own document viewer, the **1 July 2021 final version** — confirmed current: a web search for later PI 041 activity found no published revision as of January 2026, only an unrelated 2025 consultation on other GMP chapters (Chapter 1, Chapter 4, Annex 11), not on PI 041-1 itself.
- Per the standing traps flagged for this domain: FDA's December 2018 data-integrity guidance and NIST HB 150-2020 were not needed for this question and were not cited.

No real laboratory documents, client names, product names, batch identifiers or results appear anywhere in this file. All names below are open-source table, column, class, and package names, or public regulatory section numbers/text.

---

## Findings

### 0. A correction to the question's own section numbers

The ticket's framing cites "Annex 11 §17 'Business Continuity'" and "PI 041-1 §9.9 'Archiving and retrieval'." Reading the primary sources directly, both numbers/titles are off by one section, and this matters for what each section actually says:

- In the EU Commission's own 2011 Annex 11 PDF, **§16 is "Business Continuity"** and **§17 is "Archiving."** The clause that "requires a test/exercise before storage-layout changes" is in **§17 Archiving**, not §16:
  > "If relevant changes are to be made to the system (e.g. computer equipment or programs), then the ability to retrieve the data should be ensured and tested." (Annex 11 §17, `health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`, p.5)
  §16 Business Continuity is about a different thing — continuity of *support for a critical process* during a system breakdown (e.g., falling back to a manual system), not about testing storage before a layout change:
  > "For the availability of computerised systems supporting critical processes, provisions should be made to ensure continuity of support for those processes in the event of a system breakdown (e.g. a manual or alternative system) ... These arrangements should be adequately documented and tested." (Annex 11 §16, same source, p.5)
- In PI 041-1 (1 July 2021), the section titled **"9.9 Storage, archival and disposal of electronic data"** — not "Archiving and retrieval" — is the one containing the periodic-restore-test language (`picscheme.org/docview/4234`, p.50-51 of 63). There is no section literally titled "Archiving and retrieval" in this document.

Neither mislabeling changes the substance of what is quoted below, but the exact number/title should be corrected wherever it is repeated elsewhere in this project's documents.

### 1. Open-source LIMS precedent: system-level operational events are handled by application logs, not audit-trail tables — with one instructive exception that proves the same point

**OpenELIS Global 2** (`I-TECH-UW/OpenELIS-Global-2`, cloned HEAD `5ef1a5a31f9b59840fab1d8a508652acadc4ccc3`, 2026-09-11; this is one commit newer than the `672c92a6` HEAD used in the prior audit-topology research file from the same day, but the files below are unchanged between the two) runs its scheduled jobs through Quartz. The scheduler's own state lives in `clinlims.quartz_cron_scheduler` (`src/test/resources/postgre-db-init/OpenELIS-Global.sql:4886` — `id`, `cron_statement`, `last_run`, `active`, `run_if_past`, `name`, `job_name`, `display_key`, `description_key`). This table records the *current configuration and last-run timestamp* of a job, not a per-run event log — there is no append-only row created each time the job actually executes.

This table **is** registered in the `reference_tables` audit-eligibility registry with `keep_history = Y`:
```
203	QUARTZ_CRON_SCHEDULER	Y	N	2011-06-28 16:58:12.97017
```
(`src/test/resources/postgre-db-init/OpenELIS-Global.sql:15104`)

But the DAO that would have to invoke the audit-trail writer to make that registration mean anything, `CronSchedulerDAOImpl`, has its `insert`/`update` methods — the ones that call `auditDAO.saveNewHistory(...)` / `auditDAO.saveHistory(...)` — **entirely commented out** (`src/main/java/org/openelisglobal/scheduler/daoimpl/CronSchedulerDAOImpl.java:70-101`). What remains active is inherited from `BaseDAOImpl<T,PK>`, whose own generic `insert`/`update` methods do a plain `entityManager.persist(object)` / merge with **no call to any audit DAO at all** (verified by grep: the string `saveHistory` or `auditDAO` appears nowhere in `BaseDAOImpl.java`). The net effect: a table the registry *marks* as historyworthy has no live code path that writes history for it. I did not find any other call site that manually invokes `saveHistory` for `QUARTZ_CRON_SCHEDULER`.

Separately, and unambiguously, the scheduler's own operational chatter goes through `LogEvent` (`src/main/java/org/openelisglobal/common/log/LogEvent.java`), a thin wrapper over log4j2's `Category.error/info` calls, which is configured (`src/main/resources/log4j2.properties:1-33`) to write to:
- a console appender, and
- a rolling file appender at `${basePath}/openELIS.log` (`property.basePath = /var/lib/openelis-global/logs`), rotated at 100KB with up to 100 gzip'd backups.

Both are **outside the `clinlims` PostgreSQL database** entirely — an ordinary application log file on disk. Confidence: high on all of the above; each claim is a direct file read, not an inference.

**SENAITE** (`senaite/senaite.core`, cloned HEAD `993f721e6d8494d94a4001cd3d73409504b67a49`, 2026-09-10 — identical HEAD to the prior audit-topology research file) has, as established in that prior file, no generic event/history table at all — its "auditlog" is per-object JSON snapshots stored as Zope annotations on the audited content object (`src/senaite/core/api/snapshot.py`), triggered only for `IBaseObject`/`IDexterityContent` subscriber events. Grepping the whole clone for backup/maintenance/cron-adjacent terms (`backup`, `maintenance`, `cron`) turned up **no source-code hits at all** — only locale `.po`/`.pot` translation-string files and unrelated widget/vocabulary code (e.g., hazard categories, instrument browser fields) that happen to contain the substring. SENAITE ships no first-party backup/maintenance-scheduling subsystem in `senaite.core` to examine; that concern is left to the underlying Zope/ZEO deployment layer, which is out of scope of the application and was not further investigated. Confidence: high on "no hits in `senaite.core`"; the absence does not establish what a SENAITE *deployment*'s ops tooling does, only that the auditlog/snapshot mechanism itself has no notion of this event class.

**Cross-cutting reading.** Both systems draw the same line, from opposite directions. SENAITE's snapshot mechanism is *scoped to content objects* and structurally cannot represent a system-level event (there is no "subject" for a maintenance window to attach to — this mirrors the same architectural gap already identified for the certificate-byte-store sweep in the prior audit-topology research). OpenELIS *does* have a generic mechanism that could represent a system event (the `history` table, discriminated by `reference_table`/`reference_id`, already documented in `docs/research/audit-event-store-topology-in-open-lims.md`), and its own registry even flags the scheduler's configuration table as eligible — but the actual code path to populate `history` for that table has been disabled (commented out), leaving the log4j2 file as the only place scheduler activity is actually recorded. In neither system did I find a live, in-database, per-event record of "a backup ran," "an archive sweep ran," or "a maintenance window opened/closed."

### 2. EU GMP Annex 11 (2011 revision) — full relevant text and what it does and does not say

**§9 Audit Trails** (full text):
> "Consideration should be given, based on a risk assessment, to building into the system the creation of a record of all GMP-relevant changes and deletions (a system generated "audit trail"). For change or deletion of GMP-relevant data the reason should be documented. Audit trails need to be available and convertible to a generally intelligible form and regularly reviewed."

This conditions audit-trail creation on (a) a risk assessment and (b) the changed/deleted thing being **"GMP-relevant data."** A maintenance-window state transition (write-freeze opening or closing) does not, on its face, change or delete any GMP-relevant *data* — it changes the operating mode of the system. The text does not define "GMP-relevant changes and deletions" narrowly or broadly enough to settle whether a mode transition counts; it is worded around **data** changes specifically ("changes and deletions", "change or deletion of GMP-relevant data"), which is some textual evidence toward exclusion, but the annex nowhere states an exclusion, and "changes... to the system" is exactly the kind of thing §10 (below) separately addresses. I did not find language in §9 itself that resolves this either way — it is silent on operational/maintenance events as a category.

**§7.2 Data Storage** (backups):
> "Regular back-ups of all relevant data should be done. Integrity and accuracy of back-up data and the ability to restore the data should be checked during validation and monitored periodically."

This requires that backups happen and that their integrity/restorability be checked — it does not require that the *act* of running a backup, or the *act* of checking it, be captured as a GxP audit-trail record. "Monitored periodically" is left undefined as to mechanism (could be a log review, could be a documented check, could be an audit-trail row) — the annex does not specify.

**§10 Change and Configuration Management**:
> "Any changes to a computerised system including system configurations should only be made in a controlled manner in accordance with a defined procedure."

This is the section that most plausibly reaches a maintenance-window's write-freeze state as a "system configuration" change — but it requires only that such a change follow "a defined procedure," which is a change-control/process requirement, not an audit-trail-retention requirement. It does not say the record of that change must live in the same system, or the same retention regime, as GMP data audit trails.

**§16 Business Continuity** (full text, corrected from the ticket's §17):
> "For the availability of computerised systems supporting critical processes, provisions should be made to ensure continuity of support for those processes in the event of a system breakdown (e.g. a manual or alternative system). The time required to bring the alternative arrangements into use should be based on risk and appropriate for a particular system and the business process it supports. These arrangements should be adequately documented and tested."

This is about continuity-of-service planning (a fallback for when the system is down), not specifically about routine maintenance-window transitions, backup runs, or archive sweeps under normal operation. It requires the *arrangements* be documented and tested, not that each invocation of a maintenance window generate a GxP record.

**§17 Archiving** (full text, corrected from the ticket's §17 mislabel — this is genuinely §17, just not "Business Continuity"):
> "Data may be archived. This data should be checked for accessibility, readability and integrity. If relevant changes are to be made to the system (e.g. computer equipment or programs), then the ability to retrieve the data should be ensured and tested."

This is the clause that ties a test/exercise obligation to a storage-layout change — but the obligation is to *ensure and test retrievability*, not to log the test as a GxP audit-trail entry. Silent on where evidence of that test should be recorded.

**Annex 11's overall silence:** nowhere in the document does the word "backup," "maintenance," "archive," or "restore" appear alongside "audit trail" or "record retention" in a sentence that ties the two together. The audit-trail clause (§9) and the operational clauses (§7.2, §10, §16, §17) are structurally separate sections with no cross-reference. Annex 11 does not draw an explicit "two retention classes" line (GMP-data audit trail vs. infrastructure operations log) — it simply never brings the two together in the same sentence, which is a different thing from resolving the question.

### 3. PIC/S PI 041-1 (1 July 2021) — full relevant text and what it does and does not say

**§9.6 Audit trails for computerised systems**, Expectation 1 (relevant excerpt):
> "Audit trail functionality should be verified during validation of the system to ensure that all changes and deletions of critical data associated with each manual activity are recorded and meet ALCOA+ principles."

and Expectation 2:
> "Audit trails should be configured to record all manually initiated processes related to critical data."
> "The audit trail should include the following parameters: details of the user that undertook the action; what action occurred, was changed, incl. old and new values; when the action was taken, incl. date and time; why the action was taken (reason); and in the case of changes or modifications to data, the name of any person authorising the change."

Every clause here is scoped to **"data"** (critical data, changes and deletions of data). Nothing in §9.6 mentions system-level maintenance events, backups, or archive sweeps as things the audit trail must (or must not) capture. I searched the whole 63-page document for the strings "maintenance window," "write freeze," "write-freeze," "maintenance mode," "planned downtime," and "scheduled downtime" — **zero hits for all of them.** PI 041-1 does not use this vocabulary anywhere.

**§9.5 System security for computerised systems**, Expectation 1, does touch administrator/system-level activity, but narrowly and conditionally:
> "For smaller organisations, it may be permissible for a nominated person in the quality unit or production department to hold access as the system administrator; however, in these cases the administrator access should not be used for performing routine operations and the user should hold a second and restricted access for performing routine operations. **In these cases all administrator activities conducted should be recorded and approved within the quality system.**"

This is the closest PI 041-1 comes to requiring system-administration activity to be captured as a quality-system record — but the condition is narrow: it applies specifically to the compensating-control scenario where a quality-unit person is also the system administrator (a segregation-of-duties workaround for small organisations), not as a general rule that all administrator or maintenance activity must be recorded in the GMP record system. For organisations with an independent (e.g., IT) system administrator — the more typical case §9.5 otherwise describes — this clause does not apply, and PI 041-1 does not otherwise require administrator/maintenance activity logging.

**§9.9 Storage, archival and disposal of electronic data**, Expectation 3 (the restore-test clause; this is the section the ticket referred to as "Archiving and retrieval," which is not this document's actual section title):
> "Data should be backed-up periodically and archived in accordance with written procedures. Archive copies should be physically (or virtually, where relevant) secured in a separate and remote location from where back up and original data are stored. The data should be accessible and readable and its integrity maintained for all the period of archiving. **There should be in place a procedure for restoring archived data in case an investigation is needed. The procedure in place for restoring archived data should be regularly tested.**"

Two things worth being precise about:
1. This requires a restore *procedure* to exist and be *regularly tested* — it does not specify "monthly." Any monthly cadence cited elsewhere in this project's prior research is a chosen interpretation of "regularly," not a number PI 041-1 itself states.
2. Nowhere in this Expectation, or elsewhere in §9.9, does the text say the *test event itself* (the act of running a restore rehearsal, or a cold-read probe) must be captured in an audit trail alongside GMP data changes. The requirement is that the procedure be tested and, implicitly, that evidence of that testing exist somewhere — §9.9 does not say where.

**Does PI 041-1 draw an explicit two-class line (GMP-data audit trail vs. infrastructure/operations log)?** No. Like Annex 11, PI 041-1 never states this distinction as a rule. What it does instead is consistently scope its audit-trail language (§9.6) to "data," "critical data," and "changes/deletions of data" — while its backup/archival language (§9.9) and its administrator-recording language (§9.5) sit in separate sections with separate vocabulary and are never cross-referenced to §9.6's audit-trail requirement. The separation is structural (different sections, different item lists, no shared cross-reference) rather than a stated principle.

---

## What I could not establish

- **Whether any PIC/S inspector guidance, national competent-authority guidance, or ISPE/GAMP good-practice guide (not itself a primary regulatory source) treats maintenance-window transitions as GMP-relevant.** Those are secondary sources and were out of scope for this ticket, which asked for primary sources only.
- **What a SENAITE deployment's underlying Zope/ZEO/plone.recipe.zeoserver tooling does for backups and maintenance windows.** `senaite.core` itself contains no first-party backup/maintenance-scheduling subsystem to examine; the deployment layer is a separate set of packages/tooling not audited here.
- **Whether any OpenELIS code path outside `CronSchedulerDAOImpl` manually calls `auditDAO.saveHistory`/`saveNewHistory` for `QUARTZ_CRON_SCHEDULER` or any other scheduler-related table.** I checked the DAO that owns that entity and found the calls commented out; I did not exhaustively grep every service in the codebase for a manual bypass call using a raw `"QUARTZ_CRON_SCHEDULER"` string literal outside that file. Grep of the literal string across the clone found only the DDL/registry/DAO/hbm locations already cited — no additional call site — but I flag this as a negative-search result rather than an exhaustive proof.
- **Whether Annex 11 or PI 041-1's silence on "maintenance window"/"write freeze" vocabulary is because the concept doesn't arise for these regulators, or because it is subsumed silently under "change and configuration management" (Annex 11 §10) or "system security"/administrator-activity language (PI 041-1 §9.5) without being named.** Both documents are structured around data-integrity risk to *records*, and neither states a position on whether a mode-transition with no data payload is or is not "GMP-relevant" in the sense §9 (Annex 11) and §9.6 (PI 041-1) use. This is a genuine gap in the primary sources, not something I can resolve by inference from context clues in the text.
- **Which specific national/EU inspection precedent (if any) has actually cited a firm for not logging routine maintenance-window transitions as a GxP record.** No such enforcement-action text was sought or found; this ticket was scoped to source code and section text, not inspection findings.

---

## Sources

**I-TECH-UW/OpenELIS-Global-2** — cloned to `/tmp/scout-scratch/OpenELIS-Global-2` on 2026-09-11, HEAD `5ef1a5a31f9b59840fab1d8a508652acadc4ccc3` (branch default; the prior audit-topology research file in this repository used HEAD `672c92a618f8ad146560846eacafb0e0a4178068` from the previous day — the files cited below are unchanged between the two commits, checked by re-reading each cited file at the newer HEAD).
- `src/test/resources/postgre-db-init/OpenELIS-Global.sql:4883-4899` (`quartz_cron_scheduler` DDL), `:15104` (`reference_tables` row for `QUARTZ_CRON_SCHEDULER`, `keep_history = Y`)
- `src/main/resources/hibernate/hbm/CronScheduler.hbm.xml` (whole file)
- `src/main/java/org/openelisglobal/scheduler/daoimpl/CronSchedulerDAOImpl.java` (whole file — active `insert`/`update` overrides absent; commented-out versions at lines ~70-101 shown, including the calls to `auditDAO.saveNewHistory`/`auditDAO.saveHistory` that never execute)
- `src/main/java/org/openelisglobal/common/daoimpl/BaseDAOImpl.java` (grep for `insert`/`update`/`saveHistory`/`auditDAO` — generic `insert`/`update` call only `entityManager.persist`/merge, no audit hook)
- `src/main/java/org/openelisglobal/scheduler/SchedulerConfig.java:1-100` (Quartz + Spring `@Scheduled` wiring; `LogEvent.logError` usage)
- `src/main/java/org/openelisglobal/common/log/LogEvent.java:1-60`
- `src/main/resources/log4j2.properties:1-33` (console + rolling-file appenders, `basePath = /var/lib/openelis-global/logs`)

**senaite/senaite.core** — cloned to `/tmp/scout-scratch/senaite.core` on 2026-09-11, HEAD `993f721e6d8494d94a4001cd3d73409504b67a49` (branch `2.x` — identical HEAD to the prior audit-topology research file dated the same day).
- Whole-clone grep for `backup|maintenance.mode|write.freeze|writefreeze|read.only.mode|archive.sweep|cold.storage|cron\b` — hits confined to locale `.po`/`.pot` files and unrelated content/vocabulary modules; no backup/maintenance/scheduler subsystem present in `src/`.
- `src/senaite/core/api/snapshot.py` (per-object annotation mechanism, already documented in `docs/research/audit-event-store-topology-in-open-lims.md`, re-consulted here only to confirm no system-event path exists).

**EU GMP Annex 11: Computerised Systems** — European Commission, EudraLex Volume 4, revision 1, ref. `SANCO/C8/AM/sl/ares(2010)1064599`, deadline for coming into operation 30 June 2011. Fetched `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf` on 2026-09-11 (5-page official PDF). Sections quoted: Principle; §7 Data Storage (7.1, 7.2); §9 Audit Trails; §10 Change and Configuration Management; §16 Business Continuity; §17 Archiving.

**PIC/S PI 041-1, "Good Practices for Data Management and Data Integrity in Regulated GMP/GDP Environments"** — final version, 1 July 2021, 63 pages. Fetched `https://picscheme.org/docview/4234` on 2026-09-11. Sections quoted: §9.5 System security for computerised systems (Item 1, Expectation 1); §9.6 Audit trails for computerised systems (Expectations 1 and 2); §9.9 Storage, archival and disposal of electronic data (Expectations 1 and 3). Whole-document grep for "maintenance window," "write freeze," "write-freeze," "maintenance mode," "planned downtime," "scheduled downtime" — zero hits for all terms. Currency confirmed by web search on 2026-09-11: no PI 041-1 revision published as of January 2026; a 2025 PIC/S stakeholder consultation exists for other chapters (Ch.1, Ch.4, Annex 11) but not for PI 041-1 itself.
