# How do mature open-source laboratory information systems physically store audit/event/history records — one polymorphic table discriminated by subject type, or several tables each keyed to one kind of subject? And how do they answer "what happened around date X" across subject types?

**Asked by:** the orchestrator (audit/event store topology ticket)
**Date:** 2026-09-11
**Status of sources:** Every structural claim below is read from source cloned and grepped on **2026-09-11**, not from documentation summaries or comparison sites. Clones were made into a session scratchpad, not into this repository's working tree.

| Repo | Clone HEAD | HEAD date | Default branch | Latest released tag |
|---|---|---|---|---|
| `I-TECH-UW/OpenELIS-Global-2` | `672c92a618f8ad146560846eacafb0e0a4178068` | 2026-09-10 | `develop` | **3.2.2.0**, published 2026-08-18 (`gh api .../releases`) |
| `senaite/senaite.core` | `993f721e6d8494d94a4001cd3d73409504b67a49` | 2026-09-10 | **`2.x`** (per `git remote show origin`) | **v2.6.0**, published 2025-04-04. `CHANGES.rst` header is `2.7.0 (unreleased)` |
| `senaite/senaite.jsonapi` | `ea7d780e1bcaa9a2f970e7e615b6c11bf11af6d6` | 2026-07-31 | — | not checked (only grepped for auditlog exposure) |
| `LabKey/server` | `c7563bffeed83a7a3c59e5a41bbe15ede6980d57` | 2026-09-09 | `develop` | — (meta-repo; `server/modules/` contains only a README, modules are pulled by Gradle) |
| `LabKey/platform` | `661e2b34c3e7d52c3c8109c7851c20593e2fcf44` | 2026-09-11 | `develop` | no GitHub releases; release lineage is branches, newest seen `release26.9` |

**Currency notes.**
- SENAITE carries a tag `v3.2.0` (`e608e8d`). Do **not** read that as "version 3". `gh api repos/senaite/senaite.core/git/tags/...` gives its tagger date as **2017-06-21** and its message as *"v3.2.0 marker tag. It is a marker previous to 17.XX improvements."* — it is a legacy Bika-lineage marker. The current release line is 2.x; latest published release is **v2.6.0 (2025-04-04)**.
- The LabKey finding that the single `audit.AuditLog` table is **dropped** rests on a migration script. I verified it is present not only on `develop` but also on the `release26.9` branch, via `gh api repos/LabKey/platform/contents/audit/resources/schemas/dbscripts/postgresql?ref=release26.9`, which lists `audit-25.000-25.001.sql`. So it is current, not speculative develop-only work.
- Bika LIMS was **not** cloned separately. It did not need to be: `senaite.core` physically vendors the `bika.lims` package inside itself (`src/bika/lims/...` alongside `src/senaite/core/...`), and the auditlog code is split across both namespaces in the same distribution. There is no separate maintained Bika audit implementation to compare.

No real laboratory documents, client names, product names or batch identifiers appear anywhere in this file. All names below are open-source table, column, class and package names.

---

## Findings

### Short answer

The three systems have **three different answers**, and they are not variations on a theme:

| | Physical shape | Subject key | Cross-type "date X" query |
|---|---|---|---|
| OpenELIS Global 2 | **one polymorphic table** (`clinlims.history`) | `(reference_table, reference_id)`, both numeric, **no FK on either** | **Yes** — a first-class supported query, HQL over `history` filtered on `timestamp` and sorted `timestamp desc` |
| SENAITE | **no event table at all** — snapshots live on the audited object | annotation on the object itself; discrimination is by object identity | **Partially** — a cross-type view exists but returns **one row per object** (its *latest* snapshot), not one row per event |
| LabKey Server | **one provisioned table per event type** (~35+ types) | each table is typed; no shared discriminator table | **No** — no union query, no cross-type view; the admin UI is a dropdown that shows one event type at a time |

---

## 1. OpenELIS Global 2 — one polymorphic table, referential integrity given up on purpose

### 1.1 The `history` table's actual columns

DDL, `db/dbInit/OpenELIS-Global.sql:1568-1576` (the same file is duplicated verbatim at `volume/database/dbInit/OpenELIS-Global.sql:1568`, `install/installerTemplate/linux/initDB/OpenELIS-Global.sql:1568` and `src/test/resources/postgre-db-init/OpenELIS-Global.sql:1568`):

```sql
CREATE TABLE clinlims.history (
    id numeric(10,0) NOT NULL,
    sys_user_id numeric(10,0) NOT NULL,
    reference_id numeric NOT NULL,
    reference_table numeric NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    activity character varying(1) NOT NULL,
    changes bytea
);
```

Seven columns. The comment on `id` in the DDL is `'Sequential number for audit records'` (`db/dbInit/OpenELIS-Global.sql:1584`).

The JPA/value side matches exactly — `src/main/java/org/openelisglobal/audittrail/valueholder/History.java:25-31` declares `id`, `referenceId`, `referenceTable`, `timestamp`, `activity`, `changes` (as `byte[]`) and `sys_user_id`. The Hibernate mapping is XML, not annotations: `src/main/resources/hibernate/hbm/History.hbm.xml:6-41`, class mapped to `table="HISTORY"`, id generated from sequence `history_seq` (`:13`).

### 1.2 How the subject is identified — quoted field names

The polymorphic key is the pair **`reference_table`** and **`reference_id`**, exposed in Java as `referenceTable` / `referenceId` (`History.java:26-27`, `History.hbm.xml:21-30`). Both are stored as **numeric**, and both go through `LIMSStringNumberUserType`, so Java holds them as `String` while the database holds numbers.

