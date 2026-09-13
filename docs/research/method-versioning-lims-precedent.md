# How SENAITE and OpenELIS model method/specification administration: versioning, draft→approved, approver, effective date, supersession, register

**Asked by:** the orchestrator (Benchline wayfinder map)
**Date:** 2026-09-11
**Status of sources:** Source read directly, not documentation.

- **SENAITE** — `github.com/senaite/senaite.core`, shallow clone of branch `2.x` at commit `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10). `setup.py:24` declares `version = "2.7.0"`; GS profile metadata version 2757 (`src/senaite/core/profiles/default/metadata.xml`). This is the live default branch.
- **OpenELIS** — `github.com/I-TECH-UW/OpenELIS-Global-2`, shallow clone of branch `develop` at commit `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10). This repository is live (default branch `develop`, commits within a day of reading). Some findings below are on `develop` and I did **not** establish which tagged release they are in — flagged individually.

All paths below are relative to the respective upstream repository root, not to this repo.

---

## 1. The method / analysis-service entity, and where limits and rounding live

### SENAITE

Four distinct types, all still Archetypes except `Method`:

| Type | File | Base |
|---|---|---|
| `AnalysisService` | `src/bika/lims/content/analysisservice.py`, schema in `src/bika/lims/content/abstractbaseanalysis.py` | Archetypes |
| `Method` | `src/senaite/core/content/method.py` (`IMethodSchema`, class `Method(Container)`) | Dexterity |
| `AnalysisSpec` | `src/bika/lims/content/analysisspec.py` | Archetypes |
| `DynamicAnalysisSpec` | `src/senaite/core/content/dynamicanalysisspec.py`, legacy AT at `src/bika/lims/content/dynamic_analysisspec.py` | Dexterity |

**Acceptance limits** live on `AnalysisSpec`, in a single `ResultsRangesField("ResultsRange")` (`analysisspec.py:86-105`) — a records field of `ResultsRangeDict` (`analysisspec.py:147+`) keyed by service UID with `min`, `max`, `warn_min`, `warn_max`, `error`, `min_operator`, `max_operator`. `AnalysisSpec` also carries a required `SampleType` reference and an optional `DynamicAnalysisSpec` reference (`analysisspec.py:44-82`). There is no per-limit row: the whole range table is one field value on one object.

**Rounding / significant figures** live on the *service*, not the spec — `abstractbaseanalysis.py`: `Precision` (line 172), `ExponentialFormatPrecision` (line 184), `PrecisionFromUncertainty` (line 658), plus `LowerDetectionLimit` (197), `LowerLimitOfQuantification` (221), `UpperLimitOfQuantification` (246), `UpperDetectionLimit` (269), `Uncertainties` (609). So limits and rounding live on **different objects** with different lifecycles.

`Method` (`src/senaite/core/content/method.py:71-186`) carries only: `title`, `method_id` (uniqueness enforced by a Python-loop `@invariant`, lines 186-205, because "there is no `method_id` catalog index"), `description`, `accredited` (bool), `instructions` (rich text), `method_document` (single `NamedBlobFile`), `instruments`, `calculations`, `calculation`. **No version field, no effective date, no owner, no approver, no status beyond active/inactive.**

### OpenELIS

| Entity | File | Table |
|---|---|---|
| `Test` | `src/main/java/org/openelisglobal/test/valueholder/Test.java` | `TEST` |
| `Method` | `src/main/java/org/openelisglobal/method/valueholder/Method.java` | `METHOD` |
| `TestMethod` (join) | `src/main/java/org/openelisglobal/testmethod/valueholder/TestMethod.java` | test↔method link |
| `ResultLimit` | `src/main/java/org/openelisglobal/resultlimits/valueholder/ResultLimit.java` | `RESULT_LIMITS` |
| `TestResult` | `src/main/java/org/openelisglobal/testresult/valueholder/TestResult.java` | `TEST_RESULT` |

