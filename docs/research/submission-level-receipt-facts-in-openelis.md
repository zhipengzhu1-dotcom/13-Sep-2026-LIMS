# In OpenELIS Global 2, how is the delivery (accession) modelled relative to individual containers, and which receipt-level facts live on the delivery-level row?

**Asked by:** orchestrator, scouting for the Benchline wayfinder map
**Date:** 2026-09-11
**Status:** Agent-gathered research, not a compliance determination. Not reviewed by a second person.

**Status of sources:** Primary source only — a fresh shallow clone of `https://github.com/I-TECH-UW/OpenELIS-Global-2` (`origin` confirmed, HEAD commit `b27664e "fix(OGC-1201): order entry — consolidated fix list (#4282)"`, cloned 2026-09-11). All citations are `path:line` against this checkout. No secondary write-ups were used. This is the project's own current default-branch source, so no draft/superseded-version risk applies (unlike the FDA/NIST traps noted in the scout brief, which do not arise here).

## Findings

### 1. The two-level model: `Sample` (accession) vs `SampleItem` (container/specimen)

OpenELIS has an explicit two-level model, and it is a real parent/child pair, not a shared-column convention.

**`Sample`** (`src/main/java/org/openelisglobal/sample/valueholder/Sample.java:37-83`) is the accession-level entity. Persisted fields (from the class body and the Hibernate mapping `src/main/resources/hibernate/hbm/Sample.hbm.xml`):

`id`, `fhirUuid`, `accessionNumber`, `packageId`, `domain`, `resampledFromSampleId`, `resampledToSampleId`, `amendsLhuNumber`, `amendmentNumber`, `amendmentReason`, `nextItemSequence`, `revision`, `enteredDate`, `receivedTimestamp` (mapped column `RECEIVED_DATE`), `referredCultureFlag`, `collectionDate`, `requiredBy`, `clientReference`, `status`, `statusId`, `releasedDate`, `stickerReceivedFlag`, `sysUserId`, `barCode`, `transmissionDate`, `systemUser` (a `ValueHolderInterface`/FK to `SystemUser`), `referringId`, `clinicalOrderId`, `isConfirmation`, `priority` (`OrderPriority`), `gpsLatitude`/`gpsLongitude`/`gpsAccuracyMeters`/`gpsCaptureMethod`/`gpsCaptureTimestamp`, `storageSkipped`, `consentGiven`/`consentFormReference`/`consentRecordedAt`/`consentRecordedBy`, plus a `sampleProjects` collection.
(`Sample.java:37-83`; column mapping confirmed at `Sample.hbm.xml:9-60`.)

**`SampleItem`** (`src/main/java/org/openelisglobal/sampleitem/valueholder/SampleItem.java:34-96`) is the container/specimen-level entity, one row per physical specimen. Persisted fields: `id`, `quantity`, `fhirUuid`, `sample` (many-to-one FK back to `Sample`), `sampleItemId`, `sortOrder`, `sourceOfSample`/`sourceOfSampleId`, `sourceOther`, `typeOfSample`/`typeOfSampleId`, `unitOfMeasure`/`unitOfMeasureName`, `externalId`, `collectionDate`, `statusId`, `collector`, `collectionConditions`, `collectionMethod`, `sampleTemperature`, `specimenOrigin`, `container`, `locationDetails`, `gpsLatitude`/`gpsLongitude`, `receivedDate`, `rejected`, `rejectReasonId`, `voided`, `labPerformedSampling`, `voidReason`, `collectionLocationId`, `collectionNotes`, plus newer aliquoting fields `remainingQuantity`, `parentSampleItem`, `childAliquots`, `version` (optimistic lock).
(`SampleItem.java:34-96`.)

**Cardinality and FK direction:** one `Sample` to many `SampleItem`. The FK lives on the child: `SampleItem.sample` is a Hibernate `many-to-one` mapped to column `SAMP_ID`, referencing `Sample.ID` (`src/main/resources/hibernate/hbm/SampleItem.hbm.xml:30-34`). `SampleItem` also carries its own primary key column `SAMPITEM_ID` and a `SORT_ORDER` column (`SampleItem.hbm.xml:20-27`).