`reference_table` is a foreign-key-shaped reference to a registry table:

```sql
CREATE TABLE clinlims.reference_tables (
    id numeric(10,0) NOT NULL,
    name character varying(40),
    keep_history character varying(1),
    is_hl7_encoded character varying(1),
    lastupdated timestamp(6) without time zone
);
```
(`db/dbInit/OpenELIS-Global.sql:5013-5019`)

So the discriminator is not a string type name but a **row id in a registry of audited table names**, and that registry carries a per-table **opt-in flag** `keep_history`. `AuditTrailServiceImpl` looks the table up by name and silently returns if the flag is not `Y`:

- `daoimpl/AuditTrailServiceImpl.java:70-78` (insert path) and `:130-139` (update/delete path) — both do `referenceTablesService.getReferenceTableByName(...)` and bail out with a debug log when `keepHistory` is not `Y`.
- If the registry row is **missing** entirely, it throws `LIMSRuntimeException` and the enclosing INSERT/UPDATE is rolled back (`:81-85`, `:140-146`). The code comment at `:79-80` states this intent explicitly: *"if logging failes an exception should be thrown so that INSERT/UPDATE is rolled back"*. Audit failure is a transaction failure, by design.

**A wrinkle worth naming:** the seeded `reference_tables` content (120 rows, `COPY` block starting at `db/dbInit/OpenELIS-Global.sql:15012`) contains **duplicate table names with different ids** — `SYSTEM_ROLE` at ids 172, 174 and 177; `SYSTEM_USER_ROLE` at 175, 176 and 178; `SYSTEM_ROLE_MODULE` at 173 and 179; and `observation_history_type` twice. The lookup is `getReferenceTableByName`, i.e. name → one id, so historical rows written under a now-unselected id for the same logical table would not be found by a reference-table-id filter. I did not trace which id the lookup actually returns (that depends on the DAO's query and row ordering), so I flag this as an **observed data-shape hazard, not a proven defect**. Confidence: high on the duplicates, low on the consequence.

### 1.3 Is there a foreign key on the subject column?

**No.** Polymorphism is bought by giving up referential integrity on the subject, exactly as suspected. The only constraints on `history` are:

- `hist_pk PRIMARY KEY (id)` — `db/dbInit/OpenELIS-Global.sql:18191-18192`
- `history_sysuer_fk FOREIGN KEY (sys_user_id) REFERENCES clinlims.system_user(id) MATCH FULL` — `db/dbInit/OpenELIS-Global.sql:20327-20328` (the constraint name is misspelled in the source)

There is **no** FK on `reference_id` (there cannot be — it points at any of ~120 tables) and, notably, **no FK on `reference_table` either**, even though `reference_tables.id` exists and could carry one. So the actor is referentially protected; the subject is not, in either half of the pair. Confidence: high — I grepped all `ALTER TABLE ... history` statements in the DDL and there are exactly three (owner, PK, user FK).

### 1.4 What is written into it

All three, depending on the activity code. The codes are single characters, `IActionConstants.java:201-203`:

```java
String AUDIT_TRAIL_DELETE = "D";
String AUDIT_TRAIL_UPDATE = "U";
String AUDIT_TRAIL_INSERT = "I";
```

- **Insert (`I`)** writes an **action record with no payload**. `changes` is left null. The method comment is explicit (`AuditTrailServiceImpl.java:63-66`): *"For an insert log the id, sys_user_id, ref id, reftable, timestamp, activity (='I'). The change column would be blank, since the before data did not contain anything. Note: This requires making the changes column (in history table) nullable"*. So for creation you learn *that* a row was created and by whom, not what it contained.
- **Update / delete (`U`/`D`)** write a **per-field change record, serialised as XML, stored as `bytea`**. `saveHistory` calls `getChanges(newObject, existingObject, tableName)` (`:179`), and only writes a row if the resulting XML is non-empty (`:185`). The XML is `xml.getBytes()` (`:191`).
- The XML shape is one element per changed field, holding the **old** value, produced by `getXMLFormat` (`AuditTrailServiceImpl.java:1370-1386`): `XMLUtil.makeStartTag(label)` + `Encode.forXmlContent(value)` + `makeEndTag(label)`, one per line. The in-code comment at `:1377-1381` records a deliberate decision to emit the tag **even when the old value is blank**, so that blank→filled transitions survive: *"the field name itself is the record of what changed."*
- There is redaction. `SENSITIVE_FIELD_NAMES` (`:51-55`) excludes `documentData`, `photoData`, `thumbnailData` — base64 payloads and PII — from the change record, and the comment at `:45-50` notes an entity can opt a single field out by exposing a `get<Field>_Audit()` getter returning a redacted value, picked up by reflection.

So: **action name always, per-field old-value XML blob on change, nothing on create.** That is a hybrid, and the asymmetry (no payload on insert) is the part worth carrying forward.

### 1.5 Indexes on `history`

Two in the base DDL (`db/dbInit/OpenELIS-Global.sql:19430, 19437`):

```sql
CREATE INDEX hist_sys_user_fk_i ON clinlims.history USING btree (sys_user_id);
CREATE INDEX hist_table_row_i  ON clinlims.history USING btree (reference_id, reference_table);
```

Note the composite is `(reference_id, reference_table)` — **reference_id leading**. That is tuned for "show me this object's history", not for "show me everything that happened to samples".

Two more were added later specifically to support the cross-type query, in `src/main/resources/liquibase/3.5.x.x/003-audit-trail-menu.xml:52-59`, changeset `add-history-indexes-for-system-audit`, whose own comment says *"Add indexes to support system audit event queries (filter/sort by timestamp, reference_table, sys_user_id)"*:

```sql
CREATE INDEX IF NOT EXISTS idx_history_timestamp_reftable
  ON clinlims.history (timestamp DESC, reference_table);
CREATE INDEX IF NOT EXISTS idx_history_sys_user_id
  ON clinlims.history (sys_user_id);
```

This is the tell. The cross-type chronological query was **retrofitted**, and it needed a second, differently-ordered index — `(timestamp DESC, reference_table)` — because the original `(reference_id, reference_table)` index cannot serve it. The per-subject index and the chronological index are disjoint.

### 1.6 The "what happened around date X" query

This exists and is first-class. `HistoryDAOImpl` has three query methods (`src/main/java/org/openelisglobal/audittrail/daoimpl/HistoryDAOImpl.java`):

- `getHistoryByRefIdAndRefTableId(...)` (`:26`, `:35`) — the per-subject query. HQL: `from History h where h.referenceId = :refId and h.referenceTable = :tableId order by ...` (`:41-42`).
- `getSystemEventHistory(Timestamp startDate, Timestamp endDate, String sysUserId, List<String> referenceTableIds, String activity, String search, String referenceId, int page, int pageSize)` (`:56-58`) — the cross-type query. Builds `from History h where 1=1`, appends filters, then `order by h.timestamp desc` (`:66-68`), with `setFirstResult`/`setMaxResults` paging (`:72-73`).
- `getSystemEventHistoryCount(...)` (`:83`) — the matching `select count(*)` for paging.

The filters (`appendFilters`, `:102`+) are `timestamp >= :startDate`, `timestamp <= :endDate`, `sysUserId`, `referenceTableIds` (a *list*, i.e. "these subject types"), `activity`, a free-text `search`, and `referenceId`. So the shape is: **date window + optional subject-type set + optional actor**, sorted newest-first, paged.

Supporting surfaces: `controller/rest/SystemAuditEventRestController.java`, `controller/AuditTrailReportController.java`, `action/workers/AuditTrailViewWorkerImpl.java`, and the menu entries created by the same Liquibase changelog (`003-audit-trail-menu.xml`) — `menu_reports_audittrail_system` (`/AuditTrailReport?type=system`-style) and `menu_reports_audittrail_order`. There is also `service/AuditEntitySnapshotService.java` and `util/AuditFieldStringifier.java` in the same package, and a test suite including `SystemAuditTrailIntegrationTest`, `PatientMultiFieldAuditTrailIntegrationTest` and `AuditTrailServiceSensitiveFieldSkipTest`.

One robustness detail worth noting because it is a consequence of the numeric-key choice: `getSystemEventHistory` short-circuits to an empty list when `sysUserId` is non-numeric, because `LIMSStringNumberUserType` calls `Integer.parseInt` at bind time and a bad client filter would otherwise surface as an HTTP 500 (`HistoryDAOImpl.java:59-64`). Storing ids as `String` over `numeric` columns pushes validation into the DAO.

### 1.7 What else in OpenELIS keeps an append-only log outside `history`

Several things. This is the most decision-relevant part of the OpenELIS answer: `history` is **not** the only append-only store.

**a) A second polymorphic audit table, with a different discriminator style: `electronic_signature`.** Created by `src/main/resources/liquibase/3.5.x.x/004-electronic-signature.xml:26-78`. Columns include `id`, `signer_id`, `signer_name_printed`, `signature_meaning`, `signed_at`, **`record_type VARCHAR(100)`**, **`record_id BIGINT`**, `rejection_reason`, `session_signing_sequence`, `auth_method`, `client_ip`, `user_agent`, `last_updated`. Indexed on `(record_type, record_id)` and on `signer_id` (`:132-142`). So the same codebase contains **two polymorphic append-only stores that disagree on how to name the subject type** — `history` uses a numeric registry id, `electronic_signature` uses a free-text `record_type` string. Neither can be joined to the other without a mapping. Confidence: high.

