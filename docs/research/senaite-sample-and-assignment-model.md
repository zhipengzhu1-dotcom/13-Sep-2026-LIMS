# How does SENAITE model sample structure, analysis assignment, and sample identification?

**Asked by:** [Reshape 1 of 3: per-test assignment and sample structure](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/25)
**Date:** 2026-09-11
**Status of sources:** Read directly from a fresh clone of `senaite/senaite.core` (`git clone --depth 1 https://github.com/senaite/senaite.core.git`, HEAD commit `993f721e6d8494d94a4001cd3d73409504b67a49`, dated 2026-09-10, branch default = `master`, version string in `CHANGES.rst` = `2.7.0 (unreleased)`). No separate written SENAITE documentation site content was needed or cited — the source itself is the authority, per the brief, and it was thick enough to answer all five questions directly. All line references below are to files in that clone, paths relative to the repository root.

## Findings

### 1. Assignment granularity

SENAITE carries an `Analyst` field on **two different object types**, and they are not the same field:

- `Analysis.Analyst` — a plain `StringField` defined directly on the Analysis schema: `src/bika/lims/content/abstractanalysis.py:111-113` ("The ID of the logged in user who submitted the result for this Analysis."), included in the schema at `abstractanalysis.py:197`.
- `Worksheet.Analyst` — a separate `StringField` on the Worksheet schema: `src/bika/lims/content/worksheet.py:96-98`.

`Analysis.getAnalyst()` (`abstractanalysis.py:1208-1211`) returns the analysis's own stored value, and if that is empty, falls back to `getAssignedAnalyst()` (`abstractanalysis.py:1217-1224`), which reads `self.getWorksheet().getAnalyst()` — i.e. the analyst of the worksheet the analysis currently sits on.

`Worksheet.setAnalyst()` (`worksheet.py:1509-1512`) iterates every analysis on the worksheet and calls `analysis.setAnalyst(analyst)` on each, then sets the worksheet's own field. So assigning an analyst at the worksheet level is implemented as a bulk write to each analysis's own `Analyst` field, not a pointer that analyses look up live.

The Worksheet is a real unit of work: it has a `Layout` field (`RecordsField` with subfields `position`, `type`, `container_uid`, `analysis_uid`, `worksheet.py:80-85`) that places individual analyses into slots, and an `Analyses` back-reference field (`UIDReferenceField`, `relationship='WorksheetAnalysis'`, `worksheet.py:87-93`, allowed types `Analysis`, `DuplicateAnalysis`, `ReferenceAnalysis`, `RejectAnalysis`) that is the authoritative list of which analyses belong to it. `addAnalysis()` (`worksheet.py:175`) and `addToLayout()` (`worksheet.py:249`) manage slot placement per analysis, not per sample — a worksheet can and typically does hold analyses from many different samples (Analysis Requests) mixed together, addressed individually by slot.

So: the analyst reference is stored on the individual Analysis object; the Worksheet is the grouping/batch-of-work concept and provides a convenience bulk-set and a fallback lookup, but assignment granularity in the data model is per-analysis, not per-sample and not solely per-worksheet.

### 2. Reassignment history

The `unassign` transition is guarded by `guard_unassign()` (`src/bika/lims/workflow/analysis/guards.py:103-110`), which refuses the transition if the analysis is not currently on a worksheet. On `unassign`:

- `before_unassign()` (`src/bika/lims/workflow/analysis/events.py:47-56`) cascades the unassign to any duplicate analyses tied to the one being removed.
- `after_unassign()` (`events.py:108-113`) calls `remove_analysis_from_worksheet()` (`events.py:327-347`), which drops the analysis from the worksheet's `Analyses` field, purges its layout slot, and re-evaluates the worksheet's own workflow state (submits/verifies it if other analyses remain, or rolls it back to "open" if it was the last one).

Neither of these functions clears `Analysis.Analyst`. The field is a plain string that simply gets overwritten the next time the analysis is assigned to a (possibly different) worksheet/analyst; nothing in this code path explicitly blanks it on unassign, so the prior analyst value could persist on the object until overwritten — but I found no code that reads that stale value for any purpose after unassignment.