**Acceptance limits** live in `ResultLimit` (`ResultLimit.java:9-29`): `testId`, `resultTypeId`, `gender`, `minAge`/`maxAge`, `lowNormal`/`highNormal`, `lowValid`/`highValid`, `lowCritical`/`highCritical`, `lowReportingRange`/`highReportingRange`, `dictionaryNormalId`, `alwaysValidate`, `componentId`, `sampleTypeId`. This is genuinely **row-per-limit** (one row per test × gender × age-band × sample type), unlike SENAITE's single blob field. Mapping: `src/main/resources/hibernate/hbm/ResultLimit.hbm.xml`.

**Rounding / significant figures** live on `TestResult.significantDigits` (`TestResult.java:33`), i.e. on the result-option row, not on the test or the limit.

**Method** (`Method.java:27-45`): `methodName`, `description`, `reportingDescription`, `activeBeginDate`, `activeEndDate`, `isActive`, `code`, `localization`. Columns `ACTIVE_BEGIN` / `ACTIVE_END` are really persisted — `src/main/resources/hibernate/hbm/Method.hbm.xml`. `Test` has the same pair (`Test.java:80-86`, mapped at `Test.hbm.xml:87-92`).

---

## 2. Version history on the method or specification

### SENAITE — no object versioning on either; an audit trail instead, and the versioning was deliberately removed

- There is **no `repositorytool.xml`** in `src/senaite/core/profiles/default/`. The only references to Plone's `portal_repository` in the whole of `src/` are two upgrade steps that *remove* types from it:
  - `src/senaite/core/upgrade/v02_00_000.py:683-704`, `remove_services_from_repositorytool()` — "Remove auto versioning for Analysis Services", pops `AnalysisService` from `rt._version_policy_mapping`, removes it from `getVersionableContentTypes()`, and strips the `IVersioned` marker from every existing service. Called from the 2.0 upgrade at `v02_00_000.py:221-223`, citing `senaite.core` PR #1708.
  - `src/senaite/core/upgrade/v02_07_000.py:942-959`, `remove_calculations_from_repositorytool()` — the same for `Calculation`, as part of its Dexterity migration.
- So: **SENAITE itself declined CMFEditions versioning for the analysis service.** Benchline's own earlier decision to decline object-versioning matches what upstream did, for whatever that is worth.
- `AnalysisSpec` still *inherits* `Products.ATContentTypes.lib.historyaware.HistoryAwareMixin` (`analysisspec.py:35, 114`), as do `SampleType`, `SamplePoint`, `StorageLocation`, `Calculation`, `Worksheet`. With no type registered in the repository tool, the mixin has nothing to show. I did **not** establish whether an out-of-the-box Plone install leaves any of these in the default versionable-types list — the SENAITE profile does not add them.
- What SENAITE *does* have is the **audit-log snapshot**: `src/senaite/core/api/snapshot.py`. `take_snapshot()` appends a full JSON field-dump to a `PersistentList` in the object's annotation storage; the subscriber `src/senaite/core/subscribers/auditlog.py` (`ObjectModifiedEventHandler`, `ObjectTransitionedEventHandler`, `ObjectInitializedEventHandler`) fires it on every edit and transition. Eligibility is broad: `supports_snapshots()` (`snapshot.py:55-65`) returns true for *anything* annotatable not marked `IDoNotSupportSnapshots` — so `AnalysisService`, `AnalysisSpec`, `Method` and `Calculation` all accumulate snapshots.
- `snapshot.py:114-123` defines `get_version(obj) = snapshot_count - 1`, re-exported as `bika.lims.api.get_version` (`src/bika/lims/api/__init__.py:1560-1569`). **A version number therefore exists** — but it is derived from the audit log, it is not a state, and nothing resolves a limit by it.
- Editing a limit **overwrites** it. `ResultsRange` is one Archetypes field on one object; a save replaces the field value and appends an audit snapshot. No new row, no new object.

### OpenELIS — in-place update plus a change-delta history table

