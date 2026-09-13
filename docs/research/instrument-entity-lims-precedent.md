# How open-source LIMS model a laboratory instrument — and whether SENAITE's `Instrument.isValid()` blocks anything or only warns

**Asked by:** the orchestrator (Benchline wayfinder map)
**Date:** 2026-09-11
**Status of sources:** Source read directly, not documentation. Marketing pages and the SENAITE docs site were not used as authority anywhere below; where upstream *prose* is quoted it is quoted as evidence of a discrepancy with the code, not as a finding.

- **SENAITE** — `github.com/senaite/senaite.core`, shallow clone of branch `2.x` at commit `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10). `setup.py:24` declares `version = "2.7.0"`. Currency confirmed on 2026-09-11 by `git ls-remote origin 2.x`, which still returns `993f721e…` — this is the live default branch tip.
- **senaite.app.listing** — `github.com/senaite/senaite.app.listing`, shallow clone of the default branch at `1bd8490682ad6eda78a1351defbbb9e6a0957827` (2026-07-22).
- **senaite.instruments** — `github.com/senaite/senaite.instruments` at `fd30695868b23f03f99a9d034b8cc3c5defa9e9b` (2022-05-20). Inspected only to rule it in or out; see §2.
- **OpenELIS** — `github.com/I-TECH-UW/OpenELIS-Global-2`, shallow clone of branch `develop` at `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10). Live default branch. Findings are on `develop`; a shallow clone carries no tags, so I could not date anything against a tagged release.

All paths below are relative to the respective upstream repository root, not to this repo.

---

## 1. SENAITE's instrument content types and identifying fields

### The real type list

Nine instrument-related portal types are registered, not the six guessed at in the question. From the Generic Setup type registrations (`src/bika/lims/profiles/default/types/` and `src/senaite/core/profiles/default/types/`) and the content classes:

| Portal type | Class file | Framework |
|---|---|---|
| `Instrument` | `src/bika/lims/content/instrument.py:381` (`class Instrument(ATFolder)`) | Archetypes, folderish |
| `Instruments` (container) | `src/bika/lims/profiles/default/types/Instruments.xml` | folder |
| `InstrumentCalibration` | `src/bika/lims/content/instrumentcalibration.py:168` | Archetypes |
| `InstrumentCertification` | `src/bika/lims/content/instrumentcertification.py` | Archetypes |
| `InstrumentValidation` | `src/bika/lims/content/instrumentvalidation.py:151` | Archetypes |
| `InstrumentMaintenanceTask` | `src/bika/lims/content/instrumentmaintenancetask.py` | Archetypes |
| `InstrumentScheduledTask` | `src/bika/lims/content/instrumentscheduledtask.py` | Archetypes |
| `InstrumentType` | `src/senaite/core/content/instrumenttype.py:53` (`class InstrumentType(Container)`) | **Dexterity** (`types/InstrumentType.xml:2` `meta_type="Dexterity FTI"`) |
| `InstrumentLocation` | `src/senaite/core/content/instrumentlocation.py` | **Dexterity** |

Plus two types that are *not* instrument-specific but are referenced by `Instrument`:

- `Manufacturer` — `src/bika/lims/content/manufacturer.py:37`, and its schema is `BikaSchema.copy()` (line 30). **It has no fields of its own**: title and description only.
- `Supplier` — `src/bika/lims/content/supplier.py:107`, `class Supplier(Organisation)`, schema `Organisation.schema.copy() + …` adding `Remarks`, `NIB`, `IBN`, `SWIFTcode`, `AccountNumber`, `LabAccountNumber` (lines 36-103). This is the shared vendor type, also used for reference-material suppliers.

`Instrument` is bound to `senaite_deactivable_type_workflow` (`src/senaite/core/profiles/default/workflows.xml:214-216`) — two states, `active`/`inactive`. `InstrumentCalibration`, `InstrumentCertification` and `InstrumentValidation` are bound to `senaite_one_state_workflow` (lines 86-100); `InstrumentMaintenanceTask` and `InstrumentScheduledTask` to `senaite_cancellable_type_workflow` (lines 165-170).

### Identifying fields — asset number is present and is distinct from model and manufacturer

`src/bika/lims/content/instrument.py`, schema from line 72:

- `UIDReferenceField("InstrumentType", allowed_types=("InstrumentType",), required=1)` — line 74
- `UIDReferenceField("Manufacturer", allowed_types=("Manufacturer",), required=1)` — line 94
- `UIDReferenceField("Supplier", allowed_types=("Supplier",), required=1)` — line 114
- `StringField('Model')` — line 134, described as *"The instrument's model number"*
- `StringField('SerialNo')` — line 142, described as *"The serial number that uniquely identifies the instrument"*
- **`StringField('AssetNumber')`** — line 305, described as *"The instrument's ID in the lab's asset register"*; moved to the front of the edit form by `schema.moveField('AssetNumber', before='description')` (line 359)
- `UIDReferenceField("InstrumentLocation", ...)` — line 312, schemata `"Additional info."`
- `DateTimeField('InstallationDate')` — line 348; `BlobFileField('InstallationCertificate')` — line 355; `ImageField('Photo')` — line 334
- `UIDReferenceField("Methods", multiValued=1, relationship="InstrumentMethods")` — line 168, "Supported methods"; plus a deprecated single `Method` field at line 148 carrying the comment `# TODO Remove Instrument.Method field (functionality provided by 'Methods')`
- `BooleanField('DisposeUntilNextCalibrationTest', default=False)` — line 182
- `ComputedField('Valid', expression="'1' if context.isValid() else '0'")` — line 297, `widget=ComputedWidget(visible=False)`
- Interface/import plumbing: `DataInterface`, `ImportDataInterface`, `ResultFilesFolder`, `DataInterfaceOptions` (lines 217-295)

So yes: **`AssetNumber`, `SerialNo` and `Model` are three separate string fields**, and the manufacturer is a reference to a separate object rather than a string on the instrument. None of the three identifier strings is `required`, none is validated for uniqueness, and none is a catalog index that I found — only `AssetNumber` was moved to a prominent form position. `InstrumentType` and `Manufacturer` and `Supplier` *are* `required=1`.

---

## 2. The key question: does `Instrument.isValid()` gate anything?

**No. Every caller in `senaite.core` is view-layer code. `isValid()` renders a warning and filters a dropdown vocabulary; it does not appear in any workflow guard, any permission, any workflow definition XML, any field validator, or any setter.**

### What `isValid()` is

`src/bika/lims/content/instrument.py:478-486`:

```python
def isValid(self):
    """ Returns if the current instrument is not out for verification, calibration,
    out-of-date regards to its certificates and if the latest QC succeed
    """
    return self.isOutOfDate() is False \
        and self.isQCValid() is True \
        and self.getDisposeUntilNextCalibrationTest() is False \
        and self.isValidationInProgress() is False \
        and self.isCalibrationInProgress() is False
```

### Every caller

A repository-wide grep for `isValid(` across `src/` in senaite.core at 993f721, excluding `.po` translation catalogues, returns these call sites (a separate, unrelated `ReferenceSample.isValid()` at `src/bika/lims/content/referencesample.py:300` is excluded):

| Call site | What it does |
|---|---|
| `src/bika/lims/content/instrument.py:299` | `ComputedField('Valid')`, `widget=ComputedWidget(visible=False)` — a catalog/metadata value, invisible in the UI |
| `src/bika/lims/content/instrument.py:553` | inside `isOutOfDate()`, calls `InstrumentCertification.isValid()` — internal |
| `src/bika/lims/content/instrument.py:597` | inside `getLatestValidCertification()` — internal |
| `src/bika/lims/browser/worksheet/views/results.py:184` | inside `checkInstrumentsValidity()` — **portal message only** |
| `src/senaite/core/browser/worksheets/worksheet/manage_results.py:207` | the same method, in the newer worksheet view — **portal message only** |
| `src/bika/lims/browser/analyses/view.py:620` | inside `get_instruments_vocabulary()` — **dropdown filtering only** |
| `src/senaite/core/tests/doctests/InstrumentCalibrationCertificationAndValidation.rst` (several) | test assertions on `InstrumentCertification.isValid()` |

There is also `src/bika/lims/browser/viewlets/instruments.py:44-88`, `InstrumentQCFailuresViewlet.get_failed_instruments()`, which calls `isValidationInProgress()`, `isCalibrationInProgress()`, `isOutOfDate()`, `isQCValid()` and `getDisposeUntilNextCalibrationTest()` individually to build a dashboard list. Its `render()` (lines 105-121) returns `""` unless the member has `LabManager` or `Manager` — it is a home-page banner.

### The "Results edition not allowed" string is a `warning` portal message and nothing else

`src/senaite/core/browser/worksheets/worksheet/manage_results.py:199-220` — the whole method:

```python
def checkInstrumentsValidity(self):
    """Checks the validity of the instruments used in the Analyses If an
    analysis with an invalid instrument (out-of-date or with calibration
    tests failed) is found, a warn message will be displayed.
    """
    invalid = []
    ans = self.context.getAnalyses()
    for an in ans:
        instrument = an.getInstrument()
        if instrument and not instrument.isValid():
            ...
    if len(invalid) > 0:
        message = _(
            u"check_instrument_validity_message",
            default=u"Some analyses use out-of-date or uncalibrated "
                    u"instruments. Results edition not allowed: ${inv}",
            mapping={"inv": ", ".join(invalid)}
        )
        self.add_status_message(message, "warning")
```

