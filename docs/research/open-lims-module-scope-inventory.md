# Which laboratory workflows do mature open LIMS put in their core, which in optional add-ons, and which are absent entirely?

**Asked by:** the orchestrator (scope decision ticket: what Benchline covers, what it holds a seam for, what stays outside)
**Date:** 2026-09-11
**Status of sources:** All findings below are read from fresh clones and live API/registry queries made on 2026-09-11, not from documentation summaries or comparison sites. Specifically:

- `senaite/senaite.core` — shallow clone, HEAD `993f721e6d8494d94a4001cd3d73409504b67a49`, committed 2026-09-10, branch `master`, `CHANGES.rst` header `2.7.0 (unreleased)`. Latest **released** version: **2.6.0, published 2025-04-04** (GitHub release `v2.6.0` 2025-04-04T10:17:01Z; PyPI `senaite.core` 2.6.0 uploaded 2025-04-04T10:08:42). So the clone is roughly 17 months of unreleased work ahead of the last tag; where a finding depends on unreleased code I say so.
- `senaite/senaite.impress` — clone, HEAD `889778c9605d5345316f0b10767da49792b1b731` (2026-07-27). Latest release 2.6.0, 2025-04-04.
- `senaite/senaite.storage` — clone, HEAD `704e172f490b48811bb4eacc6201ca0a857cc9a7` (2026-07-31). Latest release 2.6.0, 2025-04-04. `CHANGES.rst` header `2.7.0 (unreleased)`.
- `senaite/senaite.instruments` — clone, HEAD `fd30695868b23f03f99a9d034b8cc3c5defa9e9b` (**2022-05-20**). **Zero GitHub releases**; PyPI `senaite.instruments` 1.0.0 uploaded **2021-11-09**; `CHANGES.rst` header is `1.0.0 (unreleased)`.
- The full `senaite` GitHub org repository list via `gh api orgs/senaite/repos` (41 repos, archived flag and `pushed_at` recorded per repo).
- `I-TECH-UW/OpenELIS-Global-2` — full clone (blobless), HEAD `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10), default branch `develop`. Latest release tag **3.2.2.0, published 2026-08-18**. I checked module presence *both* at HEAD and at the `3.2.2.0` tag, because several modules are newer than the last release.
- `bikalims` GitHub org repository list, `bikalims/bika.lims.legacy` README and archived flag, and an HTTP `HEAD` on `https://github.com/senaite/bika.lims`.
- `https://www.senaite.com/` (fetched 2026-09-11) for the project's own feature framing. Note `https://www.senaite.com/docs` returns **HTTP 404** as of this date — there is no reachable documentation index at that path, which is itself part of why the source code is the authority here.

No real laboratory documents, client names or product identifiers appear anywhere in this file; all names are open-source class, field and package names.

## Findings

### Summary table

`core` = shipped in the base product's own source; `add-on` = separate installable package; `absent` = no such model found.

| # | Workflow | SENAITE | OpenELIS Global 2 | Bika LIMS |
|---|---|---|---|---|
| 1 | Sample receipt / login | core | core | = SENAITE (see §C) |
| 2 | Method & specification admin, incl. versioning | core, but **copy-on-use, not versioned** | core; no spec versioning found | = SENAITE |
| 3 | Analyst assignment of work | core (per-analysis) | **absent as assignment**; pull-based workplans only | = SENAITE |
| 4 | Worksheets & result entry / calculation | core | result entry core; **no persistent worksheet entity** | = SENAITE |
| 5 | Result review / second-person verification | core, configurable 1–4 verifications | core (`resultvalidation`) + `esig` e-signatures | = SENAITE |
| 6 | OOS investigation handling | **absent** (out-of-range *flagging* only) | core, as a general non-conformity/CAPA module | = SENAITE |
| 7 | Reagent / consumable inventory (stock, lots, expiry) | **absent — core and whole add-on ecosystem** | **core, fully modelled** (items, lots, quantity ledger) | = SENAITE |
| 8 | Reference standard control | core, as *reference/control sample lots* | core, as `QCControlLot` | = SENAITE |
| 9 | Analyst training / qualification records | **absent** | **absent** | = SENAITE |
| 10 | Equipment calibration & maintenance scheduling | **core** (5 dedicated content types) | **absent** as a scheduling model | = SENAITE |
| 11 | Stability study management | **absent** | **absent** (a reagent open-life field only) | = SENAITE |
| 12 | Reserve sample / retain tracking | add-on, and the retention part is **unreleased** | core storage module; retention not modelled | = SENAITE |
| 13 | CoA issuance, and amendment / reissue | core issuance; **reissue = new object, old preserved** | issuance core; **amendment model exists but is unreleased and deployment-specific** | third-party CoA *templates* add-on |
| 14 | Sample storage location & movement | flat vocabulary in core; real storage is an **add-on** | **core**, hierarchical + movement log | = SENAITE |

---

## A. SENAITE

### A.1 What the org actually ships

`gh api orgs/senaite/repos` returns 41 repositories. Excluding website, docker, buildout and API-plumbing repos, the functional add-on set is: `senaite.storage`, `senaite.impress`, `senaite.instruments`, `senaite.referral`, `senaite.queue`, `senaite.archive`, `senaite.panic`, `senaite.patient`, `senaite.ast`, `senaite.abx`, `senaite.microorganism`, `senaite.diagnosis`, `senaite.multiwellplate`, `senaite.ldap`, `senaite.databox`, `senaite.lis2a`, `senaite.astm`, `senaite.fhir`, `senaite.sqlmultiplex`, `senaite.starter`, plus four archived repos (`senaite.health`, `senaite.autopublish`, `senaite.sync`, `senaite.reflex`, `senaite.api`, `senaite.exporter`, `buildout.healthdev`).

**There is no inventory, reagent, stability, training/competency, or calibration-scheduling add-on in the org.** I also ran the GitHub repository search API for `senaite inventory`, `senaite reagent`, `senaite stability` and `senaite calibration`: each returns `total_count: 0`, while a control query `senaite` returns 189. I then listed all 189 by name; none of them is an inventory, stability, or training package. That is how I established absence for items 7, 9 and 11 in the SENAITE ecosystem — not merely absence from the core, but absence from every public repository whose name matches the project.

Maintenance status of the add-ons that matter here:

| Add-on | Latest release | Last commit seen | Status |
|---|---|---|---|
| `senaite.storage` | 2.6.0, 2025-04-04 (GitHub + PyPI) | 2026-07-31 | maintained, actively developed toward an unreleased 2.7.0 |
| `senaite.impress` | 2.6.0, 2025-04-04 | 2026-07-27 | maintained |
| `senaite.instruments` | **none on GitHub**; PyPI 1.0.0 **2021-11-09** | **2022-05-20** | **effectively abandoned**; `CHANGES.rst` still says `1.0.0 (unreleased)` |
| `senaite.archive` | **none on GitHub; not on PyPI at all** (`pypi.org/pypi/senaite.archive/json` returns no `info` key) | 2024-10-11 | never released |
| `senaite.queue` | v1.0.3, 2021-07-26 | 2023-06-10 | stale |

`senaite.instruments` being dead matters less than it looks: instrument *result import* interfaces live in `senaite.core` itself, under `src/senaite/core/exportimport/instruments/` (a large directory of vendor-specific parsers). The dead add-on was a second-generation attempt at the same job, not the only home for it.

