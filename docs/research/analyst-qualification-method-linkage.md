# In ICH and FDA primary sources, is an analyst's qualification/competence ever tied to a specific analytical method (as opposed to general training), and does a change to an analytical method create any obligation to re-qualify the analysts who perform it?

**Asked by:** Orchestrator, for the ticket deciding whether work assignment should check an analyst's qualification against the exact immutable method version, and whether a new method version should invalidate existing analyst qualifications
**Date:** 2026-09-11

**Status of sources:**

- **ICH Q7, *Good Manufacturing Practice Guidance for Active Pharmaceutical Ingredients*** — retrieved as FDA-hosted PDF, `https://www.fda.gov/files/drugs/published/Q7-Good-Manufacturing-Practice-Guidance-for-Active-Pharmaceutical-Ingredients-Guidance-for-Industry.pdf`. Cover page reads **"Guidance for Industry," September 2016, Revision 1, ICH**. (The underlying ICH Q7 text was finalized at Step 4 in November 2000; "Revision 1" is FDA's 2016 reissue of the guidance document. I did not separately verify a more recent FDA reissue and report the document's own self-identified date.)
- **ICH Q2(R2), *Validation of Analytical Procedures*** — retrieved from the ICH database, `https://database.ich.org/sites/default/files/ICH_Q2(R2)_Guideline_2023_1130.pdf`. Title page reads **"Final Version, Adopted on 1 November 2023."** This is the current Q2(R2), superseding Q2(R1).
- **ICH Q14, *Analytical Procedure Development*** — retrieved as FDA-hosted PDF, `https://www.fda.gov/media/161202/download`. Cover page reads **"Guidance for Industry," March 2024, ICH-Quality**. FDA's implementation of the ICH Q14 Final Version (adopted 1 November 2023 per the companion Q2(R2)/Q14 ICH materials).
- **FDA, *Analytical Procedures and Methods Validation for Drugs and Biologics*, Guidance for Industry** — retrieved from `https://www.fda.gov/media/87801/download`. Cover page reads **July 2015**. This is the document named in the task; I did not find a newer version superseding it during this search.
- All four documents were converted to text with `pdftotext -layout` and searched with `grep -n -i` for exact term occurrences; line numbers below refer to the extracted text, not the PDF page numbers, and are reported alongside quoted context so they can be re-located in the PDF.

---

## Findings

### 1. ICH Q7 — Personnel (§3.1x), Laboratory Controls (§11), Validation (§12)

**§3.1 Personnel Qualifications** ties training to "operations," not to methods:

> "There should be an adequate number of personnel qualified by appropriate education, training, and/or experience to perform and supervise the manufacture of intermediates and APIs. (3.10)"
>
> "Training should be regularly conducted by qualified individuals and should cover, at a minimum, the particular operations that the employee performs and GMP as it relates to the employee's functions. Records of training should be maintained. Training should be periodically assessed. (3.12)"

This is the same "particular operations" formulation as 21 CFR 211.25(a) (already in hand), with two additions 211.25 does not have: a **records clause** ("Records of training should be maintained") and a **periodic-assessment clause** ("Training should be periodically assessed"). Neither clause names methods, procedures, or re-qualification triggers — "periodically assessed" is left completely undefined as to interval or trigger.

**§11.1 General Controls** (Laboratory Controls) contains no personnel-qualification clause at all. It addresses specifications, sampling plans, test procedures, OOS investigation, reagents, and reference standards (§§11.10–11.19), but the word "analyst" and the word "competen-" do not appear anywhere in this section, or anywhere in the document (see term-occurrence check, §5 below).

**§11.19**, the one requalification clause in Q7, is about a **material**, not a person:

> "Secondary reference standards should be appropriately prepared, identified, tested, approved, and stored. The suitability of each batch of secondary reference standard should be determined prior to first use by comparing against a primary reference standard. **Each batch of secondary reference standard should be periodically requalified in accordance with a written protocol.** (11.19)"

