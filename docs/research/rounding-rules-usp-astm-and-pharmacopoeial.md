# What do the authoritative published sources actually say about rounding numerical results for comparison against a specification limit?

**Asked by:** the orchestrator (Benchline wayfinder map — acceptance-limit rounding rule vocabulary)
**Date:** 2026-09-11
**Status of sources:** Mixed, and the mix matters. See the READ / QUOTED-SECONDHAND / PAYWALLED table below before using any quotation in this document.

## Provenance of every source used

| Source | Version I actually checked | How I got it | Confidence |
|---|---|---|---|
| USP General Notices 7. Test Results (7.10, 7.10.10, 7.20) | **USP 32–NF 27**, page footer reads "© 2009 USPC Official 8/1/09 – 11/30/09" | Verbatim PDF **read in full**, but served from a third-party host (jira.hl7.org attachment) of a USP-generated print-out | Text READ verbatim; **edition is 2009, not current** |
| USP-NF current General Notices | USP-NF Online, current | **PAYWALLED — confirmed**. `uspnf.com` returns HTTP 403 to every request; `doi.usp.org` serves only "This is a preview of USP-NF/PF content. Subscriber? Access here!" | Could not read |
| ASTM E29 — scope clause 1.3 | **E29-22, "Standard — Active — Last Updated: Apr 22, 2022"** | Read on ASTM's own product page, store.astm.org | READ verbatim (scope only) |
| ASTM E29 — sections 4, 5, 6, 7 full text | **E29-13** (superseded) | Verbatim PDF read in full, third-party host (galvanizeit.com, IHS-licensed copy) | Text READ verbatim; **edition superseded** |
| Ph. Eur. General Notices 1.1, "Limits" | **Ph. Eur. 8.0** (01/2013:10000) | Verbatim PDF read in full, third-party mirror | Text READ verbatim; **edition superseded (current is 11th Ed.)** |
| Ph. Eur. rounding rule, present-day statement | EDQM FAQ, undated | **Read directly from EDQM's own site** (faq.edqm.eu) | READ verbatim, primary, but is an FAQ not the chapter |
| 21 CFR Part 211 | eCFR, **latest issue date 2026-09-08, up to date as of 2026-09-09** | Full XML pulled from the eCFR versioner API and grepped | READ in full, primary, current |
| FDA OOS guidance | **Revision 1, May 2022** | fda.gov/media/158416/download, full text | READ in full, primary, current |
| FDA data-integrity guidance | **December 2018 final** | fda.gov/media/119267/download, full text | READ in full, primary, current (this is the final, not the superseded draft) |
| ICH Q3A(R2) | Step 4, Attachment 2 **revised 25 October 2006** | database.ich.org, full text | READ in full, primary |
| Ph. Eur. 2.6.12 | **Ph. Eur. 10.0** text | PDF read in full, third-party host (ehpm.org) | READ verbatim; edition one behind current |
| ILAC-G8 | **ILAC-G8:09/2019**, listed as current on ilac.org's own guidance index with no supersession note | ilac.org guidance series index | Currency READ from ILAC; document body not quoted here |
| ISO/IEC 17025:2017 §7.8.6 | — | **PAYWALLED at iso.org.** Not quoted. | Not read |

## Findings

### 1. USP General Notices 7.20 "Rounding Rules"

Text below is READ verbatim from the USP 32 (2009) General Notices PDF. I could **not** obtain the current USP-NF text; treat the *currency* of this wording as unverified.

> **7.20. Rounding Rules**
> The observed or calculated values shall be rounded off to the number of decimal places that is in agreement with the limit expression. Numbers should not be rounded until the final calculations for the reportable value have been completed. Intermediate calculations (e.g., slope for linearity) may be rounded for reporting purposes, but the original (not rounded) value should be used for any additional required calculations. Acceptance criteria are fixed numbers and are not rounded.
>
> When rounding is required, consider only one digit in the decimal place to the right of the last place in the limit expression. If this digit is smaller than 5, it is eliminated and the preceding digit is unchanged. If this digit is equal to or greater than 5, it is eliminated and the preceding digit is increased by 1.

And the neighbouring 7.10, READ verbatim from the same PDF:

> **7.10. Interpretation of Requirements**
> Analytical results observed in the laboratory (or calculated from experimental measurements) are compared with stated acceptance criteria to determine whether the article conforms to compendial requirements.
> The reportable value, which often is a summary value for several individual determinations, is compared with the acceptance criteria. The reportable value is the end result of a completed measurement procedure, as documented.
> Where acceptance criteria are expressed numerically herein through specification of an upper and/or lower limit, permitted values include the specified values themselves, but no values outside the limit(s). Acceptance criteria are considered significant to the last digit shown.

Answering the specific sub-questions:

- **Rounded to the same decimal places as the limit, then compared** — yes, explicitly: "rounded off to the number of decimal places that is in agreement with the limit expression", and 7.10 says the **reportable value** is what is compared.
- **Round only once / no intermediate rounding** — yes: "Numbers should not be rounded until the final calculations for the reportable value have been completed", and intermediate roundings are "for reporting purposes" only, with "the original (not rounded) value" carried into further calculation. The "consider only one digit ... to the right of the last place in the limit expression" sentence is itself an anti-double-rounding device.
- **Tie-breaking** — **half-up**, not half-even: "If this digit is equal to or greater than 5, it is eliminated and the preceding digit is increased by 1." The worked table in the same section confirms it: limit 98.0 % with unrounded 97.95 % → 98.0 % → Conforms; limit test 3 ppm with 2.5 ppm → 3 ppm → Conforms.
- **Decimal places or significant figures?** — 7.20 is written in terms of **decimal places** ("the number of decimal places that is in agreement with the limit expression"). 7.10 separately states acceptance criteria "are considered significant to the last digit shown", which is a significance statement about the limit, not a sig-fig rounding instruction for the result. USP's "3 ppm" row is handled as zero decimal places, not as one significant figure.
- **Limits are inclusive and are never themselves rounded** — 7.10: "permitted values include the specified values themselves, but no values outside the limit(s)"; 7.20: "Acceptance criteria are fixed numbers and are not rounded."

**Paywall finding (this is itself a result):** the current USP-NF General Notices is **not publicly retrievable**. `www.uspnf.com` returned HTTP 403 "Access Denied" for the General Notices landing page and for every archival General Notices PDF it indexes. `doi.usp.org/USPNF/USPNF_M99989_90201_01.html` returns a stub reading "This is a preview of USP-NF/PF content. Subscriber? Access here! Not a subscriber? Learn more!" — the body is a Pharmacopeial Forum briefing, not the official chapter. That briefing does disclose that a General Notices revision proposal was "based on the version of the General Notices and Requirements official as of December 1, 2022," and lists changes to sections 3.10 and a new 5.15 — it does **not** list section 7 among the changed sections, but that is one proposal in one cycle and is not evidence that 7.20 is unchanged since 2009.

**Secondary-sourced only:** that "7.20 Rounding Rules" is still the current section number, and that the 2009 wording above is still the current wording, rests on search-result quotations from non-USP sites (Pharmaceutical Technology, ECA Academy, blog SOPs) that reproduce this wording. **I did not verify either against a current USP document.**

### 2. ASTM E29

**Currency, READ from ASTM's own store page** (https://store.astm.org/e0029-22.html): the active edition is **ASTM E29-22**, "Standard — Active — Last Updated: Apr 22, 2022", superseding E29-13(2019), E29-13, E29-08 and earlier. Price USD 72 — the full standard is **paywalled**.

The scope, READ verbatim on that ASTM page and therefore current:

> 1.3 Reference to this practice is valid only when a choice of method has been indicated, that is, either absolute method or rounding method.

The clause-level text below was READ verbatim from an **E29-13** PDF. The 2013 and 2022 scopes are word-for-word identical in 1.1–1.5, which is weak evidence the substance is stable, but I could **not** verify sections 4–7 against E29-22.