### A.2 Workflow-by-workflow

**1. Sample receipt / login — core.** The sample workflow definition `src/senaite/core/profiles/default/workflows/senaite_sample_workflow/definition.xml` declares states `sample_registered, scheduled_sampling, to_be_sampled, sample_due, sample_received, to_be_preserved, to_be_verified, verified, published, rejected, invalid, cancelled, dispatched, disposed` and transitions including `receive`, `sample`, `preserve`, `reject`, `create_partitions`, `dispatch`, `dispose`. Receipt is a first-class transition.

**2. Method and specification administration — core, but explicitly *not* versioned.** This is the sharpest specification finding in SENAITE, and it is stated in a source comment rather than in documentation.

`AnalysisSpecification` (`src/bika/lims/content/analysisspec.py`) is a setup object holding a `SampleType` reference and a `ResultsRange` field of min/max/warn values. It carries **no version field, no effective date, and no supersession link**; it lives under the generic deactivate/activate workflow. What SENAITE does instead is copy the range onto the sample at assignment time. From `src/bika/lims/content/analysisrequest.py:1497-1518`, in `setSpecification()`:

```
# Set the value for field ResultsRange, cause Specification is only
# used as a template: all the results range logic relies on
# ResultsRange field, so changes in setup's Specification object won't
# have effect to already created samples
```

and at `analysisrequest.py:1529-1544`, `setResultsRange()` writes the range onto the Sample *and* onto each contained Analysis, skipping any analysis that already provides `ISubmitted`. So the specification is a **template copied at point of use**, and the historical record of "what limit applied to this sample" is the copy on the sample, not a version of the spec object.

The same pattern, done more explicitly, applies to Calculations. `src/bika/lims/content/abstractanalysis.py:132-169` defines four fields on the Analysis and documents them in comments:

- `CalculationUID` — "UID of the Calculation linked at analysis creation time. Plain string — no backreference machinery, no version annotation. Used only for display and navigation."
- `CalculationFormula` — "Formula snapshotted from the Calculation at linking time … used directly by `calculateResult`, independent of any later changes to the Calculation."
- `CalculationImports` — "Keeping this snapshot ensures that changes to a Calculation's imports do not break existing Analyses."
- `CalculationVersion` (IntegerField) — "Snapshot version (auditlog index) of the Calculation at linking time. **Stored for audit display only; not used for formula evaluation.**"

That `CalculationVersion` is an index into the generic auditlog snapshot list documented in `docs/research/senaite-sample-and-assignment-model.md:33-38` — i.e. SENAITE's notion of "version of a setup object" is a derived read of the audit trail, not a managed version series.

`Method` (`src/senaite/core/content/method.py`) has `Method ID`, `Description`, `Accredited` (boolean), `Instructions`, a `Method Document` file upload, and references to `Instruments` and `Calculations`. **No version field, no approval or effective-date workflow.** Method documents are file attachments.

**3. Analyst assignment — core, per-analysis.** Already established in `docs/research/senaite-sample-and-assignment-model.md:9-38`; not repeated here.

**4. Worksheets and result entry / calculation — core.** `Worksheet` is a content type with a slot `Layout` and a `WorksheetAnalysis` reference field (`src/bika/lims/content/worksheet.py:80-93`); worksheet workflow states are `open, to_be_verified, verified`. Calculation is core (`src/senaite/core/content/calculation.py`, with the formula-snapshot mechanism above).

**5. Result review / second-person verification — core, configurable.** Analysis workflow transitions include `submit`, `verify`, `multi_verify`, `retract`, `retest`, `reject`. `src/bika/lims/content/bikasetup.py:486-510` defines two settings, `SelfVerificationEnabled` and `NumberOfRequiredVerifications` (the latter with a vocabulary, `bikasetup.py:1360`). `abstractanalysis.py:128-130` carries a per-analysis `NumberOfRequiredVerifications` defaulting to 1. So SENAITE models second-person verification as configurable N-of-N, with self-verification as an explicit switch.

**6. Out-of-specification investigation — absent as a workflow; only range flagging.** A case-sensitive `grep -rn "OOS"` across `src/` (excluding vendored static assets and locale catalogues) returns **nothing**. `grep -rn "out of specification"` returns nothing. What exists is `is_out_of_range` logic in `src/bika/lims/api/analysis.py`, consumed by listing views (`src/bika/lims/browser/analyses/view.py`) to raise a visual alert, plus the `retract`/`retest` analysis transitions and the sample-level `invalidate` transition. There is no investigation record, no phase structure, no assignable owner, no root-cause or hypothesis field. Closest structural relative: `after_invalidate()` (`src/bika/lims/workflow/analysisrequest/events.py:86-92`) creates a retest sample and marks the original `IInvalidated`.

**7. Reagent and consumable inventory — absent.** There is no stock, lot, quantity or consumption model in core. `grep -rn "reagent"` across `src/` matches only six files, all of which are instrument-export *sample data files* (e.g. vendor CSV/SLK fixtures under `src/senaite/core/exportimport/instruments/.../samples/`) — no source code. `grep -in "inventory"` matches exactly one file, a test doctest (`src/senaite/core/tests/doctests/SampleDispose.rst`).

The nearest-looking content type is a false friend: `LabProduct` (`src/senaite/core/content/labproduct.py`) has `title`, `description`, `labproduct_volume`, `labproduct_unit`, `price`, a VAT default drawn from `api.get_senaite_setup().getVAT()`, and implements `IHavePrice`. It is a **price-list line item for invoicing**, not stock. There is no quantity-on-hand, no receipt, no issue, no lot, no expiry.

**8. Reference standard control — core, as reference/control sample lots.** `ReferenceSample` (`src/bika/lims/content/referencesample.py`) is a full content type filed under a `Supplier`, with: `ReferenceID`, `Supplier`, `ReferenceDefinition`, `Blank` and `Hazardous` booleans, `CatalogueNumber` (line 148), `LotNumber` (line 154), `DateSampled`, `DateReceived`, `DateOpened` (line 181), `ExpiryDate` (line 187), `DateExpired` (line 194), `DateDisposed` (line 201), and `ReferenceResults` — a `ReferenceResultsField` labelled "Expected Values" (line 208) holding the expected result and range per analysis service. Its own workflow (`senaite_referencesample_workflow/definition.xml`) has states `current, disposed, expired, inactive` and transitions `dispose, expire, activate, deactivate`. `ReferenceAnalysis` is a distinct analysis type run against these samples, and the worksheet reference field explicitly allows `ReferenceAnalysis` alongside routine ones.

Caveat, stated as a limitation: this is **lot identity and expiry control, not quantity control**. `grep -in "quantity\|volume\|amount\|remaining"` over `referencesample.py` returns nothing. There is no "how much is left" and no consumption record.

**9. Analyst training / qualification records — absent.** `grep -rniw "training"` across `src/` matches five files, all vendored third-party JavaScript (TinyMCE emoji tables, jQuery UI). `grep -rni "qualification"` and `grep -rni "competen"` each return **zero files across the entire repository**. There is a `LabContact` content type and a `Department`, but no qualification, authorisation-to-perform, or training-record model, and nothing that gates an analysis by the performer's qualification for that method.