I confirmed this by locating every occurrence of "requalif-" in the document (`grep -n -i "requalif" q7.txt`): there is exactly **one**, and it is 11.19, about a reference standard batch.

**§12 Validation** (§12.3 Qualification) is about equipment, not personnel or methods in the sense the ticket asks about:

> "Before initiating process validation activities, appropriate qualification of critical equipment and ancillary systems should be completed. Qualification is usually carried out by conducting the following activities, individually or combined: Design Qualification (DQ)... Installation Qualification (IQ)... Operational Qualification (OQ)... Performance Qualification (PQ)..."

**Conclusion for Q7:** Q7 ties qualification/training to "the particular operations that the employee performs" (§3.12) — operation-level, not method-version-level — and adds a records and periodic-reassessment clause absent from 21 CFR 211.25. It contains **no clause anywhere that ties an analyst's qualification to a specific analytical method or method version**, and **no clause requiring re-qualification of analysts when a method changes.** The only requalification obligation in the document runs against reference standard batches (§11.19), not people.

---

### 2. ICH Q2(R2) — analyst variability as a method-performance factor, not a personnel-qualification requirement

Q2(R2) discusses analysts only inside its treatment of **intermediate precision**, which is a property of the *method's* performance, not a qualification status of the *person*:

> "3.3.2.2 Intermediate Precision — The extent to which intermediate precision should be established depends on the circumstances under which the procedure is intended to be used. The applicant should establish the effects of random events on the precision of the analytical procedure. **Typical variations to be studied include different days, environmental conditions, analysts and equipment, as relevant.** Ideally, the variations tested should be based on and justified by using analytical procedure understanding from development and risk assessment (ICH Q14). Studying these effects individually is not necessary."

And in the glossary:

> "INTERMEDIATE PRECISION — Intermediate precision expresses intra-laboratory variations. Factors to be considered should include potential sources of variability, for example, different days, different environmental conditions, different analysts and different equipment. (ICH Q2)"

The direction of the logic is the reverse of what a qualification-gate would need: intermediate precision studies are run **during method validation** to demonstrate that the method's result is robust *despite* analyst-to-analyst variation, not to certify that a *given* analyst is competent on a *given* method. An analyst appears here as one input variable alongside equipment and environmental conditions — a factor whose effect on the number the method produces is characterised once, at validation, not a status that is checked at the point of every assignment.

**System suitability**, per Q2(R2)'s glossary (itself quoting ICH Q14):

> "SYSTEM SUITABILITY TEST (SST) — System suitability tests are developed and used to verify that the measurement system and the analytical operations associated with the analytical procedure are fit for the intended purpose and increase the detectability of unacceptable performance. (ICH Q14)"

This defines SST's object as "the measurement system and the analytical operations" — instrument and process — not the analyst by name. Insofar as it is a same-day check that the system-plus-operator combination is producing correct results, it functions as a **proxy for correct execution on the day**, but the text does not frame it as, or substitute for, analyst qualification.

**Term-occurrence check.** "Qualifi-" occurs in Q2(R2) but never in the sense of *personnel* qualification for a method: every hit is either "qualified individuals" absent (not found — see below), instrument qualification (line 1380: "Confirmed by an appropriate instrument qualification"), or the general verb "to determine the suitability of an analytical procedure." **"Competen-" occurs zero times in Q2(R2).** "Re-qualif-"/"requalif-" occurs zero times.

**Conclusion for Q2(R2):** it acknowledges analyst identity as a real source of result variability (intermediate precision) and requires that variability be *characterised in the method's validation*, but it contains **no requirement that an individual analyst be qualified to a specific method**, and **no requirement to re-qualify analysts when a method changes.** A method change instead re-triggers the *method's own* precision/robustness characterisation, addressed in the next finding.

---

### 3. ICH Q14 — Analytical Procedure Development: "skilled analyst" as a drafting standard, not a qualification credential

