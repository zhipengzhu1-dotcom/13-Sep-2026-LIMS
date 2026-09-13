# How do existing laboratory systems model numeric precision, rounding, and the pass/fail comparison against a limit?

**Asked by:** the orchestrator (Benchline wayfinder map — rounding rule stored per acceptance limit)
**Date:** 2026-09-11
**Status of sources:** Read from source, not from docs. SENAITE `senaite.core` cloned at commit `993f721e6d8494d94a4001cd3d73409504b67a49` (10 Sep 2026), `setup.py` version `2.7.0` (unreleased), CI pins CPython **2.7.18** (`.github/workflows/build-and-test.yml:43`). OpenELIS Global 2 cloned at commit `672c92a618f8ad146560846eacafb0e0a4178068` (10 Sep 2026) from `https://github.com/I-TECH-UW/OpenELIS-Global-2.git`, which GitHub now resolves to the canonical repository `DIGI-UW/OpenELIS-Global-2`. Java rounding semantics confirmed against the current Oracle JDK 17 `java.util.Formatter` javadoc. LabKey checked against its live documentation wiki (`labkey.org/Documentation`, retrieved 2026-09-11). Commercial LIMS: no primary vendor documentation was publicly retrievable — see "What I could not establish".

Line numbers below are from those two commits.

---

## Findings

### 1. SENAITE stores DECIMAL PLACES only. There is no rounding-mode setting anywhere.

**Read in source.** The only precision fields on `AbstractBaseAnalysis` (inherited by `AnalysisService` and by every analysis object) are:

- `Precision` — `src/bika/lims/content/abstractbaseanalysis.py:172`, an `IntegerField` whose own comment reads `# Decimal precision for printing normal decimal results.` and whose label is `_("Precision as number of decimals")`, description `"Define the number of decimals to be used for this result."`
- `ExponentialFormatPrecision` — `abstractbaseanalysis.py:184`, default `7`; a display threshold that switches the rendering to scientific notation, not a rounding rule.
- `PrecisionFromUncertainty` — `abstractbaseanalysis.py:658`, a `BooleanField` (see §3).
- `LowerDetectionLimit` — `abstractbaseanalysis.py:196`, a `StringField` default `"0.0"`. This and `UpperDetectionLimit` / `LowerLimitOfQuantification` / `UpperLimitOfQuantification` affect only the *rendered* string (`"< LDL"`, `"Not detected"`), see §2.

There is **no** `SignificantDigits` field on `AbstractBaseAnalysis`. `grep -rn "SignificantDigits" src` returns nothing for a content field. The word "significant digits" appears only in the *description text* of `PrecisionFromUncertainty` and in the helper `get_significant_digits()`, which despite its name returns a **decimal-place count** (see §3).

There is **no rounding mode, tie-break, or half-up/half-even option** in the schema, in `senaite.core`'s registry, or in the formatting code. The single rounding site for a reported result is:

`src/bika/lims/utils/analysis.py:196-200` (in `_format_decimal_or_sci`):

```python
    else:
        # Decimal notation
        prec = precision if precision and precision > 0 else 0
        formatted = str("%%.%sf" % prec) % api.to_float(result, 0)
```

That is C-style `printf` `%.Nf` applied to a Python binary `float`. CPython's float→string conversion is correctly rounded against the binary value, so an exactly representable tie goes **half-to-even**, and a decimal literal that merely looks like a tie goes wherever its binary value actually lies. Verified locally on CPython 3.13.7 (same dtoa-based conversion as 2.7): `'%.2f' % 0.125` → `0.12`; `'%.2f' % 0.135` → `0.14`; `'%.2f' % 1.005` → `1.00`; `'%.2f' % 2.675` → `2.67`. SENAITE does **not** use `decimal.Decimal`, `ROUND_HALF_UP`, or `getcontext()` anywhere in `src/bika` or `src/senaite` — `grep -rn "ROUND_HALF\|ROUND_UP\|ROUND_CEILING\|getcontext"` returns nothing. `Decimal` is imported in `abstractanalysis.py:25` but is used only for price/VAT arithmetic (`abstractanalysis.py:862, 870`).

The only use of Python's built-in `round()` on a measurement quantity is on the **uncertainty**, not the result — `abstractanalysis.py:1201` (see §3).

`formatDecimalMark` (`src/bika/lims/utils/__init__.py:190`) is purely cosmetic — it swaps `.` for a locale decimal mark by string `join`, and its own docstring calls it a "Dummy method". It does not round.

