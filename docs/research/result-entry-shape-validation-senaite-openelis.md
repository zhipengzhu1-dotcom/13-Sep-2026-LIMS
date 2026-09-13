# Does SENAITE or OpenELIS Global 2 validate the shape of a numeric result before accepting it?

**Asked by:** Orchestrator, for [#66 What happens when a scan arrives while an input field has focus](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/66)
**Date:** 2026-09-11
**Status of sources:** Read directly from each project's own repository at the current tip of its default/active branch, cloned shallow on 2026-09-11:
- `senaite/senaite.core` (Python/Zope backend), default branch, cloned 2026-09-11
- `senaite/senaite.app.listing` (the ReactJS listing/result-grid component senaite.core depends on for the worksheet/analyses table — separate repo, discovered via `gh api repos/senaite/senaite.core.listing` redirecting to this name), cloned 2026-09-11
- `DIGI-UW/OpenELIS-Global-2` (Java/Spring + React), which was confirmed to be the actively maintained "OpenELIS Global 2" codebase (`pushed_at` was the same day as this research). Note: the org literally named `openelisglobal` on GitHub (`openelisglobal/openelisglobal-core`) is **stale** — last push 2021-03-15 — and is not the source used for these findings; noted here because it is easy to mistake for the current project when searching by org name.

No FDA/ISO source applies to this question; it is a codebase-behavior question and the finding is drawn entirely from the two projects' own source.

## Findings

### SENAITE (senaite.core)

1. **Field definition (server-side schema).** The analysis result is stored in a plain Archetypes `StringField` with no validators attached:
   `src/bika/lims/content/abstractanalysis.py:78-82`
   ```python
   Result = StringField(
       'Result',
       read_permission=ViewResults,
       write_permission=FieldEditAnalysisResult,
   )
   ```
   There is no length limit, character-class restriction, or numeric-coercion validator declared on this field.

2. **Server-side write path (`setResult`).** `src/bika/lims/content/abstractanalysis.py:647-712` (`AbstractAnalysis.setResult`) coerces the incoming value to a string, strips whitespace, and — only for non-string result types — checks whether the *first character* is a detection-limit operand (`<` or `>`) to peel it off. Nothing in this method calls `float()`, `Decimal()`, or any format check on the remaining value; whatever string arrives (after operand-stripping) is passed straight to `self.getField("Result").set(self, val)`. A value like `LAB-2026-000417` would pass through unchanged and be stored verbatim.

3. **Server-side ajax save endpoint.** The React listing's field-save request is handled by `AjaxListingView.ajax_set_fields` → `set_field` → `datamanager.set(name, value)` in `senaite.app.listing`'s `src/senaite/app/listing/ajax.py:372-389, 647-693`. This dispatches to the content's field data manager (which for `Result` ends up calling the `setResult` above) with no additional server-side shape check in between.

4. **Client-side widget.** The listing table (used for both worksheet result-capture and the sample's Analyses tab) renders each analysis's editable field via `senaite.app.listing`'s React `TableCell` component. The **default field type is `"numeric"`** unless the analysis service's `result_type` is `"string"`, `"text"`, a choices list, etc. (`webpack/app/components/TableCell.coffee:280-281, :1009-1010`). The numeric type renders `webpack/app/components/NumericField.coffee`, which:
   - Renders `<input type="text" .../>` — **not** an HTML5 `type="number"` input — line 137 of `NumericField.coffee`.
   - On blur, runs a JS `validate()` method (`NumericField.coffee:128-131`):
     ```coffee
     validate: (value) ->
       number = value.replace /(^[<,>]?)\s*(.*)/, "$2"
       return not Number.isNaN(Number(number))
     ```
     If this fails, the field is forced back to an empty string (`NumericField.coffee:38-57`) before the save handler is even called.
   - A value shaped like `LAB-2026-000417` would fail `Number("LAB-2026-000417")` → `NaN`, so the on-blur handler would clear it to `""` **client-side**, before any network request carrying that string is sent from this widget.
   - This is enforced only in the browser. Nothing server-side re-checks it (see point 2/3). Any other path that writes to the `Result` field directly — the JSON API, direct AT field access, instrument/result importers (`src/senaite/core/exportimport/instruments/importer.py`) — is not filtered by this React component at all, and lands on the unguarded `setResult()`.

**Summary for SENAITE:** client-side, yes — a same-origin, same-widget check exists and will reject/clear an identifier-shaped string typed into the numeric result cell. Server-side, no — the `Result` field and `setResult()` accept and persist any string.

### OpenELIS Global 2 (`DIGI-UW/OpenELIS-Global-2`)

1. **Frontend widget.** The current unified result-entry cell is `frontend/src/components/resultPage/unified/PolymorphicResultCell.tsx`. For a test configured with numeric result type (`"N"`), it renders (lines 209-229):
   ```tsx
   <TextInput
     ...
     type="number"
     step={precisionStep(row.significantDigits)}
     ...
   />
   ```
   This *is* a genuine HTML5 `<input type="number">` (via Carbon's `TextInput`), so the browser itself constrains typed/keyboard input to numeric characters and refuses to hold a non-numeric string as its `.value` (browsers null out the value on invalid content for `type="number"`). For non-numeric result types (`"R"`/`"A"`, remark/alphanumeric), the same file renders a plain `<TextArea>` with no shape constraint — free text, by design, since those types are meant to hold non-numeric content such as narrative remarks.
   There is also a client-side check unrelated to shape but adjacent to it: `exceedsConfiguredPrecision`/`blocksSaveOnPrecision` (lines 50-87) blocks saving a numeric value typed to more decimal places than the test's configured significant digits — this is a precision check, not a "is this numeric" check (the number-type input already forces that).

2. **Server-side validation, and where it is actually wired into the save path.** `src/main/java/org/openelisglobal/result/action/util/ResultsValidation.java`, method `validateResult` (lines 112-143):
   ```java
   if (!GenericValidator.isBlankOrNull(resultValue) && "N".equals(testResultItem.getResultType())) {
       if (resultValue.equals(SPECIAL_CASE)) {   // "XXXX" literal escape hatch
           return;
       }
       try {
           Double.parseDouble(StringUtil.getActualNumericValue(resultValue));
       } catch (NumberFormatException e) {
           errors.reject("errors.number.format");
       }
   }
   ```
   For any test whose result type is `"N"` (numeric), the server attempts `Double.parseDouble(...)` on the submitted value (after `StringUtil.getActualNumericValue` strips things like a leading `<`/`>` detection-limit qualifier) and rejects the save with `errors.number.format` if it throws. A string like `LAB-2026-000417` would throw `NumberFormatException` and be rejected, **unless** the literal string is exactly the special-case sentinel `"XXXX"`.

   This validator is not a vestigial or QC-review-only check: it was traced into the actual per-row result-save REST endpoint used by the current worklist UI. `src/main/java/org/openelisglobal/result/controller/rest/ResultEntryRestController.java`, method `saveSingleAnalysisResult` (`POST /rest/results-entry/analysis/{analysisId}/result`, lines 268-312) builds a `ResultsUpdateDataSet` and calls `dataSet.validateModifiedItems()`, which (`ResultsUpdateDataSet.java:128-129`) calls straight into `ResultsValidation.validateModifiedItems(...)`. If `errors.hasErrors()`, the controller returns HTTP 400 and the value is never persisted (lines 307-312). So the numeric-shape check runs server-side, on the actual save request, for every numeric-typed result, independent of whatever the browser widget did or didn't enforce.

3. **Result types other than "N".** Alphanumeric (`"A"`) and remark (`"R"`) result types get no shape check at all, client or server — consistent with those types being explicitly free-text by design. The shape check is scoped to tests whose configured result type is numeric.

**Summary for OpenELIS Global 2:** both client-side (an HTML5 `type="number"` input, for numeric-typed tests) and server-side (`Double.parseDouble` in `ResultsValidation.validateResult`, wired into the live per-row save REST endpoint) reject a value that doesn't parse as a number, for tests configured as numeric result type. A `"XXXX"` sentinel value is explicitly exempted. Non-numeric result types are free text with no shape constraint, by design.

## What I could not establish

- **SENAITE:** did not find and did not exhaustively search every possible write path to the `Result` field (e.g., the full JSON API surface, every instrument-results importer, direct `senaite.core` `@@API/update` routes if any exist beyond the listing's `ajax_set_fields`). All paths traced converge on the same unguarded `setResult()`, so there is no evidence of *any* server-side shape check anywhere in `senaite.core`, but this is not a proven universal negative across the entire codebase.
- **SENAITE:** did not verify whether Plone/Zope's underlying storage imposes an implicit length cap on `StringField` values (Archetypes string fields are typically unbounded text in the ZODB); no explicit `size`/`max_length` constraint is set on the `Result` field itself, but the ZODB storage layer was not checked for an intrinsic cap.
- **OpenELIS Global 2:** did not check whether the underlying database column for `Result.value` has a length constraint (e.g., a `VARCHAR(n)`) that would independently reject an implausibly long string; the Java model exposes it as an unconstrained `String` and the corresponding Liquibase/DDL definition was not chased down.
- **OpenELIS Global 2:** did not check whether the `"XXXX"` sentinel bypass, or any bulk-import/analyzer-interface path (as opposed to the manual `ResultEntryRestController` path traced), might accept a non-numeric string into a numeric-typed result without going through `ResultsValidation`.
- Neither project's documentation states an explicit design rationale for why the shape check does or doesn't extend to the server (for SENAITE) or to non-numeric result types (for OpenELIS); this reports what the code does, not why.

## Sources

- SENAITE.CORE, backend field/behavior: [`senaite/senaite.core`](https://github.com/senaite/senaite.core), default branch, commit as cloned 2026-09-11 — `src/bika/lims/content/abstractanalysis.py:78-82, 647-712`
- SENAITE listing/result-grid frontend: [`senaite/senaite.app.listing`](https://github.com/senaite/senaite.app.listing) ("ReactJS listing component for SENAITE CORE"), default branch, commit as cloned 2026-09-11 — `webpack/app/components/TableCell.coffee:255-281, 1009-1010`, `webpack/app/components/NumericField.coffee:38-57, 94-156`, `src/senaite/app/listing/ajax.py:372-389, 647-693`
- OpenELIS Global 2, current maintained repository confirmed via GitHub org/repo metadata: [`DIGI-UW/OpenELIS-Global-2`](https://github.com/DIGI-UW/OpenELIS-Global-2), `develop` branch, commit as cloned 2026-09-11 (`pushed_at` same day)
  - `frontend/src/components/resultPage/unified/PolymorphicResultCell.tsx:1-252`
  - `src/main/java/org/openelisglobal/result/action/util/ResultsValidation.java:1-227`
  - `src/main/java/org/openelisglobal/result/action/util/ResultsUpdateDataSet.java:41, 128-129`
  - `src/main/java/org/openelisglobal/result/controller/rest/ResultEntryRestController.java:268-397`
- Noted but not used as a source (stale/superseded org repo, flagged so it is not mistaken for the current project): [`openelisglobal/openelisglobal-core`](https://github.com/openelisglobal/openelisglobal-core), last pushed 2021-03-15, confirmed stale via `gh api repos/openelisglobal/openelisglobal-core`