**b) `document_track`** — `db/dbInit/OpenELIS-Global.sql:1294-1302`: `id`, `table_id`, `row_id`, `document_type_id`, `parent_id`, `report_generation_time`, `lastupdated`, `name`. A **third** polymorphic pattern, `(table_id, row_id)`, tracking report/document generation.

**c) Other domain-specific event tables** found by grepping `CREATE TABLE clinlims.*(audit|track|log|event|history)` in the base DDL: `analysis_qaevent` (`:490`), `analysis_qaevent_action` (`:505`), `instrument_log` (`:1879`), `nc_event` (`:2705`), `nce_action_log` (`:2757`), `observation_history` (`:2941`), `observation_history_type` (`:3029`), `qa_event` (`:4414`), `sample_qaevent` (`:6552`), `sample_qaevent_action` (`:6576`), `result_signature` (`:6003`). Of these, `observation_history` is *not* audit — it is clinical observation data (it has an FK-shaped `sample_id` and its own index `obs_history_sample_idx`). The `qaevent` family is the non-conformity/CAPA model, not a generic audit trail.

**d) Account administration events — where do they land?** They land in **`history`**, not in a separate table. The seeded `reference_tables` registry carries `keep_history = Y` for the identity tables:

| id | name | keep_history |
|---|---|---|
| 28 | `SYSTEM_USER` | Y |
| 50 | `LOGIN_USER` | Y |
| 52 | `SYSTEM_USER_MODULE` | Y |
| 53 | `SYSTEM_USER_SECTION` | Y |
| 172, 174, 177 | `SYSTEM_ROLE` | Y |
| 173, 179 | `SYSTEM_ROLE_MODULE` | Y |
| 175, 176, 178 | `SYSTEM_USER_ROLE` | Y |

