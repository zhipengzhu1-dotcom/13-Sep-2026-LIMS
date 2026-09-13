# What published, traceable figures exist for the operating parameters of a pharmaceutical QC laboratory running roughly 1000 samples per month with roughly 20 analysts?

**Asked by:** [Workflow observation: the sixteen questions only the laboratory can answer](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/40)
**Date:** 2026-09-11
**Status of sources:** ICH Q6A fetched directly from `database.ich.org` and text-extracted locally with `pdftotext` (no version number is printed on the guideline itself; it is the current, unrevised Q6A text as hosted at that URL as of 2026-09-11 — ICH Q6A has not been superseded). FDA's proprietary-name guidance fetched directly from `fda.gov/media/88496/download` and text-extracted the same way; its cover page is dated December 2020 ("Contains Nonbinding Recommendations," final). One FDA warning letter (the firm Pharmaceuticals, docket 652067, dated 2023-07-28) was read via `fda.gov`. FDA's 1993 "Pharmaceutical Quality Control Labs (7/93)" inspection guide was read via `fda.gov`. Everything else below is search-engine-mediated (WebSearch/WebFetch summaries), which I flag explicitly wherever the result is a synthesized answer rather than a document I read directly — search-engine summaries are not primary sources and are marked as such.

## Findings

### 1. Tests per sample — PRIMARY REGULATORY TEXT (structural count, not a statistic)

ICH Q6A ("Specifications: Test Procedures and Acceptance Criteria for New Drug Substances and New Drug Products," https://database.ich.org/sites/default/files/Q6A%20Guideline.pdf, §3.2–§3.3) gives a structural, enumerable list rather than a headcount, but it is directly countable:

- **Universal tests for new drug products** (§3.2.2, applicable to *all* new drug products): (a) Description, (b) Identification, (c) Assay, (d) Impurities — **4 tests**.
- **Specific tests for new drug products, solid oral dosage forms — tablets/hard capsules** (§3.3.2.1): (a) Dissolution, (b) Disintegration, (c) Hardness/friability, plus further items covering uniformity of dosage units, water content, and microbial limits that follow in the same subsection (the guideline caveats these as case-by-case, "may be considered," not mandatory) — I confirmed at least **a) through at least e/f** in the extracted text (Dissolution, Disintegration, Hardness/friability, and further named tests continuing past what I quote here).
- **Specific tests for oral liquids** (§3.3.2.2) and **parenterals** (§3.3.2.3) each list their own case-by-case set — e.g. parenterals (§3.3.2.3) include pH, sterility, antioxidant preservative content, extractables, reconstitution time, among others.

So: ICH Q6A supports a floor of **4 universal tests per finished-product sample** as the only tests the guideline treats as applicable to *every* new drug product, with a dosage-form-dependent set of "specific" tests added on top — commonly cited industry practice (not itself sourced to Q6A) puts a typical finished tablet monograph at somewhere in the range of description/ID/assay/impurities/dissolution/uniformity/water content, i.e. roughly 6–8 tests, but I did not find a numeric "typical test count" figure asserted as such anywhere in Q6A itself — the guideline structures *categories* of tests, not a count. **Grade: PRIMARY REGULATORY TEXT for the structural list; no primary source gives a single numeric "N tests per sample" figure.**

I did not independently verify a USP monograph test count (e.g. by pulling a specific USP–NF monograph), since USP monograph content is licensed text, not freely fetchable, and the ticket's own no-real-product-example constraint made picking a specific monograph to count moot for this scout's pass.

### 2. Sample turnaround time — mixed grade, mostly non-primary

- FDA's 1993 inspection guide "Pharmaceutical Quality Control Labs (7/93)" (https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/inspection-guides/pharmaceutical-quality-control-labs-793) contains **no** turnaround-time figure for routine testing. The only timing figure in it is procedural, not throughput: "All failure investigations should be performed within 20 business days of the problem's occurrence" — this is an OOS-investigation deadline expectation, not a sample turnaround benchmark. **Grade: PRIMARY REGULATORY TEXT, but answers a different question than the one asked.**
- Search results turned up secondary/trade-press claims — e.g. an "overall quality operations cycle 5–34 calendar days" figure and a "14–30 day" batch-release hold figure — attributed to unnamed "industry benchmarking survey" language recycled across market-research and vendor sites (Pharmaceutical Technology benchmarking article was not independently readable; the specific site returned HTTP 403 on direct fetch, so I could not confirm the named source, methodology, or sample size behind the "5–34 days" figure). **Grade: VENDOR MARKETING / UNTRACEABLE-AS-CITED** — I could not trace this to a document with an identifiable author, methodology, or date; treat as industry folklore, not a verified figure.
- No ICH, FDA, EMA or ILAC document was found that states a numeric turnaround expectation for routine (non-investigation) QC release testing.