Audit/history is handled by a separate, general-purpose mechanism, not by a reassignment-specific log: `src/senaite/core/subscribers/auditlog.py` registers Zope/Plone event handlers —
`ObjectTransitionedEventHandler` (`auditlog.py:64-90`), `ObjectModifiedEventHandler` (`auditlog.py:93-104`), `ObjectInitializedEventHandler` (`auditlog.py:107-123`) — that call `take_snapshot(obj, ...)` (imported from `src/senaite/core/api/snapshot.py`) on **every** workflow transition and every plain field edit, for any object type that "supports snapshots" (`supports_snapshots()`, `senaite/core/api/snapshot.py:55`).

`senaite/core/api/snapshot.py` stores snapshots as a list in a ZODB annotation keyed `senaite.core.snapshots` (`SNAPSHOT_STORAGE`, line 43) on the object itself. `get_snapshots()` (line 80) returns the full history; `get_version()` (line 114-123) treats the list index as a version number, explicitly noting versions start at 0. Each snapshot appears to be a full JSON-serialised copy of the object's state at that point (the storage/annotation calls in `take_snapshot`, referenced from `auditlog.py:89/104/123`), not a diff.

Because `Analysis` is itself a full persistent content object (see §5) and is a snapshot-eligible type, this mechanism records history **per analysis**, at the granularity of "every transition or edit of this one analysis object" — including its `assign`/`unassign` transitions and any change to its `Analyst` field, since a plain field edit fires `ObjectModifiedEventHandler` too. This is the audit record I could actually find; it is a generic object-versioning system reused for this purpose, not a purpose-built "assignment history" table.

### 3. Sample partitions and containers

SENAITE models "one submission, several physical containers" as **partitions**, and a partition is a first-class Analysis Request (sample) in its own right, not a sub-record of the parent. Relevant portal types, declared in `src/senaite/core/idserver/idserver.py:48-56`:

```
PORTAL_TYPE_SAMPLE           = "AnalysisRequest"
PORTAL_TYPE_SAMPLE_RETEST    = "AnalysisRequestRetest"
PORTAL_TYPE_SAMPLE_PARTITION = "AnalysisRequestPartition"
PORTAL_TYPE_SAMPLE_SECONDARY = "AnalysisRequestSecondary"
PORTAL_TYPE_SAMPLE_DUPLICATE = "AnalysisRequestDuplicate"
```

A partition is linked to its parent via a `ParentAnalysisRequest` `UIDReferenceField` on `AnalysisRequest` (`src/bika/lims/content/analysisrequest.py:1245-1247`, relationship `AnalysisRequestParentAnalysisRequest`), with accessor/mutator methods (`getParentAnalysisRequest`, `setParentAnalysisRequest`, `analysisrequest.py:2434-2445` and surrounding). The reverse relation (parent → children) is read via `getDescendants()`, used e.g. in `idserver.py:238` (`get_partition_count`).

Partitions can also be **detached** from their parent: `get_partition_count()` (`idserver.py:220-247`) explicitly counts both "active descendants" (still linked via `ParentAnalysisRequest`) and "detached partitions" — samples whose `ParentAnalysisRequest` was cleared by a detach transition but which still carry a separate backreference, `AnalysisRequestDetachedFrom` (`PARTITION_DETACHED_RELATIONSHIP`, `idserver.py:84`), pointing at the original parent. So detachment is modelled as breaking one relationship while adding another, not deleting history.

Each partition gets its own ID, generated from a dedicated ID-formatting template keyed to its own portal type, `AnalysisRequestPartition` (`src/senaite/core/content/senaitesetup.py:153-162`):

```
"form": "{parent_ar_id}-P{partition_count:02d}"
```

i.e. by default a partition's ID is literally the parent sample's ID with a `-P01`, `-P02`, ... suffix, computed from `get_partition_count()` described above. Retests and secondaries follow the same pattern with different suffix letters (`-R{retest_count:02d}`, `-S{secondary_count:02d}`, `senaitesetup.py:164-181`).