- **No default. The specification must declare the method.** §4.1: "In the applications of this practice to a specific material or materials it is essential to specify which method is intended to apply. In the absence of such specification, reference to this practice, which expresses **no preference** as to which method should apply, would be **meaningless**. The choice of method depends upon the current practice of the particular branch of industry or technology concerned, and should therefore be specified in the prime publication." §4.1.1 adds that "The unqualified statement of a numerical limit, such as '2.50 in. max,' cannot, in view of different established practices and customs, be regarded as carrying a definite operational meaning concerning the number of digits to be retained."
- **Absolute method** (§5.1–5.2): applies "where it is the intent that all digits in an observed value or a calculated value are to be considered significant"; "an observed value or a calculated value is **not to be rounded**, but is to be compared directly with the specified limiting value." §4.1.2: "any deviation, however small, outside the specification limit signifies nonconformance."
- **Rounding method** (§6.1–6.2): "the test result is rounded ... to the nearest unit in the designated place of figures stated in the standard, as, for example, 'to the nearest kPa,' 'to the nearest 10 ohms,' 'to the nearest 0.1 percent,' etc. The rounded value should then be compared with the specified limit."
- **E29 supplies boilerplate sentences** (§5.3, §6.3) that a specification is meant to embed verbatim to declare which method governs — for all limits, for a class of limits, or per-table.
- **Tie-breaking is round-half-to-even, not half-up** (§6.4.3): "When the digit next beyond the last place to be retained is 5, and there are no digits beyond this 5, or only zeros, increase by 1 the digit in the last place retained if it is odd, leave the digit unchanged if it is even. Increase by 1 the digit in the last place retained, if there are non-zero digits beyond this 5." E29 adds **NOTE 1—"This method for rounding 5's is not universally used by software packages."**
- **Round once** (§6.5): "The rounded value should be obtained in one step by direct rounding of the most precise value available and not in two or more successive roundings."
- **Rounding to a nearest multiple that is not a power of ten** (§6.6, §6.7): "Special Case, Rounding to the Nearest 50, 5, 0.5, 0.05, etc." — double, round to nearest 100/10/1.0/0.10, halve. §6.7 generalises: "there may be a requirement to round a value to an interval that does not align with the specific requirements in 6.4 or 6.6, such as to the nearest 0.02, 0.25, 0.3" — divide by the interval, round to nearest whole number, multiply back.
- **Reporting precision is derived from the measurement's precision, separately from conformance precision** (§7.4): "The rounding interval for test results should not be greater than 0.5 σ nor less than 0.05 σ, but not greater than the unit in the specification (see 6.2)", where σ is the repeatability standard deviation.

### 3. Ph. Eur. General Notices 1.1 — "Limits"

READ verbatim from the **Ph. Eur. 8.0** General Notices (01/2013:10000), section 1.1 General statements, under the heading **Limits**:

> Limits. The limits prescribed are based on data obtained in normal analytical practice ; they take account of normal analytical errors, of acceptable variations in manufacture and compounding and of deterioration to an extent considered acceptable. **No further tolerances are to be applied to the limits prescribed** to determine whether the article being examined complies with the requirements of the monograph.
> **In determining compliance with a numerical limit, the calculated result of a test or assay is first rounded to the number of significant figures stated, unless otherwise prescribed.** The limits, regardless of whether the values are expressed as percentages or as absolute values, are considered significant to the last digit shown (for example 140 indicates 3 significant figures). **The last figure of the result is increased by one when the part rejected is equal to or exceeds one half-unit, whereas it is not modified when the part rejected is less than a half-unit.**

Present-day confirmation, READ verbatim from **EDQM's own FAQ site**, faq.edqm.eu, "Am I allowed to round off measurements?":

> In determining compliance with a numerical limit, the calculated result of a test or assay is first rounded off to the number of significant figures stated, unless otherwise prescribed. The limits, regardless of whether the values are expressed as percentages or as absolute values, are considered significant to the last digit shown (for example, 0.15 indicates 2 significant figures and 140 indicates 3 significant figures). When rounding, only the digit immediately to the right of the last place in the limit is to be considered. If this digit is smaller than 5, it is eliminated and the preceding digit is not changed. If this digit is equal to or greater than 5, it is eliminated and the preceding digit is increased by 1.
> For example: 0.145 rounded to 2 significant figures is 0.15 / 0.284 rounded to 2 significant figures is 0.28

**How Ph. Eur. differs from USP:**

- Ph. Eur. expresses the target precision in **significant figures**; USP 7.20 expresses it in **decimal places**. This is the clearest divergence between the two, and it is a divergence in the *unit of the rule*, not merely in wording.
- Both **round the result before comparing** — Ph. Eur. is explicit ("the calculated result ... is **first** rounded"). Neither compares the unrounded value. Neither rounds the limit.
- Both use **half-up**, not half-even, and so both differ from ASTM E29 §6.4.3.
- The Ph. Eur. 8.0 phrasing is remainder-based ("the part rejected is equal to or exceeds one half-unit"); the EDQM FAQ phrasing is single-digit-based, matching USP's mechanism. For ordinary decimal data the two mechanisms give the same answer; I note the difference because it is a difference in how the rule is *stated*, and because the FAQ wording suggests the chapter was reworded at some point after 8.0.
- Ph. Eur. adds a clause USP does not: "No further tolerances are to be applied to the limits prescribed."