Its sole caller is `manage_results.py:82`, inside the view's `__call__`, immediately before `return self.template()` (line 84). The docstring says "a warn message will be displayed." The method returns `None`, raises nothing, and sets no flag that the template reads. The older duplicate at `src/bika/lims/browser/worksheet/views/results.py:175-193` is identical (its message string is the pre-i18n-id form of the same text) and is likewise called from `__call__` at line 80. **The string "Results edition not allowed" is a factual misstatement by the message itself.**

### The guards do not mention instruments

`src/bika/lims/workflow/analysis/guards.py` defines `guard_lock`, `guard_unlock`, `guard_initialize`, `guard_assign`, `guard_unassign`, `guard_cancel`, `guard_reinstate`, `guard_submit` (line 133), `guard_multi_verify` (182), `guard_verify` (215), `guard_retract` (254), `guard_retest` (272), `guard_reject` (287), `guard_publish` (294).

`guard_submit` (lines 133-180) checks, in order: a non-empty result; non-empty interims; a required attachment; sample received/sampled by point of capture; `getAllowToSubmitNotAssigned()` and analyst identity; and that all dependencies are submitted or submittable. **No instrument check.** `guard_verify` (215-253) checks remaining verifications, self-verification, multi-verification and dependencies. **No instrument check.**

A grep for `instrument` (case-insensitive) across the whole of `src/bika/lims/workflow/` returns hits in exactly one file — `src/bika/lims/workflow/referenceanalysis/events.py:64-88`, which *assigns* an instrument to a reference sample after a transition. Nothing in the guard layer reads instrument validity.

A grep for `instrument` or `isValid` across every workflow definition under `src/senaite/core/profiles/default/workflows/` and `src/bika/lims/profiles/default/workflows/` returns only docstring prose in `senaite_instruments_workflow/definition.xml` (the one-state folder workflow for the `Instruments` container) and `senaite_referenceanalysis_workflow/definition.xml`. **No guard expression anywhere mentions an instrument.**

### Nor does the permission layer or the result-editability layer

`src/bika/lims/browser/analyses/view.py`:

- `is_analysis_edition_allowed()` checks `self.context_active`, then `EditFieldResults` or `EditResults` by point of capture, then `FieldEditAnalysisResult`. Nothing else.
- `is_result_edition_allowed()` calls `is_analysis_edition_allowed()` first and then only inspects `getDetectionLimitOperand()`, `getDetectionLimitSelector()` and `getAllowManualDetectionLimit()`.
- `_folder_item_instrument()` (lines 1336-1362) decides the Instrument cell's rendering from `is_analysis_edition_allowed()` — i.e. from permissions — and never from the instrument's validity.

So the Result input cell's editability is computed without reference to instrument validity at any point.

### What the check *does* do: it filters the dropdown

`src/bika/lims/browser/analyses/view.py:614-640`, `get_instruments_vocabulary()`:

```python
for instrument in instruments:
    uid = api.get_uid(instrument)
    title = api.safe_unicode(api.get_title(instrument))
    # append all valid instruments
    if instrument.isValid():
        vocab.append({"ResultValue": uid, "ResultText": title})
    elif is_qc:
        # Is a QC analysis, include instrument also if is not valid
        if instrument.isOutOfDate():
            title = _(u"{} (Out of date)".format(title))
        vocab.append({"ResultValue": uid, "ResultText": title})
    elif instrument.isOutOfDate():
        # disable out of date instruments
        title = _(u"{} (Out of date)".format(title))
        vocab.append({"disabled": True, "ResultValue": None, "ResultText": title})
```

Note the asymmetry in that `elif` chain. An instrument that is invalid *because* it is out of date appears as a disabled row labelled "(Out of date)". An instrument that is invalid for any of the other four reasons — QC failed, disposed-until-next-calibration, validation in progress, calibration in progress — is **silently omitted from the list entirely**, with no visible explanation.

This is a *selection-time* filter on a rendered `<select>`, not a write-time constraint. The write path is `src/bika/lims/browser/workflow/analysis.py:70-75`:

```python
instrument = self.get_form_value("Instrument", uid, None)
if instrument is not None:
    instrument = instrument or None
    analysis.setInstrument(instrument)
```

The submitted form value is passed straight to `setInstrument`. The `Instrument` field on the analysis (`src/bika/lims/content/abstractbaseanalysis.py:402-417`) declares no `validators`. `isInstrumentAllowed()` exists (`src/bika/lims/content/abstractanalysis.py:933-942`) but only tests membership in the service's allowed list, not validity, and its only callers are worksheet assignment routines (`src/bika/lims/content/worksheet.py:205, 890, 1241`; `src/senaite/core/content/worksheet.py:373, 461, 1098`) — not this path.

### Corroborating: the catalog metadata for it was deliberately removed

