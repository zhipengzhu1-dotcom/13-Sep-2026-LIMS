# How many digits does a pharmaceutical analytical QC number actually need, and how do existing laboratory systems store and compare them?

**Asked by:** the orchestrator, Benchline wayfinder map
**Date:** 2026-09-11
**Status of sources:**
- SENAITE `senaite.core` cloned fresh this session at commit `993f721e6d8494d94a4001cd3d73409504b67a49` (10 Sep 2026) from `https://github.com/senaite/senaite.core.git` — same commit a prior session read, independently re-verified line-by-line in this session.
- OpenELIS Global 2 cloned fresh this session at commit `672c92a618f8ad146560846eacafb0e0a4178068` from `https://github.com/I-TECH-UW/OpenELIS-Global-2.git`.
- ICH Q3A(R2) ("Impurities in New Drug Substances") and ICH Q2(R2) (Step 2b draft, 24 Mar 2022) fetched as PDF directly from `database.ich.org` and text-extracted this session.
- USP General Notices §"Interpretation of Requirements" / "Significant Figures and Tolerances" — the **current** USP-NF text is behind a login wall (`uspnf.com` returned HTTP 403 on every path attempted this session, confirmed again). What is quoted below is from a **free legacy mirror of USP 29–NF24 (2006 edition)**, not the current USP-NF. The concept is long-standing (this session cannot say whether the 2026 wording is identical).
- ASTM E29-22 was not retrieved — `store.astm.org` is a paywalled storefront; no full text was accessed. Flagged as unread.
- PostgreSQL docs fetched live from `postgresql.org/docs/current` this session (current version).
- C#/.NET decimal precision figure is stated on Microsoft Learn's current docs (not independently re-verified against a primary language spec this session; treated as SECONDARY/vendor-documentation, one step better than a blog).
- IEEE 754-2008 itself is an IEEE paywalled standard; digit counts below are widely-corroborated secondary figures, not read from the standard's own text this session.

---

## Findings

### Part A — the precision bound, from the analytical side

**A1. ICH Q3A(R2) contains an explicit, primary, verbatim statement bounding reported digits for impurity results — VERIFIED, quoted from the guideline PDF fetched this session.**

Source: `https://database.ich.org/sites/default/files/Q3A%28R2%29%20Guideline.pdf` (ICH Q3A(R2), the current step-4 version, Attachment 2 revised 25 Oct 2006 — this is the current guideline, not a superseded draft).

> "Below 1.0%, the results should be reported to two decimal places (e.g., 0.06%, 0.13%); at and above 1.0%, the results should be reported to one decimal place (e.g., 1.3%). Results should be rounded using conventional rules (see Attachment 2)."

And, on comparing a reported result to a threshold:

> "To verify if a threshold is exceeded, a reported result has to be evaluated against the thresholds as follows: when the threshold is described in %, the reported result rounded to the same decimal place as the threshold should be compared directly to the threshold... For example the amount of impurity at 0.12% level corresponds to a TDI of 0.96 mg (absolute amount) which is then rounded up to 1.0 mg; so the qualification threshold expressed in TDI (1.0 mg) is not exceeded."

Also of note, immediately preceding the reporting-digits statement:

> "The use of two decimal places for thresholds (see Attachment 1) does not necessarily reflect the precision of the analytical procedure used for routine quality control purposes. Thus, the use of lower precision techniques (e.g., thin-layer chromatography) can be acceptable where justified and appropriately validated."

This scopes the rule to impurity/related-substance reporting specifically, not to every quantitative QC result (e.g. assay %). ICH Q3A(R2) does not generalize the digit rule to all analytical result types.

Attachment 2 of the same document (titled in the text but referenced, not reproduced as extractable text — likely rendered as a table/image in the PDF) is cited as containing the "conventional rounding rules" but its body text could not be extracted by `pdftotext` in this session. **This is a gap**: the rule that "results are rounded using conventional rules per Attachment 2" is confirmed to exist, but Attachment 2's own wording was not retrieved.

**A2. ICH Q2(R2) — searched, zero occurrence.**

Fetched `https://database.ich.org/sites/default/files/ICH_Q2-R2_Document_Step2_Guideline_2022_0324.pdf` (Step 2b draft, 24 Mar 2022) and full-text-searched the extracted text (3,157 lines) for `significant digit`, `decimal place`, `number of digits`, `round`. **No hits at all** (zero occurrences of "round" in any form). ICH Q2(R2) discusses precision as a validation *parameter* (repeatability, intermediate precision, %RSD) but does not state how many digits a reported result should carry. Note: this is the Step 2b public draft; I did not locate and fetch the Step 4 final text (adopted 1 Nov 2023, effective in the EU 14 June 2024) this session, so this finding is against the draft, not confirmed against the final. Flagged as a gap.