(all from the `COPY clinlims.reference_tables` block, `db/dbInit/OpenELIS-Global.sql:15012`+)

So creating a user, granting a role, and changing a sample result are **rows in the same table**, distinguishable only by `reference_table`, and a single date-ranged query returns them interleaved. That is the strongest argument in the corpus for the one-table shape. Caveat: this is the *registry* saying those tables are audited; I did not trace each identity-mutating service call to confirm it actually invokes `saveHistory`. Confidence: high on the registry, medium on end-to-end coverage. I did **not** find a dedicated login/logout or failed-authentication log table — `login_user` is a credential row, not a log.

---

## 2. SENAITE — no event table; snapshots on the object, one catalog over objects

### 2.1 Where snapshots physically live

**On the audited object, as a Zope annotation.** `src/senaite/core/api/snapshot.py:43`:

```python
SNAPSHOT_STORAGE = "senaite.core.snapshots"
```

`get_storage(obj)` (`:68-77`) does `IAnnotations(obj)` and lazily creates a `PersistentList` under that key. `take_snapshot` (`:310-343`) builds a dict from `get_object_data(obj)`, attaches `get_object_metadata(obj, **kw)` under the key `"__metadata__"`, `json.dumps` it, appends the **JSON string** to that list, and marks the object `IAuditable` via `alsoProvides`.

So: it is **not one table, and not several tables** — it is **one append-only JSON list per object, stored inside the object's own ZODB record**. The snapshot is a **full serialised state**, not a per-field delta; diffs are computed at read time by `compare_snapshots` (`:363`+).

Eligibility is broad and structural, not a type whitelist — `supports_snapshots` (`:55-65`) returns true for anything `IAnnotatable` that does not provide `IDoNotSupportSnapshots`. Confidence: high.

### 2.2 Is there a single catalog queryable chronologically across types?

**Yes, one catalog — but it indexes objects, not events.**

`src/senaite/core/catalog/auditlog_catalog.py:28-29`:

```python
CATALOG_ID = "senaite_catalog_auditlog"
CATALOG_TITLE = "Senaite Auditlog Catalog"
```

Its own indexes, on top of `BASE_INDEXES` (`:31-40`):

| Index | Type |
|---|---|
| `action` | FieldIndex |
| `actor` | FieldIndex |
| `listing_searchable_text` | ZCTextIndex |
| `modified` | DateIndex |
| `modifiers` | KeywordIndex |
| `snapshot_created` | DateIndex |
| `snapshot_version` | FieldIndex |

`COLUMNS` adds nothing beyond `BASE_COLUMNS` (`:42-44`) and `TYPES` — the mapped portal types — is the **empty list** (`:46-48`, returned by `mapped_catalog_types` at `:58-60`). That is the "one store for every content type" answer: it is not scoped to a type set at all.

**The critical structural point.** The indexers (`src/senaite/core/catalog/indexer/auditlog.py`) are declared `@indexer(IAuditable)` over the *content object*, and they read the object's **last** snapshot:

- `actor(instance)` → `get_last_snapshot(instance)` then `get_actor(...)` (`:104-109`)
- `action(instance)` → `get_last_snapshot(instance)` (`:128-133`)
- `modifiers(instance)` → `map(get_actor, get_snapshots(instance))` — a KeywordIndex over *all* actors, so "which objects did user U ever touch" works (`:120-125`)

and the subscribers call `auditlog_catalog.reindexObject(obj)` (`src/senaite/core/subscribers/auditlog.py:45-52`), gated on the setup flag `getEnableGlobalAuditlog()` (`:51`).

So the catalog holds **one brain per auditable object**, carrying that object's *most recent* snapshot's actor/action/date. There is no catalogued record of any individual earlier event.

### 2.3 Does a cross-object chronological UI exist?

**Yes — `senaite.core.browser.controlpanel.auditlog.view.AuditLogView`**, registered as the `view` of the `IAuditLog` container (`src/senaite/core/browser/controlpanel/auditlog/configure.zcml`, permission `senaite.core.permissions.ManageBika`). It sets `self.catalog = AUDITLOG_CATALOG` and

```python
self.contentFilter = {
    "path": "/",
    "sort_on": "snapshot_created",
    "sort_order": "descending",
}
```
(`view.py:40-45`), pagesize 25 (`:57`), columns `title / version / modified / actor / fullname / roles / remote_address / action / review_state / diff` (`:59-96`).

The `AuditLog` container is a Dexterity `Container` (`src/senaite/core/content/auditlog.py:36-38`) created at setup as `("auditlog", "Audit Log", "AuditLog")` (`src/senaite/core/setuphandlers.py:270`). It is itself marked `IDoNotSupportSnapshots` (`content/auditlog.py:34`) — the audit log does not audit itself.

**But `folderitem` proves the granularity is per-object, not per-event** (`view.py:114-175`): for each brain it does `snapshot = get_last_snapshot(obj)`, reads that snapshot's metadata, sets `version = get_snapshot_version(obj, snapshot)`, and computes the diff against `get_snapshot_by_version(obj, version-1)`. **One row per object, always its latest snapshot.**