Q14 uses the phrase "analyst" exactly twice, both describing the **level of detail the written procedure must contain**, not a qualification the person must hold:

> "The analytical procedure should describe the steps necessary to perform each analytical test... The level of detail should enable **a skilled analyst** to perform the analysis and interpret the results (such as the level of detail in a regional pharmacopoeia for a similar product)."

> "The analytical procedure should describe the steps in sufficient detail for **a skilled analyst** to perform the analysis (including SST) as elaborated in section VI (6)."

"Skilled analyst" here is a drafting yardstick for the procedure document (how much detail is enough), addressed to whoever writes the method, not a defined qualification tier or a gate on who may perform the test.

Q14's SST discussion (in the section on the analytical procedure control strategy) again frames system suitability as verifying "the measurement system and the analytical operations associated with the analytical procedure," "fit for the intended purpose during the time period of analysis" — a same-day performance check on the system/operation combination, not a personnel record.

**Term-occurrence check on Q14.** "Analyst" occurs **exactly 3 times** (the two quoted above, plus a third occurrence of the same "different analysts" glossary language reproduced from Q2). **"Qualifi-" occurs zero times. "Competen-" occurs zero times. "Retrain-"/"re-train-" occurs zero times. "Requalif-" occurs zero times.**

**Conclusion for Q14:** it does not address analyst qualification, analyst-to-analyst variability as a personnel matter, or any personnel consequence of a procedure revision, at all. Everything Q14 says about "skilled analyst" is about how detailed the written procedure must be, which is the opposite direction from a qualification-check requirement.

---

### 4. FDA, *Analytical Procedures and Methods Validation for Drugs and Biologics*, July 2015 — revalidation and transfer are procedure-and-laboratory events, not analyst-qualification events

**§IV, Content of Analytical Procedures** — the one place the document invokes "a competent analyst," and again it is a drafting-detail standard for the written procedure, not a personnel qualification clause:

> "You should describe analytical procedures in sufficient detail to allow a competent analyst to reproduce the necessary conditions and obtain results within the proposed acceptance criteria."

**Revalidation (§ "A. Revalidation")** — triggered by changes to the *procedure* or *process*, with no personnel-side consequence stated:

> "If a risk-based evaluation or other drivers lead to changes in an analytical procedure or replacement with a new method or if the procedure is transferred to a new testing site; revalidation, a new validation exercise, an analytical method comparability study, or a combination of these exercises should be considered... When a change is made to an analytical procedure (e.g., a change in a piece of equipment or reagent or because of a change in manufacturing process or formulation), revalidation of all or part of the analytical procedure should be considered... You should revalidate to ensure that the analytical procedure maintains its critical performance characteristics (e.g., specificity, precision, accuracy). The degree of revalidation depends on the nature of the change."

Every noun revalidation is stated to protect is a property of the *procedure* — "specificity, precision, accuracy" — never a property or status of the analyst. Nothing in this section requires, or even mentions, re-qualifying, re-training, or re-assessing the analysts who will run the revised procedure.

**Analytical Methods Transfer Studies (§B.2)** — transfer is explicitly a **laboratory-to-laboratory**, not analyst-to-analyst, exercise:

> "Analytical method transfer is typically managed under a transfer protocol that details the parameters to be evaluated in addition to the predetermined acceptance criteria that will be applied to the results. **Transfer studies usually involve two or more laboratories or sites** (originating lab and receiving labs) executing the preapproved transfer protocol. A sufficient number of representative test articles (e.g., same lot(s) of drug substance or drug product) are used by the originating and receiving laboratories. The comparative studies are performed to evaluate accuracy and precision, especially with regard to assessment of interlaboratory variability... The USP General Chapter <1224> Transfer of Analytical Procedures provides additional guidance on this topic."

