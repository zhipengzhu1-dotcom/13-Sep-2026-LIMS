# SOP-006 — Out-of-specification and out-of-trend handling

> **Provenance: `archetype-assumed`** — synthetic document, no real laboratory content.
> **Resolution:** build-ready · **References:** FDA *Investigating Out-of-Specification Test Results for Pharmaceutical Production* (2022); 21 CFR 211.192, 211.194(a); *United States v. Barr Laboratories*

## Purpose

To investigate results outside their acceptance criteria, and to reach a documented
disposition without discarding data.

## Scope

Any reportable result outside its specification snapshot (**OOS**), and any result
within specification but outside the expected pattern for the method, product or
analyst (**OOT**).

## Roles

| Role | Responsibility |
| --- | --- |
| Analyst | Reports the observation immediately; does not repeat the test unprompted |
| Laboratory supervisor | Conducts the Phase I laboratory investigation |
| Quality Assurance | Approves the investigation and the disposition |
| Investigation owner | Conducts Phase II where Phase I is inconclusive |

## Procedure

1. **The analyst stops.** An OOS observation is reported to the supervisor before
   any repeat, re-injection, re-integration, or recalculation. The original
   observation is retained and is part of the record permanently.
2. Initiate a numbered investigation record within one working day.
3. **Phase I — laboratory investigation.** Conducted jointly by analyst and
   supervisor, before any retesting. Examine: the method version and whether it was
   followed; the calculation; standard and reagent identity, lot and in-date status;
   instrument calibration and performance; sample preparation; obvious analyst
   error; the instrument's own records including integration and reprocessing.
4. Where Phase I identifies an **assignable cause**, the original result may be
   **invalidated**. Invalidation requires the assignable cause to be documented and
   approved by Quality Assurance. *The result is not deleted.* It remains on the
   record, marked invalidated, with the cause and the approval.
5. Where Phase I identifies no assignable cause, the result **stands** and Phase II
   begins. A result without an assignable cause is a real result.
6. **Phase II — full-scale investigation.** Extends beyond the laboratory to the
   manufacturing process. Includes a hypothesis, a predefined retest plan, and
   impact assessment on other batches and previously reported results.
7. **Retesting requires a written, approved plan issued before the retesting
   begins**, stating the number of determinations, who performs them, and the
   decision rule applied to the outcome. Retesting to a passing result — testing
   into compliance — is prohibited. Outlier tests may not be used to invalidate an
   OOS result for a chemical determination.
8. Resampling is permitted only where the investigation shows the original sample
   was not representative, and requires its own justification and approval.
9. **Averaging** an OOS result with passing results to obtain a conforming mean is
   prohibited, except where the method itself defines the mean as the reportable
   value — in which case the individual determinations are still reported.
10. Reach a **disposition**: invalidated with assignable cause; confirmed OOS;
    or inconclusive. Record the disposition, the supporting rationale, and any
    CAPA raised.
11. Quality Assurance approves the investigation and the disposition. The result's
    history — including every OOS observation — is retained permanently and is
    reported.
12. **A prior OOS history is never removed because a later determination passes.**

## Records produced

| Record | Form | Held by |
| --- | --- | --- |
| Investigation record | Numbered OOS/OOT investigation file | Quality Assurance |
| Phase I checklist | Attachment to the investigation | Quality Assurance |
| Retest plan | Approved before execution, attached | Quality Assurance |
| Disposition record | Closing section of the investigation | Quality Assurance |
| CAPA record | Raised separately where required | Quality Assurance |

## Signatures and what they mean

| Step | Signed by | Meaning of the signature |
| --- | --- | --- |
| 3 | Laboratory supervisor | *I have opened this investigation on the date stated.* |
| 4 | Quality Assurance | *I approve invalidation of this result on the assignable cause documented.* This is the highest-consequence signature in the laboratory: it removes a result from reporting while leaving it on the record. |
| 7 | Quality Assurance | *I approve this retest plan, in advance of the retesting.* The date of this signature must precede the retesting. |
| 11 | Quality Assurance | *I approve this investigation and its disposition.* |

## Storage

Investigation files are held by Quality Assurance and cross-referenced from the
sample's worksheet package. The sample package carries the investigation number.

## Where a spreadsheet appears today

The OOS log — the register of open investigations, their age, and their due dates.
Also, frequently, the trend data that defines OOT in the first place: control-chart
workbooks maintained per method, which are the *only* basis on which an OOT is
recognised and which are typically neither controlled nor validated.

## Data contract with the result spine

The spine must retain invalidated results as first-class records with their cause
and approval, never as deletions. It must model `investigation` as an entity
referenced by results and samples, carry a `disposition` distinct from conformance,
and enforce that the **retest plan approval timestamp precedes the first retest
determination timestamp**. OOT detection requires the spine to hold historical
result distributions per method — a capability the archetype currently meets with an
uncontrolled workbook.