I did not find a separate "Container" concept distinct from the partition itself — the physical-container-under-one-submission-identity case is handled by making each container its own `AnalysisRequestPartition` object, related back to the original sample.

### 4. Sample identification

The ID-generation code lives in `src/senaite/core/idserver/idserver.py` (679 lines) and `src/senaite/core/utilities/numbergenerator.py`.

**Trigger:** `renameAfterCreation(obj)` (`idserver.py:639-679`) is called after a content object is created. It looks for a registered `IIdServer` adapter for the object's type; if none, it falls back to `generateUniqueId(obj)` (`idserver.py:592-637`). The object is then renamed in the ZODB folder via `parent.manage_renameObject(obj.id, new_id)` — if that fails, the code explicitly removes the orphaned temp object rather than leave a hidden partially-created item (`idserver.py:661-677`).

**Template interpolation:** `generateUniqueId()` pulls a per-portal-type config dict (`get_config`, `idserver.py:279`) containing a `form` string, a `sequence_type` (`"generated"` or `"counter"`), and other parameters, then interpolates variables (`get_variables`) into the template, e.g. the default sample template is:

```python
"form": "{sampleType}-{seq:04d}"   # senaite/core/content/senaitesetup.py:144
```

Other built-in defaults (`senaitesetup.py:82-190`): `Batch` → `B-{seq:03d}`, `Worksheet` → `WS-{seq:03d}`, `DuplicateAnalysis` → `D-{seq:03d}`, partitions/retests/secondaries as described in §3. The admin help text in the same file documents available template variables: `{seq}` / `{seq:04d}` (numeric), `{alpha:NaNd}` (alphanumeric counter, e.g. `AA001, AA002 … AB001 …`), `{year}` (two-digit year), `{yymmdd}` (full date), `{clientId}`, `{sampleType}` (`senaitesetup.py:1213-1230`). So **year/date-based numbering is supported but is opt-in per template**, not the shipped default for samples.

**Two sequence types**, both implemented in `idserver.py`:
- `"generated"` (`get_generated_number`, `idserver.py:544-577`): pulls a monotonically-incrementing number from a persistent number generator, keyed by `make_storage_key(portal_type, prefix)` (`idserver.py:479-485`), where `prefix` is the static portion of the template (everything before the first `{...}` placeholder, via `split_length`). Because the key includes the resolved prefix, if a template embeds `{year}` or `{yymmdd}` in the prefix position, the counter becomes effectively per-year/per-day; the shipped default sample template (`{sampleType}-{seq:04d}`) does not put date in the prefix, so its counter is **global** (never resets), scoped only by sample type.
- `"counter"` (`get_counted_number`, `idserver.py:518-543`): not a stored counter at all — it is `len()` of a live list of related/contained objects (backreferences or contained items), recomputed each time. Used for the partition/retest/secondary "count of siblings" case, and explicitly noted as fragile: `senaitesetup.py`/`idserver.py` comments flag off-by-one handling because new objects aren't indexed at creation time.

**The number store itself:** `src/senaite/core/utilities/numbergenerator.py` implements `NumberGenerator`, a ZODB-persistent `BTrees.OIBTree.OIBTree` stored in a portal annotation (`NUMBER_STORAGE = "bika.lims.consecutive_numbers_storage"`, line 33). `get_number(key)` (lines 100-117) is lock-protected (`thread.allocate_lock()`), and strictly increments: `self.storage[key] = counter + 1`, or initialises to `1` on `KeyError`. There is no decrement, no reclaim, and no code path in this file or in `idserver.py` that returns a number to the pool when a sample is deleted — **numbers are not reused after deletion** as far as this source shows; the counter only moves forward (though `set_number()` exists as an admin-facing override to jump the counter to an arbitrary value, e.g. for migrations).

**Suffix/format helpers:** `get_suffix()` and `strip_suffix()` (`idserver.py:170-188`) use a regex (`-[A-Z]{1}[0-9]{1,2}$`) to recognise and strip partition/retest-style suffixes like `-P05`, `-R01` from an ID — this is how the system recovers a "base" sample ID from a partition/retest ID.