- `TestServiceImpl` (`test/service/TestServiceImpl.java:54`), `ResultLimitServiceImpl` (`resultlimit/service/ResultLimitServiceImpl.java:52`) and `MethodServiceImpl` (`method/service/MethodServiceImpl.java:18`) all extend `AuditableBaseObjectServiceImpl`.
- `common/service/AuditableBaseObjectServiceImpl.java:102-112` — `update()` fetches the old row, evicts it, writes a `History` row via `auditTrailService.saveHistory(...)`, then does `super.update(baseObject)`. **The row is updated in place.**
- `History` (`audittrail/valueholder/History.java:25-31`): `referenceId`, `referenceTable`, `timestamp`, `activity`, `changes` (a `byte[]` delta blob), `sys_user_id`. It is gated on `REFERENCE_TABLES.KEEP_HISTORY` (`audittrail/daoimpl/AuditTrailServiceImpl.java:76, 137`). The seed data sets `keep_history = 'Y'` for `TEST` (id 5), `METHOD` (id 12) and `RESULT_LIMITS` (id 154) — `db/dbInit/OpenELIS-Global.sql:15012+`.
- So OpenELIS has a **who-changed-what audit trail** over method and limit rows, and no version register. Nothing reads `History` to resolve a limit.
- `Test`, `Method`, `ResultLimit` and `TestMethod` all carry a Hibernate `<version name="lastupdated" .../>` column — that is **optimistic locking**, not a version history.

**Neither system versions a specification.** Both keep an audit trail of the overwrite.

---

## 3. Draft → approved state machine

### SENAITE — no. Two states, active/inactive, and edit is ungoverned

`src/senaite/core/profiles/default/workflows.xml` binds `AnalysisService` (line 181), `AnalysisSpec` (line 184), `Method` (line 235), `Calculation` (line 196) and `DynamicAnalysisSpec` (line 208) **all** to `senaite_deactivable_type_workflow`.

That workflow (`.../workflows/senaite_deactivable_type_workflow/definition.xml`) has exactly two states — `active` (initial) and `inactive` — and two transitions, `activate` / `deactivate`, guarded by the permissions `senaite.core: Transition: Activate` / `Deactivate` (held by `LabManager`, `Manager`, `Owner` — `rolemap.xml:772-781`). There is no `draft`, no `pending`, no `approve`.

Crucially, the workflow sets `Modify portal content` to `acquired="True"` in **both** states. Editing is therefore governed only by the portal-level `Modify portal content` permission, held by `LabClerk`, `LabManager`, `Manager`, `Owner` (`rolemap.xml:80-85`). **A LabClerk with edit rights can change an acceptance limit and it is live on save.** There is no transition, no guard, no second signature.

The one exception is *assigning* a specification to a sample, which is guarded by `FieldEditSpecification` (`analysisrequest.py:688, 722`) — but that governs the sample, not the spec object.

### OpenELIS — no draft on Test/Method; a DRAFT state exists on a different, adjacent entity

- `Test.isActive` and `Method.isActive` are one-character `'Y'`/`'N'` flags (`Method.hbm.xml`, `Test.hbm.xml:84`). There is no draft state.
- `testcatalog/controller/rest/TestCatalogActivationRestController.java` (`develop`; header comments cite OGC-949/OGC-973/FR-57) adds an **activation gate**, not an approval: `POST /rest/test-catalog/tests/{testId}/activate`, class-level `@PreAuthorize("hasRole('ADMIN')")`. It runs `checkCompleteness(test)` (422 with a machine-readable gap list if incomplete), then a reference-range coverage check (409 if age windows are uncovered and unacknowledged). On pass it does `test.setIsActive("Y"); test.setOrderable(TRUE); testService.update(test)` — immediate, same actor, same role. An acknowledgment of coverage gaps is recorded as `TestActivationAcknowledgment` (`testactivation/valueholder/TestActivationAcknowledgment.java`: `testId`, `userId`, `acknowledgedAt`, `gapsAcknowledged`) — the nearest thing to a signed decision anywhere in either system, but it records *an override*, not an approval.
- **The real draft/approved machine in OpenELIS is on `ComplianceStandard`**, not on a test or method: `compliance/valueholder/ComplianceStandard.java:457-476` defines `enum ComplianceStandardStatus { DRAFT, ACTIVE, SUPERSEDED, ARCHIVED, SUSPENDED }`, default `DRAFT` (line 114). This entity is a regulatory threshold standard for environmental/water compliance, not an analytical method spec — but it is the only place either codebase carries a spec lifecycle. Details in §5 and §8.