**Not established:** the exact current wording and section numbering in Ph. Eur. 11th Edition. EDQM's own page announcing the revised General Notices chapter (`edqm.eu/en/-/adoption-of-the-revised-general-notices-chapter`) returned HTTP 403, as did the EDQM-hosted General Notices webinar PDF. The Ph. Eur. itself is a paid publication.

### 4. 21 CFR Part 211 and FDA guidance

**21 CFR Part 211 — complete current text pulled from the eCFR versioner API** (title 21, chapter I, subchapter C, part 211; eCFR reports title 21 `latest_issue_date` 2026-09-08, `up_to_date_as_of` 2026-09-09), converted to plain text (~79,000 characters) and grepped:

| Term | Occurrences in 21 CFR Part 211 |
|---|---|
| `round` / `rounding` / `Round` (any case, word-initial) | **1**, and it is not about numbers — §211.132(b)(1) example labelling, "this bottle has an imprinted seal **around** the neck" |
| `significant figure` | **0** |
| `significant digit` | **0** |
| `decimal` | **0** |
| `precision of` | **0** |

**Finding: 21 CFR Part 211 contains no rounding clause, no significant-figures clause, and no decimal-places clause of any kind.** The CGMP regulation does not prescribe how a result is rounded before comparison with a specification.

**FDA, "Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production," Revision 1, May 2022** — full text searched. Occurrences of `round`/`rounding`/`rounded` as words: **0**. `significant figures`: 0. `decimal place`: 0. The guidance does deal at length with what value gets compared (Section IV.C.1, "Averaging"), including "Reliance on averaging has the disadvantage of hiding variability among individual test values" — but it says nothing about rounding.

**FDA, "Data Integrity and Compliance With Drug CGMP: Questions and Answers," December 2018 final** (the current final document, not the 2016 draft) — full text searched. Occurrences of `round`/`rounding`/`rounded`: **0**. `significant figures`: 0. The only hit for `precision` is a cross-reference: "requirements for precision are satisfied (see USP General Chapter <621> Chromatography)."

So: **both current FDA guidances are silent on rounding.** The FDA position on rounding, to the extent one exists in these documents, is a reference outward to USP.

### 5. Rules that a closed `(decimals | significant figures) + tie-break mode` vocabulary cannot express

Each item below is grounded in text I read; the classification as "not expressible" is a factual observation about the shape of the rule, not a recommendation.