**Barcode construction confirms the two-level split:**
- `OrderLabel` (accession-level label) sets its barcode payload directly to the bare accession/lab number: `setCode(labNo)` (`src/main/java/org/openelisglobal/barcode/labeltype/OrderLabel.java:62`, also `:113`, `:278`).
- `SpecimenLabel` (specimen-level label) concatenates the lab number with a per-specimen sort code: `setCode(labNo + "." + sampleCode)` (`src/main/java/org/openelisglobal/barcode/labeltype/SpecimenLabel.java:264`), where `sampleCode` derives from the `SampleItem`'s `sortOrder`.

So `accessionNumber` identifies the delivery (`Sample` row); `sortOrder` (via the derived `sampleCode`) identifies the container within that delivery, and the two are composed with a literal `.` separator for the specimen barcode.

### 2. Which receipt facts sit on the accession-level `Sample` row vs `SampleItem`

**On `Sample` only** (delivery-level, not duplicated per container): `enteredDate` (`Sample.hbm.xml:44-46`, `not-null="true"`), `receivedTimestamp`/column `RECEIVED_DATE` (`Sample.hbm.xml:47-49`, `not-null="true"`), `clientReference` (`Sample.hbm.xml:53-55`), `status`/`statusId`, `priority`, `domain`, `sysUserId` + `systemUser` (an actor reference — see caveat below), `barCode`, `releasedDate`, `transmissionDate`, GPS/consent capture fields.

**On `SampleItem` only** (specimen-level): `receivedDate` (a *second*, specimen-level received-date field — see duplication note below), `collector`, `collectionConditions`, `collectionMethod`, `sampleTemperature`, `specimenOrigin`, `container`, `locationDetails`, `rejected`/`rejectReasonId` (condition/rejection — see §3), `quantity`/`remainingQuantity`, `sortOrder`.

**Present on BOTH `Sample` and `SampleItem` (duplication in the prior art):**
- `collectionDate` exists as a column on both `Sample` (`Sample.java:56`, `Sample.hbm.xml:50-52`) and `SampleItem` (`SampleItem.java:49`). OpenELIS's own schema duplicates a collection-time fact across the accession row and every specimen row of that accession.
- Receipt timing is split rather than cleanly duplicated: `Sample.receivedTimestamp` (accession-level "received," `Sample.hbm.xml:47-49`) and `SampleItem.receivedDate` (specimen-level "received," `SampleItem.java:61`) are two separately-named columns holding conceptually the same fact ("this material arrived") at two different grains. The schema does not enforce that they agree.
- GPS fields (`gpsLatitude`/`gpsLongitude`) are present on both `Sample` (with additional accuracy/method/timestamp columns) and `SampleItem` (bare lat/long only) — another instance of the same class of fact tracked at two grains.

No dedicated "receivedBy" column distinct from `sysUserId`/`systemUser` was found on `Sample`; `sysUserId` is the closest analogue to a "received by" actor and is not documented in the entity as receipt-specific (it is a generic system-user reference on the accession row).

### 3. Condition, rejection, and discrepancy

**`SampleItem.rejected` / `rejectReasonId`** — specimen-level, boolean + FK to a controlled vocabulary. Mapped at `src/main/resources/hibernate/hbm/SampleItem.hbm.xml:87-90` (`column="rejected"`, `column="reject_reason_id"`). The reason values are `dictionary` rows under dictionary group id 257, e.g. `dictionary.reject.result.hemolyzed`, `dictionary.reject.result.insufficient.volume`, `dictionary.reject.result.coagulated`, `dictionary.reject.result.wrong.tube`, `dictionary.reject.result.jaundiced`, `dictionary.reject.result.lipemic`, `dictionary.reject.result.other` (`db/dbInit/OpenELIS-Global.sql:9596-9616`). This is a controlled vocabulary, not free text, and it attaches to the **specimen**, not the delivery. No actor or timestamp column accompanies `rejected`/`rejectReasonId` directly on `SampleItem` itself (the rejection fact carries no "who/when" of its own at that table).