**10. Equipment calibration and maintenance scheduling — core, and unusually thorough.** Five dedicated content types in `src/bika/lims/content/`:

- `instrumentcalibration.py` — `Instrument` reference, three `DateTimeField`s (down-from / down-to / date), `Worker`, `Considerations`, `Remarks`, plus a `Remaining` computation (`grep "Remaining"` matches `instrumentcalibration.py` and `instrumentvalidation.py`).
- `instrumentcertification.py` — certificates with validity dates, driving `getValidCertifications()` / `getCertificateExpireDate()` / `getLatestValidCertification()` on the Instrument.
- `instrumentvalidation.py`
- `instrumentmaintenancetask.py` — task `Type` with a vocabulary of `Preventive`, `Repair`, `Enhancement`; `DownFrom`/`DownTo`; `Maintainer`; `Cost`/`Price`; `WorkPerformed`; `Considerations`; and derived statuses `Pending`, `Overdue`, `Closed`, `Cancelled`.
- `instrumentscheduledtask.py` — the scheduling counterpart.

The Instrument itself computes fitness: `Instrument.isValid()` (`src/bika/lims/content/instrument.py:478-486`) is `not isOutOfDate() and isQCValid() and not isValidationInProgress() and not isCalibrationInProgress()`.

That validity is **enforced only as a warning**, not a hard block. `src/senaite/core/browser/worksheets/worksheet/manage_results.py:200-220` iterates analyses, and where `instrument and not instrument.isValid()` adds a *status message* with severity `"warning"`: `"Some analyses use out-of-date or uncalibrated instruments. Results edition not allowed: ${inv}"`. The identical check exists at `src/bika/lims/browser/worksheet/views/results.py:184`. Separately, `src/senaite/core/browser/modals/analysis/vocabularies.py:78` and `.../form.py:302` filter instrument *choices* to valid ones. So: invalid instruments are hidden from the picker and flagged on existing worksheets; I found no guard that refuses the `submit` transition on that basis.

**11. Stability study management — absent.** `grep -rn "stability"` over `src/` excluding vendored static assets returns exactly one hit: `src/bika/lims/browser/templates/senaite-frontpage.pt:33`, marketing prose ("excellent performance and good stability"). `grep -rni "shelf.life"` returns zero files. There is no study, no timepoint, no storage-condition arm, no pull schedule.

**12. Reserve sample / retain tracking — partial, in an add-on, and the relevant part is unreleased.** Core has a `dispose` transition and a `disposed` state on the sample workflow, but no retain-period model. `senaite.storage` is where retention lives, and it is **new**. Its `CHANGES.rst` under the unreleased `2.7.0` heading lists:

- `#62 Add configurable storage retention period`
- `#64 Add 'Storage Expiry Date' column in samples listing, under 'Stored'`
- `#65 Add a "Past Retention" filter in samples listing`
- `#66 Add visual warning for samples approaching retention expiration`
- `#63 Result type-specific controls in retention rules settings`
- `#68 Require selection of retrieve reason when retrieving samples from storage`
- `#67 Rename "Recover" transition to "Retrieve" to align with ISO 17025/15189`

Implementation confirmed in the clone: `src/senaite/storage/api.py:75` reads a registry record `senaite.storage.retention_period_rules`; `get_default_retention_period(sample)` at line 82; `sample.getStorageExpiryDate()` at line 176; a new `getStorageExpiryDate` DateIndex added in `setuphandlers.py:89` and via upgrade step `upgrade/v02_07_000.py:538-546`; and a doctest `tests/doctests/RetentionPeriod.rst`.

**None of this is in a released version.** The last `senaite.storage` release is 2.6.0 (2025-04-04); all of the above sits under `2.7.0 (unreleased)`.

**13. CoA / report issuance and amendment — issuance in core, reissue preserves the prior report, but there is no amendment *model*.** This is the most directly relevant SENAITE finding for the ticket.

Storage side: a results report is a persistent content object, not a file overwritten in place. `senaite.core` defines `ResultsReport` (`src/senaite/core/content/resultsreport.py`, Dexterity) with the Archetypes `ARReport` (`src/bika/lims/content/arreport.py`) retained for migration. Fields on both: `AnalysisRequest` ("Primary Sample"), `ContainedAnalysisRequests` ("Contained Samples", for multi-sample reports), `Metadata` (paperformat, timestamp, orientation, template, contained_requests), a `Pdf` blob, an `Html` text field, `Recipients`, `DatePrinted`, and a `SendLog` records field whose subfields are `actor`, `actor_fullname`, `email_send_date`, `email_recipients`, `email_responsibles`, `email_subject`, `email_body`, `email_attachments`.

Creation side, in `senaite.impress`: `PdfReportStorageAdapter.create_report()` (`src/senaite/impress/storage.py:96-134`) unconditionally calls `api.create(parent, "ResultsReport", sample=..., contained_samples=..., pdf=pdf_blob, metadata=...)` inside the sample. There is **no lookup for an existing report and no update path** — every publication creates a new object inside the sample folder. The sample workflow has both `publish` and a separate `republish` transition. So the answer to "does it preserve the previously issued report?" is **yes, by accumulation**: publishing again adds a report object; nothing deletes or mutates the earlier one, and each carries its own PDF blob, timestamp metadata and send log.

What it does **not** have is a first-class amendment relationship. `grep -rni "amend"` and `grep -rni "reissue"` across both `senaite.core/src` and `senaite.impress/src` return **zero files**. `grep -rni "supersede"` across `senaite.core/src` matches exactly one line, an unrelated note in a test file. There is no "this report supersedes report X", no amendment number, no mandatory reason-for-amendment field, and no revision suffix on the report identifier.

The nearest thing is invalidation, which operates on the **sample**, not the report. `after_invalidate()` (`src/bika/lims/workflow/analysisrequest/events.py:86-92`) creates a retest sample and marks the original with `IInvalidated`; the retest carries an `Invalidated` UID reference back to its predecessor (`src/bika/lims/content/analysisrequest.py:1326-1345`, relationship `AnalysisRequestRetracted`, labelled "Retest from sample"). `senaite.impress` then renders that relationship onto the printed output — `src/senaite/impress/analysisrequest/templates/alerts.pt:7-16`:

```
<div class="alert alert-danger" tal:condition="model/is_invalid">
  <h2 class="alert-heading"><span tal:replace="model/getId"/></h2>
  <div i18n:translate="">This Analysis Request has been invalidated due to erroneously published results</div>
  <tal:invalidreport tal:define="child python:model.getRetest()" tal:condition="python:child">
    <span i18n:translate="">This Analysis request has been replaced by</span>
    <a tal:attributes="href child/absolute_url" tal:content="child/getId"></a>
  </tal:invalidreport>
</div>
```

So a reprinted invalidated report carries a banner naming the sample that replaced it. The correction chain is therefore **sample → retest sample**, with the report following along, rather than **report → amended report**.

**14. Sample storage location and movement — a flat vocabulary in core; real storage is an add-on.** Core has a `StorageLocation` content type (`src/senaite/core/content/storagelocation.py`) whose fields are `Address`, `Site Title`, `Site Code`, `Site Description`, `Location Title`, `Location Code`, `Location Description`, `Location Type` — a descriptive setup vocabulary referenced from the sample, with no containment hierarchy and no movement record.