Note precisely what is compared: "originating and receiving laboratories," "interlaboratory variability." The unit of comparison is the **site/laboratory**, not the individual analyst. The document names no analyst-level pass/fail criterion, no analyst training record, and no analyst re-qualification step as part of a transfer. It points onward to **USP <1224>**, which this scout did not and could not read (see "What I could not establish," below) — so whether <1224> itself descends to analyst-level demonstration is unresolved by this search.

**System Suitability (§H)**, same framing as Q2(R2)/Q14 — a check on the "system," not the analyst:

> "Confirmatory test(s) procedures and parameters to ensure that the system (equipment, electronics, and analytical operations and controls to be analyzed) will function correctly as an integrated system at the time of use... For system suitability of chromatographic systems, refer to the FDA guidance for industry on Validation of Chromatographic Methods and USP General Chapter <621> Chromatography."

**Term-occurrence check on the July 2015 guidance.** "Analyst" occurs exactly once, in the "competent analyst" sentence quoted above (§IV). "Competen-" occurs exactly once, in that same sentence. **"Requalif-" occurs zero times. "Retrain-"/"re-train-" occurs zero times.** "Qualifi-" occurs repeatedly, but every occurrence found is about equipment, instrumentation, reference standard lots, or reference material — e.g., "All required qualified equipment and components," "Qualified optimal settings and ranges," "A new batch of reference standard material (official or in-house) should be qualified/calibrated," "using qualified instrumentation." None ties the word "qualified" to an analyst or a person anywhere in this document.

**Conclusion for the July 2015 guidance:** revalidation is triggered by changes to the method/process and is evaluated against the method's own performance characteristics; transfer is a laboratory-to-laboratory comparability exercise. **Neither event, as described in this guidance, has any stated personnel-qualification consequence.** The document never uses "analyst" in the context of a qualification, competence record, or re-qualification trigger — its one use of "analyst" is a drafting-detail standard for how the written procedure must read.

---

### 5. Term-occurrence summary (the literal counts requested)

| Term | ICH Q7 (Sept 2016) | ICH Q2(R2) (Nov 2023) | ICH Q14 (FDA, Mar 2024) | FDA methods validation (Jul 2015) |
|---|---|---|---|---|
| "analyst" | **0** | multiple (intermediate-precision context only) | 3 (all "skilled analyst," drafting-detail context) | 1 ("competent analyst," drafting-detail context) |
| "qualifi-" | multiple, but only for personnel-in-general (§3.1) or equipment/materials (§11–12); never analyst+method together | multiple, all instrument/procedure-suitability context; zero for personnel | **0** | multiple, all equipment/reference-material context; zero for personnel |
| "competen-" | **0** | **0** | **0** | 1 (the "competent analyst" drafting-detail sentence) |
| "re-qualification" / "requalif-" | 1 (§11.19, reference standard batch — not personnel) | **0** | **0** | **0** |
| "retraining" / "re-train-" | **0** | **0** | **0** | **0** |

The zero-counts are, as instructed, findings in their own right: **none of the four documents contains the phrase "re-qualification" or "retraining" applied to a person, anywhere.** The one "requalification" hit across all four documents (Q7 §11.19) is about a reference standard batch. **"Competen-" is absent from three of the four documents** and appears once in the fourth, in a sentence about how detailed a written procedure must be, not about certifying a person.

---

### 6. System suitability as a same-day performance proxy

All three ICH/FDA sources that address system suitability (Q2(R2), Q14, and the July 2015 guidance) describe it as verifying **"the system"** — defined explicitly in the July 2015 guidance as "equipment, electronics, and analytical operations and controls" and in Q14/Q2(R2) as "the measurement system and the analytical operations associated with the analytical procedure" — functioning correctly "at the time of use" / "during the time period of analysis." None of the three names the *analyst* as the object being verified, and none states that a passing SST demonstrates or substitutes for analyst competence. Whether an operating laboratory *treats* a passing SST as informal evidence that the analyst-plus-system combination worked that day is a practice question these sources do not settle either way — they define the object of the test as the system, not the person.