`src/senaite/core/upgrade/v02_00_000.py:95-112` defines `METADATA_TO_REMOVE`, which includes `(CATALOG_ANALYSIS_LISTING, "isInstrumentValid")` at line 110, alongside `getInstrumentUID`, `getAllowedInstrumentUIDs` and `getInstrumentEntryOfResults`, under the comment "No longer used, see https://github.com/senaite/senaite.core/pull/1709/". An `isInstrumentValid` analysis-listing metadata column existed and was dropped at 2.0.

### Upstream's own prose overstates it

`src/senaite/core/tests/doctests/InstrumentCalibrationCertificationAndValidation.rst:14-15` says:

> "Only valid instruments, which are not currently calibrated or validated are available in the system and can be used to fetch results for analysis."

The doctest below that prose exercises `InstrumentCertification.isValid()` and `InstrumentValidation.isValidationInProgress()` date arithmetic (lines 183-371). **It contains no assertion about submitting or verifying an analysis on an invalid instrument.** The prose is not backed by a test.

### Bounding this claim

Searched, at the commits above: the whole of `senaite.core/src` (Python, Page Templates, ZCML, GS XML, workflow definitions, doctests); the whole of `senaite.app.listing/src`, where a grep for `isValid` returns nothing and no instrument-specific logic exists (that package renders the generic listing table and takes `allow_edit` from the view). `senaite.instruments` at fd30695 is an instrument **file-parser** add-on — its `src/senaite/instruments/` tree is import interfaces and vendor CSV fixtures; it contains no validity or workflow code.

Not searched: `senaite.lims`, `senaite.impress`, `senaite.storage`, `senaite.databox` and other add-ons; any commercial or site-local add-on. I also could not read history — both clones are shallow/grafted — so I cannot say whether a guard existed in an older release and was removed, beyond the `isInstrumentValid` metadata removal above.

---

## 3. Cardinality — one instrument on the analysis, many on the service

The distinction is real in the schema and the two fields live in two different files.

**Many, on the service.** `src/bika/lims/content/analysisservice.py:66-78`:

```python
Instruments = UIDReferenceField(
    "Instruments",
    schemata="Method",
    required=0,
    multiValued=1,
    vocabulary="_instruments_vocabulary",
    allowed_types=("Instrument", ),
    accessor="getRawInstruments",
    widget=PicklistWidget(
        label=_("Instruments"),
        description=_("Available instruments based on the selected methods."),
    )
)
```

This field is added in `analysisservice.py`'s own schema block, so it exists on `AnalysisService` and **not** on `Analysis`.

**One, on the shared base.** `src/bika/lims/content/abstractbaseanalysis.py:402-417`:

```python
Instrument = UIDReferenceField(
    "Instrument",
    read_permission=View,
    write_permission=FieldEditAnalysisResult,
    schemata="Method",
    searchable=True,
    required=0,
    vocabulary="_default_instrument_vocabulary",
    allowed_types=("Instrument",),
    accessor="getInstrumentUID",
    widget=SelectionWidget(
        format="select",
        label=_("Default Instrument"),
        description=_("Default instrument used for analyses of this type"),
    )
)
```

`abstractbaseanalysis` is the common base of both `AnalysisService` and `Analysis`, so this single-valued field appears on both. Its semantics differ by which object holds it:

- On the **service**, it is the *default* instrument, and `AnalysisService.getInstrument()` (`analysisservice.py:368-378`) overrides the accessor to return `None` unless the default is also a member of `Instruments` — a consistency check between the "may use" list and the "default" pointer.
- On the **analysis**, it is the instrument that the analysis *used*. `AbstractBaseAnalysis.getInstrument()` (`abstractbaseanalysis.py:1155-1161`) is a plain stored-field read: `return self.getField("Instrument").get(self)`.

So: **`AnalysisService.Instruments` is the many-valued "may use" list; `Analysis.Instrument` is the single-valued "did use" reference.** There is no many-valued instrument field on an analysis, and therefore no representation of an analysis performed on two instruments (for example a preparation instrument and a measuring instrument), and no place to record the *order* in which instruments touched a determination.

One further point that matters for the snapshot question. The analysis's notion of which instruments are permissible is **not pinned** — `src/bika/lims/content/abstractanalysis.py:980-998`:

```python
def getAllowedInstruments(self):
    """Returns the allowed instruments from the service
    """
    service = self.getAnalysisService()
    if not service:
        return []
    return service.getInstruments()
```

This is a live delegation to the current `AnalysisService`, evaluated at render time. It is the one place in the instrument model where SENAITE does *not* follow the copy-at-creation pattern that the method/specification scout recorded for ranges, precision and calculation formula (`docs/research/method-versioning-lims-precedent.md:141-161`). The *chosen* instrument UID is stored on the analysis; the *set of permitted* instruments is resolved live from setup each time.

---