`senaite.storage` supplies the real model: content types `StorageFacility`, `StorageContainer`, `StorageLayoutContainer`, `StorageSamplesContainer`, `StoragePosition`, `StorageRootFolder` (`src/senaite/storage/content/`), and a workflow (`senaite_storage_default_workflow/definition.xml`) with transitions `add_samples`, `recover_samples` (renamed "Retrieve" in unreleased 2.7.0), `move_container`, `activate`, `deactivate`. Unreleased 2.7.0 also adds `StorageManager` and `StorageAssistant` roles (`#61`) and printable location barcode stickers (`#72`).

---

## B. OpenELIS Global 2

### B.0 Scope caveat, stated by the project

OpenELIS Global is **not a pharmaceutical QC system**. From its own `docs/about.md` (in-repo, rendered at openelis-global.org):

> "The OpenELIS Global software is an open enterprise-level laboratory information system built on open source web-based technologies that has been **tailored for low-and-middle income country public health laboratories**."

The data model is patient-centric (`patient`, `samplehuman`, `patientidentity`, `patienttype`, `provider`, `gender`, `patientrelation` packages), and the reporting vocabulary is "patient report", not "certificate of analysis" — `grep -rni "certificate of analysis"` across `src/main/java` returns **zero files**. Where that changes what is modelled, I flag it below. What it does have that a pharma lab would recognise — inventory, control-lot QC, electronic signatures, non-conformity handling — is driven by ISO 15189 accreditation needs rather than GxP.

The top-level Java package list under `src/main/java/org/openelisglobal/` is the module inventory I worked from; it has ~150 packages including `inventory`, `testreagentlink`, `storage`, `coldstorage`, `qc`, `qaevent`, `esig`, `eqa`, `compliance`, `resultvalidation`, `workplan`, `method`, `sampleacceptance`, `notebook`, `audittrail`, `shipment`, `referral`.

### B.1 A release-line caution that changes how these findings should be read

Several of the most interesting modules are very new. Using `git log --reverse` on each package directory and checking presence at the `3.2.2.0` release tag (2026-08-18):

| Package | First commit | In release 3.2.2.0? |
|---|---|---|
| `inventory` | 2019-07-26 (heavily rewritten since) | **yes** |
| `storage` | 2025-11-14 | **yes** |
| `coldstorage` | 2025-11-27 | **yes** |
| `qc` (Westgard/control lots) | 2026-03-20 | **yes** |
| `eqa` | 2026-03-20 | **yes** |
| `esig` | 2026-04-08 | **yes** |
| `notebook` | 2025-10-20 | **yes** |
| `compliance` (certificate amendment) | **2026-08-21** | **NO** |

So everything below is in a released artefact **except the compliance/certificate-amendment module**, which landed on `develop` three days after the last release, in a single commit `be3cd7a0ebdbbf6e428fc216be1d124a1b5f8f45`, titled "Sync/demo silnas into develop (#3946)".

### B.2 Workflow-by-workflow

**1. Sample receipt / login — core, with an acceptance checklist.** `Sample` (`src/main/java/org/openelisglobal/sample/valueholder/Sample.java`) carries `accessionNumber`, `packageId`, `domain`, `enteredDate`, `receivedTimestamp`, `collectionDate`, `requiredBy`, `clientReference`, `status`, plus `resampledFromSampleId` / `resampledToSampleId`. A separate `sampleacceptance` package models receipt acceptability: `SampleAcceptanceRecord`, `SampleAcceptanceChecklistService`, `SampleAcceptanceEvaluation`, `SampleAcceptanceBlockedException`, `ResampleService`.

**2. Method and specification administration — core; no versioning found.** There is a `method` package (`Method.java` + DAO/service, five files — a thin lookup entity) and `testmethod`, `testconfiguration`, `testactivation`, `resultlimit`/`resultlimits` for reference ranges. I found no version, effective-date or supersession field on any of these. `Analysis` and `Sample` each carry a `revision` string field, but I found no code assigning meaning to it as a specification version.

**3. Analyst assignment of work — absent as assignment.** `Analysis` (`analysis/valueholder/Analysis.java:45-89`) has `sampleItem`, `analysisType`, `testSection`, `test`, `revision`, `status`, dates, `isReportable`, referral fields, `parentAnalysis`, `triggeredReflex`, `resultCalculated`, `referredOut`, `correctedSincePatientReport` — and **no assignee**. `Result` (`result/valueholder/Result.java`) likewise has no analyst field. `grep -rniw "analyst"` over `src/main/java` matches only four lines, all in the unreleased compliance module's PDF signature block. The word `technician` appears as the *person who entered/signed* a result (`test/beanItems/TestResultItem.java:178`, `result/controller/LogbookResultsController.java`), i.e. attribution after the fact.

Work is organised pull-style: the `workplan` package is entirely controllers, forms and Jasper report classes (`WorkPlanByTestController`, `WorkPlanByTestSectionController`, `WorkPlanByPriorityController`, `WorkplanByPanelController`, `TestWorkplanReport`) — **printable/queryable worklists by test, section, panel or priority, with no valueholder package at all**, hence no persisted assignment. Assignment as a persisted concept exists elsewhere in the codebase (e.g. `qaevent/NcEvent`, `shipment/UnassignedSampleServiceImpl`, `referral`), which is how I am confident its absence on `Analysis` is deliberate rather than an oversight in my search.

**4. Worksheets and result entry — result entry core; no worksheet entity.** `find src/main/java -iname "*worksheet*"` returns exactly one file, `common/provider/reports/MycologyWorksheetProvider.java` — a report provider, not a domain object. Result entry is the "logbook" (`result/controller/LogbookResultsController.java`), a by-test-section grid. Calculation exists (`testcalculated`, `Analysis.resultCalculated`, `scriptlet`).

**5. Result review / second-person verification — core, and now with 21 CFR Part 11-shaped e-signatures.** A whole `resultvalidation` package (action/bean/controller/dao/form/service/util/valueholder). On top of it, the `esig` package (first commit 2026-04-08, present in 3.2.2.0) defines `ElectronicSignature` with columns `signer_id`, `signer_name_printed`, `signature_meaning`, `signed_at`, `record_type`, `record_id`, `rejection_reason`, `session_signing_sequence`, `auth_method`, `client_ip`, `user_agent`, with a `SignatureMeaning` enum including `VALIDATED_AND_RELEASED`. It also has `EsigFirstUseCertification`, whose class comment states:

> "Records a user's one-time certification per 21 CFR Part 11 §11.100(c). Before first use, users must certify that their electronic signature is the legally binding equivalent of their handwritten signature. This table is **append-only**. Certifications can only be revoked by an admin (which deletes the record), forcing the user to re-certify."

That is the only place in either system where a US pharmaceutical regulation is cited by number in the source.

**6. OOS investigation handling — core, as a general non-conformity / CAPA module.** The `qaevent` package (first commit 2019-07-26) is substantial: `NcEvent`, `NceType`, `NceCategory`, `NceHistory`, `NceActionLog`, `NceAttachment`, `NceSpecimen`, `QaEvent`, `QaObservation`, `LabComponent`, `NceNumberGeneratorService`, `NceReportService`, plus controllers `ReportNonConformingEventController`, `CorrectiveActionController`, `ViewNonConformingEventController`, `RejectionController`.