**Therefore the honest answer to "what happened around date X" in SENAITE is: you cannot get it from the catalog.** Sorting on `snapshot_created desc` gives you *objects whose most recent change* falls in the window. An object modified on date X and again on date X+30 will show only the X+30 event; its date-X event is still on disk, in the annotation `PersistentList`, but is not indexed and not reachable by any date query. To reconstruct a true event stream for a date range you would have to walk every auditable object and unpack its JSON list. Confidence: high — this follows directly from the indexers reading `get_last_snapshot` and from `folderitem` reading `get_last_snapshot`.

The per-object view is separate: `src/senaite/core/browser/auditlog.AuditLogView`, registered `for="bika.lims.interfaces.IAuditable"` name `auditlog` (`browser/auditlog.zcml`), which does **not** use the auditlog catalog at all — it sets `self.catalog = "uid_catalog"` with `contentFilter = {"UID": api.get_uid(context)}` (`browser/auditlog.py:58-59`). Diff rendering template: `src/senaite/core/browser/templates/auditlog_diff.pt`. A viewlet `src/senaite/core/browser/viewlets/auditlog.py` with `templates/auditlog_disabled.pt` warns when the global auditlog is off.

### 2.4 Are user/account administration changes captured? — **No.**

This is a clean negative and I want to be explicit about how I established it.

The snapshot subscribers are registered **only for content-object interfaces**. From the subscriber `configure.zcml`, the four auditlog handlers are registered `for="Products.Archetypes.interfaces.IBaseObject"` and `for="plone.dexterity.interfaces.IDexterityContent"` (ObjectInitialized and ObjectModified), and `for="*"` on the transition and removed events (`subscribers/configure.zcml`, the `.auditlog.*` handler block). Plone users and groups are **PAS/MemberData principals in `acl_users`, not content objects**, so they never fire those events and never reach `take_snapshot`.

What I grepped, and got **zero hits** across the whole clone (`*.py` and `*.zcml`):

- `IPrincipalCreatedEvent`
- `IPrincipalDeletedEvent`
- `IUserLoggedInEvent`
- `IUserLoggedOutEvent`
- `PASEvent`
- `IGroupAdded`
- `RoleAssign`

I also grepped every call site of `take_snapshot` outside `api/snapshot.py`. There are six, none of them identity-related: `bika/lims/utils/analysisrequest.py:639` (duplicating a request), `bika/lims/browser/publish/emailview.py:473` (a report), `bika/lims/api/__init__.py:275`, `senaite/core/upgrade/v02_07_000.py:816` (an upgrade step, `store=False`), and the subscriber module itself. One further call is **commented out**: `senaite/core/exportimport/genericsetup/structure.py:274`.

Finally, `find . -ipath '*user*' -name '*.py' | grep -i "control\|manag\|member"` returns nothing — there is no SENAITE-owned user-management module to audit.

**Conclusion: in SENAITE, user creation, deletion, role grants, group membership changes and logins are outside the auditlog entirely.** What the auditlog *does* record about identity is only the `roles` the actor held at the moment of a content change — captured into snapshot metadata and rendered as the `roles` column (`controlpanel/auditlog/view.py:158-160`, `metadata.get("roles", [])`). That is the actor's roles, not a record of the grant. Whatever Plone/Zope logs at the platform level is out of SENAITE's model and I did not investigate it. Confidence: high.

### 2.5 senaite.jsonapi

Does not expose the auditlog. The only contact is serialisation of a version number: `sjsonapi/src/senaite/jsonapi/api/serialization.py:36` imports `from bika.lims.api import snapshot` and `:96` sets `info["version"] = snapshot.get_version(obj)`. No snapshot list, no diff, no chronological endpoint. Confidence: high — that grep (`auditlog|snapshot` over `src/`) returned exactly three lines.

### 2.6 Bika LIMS

Not a separate implementation. `senaite.core` ships the `bika.lims` namespace inside itself; the auditlog is split across both (`src/bika/lims/controlpanel/auditlog.py` defines `class AuditLog(ATFolder)`, the Archetypes-era ancestor of the Dexterity `AuditLog` in `src/senaite/core/content/auditlog.py`, and `src/bika/lims/catalog/auditlog_catalog.py` sits beside `src/senaite/core/catalog/auditlog_catalog.py`). The two-namespace split is a migration artefact, not two products.

---

## 3. LabKey Server — many typed tables, and *no* unified query

LabKey is the directly relevant "several typed streams" precedent, and its history is the most instructive part.

### 3.1 It used to be one polymorphic table. That table is now dropped.

`audit/resources/schemas/dbscripts/postgresql/audit-0.000-24.000.sql:19-40` still carries the original:

```sql
CREATE TABLE audit.AuditLog
(
    RowId BIGSERIAL,
    Key1 VARCHAR(1000) NULL, Key2 VARCHAR(1000) NULL, Key3 VARCHAR(1000) NULL,
    IntKey1 INT NULL, IntKey2 INT NULL, IntKey3 INT NULL,
    Comment VARCHAR(500),
    EventType VARCHAR(64),
    CreatedBy USERID NOT NULL,
    Created TIMESTAMP,
    ContainerId ENTITYID NOT NULL,
    EntityId ENTITYID NULL,
    Lsid LSIDtype,
    ProjectId ENTITYID,
    ImpersonatedBy USERID NULL,
    CONSTRAINT PK_AuditLog PRIMARY KEY (RowId)
);
CREATE INDEX IX_Audit_Container ON audit.AuditLog(ContainerId);
CREATE INDEX IX_AuditLog_IntKey1 ON audit.AuditLog(IntKey1);
CREATE INDEX IX_AuditLog_EventType_Created ON audit.AuditLog(EventType, Created);
CLUSTER audit.AuditLog USING IX_AuditLog_EventType_Created;
```