## 4. Calibration and validity representation — four separate mechanisms, three of them date ranges

SENAITE does not have one status field. It has four independent child-object mechanisms plus a boolean, and `isValid()` ANDs them.

| Concept | Mechanism | Where |
|---|---|---|
| **Certified / out of date** | child `InstrumentCertification` objects, each with a `ValidFrom`/`ValidTo` date range | `instrumentcertification.py:123, 133` |
| **Out for calibration** | child `InstrumentCalibration` objects, each with a `DownFrom`/`DownTo` date range | `instrumentcalibration.py:73, 83` |
| **Out for validation** | child `InstrumentValidation` objects, each with a `DownFrom`/`DownTo` date range | `instrumentvalidation.py:56, 66` |
| **Failed QC** | computed by querying the catalogue for the most recent `ReferenceAnalysis` on this instrument and testing its range | `instrument.py:488-542` |
| **Manually taken out until re-calibrated** | `BooleanField('DisposeUntilNextCalibrationTest')` on the instrument | `instrument.py:182-189` |
| **Under maintenance** | child `InstrumentMaintenanceTask` (`DownFrom`/`DownTo`, `instrumentmaintenancetask.py:178-179`) and `InstrumentScheduledTask` | **not** consulted by `isValid()` |
| **Retired / not in service** | `senaite_deactivable_type_workflow`, `active`/`inactive` | `workflows.xml:214-216` |

So, to the specific question: **"out of service" and "out of calibration" are different mechanisms.** Retirement is a workflow state on the instrument object; out-of-calibration is the absence of a currently-dated child certification object; out-for-calibration is the presence of a currently-dated child calibration object. Maintenance is a fourth, separate, *unenforced* thing — `InstrumentMaintenanceTask` objects exist with their own down-date range and `isValid()` never looks at them.

Each of the three date-range checks compares against **now**, not against any other moment:

`instrumentcertification.py:259-267`:
```python
def isValid(self):
    """Returns if the current certificate is in a valid date range
    """
    today = DateTime()
    valid_from = self.getValidFrom()
    valid_to = self.getValidTo()
    return valid_from <= today <= valid_to
```

`instrumentcalibration.py:181-187` (`isCalibrationInProgress`) and `instrumentvalidation.py` (`isValidationInProgress`) are the same shape: `today = DateTime()` … `return down_from <= today <= down_to`. `Instrument.getValidCertifications()` (`instrument.py:462-476`) uses `today = date.today()` for the same comparison.

The `DisposeUntilNextCalibrationTest` flag is cleared automatically in two places and set automatically nowhere: `instrument.py:701-703` (after reference analyses are added to the instrument) and `src/bika/lims/browser/workflow/analysis.py:85` (when a reference result comes back in range). Its field description says "This checkbox will automatically be unchecked" — the checking is manual.

**One genuinely retroactive mechanism does exist, and it is worth stating precisely because it is the only one.** `src/bika/lims/browser/workflow/analysis.py:127-165`: when a `ReferenceAnalysis` with an out-of-range result and an instrument assigned is submitted, the view searches for analyses on the same instrument and **retracts** them:

```python
for invalid_instrument_uid in invalid_instrument_refs.keys():
    query = dict(getInstrumentUID=invalid_instrument_uid,
                 portal_type=['Analysis', 'DuplicateAnalysis'],
                 review_state='to_be_verified',)
    brains = api.search(query, SAMPLE_CATALOG)
    for brain in brains:
        analysis = api.get_object(brain)
        failed_msg = '{0}: {1}'.format(
            ulocalized_time(DateTime(), long_format=1),
            _("Instrument failed reference test"))
```

It then generates a PDF retraction list, attaches it to the failing reference analyses and emails it. But note the scope: it fires **only** on QC failure (not on certificate expiry, not on calibration downtime), it is **forward-triggered at the moment the QC result is submitted** rather than being a query anyone can ask later, and `review_state='to_be_verified'` means it catches only analyses in the verification queue — anything already `verified` or `published` is untouched, and anything still `unassigned`/`assigned` is untouched too.

---

## 5. OpenELIS Global 2 — the "no instrument entity, no calibration model" finding needs correction on the first half and holds on the second

### There *is* an equipment entity, and it is richer than a stub: `Analyzer`

`src/main/java/org/openelisglobal/analyzer/valueholder/Analyzer.java:44-88`, `@Entity @Table(name = "analyzer")`:

- `id` (sequence-generated string)
- `name` — `@Column(name = "name", length = 100)`
- `active` — `@Column(name = "is_active", length = 1)`
- `siteBindingRevision` → `AnalyzerSiteBindingRevision`
- `bridgeConnectionId` — `@Column(name = "bridge_connection_id", length = 255)`
- `latestActivationRecord` → `AnalyzerActivationRecord`
- `testUnitIds` — a `List<String>` persisted through `StringListConverter`
- `status` — `@Enumerated(EnumType.STRING)`, default `AnalyzerStatus.SETUP`
- `lastActivatedDate`
- `fhirUuid`