`NcEvent` fields: `reportDate`, `title`, `immediateAction`, `nameOfReporter`, `nceNumber`, `dateOfEvent`, `labOrderNumber`, `prescriberName`, `site`, `reportingUnitId`, `description`, `suspectedCauses`, `proposedAction`, `laboratoryComponent`, `consequenceId`, `recurrenceId`, `severityScore`, `colorCode`, `correctiveAction`, `controlAction`, `comments`, `effective`, `signature`, `dateCompleted`, `nceCategoryId`, `severityId`, `nceTypeId`, `status`.

Note precisely what this is and is not: a **deviation/CAPA record with cause, corrective action, control action, effectiveness check and an event number** — the ISO 15189 non-conformity shape. It is **not** a phased OOS investigation in the FDA sense (no laboratory-phase / full-scale-phase structure, no hypothesis testing plan, no explicit invalidate-the-original-result decision gate tied to the investigation outcome).

**7. Reagent and consumable inventory — core, and the most complete of anything surveyed.** Package `inventory/valueholder/` contains `InventoryItem`, `InventoryLot`, `InventoryTransaction`, `InventoryUsage`, `InventoryStorageLocation`, `InventoryEnums` — all present at the 3.2.2.0 tag.

`InventoryItem` columns: `name`, `description`, `item_type`, `category`, `manufacturer`, `catalog_number`, `storage_requirements`, `quantity_per_unit`, `units`, `low_stock_threshold`, `expiration_alert_days`, `stability_after_opening`, `dilution_notes`, `compatible_analyzers`, `calibration_required`, `tests_per_kit`, `individual_tracking`, `source_organization`, `kit_test_type`, `is_active`.

`InventoryLot` columns: `inventory_item_id`, `storage_location_id`, `lot_number`, `expiration_date`, `date_opened`, `calculated_expiry_after_opening`, `receipt_date`, `initial_quantity`, `current_quantity`, `qc_status`, `status`, `barcode`, `version`.

`InventoryTransaction` columns: `lot_id`, `transaction_type`, `quantity_change`, `quantity_after`, `transaction_date`, `reference_id`, `reference_type`, `notes`, `performed_by_user` — i.e. a full running quantity ledger with attribution.

`InventoryEnums` gives the vocabularies: `ItemType {REAGENT, RDT, CARTRIDGE, HIV_KIT, SYPHILIS_KIT}`; `LotStatus {ACTIVE, IN_USE, EXPIRED, CONSUMED, DISPOSED, QUARANTINED}`; `QCStatus {PENDING, PASSED, FAILED, QUARANTINED}`; `TransactionType {RECEIPT, CONSUMPTION, ADJUSTMENT, DISPOSAL, OPENING, QC_TEST, MANUAL}`; `ReferenceType {TEST_RESULT, RECEIPT, QC_RUN, MANUAL, ADJUSTMENT}`.

Crucially, consumption is **linked to testing**: `TestReagentLink` (`testreagentlink/valueholder/TestReagentLink.java`) has columns `test_id`, `reagent_id`, `usage_type`, `quantity_per_test`, `quantity_unit`, and `InventoryTransaction.reference_type` can be `TEST_RESULT` or `QC_RUN`. So running a test can decrement stock against a specific lot. The `ItemType` enum makes plain that the design driver is public-health rapid-test kits, but the item/lot/transaction structure itself is generic.

**8. Reference standard control — core, as QC control lots.** `qc/valueholder/QCControlLot` columns: `product_name`, `lot_number`, `manufacturer`, `control_level`, `test_id`, `instrument_id`, `calculation_method`, `initial_runs_count`, `manufacturer_mean`, `manufacturer_std_dev`, `activation_date`, `expiration_date`, `status`, `sys_user_id`. Around it: `QCResult`, `QCStatistics`, `QCRuleViolation`, `WestgardRuleConfig`, `TestQcThreshold`, `QCAlert`, `SampleItemQcProfile`. This is statistical QC on **control materials** (levels, manufacturer mean/SD, Westgard rules) — closer to clinical chemistry QC than to a pharmacopoeial reference-standard register, but it is a real controlled-lot model with activation and expiry. Note it is *separate* from the `inventory` module's lots; `Result` also carries `qcEvaluation` and `qcEvaluationDetail` fields.

**9. Analyst training / qualification records — absent.** `grep -rnw "training"` over `src/main/java` returns two hits, both a deployment flag: `common/util/ConfigurationProperties.java:60` defines `TrainingInstallation("TrainingInstallation", "text")` with the inline comment "Flag to indicate if this is a training instance", used at `common/controller/DatabaseCleaningRestController.java:49` to permit database wiping ("Database cleaning is only allowed on training installations"). That is a *demo-environment* flag, not a training record. `grep -rniw "competency|competence|qualification"` returns one unrelated comment in `resultlimit/service/ResultLimitServiceImpl.java:328`. There is user/role/section structure (`systemuser`, `role`, `rolemodule`, `usertestsection`, `systemusersection`) — authorisation, not qualification.

**10. Equipment calibration and maintenance scheduling — absent as a model.** There is an `analyzer` / `analyzerimport` / `analyzerresults` set of packages for instrument interfacing, and a `scheduler` package for background jobs, but no calibration record, certificate, or maintenance task entity. The only two matches for "calibrat" in the domain layer are: a boolean flag `InventoryItem.calibration_required` (default `"N"`, `inventory/valueholder/InventoryItem.java:97-98`), and an enum constant in `coldstorage/valueholder/CorrectiveActionType.java` — whose full member list is `TEMPERATURE_ADJUSTMENT, EQUIPMENT_REPAIR, SAMPLE_RELOCATION, CALIBRATION, ITEM_REORDER, MAINTENANCE, OTHER`, i.e. calibration and maintenance appear only as *categories of a corrective action taken in response to a freezer excursion*, not as scheduled activities with due dates. The `coldstorage` package itself (`Freezer`, `FreezerReading`, `ThresholdProfile`, `FreezerThresholdProfile`, `CorrectiveAction`, `CorrectiveActionStatus`, `FreezerPollingExecutorConfig`) is genuine equipment monitoring — but for storage temperature, not analytical instrument fitness.

**11. Stability study management — absent.** The two "stability" matches in the domain layer are both something else: `TestSampleHandling.stability_notes` (`testsamplehandling/valueholder/TestSampleHandling.java:54-55`), a free-text note about specimen handling; and `InventoryItem.stability_after_opening` (an Integer, feeding `InventoryLot.calculated_expiry_after_opening`), i.e. reagent open-vial life. Neither is a stability study: no protocol, no timepoints, no storage-condition arms, no pull schedule.

**12. Reserve sample / retain tracking — storage is core, retention is not modelled.** The `storage` package (first commit 2025-11-14, in 3.2.2.0) has `StorageRoom`, `StorageDevice`, `StorageShelf`, `StorageRack`, `StorageBox`, `SampleStorageAssignment`, `SampleStorageMovement` — a full hierarchy plus a movement log. But I found no retention-period, retain-until, or scheduled-disposal field anywhere in it, and no retain/reserve concept distinct from ordinary storage. (Contrast SENAITE, where retention is precisely the thing being added to `senaite.storage` in unreleased 2.7.0.)