Note the shape of the abandoned design: a **generic key-slot table** — three string slots and three int slots, meaning-per-event-type — discriminated by `EventType`, clustered on `(EventType, Created)`.

And the current migration, `audit/resources/schemas/dbscripts/postgresql/audit-25.000-25.001.sql`, in full:

```sql
-- This old table hasn't been used since we migrated the audit log to provisioned tables (in 2013!)
DROP TABLE IF EXISTS audit.AuditLog;
```

LabKey's own comment dates the move away from the single polymorphic table to **2013**, and the shell was finally dropped in the 25.001 script (present on both `develop` and `release26.9`). This is a mature system that ran the one-table design, replaced it, and lived with the replacement for over a decade.

### 3.2 What replaced it: one provisioned table per event type

Each audit event type is an `AuditTypeProvider` backed by a `Domain` whose storage is materialised by `StorageProvisioner`:

- `api/src/org/labkey/api/audit/AbstractAuditTypeProvider.java:92-97` — constructor takes an `AbstractAuditDomainKind` and registers it with `PropertyService`.
- `:117-134` — on init, resolves `domainKind.generateDomainURI(QUERY_SCHEMA_NAME, getEventName(), getDomainContainer(), null)` and calls `PropertyService.get().createDomain(...)` if absent.
- `:267-270` — `StorageProvisioner.createTableInfo(domain)` — i.e. a **real physical table per provider**.
- `api/src/org/labkey/api/audit/query/AbstractAuditDomainKind.java:274-277` — `getStorageSchemaName()` returns `AbstractAuditTypeProvider.SCHEMA_NAME`; `:269` opens it as `DbSchemaType.Provisioned`.

Every typed table shares three base fields (`AbstractAuditDomainKind.java:93-95`): `EventType` (VARCHAR), `Created` (TIMESTAMP), `CreatedBy` (INTEGER) — plus whatever the provider adds. And every provisioned audit table gets the same two indexes by default (`:280-286`):

```java
new PropertyStorageSpec.Index(false, "Container"),
new PropertyStorageSpec.Index(false, "Created")
```

`getPropertyForeignKeys(...)` returns `Collections.emptySet()` (`:289-293`) — so LabKey, like OpenELIS, declines FKs on audit rows, but for a different reason: the tables are typed, so there is nothing polymorphic left to constrain; they simply do not add them.

`grep -rl "extends AbstractAuditTypeProvider"` across `LabKey/platform` returns **35+** providers, including `UserAuditProvider`, `GroupAuditProvider`, `ContainerAuditProvider`, `TransactionAuditProvider`, `QueryUpdateAuditProvider`, `DatasetAuditProvider`, `SampleTimelineAuditProvider`, `ExperimentAuditProvider`, `AuthenticationSettingsAuditTypeProvider`, `SiteSettingsAuditProvider`, `ClientApiAuditProvider`, `SelectQueryAuditProvider`, `ListAuditProvider`, `FileSystemAuditProvider`, `SearchAuditProvider`, `ModulePropertiesAuditProvider`, `DomainAuditProvider`, `DomainPropertyAuditProvider`, `AttachmentAuditProvider`, `PlateAuditProvider`, `PlateSetAuditProvider`, `SpecimenCommentAuditProvider`, `ReportAuditProvider`, `GridViewAuditProvider`, `QueryExportAuditProvider`, `MessageAuditProvider`, `SystemUpgradeAuditProvider`, `ProtocolManagementAuditProvider`, `ParticipantGroupAuditProvider`, `StudyAuditProvider`, `PublishAuditProvider`, `SecurityEscalationAuditProvider`, `StudySecurityEscalationAuditProvider`, and a `DefaultAuditProvider` fallback.

**Contrast with SENAITE worth carrying:** LabKey *does* audit identity administration as first-class typed streams — `UserAuditProvider` (`getLabel()` → `"User events"`, event name `UserManager.USER_AUDIT_EVENT`, `core/src/org/labkey/core/query/UserAuditProvider.java:60-70`, with a `User` column at `:47` and indexes on `User` and `(Created, User)` at `:138-139`) and `GroupAuditProvider` (`getLabel()` → `"Group and role events"`, event name `GroupManager.GROUP_AUDIT_EVENT`, `api/src/org/labkey/api/audit/provider/GroupAuditProvider.java:88-97`).

### 3.3 Is there a unified query over them? — **No.**

The query facade is a schema, not a union. `audit/src/org/labkey/audit/query/AuditQuerySchema.java:42`:

```java
public static final String SCHEMA_NAME = "auditLog";
```

`getTableNames()` (`:68-79`) simply **enumerates one table name per provider**:

```java
for (AuditTypeProvider provider : AuditLogService.get().getAuditProviders())
    tables.add(provider.getEventName());
```

and `createTable(name, cf)` (`:81-90`) resolves the name to a provider and delegates to `provider.createTableInfo(this, cf)`, returning `null` for anything unrecognised. There is **no union table, no cross-type query, no "all events" table**. I grepped for `*UnionTable*` across the clone: the hits are `study/StudyUnionTableInfo.java`, `study/query/ParticipantGroupCohortUnionTable.java`, `query/sql/UnionTableInfoImpl.java`, `api/data/UnionTableInfo.java`, `api/study/UnionTable.java` — all study/query machinery, **none in the `audit` module**.