`AnalyzerStatus` is declared inline at `Analyzer.java:212-214`:

```java
public enum AnalyzerStatus {
    INACTIVE, SETUP, VALIDATION, ACTIVE, ERROR_PENDING, OFFLINE
}
```

`getAnalyzerType()` at `Analyzer.java:106-113` is `@Deprecated(forRemoval = true)` and `@Transient`, returning `null`, with the comment "The profile revision on the Bridge-backed site binding is authoritative, so no OpenELIS analyzer type is returned." The instrument *type* concept has been pushed out of OpenELIS into the analyzer-bridge profile catalogue.

**What identifies it:** `id`, `name`, `bridgeConnectionId`, `fhirUuid`. A repository-wide grep for `serial_number`, `serialNumber`, `assetNumber` and `asset_tag` across `src/main/java` returns **nothing**. There is no serial number, no asset/inventory number, no manufacturer reference and no model field on `Analyzer`. Identity is the connection identity, not the physical asset identity. `Analyzer` is surfaced as a FHIR `Device` (`src/main/java/org/openelisglobal/fhir/providers/DeviceProvider.java`, `fhir/service/DeviceTransformServiceImpl.java:69-85`, and `search/dao/DeviceSearchDao.java:112-121` which maps the enum onto FHIR device-status tokens).

### The calibration finding stands, with two nuances

A repository-wide case-insensitive grep for `calibrat` across `src/main/java` returns exactly **four** hits, none of them an instrument calibration record:

1. `coldstorage/valueholder/CorrectiveActionType.java:20-22` — an enum constant `CALIBRATION` in a list of corrective actions for cold-chain excursions, documented as "Calibrating equipment or sensors". Seeded at `src/main/resources/liquibase/3.3.x.x/024-freezer-monitoring-schema.xml:662`. This is a free-text-ish classification of a remediation action on a freezer, not a calibration certificate.
2. `inventory/valueholder/InventoryItem.java:97-98` — `@Column(name = "calibration_required", length = 1) private String calibrationRequired = "N";`, with the DB column and a `CHECK (calibration_required IN ('Y','N'))` constraint at `src/main/resources/liquibase/3.3.x.x/016-inventory-management-system.xml:118, 147-148`. Two things about it: (a) `InventoryItem` is a **consumables** entity — `InventoryEnums.ItemType` is `{REAGENT, RDT, CARTRIDGE, HIV_KIT, SYPHILIS_KIT}` (`inventory/valueholder/InventoryEnums.java:16-18`) — so this is "does this reagent kit need a calibrator run", not equipment calibration; and (b) a grep for `calibrationRequired` / `CalibrationRequired` across `src/main/java` and `frontend/src` returns **only the field declaration itself**. The class is annotated `@Getter @Setter` (Lombok, `InventoryItem.java:24-25`) so accessors exist, but nothing calls them. It is a dead column.

So: **OpenELIS has no instrument calibration record, no certificate, no validity date range for equipment, and no maintenance/downtime entity for an analyzer.** The prior map finding is correct on calibration. It is wrong if it also said there is no equipment entity at all.

### What OpenELIS has instead: an activation gate with real blockers

`analyzer/service/AnalyzerActivationServiceImpl.java:94-129`, `activateExact()`, runs `validateActivation(analyzer)` and returns `AnalyzerActivationResult.blocked(...)` if any blocker is present. `validateActivation()` (from line ~180) accumulates blockers for: a blank name (`NAME_BLOCKER`); no active lab unit among `testUnitIds` (`LAB_UNIT_BLOCKER`); a missing or non-`ACTIVE` or mismatched bridge profile (`PROFILE_BLOCKER`); stale mappings (`MAPPINGS_BLOCKER`); stale control recognition (`RECOGNITION_BLOCKER`); and a missing/mismatched connection. It then sends an `ACTIVATE` runtime command over the bridge, validates the acknowledgement, and only on success writes an `AnalyzerActivationRecord` and sets `status = ACTIVE`, `active = true`, `lastActivatedDate`.

`AnalyzerActivationRecord` (`analyzer/valueholder/AnalyzerActivationRecord.java:30-65`) is append-only in effect — nearly every column is `updatable = false`: `analyzer`, `siteBindingRevision`, `verificationConfirmation`, `bridge_connection_id`, `activation_intent`, `runtime_acknowledgement_json`, `runtime_fingerprint`, `created_by`, `created_at`. This is a signed-ish record of *who put this analyzer into service and against which configuration revision*.