**13. Report issuance and amendment — issuance core; a genuine amendment model exists but is unreleased and deployment-specific.** Two layers here, and the distinction matters.

*In the released product:* issuance is tracked but the document is not retained. `reports/valueholder/DocumentTrack.java` has fields `id`, `recordId`, `tableId`, `documentTypeId`, `parent` (a `ValueHolder` pointing at another `DocumentTrack`), `reportTime`, `documentName` — **no content blob**. Rows are inserted, never updated, at each issuance (`reports/action/util/ReportUtil.java:121-141` builds `new DocumentTrack()` objects and calls `documentTrackService.insertAll(documents)`; `common/services/ReportTrackingService.java:64-75` does the single-document equivalent; `scheduler/independentthreads/SuccessReportHandler.java:74,95` for scheduled sends). `ReportHistoryService` (`common/services/historyservices/ReportHistoryService.java:38-53`) reads all `DocumentTrack` rows for a sample and joins them to the generic `history` audit table. So OpenELIS keeps an **append-only log that a report was issued, when, and under what name — but not the report as issued.** Correction is flagged on the analysis: `Analysis.correctedSincePatientReport` (a boolean, `analysis/valueholder/Analysis.java:89`), set in `result/controller/LogbookResultsController.java:569-571` and `result/action/util/ResultUtil.java:404-406` when a result is edited after the report went out.

*In the unreleased `compliance` module (commit `be3cd7a0`, 2026-08-21, **not** in 3.2.2.0):* there is a complete certificate-amendment model, and it is the closest analogue to a CoA reissue found in either system. `Sample` gains three fields — `amendsLhuNumber`, `amendmentNumber`, `amendmentReason` (`sample/valueholder/Sample.java:46-48`). `LhuAmendmentService` documents the contract in its interface Javadoc:

> `applyLhuAmendment(Long sampleId, String priorCertificateNumber, String reason)` — "Records a report-level amendment on the sample. Increments amendmentNumber (null → 1, N → N+1), **stores the prior certificate number and the reason**."
> `certificateNumberWithAmendmentSuffix(...)` — "Returns the certificate number with an **/Am.N** suffix appended when amendmentNumber >= 1. Preserves any existing /R revision suffix."
> `hasBeenReleased(Long sampleId)` — "Returns true if the sample has at least one analysis bearing a VALIDATED_AND_RELEASED electronic signature, which is the authoritative release marker … **Generation count is NOT used — previews trigger generation without constituting a release.**"

`LhuAmendmentServiceImpl.applyLhuAmendment` throws `IllegalArgumentException("Amendment reason must not be blank")` — the reason is mandatory at the service layer.

And the issued document *is* retained, immutably. `ComplianceReportArchive` is a JPA entity on table `clinlims.compliance_report_archive` with a **unique constraint on `(sample_id, amendment_number)`** (`uq_compliance_report_archive_sample_amendment`) and columns `pdf_content byte[] NOT NULL`, `sha256_hash CHAR(64) NOT NULL`, `generated_at`, `generated_by_user_id`. `ComplianceReportArchiveServiceImpl.archiveIfAbsent()` looks up the existing `(sampleId, amendmentNumber)` row and **returns it unchanged if present**, only creating and hashing a new row when absent. The REST controller stamps `"Amendment No.: N"` into the PDF body and names the download `LH-<accession>-Am<N>.pdf` (`compliance/controller/rest/ComplianceReportRestController.java:400,440-442`).

So: each amendment gets its own number, its own suffixed certificate identifier, its own hashed archived PDF, and a recorded reason and prior certificate number; earlier amendments are protected by a uniqueness constraint plus an if-absent-only write path.

**Two honest caveats on this finding.** First, it is **not released** — it entered `develop` on 2026-08-21, three days after the 3.2.2.0 tag of 2026-08-18, and is absent from that tag. Second, it is **deployment-specific**: "LHU" is *Laporan Hasil Uji* (Indonesian for test-result report), the module's class comment reads "Laporan Hasil (LHU) compliance certificate report", `ComplianceStandard`'s comment scopes it to "regulatory compliance standards for **environmental and vector testing**", and the introducing commit is titled "Sync/demo **silnas** into develop". It should be read as one national deployment's certificate requirements landing in the shared codebase, not as OpenELIS's general report model.

**14. Sample storage location and movement — core.** See item 12: `StorageRoom → StorageDevice → StorageShelf → StorageRack → StorageBox`, with `SampleStorageAssignment` and `SampleStorageMovement`. Plus `coldstorage` for temperature monitoring of the devices.

---

## C. Bika LIMS — lineage and liveness

**Bika LIMS and SENAITE core are the same codebase; the name changed.** The most direct evidence: `curl -sI https://github.com/senaite/bika.lims` returns `HTTP/2 301` with `location: https://github.com/senaite/senaite.core`. GitHub only issues that redirect for a repository that was renamed, so `senaite/bika.lims` *is* `senaite/senaite.core`. This is corroborated inside the clone: the source tree still has a `src/bika/lims/` package alongside `src/senaite/core/`, and most of the content types cited throughout §A live under `src/bika/lims/content/`.

**The original Bika line is dead; the Bika *name* is alive as a downstream distribution.** Three separate repositories, three different statuses:

1. `bikalims/bika.lims.legacy` — **archived** (`archived: true`), last five commits are all "Update README.rst" / "Delete CNAME", newest 2026-02-16, with no code change since at least 2024-10-29. Its README, in full: *"The bika.lims.legacy is not maintained. Fo[r] the current release, visit https://github.com/bikalims/bika.lims"*.

2. `bikalims/bika.lims` — not a LIMS codebase at all. Created 2025-08-03, described as "🐳 Ingwe Bika LIMS 4 – Docker Suite", last push 2026-04-13. Its README states the project's own position, and it contains the only explicit **"outside SENAITE's own scope"** statement I found anywhere:

> "With the release of Ingwe Bika LIMS 4, bika.lims hosts a docker suite of Bika add-ons to the Senaite core. Bika LIMS has been packaged for years like that already. We contributed to and developed Senaite improvements, and commissioned by generous clients, **a number of products that fell outside Senaite's own scope**. These are all publicly available as Senaite add-ons [and] have grown to a substantial set of enhancements, enough to justify a Bika release, for which the bika.lims repo is needed. — The Bika Team"

3. The `bikalims` org's add-on repositories — a live third-party add-on ecosystem layered on SENAITE core: `bika.coa`, `bika.ui`, `bika.extras`, `bika.seedlab`, `bika.aquaculture`, `bika.dairy`, `bika.wine`, `bika.concrete`, `bika.equine`, `bika.reports`, `bika.qmanager` ("Extends senaite.queue"), `senaite.sampleimporter`, `senaite.receivedemail`, `senaite.samplepointlocations`, `senaite.timeseries`, `senaite.crms`, `senaite.clientdivisions`, `senaite.batch.invoices`, `senaite.locationsync`, plus their own forks of `senaite.core`/`senaite.impress`/`senaite.storage`/`senaite.instruments`. `bika.health` (2022-06-06) and `baobab.lims` (2022-06-30) are stale.

