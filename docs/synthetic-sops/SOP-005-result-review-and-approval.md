# SOP-005 — Result review and approval

> **Provenance: `archetype-assumed`** — synthetic document, no real laboratory content.
> **Resolution:** build-ready · **References:** 21 CFR 211.194(a)(8), 211.22(a); ICH Q7 §6.6

## Purpose

To subject every reportable result to an independent second-person review before it
leaves the laboratory.

## Scope

All reportable results generated under SOP-004.

## Roles

| Role | Responsibility |
| --- | --- |
| Analyst | Submits the worksheet package; may not review own work |
| Second-person reviewer | Performs the review and approves or returns |
| Laboratory supervisor | Arbitrates disputed returns |

## Procedure

1. The reviewer must be a person other than the analyst who performed the
   determination, and must be qualified for the method version under SOP-008.
   **A person may never review their own work**, in any circumstance, including
   urgency.
2. Verify that the worksheet is the issue belonging to the method version assigned.
3. Verify the completeness of the record: all fields entered, all printouts
   attached and signed, all corrections properly made.
4. Verify the identity, lot and in-date status of every reference standard and
   reagent recorded (SOP-007), and the calibration status of every instrument
   recorded (SOP-010), **as at the date of the determination** — not as at the date
   of review.
5. Re-perform the calculation independently from the raw data. Do not check the
   analyst's arithmetic by inspection; compute it again.
6. Verify that the rounding rule was applied once and at the final step.
7. Verify the conformance verdict against the sample's specification snapshot.
8. Verify that every determination performed appears on the record, including any
   annotated as invalid, and that any out-of-specification observation was referred
   under SOP-006 rather than resolved at the bench.
9. **Approve** — sign and release the result to reporting — or **return for
   correction**, recording the reason. A returned package goes back to the analyst;
   the return and its reason are retained on the record.
10. Approved results are locked. A change to an approved result requires a new
    determination, or an amendment raised under SOP-006 with QA approval. An
    approved record is never edited in place.

## Records produced

| Record | Form | Held by |
| --- | --- | --- |
| Review record | Review block on the worksheet, plus a review checklist | Sample worksheet package |
| Return-for-correction record | Numbered return slip attached to the package | Sample worksheet package |

## Signatures and what they mean

| Step | Signed by | Meaning of the signature |
| --- | --- | --- |
| 9 (approve) | Second-person reviewer | *I independently verified this determination.* I recomputed the result from the raw data, I confirmed the standards, reagents and equipment were fit at the time of the determination, and I confirmed the record is complete. This attests to the **verification**, not to having performed the test. |
| 9 (return) | Second-person reviewer | *I am returning this package for the reason recorded.* The return is itself a record and does not erase the submission. |
| 10 (exception) | Quality Assurance | *I authorise an amendment to an approved result*, on the basis of the investigation referenced. |

> **This is not batch release.** Approval here means the result is verified and may
> be reported. The disposition of the manufactured material is a separate decision,
> made outside the laboratory, by Quality Assurance.

## Storage

Review records stay with the worksheet package under the laboratory number.

## Where a spreadsheet appears today

The review queue. Which packages are awaiting review, for how long, and against
which due date, is tracked in a workbook or on a whiteboard. Nothing in the record
set answers "what is waiting for me."

## Data contract with the result spine

The spine must enforce **analyst ≠ reviewer** as an invariant, not a convention, and
must evaluate standards, reagents and calibration status **as at the determination
timestamp** rather than as at review time — which requires those statuses to be
temporal, not current-state. Approval transitions the result to a locked state.
Returns are retained as records, not as a status reset.
