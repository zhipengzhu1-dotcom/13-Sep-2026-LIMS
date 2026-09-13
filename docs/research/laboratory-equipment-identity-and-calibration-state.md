# Does any primary source require a laboratory instrument to carry a distinctive identifier, and what must happen to results already produced by an instrument later found out of calibration?

**Asked by:** Orchestrator — equipment identity and calibration-state ticket
**Date:** 2026-09-11

**Status of sources:**

- **21 CFR Part 211** and **21 CFR Part 11** — retrieved in full as XML from the eCFR Versioner API at issue date **2026-09-09** (`https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211` and `…?part=11`). 2026-09-09 remains the most recent issue date of Title 21; the API rejects later dates. Part 211 = 60 sections (§211.1–§211.208); Part 11 = 10 sections (§11.1, 11.2, 11.3, 11.10, 11.30, 11.50, 11.70, 11.100, 11.200, 11.300). **21 CFR Part 210** was also retrieved at the same issue date, to check whether "major equipment" is defined there. All occurrence counts below were run against these files; where a count could be inflated by a section heading or a Federal Register source-credit line, that is stated.
- **FDA, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production*** — PDF from `https://www.fda.gov/media/158416/download`. Cover page confirms **May 2022, Revision 1**, CDER, docket FDA-1998-D-0019. This is the current Level 2 revised final guidance, **not** the October 2006 version. Every page carries "Contains Nonbinding Recommendations." Printed page numbers cited below are the guidance's own footer numbers (PDF page minus 3).
- **FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*** — PDF from `https://www.fda.gov/media/119267/download`. Cover page reads **December 2018**. This is the final document, **not** the 2016 draft. "Contains Nonbinding Recommendations" on every page.
- **PIC/S PI 041-1, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*** — PDF from `https://picscheme.org/docview/4234`. Page 1 header confirms **"PI 041-1 … 1 July 2021"**, 63 pages. Final version, not the 2016/2018 drafts.
- **EU GMP Chapter 3 (Premises and Equipment)** — PDF from `https://health.ec.europa.eu/document/download/18d76565-137b-41d2-a602-794527f708c1_en?filename=chapter_3.pdf`, retrieved from the live EudraLex Volume 4 index on 2026-09-11. Cover page: Brussels, 13 August 2014; "Status of the document: Revision"; **deadline for coming into operation 1 March 2015**. This is the version the live index currently serves.
- **EU GMP Annex 11 (Computerised Systems)** — PDF from `https://health.ec.europa.eu/document/download/8d305550-dd22-4dad-8463-2ddb4a1345f1_en?filename=annex11_01-2011_en.pdf`. "Revision 1," in force 30 June 2011; still the version the live EudraLex index serves. (A 2025 consultation draft exists; no adopted replacement found — see this repository's `docs/research/account-controls-regulatory-text.md`.)
- **USP General Chapter 〈1058〉 Analytical Instrument Qualification — PAYWALLED, BODY NOT READ.** `https://doi.usp.org/USPNF/USPNF_M1124_10101_01.html` returns **HTTP 200** but serves a preview only. See §6 below for exactly what was and was not readable. **No part of 〈1058〉's substantive text has been paraphrased from any secondary source.**

Prior settled context, built on and not re-derived: Part 211 requires equipment identity for the **batch production record** (§211.105(b), §211.188(b)(2)) and nowhere writes the laboratory equivalent into §211.194(a).

---

## 1. Is a laboratory instrument required to carry a distinctive identifier?

### §211.105 — quoted in full

> **§ 211.105 Equipment identification.**
> **(a)** All compounding and storage containers, processing lines, and major equipment used during the production of a batch of a drug product shall be properly identified at all times to indicate their contents and, when necessary, the phase of processing of the batch.
> **(b)** Major equipment shall be identified by a distinctive identification number or code that shall be recorded in the batch production record to show the specific equipment used in the manufacture of each batch of a drug product. In cases where only one of a particular type of equipment exists in a manufacturing facility, the name of the equipment may be used in lieu of a distinctive identification number or code.

**Scope analysis.** §211.105(a) is scoped by the phrase "**used during the production of a batch of a drug product**." §211.105(b) has no independent scope clause of its own — it opens "Major equipment shall be identified" — but its purpose clause ties it to the same domain twice over: the identifier "shall be recorded in the **batch production record**" and its function is "to show the specific equipment used **in the manufacture** of each batch." The final sentence reinforces the domain a third time: "only one of a particular type of equipment exists in a **manufacturing facility**."

So (b)'s obligation is not, on its face, textually limited to production equipment the way (a) is — the phrase "Major equipment shall be identified by a distinctive identification number or code" is free-standing. But every consequence the sentence attaches to that identifier is a production consequence. A laboratory HPLC is not recorded in a batch production record and is not used "in the manufacture" of a batch; applying (b) to it produces an identifier with no destination. §211.105 also sits in **Subpart D — Equipment**, and the whole of §211.105 is titled "Equipment identification" without qualification, so the section is not formally partitioned into production and laboratory. The honest reading is: **(b) is drafted around a production consequence and does not reach laboratory instruments in any operative way, but the sentence's opening clause is not expressly limited to production equipment.** This ambiguity is stated rather than resolved (see "What I could not establish").

**"Major equipment" is undefined.** The phrase "major equipment" occurs **4 times** in Part 211 — §211.105 (×2), §211.182 (×1), §211.188 (×1) — and **zero times** in 21 CFR Part 210. Indeed the word "**equipment**" occurs **zero times anywhere in Part 210**, the definitions part of the CGMP scheme. Part 211 supplies no criterion for what makes equipment "major."

**"Distinctive"** occurs **6 times** in Part 211, in four sections: §211.80 (1), §211.105 (2), §211.132 (2), §211.194 (1). The §211.194 occurrence is §211.194(a)(1)'s "lot number or other distinctive code" — describing the **sample received for testing**, not the instrument. §211.80 and §211.132 concern components/containers and OTC tamper-evident packaging respectively. **The only "distinctive identification number or code" obligation attaching to a physical machine in all of Part 211 is §211.105(b), and its recording destination is the batch production record.**

### §211.160(b)(4) — no identifier requirement

§211.160(b)(4) (quoted in full in §2 below) requires *calibration* of "instruments, apparatus, gauges, and recording devices" to a written programme. It does **not** require those instruments to be individually identified, numbered or coded, and contains no identity language at all.

### §211.68 — no identifier requirement

> **§ 211.68(a)** Automatic, mechanical, or electronic equipment or other types of equipment, including computers, or related systems that will perform a function satisfactorily, may be used in the manufacture, processing, packing, and holding of a drug product. If such equipment is so used, it shall be routinely calibrated, inspected, or checked according to a written program designed to assure proper performance. Written records of those calibration checks and inspections shall be maintained.

No identity obligation. Note also its scope phrase — "used in the **manufacture, processing, packing, and holding** of a drug product" — which does not name laboratory testing.

### §211.67 — no identifier requirement

§211.67(a) requires equipment to be "cleaned, maintained, and, as appropriate for the nature of the drug, sanitized and/or sterilized at appropriate intervals to prevent malfunctions or contamination…". §211.67(b) requires written cleaning/maintenance procedures including "(1) Assignment of responsibility for cleaning and maintaining equipment" and "(4) **Removal or obliteration of previous batch identification**." §211.67(c): "Records shall be kept of maintenance, cleaning, sanitizing, and inspection as specified in §§ 211.180 and 211.182." §211.67(b)'s scope is "equipment, including utensils, **used in the manufacture, processing, packing, or holding of a drug product**." **No identifier requirement anywhere in §211.67**, and the only identification mentioned (b)(4) is batch identification to be removed, not equipment identity to be assigned.

### §211.182 — the equipment cleaning and use log, scope sentence quoted

> **§ 211.182 Equipment cleaning and use log.** A written record of major equipment cleaning, maintenance (except routine maintenance such as lubrication and adjustments), and use shall be included in individual equipment logs that show the date, time, product, and lot number of each batch processed. If equipment is dedicated to manufacture of one product, then individual equipment logs are not required, provided that lots or batches of such product follow in numerical order and are manufactured in numerical sequence. In cases where dedicated equipment is employed, the records of cleaning, maintenance, and use shall be part of the batch record. The persons performing and double-checking the cleaning and maintenance (or, if the cleaning and maintenance is performed using automated equipment under § 211.68, just the person verifying the cleaning and maintenance done by the automated equipment) shall date and sign or initial the log indicating that the work was performed. Entries in the log shall be in chronological order.

**Does §211.182 reach laboratory instruments? On the text, no.** The section has no explicit scope clause; its scope is carried entirely by the content it demands. The log must "show the date, time, **product, and lot number of each batch processed**." A laboratory instrument does not process a batch — it tests a sample drawn from one. The remaining sentences are all production-shaped: "dedicated to manufacture of one product," "manufactured in numerical sequence," "shall be part of the **batch record**." The subject noun is "**major equipment**," the same undefined term as §211.105(b) and §211.188(b)(2). **§211.182 describes a production equipment log, and nothing in it is drafted for a laboratory instrument.** It is also worth noting the *direction* of the reference: the equipment log points at the batch, not the batch or test record at the equipment.

### Conclusion for question 1

**No provision of 21 CFR Part 211 requires a laboratory instrument to carry a distinctive identifier.** The one distinctive-identifier obligation in the part (§211.105(b)) is built around recording that identifier in the batch production record. §211.160(b)(4), §211.68, §211.67 and §211.182 impose calibration, maintenance, cleaning and logging duties without imposing any instrument-identity duty, and §211.182's log is production-scoped by its own required content.

---

## 2. THE SHARP QUESTION — results produced by an instrument later found out of calibration

### §211.160(b)(4), quoted in full

> **(4)** The calibration of instruments, apparatus, gauges, and recording devices at suitable intervals in accordance with an established written program containing specific directions, schedules, limits for accuracy and precision, and **provisions for remedial action in the event accuracy and/or precision limits are not met**. Instruments, apparatus, gauges, and recording devices not meeting established specifications shall not be used.

(Opening words of §211.160(b), which governs the list: "Laboratory controls shall include the establishment of scientifically sound and appropriate specifications, standards, sampling plans, and test procedures designed to assure that components, drug product containers, closures, in-process materials, labeling, and drug products conform to appropriate standards of identity, strength, quality, and purity. Laboratory controls shall include:")

### Is it prospective only?

**The operative prohibition is grammatically and temporally prospective.** "Instruments … not meeting established specifications **shall not be used**" is a forward-looking bar on use. It does not say results already produced are void, suspect, invalid, or must be re-examined. There is no retrospective verb anywhere in the sentence.

**The one retrospective hook in the clause is not a rule about results.** It is the requirement that the written programme contain "**provisions for remedial action in the event accuracy and/or precision limits are not met**." This is an obligation about **the content of the firm's written calibration programme** — the programme must say what remedial action follows — not a regulatory statement of what that remedial action must be. Part 211 nowhere defines "remedial action," nowhere says it must reach backwards to results generated since the last successful calibration, and nowhere specifies a look-back window. **The regulation delegates the retrospective question entirely to the firm's own written programme.**

Corroborating occurrence checks (excluding FR source-credit lines): "**remedial**" occurs **once** in all of Part 211, in §211.160(b)(4). "**retrospect***" occurs **zero** times. "**suspect**" occurs **zero** times. "**withdraw***" occurs **zero** times. The phrase "**shall not be used**" occurs in exactly **two** sections: §211.56 (rodenticides/insecticides/fungicides, "shall not be used unless registered and used in accordance with sections 3 and 12 of the Federal Insecticide, Fungicide, and Rodenticide Act") and §211.160 — in both cases a prospective bar on use.

### Does anything else in Part 211 make it retrospective?

**§211.192** is the nearest candidate and it does not clearly reach:

> All drug product production and control records, including those for packaging and labeling, shall be reviewed and approved by the quality control unit to determine compliance with all established, approved written procedures before a batch is released or distributed. **Any unexplained discrepancy** (including a percentage of theoretical yield exceeding the maximum or minimum percentages established in master production and control records) **or the failure of a batch or any of its components to meet any of its specifications shall be thoroughly investigated, whether or not the batch has already been distributed.** The investigation shall extend to other batches of the same drug product and other drug products that may have been associated with the specific failure or discrepancy. A written record of the investigation shall be made and shall include the conclusions and followup.

§211.192's trigger is "any unexplained discrepancy … or the failure of a batch or any of its components to meet any of its specifications." **A passing result produced on an instrument later found out of calibration is, on its face, neither**: there is no discrepancy in the record and no specification failure. The clause "whether or not the batch has already been distributed" is the one unambiguously retrospective phrase in Part 211 — but it retrospectively extends an investigation that has already been *triggered*; it does not itself supply a trigger for a discovered miscalibration. Whether a discovered out-of-calibration condition counts as an "unexplained discrepancy" is not settled by the text; "discrepancy" is undefined in Parts 210 and 211.

**§211.165(f)** ("Drug products failing to meet established standards or specifications and any other relevant quality control criteria shall be rejected") is keyed to the *product* failing, not to the instrument.

### FDA OOS guidance (May 2022, Rev. 1) — does it treat instrument malfunction as a Phase I laboratory-error cause?

**Yes, explicitly, and in several places.**

Section II, Background, on the purpose of Phase I:

> "The first phase of such an investigation should include an initial assessment of the accuracy of the laboratory's data. Whenever possible, this should be done before test preparations (including the composite or the homogenous source of the aliquot tested) are discarded. This way, **hypotheses regarding laboratory error or instrument malfunctions can be tested using the same test preparations.**" (p.2)

Section III.A, Responsibility of the Analyst (p.3) — the guidance's own reading of §211.160(b)(4), which is worth quoting because it is FDA restating the clause prospectively:

> "In accordance with the CGMP regulations in § 211.160(b)(4), **the analyst should ensure that only those instruments meeting established performance specifications are used and that all instruments are properly calibrated.**"

Section III.B, Responsibilities of the Laboratory Supervisor — the enumerated Phase I steps include:

> "**4. Confirm the performance of the instruments.**" (p.4)

and

> "The assignment of a cause for OOS results will be greatly facilitated if the retained sample preparations are examined promptly. Hypotheses regarding what might have happened (e.g., dilution error, **instrument malfunction**) should be tested… • Solutions can be re-injected as part of an investigation where a **transient equipment malfunction** is suspected. Such hypotheses are difficult to prove. However, reinjections can provide strong evidence that **the problem should be attributed to the instrument, rather than the sample or its preparation.**" (p.4–5)

and, on retesting:

> "Situations where retesting is indicated include **investigating testing instrument malfunctions** or to identify a possible sample handling problem, for example, a suspected dilution error." (p.6)

and on the systemic reading:

> "Laboratory error should be relatively rare. Frequent errors suggest a problem that might be due to inadequate training of analysts, **poorly maintained or improperly calibrated equipment**, or careless work." (p.5)

### What does the OOS guidance say about invalidating a result on that basis?

Two sentences do the load-bearing work.

Section III.B, p.5:

> "**In summary, when clear evidence of laboratory error exists, laboratory testing results should be invalidated.** When evidence of laboratory error remains unclear, a full-scale OOS investigation should be conducted by the manufacturing firm to determine what caused the unexpected results."

immediately followed by:

> "OOS test results should not be attributed to analytical error without completing an investigation that clearly establishes the error."

Section V.A, Interpretation of Investigation Results, p.12:

> "In those instances where an investigation has revealed a cause, and the suspect result is invalidated, the result should not be used to evaluate the quality of the batch or lot. **Invalidation of a discrete test result may be done only upon the observation and documentation of a test event that can reasonably be determined to have caused the OOS result.**"

And the counterweight, section IV.A:

> "If no laboratory or calculation errors are identified in the first test, there is no scientific basis for invalidating initial OOS results in favor of passing retest results. All test results, both passing and suspect, should be reported and considered in batch release decisions."

**Direction of the guidance matters and should be stated plainly.** The OOS guidance is triggered by an **OOS result** and runs in the direction of: *a failing result may be invalidated if a laboratory cause — including instrument malfunction — is observed and documented.* It does not run in the direction the question asks: it contains **no** provision addressing a **passing** result retrospectively rendered suspect because the instrument was later found out of calibration. The whole document is scoped in section I to "how to evaluate out-of-specification (OOS) test results."

### The one genuinely retrospective sentence in the OOS guidance

Section III.A, p.4 — retrospective, but triggered by in-run system suitability rather than by a calibration date:

> "Certain analytical methods have system suitability requirements, and systems not meeting these requirements should not be used. For example, in chromatographic systems, reference standard solutions may be injected at intervals throughout chromatographic runs to measure drift, noise, and repeatability. **If reference standard responses indicate that the system is not functioning properly, all of the data collected during the suspect time period should be properly identified and should not be used. The cause of the malfunction should be identified and, if possible, corrected before a decision is made whether to use any data prior to the suspect period.**"

This is the only place in any source read for this question that (i) defines a bounded window of already-generated data ("the suspect time period"), (ii) requires that data to be **identified** rather than deleted, (iii) bars its use, and (iv) makes the disposition of data *outside* that window ("any data prior to the suspect period") a decision to be made after root cause is established. It is guidance ("should"), it is triggered by failing system suitability responses inside a run, and it is not written about calibration intervals.

### Occurrence checks supporting the negative

In Part 211, "**out of calibration**" — **zero** occurrences. "**out of service**" — **zero** occurrences (see §4). In the December 2018 Data Integrity guidance, "**calibrat***" — **zero** occurrences in the entire document.

---

## 3. Occurrence counts

**21 CFR Part 211** (eCFR issue 2026-09-09, all 60 sections; counts exclude Federal Register source-credit lines, and section-heading occurrences are flagged):

| Term | Total | Sections |
|---|---|---|
| **calibrat\*** | **4** | §211.68 (2 — "calibrated," "calibration"), §211.160 (1 — "calibration," in (b)(4)), §211.194 (1 — "calibration," in (d)) |
| **instrument\*** | **4** | §211.160 (2 — "instruments" and "Instruments," both in (b)(4)), §211.194 (2 — "instrumentation" in (a)(4), "instruments" in (d)) |
| **out of service** | **0** | — |
| **maintenance** | **15** | §211.42 (1), §211.58 (1 — this is the section heading "Maintenance"), §211.63 (1), §211.67 (6 — one of which is the section heading "Equipment cleaning and maintenance"), §211.182 (6) |
| **qualif\*** | **4** | §211.25 (3 — "qualifications," "qualified," "qualified"), §211.34 (1 — "qualifications") |

Notes that matter for this ticket:

- **The standalone noun "qualification" — in the equipment/IQ-OQ-PQ sense — occurs zero times in Part 211.** All four "qualif\*" hits are about *people* (§211.25 Personnel qualifications, §211.34 Consultants), consistent with the prior finding in `part211-periphery-record-obligations.md`. **Part 211 contains no equipment-qualification requirement at all.**
- "instrument\*" occurs in only two sections, both in Subpart I/J, and one of those four occurrences ("instrumentation" in §211.194(a)(4)) describes the *output* ("graphs, charts, and spectra from laboratory instrumentation"), not the machine's identity.
- "maintenance" never appears in Subpart I (Laboratory Controls) or in §211.194. Every occurrence is in Subpart C (Buildings and Facilities: §§211.42, 211.58), Subpart D (Equipment: §§211.63, 211.67), or Subpart J (Records: §211.182). **There is no laboratory-instrument maintenance provision in Part 211.**
- For comparison: "maintain\*" (the verb, i.e. record-keeping) occurs across 16 sections including §211.194 (4) — a different word doing different work, flagged so the "maintenance" count is not misread.

**21 CFR Part 11** (eCFR issue 2026-09-09, all 10 sections):

| Term | Total | Sections |
|---|---|---|
| **calibrat\*** | **0** | — |
| **instrument\*** | **1** | §11.3 |
| **equipment** | **0** | — |
| **maintenance** | **1** | §11.10 |

Both Part 11 hits are false friends and should be recorded as such:

- The single "instrument" in §11.3(b)(8), defining handwritten signature: "The act of signing with **a writing or marking instrument** such as a pen or stylus is preserved." A pen, not an analytical instrument.
- The single "maintenance" in §11.10(k)(1): "Adequate controls over the distribution of, access to, and use of documentation for system operation and **maintenance**." Systems documentation, not equipment maintenance.

**21 CFR Part 11 therefore says nothing whatsoever about instruments, equipment, or calibration.** This is a clean and complete negative across the whole part.

---

## 4. "Out of service" vs "out of calibration" — is the distinction in any primary text?

### 21 CFR Part 211 — clean negative

- "**out of service**" / "**out-of-service**" — **0** occurrences.
- "**out of calibration**" — **0** occurrences.
- "**defect\***" — **1** occurrence, in §211.48 (plumbing/drains), unrelated to equipment state.
- "**withdraw\***" — **0** occurrences.
- "**status**" — **1** occurrence, in §211.80, about the status of components/containers/closures, not equipment.

Part 211 has exactly **one** notion covering both cases, and it is §211.160(b)(4)'s "**not meeting established specifications**" → "shall not be used." A broken instrument and a past-due instrument are, textually, the same single state. **Part 211 draws no distinction between broken/withdrawn-from-use and past-calibration-date.**

### EU GMP Chapter 3 (Premises and Equipment) — the one place two states appear, and it is not the distinction asked about

Chapter 3 handles them in two separate, non-cross-referencing clauses:

> **3.41** Measuring, weighing, recording and control equipment should be calibrated and checked at defined intervals by appropriate methods. Adequate records of such tests should be maintained.

> **3.44** Defective equipment should, if possible, be removed from production and quality control areas, or at least be clearly labelled as defective.

**§3.44 is the only clause found in any primary text for this question that names a distinct equipment state and prescribes a physical consequence for it** — removal, or failing that, conspicuous labelling. It is also the only one that explicitly names the laboratory: "removed from production **and quality control areas**." §3.41 is scoped to "Measuring, weighing, recording and control equipment," which is not limited to manufacturing equipment (contrast §3.34, §3.36, §3.39, all of which say "Manufacturing equipment" or "Production equipment") — so §3.41's calibration obligation does reach laboratory measuring equipment.

**But the distinction §3.44 draws is "defective" vs. everything else, not "defective" vs. "out of calibration."** Chapter 3 does not say what happens to an instrument that is functioning normally but has passed its calibration due date; it does not use the phrase "out of calibration" or "calibration status"; there is no "calibration status label" clause; and §3.41 attaches no consequence at all to a failed or missed calibration check. Searches of the Chapter 3 text for "calibration status," "status label," and "out of use" returned **zero** matches; "defective" appears only in §3.44 (twice, in the one sentence).

### EU GMP Annex 11 — clean negative

"**calibrat\***" — **0** occurrences in Annex 11. "**instrument**" — **0** occurrences. "Equipment" appears twice, both incidental: §12.1 ("restricted access to computer equipment and data storage areas") and §10/§11 region ("If relevant changes are to be made to the system (e.g. computer equipment or programs)"). The nearest state-language in Annex 11 concerns the *computerised system*, not an instrument:

> **§11 Periodic evaluation.** "Computerised systems should be periodically evaluated to confirm that they **remain in a valid state** and are compliant with GMP. Such evaluations should include, where appropriate, the current range of functionality, deviation records, incidents, problems, upgrade history, performance, reliability, security and validation status reports."

> **§13 Incident Management.** "All incidents, not only system failures and data errors, should be reported and assessed. The root cause of a critical incident should be identified and should form the basis of corrective and preventive actions."

Neither addresses instrument calibration state, and neither says anything about data already produced.

### PIC/S PI 041-1 — clean negative, and a notably thin one

Across the full 63-page text: "**calibration**" occurs **exactly once**; "**instrument**" occurs **exactly once**; "out of service," "out-of-service," "decommission," "withdraw," "instrument ID," "instrument identity," and "equipment identification" each occur **zero** times.

The single "calibration" occurrence, in the ALCOA+ table entry for *Accurate*:

> "Ensuring records are accurate is achieved through many elements of a robust Pharmaceutical Quality System. This can be comprised of: • **equipment related factors such as qualification, calibration, maintenance and computer validation**. • policies and procedures to control actions and behaviours, including data review procedures to verify adherence to procedural requirements • deviation management including root cause analysis, impact assessments and CAPA"

The single "instrument" occurrence is incidental and about data transfer, not the instrument itself:

> "Temporary data storage on local computerised systems (e.g. **instrument computer**) before transfer to final storage or data processing location creates an opportunity for data to be deleted or manipulated."

**PI 041-1 names calibration once, as one of several PQS "equipment related factors" that underpin the *Accurate* attribute — and never returns to it. It contains no equipment-state vocabulary at all.**

### Conclusion for question 4

**There is one notion, not two, in almost every text checked.** Part 211 has a single condition ("not meeting established specifications" → shall not be used). Annex 11 and PI 041-1 have no equipment-state vocabulary. EU GMP Chapter 3 is the sole text that names a distinct state — "defective equipment," §3.44 — with a physical consequence reaching quality control areas, and it keeps that clause entirely separate from its calibration clause §3.41; but it does not define, name or consequence an "out of calibration" state, so it does not supply the two-state distinction the question asks about.

---

## 5. Data-integrity metadata expectation — does instrument identity have to be metadata of an original record?

### FDA Data Integrity guidance (December 2018) — supports it, in an open-ended example list

Question 1.b, "What is 'metadata'?":

> "Metadata is the contextual information required to understand data. A data value is by itself meaningless without additional information about the data. Metadata is often described as data about data. Metadata is structured information that describes, explains, or otherwise makes it easier to retrieve, use, or manage data. For example, the number '23' is meaningless without metadata, such as an indication of the unit 'mg.' Among other things, **metadata for a particular piece of data could include a date/time stamp documenting when the data were acquired, a user ID of the person who conducted the test or analysis that generated the data, the instrument ID used to acquire the data, material status data, the material identification number, and audit trails.** Data should be maintained throughout the record's retention period with all associated metadata required to reconstruct the CGMP activity (e.g., §§ 211.188 and 211.194). The relationships between data and their metadata should be preserved in a secure and traceable manner."

**This is the sentence the map's "convention plus data-integrity expectation" claim rests on. Its precise status:**

- It is **nonbinding** ("Contains Nonbinding Recommendations," every page).
- Instrument ID appears in an **open-ended illustrative list** — "**could** include," prefaced by "**Among other things**." It is not a required element and the list is not exhaustive.
- The **binding** sentence that follows is the retention sentence — metadata "**required to reconstruct the CGMP activity**" must be maintained — and the hook it cites is §§211.188 and 211.194 **generally**, not any enumerated item. Whether instrument ID is "required to reconstruct the CGMP activity" is left to the reader.
- The guidance's own definition sentence ("Metadata is the contextual information required to understand data") supplies the criterion but not its application to instrument identity.

A second, weaker touchpoint, from the audit-trail question (footnote 13):

> "Examples of audit trails that may be appropriate to review on a risk-based frequency include audit trails that capture **instrument operational status**, instrument communication logs, and alert records."

This is about which audit trails to *review*, not about what must be captured as record metadata; and it is doubly hedged ("may be appropriate," "risk-based").

**"calibrat\*" occurs zero times in the entire December 2018 DI guidance.** It contains no statement about calibration state, no statement that calibration status is metadata, and no statement about results produced by a miscalibrated instrument.

### PIC/S PI 041-1 — does NOT support it

PI 041-1's own glossary definition of Metadata (p.63), quoted in full:

> "**Metadata** — In-file data that describes the attributes of other data, and provides context and meaning. Typically, these are data that describe the structure, data elements, inter-relationships and other characteristics of data e.g. audit trails. **Metadata also permit data to be attributable to an individual (or if automatically generated, to the original data source).** Metadata form an integral part of the original record. Without the context provided by metadata the data has no meaning."

**PI 041-1's metadata definition does not enumerate instrument identity.** Its only enumerated example is "e.g. audit trails." The nearest phrase is "**or if automatically generated, to the original data source**" — a parenthetical inside a sentence whose subject is *attributability*, and "original data source" is not defined anywhere in PI 041-1 as an instrument identifier. Confirmed by search: "instrument ID," "instrument identity," "equipment identification" — **zero** occurrences each; the sole "instrument" occurrence in the document is the unrelated "instrument computer" data-transfer passage quoted in §4 above.

### Conclusion for question 5

The claim "instrument identity on the test record is convention plus a data-integrity expectation" is supported by **exactly one** sentence in **one** of the two data-integrity sources — FDA's December 2018 Q1.b list — and that sentence is nonbinding, uses "could include," and is prefaced by "Among other things." **PI 041-1 does not support the claim**; its metadata definition omits instrument identity entirely and reaches attributability only to "the original data source" as a parenthetical about automatically generated data. Neither document says anything about calibration state as metadata.

---

## 6. USP 〈1058〉 Analytical Instrument Qualification — availability

**PAYWALLED. The substantive chapter text was not read and is not paraphrased below.**

- `https://doi.usp.org/USPNF/USPNF_M1124_10101_01.html` — **HTTP 200**, but the served page is a preview. The page body ends with: "**This is a preview of USP-NF/PF content. Subscriber? Access here! Not a subscriber? Learn more!**" No IQ/OQ/PQ content, no URS content, no requirements text is present on the page.
- An earlier DOI slug guess, `https://doi.usp.org/USPNF/USPNF_M1543_01_01.html`, returned **HTTP 200** with the body "**Page not found. This DOI references an unpublished version of a USP document. An updated version may be available at online.uspnf.com.**" Recorded because a 200 status here does not mean content was retrieved.

**What was genuinely publicly readable** is the *BRIEFING* attached to the preview — USP's own editorial note accompanying a proposed revision, not the chapter itself. Quoted verbatim, in full, because it is the only USP text actually read:

> "〈1058〉 Analytical Instrument Qualification. **This chapter is based on the version of the chapter official as of August 1, 2017. General chapter 〈1058〉 was originally published in 2008 and last revised in 2017.** Since 2008, there have been important improvements that must be addressed, including Analytical Procedure Life Cycle 〈1220〉 and increased awareness of the need for continuous monitoring and control to ensure compliance. General chapter 〈1058〉 is unique in the regulatory sector. It is widely regarded and used globally by regulators, suppliers, and industry. **It provides a framework for establishing "fitness for intended use" of apparatus, analytical instruments, and systems.** Given the structure of current chapter 〈1058〉, the Chemical Analysis Expert Committee considered it appropriate to restructure rather than just amend it. Life cycle approaches are recommended and **the 4Qs model will be maintained although it has some weaknesses. These are addressed to avoid confusion and highlight nomenclature misunderstandings.** Some of the existing content is reused or repositioned… Another reason for rewriting this chapter is the intent for above 〈1000〉 general chapters to provide general guidance for stakeholders. **It is important to put 'what needs to be done' in the context of 'why it needs to be done'. The decision of 'how it needs to be done' is the prerogative of individual organizations.**"

Publisher citation given by the page itself: *United States Pharmacopeia (2025). General Chapter, 〈1058〉 Analytical Instrument Qualification. USP-NF. Rockville, MD. DOI: https://doi.org/10.31003/USPNF_M1124_10101_01*

**What this establishes, and only this:** (i) the version of 〈1058〉 that is official is the one official as of **1 August 2017**, originally published 2008; (ii) a revision has been proposed and is in Pharmacopeial Forum, so the chapter is **in flux** — the preview page is a *proposal* briefing, and I could not determine from public text whether that proposal has since become official; (iii) USP itself describes the chapter as providing "a framework for establishing 'fitness for intended use'"; (iv) USP itself uses the phrase "**the 4Qs model**" and states it will be maintained. **I did not read what the 4Qs are from USP, and am not naming or describing them from any secondary source.** (v) USP characterises above-〈1000〉 general chapters as general guidance, with "how it needs to be done" left to individual organizations — USP's own words about the chapter's normative weight.

**Not established, because not readable:** anything the chapter actually requires; whether it requires an instrument identifier; whether it defines calibration state or an out-of-calibration state; whether it addresses the disposition of results produced by a non-qualified or out-of-calibration instrument; and the chapter's classification of instrument groups.

---

## What I could not establish

1. **Whether §211.105(b)'s opening clause reaches laboratory instruments at all.** The sentence "Major equipment shall be identified by a distinctive identification number or code" is not expressly scoped to production, unlike §211.105(a) ("used during the production of a batch"). Every consequence the sentence attaches is a production consequence (batch production record, manufacture of a batch, manufacturing facility), and applying it to a laboratory instrument yields an identifier with no required destination — but the text does not say so. No FDA guidance read for this question interprets §211.105(b)'s scope.

2. **What "major equipment" means.** Undefined in Part 211 and the word "equipment" does not occur at all in Part 210. There is no criterion in the CGMP regulations for distinguishing major from non-major equipment, so whether an HPLC or a balance would be "major equipment" is not settled by any text read.

3. **What "remedial action" must consist of under §211.160(b)(4), and whether it must reach backwards to results.** The regulation requires the firm's written calibration programme to *contain* provisions for remedial action; it does not specify them, does not define a look-back period, and does not say results are affected. This is the precise point at which Part 211 hands the question to the firm's own procedure. **The sharpest question in this ticket has no answer in the regulation's text.**

4. **Whether a discovered out-of-calibration condition constitutes an "unexplained discrepancy" triggering §211.192.** "Discrepancy" is undefined in Parts 210 and 211; §211.192's other trigger (specification failure) plainly does not fit a passing result. Neither the OOS nor the DI guidance addresses the question, and I found no primary text resolving it.

5. **What must happen to *passing* results produced by an instrument later found out of calibration.** Nothing in Part 211, Part 11, the May 2022 OOS guidance, the December 2018 DI guidance, EU GMP Chapter 3, Annex 11, or PIC/S PI 041-1 addresses this case. The OOS guidance runs in the opposite direction (invalidating a *failing* result when a laboratory cause is documented) and is scoped by its own section I to OOS results. The single retrospective passage found anywhere — OOS guidance p.4, "all of the data collected during the suspect time period … should not be used" — is triggered by failing in-run system suitability responses, not by a calibration date, and is a "should." **This is a genuine gap in the primary sources, not a gap in the search.**

6. **What USP 〈1058〉 requires.** Paywalled (HTTP 200, preview only). Reported as a paywall; the only USP text read is the proposal BRIEFING quoted in §6. I also could not establish whether the proposed restructured chapter has become official since the 2025 preview was published, because the status page content is behind the same wall.

7. **Whether EU GMP Chapter 4 or Chapter 6 contain equipment-identity or equipment-state language.** Out of the scope named in the task (Chapter 3 and Annex 11 were the named EU texts) and not fetched for this question. If a per-record equipment-identity expectation exists in EU GMP, Chapter 4 (Documentation) and Chapter 6 (Quality Control) are where a further check should go. Note that this repository's `personnel-authorisation-and-preventive-control.md` already covers Chapters 2, 4 and 6 for a different question.

8. **PIC/S PI 011** (computerised systems in GxP environments) was not fetched; it was not in the task's named list. If PIC/S has more granular equipment-state or instrument-metadata language, it is more likely there than in PI 041-1, whose treatment of equipment is unusually thin (one mention of calibration in 63 pages).

---

## Sources

1. **21 CFR Part 211**, Current Good Manufacturing Practice for Finished Pharmaceuticals. Full XML from the eCFR Versioner API at issue date **2026-09-09** (the most recent issue date of Title 21; later dates rejected by the API): `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`. 60 sections, Subparts A–K.
2. **21 CFR Part 11**, Electronic Records; Electronic Signatures. Full XML, same API and issue date **2026-09-09**: `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`. 10 sections.
3. **21 CFR Part 210**, same API and issue date **2026-09-09**, retrieved solely to establish that "equipment" (and therefore "major equipment") is nowhere defined there.
4. **FDA, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production*, Guidance for Industry, May 2022, Revision 1.** CDER, docket FDA-1998-D-0019. PDF: `https://www.fda.gov/media/158416/download`. Retrieved 2026-09-11; cover page and footer confirm May 2022 Rev. 1. Not the October 2006 version. Nonbinding.
5. **FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*, Guidance for Industry, December 2018.** PDF: `https://www.fda.gov/media/119267/download`. Retrieved 2026-09-11; cover page confirms December 2018. This is the final document, not the 2016 draft. Nonbinding.
6. **PIC/S PI 041-1, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, 1 July 2021 (final).** PDF: `https://picscheme.org/docview/4234`. Retrieved 2026-09-11; page-1 header confirms "PI 041-1 … 1 July 2021," 63 pages.
7. **European Commission, EudraLex Volume 4, Chapter 3: Premises and Equipment**, "Revision," Brussels 13 August 2014, deadline for coming into operation 1 March 2015. PDF: `https://health.ec.europa.eu/document/download/18d76565-137b-41d2-a602-794527f708c1_en?filename=chapter_3.pdf`, linked from the live EudraLex Volume 4 index (`https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en`), retrieved 2026-09-11.
8. **European Commission, EudraLex Volume 4, Annex 11: Computerised Systems**, "revision 1," in force 30 June 2011. PDF: `https://health.ec.europa.eu/document/download/8d305550-dd22-4dad-8463-2ddb4a1345f1_en?filename=annex11_01-2011_en.pdf`, retrieved 2026-09-11 from the live index. Currency caveat: a draft revision went to public consultation in 2025; no adopted replacement confirmed.
9. **USP General Chapter 〈1058〉 Analytical Instrument Qualification — NOT READ, PAYWALLED.** `https://doi.usp.org/USPNF/USPNF_M1124_10101_01.html` — **HTTP 200**, preview only; chapter body behind subscription wall. Publisher citation as given on the page: United States Pharmacopeia (2025), General Chapter 〈1058〉 Analytical Instrument Qualification, USP-NF, Rockville, MD, DOI `https://doi.org/10.31003/USPNF_M1124_10101_01`. Per the readable BRIEFING, the official version is the one official as of **1 August 2017** (originally published 2008), with a restructuring proposal in Pharmacopeial Forum. Only the BRIEFING was read; reported as a paywall, not summarised.