**So for every workflow in the table, "Bika LIMS" gives the same answer as SENAITE, because it is SENAITE.** The one place the Bika line adds something specific to this ticket is item 13, and it adds *rendering*, not *model*: `bikalims/bika.coa` ("Bika specific COAs", created 2019-05-07, latest release **v2.6.0, 2025-08-09** — maintained, and released more recently than any repo in the `senaite` org). Its README describes it as "a collection of professional, ISO 17025-compliant Certificate of Analysis templates", listing single- and multi-sample layouts, publication-specification support with fallback to the analysis specification, accredited-method indicators, uncertainty values, and — explicitly — "**Verifier signature (instead of Publisher) – compliant with ISO 17025**". It requires `senaite.impress` to render. It contains no amendment, supersession or reissue mechanism; it changes what the PDF looks like, not what happens when a corrected one is issued.

---

## The pattern across the systems

Stated as observation, not recommendation.

**The periphery splits into three distinct groups, and the split is not where "core vs add-on" would predict.**

*Group 1 — absent from both mature systems, and from SENAITE's entire public add-on ecosystem: analyst training/qualification records (item 9) and stability study management (item 11).* Neither system has a single line of domain code for either. For training this is notable given both projects care about accreditation (ISO 17025 for SENAITE, ISO 15189 for OpenELIS) and both regimes require competency records — they model *authorisation* (roles, sections, permissions) and stop there. For stability, the absence is explained by neither system serving pharmaceutical manufacturing.

*Group 2 — each system has exactly one of the two big "consumables and equipment" peripheries, and neither has both.* SENAITE puts instrument calibration, certification, validation and maintenance-task scheduling in its **core** (five content types, with an `isValid()` fitness computation feeding the UI) and has **no reagent inventory at all** — not in core, not in any add-on, not anywhere in 189 repositories matching its name. OpenELIS is the exact mirror: a complete reagent inventory with lots, a quantity ledger and test-linked consumption in its **core**, and **no calibration or maintenance model whatsoever** — calibration appears only as an enum constant describing a corrective action taken after a freezer alarm. That is a clean inversion, and it tracks the two deployment contexts: a lab whose costs are instrument time versus a lab whose costs are test kits.

*Group 3 — reference-standard/control-material lot control is in the core of both*, but in both it is lot identity, expected values and expiry, **not quantity**. SENAITE's `ReferenceSample` has `LotNumber`, `ExpiryDate`, `DateOpened`, `DateDisposed`, expected values and a `current/expired/disposed` workflow, with no quantity field at all. OpenELIS's `QCControlLot` has lot number, manufacturer mean/SD, activation and expiry. Both systems treat a control material as *a thing that has an identity, an expected behaviour and a shelf life*, and neither treats it as *a thing you have a quantity of*.

**On item 13, the question asked most sharply, the systems diverge — and the divergence is between "preserve by accumulation" and "preserve by modelling".**

SENAITE preserves the prior report **without any amendment concept**: every publication calls `api.create(...)` on a new `ResultsReport` object holding its own PDF blob and send log, with no update path, so the old one survives simply because nothing ever touches it. The correction relationship SENAITE does model runs **sample → retest sample** (`invalidate` → `create_retest` → an `Invalidated` back-reference), and the printed output inherits it as a banner reading "This Analysis Request has been invalidated due to erroneously published results … replaced by [ID]". There is no amendment number, no mandatory reason, no revised certificate identifier; `grep -rni "amend"` across SENAITE core and impress returns zero.

OpenELIS's released product does the opposite: it logs **that** a report was issued (`DocumentTrack`, append-only, with a `parent` link) but **does not keep the document**, and marks corrections with a bare boolean on the analysis (`correctedSincePatientReport`).

The only place in the survey where a system does both — preserves the issued document *and* models the amendment — is OpenELIS's unreleased, nationally-scoped `compliance` module: an incrementing `amendmentNumber`, a mandatory `amendmentReason`, a stored `amendsLhuNumber` (the prior certificate number), a `/Am.N` certificate-number suffix, and a `compliance_report_archive` table with a unique constraint on `(sample_id, amendment_number)` holding the PDF bytes and their SHA-256 — written only via an `archiveIfAbsent` path that returns the existing row rather than overwriting it. That it took a specific national regulator's requirement to produce this, in a single commit, three days after the last release, is itself the finding: **a mature open LIMS core does not arrive with CoA amendment modelled; it acquires it when a particular regulator demands it.**

**Finally, a scope-boundary datum from the ecosystem rather than the code.** The one explicit statement any project makes about deliberate scope is the Bika team's, describing their own add-ons as "a number of products that **fell outside Senaite's own scope**" — a downstream vendor's account of where the upstream core stopped, offered without the upstream ever publishing a scope statement of its own. SENAITE's website makes no out-of-scope claim at all, and `https://www.senaite.com/docs` returns HTTP 404.

## What I could not establish

- **Any explicit, project-authored "out of scope" statement from SENAITE or OpenELIS.** I checked senaite.com (no such statement; `/docs` is a 404), the `senaite.core` README and `CHANGES.rst`, and OpenELIS's `docs/about.md` and `mkdocs.yml` nav. The only scope statement I found is second-hand, from the Bika team about SENAITE (§C). Absence of a scope statement is not evidence of intent either way, and I am not inferring one.
- **Whether SENAITE's instrument-validity warning ever hard-blocks result submission.** I established that invalid instruments are filtered out of the selection vocabularies and that a `"warning"`-severity status message is raised on worksheets whose analyses use one, with text asserting "Results edition not allowed". I did **not** find a workflow guard enforcing that on the `submit` transition, and I did not trace the listing/UI layer far enough to say whether the field is actually made read-only. The message's wording and the code's behaviour may not agree; I could not settle it from the source I read.
- **Whether OpenELIS's `compliance` module will survive into a release, or be reverted as deployment-specific.** It is one commit old relative to my clone, arrived via a branch named "demo silnas", and is not in any tag. I found no roadmap, issue or design document stating its intended fate. Treat it as evidence of what one deployment needed, not as an OpenELIS feature.
- **What the `revision` string field on OpenELIS's `Sample` and `Analysis` means.** It exists on both valueholders. I found no code assigning it, incrementing it, or reading it for a versioning purpose, and no comment explaining it. It may be legacy from OpenELIS 1.x. I am not claiming it is or is not a specification/report version.
- **Whether SENAITE's `senaite.core` 2.7.0 will ship any of the periphery.** My clone is ~17 months past the 2.6.0 release. I read the current `CHANGES.rst` header only; I did not read the full unreleased changelog for 2.7.0 line by line, so a periphery feature added in the last few months could in principle have escaped my greps — though the greps were run against the HEAD source tree, not the release, so anything already committed would have matched.
- **How widely any of the optional pieces are actually deployed.** Release dates and commit activity tell me a package is maintained; they tell me nothing about whether real laboratories install `senaite.storage` or use `bika.coa`. No primary source I have access to settles that.
- **Anything about commercial pharmaceutical LIMS products.** The brief scoped this to open systems with inspectable sources, and I did not look at vendor documentation, which would in any case be marketing material rather than a primary source for what is actually implemented.

## Sources

All accessed 2026-09-11.

