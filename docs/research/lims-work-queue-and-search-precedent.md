# How do the two mature LIMS precedents structure work-finding — role landing views, search, filtering, pagination and default time horizon — and what do they get wrong at volume?

**Asked by:** the orchestrator (Benchline wayfinder map)
**Date:** 2026-09-11
**Status of sources:** Read directly from fresh clones made 2026-09-11:

- `senaite/senaite.core`, shallow clone, HEAD `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), branch `master` — same clone used by prior scouts on this map (see `docs/research/senaite-sample-and-assignment-model.md`, `docs/research/method-versioning-lims-precedent.md`). Version header `2.7.0 (unreleased)`; last **released** version 2.6.0, 2025-04-04.
- `senaite/senaite.app.listing`, shallow clone, HEAD `1bd8490682ad6eda78a1351defbbb9e6a0957827` (2026-07-22). This is the package that implements SENAITE's listing/search UI referenced in the ticket; it was not separately cloned by prior scouts, so all findings from it are new to this file.
- `I-TECH-UW/OpenELIS-Global-2`, blobless clone, HEAD `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10), default branch `develop`. Same commit prior scouts used. Latest tagged release 3.2.2.0 (2026-08-18); I did not re-check every finding below against that tag specifically — flagged per-finding where it matters.
- GitHub issue/search API (`gh api`) against `senaite/senaite.core` for historical scale complaints, read 2026-09-11.

No real laboratory documents, client names, product names or batch identifiers appear anywhere in this file.

## Findings

### 1. Role landing views

**SENAITE.** There is a permission-gated dashboard (`src/senaite/core/browser/dashboard/dashboard.py`) whose `STATUS_CARD_DEFS` (lines ~75-93) show one count-card per workflow state — "Samples to Receive" (`sample_due`), "Results Pending" (`sample_received`), "To be Verified" (`to_be_verified`), "To be Published" (`verified`), "Open Worksheets" — each gated by a permission (`TransitionReceiveSample`, `ViewResults`, `TransitionVerify`, `TransitionPublishResults`, `EditResults`) and linking to a filtered listing. This is lab-wide by workflow state, **not personal** — a card counts every sample in that state for the whole lab, not "assigned to this user."

The one genuinely personal, user-scoped queue I found is on the **Worksheets** listing, not the dashboard: `src/senaite/core/browser/worksheets/view.py:245-302` defines a `"mine"` review-state tab whose `contentFilter["getAnalyst"]` is set to `self.member.id` in `before_render()` (line 294: `mine["contentFilter"]["getAnalyst"] = self.member.id`). There is also a `show_only_mine()` gate (line 296) that, for restricted roles, removes the "Mine" tab entirely and instead force-filters the *whole* worksheets listing to the current user's worksheets (lines 296-302) and hides the "Analyst" column. This queue is scoped to **worksheets** (a batch of analyses), not to individual analyses or samples — an analyst with un-worksheeted (unassigned) analyses waiting would not see them here.