### 5. Storage shape

SENAITE is built on Plone/Zope, and its content objects are `Products.Archetypes` (AT) content types stored in the ZODB object database, addressed by folder path and by UID — this is a structurally different persistence model from a relational or document store.

- `AnalysisRequest` (the Sample) is declared `class AnalysisRequest(BaseFolder, ClientAwareMixin)` (`src/bika/lims/content/analysisrequest.py:1468`), i.e. it is itself a **folder** in the ZODB tree, not a flat record.
- `Analysis` (`class Analysis(AbstractRoutineAnalysis)`, `src/bika/lims/content/analysis.py:36`) is a full persistent content object with its own Archetypes schema (`AnalysisService`, `Analyst`, `Result`, `Uncertainty`, `CalculationUID`, `ResultsRange`, etc. — schema assembled at `abstractanalysis.py:187-206`), and in the common case it is stored **inside** the sample's folder in the ZODB tree (a sub-object of the AnalysisRequest folder), each with its own object id, UID, and its own audit-snapshot history (§2). It is not a sub-record/row embedded in a JSON or list field on the sample.
- Worksheets reference analyses by UID (`UIDReferenceField`, §1) rather than containing them physically — an analysis's folder-tree location is inside its originating sample, while its worksheet membership is a separate reference relationship.

Practically: every Analysis is independently addressable (own path, own UID, own workflow state, own audit history), while still being physically filed under its parent Sample in the object tree. This is a consequence of the ZODB/Archetypes architecture, not a database schema choice in the relational sense.

### Licence

SENAITE's `LICENSE` file is the GNU General Public License, version 2 (confirmed by file header in the clone and by `license="GPLv2"` in `setup.py`). Every source file inspected above carries a GPLv2 header (e.g. `src/senaite/core/idserver/idserver.py:1-19`).

## What I could not establish

- Whether `Analysis.Analyst` is ever explicitly cleared/blanked on unassign — the unassign code path (`events.py:108-145`) removes the analysis from the worksheet and re-evaluates worksheet state, but I found no line that resets the `Analyst` field itself. I could not find a test or docstring settling whether this is intentional (last known analyst retained for display) or an oversight; it is not addressed in comments.
- The exact JSON shape of a stored snapshot (full field dump vs. selected fields) — `take_snapshot()`'s definition lives in `senaite/core/api/snapshot.py` past what I inspected in detail; I confirmed the storage location, versioning scheme, and the fact that it fires on every transition/edit, but did not trace the full field-serialisation routine.
- Whether any deployment-side configuration commonly overrides the shipped sample ID template to include `{year}`/`{yymmdd}` in practice — the source shows the default does not, and that per-year numbering is possible via configuration, but this is a code-level fact about what's *supported*, not a claim about what typical SENAITE installs actually configure.
- I did not consult `senaite.app.listing` or senaite.com's docs directly, since `senaite.core`'s own source was sufficient and more authoritative for every question asked; if listing/UI-layer conventions for displaying assignment are relevant to a later question, that repository remains unexamined here.

## Sources

- `senaite/senaite.core`, git clone, commit `993f721e6d8494d94a4001cd3d73409504b67a49` (2026-09-10), `CHANGES.rst` version header `2.7.0 (unreleased)`, cloned from https://github.com/senaite/senaite.core — specifically:
  - `src/bika/lims/content/abstractanalysis.py`
  - `src/bika/lims/content/analysis.py`
  - `src/bika/lims/content/analysisrequest.py`
  - `src/bika/lims/content/worksheet.py`
  - `src/bika/lims/workflow/analysis/guards.py`
  - `src/bika/lims/workflow/analysis/events.py`
  - `src/senaite/core/api/snapshot.py`
  - `src/senaite/core/subscribers/auditlog.py`
  - `src/senaite/core/idserver/idserver.py`
  - `src/senaite/core/utilities/numbergenerator.py`
  - `src/senaite/core/content/senaitesetup.py`
  - `LICENSE`, `setup.py`