**`SampleQaEvent`** (`src/main/java/org/openelisglobal/sampleqaevent/valueholder/SampleQaEvent.java`, table `clinlims.sample_qaevent`) — this is the closest analogue to a receipt discrepancy, and it is accession-level by default with an optional specimen-level narrowing:
- Table definition: `id, qa_event_id, sample_id, completed_date, lastupdated, sampleitem_id, entered_date` (`db/dbInit/OpenELIS-Global.sql:6552-6558`).
- `sample_id` is the FK to the accession (`Sample`); `sampleitem_id` is nullable and documented in the schema itself: `COMMENT ON COLUMN clinlims.sample_qaevent.sampleitem_id IS 'If the qaevent refers to a sampleitem of the sample use this column'` (`db/dbInit/OpenELIS-Global.sql:6566-6569`). So the QA event's natural attachment point is the accession row; the specimen link is an optional refinement, not the default.
- `qaEvent` is a FK to `QaEvent` (`src/main/java/org/openelisglobal/qaevent/valueholder/QaEvent.java`), which is a dictionary-style controlled entity: `qaEventName`, `description`, `type`, `isBillable`, `isHoldable`, `reportingSequence`, `reportingText`, `category` — i.e., the discrepancy "kind" is a controlled vocabulary of configured events, not free text (`QaEvent.java:25-52`).
- `SampleQaEvent` itself carries `completedDate` and `enteredDate` timestamps (`SampleQaEvent.java:53-55`) but **no actor column** on the row itself.
- The actor and the disposition action live one table further out, in **`SampleQaEventAction`** / `clinlims.sample_qaevent_action`: columns `id, sample_qaevent_id, action_id, created_date, lastupdated, sys_user_id` (`db/dbInit/OpenELIS-Global.sql:6576-6582`; entity at `src/main/java/org/openelisglobal/sampleqaeventaction/valueholder/SampleQaEventAction.java:30-49`). `action_id` is a FK to `Action` (`src/main/java/org/openelisglobal/action/valueholder/Action.java`), another controlled-vocabulary table (`code`, `description`, `type`). So the discrepancy record (`SampleQaEvent`) is split from its resolving action(s) (`SampleQaEventAction`, one-to-many, each with its own actor and date), both anchored to the accession-level `Sample` by default.

### 4. Acceptance despite a defect (proceeding while a defect stands on the record)

There is a second, newer module — **Sample Acceptance Checklist** (module comment: "S-09 (OGC-580)"; distinguished in its own Javadoc from `SampleQaChecklist`/OGC-356) — that models exactly this, but at the **specimen** level, not the accession level:
- `SampleAcceptanceRecord` (`src/main/java/org/openelisglobal/sampleacceptance/valueholder/SampleAcceptanceRecord.java:21-70`), table `sample_acceptance_record`, is explicitly documented as "keyed to a `sample_item` (one physical specimen)... each specimen is accepted / reviewed individually" (`SampleAcceptanceRecord.java:21-26`). Columns: `id`, `sample_item_id` (not `sample_id`), `domain`, `answers` (JSON), `overall_status` (`PASS`/`FAIL`/`NA` per answer, rolled up to `ACCEPTED`/`REVIEW`/`PENDING`), `assessed_by_user_id`, `assessed_at` (`SampleAcceptanceRecord.java:35-70`).
- Enforcement is a configurable, lab-wide setting with three modes `MANDATORY`, `OPTIONAL`, `OFF` (`src/main/java/org/openelisglobal/sampleacceptance/service/SampleAcceptanceChecklistServiceImpl.java:27-28`). Under `MANDATORY`, a specimen whose checklist rolls up to anything other than `ACCEPTED` (e.g., `REVIEW`, meaning a `FAIL` answer was recorded) is blocked from proceeding: `enforceAcceptanceGate` throws `SampleAcceptanceBlockedException` (`src/main/java/org/openelisglobal/sampleacceptance/service/SampleAcceptanceRecordServiceImpl.java:171-176`). Under `OPTIONAL` or `OFF`, the same `FAIL` answer is recorded (the row exists, `overall_status = REVIEW`) but does **not** block continuation — this is a lab-wide configuration switch, not a per-instance "accept despite defect" override action. No override/waiver endpoint that lets an individual actor proceed past a `MANDATORY` block on a specific failing specimen was found in the controller (`src/main/java/org/openelisglobal/sampleacceptance/controller/rest/SampleAcceptanceRestController.java`) or service.
- Records are append-only by design ("Each assessment inserts a NEW row — corrections never overwrite, so the row set is the audit trail," `SampleAcceptanceRecord.java:24-25`), which is itself a discrepancy-adjacent property, but again scoped per specimen, not per delivery.