**SENAITE**
- `senaite/senaite.core` — clone, HEAD `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), `CHANGES.rst` = `2.7.0 (unreleased)`; released 2.6.0 2025-04-04. https://github.com/senaite/senaite.core
  - `src/bika/lims/content/analysisrequest.py` (esp. 1326-1345, 1497-1552), `abstractanalysis.py` (128-169), `analysisspec.py`, `referencesample.py`, `arreport.py`, `worksheet.py`, `bikasetup.py` (486-510, 1360), `instrument.py` (478-486, 547-649), `instrumentcalibration.py`, `instrumentcertification.py`, `instrumentvalidation.py`, `instrumentmaintenancetask.py`, `instrumentscheduledtask.py`
  - `src/bika/lims/workflow/analysisrequest/events.py` (86-92)
  - `src/bika/lims/browser/worksheet/views/results.py` (184)
  - `src/senaite/core/content/` — `resultsreport.py`, `method.py`, `calculation.py`, `labproduct.py`, `storagelocation.py`, `dynamicanalysisspec.py`, `senaitesetup.py`
  - `src/senaite/core/browser/worksheets/worksheet/manage_results.py` (200-220); `src/senaite/core/browser/modals/analysis/vocabularies.py` (78), `.../form.py` (302)
  - `src/senaite/core/profiles/default/workflows/{senaite_sample,senaite_analysis,senaite_worksheet,senaite_referencesample,senaite_instruments}_workflow/definition.xml`
  - `src/senaite/core/exportimport/instruments/` (presence of in-core instrument interfaces)
- `senaite/senaite.impress` — clone, HEAD `889778c9605d5345316f0b10767da49792b1b731` (2026-07-27); released 2.6.0 2025-04-04. `src/senaite/impress/storage.py` (96-134); `src/senaite/impress/analysisrequest/templates/alerts.pt` (7-16). https://github.com/senaite/senaite.impress
- `senaite/senaite.storage` — clone, HEAD `704e172f490b48811bb4eacc6201ca0a857cc9a7` (2026-07-31); released 2.6.0 2025-04-04; `CHANGES.rst` `2.7.0 (unreleased)` entries #61-#75. `src/senaite/storage/api.py` (75, 82, 176), `setuphandlers.py` (89), `upgrade/v02_07_000.py` (525-546), `content/`, `profiles/default/workflows/senaite_storage_default_workflow/definition.xml`, `tests/doctests/RetentionPeriod.rst`. https://github.com/senaite/senaite.storage
- `senaite/senaite.instruments` — clone, HEAD `fd30695868b23f03f99a9d034b8cc3c5defa9e9b` (2022-05-20); no GitHub releases; PyPI 1.0.0 2021-11-09; `CHANGES.rst` `1.0.0 (unreleased)`. https://github.com/senaite/senaite.instruments
- GitHub REST API: `orgs/senaite/repos?per_page=100&sort=pushed` (41 repos, with `archived` and `pushed_at`); `repos/senaite/<name>/releases` for release tags and dates; `search/repositories?q=...` for the absence checks (`senaite inventory|reagent|stability|calibration` → `total_count: 0`; `senaite` → 189, enumerated).
- PyPI JSON API: `pypi.org/pypi/{senaite.core,senaite.lims,senaite.impress,senaite.storage,senaite.instruments,senaite.archive}/json`.
- https://www.senaite.com/ (project feature framing). https://www.senaite.com/docs → **HTTP 404**.

**OpenELIS Global 2**
- `I-TECH-UW/OpenELIS-Global-2` — full clone, HEAD `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10), branch `develop`; latest release tag **3.2.2.0, 2026-08-18**. https://github.com/I-TECH-UW/OpenELIS-Global-2
  - `docs/about.md`, `mkdocs.yml`
  - `src/main/java/org/openelisglobal/` package listing (~150 packages)
  - `sample/valueholder/Sample.java` (37-62); `analysis/valueholder/Analysis.java` (45-89, 517-521); `result/valueholder/Result.java`
  - `inventory/valueholder/{InventoryItem,InventoryLot,InventoryTransaction,InventoryUsage,InventoryStorageLocation,InventoryEnums}.java`
  - `testreagentlink/valueholder/TestReagentLink.java`
  - `qc/valueholder/QCControlLot.java` and siblings
  - `qaevent/valueholder/NcEvent.java` and the ~75-file `qaevent` package
  - `esig/valueholder/{ElectronicSignature,EsigFirstUseCertification}.java`
  - `storage/valueholder/`, `coldstorage/valueholder/{Freezer,FreezerReading,CorrectiveActionType}.java`
  - `sampleacceptance/`, `resultvalidation/`, `workplan/` (controllers/reports only, no valueholder)
  - `reports/valueholder/DocumentTrack.java`; `reports/action/util/ReportUtil.java` (121-141); `common/services/ReportTrackingService.java` (64-75); `common/services/historyservices/ReportHistoryService.java` (25-53); `scheduler/independentthreads/SuccessReportHandler.java` (74, 95)
  - `result/controller/LogbookResultsController.java` (569-571); `result/action/util/ResultUtil.java` (404-406)
  - `common/util/ConfigurationProperties.java` (60); `common/controller/DatabaseCleaningRestController.java` (49)
  - `compliance/` — commit `be3cd7a0ebdbbf6e428fc216be1d124a1b5f8f45` (2026-08-21, "Sync/demo silnas into develop (#3946)"), **absent at tag 3.2.2.0**: `valueholder/{ComplianceReportArchive,ComplianceStandard,ThresholdType}.java`, `service/{LhuAmendmentService,LhuAmendmentServiceImpl,ComplianceReportArchiveService,ComplianceReportArchiveServiceImpl}.java`, `controller/rest/ComplianceReportRestController.java` (49-62, 285, 371-442)
  - Module-age evidence: `git log --reverse --format=%ci -- <package>` per package; presence-at-release via `git cat-file -e 3.2.2.0:<path>`
- GitHub REST API: `repos/I-TECH-UW/OpenELIS-Global-2/releases` (3.2.2.0 2026-08-18, 3.2.1.11 2026-07-14, 3.2.1.10 2026-06-04).

**Bika LIMS**
- `HEAD https://github.com/senaite/bika.lims` → `HTTP/2 301`, `location: https://github.com/senaite/senaite.core` (rename evidence).
- `bikalims/bika.lims.legacy` — `archived: true`, last push 2026-02-16; README via GitHub API; commit list showing README-only changes since 2024-10-29. https://github.com/bikalims/bika.lims.legacy
- `bikalims/bika.lims` — created 2025-08-03, "🐳 Ingwe Bika LIMS 4 – Docker Suite", last push 2026-04-13; README (the "fell outside Senaite's own scope" statement). https://github.com/bikalims/bika.lims
- `bikalims/bika.coa` — created 2019-05-07, last push 2026-07-29; releases v2.6.0 **2025-08-09**, v2.5.0 2024-04-01, bika.coa-1.0.1 2020-11-30; README (CoA template feature list, ISO 17025 verifier-signature note, requires senaite.impress, GPLv2). https://github.com/bikalims/bika.coa
- GitHub REST API: `orgs/bikalims/repos?per_page=100&sort=pushed` (full repo list with push dates).

**This repository**
- `docs/research/senaite-sample-and-assignment-model.md:9-38` (prior findings on SENAITE assignment granularity and the auditlog snapshot mechanism, relied on for items 3 and 2 rather than re-derived).