**But it gates activation, not results.** A grep of `analyzerresults/service/AnalyzerResultsAcceptServiceImpl.java` for `getStatus()`, `AnalyzerStatus` and `isActive` returns nothing. The result-acceptance path does not consult analyzer status. This mirrors SENAITE: the validity concept exists, and the results path does not read it.

### Cardinality in OpenELIS: also one

`analysis/valueholder/Analysis.java:92` declares `private String analyzerId;`, mapped at `src/main/resources/hibernate/hbm/Analysis.hbm.xml:127-129` as `column="analyzer_id" precision="10"` — a plain scalar property, not a `many-to-one` association, so there is no FK-enforced relation and certainly no collection. It is written at result-acceptance and result-entry time only: `analyzerresults/service/AnalyzerResultsAcceptServiceImpl.java:702, 821` and `result/action/util/ResultUtil.java:342`. `AnalyzerResults` (the staging table for incoming instrument messages) also carries a single `@Column(name = "ANALYZER_ID")` (`analyzerresults/valueholder/AnalyzerResults.java:48-50`).

Separately, `qc/valueholder/QCResult.java:36-38` carries `@Column(name = "instrument_id", nullable = false) private String instrumentId;` with the source comment at line 27 "testId and instrumentId reference Test.id and Analyzer.id (String, …)" — a soft reference, no FK. `qc/dto/InstrumentQCStatus.java` (a dashboard DTO, fields `instrumentId`, `instrumentName`, `instrumentType`, `instrumentLocation`, `complianceColor`, `unresolvedRejections`, `triggeredRules`, …) is the per-instrument QC roll-up. A grep of `result/` and `common/services/ResultSaveService.java` for `qcResult`, `QCRuleViolation` and `westgard` returns only docstring cross-references, not calls — **QC violations do not gate result saving either.**

---

## 6. Bounded negative sweep: does any of this answer "was the instrument in calibration at the instant of this measurement?"

**Not in either system, and for SENAITE the reason is the same `now()` hardcoding the map already recorded for other subjects.**

For SENAITE: a grep across the whole of `src/` at 993f721 for `getValidFrom`, `getValidTo`, `getDownFrom` and `getDownTo`, excluding the three defining content classes and the doctests, returns only

- `instrument.py:468-469, 577` — internal use in `getValidCertifications()` and `getCertificateExpireDate()`
- `instrumentmaintenancetask.py:178-179` — the maintenance window, which nothing validity-related reads
- `src/bika/lims/browser/instrument.py:87-88, 101-126, 146-147, 219-250` — **listing column definitions and their `localize_date` display cells**

That is the complete set. **No date on a certification, calibration or validation is ever compared to anything other than `DateTime()` / `date.today()`.** In particular it is never compared to `getResultCaptureDate`, which is the field that would answer the retrospective question and which `isQCValid()` itself sorts on (`instrument.py:500-513`). The certification history is retained as child objects and is therefore in principle *reconstructable* by hand; no code path in senaite.core does the reconstruction.

For OpenELIS: there is no calibration date range to compare against at all (§5), so the question does not arise. `AnalyzerActivationRecord.createdAt` plus `activationIntent` would in principle let one reconstruct "was this analyzer in ACTIVE state on date D", and nothing queries it that way — a grep of `analyzer/` for a time-bounded query over activation records returned no such predicate; the only read path I traced is `analyzer.getLatestActivationRecord()`.

**Bounding.** "Is there *any* open-source LIMS that does this" cannot be settled by reading two repositories, and I am not claiming it. What I searched, exhaustively, at the commits named at the top: `senaite.core` (all of `src/`), `senaite.app.listing` (all of `src/`), `senaite.instruments`, and `OpenELIS-Global-2` (all of `src/main/java`, `src/main/resources`, and greps across `frontend/src`). I did **not** examine: other SENAITE add-ons; Bika LIMS 3.x (the pre-fork lineage); LabKey Server; Baobab LIMS; OpenSpecimen; LabCollector; or any of the ELN-adjacent projects. A claim of the form "no open-source LIMS does this" is not supported by what I read; the claim that **neither SENAITE 2.7.0 nor OpenELIS Global 2 `develop` does this** is.

---

## Condensed contrast