`SampleQaEvent`/`SampleQaEventAction` (§3), by contrast, is not a gate at all — recording a `SampleQaEvent` does not by itself stop testing; nothing in the DAO/service layer couples its existence to a workflow block (no comparable `*BlockedException` was found for `SampleQaEvent`). So OpenELIS has two independent condition-recording mechanisms: one (older, `SampleQaEvent`, accession-anchored) that records without gating, and one (newer, `SampleAcceptanceRecord`, specimen-anchored) that can gate depending on lab configuration.

### 5. Verification of the accession/login record itself

Search performed: `verifyLogin`, `verifyAccession`, `loginVerif`, `accessionVerif`, `LoginVerification`, case-insensitive, across `src/main/java`, excluding tests: **7 hits, all unrelated** — they are `ElectronicSignatureServiceImpl`/`CredentialVerificationService` methods that verify a *user's password credentials* during e-signature, not the transcription of an accession (`src/main/java/org/openelisglobal/esig/service/ElectronicSignatureServiceImpl.java:285`, `CredentialVerificationService.java:28-36`, `CredentialVerificationServiceImpl.java:53-98`). Searching for `resultVerif`/`ResultVerif`-named classes in `src/main` returned **0 hits** as well, so this could not be used as a positive comparison point from a dedicated "result verification" class name; result-level second-review in OpenELIS is understood (from module names encountered incidentally, e.g. test-result status fields) to live elsewhere in the result/analysis tables, which were out of scope for this pass and were not read.

The one entity that plausibly models second-person sign-off nearest the accession is **`SampleQaChecklist`** (module comment: "OGC-356"), table `SAMPLE_QA_CHECKLIST`: columns `ID`, `SAMPLE_ID` (`nullable=false, unique=true` — one row per accession, not per specimen), `VERIFIED_ITEMS` (JSON), `ALL_REQUIRED_VERIFIED`, `VERIFIED_BY_USER_ID`, `VERIFIED_DATE` (`src/main/java/org/openelisglobal/qachecklist/valueholder/SampleQaChecklist.java:28-53`). Its own class comment: "Tracks QA verification status for orders in Step 4 of the workflow... Checklist items are configured via the Dictionary system (category: QAChecklistItem)" (`SampleQaChecklist.java:22-26`; controller comment repeats "Step 4 of the workflow," `src/main/java/org/openelisglobal/qachecklist/controller/SampleQaChecklistRestController.java:25-27`). This is accession-scoped (one row per `Sample`, enforced by a unique constraint on `SAMPLE_ID`) and carries a verifying actor and timestamp.

What this record verifies could not be established from source: no seed/default `Dictionary` rows for category `QAChecklistItem` were found in `db/dbInit/OpenELIS-Global.sql` (search for the literal string `QAChecklistItem` returned no matches), so the checklist's item content is entirely lab-configured at runtime and not defined in the shipped schema or code. It is therefore unconfirmed whether this checklist is ever used, in practice, to verify that the login/accession was transcribed correctly (as opposed to some other Step 4 gate unrelated to transcription accuracy) — this is reported as an open question below, not asserted either way.

Also note: `SampleQaChecklist` is a single **mutable** row per accession (its own Javadoc contrasts it with `SampleAcceptanceRecord`, which is "immutable... each assessment inserts a NEW row" — `SampleAcceptanceRecord.java:21-26`), so unlike `SampleAcceptanceRecord` it does not preserve a history of prior verification states.

### 6. Is the accession-level `Sample` independently addressable in the UI?

Yes. `Sample` is opened directly by accession number as a first-class page/route, not merely inferred by grouping specimens:
- `SampleEditController` exposes `GET /SampleEdit` and `POST /SampleEdit` (`src/main/java/org/openelisglobal/sample/controller/SampleEditController.java:141`, `:391`).
- The REST equivalent, `SampleEditRestController`, exposes `GET /rest/SampleEdit` (`src/main/java/org/openelisglobal/sample/controller/rest/SampleEditRestController.java:120`) and `GET /rest/patientByLabNumer` (`SampleEditRestController.java:195`) — the latter looks the patient up by lab/accession number, confirming the accession number is the addressing key, not a per-specimen id.
- `SampleRestController` at `/rest/sample` exposes `GET /all-by-accession/{accessionNumber}` and `GET /unassigned-by-accession/{accessionNumber}` (`src/main/java/org/openelisglobal/sample/controller/rest/SampleRestController.java:47`, `:70`), both keyed on the accession number and returning/operating on the set of specimens under it — i.e., accession-as-parent is a routed concept in the API, not just a shared foreign key.

