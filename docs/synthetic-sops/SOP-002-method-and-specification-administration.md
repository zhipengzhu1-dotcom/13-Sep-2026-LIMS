# SOP-002 — Method and specification administration

> **Provenance: `archetype-assumed`** — synthetic document, no real laboratory content.
> **Resolution:** build-ready · **References:** 21 CFR 211.160(a), 211.165(e), 211.194(a)(2); ICH Q2(R2); USP <1224>–<1226>
> **This is the workflow selected for first digitisation.** See [README](README.md#method-and-specification-administration-is-digitised-first).

## Purpose

To keep every analytical method and its associated acceptance criteria under
change control, so that a result can always be traced to the exact criteria in
force when the sample was received.

## Scope

All analytical methods used to generate reportable results, and the specifications
associated with them. Includes compendial methods adopted by the laboratory,
methods transferred in, and methods developed in-house.

## Roles

| Role | Responsibility |
| --- | --- |
| Method owner | Authors and revises the method; owns its technical content |
| Laboratory supervisor | Confirms the method is executable as written and that qualified analysts exist |
| Quality Assurance | Approves the method version and its effective date |

## Procedure

1. A method exists as a numbered document with a **version**. A version is never
   edited once effective. A change produces a new version.
2. Each method version carries its **specification**: for each reportable test, the
   acceptance limits, the unit, the reporting precision, and the rounding rule
   applied before comparison to the limit.
3. The specification states, for each limit, whether it is a **release** limit, a
   **shelf-life** limit, or an **alert/action** limit. A result may be within one
   and outside another; the sample's context determines which applies.
4. To revise a method: the method owner raises a change request stating the change,
   the reason, and the impact on results already reported.
5. Assess whether the change requires re-validation or partial re-validation per
   ICH Q2(R2), and whether analysts must be re-qualified per SOP-008. Record the
   assessment.
6. The method owner signs the draft. The laboratory supervisor signs the
   executability review. Quality Assurance signs approval and **sets the effective
   date**, which is never earlier than the approval date.
7. On the effective date the new version supersedes the prior version. The prior
   version is withdrawn from use and retained.
8. Samples **already received** against the prior version continue to be judged
   against the specification snapshot taken at receipt (SOP-001 step 6). The new
   version applies only to samples received on or after its effective date.
9. Where a revision changes an acceptance limit in a way that would alter the
   disposition of results already reported, **stop** and raise an investigation
   under SOP-006 before the version becomes effective.
10. Maintain a method index showing, for every method, the effective version, its
    effective date, the superseded versions, and their withdrawal dates.

## Records produced

| Record | Form | Held by |
| --- | --- | --- |
| Method document, one per version | Controlled document, watermarked copy at point of use | Quality Assurance master file |
| Specification sheet | Appendix to the method version | Filed with the method version |
| Method change request | Numbered change-control form | Quality Assurance |
| Re-validation assessment | Attachment to the change request | Quality Assurance |
| Method index | Single controlled register | Quality Assurance |

## Signatures and what they mean

| Step | Signed by | Meaning of the signature |
| --- | --- | --- |
| 6 | Method owner | *I authored this version and it is technically correct.* The limits stated are justified by the validation data referenced. |
| 6 | Laboratory supervisor | *This method can be executed as written in this laboratory*, with the equipment and reference standards available, by analysts who are qualified or can be qualified. |
| 6 | Quality Assurance | *This version is approved and becomes effective on the date I have set.* This signature creates the controlled state; before it the version has no force. |
| 9 (exception) | Quality Assurance | *I have assessed the impact on previously reported results and authorise the investigation outcome.* |

## Storage

Approved method versions are held in the Quality Assurance master file. Point-of-use
copies are watermarked, numbered, and reconciled on withdrawal. Superseded versions
are retained, marked superseded, and never returned to the bench.

## Where a spreadsheet appears today

The method index is a workbook. So is every specification — limits are held as cells
alongside the rounding rule, and the rounding is frequently applied by a formula
rather than stated in prose. **The workbook is the de facto specification of record
even though the approved document is the controlled artifact.** This is the single
most consequential spreadsheet in the laboratory.

## Data contract with the result spine

The spine consumes an immutable `(method, version, effective date, specification)`
tuple, and stores a **snapshot** of it against each sample at receipt. The spine
must never resolve a sample's limits by looking up the *current* version. Rounding
precision travels with the specification, because a result's conformance depends on
it: a limit of NLT 98.0% and a reported value of 97.96% conform or do not conform
according to the rounding rule alone.
