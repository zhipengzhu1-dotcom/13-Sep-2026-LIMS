# Where do delivery-level receipt facts physically live in SENAITE (senaite.core)?

**Agent-gathered research, not a compliance determination.**

**Asked by:** orchestrator, scouting for the Benchline wayfinder map
**Date:** 2026-09-11
**Status of sources:** Read directly from a fresh clone of `https://github.com/senaite/senaite.core` (GPL-2.0), commit `993f721e6d8494d94a4001cd3d73409504b67a49`, cloned 2026-09-11. No secondary write-ups were used for any claim below; every claim is `path:line` against that checkout. Line numbers are relative to the repository root, i.e. `src/...`.

## Findings

### 1. The container/partition model

A partition is a **full `AnalysisRequest` object**, not a lightweight sub-record. `isPartition()` is defined purely in terms of ancestry: `return not self.isRootAncestor()` (`src/bika/lims/content/analysisrequest.py:2413-2415`), and `isRootAncestor()` just checks whether `getParentAnalysisRequest()` returns anything (`src/bika/lims/content/analysisrequest.py:2374-2380`). There is no separate "Partition" content type or schema — the entire `AnalysisRequest` schema (with all fields: `DateReceived`, `RejectionReasons`, `Container`, `Preservation`, `SampleType`, etc.) is carried by every partition instance in its own right, because it is literally an instance of the same class.

The only structural field distinguishing a partition from its parent is `ParentAnalysisRequest`, a `UIDReferenceField` (`src/bika/lims/content/analysisrequest.py:1242-1264`) — a reference relationship (`relationship="AnalysisRequestParentAnalysisRequest"`), not a foreign key into a shared row. Related reference fields on the same object: `DuplicatedFrom` (`:1268-1290`), `DetachedFrom` (`:1294-1316`), `Invalidated` (`:1320-1343`).

No field is documented as "read through to the parent" in the schema itself — I found no accessor on `AnalysisRequest` that reads a value off `getParentAnalysisRequest()` for fields like `DateReceived`, `Client`, `RejectionReasons`, etc. Some computed/aggregate methods do traverse ancestor/descendant relations (`getAncestors`, `getDescendants`, `src/bika/lims/content/analysisrequest.py:2362-2401`), but these are traversal helpers, not implicit field read-through — each partition stores its own copy of every field value once set.

Partition IDs follow the pattern `{parent_ar_id}-P{partition_count:02d}`, defined as a setup-configurable ID format string (`src/bika/lims/content/bikasetup.py:1113`), confirming partitions are children in the object hierarchy/ID scheme, not siblings sharing one parent row.

### 2. Where the act of receipt is recorded

`DateReceived` is a `DateTimeField` on the `AnalysisRequest` schema itself (`src/bika/lims/content/analysisrequest.py:1067-1079`), writable under `FieldEditDateReceived` permission.

The `receive` transition is defined in the sample workflow (`src/senaite/core/profiles/default/workflows/senaite_sample_workflow/definition.xml:1460-1466`), guarded by `senaite.core: Transition: Receive Sample` and `guard_handler("receive")`.

Its event handler, `after_receive` (`src/bika/lims/workflow/analysisrequest/events.py:176-183`), does exactly three things to the *object the transition was fired on*: marks it `IReceived`, calls `self.setDateReceived(DateTime())`, and initializes its analyses. **It does not cascade to partitions or to a parent.** Because a partition is a full `AnalysisRequest`, each partition object carries its own `DateReceived` and can be independently transitioned through `receive` — I found no code path that forces sibling partitions to receive together, and `after_receive` shows no `do_action_to_descendants` call (contrast with `after_reject`/`after_retract`, which do call it — see below).

There is no dedicated "received by" content field. `getReceivedBy()` (`src/bika/lims/content/analysisrequest.py:2286-2292`) does not read a stored field; it derives the actor from Zope's workflow history via `getTransitionUsers(self, 'receive', last_user=True)`. A `ComputedField('ReceivedBy', expression='here.getReceivedBy()', ...)` exists on the schema for indexing/display (`src/bika/lims/content/analysisrequest.py:1163-1167`), and `getReceivedBy` is a catalog index (`src/senaite/core/catalog/sample_catalog.py:47`). The underlying fact — who performed the receive transition and when — lives in the object's `portal_workflow` review history log, not in a first-class schema field, and that log is per-object (per-AR/per-partition), same as everywhere else in this system.