## What I could not establish

- What the default/typical content of the `SampleQaChecklist` "Step 4" checklist is, and specifically whether any lab configures it to verify accession/login transcription accuracy (vs. some other pre-analytical gate) — no seed dictionary rows for `QAChecklistItem` exist in the shipped schema, so this is lab-configuration-dependent and unknowable from source alone.
- Whether `SampleQaEvent` (discrepancy) recording has any workflow-blocking effect elsewhere in the codebase outside the acceptance-checklist module — I searched the DAO/service layer for a `*BlockedException` analogue tied to `SampleQaEvent` and found none, but did not exhaustively trace every call site of `SampleQaEventService`.
- Whether `Sample.sysUserId`/`systemUser` is populated specifically at accession/receipt time (a "received by" fact) as opposed to being a general last-modified-by actor reused across the object's lifecycle — the field name and mapping do not disambiguate this, and I did not trace the DAO/service code that sets it during the receipt workflow.
- The result-level (as opposed to accession-level) verification model, which the ticket asked to be distinguished from accession-level verification — this was out of scope for the files read and was not investigated; I can only report that no dedicated `*ResultVerif*`-named class exists under `src/main/java`, which is a weak negative signal, not a full absence claim.
- Whether `SampleItem.receivedDate` and `Sample.receivedTimestamp` are ever set to different values in practice (i.e., whether the duplication in §2 is live divergence risk or is kept synchronized by application code) — this would require tracing the receipt/accession service and was not done in this pass.

## Sources

- I-TECH-UW/OpenELIS-Global-2, GitHub repository, shallow clone of default branch, HEAD `b27664e` ("fix(OGC-1201): order entry — consolidated fix list (#4282)"), fetched 2026-09-11: https://github.com/I-TECH-UW/OpenELIS-Global-2
  - `src/main/java/org/openelisglobal/sample/valueholder/Sample.java`
  - `src/main/resources/hibernate/hbm/Sample.hbm.xml`
  - `src/main/java/org/openelisglobal/sampleitem/valueholder/SampleItem.java`
  - `src/main/resources/hibernate/hbm/SampleItem.hbm.xml`
  - `src/main/java/org/openelisglobal/sampleqaevent/valueholder/SampleQaEvent.java`
  - `src/main/resources/hibernate/hbm/SampleQaEvent.hbm.xml`
  - `src/main/java/org/openelisglobal/sampleqaeventaction/valueholder/SampleQaEventAction.java`
  - `src/main/java/org/openelisglobal/qaevent/valueholder/QaEvent.java`
  - `src/main/java/org/openelisglobal/action/valueholder/Action.java`
  - `src/main/java/org/openelisglobal/sampleacceptance/valueholder/SampleAcceptanceRecord.java`
  - `src/main/java/org/openelisglobal/sampleacceptance/service/SampleAcceptanceRecordServiceImpl.java`
  - `src/main/java/org/openelisglobal/sampleacceptance/service/SampleAcceptanceChecklistServiceImpl.java`
  - `src/main/java/org/openelisglobal/sampleacceptance/controller/rest/SampleAcceptanceRestController.java`
  - `src/main/java/org/openelisglobal/qachecklist/valueholder/SampleQaChecklist.java`
  - `src/main/java/org/openelisglobal/qachecklist/controller/SampleQaChecklistRestController.java`
  - `src/main/java/org/openelisglobal/barcode/labeltype/OrderLabel.java`
  - `src/main/java/org/openelisglobal/barcode/labeltype/SpecimenLabel.java`
  - `src/main/java/org/openelisglobal/sample/controller/SampleEditController.java`
  - `src/main/java/org/openelisglobal/sample/controller/rest/SampleEditRestController.java`
  - `src/main/java/org/openelisglobal/sample/controller/rest/SampleRestController.java`
  - `src/main/java/org/openelisglobal/esig/service/ElectronicSignatureServiceImpl.java`
  - `src/main/java/org/openelisglobal/esig/service/CredentialVerificationService.java`
  - `db/dbInit/OpenELIS-Global.sql` (shipped schema/seed data, `clinlims` schema — used for table definitions of `sample_qaevent`, `sample_qaevent_action`, and for the dictionary reject-reason seed rows under group id 257)