**A3. ICH Q3A(R2) itself — searched the same corpus for the general term, zero additional occurrences beyond A1.**

`grep -i "significant digit\|decimal place\|number of digits\|round"` against the full extracted Q3A(R2) text returned only the passages quoted in A1 above — no separate blanket digit-count rule elsewhere in the document.

**A4. 21 CFR Part 211 — not searched this session** (out of scope for time; flagged as not established here rather than asserted absent). A prior session's research file `docs/research/rounding-regulatory...` (see repository listing) may already cover this ground; this file does not duplicate that search.

**A5. USP General Notices — historical wording only, current text unreachable (paywalled).**

`uspnf.com` returned HTTP 403 on every path tried this session (re-confirmed, consistent with the known constraint). A free mirror of the **2006 USP 29–NF24** General Notices ("Significant Figures and Tolerances" / "Interpretation of Requirements"), fetched from `http://ftp.uspbpep.com/v29240/usp29nf24s0_uspgn109.html` this session, reads verbatim:

> "Analytical results observed in the laboratory (or calculated from experimental measurements) are compared with stated limits to determine whether there is conformance with compendial assay or test requirements. The observed or calculated values usually will contain more significant figures than there are in the stated limit, and a reportable result is to be rounded off to the number of places that is in agreement with the limit expression by the following procedure. Intermediate calculations (e.g., slope for linearity in *Validation of Compendial Methods* 〈1225〉) may be rounded for reporting purposes, but the original value (not rounded) should be used for any additional required calculations. Rounding off should not be done until the final calculations for the reportable value have been completed. [NOTE — Limits, which are fixed numbers, are not rounded off.]"