### 2. THE VERDICT: SENAITE compares the RAW stored result against the limit, never the formatted/rounded one.

**Read in source.** `is_out_of_range` lives at `src/bika/lims/api/analysis.py:40`. It obtains the result via `getResult` (the raw stored string), not `getFormattedResult`:

`src/bika/lims/api/analysis.py:64-65`
```python
    if result is _marker:
        result = api.safe_getattr(analysis, "getResult", None)
```

and then, at `src/bika/lims/api/analysis.py:115`:
```python
    # Convert result to a float
    result = api.to_float(result)
```

The comparison itself, `src/bika/lims/api/analysis.py:146-166`:

```python
    result_range = ResultsRangeDict(result_range)

    # The assignment of result as default fallback for min and max guarantees
    # the result will be in range also if no min/max values are defined
    specs_min = api.to_float(result_range.min, result)
    specs_max = api.to_float(result_range.max, result)

    in_range = False
    min_operator = result_range.min_operator
    if min_operator == "geq":
        in_range = result >= specs_min
    else:
        in_range = result > specs_min

    max_operator = result_range.max_operator
    if in_range:
        if max_operator == "leq":
            in_range = result <= specs_max
        else:
            in_range = result < specs_max
```

Both sides are raw Python floats: the unrounded result and the `min`/`max` strings from the results range. `analysis.getPrecision()` is **not called** in `api/analysis.py` at all. Neither is `getFormattedResult`.

The shoulder ("warning") band is computed the same way from raw values, `analysis.py:174-177`:
```python
    warn_min = api.to_float(result_range.warn_min, specs_min)
    warn_max = api.to_float(result_range.warn_max, specs_max)
    in_shoulder = warn_min <= result <= warn_max
```

The boundary operator is configurable per range — `min_operator` defaults to `"geq"` and `max_operator` to `"leq"` (`src/bika/lims/content/analysisspec.py:189-195`, `ResultsRangeDict`), so inclusive/exclusive limits are modelled explicitly. Rounding is not.

Every caller of the verdict passes the analysis object, not a formatted value: `src/bika/lims/browser/analyses/view.py:1505` and `:1522`, `src/bika/lims/browser/worksheet/views/printview.py:467`, `src/bika/lims/browser/workflow/analysis.py:77`, `src/bika/lims/content/instrument.py:540` — all call `is_out_of_range(analysis)` with no result argument.

Meanwhile the value the analyst and the client **see** is produced by a different path, `getFormattedResult` at `src/bika/lims/content/abstractanalysis.py:1001`, which ends at `abstractanalysis.py:1146-1147`:
```python
        # Render numerical values
        return format_numeric_result(self, decimalmark=decimalmark,
                                     sciformat=sciformat)
```
`format_numeric_result` (`src/bika/lims/utils/analysis.py:312`) applies `analysis.getPrecision()` through `_format_decimal_or_sci`. So in SENAITE the **displayed number and the conformance verdict are computed from two different numbers**: the verdict from the raw float, the display from the precision-rounded string. A result of 10.04 against a max of 10.0 with `Precision = 1` displays as `10.0` and is flagged out of range.

Results are stored raw. `setResult` (`abstractanalysis.py:647`) does string cleanup, detection-limit operand stripping and date/JSON handling; it performs no rounding and no precision application before `self.getField("Result").set(self, val)`.

There *is* an extension point: `api/analysis.py:135` looks up `IResultOutOfRange` adapters and lets one override the verdict:
```python
    adapters = getAdapters((analysis,), IResultOutOfRange)
```
`senaite.core` ships no implementation of that interface (only the declaration at `src/bika/lims/interfaces/__init__.py:634`), so an add-on could substitute a rounded comparison, but nothing in core does.

`getFormattedResult` also masks out-of-range values when `hidemin`/`hidemax` are set on the spec (`abstractanalysis.py:1091-1111`), rendering `< min` or `> max` — another divergence between the displayed string and the compared number, this one deliberate.

### 3. `PrecisionFromUncertainty`: decimals derived from the (rounded) uncertainty, at run time, per result.

**Read in source.** `getPrecision` on `AbstractAnalysis`, `src/bika/lims/content/abstractanalysis.py:1147-1204`:

```python
        precision = self.getField("Precision").get(self)
        allow_manual = self.getAllowManualUncertainty()
        precision_unc = self.getPrecisionFromUncertainty()
        if allow_manual or precision_unc:

            # if no uncertainty rely on the fixed precision
            uncertainty = self.getUncertainty()
            if not api.is_floatable(uncertainty):
                return precision

            uncertainty = api.to_float(uncertainty)
            if uncertainty == 0:
                # calculate the precision from the result
                try:
                    result = str(float(self.getResult()))
                    num_decimals = result[::-1].find('.')
                    return num_decimals
                except ValueError:
                    # result not floatable, return the fixed precision
                    return precision

            # Get the 'raw' significant digits from uncertainty
            sig_digits = get_significant_digits(uncertainty)
            # Round the uncertainty to its significant digit.
            # Needed because the precision for the result has to be based on
            # the *rounded* uncertainty. Note the following for a given
            # uncertainty value:
            #   >>> round(0.09404, 2)
            #   0.09
            #   >>> round(0.09504, 2)
            #   0.1
            # The precision when the uncertainty is 0.09504 is not 2, but 1
            uncertainty = abs(round(uncertainty, sig_digits))
            # Return the significant digit to apply
            return get_significant_digits(uncertainty)

        return precision
```

Confirmed behaviour:

- The number of decimals is **not a stored constant**. It is recomputed from the uncertainty, which is itself interpolated per result from uncertainty ranges (`getUncertainty`, `abstractanalysis.py:401`) or entered manually per result. Two results of the same analysis service can legitimately be reported at different precisions.
- `get_significant_digits` (`src/bika/lims/utils/analysis.py:105-130`) does **not** return significant figures. Its body is:
```python
    significant_digit = int(math.floor(math.log10(abs(numeric_value))))
    return 0 if significant_digit > 0 else abs(significant_digit)
```
  i.e. the position of the first non-zero decimal, and **0 for any value ≥ 1**. Its own docstring table gives `0.22 → 1`, `0.013 → 2`, `1.34 → 0`, `22 → 0`. So an uncertainty of 37 yields precision 0 (integer reporting), not two significant figures.
- The rounding-of-the-uncertainty step at line 1201 uses Python's built-in `round()` — half-to-even in Python 3, half-away-from-zero in Python 2, and in both cases operating on a binary float. This is the only place a tie-break rule is materially exercised in SENAITE, and it is the language default, not a configured one.
- The manual-uncertainty path deliberately avoids rounding when the user typed the uncertainty (`src/bika/lims/utils/analysis.py:288-294`): `# always get full precision of the uncertainty if user entered manually / => avoids rounding and cut-off`, taking the decimal count straight off the typed string with `uncertainty[::-1].find(".")`.

This is a rounding rule that a `{decimals | sigfigs} + tie_break` vocabulary cannot hold as a stored constant: the decimal count is a function of the uncertainty of *this particular result*.