---

## 4. Effective date / future-dated activation

### SENAITE — none. The only date fields are Plone's, and they are hidden

- Plone's Dublin Core `effectiveDate` exists on every SENAITE content object via the schema base, and SENAITE **hides it**: `src/bika/lims/content/bikaschema.py:34` `BikaSchema['effectiveDate'].widget.visible = False`, and line 53 the same for `BikaFolderSchema`. It is surfaced only for `Pricelist` (`content/pricelist.py:93`).
- No `Method`, `AnalysisService`, `AnalysisSpec` or `DynamicAnalysisSpec` field carries an effectivity date.
- **No scheduler.** There is no clock-server, cron registration or `@@`-view that performs a timed transition anywhere in `src/senaite/core/`. The only `cron` mention is a docstring in `z3cform/widgets/multiupload/storage.py:208` about pruning temp uploads.
- This is consistent with the map's prior finding that every SENAITE validity check is hardcoded to `now()`.

### OpenELIS — three separate date fields exist; **none of them gates anything**

1. **`Method.activeBeginDate` / `activeEndDate`** (`Method.java:35-41`, columns `ACTIVE_BEGIN`/`ACTIVE_END`) and the identical pair on `Test` (`Test.java:80-86`). A repository-wide grep for `ActiveBeginDate` / `active_begin_date` returns **only the getters and setters in the value-holders and the hbm mappings** — no query, no comparison, no business logic anywhere in `src/main`. They are dead columns.
2. **`TestMethod.effectiveDate`** (`testmethod/valueholder/TestMethod.java:34`) — the test↔method link carries a required effective date (the REST controller rejects a missing or malformed one with 422: `testmethod/controller/rest/TestMethodRestController.java:76-80`). But `TestMethodDAOImpl.getActiveTestMethodsByTestId` (`testmethod/daoimpl/TestMethodDAOImpl.java:23`) is:
   `from TestMethod tm where tm.testId = :testId and tm.isActive = 'Y' order by tm.effectiveDate`
   — it **orders by** the date and never compares it to today. Selection is driven by `isDefault` (`TestMethodServiceImpl.linkMethod/updateLink` clear other defaults, lines 61-78; order entry reads `isDefault` at `common/rest/provider/SampleEntryTestsForTypeProviderRestController.java:515-526`). A future-dated link is selectable immediately. The date is display and sort order only.
3. **`ComplianceStandard.effectiveDate` / `expiryDate`** (`ComplianceStandard.java:81-84`) — likewise never compared. `ComplianceStandardServiceImpl.getActiveComplianceStandards()` (line 79-81) is `baseObjectDAO.getStandardsByStatus(ACTIVE)`: status only, no date predicate. No date predicate appears in `compliance/dao/` or `compliance/daoimpl/`.

**No scheduled job performs a dated transition in either system.** OpenELIS has a `CronScheduler` (`scheduler/daoimpl/CronSchedulerDAOImpl.java`) but nothing registered against it touches method or limit effectivity that I found.

---

## 5. Supersession and withdrawal

### SENAITE

- Withdrawal = `deactivate`, a two-state flip (§3). The prior configuration is not retained as a superseded object; the object *is* the current version.
- **Samples already referencing a deactivated service or spec are unaffected**, because the values were copied onto them at creation (§6). The reference persists as a UID; listings filter setup pickers on `is_active: True` (e.g. `analysisspec.py:57, 76`), so a deactivated object simply stops being offerable.
- There is no supersession pointer anywhere: no `superseded_by` field on any setup type.

### OpenELIS