1. **ASTM E29's absolute method is not a rounding rule at all.** §5.2: the value "is **not to be rounded**, but is to be compared directly with the specified limiting value." This is a distinct conformance mode, not a decimals value. A vocabulary whose only options are precision-plus-tie-break has no way to say "do not round; compare exactly."
2. **ASTM E29 requires the specification to *declare* the method, and supplies no default.** §1.3: "Reference to this practice is valid only when a choice of method has been indicated." §4.1: absent that declaration, a reference to E29 "would be meaningless." This is a provenance/declaration obligation attached to the limit, distinct from the numeric parameters of rounding.
3. **Rounding to a nearest multiple that is not a power of ten.** E29 §6.6 (nearest 50, 5, 0.5, 0.05) and §6.7 (nearest 0.02, 0.25, 0.3, "any interval"). Expressible only if the vocabulary carries an arbitrary rounding *increment*, not a count of decimals or sig figs.
4. **Two mutually incompatible tie-break conventions are in live use.** USP 7.20 and Ph. Eur. 1.1 are **half-up**; ASTM E29 §6.4.3 is **half-to-even, with the refinement that half-even applies only when the dropped digits are exactly 5 or 5-followed-by-zeros** — non-zero digits beyond the 5 always round up. That refinement is itself a distinction (exact-tie vs. greater-than-tie) that a naive "half-even" flag can get wrong, and E29's NOTE 1 warns that software commonly does get it wrong.
5. **Reporting precision and conformance precision are specified separately, by different rules, in the same document.** E29 §7.4 derives the *reporting* rounding interval from the repeatability standard deviation σ (between 0.05σ and 0.5σ), while §6.2 governs the *conformance* rounding (to the spec's unit); §7.4 caps the former by the latter but they are not the same number. A single rounding rule per limit cannot hold both.
6. **A rounding rule tied to the measurement's uncertainty.** E29 §7.4's σ-derived interval is one form. A second, distinct form is the decision rule with guard bands: **ILAC-G8:09/2019, "Guidelines on Decision Rules and Statements of Conformity"** (confirmed current on ilac.org's own guidance index, no supersession noted), which exists precisely because ISO/IEC 17025:2017 requires a documented decision rule when a statement of conformity is issued. Under such a rule the verdict depends on the measurement uncertainty and an acceptance-probability choice, not on rounding. I did not quote ILAC-G8 or ISO/IEC 17025 body text — ISO/IEC 17025 is paywalled at iso.org and I did not fetch the G8 body.
7. **Conformance precision that depends on the magnitude of the value, and on a unit conversion.** ICH Q3A(R2) (Step 4; Attachment 2 revised 25 October 2006), read in full from database.ich.org:
   - Magnitude-conditional *reporting* precision, §5: "Below 1.0%, the results should be reported to two decimal places (e.g., 0.06%, 0.13%); at and above 1.0%, the results should be reported to one decimal place (e.g., 1.3%). Results should be rounded using conventional rules (see Attachment 2)."
   - Conformance evaluated after unit conversion, Attachment 2 footnote 2: "when the threshold is described in %, the reported result rounded to the same decimal place as the threshold should be compared directly to the threshold. When the threshold is described in TDI, the reported result should be **converted to TDI, rounded to the same decimal place as the threshold** and compared to the threshold. For example the amount of impurity at 0.12% level corresponds to a TDI of 0.96 mg (absolute amount) which is then rounded up to 1.0 mg; so the qualification threshold expressed in TDI (1.0 mg) is not exceeded."
   The worked table shows both effects at once: a raw 0.0963 % is reported as 0.10 %, and a raw 0.1649 % is reported as 0.16 %. The rounding attaches to the **threshold's** unit and decimal place, which may not be the reported result's unit.
8. **Microbiological count conventions are a limit *transformation*, not a rounding rule.** Ph. Eur. 2.6.12 (10.0 text), §5-3 Interpretation of the results, read verbatim: "When an acceptance criterion for microbiological quality is prescribed it is interpreted as follows: – 10^1 CFU : maximum acceptable count = 20 ; – 10^2 CFU : maximum acceptable count = 200 ; – 10^3 CFU : maximum acceptable count = 2000, and so forth." A printed limit of 10^2 CFU/g is a *numerically different* effective threshold (200) from the one written. No rounding-rule vocabulary of any shape can produce this; it is a rule about the limit, not about the value.
9. **Ph. Eur.'s "no further tolerances" clause and USP's "acceptance criteria are fixed numbers and are not rounded"** are both constraints on the *limit* side, asserting that nothing may be applied to the limit. They are satisfied by a design that only ever rounds the value, but they are separate normative statements, not parameters.
10. **Inclusivity of the endpoint is stated separately from rounding.** USP 7.10: "permitted values include the specified values themselves, but no values outside the limit(s)." A comparison operator (≤ vs <) is an independent degree of freedom from the rounding rule.

## What I could not establish

- **Whether the USP 7.20 text quoted above is the current text, or whether "7.20" is still the current section number.** USP-NF is subscription-only and `uspnf.com` blocks unauthenticated access at the edge (HTTP 403 on every path tried, including its own archival PDFs). My verbatim text is the 2009 USP 32 version. Every claim that this wording persists into USP-NF 2026 is **secondary-sourced**. Resolving this needs a USP-NF subscription or a print copy.
- **Whether ASTM E29-22 changed sections 4 through 7.** I verified from ASTM that E29-22 is the active edition and read its scope verbatim from ASTM's own page; the clause text is from the superseded E29-13. The standard costs USD 72 and there is a redline product specifically advertising the diff, which implies there *were* changes between editions. I did not buy either.
- **The current Ph. Eur. 11th Edition wording of General Notices 1.1 "Limits", and its current sub-numbering.** The Ph. Eur. 8.0 text I read is from 2013; EDQM's FAQ confirms the substance survives but words the rounding mechanism differently, which suggests the chapter was reworded. EDQM's own announcement page and webinar PDF both returned HTTP 403.
- **Whether any pharmacopoeia prescribes a "not less than X after rounding to the nearest whole number" construction.** I looked for it and did not find one in any text I read. Absence of evidence here is weak — I read Ph. Eur. General Notices and 2.6.12, not the monographs or the dissolution/uniformity general chapters (USP <711>, <905>, Ph. Eur. 2.9.3, 2.9.40), which are where per-unit acceptance tables live and where such a construction would most plausibly appear. USP general chapters are paywalled.
- **USP's own microbiological interpretation (<61>, <1111>).** These are harmonised with Ph. Eur. 2.6.12 and would be expected to carry the same 2×10^n convention, but USP general chapters are paywalled and I did not read them. The 2×10^n quotation above is from Ph. Eur. only.
- **ISO/IEC 17025:2017 §7.8.6 text on statements of conformity and decision rules.** Paywalled at iso.org; not read, not quoted.

## Sources

1. USP–NF, **USP 32–NF 27**, *General Notices and Requirements*, §7 Test Results (7.10, 7.10.10, 7.20), footer "© 2009 USPC Official 8/1/09 – 11/30/09". Verbatim PDF read at https://jira.hl7.org/secure/attachment/15680/USP-NF%20rounding%20rules.pdf (third-party host of a USP-generated print-out). **Superseded edition.**
2. USP–NF Online General Notices preview, https://doi.usp.org/USPNF/USPNF_M99989_90201_01.html — **paywall stub confirmed 2026-09-11**; references "the version of the General Notices and Requirements official as of December 1, 2022."
3. www.uspnf.com — **HTTP 403 Access Denied** on `/notices/general-notices-requirements` and on all archived General Notices PDFs, confirmed 2026-09-11.
4. **ASTM E29-22**, *Standard Practice for Using Significant Digits in Test Data to Determine Conformance with Specifications*, "Active — Last Updated: Apr 22, 2022", scope §§1.1–1.6 read at https://store.astm.org/e0029-22.html. **Full text paywalled (USD 72).**
5. **ASTM E29-13**, same title, approved Aug 1 2013, §§1–7 read verbatim from https://www.galvanizeit.com/uploads/resources/ASTM-E-29-yr-13.pdf (third-party host, IHS-licensed copy). **Superseded by E29-22.**
6. **European Pharmacopoeia 8.0**, *1. General Notices*, 01/2013:10000, section 1.1 General statements, "Limits". Read verbatim from a third-party mirror, https://file.wuxuwang.com/yaopinbz/EP8.0_1_00001.pdf. **Superseded edition (current is 11th Ed.).**
7. **EDQM FAQ**, "Am I allowed to round off measurements?", https://faq.edqm.eu/pages/viewpage.action?pageId=1376855 — read directly from EDQM, undated, retrieved 2026-09-11.
8. **European Pharmacopoeia 10.0**, *2.6.12. Microbiological examination of non-sterile products: microbial enumeration tests*, §5-3 Interpretation of the results. Read verbatim from https://ehpm.org/wp-content/uploads/2022/04/QG22_2-6-12_Microbiological_examination_of_non-sterile_products-microbial_enumeration_tests_ep10-2.pdf (third-party host).
9. **21 CFR Part 211**, complete current text, eCFR versioner API, title 21 issue date **2026-09-08**, up to date as of 2026-09-09: https://www.ecfr.gov/api/versioner/v1/full/2026-09-08/title-21.xml?chapter=I&subchapter=C&part=211 (browse at https://www.ecfr.gov/current/title-21/part-211).
10. **FDA**, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production*, Guidance for Industry, **Revision 1, May 2022**: https://www.fda.gov/media/158416/download
11. **FDA**, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*, Guidance for Industry, **December 2018 final**: https://www.fda.gov/media/119267/download (this is the final; the earlier draft is superseded).
12. **ICH Q3A(R2)**, *Impurities in New Drug Substances*, Step 4, Attachment 2 revised **25 October 2006**: https://database.ich.org/sites/default/files/Q3A%28R2%29%20Guideline.pdf
13. **ILAC-G8:09/2019**, *Guidelines on Decision Rules and Statements of Conformity*, listed as current with no supersession note on ILAC's own guidance index: https://ilac.org/publications-and-resources/ilac-guidance-series/ (body not read).
14. **ISO/IEC 17025:2017** — paywalled at iso.org, not read, not quoted.