That the *rounded* uncertainty must drive the precision was a bug fixed in 2023 — [senaite.core PR #2427, "Fix precision is not calculated from the rounded uncertainty"](https://github.com/senaite/senaite.core/pull/2427), merged 2023-11-19. The PR body records the pre-fix behaviour: result `9.6`, uncertainty `0.9504`, uncertainty displayed as `1`, but `getPrecision()` returning `1` so the result rendered as `9.6 ± 1`.

### 4. OpenELIS Global 2: one `significantDigits` field that its own code comments say is not significant digits; the comparison is on the raw parsed value; three different formatting paths with three different tie behaviours.

**Read in source.**

**The field.** `significantDigits` is carried on `TestResult` (mapped at `src/main/resources/hibernate/hbm/TestResult.hbm.xml:46-49`, column `SIGNIFICANT_DIGITS`) and copied onto `Result` (`src/main/resources/hibernate/hbm/Result.hbm.xml:57-58`, column `significant_digits`, `java.lang.Integer`). Legacy validation constrains it to `^[0-9]*$`, maxlength 22 (`src/main/resources/validation/validation.xml:2291-2302`); the React test-catalog editor constrains it to `Yup.number().min(0).max(4)` (`frontend/src/components/admin/testManagementConfigMenu/customComponents/TestStepForm.jsx:2698`).

The name is wrong and the codebase knows it. `src/main/java/org/openelisglobal/common/util/StringUtil.java:563-577`:

```java
    // not truly significant digits, just decimal places
    public static String doubleWithSignificantDigits(double value, String significantDigits) {
        if (GenericValidator.isBlankOrNull(significantDigits) || significantDigits.equals("-1")) {
            return String.valueOf(value);
        }

        String format = "%1$." + significantDigits + "f";
        return String.format(format, value);
    }

    // not truly significant digits, just decimal places
    public static String doubleWithSignificantDigits(double value, int significantDigits) {
        String format = "%1$." + significantDigits + "f";
        return String.format(format, value);
    }
```

The same `// not truly significant digits, just decimal places` comment is repeated at the analyzer-import call site, `src/main/java/org/openelisglobal/result/controller/AnalyzerResultsController.java:635-636`. So: **decimal places, with a sentinel `-1` meaning "do not format", and no significant-figure mode and no rounding-mode option.**

**The tie behaviour differs by code path.** Java's `String.format("%.Nf", …)` rounds **HALF_UP** — the current Oracle JDK 17 `java.util.Formatter` javadoc states: *"If the precision is less than the number of digits which would appear after the decimal point in the string returned by `Float.toString(float)` or `Double.toString(double)` respectively, then the value will be rounded using the round half up algorithm."* The legacy JSP client instead uses an exponent-shift `Math.round` (`src/main/resources/static/scripts/utilities.js:1015-1035`), which is round-half-toward-`+∞`; the React client uses `toFixed` (`frontend/src/components/resultPage/SearchResultForm.jsx:2583`). Three implementations, three tie rules, one `significantDigits` number configuring all of them.

**The verdict is computed on the raw parsed value.** `src/main/java/org/openelisglobal/result/action/util/ResultsLoadUtility.java:1376-1400`:

```java
        try {
            double value = Double.parseDouble(resultValue);
            if (value < limit.getLowValid() || value > limit.getHighValid()) {
                return "INVALID";
            }
            boolean criticalLow = limit.getLowCritical() != Double.POSITIVE_INFINITY && value < limit.getLowCritical();
            boolean criticalHigh = limit.getHighCritical() != Double.POSITIVE_INFINITY
                    && value > limit.getHighCritical();
            if (criticalLow || criticalHigh) {
                return "CRITICAL";
            }
            if (value < limit.getLowNormal() || value > limit.getHighNormal()) {
                return "ABNORMAL";
            }
            return "NORMAL";
```

and `getIsNormal` at `ResultsLoadUtility.java:1403-1417`:
```java
                normal = value >= resultLimit.getLowNormal() && value <= resultLimit.getHighNormal();
```
`significantDigits` is not consulted in either. Same on the validation screen, `src/main/java/org/openelisglobal/resultvalidation/util/ResultsValidationUtility.java:620-627`, which compares `Double.parseDouble(result.getValue(true))` against `getHighNormal()`/`getLowNormal()`; `getValue(true)` (`src/main/java/org/openelisglobal/result/valueholder/Result.java:134-141`) only strips a leading `<`/`>` via `StringUtil.getActualNumericValue` — it does not round. Boundary inclusivity is hard-coded (`<`/`>` for the flag, `>=`/`<=` for `getIsNormal`) rather than configured, and the two are not consistent with each other.

**Where OpenELIS *does* round, it rounds the stored value, and the raw value is lost.** Two places:

1. Analyzer import: `AnalyzerResultsController.getRoundedToSignificantDigits()` (`AnalyzerResultsController.java:613-639`) replaces the instrument's value with the decimal-place-formatted string before it is presented for acceptance.
2. Manual entry, legacy UI: `src/main/resources/static/scripts/testResults.js:15-44`, `validateNumberFormat` **mutates the input box**: `resultBox.value = greaterThanOrLessThan + round( actualValue, significantDigits);`.

And in the legacy UI the two numbers diverge within a single function. `testResults.js:47-86`:

```java
function /*void*/ validateResults( resultBox, row, lowerNormal, upperNormal, lowerAbnormal, upperAbnormal, significantDigits, specialCase ){
	var actualValue = resultBox.value.replace(/[<>]/g, '')          // captured BEFORE rounding
	var validFormat = validateNumberFormat( resultBox,row, significantDigits);   // rounds resultBox.value
	...
	if( lowerAbnormal != upperAbnormal &&
	   (actualValue < lowerAbnormal || actualValue > upperAbnormal) ){            // compares the UNROUNDED capture
```

`actualValue` is read from the box before `validateNumberFormat` overwrites the box with the rounded value, so the on-screen warning colour is decided on the raw entry while the value that goes to the server is the rounded one. Note too that `actualValue` is a JavaScript **string** here, so `<` / `>` against the bound arguments is a loose comparison whose semantics depend on how `resultListView.jsp:1087` interpolates the bounds. (Also in this block: hard-coded French UI strings with a `//FIXME`.)

**Summary for OpenELIS: it models a per-test decimal-place count for display and for value capture, and it models no rounding rule for the conformance decision at all.**

### 5. Other precedent

- **LabKey** (documentation, retrieved 2026-09-11): number handling is presentation-only. [Date & Number Display Formats](https://www.labkey.org/Documentation/wiki-page.view?name=dateFormats) states that "Format strings for Number (Double) fields must be compatible with the format that the java class `DecimalFormat` accepts", and the page covers pattern symbols only — it does not discuss rounding mode or significant figures. [Field Types and Properties](https://www.labkey.org/Documentation/wiki-page.view?name=propertyFields) describes Decimal fields as 8-byte double-precision floats and recommends a display format "to avoid displaying approximate values". LabKey therefore offers a *display* format, not a rounding rule and not a rounded conformance comparison. Its support forum carries a thread titled ["Rounding weirdness with scientific notation formatString"](https://www.labkey.org/home/Support/LabKey%20Support%20Forum/announcements-thread.view?rowId=12483).
- **Bika** is the ancestor of SENAITE; the SENAITE code above still lives under `src/bika/lims/`, and the format function's docstring still points at the historical Bika ticket `https://jira.bikalabs.com/browse/LIMS-1334` (`src/bika/lims/utils/analysis.py:352`). It is the same precedent, not an independent one.
- **LabWare, STARLIMS, Thermo SampleManager**: no primary vendor documentation describing a rounding-rule configuration was publicly retrievable. See below — I am not reporting any claim about these products.

### 6. Evidence that this is a live failure mode

Issue/PR trackers, searched 2026-09-11 via the GitHub API:

- [senaite.core PR #2427](https://github.com/senaite/senaite.core/pull/2427) — "Fix precision is not calculated from the rounded uncertainty", merged 2023-11-19. Precision derived from an unrounded uncertainty gave `9.6 ± 1` (uncertainty displayed rounded to `1`, precision still 1 decimal).
- [senaite.core PR #2224](https://github.com/senaite/senaite.core/pull/2224) — "Fix wrong precision for exponential formatted uncertainties", closed.
- [senaite.core PR #183](https://github.com/senaite/senaite.core/pull/183) — "NDEV-39 Decimals rounding is not working as expected when uncertainties are set", closed.
- [senaite.core PR #222](https://github.com/senaite/senaite.core/pull/222) — "TypeError when Analysis Service's exponential format precision is None", closed.
- [senaite.core PR #969](https://github.com/senaite/senaite.core/pull/969) — "Cleanup `api.analysis.is_out_of_range`", and [PR #694](https://github.com/senaite/senaite.core/pull/694) "Out of range revisit and refactoring" — the verdict function has been reworked at least twice.
- [OpenELIS PR #1154](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/1154) — "fix significant digits for recording analyzer results", merged 2024-07-01.
- [OpenELIS PR #3115](https://github.com/DIGI-UW/OpenELIS-Global-2/pull/3115) — "fix: NumberFormatException parsing 'NEGATIVE' as significant digits", merged 2026-03-20: a non-numeric result value leaked into the `significantDigits` field and crashed `Integer.parseInt` with an HTTP 500 — i.e. the precision field is not type-safe end to end.

I found **no** issue in either tracker reporting a wrong *conformance verdict* caused by rounding at a boundary. The recorded defects are all about the reported/displayed precision, not about the pass/fail decision — which is consistent with both systems deciding on the raw value, where the boundary question never arises in that form.

---

## What I could not establish

- **Commercial LIMS rounding configuration (LabWare, STARLIMS, Thermo SampleManager).** Their administrator and configuration manuals are not public. Web search returned only marketing pages, third-party validation-consultancy write-ups, and AI-generated summaries asserting capabilities (e.g. "raw results are stored separately from rounded values") that I could not trace to any vendor document. I am not reporting those claims. Answering item 5 for commercial products would need licensed documentation.
- **Whether any SENAITE add-on implements `IResultOutOfRange` to compare a rounded value.** The hook exists (`src/bika/lims/api/analysis.py:135`); I searched only `senaite.core`, not the wider add-on ecosystem (`senaite.lims`, `senaite.storage`, vendor add-ons).
- **What Python 2.7.18 does at an exact binary tie in `'%.Nf'`.** I verified the behaviour empirically on CPython 3.13.7 only; I did not run a 2.7.18 interpreter. Both use the same David Gay-derived correctly-rounded conversion, so I expect identical results, but that is inference, not something I executed. Note that the *other* rounding site, built-in `round()` at `abstractanalysis.py:1201`, genuinely does differ between Python 2 (half away from zero) and Python 3 (half to even), and SENAITE 2.7.0 runs on Python 2.
- **Whether OpenELIS's REST/React result-save path rounds server-side before persisting.** I traced the analyzer-import path and both client paths; I did not exhaustively trace every controller that writes `Result.value`.
- **How the JSP interpolates range bounds** at `resultListView.jsp:1087`, and therefore whether the legacy client's `actualValue < lowerNormal` is a numeric or a lexicographic comparison. I read the call site but did not resolve the JSTL expression types.

---

## Sources

Read in source (cloned repositories, exact commits):

- senaite/senaite.core @ `993f721e6d8494d94a4001cd3d73409504b67a49`, 2026-09-10, `setup.py` version 2.7.0 (unreleased), CI Python 2.7.18 — https://github.com/senaite/senaite.core
  - `src/bika/lims/content/abstractbaseanalysis.py:172,184,196,658`
  - `src/bika/lims/content/abstractanalysis.py:647,1001,1091-1147,1147-1204,1201`
  - `src/bika/lims/utils/analysis.py:105-130,133-200,280-310,312-384`
  - `src/bika/lims/utils/__init__.py:190`
  - `src/bika/lims/api/analysis.py:40,64-65,115,135,146-177`
  - `src/bika/lims/content/analysisspec.py:150-195`
  - `src/bika/lims/interfaces/__init__.py:634`
  - `src/bika/lims/browser/analyses/view.py:1505,1522`; `src/bika/lims/browser/worksheet/views/printview.py:467`; `src/bika/lims/browser/workflow/analysis.py:77`; `src/bika/lims/content/instrument.py:540`
  - `src/senaite/core/tests/doctests/API_analysis.rst:180-215`
  - `.github/workflows/build-and-test.yml:43`
- DIGI-UW/OpenELIS-Global-2 (cloned via the `I-TECH-UW` redirect) @ `672c92a618f8ad146560846eacafb0e0a4178068`, 2026-09-10 — https://github.com/DIGI-UW/OpenELIS-Global-2
  - `src/main/java/org/openelisglobal/common/util/StringUtil.java:563-577,671-682`
  - `src/main/java/org/openelisglobal/result/action/util/ResultsLoadUtility.java:1376-1417`
  - `src/main/java/org/openelisglobal/resultvalidation/util/ResultsValidationUtility.java:620-627`
  - `src/main/java/org/openelisglobal/result/valueholder/Result.java:130-141`
  - `src/main/java/org/openelisglobal/result/controller/AnalyzerResultsController.java:610-639`
  - `src/main/resources/hibernate/hbm/TestResult.hbm.xml:46-49`; `src/main/resources/hibernate/hbm/Result.hbm.xml:53-58`
  - `src/main/resources/validation/validation.xml:2291-2302`
  - `src/main/resources/static/scripts/testResults.js:1-90`; `src/main/resources/static/scripts/utilities.js:1015-1035`
  - `src/main/webapp/pages/result/resultListView.jsp:1087`
  - `frontend/src/components/resultPage/SearchResultForm.jsx:2555-2591`; `frontend/src/components/admin/testManagementConfigMenu/customComponents/TestStepForm.jsx:2698`

Read in documentation (version/date confirmed):

- Oracle, `java.util.Formatter`, Java SE 17 API specification (current LTS javadoc), retrieved 2026-09-11 — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Formatter.html — `%f` rounds HALF_UP.
- LabKey Documentation wiki, "Date & Number Display Formats", retrieved 2026-09-11 — https://www.labkey.org/Documentation/wiki-page.view?name=dateFormats
- LabKey Documentation wiki, "Field Types and Properties", retrieved 2026-09-11 — https://www.labkey.org/Documentation/wiki-page.view?name=propertyFields
- LabKey Support Forum, "Rounding weirdness with scientific notation formatString" — https://www.labkey.org/home/Support/LabKey%20Support%20Forum/announcements-thread.view?rowId=12483

Issue-tracker searches (GitHub search API, 2026-09-11): senaite.core PRs #183, #222, #694, #969, #2224, #2427; OpenELIS PRs #1154, #3115.

Executed locally (my own observation, not a source): CPython 3.13.7, `'%.2f' % 0.125 == '0.12'`, `'%.2f' % 0.135 == '0.14'`, `'%.2f' % 1.005 == '1.00'`, `'%.2f' % 2.675 == '2.67'`.