> "When rounding off is required, consider only one digit in the decimal place to the right of the last place in the limit expression. If this digit is smaller than 5, it is eliminated and the preceding digit is unchanged. If this digit is greater than 5, it is eliminated and the preceding digit is increased by one. If this digit equals 5, the 5 is eliminated and the preceding digit is increased by one." (This is round-half-up, applied only to the single digit immediately past the retained place — not IEEE/banker's round-half-to-even.)

**This is directly on point for "carry intermediate precision higher than reported precision, round once at the end" — but it is 2006 text from a free legacy mirror, not the current USP-NF, which was unreachable.** I cannot confirm the current edition uses identical wording.

**A6. ASTM E29 — not read this session; flagged, not paraphrased from memory.**

`store.astm.org/e0029-22.html` is a paywalled sales page; full text not accessible. Web search summaries (SECONDARY, not verified against the standard's own text) describe ASTM E29 as covering an "absolute method" and "rounding method" for comparing test data to specification limits, and describe a half-to-even ("banker's rounding") tie-break — this is **not independently confirmed** this session and should not be treated as established; it directly contradicts the round-half-up rule quoted verbatim from USP 29-NF24 above, which underscores that the two standards may specify different tie-break conventions and that ASTM E29's actual rule needs primary-text verification, not secondary paraphrase.

**A7. Balance and CDS output digits — SECONDARY only, no manufacturer datasheet retrieved.**

Web search (not a manufacturer spec sheet) indicates analytical balances typically offer 0.1 mg or 0.01 mg readability (4–5 decimal places in grams), and OIML R76 Class I maximum permissible error figures were quoted from secondary blog sources, not the OIML R76 text itself (`ilac.org`/OIML document not fetched this session). USP `<41>` (Balances) and `<1251>` (Weighing on an Analytical Balance) were not retrieved in full text — `uspnf.com` paywalled — only secondary summaries describing an accuracy/repeatability tolerance of "0.10%" and a "safety factor" concept were found. **These figures are unverified against USP primary text this session and should be treated as indicative only.**

No HPLC/CDS manufacturer specification (e.g. Empower, Chromeleon) for peak-area or %-assay reporting precision was retrieved this session — not searched due to time; flagged as an open question, not answered.

---

### Part B — what mature LIMS actually do (source code, this session)

**B1. SENAITE stores the analysis `Result` as a Zope Archetypes `StringField` — VERIFIED, file:line.**

`src/bika/lims/content/abstractanalysis.py:78-82`:
```python
# The final result of the analysis is stored here
Result = StringField(
    'Result',
    read_permission=ViewResults,
    write_permission=FieldEditAnalysisResult,
)
```
Not a numeric/float field. Confirmed by `grep`: `abstractbaseanalysis.py` (the analysis-service template class) uses `FixedPointField` only for `DuplicateVariation`, `Price`, `BulkPrice`, `VAT` (lines 474, 546, 556, 570) — pricing/QC-duplicate-tolerance fields, not the result itself.

**B2. The string→float conversion happens in `api.to_float`, a thin wrapper over Python's built-in `float()` — VERIFIED, file:line.**

`src/bika/lims/api/__init__.py:2035-2047`:
```python
def to_float(value, default=_marker):
    ...
    if not is_floatable(value):
        if default is not _marker:
            return to_float(default)
        fail("Value %s is not floatable" % repr(value))
    return float(value)
```
Binary IEEE-754 double, not `decimal.Decimal`.

**B3. `decimal.Decimal` exists in the codebase but only for currency, never for analytical results — VERIFIED by exhaustive grep, file:line.**

`grep -rln "Decimal" src/bika src/senaite` matches ~90 files, the overwhelming majority of which are locale `.po` translation files (containing the word "Decimal" as UI label text) and JS vendor bundles (tinymce/d3), not result-precision code. Of the Python source hits: `src/bika/lims/content/abstractanalysis.py` imports `Decimal` at line 25 but uses it only for price/VAT arithmetic at lines 862 and 870 (confirmed this session; consistent with prior-session finding). `abstractbaseanalysis.py` and `analysiscategory.py`/`analysisprofile.py`/`client.py`/`pricelist.py`/`labproduct.py` hits are all pricing/product-catalog code. `grep -rn "ROUND_HALF\|ROUND_UP\|ROUND_CEILING\|getcontext"` across `src/bika` and `src/senaite` returns **zero matches** — no rounding-mode control exists anywhere in the codebase.

**B4. SENAITE's pass/fail verdict compares the raw (unrounded, unformatted) float result against the raw limit — VERIFIED, file:line (matches and extends a prior session's finding, re-checked against the same commit this session).**

`src/bika/lims/api/analysis.py`: `is_out_of_range()` retrieves the raw stored string via `getResult` (line ~64-65), converts with `api.to_float` (line ~115), and compares directly to `api.to_float(result_range.min, ...)` / `.max` (lines ~146-166) using Python `>=`/`>`/`<=`/`<` on binary floats. `getPrecision()` and `getFormattedResult()` are not called anywhere in this comparison path. The value the analyst/client sees on a report is produced by a separate call chain ending in `format_numeric_result()` (`abstractanalysis.py:1146-1147`), so the **displayed, decimal-place-rounded** value and the **value actually evaluated against the spec** are two different computations on two different representations of the same underlying string.

**B5. OpenELIS Global 2 stores the result `value` as a Java `String`, mapped to a `varchar(200)` column — VERIFIED, file:line.**

`src/main/java/org/openelisglobal/result/valueholder/Result.java:42`: `private String value;`

Hibernate mapping, `src/main/resources/hibernate/hbm/Result.hbm.xml:45-46`:
```xml
<property name="value" type="java.lang.String">
    <column name="VALUE" length="200" />
</property>
```

Confirmed against the raw DDL, `db/dbInit/OpenELIS-Global.sql:5715-5721`:
```sql
CREATE TABLE clinlims.result (
    ...
    value character varying(200),
    ...
```

**B6. Unlike SENAITE, OpenELIS parses the stored text into `java.math.BigDecimal` for numeric QC evaluation, not into `double`/`float` — VERIFIED, file:line.**

`src/main/java/org/openelisglobal/result/service/QcEvaluationServiceImpl.java`: imports `java.math.BigDecimal` (line 3); defines constants as `BigDecimal` (lines 37-40, e.g. `DEFAULT_RPD_THRESHOLD = new BigDecimal("20")`); parses the result via `BigDecimal resultValue = parseNumericValue(result.getValue())` (line 77); and performs QC comparisons (blank, duplicate/RPD, control-recovery evaluation) using `BigDecimal` arithmetic, e.g. `mean = parentValue.add(dupValue).divide(TWO, MC)` (line 131) and `.compareTo(BigDecimal.ZERO)` (line 134). `src/main/java/org/openelisglobal/resultlimit/service/ResultLimitServiceImpl.java` similarly imports `BigDecimal` (line 4) and does `value = new BigDecimal(cleaned)` (line 723).

**Net comparison of the two systems' precedent, stated plainly:** both SENAITE and OpenELIS store the analytical result as **text**, not as a fixed-precision numeric database column, and both convert to a numeric type only at the point of use. They differ in *which* numeric type: SENAITE converts to a Python binary `float` (IEEE-754 double) for its pass/fail comparison and never uses `Decimal` for results; OpenELIS converts to `java.math.BigDecimal` (arbitrary-precision decimal) for its QC-rule evaluation. Neither system was found, in the paths read this session, to store or compare using a fixed-scale database-level `NUMERIC(p,s)` column for the result value itself.

**B7. Other systems — not read this session.** Bahmni/OpenMRS `obs.value_numeric` was not checked (out of session scope); no claim is made either way.

---

### Part C — precision in other regulated numeric domains, as a bound-setting analogy only (not authority)

- **PostgreSQL `NUMERIC`/`DECIMAL`** (current docs, `postgresql.org/docs/current/datatype-numeric.html`, fetched this session): an *unconstrained* `numeric` column can hold up to 131,072 digits before the decimal point and 16,383 digits after; an *explicitly declared* `numeric(p,s)` is capped at precision 1000. (VERIFIED against current live docs.)
- **IEEE 754-2008 `decimal64`/`decimal128`**: commonly cited (SECONDARY — not read from the IEEE standard itself, which is paywalled) as 16 significant decimal digits for `decimal64` and 34 significant decimal digits for `decimal128`.
- **C# / .NET `decimal`**: Microsoft's current docs (SECONDARY, vendor documentation, not independently cross-checked against ECMA-334/C# language spec this session) state 28–29 significant digits.
- **IEEE-754 `binary64`** (the type behind a JavaScript `number` and Python `float`): commonly cited (SECONDARY) as guaranteeing round-trip fidelity for up to 15 significant decimal digits, and up to 17 significant decimal digits when converting to decimal and back guarantees a unique recovery of the original binary value. Not read from the IEEE 754 primary text this session.

This part is offered only as a sanity-check on upper bounds for a fixed-precision numeric type; none of it says anything about what a pharmaceutical QC result *should* carry — that question is addressed only by Part A.

---

## What I could not establish

- **Attachment 2 of ICH Q3A(R2)** (the actual "conventional rounding rules" table referenced by the guideline) — its text did not survive PDF extraction this session; only the reference to its existence was confirmed.
- **ICH Q2(R2) final (Step 4, Nov 2023) text** — only the Step 2b draft (Mar 2022) was searched; the zero-occurrence finding on digit-counting language is against the draft, not confirmed against the adopted final version.
- **21 CFR Part 211** — not searched this session for digit/precision language; no claim made either way.
- **USP General Notices, current edition** — `uspnf.com` is paywalled (HTTP 403, reconfirmed). Only a free mirror of the 2006 (USP 29-NF24) edition was retrievable. Whether the current wording matches is unconfirmed.
- **ASTM E29-22** — not retrieved at all; the widely-repeated claim that it specifies "banker's rounding" (round-half-to-even) is SECONDARY/unverified and appears to conflict with the round-half-up rule found verbatim in USP 29-NF24; which standard(s) actually specify which tie-break convention needs primary-text confirmation, not secondary paraphrase.
- **USP `<41>` and `<1251>`** (balance requirements) and **OIML R76** — full text not retrieved; only secondary blog summaries found. Manufacturer balance/CDS specification sheets were not retrieved this session.
- **Any other open-source LIMS/EHR numeric-observation column type** (Bahmni, OpenMRS `obs.value_numeric`) — not checked this session.

---

## Sources

- ICH Q3A(R2), "Impurities in New Drug Substances," Attachment 2 revised 25 Oct 2006 (current step-4 guideline) — `https://database.ich.org/sites/default/files/Q3A%28R2%29%20Guideline.pdf`, fetched and text-extracted 2026-09-11.
- ICH Q2(R2), "Validation of Analytical Procedures," Step 2b draft, 24 March 2022 — `https://database.ich.org/sites/default/files/ICH_Q2-R2_Document_Step2_Guideline_2022_0324.pdf`, fetched and text-extracted 2026-09-11. (Final Step-4 text, adopted 1 Nov 2023, effective EU 14 Jun 2024, not separately fetched this session.)
- USP 29–NF24 (2006), General Notices, "Significant Figures and Tolerances" / "Interpretation of Requirements" — free legacy mirror `http://ftp.uspbpep.com/v29240/usp29nf24s0_uspgn109.html`, fetched 2026-09-11. **Not the current USP-NF**; `uspnf.com` returned HTTP 403 on all paths tried 2026-09-11.
- SENAITE `senaite.core`, commit `993f721e6d8494d94a4001cd3d73409504b67a49`, cloned from `https://github.com/senaite/senaite.core.git`, 2026-09-11.
- OpenELIS Global 2, commit `672c92a618f8ad146560846eacafb0e0a4178068`, cloned from `https://github.com/I-TECH-UW/OpenELIS-Global-2.git`, 2026-09-11.
- PostgreSQL documentation, "Numeric Types," current version — `https://www.postgresql.org/docs/current/datatype-numeric.html`, fetched 2026-09-11.
- Microsoft Learn, "Floating-point numeric types" (C# reference), current — cited via search summary 2026-09-11, not independently cross-checked against a language-spec primary source.
- ASTM E29-22 — NOT accessed; `store.astm.org/e0029-22.html` is a paywalled listing page only.
- IEEE 754-2008 — NOT accessed; paywalled IEEE standard. Digit-count figures are widely-corroborated secondary claims only.
- OIML R76, USP `<41>`, USP `<1251>` — NOT accessed in primary text this session; secondary summaries only, flagged as unverified.