I found **no reviewer-specific "waiting for my verification" view** — the `to_be_verified` sample tab (`src/senaite/core/browser/samples/view.py:348-357`) is a workflow-state filter open to whoever has the `TransitionVerify` permission; it is not scoped to "samples this particular reviewer is expected to verify" (SENAITE's verification model has no per-sample reviewer assignment to scope by — verification permission is role-based, not person-based).

I found **no supervisor capacity/ageing/overdue view** in the sense of "workload per analyst." There is a `"late"` tab on the samples listing (`src/senaite/core/browser/samples/view.py:466-485`) that filters samples whose `getDueDate` has passed — this is an ageing/overdue filter, but lab-wide, not per-analyst and not a capacity view (it does not show how many items each analyst is carrying). Confidence: high — this is a straightforward grep-and-read result across `browser/dashboard`, `browser/samples/view.py`, `browser/worksheets/view.py`.

**OpenELIS Global 2.** Its equivalent of a landing view is the "workplan" family of controllers (`src/main/java/org/openelisglobal/workplan/controller/`: `WorkPlanByTestController`, `WorkplanByPanelController`, `WorkPlanByTestSectionController`, `WorkPlanByPriorityController`) plus REST counterparts. `getAllAnalysisByTestAndStatus()` (`AnalysisDAOImpl.java:106-120`) fetches every `Analysis` row matching a test id and a fixed status list (`NotStarted`, `BiologistRejected`, `TechnicalRejected`, `NonConforming_depricated`, set in `BaseWorkplanController.java:42-48`), then `UserService.filterResultsByLabUnitRoles()` restricts the *already-fetched* list to what the caller's lab-unit role permits (`WorkplanByTestRestController.java:59-60`). This is a **pull-based, section/test-scoped queue that any qualified user in that lab unit can work from — it is absent as a personal "my work" view**, matching the prior scout's finding in `docs/research/open-lims-module-scope-inventory.md` ("absent as assignment; pull-based workplans only"). I did not find an `Analysis.assignedTo`/`assignedUserId` field anywhere in `src/main/java/org/openelisglobal/analysis/valueholder/Analysis.java` to scope a personal view by even if one existed.

I found a "result validation" flow (`src/main/java/org/openelisglobal/resultvalidation/`) that similarly filters by test section, not by a personal reviewer assignment — I found no evidence of a "waiting for my verification" personal view there either; the `BaseResultValidationController` sets only a page title key and defers to the same status-and-section filtering pattern as the workplan. I did not trace the validation SQL/HQL to the same depth as the workplan query, so this is **medium confidence** for OpenELIS's verification queue specifically (I confirmed the absence of a personal-assignment field, but did not exhaustively read every validation controller/service method).

I found no supervisor capacity/ageing view in OpenELIS either — `WorkPlanByPriorityController` sorts by priority, not by age or by per-analyst load, and I found no per-analyst workload aggregation anywhere under `src/main/java/org/openelisglobal/`.

### 2. Pagination

**SENAITE (`senaite.app.listing`).** Offset-based, not keyset. The default page size is a literal class attribute:

```python
# senaite.app.listing/src/senaite/app/listing/view.py:178
pagesize = 50
```

Request overrides read `<form_id>_pagesize` and `<form_id>_limit_from` from the request (`view.py:573-590`). Slicing is a **Python list slice performed after the full result set has already been materialised**, not a bounded catalog query: `_fetch_brains()` (`view.py:892-903`) calls `self.search(...)`, sets `self.total = len(brains)`, then does `brains[idxfrom:self.pagesize + idxfrom]`. The `search()` method itself carries an explicit unaddressed TODO: `# TODO Append start and pagesize to return just that slice of results` (`view.py:936`) — i.e. the authors flagged, and never fixed, that the ZCatalog query underneath is not bounded by page size.

**OpenELIS Global 2.** Also offset-based, with **whole-result-set materialisation** ahead of paging, in application memory rather than the database. `WorkplanPaging.setDatabaseResults()` (`workplan/action/util/WorkplanPaging.java:35-42`) takes the entire filtered `List<TestResultItem>` (already fully fetched — see §3) and hands it to a generic `PagingUtility`, which slices it into pages (`TestItemPageHelper.createPages()`, same file, lines ~68-92) and caches all pages in the **HTTP session** for later `page(request, form, newPage)` calls. The default page size literal is:

```java
// src/main/java/org/openelisglobal/common/paging/PagingProperties.java:11-12
@Value("${org.openelisglobal.paging.results.pageSize:99}")
private Integer resultsPageSize;
```
— 99, overridable via the Spring property `org.openelisglobal.paging.results.pageSize`. Parallel defaults exist for patients (99), validation (99), display lists (99) and order programs (99), all in the same file.

### 3. Is filtering server-side or client-side?

**SENAITE.** Column/workflow-state filters and sort are applied **server-side**, as ZCatalog query parameters — `get_catalog_query()` (`senaite.app.listing/src/senaite/app/listing/view.py:625-655`) builds the query dict from `contentFilter`, `review_state["contentFilter"]`, a validated `sort_on` (checked against `catalog.indexes()`, `view.py:535-546`), and column filters merged in by `apply_column_filters()` (`view.py:663-710`, which maps column keys to catalog index names). That much is genuinely server-side and index-bound.

However, the **catalog query itself is not bounded by row count** (§2), so "server-side filtering" in SENAITE means "the catalog does the field-equality work," not "the catalog returns only what fits on a page." For a state like `sample_received` with no narrowing column filter, the catalog can and does return every matching brain in one call; the network/UI cost of unbounded rows is paid before any pagination happens. Confidence: high, direct read of `get_catalog_query`, `apply_column_filters`, `search`, `_fetch_brains`.

Free-text search is a mixed picture, and the **worse case is fully server-side but O(n) over every stored value, not indexed**:
- If the catalog has a `listing_searchable_text` `ZCTextIndex` (the sample catalog does — see §4), `text_index_search()` (`view.py:952-968`) passes the search term straight into the catalog query — indexed, bounded server-side work.
- If it does not, `metadata_search()` (`view.py:842-871`) calls `catalog(query)` to get **every** brain matching the current filters, then runs a Python regex against every metadata column of every brain in application memory (lines 862-869) — this is server-side code, but it is an unindexed full scan, and its cost is exactly what issue #771 (below) measured at 24-25 seconds against ~31,000 records before the `listing_searchable_text` index existed. Any listing/catalog in SENAITE that has not had a `listing_searchable_text` index added still falls into this path today.

**OpenELIS Global 2.** The workplan/validation queues are server-side but **unbounded and unindexed by any WHERE-clause date or text filter**: `getAllAnalysisByTestAndStatus()` (§5) is a single HQL query with no `LIMIT`, no date predicate, and no free-text predicate; the lab-unit-role restriction that narrows the visible set (`filterResultsByLabUnitRoles`) runs **after** the full query result is loaded into a `List<Analysis>` (`WorkplanByTestRestController.java:59-63`), i.e. security filtering happens in application code over an already-fully-fetched, already-fully-materialised list, not as part of the query. I did not examine `UserService.filterResultsByLabUnitRoles()`'s own implementation in detail, so I cannot say how expensive that in-memory filter step is at scale — flagged as unverified below.

### 4. Search — fields and backing index

**SENAITE — `senaite_catalog_sample`** (`src/senaite/core/catalog/sample_catalog.py:31-59`). Indexed fields (`INDEXES`, lines 31-59) relevant to the ticket's list — client, product/batch, date range, analyst:

- Client: `getClientID`, `getClientTitle`, `getClientUID` — all plain `FieldIndex` (exact match only, no substring).
- Batch: `getBatchUID` — `FieldIndex`.
- Dates: `getDateReceived`, `getDateSampled`, `getDatePublished`, `getDateVerified`, `getDueDate`, `modified` — all `DateIndex` (range queries supported; this is how the "late" tab's `getDueDate`/`range: max` query works, §1).
- Full text: `listing_searchable_text` — a `ZCTextIndex`.
- **Analyst is not indexed in the sample catalog at all.** `getAnalyst` is a `FieldIndex` in the **analysis** catalog (`src/senaite/core/catalog/analysis_catalog.py:33`), not the sample catalog. Searching or filtering samples by analyst therefore cannot be done through the sample listing's own catalog query; it requires querying the analysis catalog and correlating back to samples (this is exactly the mechanism the Worksheets "Mine" tab uses, §1 — it queries worksheets/analyses by `getAnalyst`, not samples).

What actually feeds `listing_searchable_text` is documented in the project's own closed issue #2273 (2023-03-13; quoted verbatim from the PR description): "Sample ID, Batch ID, Client ID, Client Name, Client Order Number, Client Reference, Client Sample ID, Sample Type Title, Sample Point Title." **No date field and no analyst are part of the full-text index** — a user typing an analyst's name or a date into the sample search box will not find anything through the indexed path; it would only be caught by the unindexed `metadata_search()` fallback (§3) if the sample catalog somehow lacked `listing_searchable_text` (it does not lack it, so in practice sample free-text search never takes that slow path — but the *code path exists* and is exercised by other catalogs without the index).

So: client, batch, date-range are indexed and searchable; product is not a first-class sample field in SENAITE (there is no "product" index on the sample catalog — SENAITE's domain unit is `SampleType`, indexed as `getSampleTypeUID`/`getSampleTypeTitle`, which is the nearest analogue); analyst is indexed only on the analysis/worksheet catalogs, not reachable from the sample listing's own query.

**OpenELIS Global 2.** No catalog/full-text index layer at all — this is a relational HQL/SQL system. The `getAllAnalysisByTestAndStatus` query (§3) filters by test id and status only; I found no query in the workplan or validation packages that takes a free-text, client, product, batch or date-range parameter as a bound predicate. The order-entry / result-page search (`frontend/src/components/resultPage/SearchResultForm.jsx`) builds a query string keyed on `accessionNumber` (and an `upperAccessionNumber` for a range — lines 92, 365-386, 423-441) — i.e. **accession-number lookup and accession-number range are the searchable fields exposed there**, not client/product/batch/analyst/date. I did not trace the Java REST endpoint(s) that consume that query string to confirm which of those parameters are backed by an indexed database column versus a table scan — flagged as unverified below.

### 5. Default time horizon

**SENAITE.** The default sample listing tab (`id: "default"`, `src/senaite/core/browser/samples/view.py:277-294`) filters only by a fixed tuple of **workflow states** (`sample_registered` through `verified`) and sorts by `created`, descending — there is **no date-window predicate** (no "last 30 days," no `getDateReceived` bound) in this tab's `contentFilter`. In effect the default horizon is "every non-terminal sample that has ever existed in the system," not a rolling window. A user escapes this by switching to the `"all"` tab (`view.py:422`, which additionally includes closed/terminal states) or by applying an explicit date column filter through `apply_column_filters()` (§3) — there is no shortcut date-range control on the tab bar itself; the escape is a manual filter action. Confidence: high, direct read.

**OpenELIS Global 2.** Same pattern, more starkly: `getAllAnalysisByTestAndStatus()` (§3, §5) has **no date predicate whatsoever** — it returns every `Analysis` row for a given test id in one of four status values, regardless of how old the underlying sample is. There is no "default window" to escape from, because there is no window at all; a test type with years of unresolved rows would return all of them, subject only to the lab-unit-role post-filter and then paging (§2). I found no separate "recent" or "today" toggle on the workplan controllers.

### 6. Barcode / scan-to-open

**SENAITE.** I found only **label generation** references to "barcode" — e.g. `add2.py:2476`, a comment about "automatic printing of barcode labels," and an SVG `data:` URI comment in `bika/lims/utils/__init__.py:396` about barcodes embedded in printed stickers. A repository-wide case-insensitive search for `scan`, `scanner`, `wedge` across `.py`/`.js` files (excluding vendored third-party static assets) returned no relevant hits — the only matches were an unrelated instrument driver named `vetscan` and an import/export helper unrelated to scanning. **SENAITE does not implement scan-to-open**: there is no keyboard-wedge listener or dedicated scan input field that jumps to a sample record by identifier. This is an absence, not a search failure — the printed identifiers a barcode would encode (the sample ID, per the ID-server templates documented in `docs/research/senaite-sample-and-assignment-model.md`) exist and are searchable by typing, but nothing in the source consumes a scanned/keyboard-wedge input specifically.

**OpenELIS Global 2.** Two distinct, unrelated features both use the word "barcode," and only one is the kind the ticket asks about:

- `BarcodeValidationRestController` (`src/main/java/org/openelisglobal/storage/controller/BarcodeValidationRestController.java`) is a **storage-location** barcode validator — `POST /rest/storage/barcode/validate` runs a 5-step check (format → location existence → hierarchy → activity → conflict, per the class's own doc comment and `BarcodeValidationServiceImpl.java`) against `StorageRoom`/`StorageDevice`/`StorageShelf`/`StorageRack` tables. It encodes a **shelf/rack/box location identifier**, not a sample identifier, and it validates a scanned code rather than opening a record.
- `BarcodeScannerBar.jsx` (`frontend/src/components/order/BarcodeScannerBar.jsx`) is the actual scan-to-open feature: its own doc comment states it "Accepts barcode scan or manual lab number entry" and, on submit, calls `loadOrder(trimmedBarcode, true)` (line ~52) to load the matching order/sample directly, with inline success/error feedback. This encodes the **accession/lab number** (the identifier used throughout `resultPage/SearchResultForm.jsx`'s `accessionNumber` field, §4). **OpenELIS Global 2 does implement scan-to-open for samples; SENAITE does not.** I did not verify which OpenELIS workflow screens (beyond order entry) this component is wired into, nor whether it is present in the last tagged release (3.2.2.0) versus only on `develop` — flagged below.

### 7. Known scale complaints

**SENAITE** (`senaite/senaite.core`, via `gh api search/issues`):

- **#771, "Slow Searches in Listing Views"** (closed 2018-04-20). Verbatim from the issue body: "When searching for a string in listing views, catalog metadata values are used to be searched... It works pretty good with catalogs that don't contain big amount of data. But for example, with a AR catalog containing nearly 31,000 records, that filtering operation takes 24-25 seconds." The fix was adding the `listing_searchable_text` `ZCTextIndex` described in §3/§4 — the unindexed fallback code path this issue describes is still present in `view.py` (`metadata_search()`) for any catalog without that index.
- **#2273, "Improve performance for sample listing index"** (closed 2023-03-13) — narrowed which metadata columns feed `listing_searchable_text` (to the nine fields listed in §4) for a reported 10% creation-time improvement; this is where the current field list is documented by the project itself.
- **#1362, "Remove unnecessary code from worksheet listing that slows down the rendering"** (closed) — title only reviewed via search results; I did not open the full issue body, so I cannot quote specifics. Confidence: low on detail, but the title itself is a documented complaint of worksheet-listing slowness at the project's own tracker.
- A broader set of "performance" issues (#2762, #2643, #2593, #2359, #2273, #2015/#2017/#2019, #2006, and ports #2320/#2324/#2326) exist in the tracker, but on inspection most concern sample-creation, calculation and transition performance rather than listing/search specifically — I list them for completeness but they do not directly bear on this ticket's question, so I have not summarised their bodies.

I did not find an explicit documented **hard limit** on listing size (e.g. "listings cap at N rows") in either the source or the issues I read — the absence of a bound is itself the finding in §2/§3, not a stated policy limit.

**OpenELIS Global 2.** I did not run an equivalent issue-tracker search against this repository within this session — this is a gap, not a finding of absence. Flagged below under "What could not be verified."

## What could not be verified

- Whether OpenELIS's `UserService.filterResultsByLabUnitRoles()` (the in-memory post-fetch security filter used by every workplan controller) is itself a further source of slowdown at volume — I read only its call sites, not its implementation.
- The full behaviour of OpenELIS's result-validation queue (`resultvalidation` package) — I confirmed it follows the same section/status pull-queue shape as the workplan controllers and found no personal-assignment field to scope a "waiting for my verification" view by, but I did not read every controller/service method in that package, so this is medium- rather than high-confidence.
- Which database column(s), if any, back `accessionNumber`/`upperAccessionNumber` search in OpenELIS's result-page search with an index — I read the React form's query construction but did not trace it to the Java REST endpoint and DAO query on the receiving end.
- Whether OpenELIS's `BarcodeScannerBar.jsx` scan-to-open feature is present in the last tagged release (3.2.2.0, 2026-08-18) or is `develop`-only unreleased work — I did not check out that tag separately for this file.
- I did not run a GitHub issue-tracker search against `I-TECH-UW/OpenELIS-Global-2` for scale/timeout complaints in this session, so §7 has no OpenELIS-side findings; this is an open gap, not an "OpenELIS has no such complaints" finding.
- Issue #1362's full body/discussion (SENAITE worksheet-listing slowness) — I have only the title from the search API result, not the issue text.
- Whether any SENAITE deployment commonly adds a `listing_searchable_text`-equivalent index to catalogs that ship without one (e.g. the worksheet or analysis catalogs) — I confirmed the sample catalog has it and the mechanism that falls back to unindexed scanning when it is absent, but did not enumerate which of SENAITE's other catalogs lack it today.

## Sources

- `senaite/senaite.core`, git clone, commit `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), branch `master`, `CHANGES.rst` header `2.7.0 (unreleased)`, last release 2.6.0 (2025-04-04). Files: `src/senaite/core/browser/dashboard/dashboard.py`, `src/senaite/core/browser/samples/view.py`, `src/senaite/core/browser/worksheets/view.py`, `src/senaite/core/catalog/sample_catalog.py`, `src/senaite/core/catalog/analysis_catalog.py`, `src/bika/lims/utils/__init__.py`, `src/bika/lims/browser/analysisrequest/add2.py`.
- `senaite/senaite.app.listing`, git clone, commit `1bd8490682ad6eda78a1351defbbb9e6a0957827` (2026-07-22). Files: `src/senaite/app/listing/view.py`, `src/senaite/app/listing/ajax.py`.
- GitHub issues, `senaite/senaite.core`, read via `gh api` 2026-09-11: [#771](https://github.com/senaite/senaite.core/issues/771) (closed 2018-04-20), [#2273](https://github.com/senaite/senaite.core/issues/2273) (closed 2023-03-13), [#1362](https://github.com/senaite/senaite.core/issues/1362) (title only).
- `I-TECH-UW/OpenELIS-Global-2`, git clone (blobless), commit `672c92a618f8ad146560846eacafb0e0a4178068` (2026-09-10), default branch `develop`, latest release tag 3.2.2.0 (2026-08-18). Files: `src/main/java/org/openelisglobal/workplan/controller/BaseWorkplanController.java`, `.../controller/rest/WorkplanByTestRestController.java`, `.../action/util/WorkplanPaging.java`, `src/main/java/org/openelisglobal/common/paging/PagingProperties.java`, `src/main/java/org/openelisglobal/analysis/daoimpl/AnalysisDAOImpl.java`, `src/main/java/org/openelisglobal/storage/controller/BarcodeValidationRestController.java`, `src/main/java/org/openelisglobal/storage/service/BarcodeValidationServiceImpl.java`, `frontend/src/components/order/BarcodeScannerBar.jsx`, `frontend/src/components/resultPage/SearchResultForm.jsx`, `src/main/java/org/openelisglobal/resultvalidation/controller/BaseResultValidationController.java`.
- Prior scout findings read but not repeated in full: `docs/research/senaite-sample-and-assignment-model.md`, `docs/research/open-lims-module-scope-inventory.md`, `docs/research/method-versioning-lims-precedent.md` (this repository).