- Withdrawal = `isActive = 'N'` on `TEST` / `METHOD`; link withdrawal = `TestMethodDAOImpl.deactivateLink` (line 57), `update TestMethod tm set tm.isActive = 'N'`. The `TestMethod` row is retained but carries no end date — the link is soft-deleted, not superseded.
- Existing analyses hold an FK to the same `TEST` row, which was edited in place. A deactivated test is still the row an old analysis points at, and if its limits were edited the old analysis now resolves the new limits (§6).
- **`ComplianceStandard` is the exception and the one real supersession model in either codebase:**
  - `ComplianceStandard.java:114-123` — `status`, `supersededByStandard` (self-reference) and `supersededByStandardId`.
  - `ComplianceStandardServiceImpl.validateStandard` (line 139-142, "BR-004"): status `SUPERSEDED` **must** carry a non-null replacement or the save is rejected.
  - Line 147-150 ("FR-1-007a"): a standard may not go `ACTIVE` without at least one sample type; `DRAFT` may be incomplete; `SUPERSEDED`/`ARCHIVED` "preserve their historical sample types and don't re-validate".
  - `copyStandard()` (line 176-200, "FR-7-004") — deep-copies groups, thresholds and value mappings, forces the copy to `DRAFT`, suffixes `version` with `" - Copy"`, clears `isPreSeeded`. **This is new-row-per-revision.** The natural key is (name, regulationNumber, version).
  - `archive(standardId)` at line 97-101 sets `ARCHIVED`.
  - A parallel, smaller model exists in microbiology: `MicroBreakpointStandard` (`microbiology/valueholder/MicroBreakpointStandard.java`: `authority`, `version`, `effectiveDate`, `isActive`, `lifecycleStatus` default `"LOADED"`, `lastUpdatedBy`) with an append-only `MicroBreakpointActivationEvent` (`standardId`, `action`, `effectiveDate`, `actorId`, `occurredAt`) — e.g. `MicroBreakpointAdminServiceImpl.java:240` writes an `"ARCHIVED"` event. I did **not** trace its full state machine.

---

## 6. Snapshot-at-receipt — the decisive question

### SENAITE — **copies, at sample creation, and says so in a code comment**

This is the strongest result in this scout. SENAITE pins both the range and the service configuration onto the sample and the analysis.

**(a) The range is copied onto the sample.** `src/bika/lims/content/analysisrequest.py:713-724`, the field comment above `ResultsRangesField("ResultsRange")`:

> "Field to keep the result ranges from the specification initially set through `Specifications` field. This guarantees that the result ranges set by default to this Sample won't change even if the Specifications object referenced gets modified thereafter."

**(b) The setter does the pinning.** `analysisrequest.py:1497-1527`, `setSpecification()`:

> "Set the value for field ResultsRange, cause Specification is only used as a template: all the results range logic relies on ResultsRange field, so changes in setup's Specification object won't have effect to already created samples"

It calls `self.setResultsRange(spec.getResultsRange(), recursive=False)`. Note the early return at lines 1500-1506: re-setting the *same* specification UID is a no-op, specifically so an unchanged spec never clobbers ranges already on the sample or on its analyses.

**(c) And onto each analysis.** `analysisrequest.py:1529-1551`, `setResultsRange()` iterates `self.objectValues("Analysis")`, skips anything `ISubmitted`, and calls `analysis.setResultsRange(result_range)` per analysis. `abstractroutineanalysis.py:273-301`: `getResultsRange()` is `self.getField("ResultsRange").get(self)` — a **stored field read, no lookup**. The setter applies the `IDynamicResultsRange` adapter at set time (line 296-299), so even the dynamic spec is resolved once and frozen.

**(d) The whole service configuration is copied too.** `src/bika/lims/utils/analysis.py:40-100`, `create_analysis()` uses `api.copy_object(source, ...)` with `DEFAULT_SKIP_FIELDS = ["Attachment", "ResultCaptureDate", "Worksheet"]` (lines 33-37). Every other schema field — `Precision`, `ExponentialFormatPrecision`, detection limits, `Uncertainties`, `SelfVerification`, `NumberOfRequiredVerifications` — is copied from the `AnalysisService` onto the `Analysis`.

**(e) The calculation is explicitly snapshotted with a version stamp.** `src/bika/lims/content/abstractanalysis.py:132-169` declares `CalculationUID`, `CalculationFormula`, `CalculationImports` and `CalculationVersion` on the analysis; `setCalculation()` (lines 273-316) stamps all four, `version = api.get_version(calc) or 0`. The docstring: "Subsequent edits to the Calculation do not affect analyses that have already been linked." `getCalculation()` (line 253-264) resolves the UID "for display and navigation; formula evaluation uses the snapshotted CalculationFormula field instead." `CalculationVersion` is documented as "Stored for audit display only; not used for formula evaluation."