---

## What I could not establish

1. **USP General Chapter <1224>, "Transfer of Analytical Procedures," and <1225>.** Both are cited by name in the July 2015 FDA guidance as the authority for transfer-study content, and could plausibly be the place ICH/FDA-adjacent literature descends to analyst-level competence demonstration. **These chapters are paywalled** — I did not access them and have not paraphrased their content from any secondary source (e.g., blog posts, training-vendor summaries). This scout's finding that "transfer is laboratory-to-laboratory, not analyst-to-analyst" is established only from the FDA guidance's own text, which explicitly frames transfer as an interlaboratory exercise, not from having read <1224> itself. It is possible <1224> contains analyst-specific transfer requirements that the FDA guidance does not surface; this search cannot rule that out.

2. **Whether "periodically assessed" training (ICH Q7 §3.12) has ever been interpreted by FDA, in an inspection observation, warning letter, or guidance, to require assessment tied to a specific method version.** Q7's text leaves "periodically assessed" completely undefined as to interval, trigger, or scope, and none of the four documents searched addresses how that clause is applied in practice. I did not search FDA Form 483s or warning letters for this ticket; that is a different evidentiary category (enforcement history, not primary regulatory text) and was out of scope for this search.

3. **Whether any ICH or FDA source, anywhere, uses the phrase "method-specific qualification" or an equivalent term of art for analysts.** Across all four documents, one hundred percent of the sentences discussing "qualified" + a professional context are about equipment, reference materials, or personnel-in-general ("adequate number of personnel qualified by appropriate education, training, and/or experience"). I found no instance, in any of the four documents, of a sentence that ties a named analyst's qualification status to a named, specific analytical procedure or procedure version. I treat this as a well-supported absence (per the term-occurrence table above), not as a settled negative for the entire universe of FDA/ICH text — there may be other FDA guidances (e.g., on OOS, on data integrity, or on specific technology types) not in this search's scope that use the phrase.

4. **The precise identity of the document at `fda.gov/files/.../Q7-....pdf`.** It self-identifies as "Revision 1," "September 2016." I did not cross-check the FDA guidance-search database for a more recent reissue of the same document (the guidance-search URL I tried for Q7 returned HTTP 404), so I cannot rule out that a newer FDA reissue exists. I report the version I actually read.

---

## Sources

1. **ICH Q7, *Good Manufacturing Practice Guidance for Active Pharmaceutical Ingredients*, Guidance for Industry.** FDA/CDER/CBER. Cover page: **September 2016, Revision 1, ICH**. PDF: `https://www.fda.gov/files/drugs/published/Q7-Good-Manufacturing-Practice-Guidance-for-Active-Pharmaceutical-Ingredients-Guidance-for-Industry.pdf`. Fetched 2026-09-11.
2. **ICH Q2(R2), *Validation of Analytical Procedures*, ICH Harmonised Guideline.** **Final Version, Adopted on 1 November 2023.** PDF: `https://database.ich.org/sites/default/files/ICH_Q2(R2)_Guideline_2023_1130.pdf`. Fetched 2026-09-11.
3. **ICH Q14, *Analytical Procedure Development*, Guidance for Industry.** FDA/CDER/CBER. Cover page: **March 2024, ICH-Quality**. PDF: `https://www.fda.gov/media/161202/download`. Fetched 2026-09-11.
4. **FDA, *Analytical Procedures and Methods Validation for Drugs and Biologics*, Guidance for Industry.** FDA/CDER/CBER. Cover page: **July 2015**. PDF: `https://www.fda.gov/media/87801/download`. Fetched 2026-09-11.
5. **USP General Chapters <1224> Transfer of Analytical Procedures and <1225> Validation of Compendial Procedures — NOT READ, PAYWALLED.** Cited by name in source 4 (§B.2) but not independently accessed; no content from these chapters appears anywhere in this document, directly or via secondary sources.