### 3. Rejection / discrepancy

`RejectionReasons` is a `RecordsField` on `AnalysisRequest` (`src/bika/lims/content/analysisrequest.py:665-678`), gated by setup's `isRejectionWorkflowEnabled()` (`src/bika/lims/content/bikasetup.py:1345-1349`). It stores structured records with (at minimum) a `selected` list of controlled-vocabulary reasons and an `other` free-text field — see `getSelectedRejectionReasons()` and `getOtherRejectionReasons()` (`src/bika/lims/content/analysisrequest.py:2489-2506`), which read `reasons[0].get("selected", [])` and `reasons[0].get("other", "")`. So the stored fact is **both** a controlled vocabulary (drawn from setup's `RejectionReasons` `LinesField`, `src/bika/lims/content/bikasetup.py:1194-1205`, one predefined reason per line) **and** free text, together in one record.

The object rejected is the `AnalysisRequest` — parent or partition, whichever the `reject` transition is fired on (`src/senaite/core/profiles/default/workflows/senaite_sample_workflow/definition.xml:1637-1642`, guard `guard_reject`, `src/bika/lims/workflow/analysisrequest/guards.py:232-236`). `after_reject` (`src/bika/lims/workflow/analysisrequest/events.py:67-74`) explicitly cascades the `reject` action to descendants (`do_action_to_descendants(analysis_request, "reject")`) and to analyses, when fired on a parent — meaning rejecting a parent rejects its partitions too, but the reverse is not shown: nothing in the code prevents `reject` being fired on a single partition independently, leaving siblings unrejected.

The rejecting actor/time is likewise not a dedicated field — a getter (unnamed helper at `src/bika/lims/content/analysisrequest.py:2270-2284`) walks `portal_workflow.getInfoFor(self, 'review_history')` filtering for `action == 'reject'` and returns the actor from that log entry. Same mechanism as `ReceivedBy`: workflow history, per-object.

I found **no representation of "accept despite discrepancy"** as a state distinct from outright rejection. Search terms `discrepanc` and `accept.*discrepanc` (case-insensitive, across `*.py`/`*.xml`, excluding tests) returned **0 matches** in the whole repository. The only bifurcation present is binary: an `AnalysisRequest` is either received (via `receive`) or rejected (via `reject`); `RejectionReasons` only exists in the context of the `reject` transition, and there is no field or workflow state I could find for logging a reason while still proceeding to receipt.

### 4. Delivery-level grouping object: `Batch`

`Batch` (`src/bika/lims/content/batch.py`) is documented in its own class docstring as: *"A Batch combines multiple ARs into a logical unit"* (`src/bika/lims/content/batch.py:149-151`). Its schema fields are: `BatchID` (auto-generated, hidden, `:58-68`), `Client` (optional — `required=0`, `:70-91`), `ClientBatchID` (`:93-98`), `BatchDate` (`:100-106`), `BatchLabels` (a checkbox vocabulary, `:108-115`), and `Remarks` (`:124-128`). There is no `DateReceived`, no rejection, no container/condition field on `Batch` itself.

`Client` on `Batch` is optional (`required=0`) and, per a code comment, is not even authoritative for filing — `getClient()` is overridden to derive the batch's actual client folder placement from `aq_parent`, not from the schema field, "so the value stored in the Schema's is not used anymore" (`src/bika/lims/content/batch.py:167-178`, referencing senaite/senaite.core PR #1450).