The UI confirms it. `ShowAuditLogAction` (`audit/src/org/labkey/audit/AuditController.java:121-166`) takes a `view` parameter naming **one** event type, defaults to `AuditLogService.get().getAuditProviders().getFirst().getEventName()` when absent (`:150-152`), sets `ContainerFilter.Type.AllFolders` (`:156`) — cross-*container*, but still single-type — and renders `auditLog.jsp`, which is a `<select name="view">` of one `<option>` per provider that auto-submits on change (`auditLog.jsp:36-52`). Admin Console link registered at `AuditController.java:87`, permission `CanSeeAuditLogPermission`.

**So an admin asking "what happened around date X" in LabKey must pick an event type first, and repeat the question per type.** The shared `Created` column and the per-table `Created` index mean a union *could* be written in LabKey SQL by hand across named queries — but no such thing ships. Confidence: high on "does not ship"; the hand-written-union possibility is my inference, flagged as such.

### 3.4 Community vs Enterprise

The audit framework is **Community**. `LabKey/platform` is **Apache License 2.0** (`LICENSE`, header lines 1-3), and `api`, `audit`, `core` and `query` — which hold `AuditLogService`, `AuditTypeProvider`, `AbstractAuditTypeProvider`, `AbstractAuditDomainKind`, `AuditQuerySchema`, `AuditController`, `UserAuditProvider` and `GroupAuditProvider` — are all directories of that repo. Caveat: LabKey's *product packaging* (which modules ship in which edition, and features like audit-log retention/archiving policy) is a commercial matter I did not verify against a current price/edition page; I am asserting only that **the source of the audit framework is open and Apache-2.0**, which is what I read. Confidence: high on the licence, medium on edition packaging.

---

## 4. Cross-cutting observations

1. **Nobody in this corpus stores a per-field delta as rows.** OpenELIS stores an XML document of old values in a `bytea`. SENAITE stores a full JSON state snapshot and diffs at read time. LabKey's typed tables carry provider-defined columns plus, for the record-diff providers, `OLD_RECORD_PROP_NAME` / `NEW_RECORD_PROP_NAME` map properties (`AbstractAuditTypeProvider.java:66-68`). The change payload is an opaque-ish blob in all three.
2. **The one-table design is the only one in this corpus that answers the date-X question natively** — and OpenELIS had to add an index in the *opposite column order* to the per-subject index to make it perform (`003-audit-trail-menu.xml:52-59`). The two access patterns want two indexes regardless of table topology.
3. **Only OpenELIS puts account administration in the same stream as laboratory data.** LabKey audits identity but in separate typed tables you must query separately. SENAITE does not audit identity administration at all.
4. **Polymorphism is never referentially enforced.** OpenELIS: no FK on `reference_id` *or* `reference_table`. LabKey: `getPropertyForeignKeys` returns empty. SENAITE: the question does not arise, since the record lives inside the subject.
5. **Having one audit table does not stop a codebase growing others.** OpenELIS has `history`, `electronic_signature` and `document_track` — three polymorphic append-only stores with three mutually incompatible subject-key conventions (`numeric registry id`, `VARCHAR type name`, `numeric table_id`).

---

## What I could not establish

- **Whether every identity-mutating code path in OpenELIS actually writes to `history`.** I established that the `reference_tables` registry marks `SYSTEM_USER`, `LOGIN_USER`, `SYSTEM_USER_ROLE`, `SYSTEM_ROLE`, `SYSTEM_ROLE_MODULE`, `SYSTEM_USER_MODULE` and `SYSTEM_USER_SECTION` as `keep_history = Y`. I did not trace each user-administration service to confirm it calls `saveHistory`/`saveNewHistory`. Registry intent is proven; runtime coverage is not.
- **The consequence of the duplicate `reference_tables` rows.** `SYSTEM_ROLE`, `SYSTEM_USER_ROLE` and `SYSTEM_ROLE_MODULE` each appear under multiple ids. Which id `getReferenceTableByName` returns, and whether historical rows exist under the others, needs the DAO query and a populated database. I did not open either.
- **Whether OpenELIS logs authentication events anywhere.** I found no login/logout/failed-attempt log table in the base DDL. Absence of a *table* is not proof of absence of logging — it could go to the application log via `LogEvent`, which is outside the database and outside what I checked.
- **SENAITE snapshot growth and any pruning.** The annotation `PersistentList` is append-only. I found `del(annotation[SNAPSHOT_STORAGE])` at `api/snapshot.py:663` (a wholesale purge helper) but did not establish whether any scheduled or UI-driven process calls it, nor whether there is a retention policy.
- **Whether LabKey ships any pre-built cross-type audit query in a module outside `LabKey/platform`.** LabKey is a multi-repo build; `LabKey/server/server/modules/` was empty in the clone (modules are resolved by Gradle from an artifact repository). I checked `platform` only. A cross-type audit view could exist in a module I did not fetch — though `AuditQuerySchema.getTableNames()` would still have to be extended for it to appear in the `auditLog` schema, and it is not.
- **LabKey edition packaging.** Which modules are gated to Premium/Enterprise is a commercial matter settled by LabKey's own product pages, not by the source tree. I verified the licence of the source I read (Apache 2.0) and nothing beyond that.
- **Actual production row counts or query latencies** for any of the three. Nothing here is a performance finding.

---

## Sources

All cloned and read on **2026-09-11**.