| | SENAITE 2.7.0 (`2.x` @ 993f721) | OpenELIS (`develop` @ 672c92a) |
|---|---|---|
| Equipment entity | `Instrument` (Archetypes, folderish), + 8 related types | `Analyzer` (JPA entity, table `analyzer`) |
| Asset / inventory number | **`AssetNumber`** string field, plus separate `SerialNo` and `Model` | **none** — no serial, asset or model field anywhere |
| Manufacturer | required reference to a `Manufacturer` object (which has no fields but title/description) | **none** on the analyzer (`manufacturer` exists only on the consumables `InventoryItem`) |
| Calibration record | child `InstrumentCalibration` objects, `DownFrom`/`DownTo` | **none** |
| Certificate | child `InstrumentCertification` objects, `ValidFrom`/`ValidTo` | **none** |
| Validation | child `InstrumentValidation` objects, `DownFrom`/`DownTo` | an `AnalyzerStatus.VALIDATION` enum value; no date range, no record |
| Maintenance | `InstrumentMaintenanceTask` / `InstrumentScheduledTask` — **not** read by `isValid()` | **none** for analyzers (cold-storage corrective actions are a separate module) |
| Out of service vs out of calibration | **different mechanisms** — workflow `inactive` vs absent valid certification | one `status` enum covering both |
| Validity gate at results | **warning only** — portal message + dropdown filter; no guard, no permission, no validator | **none at results**; a real blocker list exists but only on analyzer *activation* |
| Analysis → instrument cardinality | **one** (`Instrument`, single UIDReference on the analysis) | **one** (`Analysis.analyzerId`, a scalar column, no FK) |
| Service → instrument cardinality | **many** (`Instruments`, `multiValued=1`, on `AnalysisService` only) | test↔analyzer coupling lives in the bridge site-binding, not a lab-unit-level list I traced |
| Validity evaluated at | `DateTime()` / `date.today()`, always | n/a |
| Retrospective "in calibration at time of measurement" | **no** | **no** |

The one place either system does anything retroactive is SENAITE's QC-failure retraction sweep (§4) — triggered by a QC submission, limited to `to_be_verified`, and not queryable after the fact.

---

## What I could not establish

1. **Whether a workflow guard on instrument validity ever existed in an earlier SENAITE release.** Both clones are shallow and grafted, so I have no history to bisect. The removal of the `isInstrumentValid` analysis-listing *metadata column* at 2.0 (`v02_00_000.py:110`, citing PR #1709) shows the concept was once catalogued for listing purposes; it does not establish that a guard existed.
2. **Whether any SENAITE add-on outside `senaite.core` reintroduces an instrument-validity guard.** I read `senaite.core`, `senaite.app.listing` and `senaite.instruments` only.
3. **Whether the `Valid` `ComputedField` is indexed or catalogued anywhere that a listing filter uses.** I found the field definition (`instrument.py:297-303`, widget invisible) but did not trace whether `senaite_catalog_setup` carries it as metadata or an index at 2.7.0.
4. **Whether `AssetNumber` or `SerialNo` is unique-constrained or indexed.** I found no validator and no `@invariant`; I did not enumerate every catalog index definition under `src/senaite/core/catalog/` to confirm the negative, so treat "not indexed" as unverified rather than established.
5. **Which tagged OpenELIS release** contains `Analyzer.status`, `AnalyzerActivationRecord`, `AnalyzerSiteBindingRevision` and the QC/`InventoryItem` modules. Shallow clone, no tags. The liquibase changesets are filed under `3.3.x.x/`.
6. **The full OpenELIS analyzer state machine.** I read `activateExact`, `deactivate` and `validateActivation` in `AnalyzerActivationServiceImpl`; I did not enumerate every transition into `ERROR_PENDING` or `OFFLINE`, nor establish whether `VALIDATION` is ever actually entered by any code path — I found no `setStatus(AnalyzerStatus.VALIDATION)` in the grep results, but that grep covered `src/main/java` only and I did not exclude the possibility of the value being set via the FHIR status mapping.
7. **Whether OpenELIS's `Analyzer` rows are audit-trailed.** `AnalyzerActivationRecord` is effectively append-only, but I did not check whether `AnalyzerServiceImpl` extends `AuditableBaseObjectServiceImpl` or whether `ANALYZER` has `keep_history = 'Y'` in the seed data.
8. **What the SENAITE UI actually looks like to an analyst when an instrument goes invalid mid-worksheet.** The code says the Result field stays editable and the already-assigned instrument's title is still rendered; I read the Python and the listing machinery, not the compiled React bundle, so I cannot rule out a client-side behaviour I did not see.

## Sources

- senaite/senaite.core, branch `2.x`, commit `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), `setup.py:24` version 2.7.0. Confirmed still the branch tip on 2026-09-11 via `git ls-remote`. GPL-2.0. https://github.com/senaite/senaite.core
- senaite/senaite.app.listing, default branch, commit `1bd8490682ad6eda78a1351defbbb9e6a0957827` (2026-07-22). https://github.com/senaite/senaite.app.listing
- senaite/senaite.instruments, commit `fd30695868b23f03f99a9d034b8cc3c5defa9e9b` (2022-05-20). https://github.com/senaite/senaite.instruments
- I-TECH-UW/OpenELIS-Global-2, branch `develop`, commit `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10). MPL-1.1 file headers. https://github.com/I-TECH-UW/OpenELIS-Global-2
- This repo, for the prior finding on copy-at-creation that §3 contrasts against: `docs/research/method-versioning-lims-precedent.md:141-161`