So SENAITE pins by **copy of values**, plus a display-only version stamp for the calculation, with no stored version stamp for the service or the spec.

### OpenELIS — **resolves live, by test id, at display and evaluation time**; a partial copy happens at *result save*, not at receipt

- `result/service/ResultServiceImpl.java:507-512`:
  ```java
  private List<ResultLimit> getResultLimits(Result result) {
      Test test = result.getAnalysis() != null ? result.getAnalysis().getTest() : null;
      List<ResultLimit> resultLimit = test != null ? resultLimitService.getAllResultLimitsForTest(test.getId())
              : new ArrayList<>();
      return resultLimit;
  }
  ```
  Called from `ageInRangeCriteria` (464), `genderInRangeCritera` (476), `getDisplayReferenceRange` (499) and `isAbnormalDictionaryResult` (519). **Live lookup by test id, at display time, every time.**
- Selection is by *patient*, not by date: `resultlimit/service/ResultLimitServiceImpl.java:184-186`, `getResultLimitForTestAndPatient(testId, patient, sampleTypeId)` = `selectForPatient(scopeToSampleType(getResultLimits(testId), sampleTypeId), patient)`. Sample-type scoping is documented at lines 202-209 ("OGC-1145 Phase 2 — specimen precedence over a limit pool"). No time dimension enters.
- **The partial copy.** `Result` does have `minNormal` / `maxNormal` / `significantDigits` columns (`result/valueholder/Result.java:43-55`). They are set in `common/services/ResultSaveService.java:285-292` (`setNewResultValues`) from `ResultSaveBean.getLowerNormalRange()`, which is round-tripped through the result-entry form from `result/action/util/ResultsLoadUtility.java:1191-1210` (`setResultLimitDependencies`), which itself came from a **live `ResultLimit` lookup at form render**. So the number is frozen onto the result **at result entry**, from whatever the limit table said at that moment — not at sample receipt, and not as a reference to an identified spec version. Analyzer imports do the same at `analyzerresults/service/AnalyzerResultsAcceptServiceImpl.java:899` and calculated tests at `testcalculated/action/util/TestCalculatedUtil.java:280`.
- **The method is pinned late too.** `Analysis.method` exists (`analysis/valueholder/Analysis.java:90`), but `analysis.setMethod(...)` is called only from result entry — `result/controller/LogbookResultsController.java:527, 543` and `result/action/util/ResultUtil.java:299, 336`. Not at order entry.
- **One genuine pin-at-receipt exists, and it is a reference, not a copy:** `sample/service/SamplePatientEntryServiceImpl.java:297-314` writes `SampleComplianceStandard` rows (`sample/valueholder/SampleComplianceStandard.java:25-39`: `sample`, `complianceStandard`, `priority`, `createdDate`) linking the sample to the chosen `ComplianceStandard`. Evaluation then reads `links.get(0).getComplianceStandard().getId()` and looks the thresholds up live from that standard (`compliance/service/ComplianceEvaluationServiceImpl.java:46-52, 65-67`). Because a standard row can still be edited in `ACTIVE` state via `PUT /rest/compliance/standards/{id}` (`ComplianceStandardRestController.java:133-151`), the pin is only as stable as the operator's discipline in copying-to-DRAFT rather than editing in place.

**Summary of Q6:** SENAITE copies values onto the sample and the analysis at creation and documents the intent in the source. OpenELIS resolves limits live from the test row at display/validation time, and freezes only the resulting numbers onto the `Result` row at result entry.

---

## 7. A method register / index view

### SENAITE

`src/senaite/core/browser/controlpanel/methods/view.py:66-93` — the Methods listing columns are exactly:

`Title` (indexed on `sortable_title`) · `Description` · `Instruments` · `Calculations`