### 3. OOS / invalidated-result rate — confirms prior scout's finding, extends it

The prior scout's finding is **confirmed**: no identifiable WHO document supports a "2.3%" OOS rate. When this scout re-ran a search on that exact figure, the search tool's own generated summary asserted "Out of Specification (OOS) events represent 2.3% of pharmaceutical samples tested in 2026, according to WHO data" — but this sentence is the search engine's own synthesized text, not a quote from any of the URLs it returned (which were pharmuni.com, an FDA OOS-investigation guidance PDF, pharmaguideline.com, an NCBI article on medicine quality in Nigeria, the FDA 7/93 inspection guide, and an arXiv paper on FDA inspection scheduling — none of which contain a "2.3%" figure on inspection). This is itself worth recording as a mechanism: a plausible-sounding statistic can be manufactured by a summarization layer with no underlying document at all. **Grade: UNTRACEABLE — confirmed, not merely unconfirmed.**

I checked the two places the brief suggested that the prior scout may not have: FDA warning letters and peer-reviewed literature.

- **FDA warning letter, docket 652067 (2023-07-28)**, https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters (search by letter date) — contains a real, inspected-facility figure, but it is **not an OOS rate**: "You aborted hundreds of chromatographic sequences in your QC laboratories between January 2020 to November 2022." This is a data-integrity finding (undisclosed reasons for aborting runs) over a ~35-month window at one facility, not a stated fraction of samples that were OOS or invalidated. It does not give a denominator (total sequences run), so no rate can be derived from it. **Grade: PRIMARY (real warning letter, real facility) for the fact that hundreds of aborted sequences occurred; not usable as an OOS-rate figure because no rate is stated.**
- No peer-reviewed article, PDA/ISPE technical report, or MHRA/EMA inspection-findings publication surfaced in this pass that states a credible aggregate OOS or invalidated-result rate for pharmaceutical QC labs generally. This scout's search depth was limited to a small number of queries; absence here should be read as "not found in this pass," not as an exhaustive literature review.

**Net finding on OOS rate: no credible published aggregate rate was found by either scout. The "2.3%, WHO" figure remains untraceable to any WHO document and its persistence in search results appears to be an artefact of AI-summarization, not of an underlying source.**

### 4. Analyst productivity — no figure found

No primary regulatory, ISO/ILAC, or industry-body (PDA/ISPE) source was found in this pass giving a samples-per-analyst-per-day or tests-per-analyst-per-month figure for a regulated QC lab. The FDA 7/93 inspection guide and the firm warning letter do not address staffing ratios. **This is a "no credible published figure exists" result for this question**, not merely an unconfirmed one — I did not find vendor marketing material making this claim either, which is itself worth noting since vendor material is often where such numbers originate.

### 5. Concurrency / shift patterns — no figure or description found in the sources checked