**I-TECH-UW/OpenELIS-Global-2** — HEAD `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10), branch `develop`, latest release tag `3.2.2.0` (2026-08-18).
- `db/dbInit/OpenELIS-Global.sql` — lines 1294-1302 (`document_track`), 1568-1584 (`history` + column comment), 5013-5019 (`reference_tables`), 15012+ (`COPY clinlims.reference_tables`, 120 rows), 18191-18192 (`hist_pk`), 19430 & 19437 (indexes), 20327-20328 (`history_sysuer_fk`); plus the `CREATE TABLE` scan for audit-shaped tables at 490, 505, 1879, 2705, 2757, 2941, 3029, 4414, 6003, 6552, 6576. Byte-identical copies at `volume/database/dbInit/`, `install/installerTemplate/linux/initDB/`, `src/test/resources/postgre-db-init/`.
- `src/main/java/org/openelisglobal/audittrail/valueholder/History.java:23-91`
- `src/main/resources/hibernate/hbm/History.hbm.xml:6-41`
- `src/main/java/org/openelisglobal/audittrail/daoimpl/AuditTrailServiceImpl.java:45-55, 63-123, 125-200, 1370-1386`
- `src/main/java/org/openelisglobal/audittrail/daoimpl/HistoryDAOImpl.java:20-112`
- `src/main/java/org/openelisglobal/common/action/IActionConstants.java:201-203`
- `src/main/resources/liquibase/3.5.x.x/003-audit-trail-menu.xml:40-59`
- `src/main/resources/liquibase/3.5.x.x/004-electronic-signature.xml:21-142`
- package listing of `src/main/java/org/openelisglobal/audittrail/` and `src/test/java/org/openelisglobal/audittrail/`
- `gh api repos/I-TECH-UW/OpenELIS-Global-2/releases`

**senaite/senaite.core** — HEAD `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), branch `2.x`, latest release `v2.6.0` (2025-04-04), `CHANGES.rst` header `2.7.0 (unreleased)`.
- `src/senaite/core/api/snapshot.py:39-43, 55-77, 107-110, 310-343, 363+, 660-663`
- `src/senaite/core/catalog/auditlog_catalog.py:21-63`
- `src/senaite/core/catalog/indexer/auditlog.py:21-140`
- `src/senaite/core/subscribers/auditlog.py:21-139` and the `.auditlog.*` handler block of the subscribers' `configure.zcml`
- `src/senaite/core/content/auditlog.py:21-38`
- `src/senaite/core/browser/auditlog.py:41-59, 248-259` and `src/senaite/core/browser/auditlog.zcml`
- `src/senaite/core/browser/controlpanel/auditlog/view.py:32-175` and `configure.zcml`
- `src/senaite/core/setuphandlers.py:270`
- `src/senaite/core/profiles/default/types/AuditLog.xml:11, 41-42`
- `src/bika/lims/controlpanel/auditlog.py:24`, `src/bika/lims/catalog/auditlog_catalog.py`
- `src/senaite/core/browser/templates/auditlog_diff.pt`, `src/senaite/core/browser/viewlets/auditlog.py`, `viewlets/templates/auditlog_disabled.pt`
- Negative greps (zero hits, `*.py` + `*.zcml`, whole clone): `IPrincipalCreatedEvent`, `IPrincipalDeletedEvent`, `IUserLoggedInEvent`, `IUserLoggedOutEvent`, `PASEvent`, `IGroupAdded`, `RoleAssign`
- `gh api repos/senaite/senaite.core/releases`; `gh api repos/senaite/senaite.core/git/refs/tags/v3.2.0` and `.../git/tags/e608e8d...` (tagger date 2017-06-21, message "v3.2.0 marker tag…")

**senaite/senaite.jsonapi** — HEAD `ea7d780e1bcaa9a2f970e7e615b6c11bf11af6d6` (2026-07-31).
- `src/senaite/jsonapi/api/serialization.py:36, 90, 96` (the only `auditlog|snapshot` hits in `src/`)

**LabKey/server** — HEAD `c7563bffeed83a7a3c59e5a41bbe15ede6980d57` (2026-09-09), branch `develop`.
- `settings.gradle` (artifact-repository module resolution), `server/modules/` (README only)

**LabKey/platform** — HEAD `661e2b34c3e7d52c3c8109c7851c20593e2fcf44` (2026-09-11), branch `develop`; newest release branch seen `release26.9`. Apache License 2.0 (`LICENSE`).
- `audit/resources/schemas/dbscripts/postgresql/audit-0.000-24.000.sql:17-44`
- `audit/resources/schemas/dbscripts/postgresql/audit-25.000-25.001.sql` (whole file)
- `audit/src/org/labkey/audit/query/AuditQuerySchema.java:42-107`
- `audit/src/org/labkey/audit/AuditController.java:76-186` and `audit/src/org/labkey/audit/auditLog.jsp:29-53`
- `api/src/org/labkey/api/audit/AbstractAuditTypeProvider.java:66-68, 87-134, 243-295`
- `api/src/org/labkey/api/audit/query/AbstractAuditDomainKind.java:69-95, 115, 170, 198, 269-293`
- `core/src/org/labkey/core/query/UserAuditProvider.java:47-70, 122, 138-139`
- `api/src/org/labkey/api/audit/provider/GroupAuditProvider.java:85-97`
- `grep -rl "extends AbstractAuditTypeProvider"` (35+ providers, listed in §3.2); `find -name '*UnionTable*'` (no hits in `audit/`)
- `gh api repos/LabKey/platform/contents/audit/resources/schemas/dbscripts/postgresql?ref=release26.9` (confirms `audit-25.000-25.001.sql` on the release branch)