`review_states` (lines 97-123): `default` (contentFilter `is_active: True`), `inactive` (`is_active: False`), `all`. No transitions offered in the listing.

`src/bika/lims/controlpanel/bika_analysisspecs.py:74-105` — the Analysis Specifications listing columns are:

`Title` · `SampleType` (indexed `sampletype_title`) · `DynamicSpec`

with the same three `review_states`, offering `deactivate` / `activate`.

**No version column, no effective-date column, no superseded rows, no withdrawal date, in either listing.**

### OpenELIS

`frontend/src/components/admin/testCatalog/TestCatalogList.jsx:195-218` — the test catalog list headers are:

`name` · `sampleType` · `code` · `domain` · `status`

The status filter (line 59) is an all/active/inactive selector. No version, no effective date, no supersession.

`frontend/src/components/admin/testManagementConfigMenu/MethodsSection.jsx` is the closest thing to a method register: a per-test table of linked methods with an **`effectiveDate` column** (header at line 222, cell at line 249) alongside a default-method toggle. Backed by `GET/POST /rest/test/{testId}/methods` (`TestMethodRestController`). It is a per-test listing, not a lab-wide register, and per §4 the date it displays is inert.

---

## 8. Who approves — owner, approver, separation of duties

### SENAITE

- **No person-field owner or approver on `Method`, `AnalysisService` or `AnalysisSpec`.** `IMethodSchema` has no `LabContact`/`Person` reference. `AnalysisService` associates a `Department` (`abstractbaseanalysis.py`), which has a manager, but that is an organisational link, not an approver of the method definition.
- Editing a limit requires only `Modify portal content` — `LabClerk`, `LabManager`, `Manager`, `Owner` (`rolemap.xml:80-85`). Activate/deactivate requires `LabManager`, `Manager`, `Owner` (`rolemap.xml:772-781`). So the only separation on offer is: a clerk may edit a limit freely, but may not deactivate the object. **There is no separation of duties on method administration, and no second signature.**
- Separation of duties *does* exist for results: `SelfVerification` and `NumberOfRequiredVerifications` on the service (`abstractbaseanalysis.py:814, 833`) — but that governs results, not the method.
- The audit-log snapshot records the actor (`subscribers/auditlog.py`, `entry["actor"]`), so *who changed a limit* is recoverable; *who authorised it* is not modelled.

### OpenELIS

- **No owner or approver person-field on `Test` or `Method`.** Every write carries `sysUserId` (enforced by `AuditableBaseObjectServiceImpl.fillSysUserIdIfMissing`, lines 91-100, which throws if there is no user context) and lands in the `History` delta row — again, actor, not approver.
- Test activation: `@PreAuthorize("hasRole('ADMIN')")` on the whole controller (`TestCatalogActivationRestController.java:45`). The same role edits and activates.
- Compliance standards: `@PreAuthorize("hasAnyRole('GLOBAL_ADMIN','RECEPTION','RESULTS')")` at class level, `hasRole('GLOBAL_ADMIN')` on every mutating endpoint including `PUT /{id}` which simply assigns `existing.setStatus(standard.getStatus())` (`ComplianceStandardRestController.java:133-151`). **The DRAFT→ACTIVE transition is an ordinary field write by the same role that authored the draft.** No approver field, no separation.
- The one recorded decision by an identified person is `TestActivationAcknowledgment.userId` / `acknowledgedAt` — an override of a coverage warning, not an approval of a spec.

---

## What neither carries

Neither SENAITE nor OpenELIS models a method or specification *version* as a first-class, addressable, retained entity with a draft→approved transition, an approver distinct from the editor, and a future effective date that a scheduler brings into force — the closest either comes is OpenELIS's `ComplianceStandard`, which has the states (DRAFT/ACTIVE/SUPERSEDED/ARCHIVED/SUSPENDED), a version string, a `supersededByStandard` pointer and copy-to-draft revision, but whose `effectiveDate` is never compared to a date and whose transition is an unguarded field write by the authoring role.

## The X/Y contrast, condensed