Neither the firm warning letter nor the FDA 7/93 inspection guide mentions shift patterns (single shift, two-shift, overlap) for QC analysts. WebFetch of the firm letter specifically for shift-work language returned nothing. This pass did not locate an FDA warning letter that describes shift working in a QC lab in the terms the ticket asked for. **Grade: not found — open, not "does not exist."** A wider warning-letter search (FDA's full-text warning letter database, which I did not query directly beyond web search) might surface one; this pass did not find it.

### 6. Open work-in-progress / backlog — no figure found

No source in this pass gives a figure for concurrently-open tests or backlog size in a QC lab. The trade-press "14–30 day" batch-hold figure (§2 above) is adjacent — it describes elapsed time a batch sits in QC, which implies *some* standing WIP, but it is not a count of open tests and its source is unverified. **Grade: no direct figure; the closest adjacent figure is VENDOR MARKETING / UNTRACEABLE-AS-CITED and does not answer the question as asked.**

### 7. Non-ASCII names — partial finding, primary source consulted but inconclusive on the hard character-set question

FDA's "Best Practices in Developing Proprietary Names for Human Prescription Drug Products" (final, December 2020), https://www.fda.gov/media/88496/download — read directly, text-extracted:

- The guidance describes a proprietary name as generally consisting of "one or more letters, symbols, numbers, and/or words" (extracted text, p. ~15 area).
- It **discourages, but does not flatly prohibit**, symbols: "FDA also generally recommends against using symbols (e.g., '+' or '&') as part of proprietary names because symbols can be misinterpreted, misread, or mistranscribed... FDA recommends using words rather than symbols."
- It discusses avoiding abbreviations/dose designations from ISMP's error-prone list, for medication-error reasons — a safety rationale, not a character-encoding rule.
- **I found no statement in this document, or in the SPL Implementation Guide search results, specifying a permitted character set (e.g. ASCII-only, Latin-script-only) for proprietary or nonproprietary drug names.** SPL itself is an HL7/XML-based standard (Unicode-capable by the nature of XML), but I did not obtain and read the SPL Implementation Guide's field-level validation rules directly (fda.gov/media/84201/download was identified but not fetched in this pass), so I cannot state whether FDA's SPL validator technically rejects non-ASCII characters in the name fields as a matter of software validation, independent of naming-guidance recommendations.

**Net finding: no hard, sourced character-set restriction was established.** What is established is a *recommendation* (discourage symbols, for medication-error reasons) in a named FDA guidance document, which is a different and weaker claim than "the register restricts the character set."

## What I could not establish

- A single numeric "typical tests per sample" figure — Q6A gives a structural, enumerable list of test categories, but no source found states a headcount for a "typical" finished-product sample, and I did not pull a specific USP monograph to count directly (licensing/scope reasons).
- Any credible aggregate OOS/invalidated-result rate from any source — confirmed absent, including a specific mechanism (AI-search-summary fabrication) for why the "2.3%, WHO" figure keeps recurring despite no underlying document.
- Any samples-per-analyst or tests-per-analyst productivity figure from a regulatory, standards, or industry-body source.
- Any description of shift patterns (single/two-shift, overlap) in a QC lab from a primary inspected-facility document — the one warning letter checked in depth did not mention shifts; other warning letters were not individually reviewed in this pass.
- Any figure for standing open-test/backlog volume in a QC lab.
- Whether FDA's SPL Implementation Guide (fda.gov/media/84201/download, not fetched in this pass) imposes a technical character-set restriction on the proprietary/nonproprietary name XML fields, independent of the naming-guidance's non-binding recommendation against symbols. This is the one open thread on question 7 that a further pass could close by fetching that specific document.
- The named methodology, sample size, and date behind the "5–34 day" and "14–30 day" QC cycle-time figures that recur across trade press — the specific Pharmaceutical Technology article that appeared to be the origin returned HTTP 403 on direct fetch and could not be confirmed as primary or as itself citing a named survey.

## Sources

- ICH, *Q6A: Specifications — Test Procedures and Acceptance Criteria for New Drug Substances and New Drug Products: Chemical Substances*, https://database.ich.org/sites/default/files/Q6A%20Guideline.pdf — fetched and text-extracted directly, 2026-09-11; no revision date printed on the document; current/unsuperseded ICH Q6A text as hosted at this URL.
- FDA, *Best Practices in Developing Proprietary Names for Human Prescription Drug Products*, final guidance, December 2020, https://www.fda.gov/media/88496/download — fetched and text-extracted directly, 2026-09-11.
- FDA, *Pharmaceutical Quality Control Labs (7/93)*, inspection guide, https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/inspection-guides/pharmaceutical-quality-control-labs-793 — fetched directly, 2026-09-11.
- FDA Warning Letter, docket 652067, dated 2023-07-28, https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters (search by letter date) — fetched directly, 2026-09-11.
- WebSearch results (search-engine summaries, not independently read documents, and treated accordingly): a query on "WHO 2.3% OOS rate" (2026-09-11), which surfaced the mechanism described in §3; a query on QC turnaround-time benchmarks (2026-09-11), surfacing unverified "5–34 day" / "14–30 day" trade-press figures; a query on FDA warning letters mentioning shift work (2026-09-11), which did not surface a usable result.
- Not fetched but identified as a candidate for a future pass: FDA, *Structured Product Labeling (SPL) Implementation Guide with Validation Procedures*, https://www.fda.gov/media/84201/download.