Nothing in the `Batch` schema or workflow ties it to the physical act of receiving material — it is a generic cross-cutting grouping ("logical unit") that ARs can optionally be assigned to (typically used for lab-side work batching / a client's project or study grouping), not a delivery/consignment/submission object. I found no field on `Batch` for a discrepancy, a receiving coordinator, a verifying supervisor, or a QA acceptance decision. It is also not required: nothing in `AnalysisRequest`'s schema or workflow guards makes `Batch` membership mandatory for receipt.

### 5. Per-container condition

Search terms (case-insensitive, `*.py`, excluding tests), each run against the full checkout:

- `seal.?integrity` → 0 matches
- `container.?condition` → 0 matches
- `damage` → 0 matches
- `temperature.?indicator` → 0 matches
- `cold.?chain` → 0 matches
- `tamper` → 0 matches

(combined search reported above: `src/bika/lims/content` and repo-wide, 0 total matches for all six terms together, `grep -rniE ... | wc -l` = 0).

The only container-related field on `AnalysisRequest` is `Container`, a `UIDReferenceField` to a `SampleContainer` setup object (`src/bika/lims/content/analysisrequest.py:557-584`) — this is a reference to a *type of vessel* (with a `getCapacity` column shown in its picker widget), not a record of the physical condition of the received item. No field for quantity received, seal state, or damage exists anywhere I could find in `senaite.core`.

### 6. Verification of the receipt record itself

The `verify` transition exists both on the sample workflow (`src/senaite/core/profiles/default/workflows/senaite_sample_workflow/definition.xml:1609`, state `verified` at `:800`) and on the analysis workflow (`src/senaite/core/profiles/default/workflows/senaite_analysis_workflow/definition.xml:783`). In both cases this is the results-verification step — a sample reaches `verified` once its constituent analyses have been verified (results sign-off), evidenced by the dozens of instrument-import modules that treat `sample_received` and `to_be_verified` as the two pre-results-verification states (e.g. `src/senaite/core/exportimport/instruments/genexpert/genexpert.py:62-66`, and ~30 other instrument import modules with the identical pattern).

I found **no transition, field, or workflow state that verifies the act of receipt/login itself** (i.e., a second person confirming that what was transcribed at receiving matches what arrived). Search terms `second.?check`, `four.?eyes`, `double.?check`, `verify.*receiv`, `receiv.*verif` (case-insensitive, `*.py`/`*.xml`, excluding tests) returned no hits relevant to receipt double-checking — the only "double check" hit was an unrelated code comment about path deduplication (`src/bika/lims/utils/__init__.py:421`). `getReceivedBy()`/`getDateReceived()` record who and when the *single* receive transition happened, but there is no second, independent confirmation step captured anywhere in the schema or workflow definitions I read.

## What I could not establish

- Whether any SENAITE **add-on** package (outside `senaite.core` — e.g. a client-specific or commercial add-on) layers a receipt-verification or condition-recording step on top of this model. Only `senaite.core` was cloned and read; the task scope note about `senaite.impress` did not surface anything receipt-relevant on inspection of `senaite.core` alone, and `senaite.impress` was not separately cloned because nothing in `senaite.core` pointed to it for this question.
- Whether `do_action_to_descendants` cascading on `reject`/`retract` is itself gated by any additional guard that would prevent independently rejecting a single partition while leaving siblings received — I read the `after_reject` handler and the `guard_reject` guard, but did not trace every guard/permission check across the full transition-firing call stack (`do_action_for`) to rule out an implicit business-rule restriction not visible in the workflow XML/event handler alone.
- Exact runtime behavior (e.g., whether the UI ever offers "receive" on a single partition versus always operating on the whole partition set at once) was not verified — this is a question about how the browser views/controllers invoke transitions, which is UI-layer behavior not covered by the schema/workflow/event-handler review performed here.

## Sources

- `senaite/senaite.core` GitHub repository, GPL-2.0, cloned via `git clone --depth 1 https://github.com/senaite/senaite.core.git`, commit `993f721e6d8494d94a4001cd3d73409504b67a49` (repo HEAD as of 2026-09-11).
  - `src/bika/lims/content/analysisrequest.py`
  - `src/bika/lims/content/batch.py`
  - `src/bika/lims/content/bikasetup.py`
  - `src/bika/lims/content/rejectanalysis.py`
  - `src/bika/lims/browser/widgets/rejectionwidget.py`
  - `src/bika/lims/workflow/analysisrequest/events.py`
  - `src/bika/lims/workflow/analysisrequest/guards.py`
  - `src/senaite/core/profiles/default/workflows/senaite_sample_workflow/definition.xml`
  - `src/senaite/core/profiles/default/workflows/senaite_analysis_workflow/definition.xml`
  - `src/senaite/core/catalog/sample_catalog.py`
  - `src/senaite/core/exportimport/instruments/*` (~30 files, pattern-matched for `sample_received`/`to_be_verified` usage)
