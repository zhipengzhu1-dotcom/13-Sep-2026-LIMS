# What are the actual semantics of rounding in Excel (and Google Sheets / LibreOffice Calc), and where does a formula's behaviour diverge from what a human would state as a rule?

**Asked by:** the orchestrator (spreadsheet acceptance-limit migration question — how recoverable is rounding intent from a formula?)
**Date:** 2026-09-11
**Status of sources:** All Microsoft function pages and the Excel floating-point article were fetched from microsoft.com on 2026-09-11. The function pages carry "Applies To: Excel for Microsoft 365, Excel 2024, Excel 2021"; the floating-point article on Microsoft Learn shows "Last updated on 2026-03-30". Google Sheets function pages fetched from support.google.com the same day (Google does not version these pages). The OpenFormula normative text is OASIS ODF **v1.3 OS** (the current OASIS Standard), not the older v1.2. FDA data-integrity guidance: I used the **final, December 2018** document at fda.gov/media/119267/download and confirmed from the PDF cover page that it reads "December 2018" with no draft banner — the superseded draft was not used. PIC/S **PI 041-1 (1 July 2021)** was confirmed still listed as current on the PIC/S publications index on 2026-09-11. FDA ORA Lab Manual Vol. III Section 4 is **MAN-000048, Revision 03, revised 07 Oct 2022** (its own header notes "For the most current and official copy, check QMiS", which I could not access). USP General Notices 7.20 text is from the **USP Revision Bulletin official 1 April 2015**; I could not access the live subscription USP–NF to confirm it is unchanged in the 2026 edition. ASTM E29: the copy available to me is **E29-13**, and ASTM's catalogue shows the current designation is **E29-22**, which is paywalled — the E29 clause numbers and wording quoted below are from the superseded 2013 edition and are flagged as such. NIST HB 150-2020 is not cited (withdrawn, and not relevant here).

Empirical checks below were run on this machine on 2026-09-11 against **Microsoft Excel for Mac 16.100.3** (version string read from the application) and **LibreOffice 26.8** (help version string; binary at /Applications/LibreOffice.app). These are clearly labelled as observation, not documentation.

---

## Findings

### 1. The ROUND family: tie-breaking, negatives, and negative `num_digits`

#### 1a. Microsoft's ROUND page does **not** state the tie-breaking rule

The ROUND function page gives only the digit semantics:

> "If `num_digits` is greater than 0 (zero), then number is rounded to the specified number of decimal places. If `num_digits` is 0, the number is rounded to the nearest integer. If `num_digits` is less than 0, the number is rounded to the left of the decimal point."
> — [ROUND function](https://support.microsoft.com/en-us/office/round-function-c018c5d8-40fb-4053-90b1-b3e7f61a213c)

Its worked examples (`=ROUND(2.15,1)→2.2`, `=ROUND(-1.475,2)→-1.48`, `=ROUND(21.5,-1)→20`, `=ROUND(-50.55,-2)→-100`) contain **no clean half-way case**, so the tie rule cannot be inferred from that page. This matters: the single most load-bearing fact about Excel's rounding is absent from the page a migrator would naturally consult.

#### 1b. Half-away-from-zero **is** documented by Microsoft, but on a different page

The tie rule appears in the "Round a number" task article:

> "The ROUND function rounds a number containing a fraction as follows: If the fractional part is 0.5 or greater, the number is rounded up. If the fractional part is less than 0.5, the number is rounded down."

and, for sign:

> "When rounding a negative number, that number is first converted to its absolute value (its value without the negative sign). The rounding operation then occurs, and then the negative sign is reapplied. Although this may seem to defy logic, it is the way rounding works."
> — [Round a number](https://support.microsoft.com/en-us/office/round-a-number-f82b440b-689d-4221-b21e-38da99d33435)

Together these are **half away from zero** (round-half-up in magnitude). Excel's ROUND is **not** banker's rounding / half-to-even.

The normative statement is cleanest in OpenFormula, which Excel's behaviour matches:

> "If X is halfway between the two nearest values, the result shall round away from zero."
> — OASIS [OpenDocument v1.3 OS, Part 4: Recalculated Formula (OpenFormula), §6.17.5 ROUND](https://docs.oasis-open.org/office/OpenDocument/v1.3/os/part4-formula/OpenDocument-v1.3-os-part4-formula.html)

Google states it directly too:

> "Standard rules indicate that when rounding to a particular place, the next most significant digit (the digit to the right) is considered. If this digit is greater than or equal to 5, the digit is rounded up, otherwise it is rounded down. **This occurs irrespective of sign; that is, 'up' and 'down' are in terms of magnitude.**"
> — [Google Sheets ROUND function](https://support.google.com/docs/answer/3093440)

*Observed (Excel 16.100.3):* `ROUND(2.5,0)=3`, `ROUND(-2.5,0)=-3`, `ROUND(1.15,1)=1.2`, `ROUND(1.25,1)=1.3`, `ROUND(1.35,1)=1.4`, `ROUND(1.45,1)=1.5`, `ROUND(15,-1)=20`, `ROUND(25,-1)=30`. Consistent with half-away-from-zero on the decimal value as written.

#### 1c. ROUNDUP / ROUNDDOWN — "up" and "down" mean magnitude, not number line

> "ROUNDUP behaves like ROUND, except that it always rounds a number up. […] If num_digits is less than 0, then number is rounded up to the left of the decimal point."
> — [ROUNDUP](https://support.microsoft.com/en-us/office/roundup-function-f8bc9b23-e795-47db-8703-db171d0c42a7)

> "Rounds a number down, toward zero. […] ROUNDDOWN behaves like ROUND, except that it always rounds a number down."
> — [ROUNDDOWN](https://support.microsoft.com/en-us/office/rounddown-function-2ec94c73-241f-4b01-8c6f-17e6d7968f53)

The documented example `=ROUNDDOWN(-3.14159, 1) → -3.1` confirms "down" = toward zero. *Observed in Excel:* `ROUNDUP(-3.14159,1) = -3.2`, `ROUNDDOWN(-3.14159,1) = -3.1`.

**Divergence from human language:** an analyst who writes "round up to 1 decimal place" for a result that can be negative almost certainly means toward +∞, or means "in magnitude", but the two differ for negatives and the formula cannot tell you which was meant. OpenFormula uses the unambiguous words: ROUNDDOWN "Rounds the value X **towards zero**", ROUNDUP "Rounds the value X **away from zero**".

#### 1d. MROUND — tie behaviour is **explicitly undefined in Excel**, and the three products disagree

Microsoft's own page carries a "Known Limitations" section:

> "When a decimal value is provided to the Multiple argument, **the rounding direction is undefined for midpoint numbers.** For example MROUND(6.05,0.1) returns 6.0 while MROUND(7.05,0.1) returns 7.1."
> — [MROUND function](https://support.microsoft.com/en-us/office/mround-function-c299c3b0-15a5-426d-aa4b-d2d5b3baf427)

Microsoft also documents `=MROUND(5,-2) → #NUM!` "because -2 and 5 have different signs."

OpenFormula defines ties deterministically and **differently**:

> "In case that two such X exist, **the greater one** is the result." — OpenFormula §6.17.4 MROUND

Google defines ties deterministically and **differently again**:

> "If `value` is equally close to two multiples of `factor`, **the multiple with the greater absolute value** will be returned." — [Google Sheets MROUND](https://support.google.com/docs/answer/3093426)

So for a negative midpoint, OpenFormula says round toward +∞ and Google says round away from zero; these give opposite answers. Excel says nothing is guaranteed.

*Observed:* `MROUND(6.05,0.1)` → Excel **6**, LibreOffice **6.1**. `MROUND(7.05,0.1)` → both 7.1. This is a live, reproducible cross-product disagreement on a real formula.

#### 1e. CEILING / CEILING.MATH / FLOOR.MATH

Microsoft's CEILING page is internally tense. The summary says:

> "Returns number rounded up, away from zero, to the nearest multiple of significance."

but the Remarks say:

> "If number is negative, and significance is negative, the value is rounded down, away from zero. **If number is negative, and significance is positive, the value is rounded up towards zero.**"
> — [CEILING function](https://support.microsoft.com/en-us/office/ceiling-function-0a5cd7c8-0720-4f0a-bd2c-c943e510899f)

Documented examples: `=CEILING(-2.5,-2) → -4`; `=CEILING(-2.5,2) → -2`. So the *sign of the second argument* silently changes the direction of rounding for negatives.

CEILING.MATH and FLOOR.MATH add a `mode` argument that does the same job explicitly:

> "By default, negative numbers with decimal portions are rounded up (toward 0) to the nearest integer. For example, -6.7 is rounded up to -6. Using the significance and mode arguments, you can change the direction of the rounding for negative numbers. For example, rounding -6.3 to a significance of 1 with a mode of 1 will round away from 0, to -7. […] The mode argument does not affect positive numbers."
> — [CEILING.MATH](https://support.microsoft.com/en-us/office/ceiling-math-function-80f95d2f-b499-4eee-9f16-f795a8e306c8)

> "By default, negative numbers with decimal portions are rounded away from 0 to the nearest integer. For example, -6.7 is rounded to -7. By using 0 or a negative number as the Mode argument, you can change the direction of the rounding for negative numbers. For example, rounding -6.3 with a Significance of 1 and a Mode of -1 rounds toward 0, to -6."
> — [FLOOR.MATH](https://support.microsoft.com/en-us/office/floor-math-function-c302b599-fbdb-4177-ba19-2c2b1249a2f5)

Note that CEILING.MATH and FLOOR.MATH have **opposite defaults for negative numbers**.

Also note a documentation defect in Microsoft's own CEILING.MATH page: it describes `significance` as "the number of significant digits after the decimal point to which number is to be rounded", which contradicts the Remarks on the same page ("rounds the number up to the nearest integer that is a multiple of the specified significance") and contradicts the worked examples. A reader taking the argument description at face value would mis-read every CEILING.MATH formula in a workbook.

**Cross-product divergence (observed):** `=CEILING(-2.5,2)` returns **-2** in Excel 16.100.3, but **Err:502 (invalid argument)** in LibreOffice 26.8 — LibreOffice enforces the OpenFormula constraint "Both N and Significance shall be numeric and have the same sign if not 0" (OpenFormula §6.17.1). Google's docs permit it: "When value is negative, factor can be either negative or positive to determine which direction to round" ([Google Sheets CEILING](https://support.google.com/docs/answer/3093471)). Same formula text, three outcomes: a number, an error, and a number.

#### 1f. TRUNC and INT

> "The TRUNC function truncates a number to an integer by removing the fractional part of the number. […] TRUNC and INT are somewhat similar functions in that they both return integers. TRUNC simply removes the fractional part of the number, whereas INT returns the nearest lower integer (not necessarily smaller in magnitude). The difference occurs with negative numbers: TRUNC(-4.3) returns -4, but INT(-4.3) returns -5 because -5 is the lower number."
> — [TRUNC](https://support.microsoft.com/en-us/office/trunc-function-8b86a64c-3127-43db-ba14-aa5ceb292721)

> "INT: Rounds a number down to the nearest integer. […] `=INT(-8.9)` Rounds -8.9 down. Rounding a negative number down rounds it away from 0. → -9"
> — [INT](https://support.microsoft.com/en-us/office/int-function-a6c4af9e-356d-4369-ab6a-cb1fd9d343ef)

TRUNC takes an optional `num_digits` (default 0), so `=TRUNC(x,2)` is truncation to 2 dp, which is *not* rounding at all. INT takes no digits argument. A `=TRUNC(x,2)` in a limits workbook states a genuinely different rule from `=ROUND(x,2)` and the two agree on most values, so a reviewer comparing a handful of printed results may not notice which was used.

#### 1g. FIXED — rounds **and returns text**

> "Rounds a number to the specified number of decimals, formats the number in decimal format using a period and commas, and returns the result as text. […] If decimals is negative, number is rounded to the left of the decimal point. If you omit decimals, it is assumed to be 2. […] The major difference between formatting a cell containing a number by using a command […] and formatting a number directly with the FIXED function is that FIXED converts its result to text. A number formatted with the Cells command is still a number."
> — [FIXED function](https://support.microsoft.com/en-us/office/fixed-function-ffd5723c-324c-45e9-8b96-e41be2a8274a)

The same page states the underlying precision limit: "Numbers in Microsoft Excel can never have more than 15 significant digits, but decimals can be as large as 127."

*Observed:* `=FIXED(2.675,2)` → `2.68` in both Excel and LibreOffice.

---

### 2. The critical distinction: display formatting vs. value-changing formulas vs. the workbook-level "Precision as displayed" switch

There are **three mechanisms** that can produce a rounded-looking number on a page, and they are not distinguishable from the printed output.

#### 2a. Number format changes only what is shown

Microsoft's own statement, under "Before you change the precision of calculations, keep in mind the following important points":

> "**By default, Excel calculates stored, not displayed, values.** The displayed and printed value depends on how you choose to format and display the stored value. For example, a cell that displays a date as '6/22/2008' also contains a serial number that is the stored value for the date in the cell. You can change the display of the date to another format […] but **changing the display of a value on a worksheet does not change the stored value**."

and the worked case that makes the difference visible:

> "When a formula performs calculations, Excel usually uses the values stored in cells referenced by the formula. For example, **if two cells each contain the value 10.005 and the cells are formatted to display values in currency format, the value $10.01 is displayed in each cell. If you add the two cells together, the result is $20.01 because Excel adds the stored values 10.005 and 10.005, not the displayed values.**"
> — [Change formula recalculation, iteration, or precision in Excel](https://support.microsoft.com/en-us/office/change-formula-recalculation-iteration-or-precision-in-excel-73fc7dac-91cf-4d36-86e8-67124f6bcce4)

The "Round a number" article confirms the format route is offered to users as a first-class option, under the heading "**Change the number of decimal places displayed without changing the number**" (Home tab → Increase Decimal / Decrease Decimal, or a built-in number format with a "Decimal places" box).

LibreOffice states the same default: "If the **Precision as shown** option is not marked, the displayed numbers are rounded, but they are calculated internally using the non-rounded number." ([LibreOffice Calc – Calculate options](https://help.libreoffice.org/latest/en-US/text/shared/optionen/01060500.html))

#### 2b. "Set precision as displayed" is a **workbook-level, irreversible, destructive** switch

Microsoft, in the same support article:

> "**Use caution when changing the precision of calculations.** […] When you change the precision of the calculations in a workbook by using the displayed (formatted) values, **Excel permanently changes stored values in cells from full precision (15 digits) to whatever format, including decimal places, is displayed. If you later choose to calculate with full precision, the original underlying values cannot be restored.**"

The UI path documents that it is per-workbook:

> "Select the File tab, select Options, and then select the Advanced category. **In the 'When calculating this workbook' section, select the workbook you want** and then select the 'Set precision as displayed' check box."

The Microsoft Learn floating-point article repeats the warning with the scope spelled out:

> "For example, if you choose a number format that shows two decimal places, and then you turn on the Precision as displayed option, **all accuracy beyond two decimal places is lost when you save your workbook. This option affects the active workbook including all worksheets. You can't undo this option and recover the lost data.** We recommend that you save your workbook before you enable this option."
> — [Floating-point arithmetic may give inaccurate results in Excel](https://learn.microsoft.com/en-us/office/troubleshoot/excel/floating-point-arithmetic-inaccurate-result) (Microsoft Learn, last updated 2026-03-30)

LibreOffice has the analogous per-document option, "Precision as shown": "Specifies whether to make calculations using the rounded values displayed in the sheet."

#### 2c. Consequence for reading a workbook

Three different workbooks can print `98.0` for the same underlying measurement:

1. stored 97.9612…, cell formatted to 1 dp (value unchanged, full precision still feeds downstream formulas);
2. stored `=ROUND(x,1)` = 98.0 exactly (value changed at this cell, downstream sees 98.0);
3. stored 97.9612… but "Set precision as displayed" enabled and the file saved — the stored value **is now** 98.0 and 97.9612… is gone from the file.

A **printed page cannot distinguish these**, and case (3) is not visible anywhere in cell contents — it lives in a workbook-level calculation setting, and the discarded digits are unrecoverable from the file. Cases (1) and (2) are distinguishable by reading the file (formula vs. number-format record), but only if the reader has the file and not a PDF/printout. The workbook option in case (3) is recorded in the file (the OOXML workbook calculation properties), so it *is* readable from the file, but the original values it destroyed are not.

---

### 3. Floating point: Microsoft's documented IEEE-754 behaviour, and the "2.675" folklore

Microsoft's primary article:

> "Microsoft Excel was designed around the **IEEE 754 specification** to determine how it stores and calculates floating-point numbers."

> "In the case of Excel, although Excel can store numbers from 1.79769313486232E308 to 2.2250738585072E-308, it can only do so **within 15 digits of precision.** This limitation is a direct result of strictly following the IEEE 754 specification and isn't a limitation of Excel."

> "Even common decimal fractions, such as decimal 0.0001, can't be represented exactly in binary. (0.0001 is a repeating binary fraction that has a period of 104 bits)."

Microsoft documents the deviations from IEEE 754 too: no denormals, no infinities (`#DIV/0!`), no NaN (`#NUM!` / `#DIV/0!`), no `-0`; and a deliberate near-zero fudge introduced in Excel 97:

> "Excel 97, however, introduced an optimization that attempts to correct for this problem. Should an addition or subtraction operation result in a value at or very close to zero, Excel 97 and later will compensate for any error introduced as a result of converting an operand to and from binary."

*Observed:* `=1.333+1.225-1.333-1.225` returns exactly 0 in Excel 16.100.3, matching the documented behaviour.

Microsoft also documents precision-loss examples: `1.2E+200 + 1E+100` returns `1.2E+200` (and compares TRUE to it); `0.000123456789012345 + 1` returns `1.00012345678901`.

**On the classic "2.675 rounds wrongly" case — the folklore does not hold in Excel or Calc.** In IEEE-754 double precision, 2.675 is stored as slightly less than 2.675, so a strict binary-value rounder (e.g. Python's `round`) yields 2.67. *Observed:* `=ROUND(2.675,2)` returns **2.68** in Excel 16.100.3 and **2.68** in LibreOffice 26.8; `=TEXT(2.675,"0.00")` and `=FIXED(2.675,2)` also give 2.68 in both. Both applications evidently round the decimal value as written rather than the exact binary value. So citing 2.675 as an Excel bug would be wrong.

**The real floating-point divergence is elsewhere, and it goes the *other* way.** *Observed divergences between Excel and LibreOffice on the same formula text:*

| Formula | Excel 16.100.3 | LibreOffice 26.8 |
|---|---|---|
| `=ROUND(2.0049999999999999,2)` | **2.00** | **2.01** |
| `=ROUND(1.4999999999999999,0)` | **1** | **2** |

Excel's documented 15-significant-digit storage rule ("any number exceeding 15 digits is stored and shown with only 15 digits of precision […] Any digits to the right of the 15th digit will be zeros") truncates the 17-digit literal to 1.49999999999999, which rounds down. LibreOffice keeps the full double, whose nearest representable value *is* exactly 1.5, which rounds up by the half-away-from-zero rule. Both are "correct" by their own documentation; they disagree on the answer.

The general fact that matters for migration: `ROUND` applied to a *computed* value operates on the binary result of the computation, not on the decimal the analyst had in mind. A value that "should" be exactly at the boundary may be stored infinitesimally above or below it, and which way it falls depends on the arithmetic path that produced it. The formula text records the rounding step but not the arithmetic history that determines whether a boundary case tips.

---

### 4. Significant figures

**Excel has no native significant-figures rounding function.** Microsoft's "Round a number" article has a section headed "Round a number to a significant digit" and its content is entirely a recipe built from the existing functions:

> "The examples in this section use the ROUND, ROUNDUP, and ROUNDDOWN functions. […] As a general rule, when you round a number that has no fractional part (a whole number), you subtract the length from the number of significant digits to which you want to round. For example, to round 2345678 down to 3 significant digits, you use the ROUNDDOWN function with the parameter -4, as follows: `= ROUNDDOWN(2345678,-4)`. This rounds the number down to 2340000, with the '234' portion as the significant digits."

The `LOG10` idiom — `=ROUND(x, sigfigs-1-INT(LOG10(ABS(x))))` — is **not** in Microsoft's documentation. I found no Microsoft page documenting it; it is a widely used community construction. It does work: *observed*, `=ROUND(1234.5678, 3-1-INT(LOG10(ABS(1234.5678))))` returns **1230** in both Excel 16.100.3 and LibreOffice 26.8, and `=ROUND(0.0012345, 3-1-INT(LOG10(ABS(0.0012345))))` returns **0.00123** in both.

Its properties, as observed:

- **Zero breaks it.** `LOG10(ABS(0))` is an error; the whole expression returns an error (`Err:502` in LibreOffice; `#NUM!` in Excel).
- **Carry silently changes the significant-figure count.** `=ROUND(99.5, 2-1-INT(LOG10(ABS(99.5))))` returns **100** — three digits for a two-significant-figure request. `=ROUND(9.99, 2-1-INT(LOG10(ABS(9.99))))` returns **10**.
- **The result is a number, so trailing zeros are not carried.** `=ROUND(0.09999, 2-1-INT(LOG10(ABS(0.09999))))` returns **0.1**, not `0.10`. Significant-figure notation is a property of the *string*, and this idiom produces a *number*. Whether the stored 1230 means 3 or 4 significant figures is not recoverable from the value.

**Is the intent recoverable by reading the formula?** Partially. In the LOG10 idiom the `sigfigs` constant appears literally in the formula text (`3-1-INT(...)`), so a reader who recognises the pattern can read "3 significant figures" straight off. But the pattern is only recognisable if it is written in that canonical shape; the same rule can be written as `ROUND(x,2-INT(LOG10(ABS(x))))`, or with the digit count in a referenced cell, or via `TEXT(x,"0.00E+00")`, or — as Microsoft's own article does — as a hard-coded negative constant like `ROUNDDOWN(2345678,-4)`, in which case "3 significant figures" is nowhere in the file. A constant `-4` is recoverable as "round to the nearest 10,000"; it is **not** recoverable as "3 significant figures" without knowing the magnitude the rule was designed for.

---

### 5. TEXT() and number-format strings

TEXT applies rounding as a side effect of formatting and returns text. Microsoft's page notes it in passing in an example row rather than in a Remarks section:

> "`=TEXT(1234.567,"$#,##0.00")` — Currency with a thousands separator and 2 decimals, like $1,234.57. **Note that Excel rounds the value to 2 decimal places.**"
> — [TEXT function](https://support.microsoft.com/en-us/office/text-function-20d5ac4d-7b94-49fd-bb38-93d29371225c)

The page also flags the format/function equivalence: "Although you can use the TEXT function to change formatting, it's not the only way. You can change the format without a formula by pressing CTRL+1."

Microsoft's documentation does **not** state the tie-breaking rule TEXT uses. *Observed (Excel 16.100.3 and LibreOffice 26.8, identical results):* `TEXT(2.5,"0")`→`3`, `TEXT(1.5,"0")`→`2`, `TEXT(0.5,"0")`→`1`, `TEXT(2.675,"0.00")`→`2.68`, `TEXT(-2.675,"0.00")`→`-2.68`, `TEXT(1.005,"0.00")`→`1.01`, `TEXT(0.145,"0.00")`→`0.15`. Consistent with half-away-from-zero, i.e. the same rule as ROUND — but this is observation, not documentation.

**The migration-relevant point:** a `=TEXT(x,"0.00")` cell produces a *string* that looks like a rounded number, does not participate in arithmetic as 2 dp, and is not a ROUND formula. The same is true of the *cell number format* `0.00`, which is not a formula at all. So the rule "report to 2 decimal places" may be encoded in any of: a `ROUND` formula, a `FIXED` formula, a `TEXT` formula, a cell number format, or a workbook-level precision switch — five different artefacts, four different storage locations in the file, and only two of them are formulas.

---

### 6. Documented / observed divergences between Excel, Google Sheets and LibreOffice Calc

Summary of what is established above:

| Behaviour | Excel | Google Sheets | LibreOffice Calc / OpenFormula |
|---|---|---|---|
| ROUND tie | half away from zero (documented indirectly, in "Round a number") | half away from zero, **stated explicitly** in the ROUND page | half away from zero, **normative** in OpenFormula §6.17.5 |
| MROUND tie | "**undefined for midpoint numbers**" (Microsoft's own Known Limitations) | "the multiple with the **greater absolute value**" | "the **greater** one" (toward +∞), OpenFormula §6.17.4 |
| `MROUND(6.05,0.1)` | **6** (per Microsoft, and observed) | not tested | **6.1** (observed) |
| `CEILING(negative, positive significance)` | allowed; rounds toward zero (`CEILING(-2.5,2) = -2`) | allowed; "factor can be either negative or positive to determine which direction to round" | **error** — OpenFormula requires same sign; observed `Err:502` |
| 17-digit literal at a tie (`ROUND(1.4999999999999999,0)`) | **1** (15-digit storage truncation) | not tested | **2** (observed) |
| Display-vs-stored default | stored values used; "Set precision as displayed" per workbook, irreversible | Google's docs do not describe an equivalent workbook precision switch; I found none | "Precision as shown", per document |
| CEILING.MATH / FLOOR.MATH `mode` | documented, opposite defaults for negatives | — (Sheets has CEILING.MATH/FLOOR.MATH; I did not verify its docs) | present under the `COM.MICROSOFT.` namespace in ODF files; observed to match Excel for the cases tested |

I could not test Google Sheets empirically (no scriptable local instance), so every Google row above is documentation-only.

Note also, as a correction to common folklore: `=INT((0.1+0.7)*10)` returns **8** in Excel 16.100.3 and **8** in LibreOffice 26.8. The widely repeated claim that Excel returns 7 here did not reproduce in the current version.

---

### 7. Published evidence that rounding / formula errors in laboratory spreadsheets are an observed problem

**Directly on rounding — PIC/S.** PI 041-1 names rounding explicitly as an ALCOA+ "Consistent" attribute:

> "Information should be created, processed, and stored in a logical manner that has a defined consistency. This includes policies or procedures that help control or standardize data (e.g. chronological sequencing, date formats, units of measurement, **approaches to rounding, significant digits**, etc.)."
> — PIC/S PI 041-1, 1 July 2021, §Data Governance / ALCOA+ table

**FDA data-integrity guidance (final, December 2018)** does **not** mention rounding. It mentions spreadsheets once, and only to classify them as *dynamic* records:

> "For the purposes of this guidance, static is used to indicate a fixed-data record such as a paper record or an electronic image, and dynamic means that the record format allows interaction between the user and the record content. […] It also may allow the user **to modify formulas or entries in a spreadsheet used to compute test results** or other information such as calculated yield."

and it makes the intended-use validation point that bears on spreadsheet calculations:

> "If you validate the computer system but you do not validate it for its intended use, you cannot know if your workflow runs correctly. […] validating the workflow ensures that the intended steps, requirements, and calculations in the MPCR are accurate and perform properly."
> — FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*, Guidance for Industry, December 2018

**FDA's own laboratory manual** is the most directly on-point FDA source. ORA Lab Manual Vol. III Section 4 (MAN-000048 Rev 03, 07 Oct 2022) contains both a rounding rule and a spreadsheet-control section:

> "1. If the extra digit is less than 5, drop the digit. 2. **If the extra digit is greater than or equal to 5, drop it and increase the previous digit by one.**"

> "When using spreadsheets or programmable calculators for reduction of data generated by sample analyses, there should be assurance that the results are valid and usable for regulatory use. […] Spreadsheets developed in the ORS laboratory should be looked upon as **in-house developed software that are qualified before use**, just as instruments are qualified before use."

> "G. **Keep a permanent record of all cell formulas when the spreadsheet is first developed.** Document all changes made later to the spreadsheet (after it has been in use) and control using a system of revision numbers with documentation. H. Periodically re-validate spreadsheets. This should include **verification of cell formulas**, a manual reverification of spreadsheet calculations, and confirmation locked cells are still protected from change."
> — [FDA ORA Lab Manual Vol. III Section 4](https://www.fda.gov/media/73535/download)

**FDA warning letters — spreadsheets yes, rounding no (as far as I found).** Two current examples on fda.gov:

> "B. You stored your master batch records as **unlocked Excel files which were open to alteration, duplication, and deletion by unauthorized personnel.** C. Your analysts used open Excel files for documenting sample preparation information and final calculations. These records were not retained."
> — [Chemland Co., Ltd., WL 593158, 11 Feb 2020](https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/chemland-co-ltd-593158-02112020)

> "In addition, your analysts used **individualized non-validated (b)(4) spreadsheets to calculate assay, impurity, content uniformity, and dissolution test results** for a variety of drug products."
> — [Missouri Analytical Laboratories Inc, WL 615319, 30 Sep 2021](https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/missouri-analytical-laboratories-inc-615319-09302021)

Neither cites a rounding error. **I did not find an FDA warning letter that cites rounding specifically**, and I searched the fda.gov warning-letter corpus for it. The documented enforcement concern is *uncontrolled and unvalidated spreadsheet calculation*, of which rounding is one instance but not a named one. I am reporting this as thin evidence rather than dressing it up.

**Standards divergence, which is the sharper published point.** ASTM E29 specifies **round-half-to-even**, and says in a note that software does not follow it:

> "6.4.3 When the digit next beyond the last place to be retained is 5, and there are no digits beyond this 5, or only zeros, **increase by 1 the digit in the last place retained if it is odd, leave the digit unchanged if it is even.** […] 6.4.4 […] If two choices are possible, as when the digits dropped are exactly a 5 or a 5 followed only by zeros, **choose that ending in an even digit.**"
> "**NOTE 1—This method for rounding 5's is not universally used by software packages.**"
> — ASTM E29-13 §6.4 (superseded edition; current designation is E29-22, which I could not access)

USP General Notices specifies **round-half-up**, and is therefore consistent with Excel's ROUND for positive values:

> "The observed or calculated values shall be rounded off to the number of decimal places that is in agreement with the limit expression. **Numbers should not be rounded until the final calculations for the reportable value have been completed.** Intermediate calculations (e.g., slope for linearity) may be rounded for reporting purposes, but the original (not rounded) value should be used for any additional required calculations. **Acceptance criteria are fixed numbers and are not rounded.** When rounding is required, consider only one digit in the decimal place to the right of the last place in the limit expression. If this digit is smaller than 5, it is eliminated and the preceding digit is unchanged. **If this digit is equal to or greater than 5, it is eliminated and the preceding digit is increased by 1.**"
> — [USP General Notices 7.20, Revision Bulletin official 1 April 2015](https://www.uspnf.com/sites/default/files/usp_pdf/EN/USPNF/revisions/gn-rb.pdf)

So a laboratory whose methods cite ASTM E29 and whose workbook uses `=ROUND(...)` has a *documented* mismatch at exact half-way values; a laboratory citing USP 7.20 does not, for positive results. The formula alone does not record which standard the author believed they were implementing.

**Peer-reviewed / practitioner research on spreadsheet error rates.** Raymond Panko's survey of field audits reports a mean cell error rate around 5% and that a large majority of audited operational spreadsheets contained at least one error ([Panko, "What We Know About Spreadsheet Errors"](http://panko.shidler.hawaii.edu/SSR/Mypapers/whatknow.htm); see also [Panko, "What We Don't Know About Spreadsheet Errors Today", arXiv:1602.02601](https://arxiv.org/pdf/1602.02601), which is the author's own restatement and critique of the earlier figures). This is **secondary** to the rounding question — the studies concern formula errors generally, not rounding rules specifically, and the methodology of the audit corpus has been debated within EuSpRIG itself, which is part of what the 2016 paper addresses.

**GAMP.** The ISPE *GAMP Good Practice Guide: A Risk-Based Approach to GxP Compliant Laboratory Computerized Systems (Second Edition)* is the GAMP document that covers laboratory spreadsheets ([ISPE catalogue entry](https://ispe.org/publications/guidance-documents/gamp-good-practice-guide-gxp-compliant-laboratory-computerized-systems)). It is paywalled and I could not read its text, so **I make no claim about what it says on rounding.**

---

## What I could not establish

- **Excel's documented tie rule for TEXT, FIXED, and the ROUND family under a negative `num_digits` at a tie.** Microsoft documents the digit semantics but never states the tie rule on the function pages themselves. My half-away-from-zero findings for TEXT and FIXED are observation on one Excel build, not documentation, and could in principle differ on another platform or build.
- **Google Sheets behaviour empirically.** Everything in the Google column is documentation-only. In particular I could not check whether Sheets reproduces Excel's 15-significant-digit literal truncation, which is the mechanism behind the sharpest divergence I found.
- **Whether Google Sheets has any workbook-level "precision as displayed" equivalent.** I found none in Google's documentation, but absence from search is not proof of absence.
- **Current ASTM E29-22 text.** The half-even clause and the "not universally used by software packages" note are quoted from the superseded E29-13. I could not verify they survive verbatim into E29-22; ASTM's site blocked automated access and the standard is paywalled.
- **Current USP–NF 2026 General Notices 7.20.** Quoted from the 2015 Revision Bulletin; the live subscription text was not accessible to confirm it is unchanged.
- **Whether any FDA warning letter or 483 cites a rounding rule error specifically.** My searching found spreadsheet-control and non-validated-calculation citations but no rounding-specific one. This is a negative result from a non-exhaustive search of a database that is not fully full-text searchable by my tools; a rounding citation may exist.
- **What the GAMP GPG on laboratory computerized systems says about spreadsheet rounding.** Paywalled, unread.
- **Whether OOXML/ODF file formats record enough to reconstruct case (3) above.** The "precision as displayed" flag is stored in the workbook, so the *fact* is recoverable from the file; the *values it destroyed* are not, by Microsoft's own statement. I did not verify the exact OOXML element name against the ECMA-376 / MS-XLSX specification.
- **The single most important thing a formula cannot tell you:** whether the author of `=ROUND(x,2)` intended "half away from zero" (what they got) or "half to even" (what ASTM E29 specifies) or simply "two decimal places, tie behaviour never considered". Nothing in the file distinguishes an author who chose the tie rule from one who never thought about it. That is a limit of the artefact, not of my searching.

---

## Sources

**Primary — vendor documentation**

- Microsoft, [ROUND function](https://support.microsoft.com/en-us/office/round-function-c018c5d8-40fb-4053-90b1-b3e7f61a213c) — Applies To: Excel for Microsoft 365, Excel 2024, Excel 2021. Fetched 2026-09-11.
- Microsoft, [ROUNDUP function](https://support.microsoft.com/en-us/office/roundup-function-f8bc9b23-e795-47db-8703-db171d0c42a7) — fetched 2026-09-11.
- Microsoft, [ROUNDDOWN function](https://support.microsoft.com/en-us/office/rounddown-function-2ec94c73-241f-4b01-8c6f-17e6d7968f53) — fetched 2026-09-11.
- Microsoft, [MROUND function](https://support.microsoft.com/en-us/office/mround-function-c299c3b0-15a5-426d-aa4b-d2d5b3baf427) — fetched 2026-09-11 (contains the "Known Limitations" midpoint statement).
- Microsoft, [CEILING function](https://support.microsoft.com/en-us/office/ceiling-function-0a5cd7c8-0720-4f0a-bd2c-c943e510899f) — fetched 2026-09-11.
- Microsoft, [CEILING.MATH function](https://support.microsoft.com/en-us/office/ceiling-math-function-80f95d2f-b499-4eee-9f16-f795a8e306c8) — fetched 2026-09-11.
- Microsoft, [FLOOR.MATH function](https://support.microsoft.com/en-us/office/floor-math-function-c302b599-fbdb-4177-ba19-2c2b1249a2f5) — fetched 2026-09-11.
- Microsoft, [TRUNC function](https://support.microsoft.com/en-us/office/trunc-function-8b86a64c-3127-43db-ba14-aa5ceb292721) — fetched 2026-09-11.
- Microsoft, [INT function](https://support.microsoft.com/en-us/office/int-function-a6c4af9e-356d-4369-ab6a-cb1fd9d343ef) — fetched 2026-09-11.
- Microsoft, [FIXED function](https://support.microsoft.com/en-us/office/fixed-function-ffd5723c-324c-45e9-8b96-e41be2a8274a) — fetched 2026-09-11.
- Microsoft, [TEXT function](https://support.microsoft.com/en-us/office/text-function-20d5ac4d-7b94-49fd-bb38-93d29371225c) — fetched 2026-09-11.
- Microsoft, [Round a number](https://support.microsoft.com/en-us/office/round-a-number-f82b440b-689d-4221-b21e-38da99d33435) — Applies To: Excel for Microsoft 365, Excel 2024, Excel 2021. Fetched 2026-09-11. Contains the tie rule and the negative-number rule.
- Microsoft, [Change formula recalculation, iteration, or precision in Excel](https://support.microsoft.com/en-us/office/change-formula-recalculation-iteration-or-precision-in-excel-73fc7dac-91cf-4d36-86e8-67124f6bcce4) — Applies To: Excel for Microsoft 365, Excel 2024, Excel 2021. Fetched 2026-09-11. Source for stored-vs-displayed and "Set precision as displayed".
- Microsoft Learn, [Floating-point arithmetic may give inaccurate results in Excel](https://learn.microsoft.com/en-us/office/troubleshoot/excel/floating-point-arithmetic-inaccurate-result) — page states "Last updated on 2026-03-30". Applies to Excel for Microsoft 365, Excel for Mac, Excel 2024/2021/2016.
- Google, [ROUND function](https://support.google.com/docs/answer/3093440) — Google Docs Editors Help, fetched 2026-09-11 (unversioned).
- Google, [MROUND function](https://support.google.com/docs/answer/3093426) — fetched 2026-09-11.
- Google, [CEILING function](https://support.google.com/docs/answer/3093471) — fetched 2026-09-11.
- Google, [FLOOR function](https://support.google.com/docs/answer/3093487) — fetched 2026-09-11.
- The Document Foundation, [LibreOffice Calc — Calculate options ("Precision as shown")](https://help.libreoffice.org/latest/en-US/text/shared/optionen/01060500.html) — help set identifies itself as LibreOffice 26.8 Help. Fetched 2026-09-11.

**Primary — format standard**

- OASIS, [OpenDocument Format v1.3, Part 4: Recalculated Formula (OpenFormula) Format — OASIS Standard](https://docs.oasis-open.org/office/OpenDocument/v1.3/os/part4-formula/OpenDocument-v1.3-os-part4-formula.html) — §6.17 Rounding Functions (CEILING §6.17.1, INT §6.17.2, FLOOR §6.17.3, MROUND §6.17.4, ROUND §6.17.5, ROUNDDOWN §6.17.6, ROUNDUP §6.17.7, TRUNC §6.17.8). Current OASIS Standard version (v1.3 OS).

**Primary — regulatory**

- FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers — Guidance for Industry*, **December 2018 (final)**, https://www.fda.gov/media/119267/download — cover page verified to read "December 2018"; not the earlier draft.
- FDA ORA, *ORA Lab Manual Vol. III Section 4 — Basic Statistics and Data Presentation (III-04)*, document MAN-000048, **Revision 03, revised 07 Oct 2022**, https://www.fda.gov/media/73535/download
- PIC/S, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, **PI 041-1, 1 July 2021** — confirmed still listed as current on the PIC/S publications index on 2026-09-11. https://picscheme.org/
- FDA Warning Letter, Chemland Co., Ltd., 593158, 11 Feb 2020 — https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/chemland-co-ltd-593158-02112020
- FDA Warning Letter, Missouri Analytical Laboratories Inc, 615319, 30 Sep 2021 — https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/missouri-analytical-laboratories-inc-615319-09302021
- USP, General Notices 7.20 *Rounding Rules*, **Revision Bulletin official 1 April 2015** — https://www.uspnf.com/sites/default/files/usp_pdf/EN/USPNF/revisions/gn-rb.pdf — current USP–NF 2026 text not verified.
- ASTM E29 §6.4, *Standard Practice for Using Significant Digits in Test Data to Determine Conformance with Specifications* — text quoted from **E29-13 (superseded)**; **current designation E29-22**, paywalled and not read. Catalogue entry: https://store.astm.org/e0029-22.html

**Empirical observation (this machine, 2026-09-11) — not documentation**

- Microsoft Excel for Mac, version string reported by the application as **16.100.3**; formulas evaluated via AppleScript in a scratch workbook that was closed without saving.
- LibreOffice 26.8 (`/Applications/LibreOffice.app`), headless conversion of a generated flat-ODS file to CSV.
- Working files under the session scratchpad; nothing written to the repository outside `docs/research/`.

**Secondary**

- R. Panko, ["What We Know About Spreadsheet Errors"](http://panko.shidler.hawaii.edu/SSR/Mypapers/whatknow.htm) — author's own research summary page.
- R. Panko, ["What We Don't Know About Spreadsheet Errors Today: The Facts, Why We Don't Believe Them, and What We Need to Do"](https://arxiv.org/pdf/1602.02601), arXiv:1602.02601 (EuSpRIG 2015) — the author's re-examination of the above figures.
- ISPE, [GAMP Good Practice Guide: A Risk-Based Approach to GxP Compliant Laboratory Computerized Systems, 2nd Edition](https://ispe.org/publications/guidance-documents/gamp-good-practice-guide-gxp-compliant-laboratory-computerized-systems) — catalogue entry only; text paywalled and unread.