| | SENAITE 2.7.0 (`2.x` @ 993f721) | OpenELIS (`develop` @ 672c92a) |
|---|---|---|
| Limit storage | one `ResultsRange` records-field on one `AnalysisSpec` | row-per-limit `RESULT_LIMITS`, scoped by gender/age/sample type |
| Version history | none (CMFEditions actively *removed* for `AnalysisService`, PR #1708); audit snapshots only | none; `history` delta table only |
| Draft→approved | no — `active`/`inactive` only; edit needs only `Modify portal content` | no on `Test`/`Method`; **yes on `ComplianceStandard`** (DRAFT/ACTIVE/SUPERSEDED/ARCHIVED/SUSPENDED) |
| Effective date | **absent** — Plone's `effectiveDate` widget explicitly hidden | **present on three entities and inert on all three** |
| Supersession pointer | none | **`supersededByStandard`, mandatory when status=SUPERSEDED** (compliance standards only) |
| New-row-per-revision | no | **yes for compliance standards** (`copyStandard` → DRAFT) |
| Snapshot at receipt | **yes — copies range onto sample and analysis, plus whole service schema, plus calculation formula + version** | **no — live lookup by test id; numbers frozen onto `Result` at result entry only** |
| Register with version/effective/withdrawal columns | no (Title/Description/Instruments/Calculations) | no (name/sampleType/code/domain/status); per-test method table does show an effective date |
| Approver | none | none |

So the decisive inversion for this question: **SENAITE carries the snapshot-at-receipt and no lifecycle; OpenELIS carries the lifecycle vocabulary (draft, superseded, effective date, versioned register) and no snapshot-at-receipt — and its lifecycle lives on an adjacent entity (`ComplianceStandard`), not on the test or the method, with its dates inert.**

---

## What I could not establish

1. **Which tagged OpenELIS release** contains `TestMethod`, `TestCatalogActivationRestController`, `ComplianceStandard`, `MicroBreakpointStandard` and `SampleComplianceStandard`. I read `develop` at 672c92a. A shallow clone gave me no tags and no history, so I could not date these against a release. Several carry internal ticket references (OGC-949, OGC-973, OGC-1116, OGC-1145) suggesting recent work.
2. **Whether an out-of-the-box Plone 5.2 install leaves any SENAITE type in `portal_repository`'s default versionable-types list.** SENAITE's GS profile ships no `repositorytool.xml` and its only repository-tool code removes types; but Plone's own default list is set by `Products.CMFPlone`, which I did not read. The practical answer for `AnalysisSpec` is almost certainly "no", since `AnalysisService` had to be explicitly removed while `AnalysisSpec` never appears.
3. **The `MicroBreakpointStandard` state machine in full** — `lifecycleStatus` defaults to `"LOADED"` and an `ARCHIVED` activation event is written at `MicroBreakpointAdminServiceImpl.java:240`, but I did not enumerate the legal states or their guards.
4. **Whether OpenELIS's `History.changes` blob is reconstructable into a prior version of a row** (i.e. whether the audit trail could function as a version store). I read the entity and the write path, not the serialisation format or any read path.
5. **Whether SENAITE's audit-log is on by default.** Snapshot-taking is gated on `setup.getEnableGlobalAuditlog()` for the *catalog reindex* (`subscribers/auditlog.py:50-51`, `patches/archetypes/catalog_multiplex.py:33`); I did not establish the shipped default value of that setting, nor whether snapshot *storage* is gated by it.
6. **Client-specific `AnalysisSpec` objects.** SENAITE allows specs inside a Client folder (`analysisspec.py:136-141`, `contextual_title`). I did not establish the resolution order when both a lab-level and a client-level spec exist for the same sample type.
7. **Whether any SENAITE add-on outside `senaite.core`** (e.g. `senaite.lims`, `senaite.databox`) reintroduces method versioning. I read `senaite.core` only.

## Sources

- senaite/senaite.core, branch `2.x`, commit `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), `setup.py` version 2.7.0. GPL-2.0. https://github.com/senaite/senaite.core
- I-TECH-UW/OpenELIS-Global-2, branch `develop`, commit `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10). MPL-1.1 file headers. https://github.com/I-TECH-UW/OpenELIS-Global-2
