# SOP-003 — Analyst assignment

> **Provenance: `archetype-assumed`** — synthetic document, no real laboratory content.
> **Resolution:** build-ready · **References:** 21 CFR 211.25(a), 211.194(a)(7)–(8)

## Purpose

To assign analytical work to analysts who are qualified for the method, and to
record who was responsible for each determination.

## Scope

All testing performed on samples logged under SOP-001.

## Roles

| Role | Responsibility |
| --- | --- |
| Laboratory supervisor | Assigns tests, confirms qualification and capacity |
| Analyst | Accepts the assignment and performs the testing |

## Procedure

1. Work is assigned **per test**, not per sample. A single sample may carry tests
   assigned to several analysts, on different days, using different instruments.
2. Before assigning, confirm from the qualification register (SOP-008) that the
   analyst holds a current qualification for the **method version** in force for
   that test. An expired or suspended qualification blocks assignment.
3. Confirm the reference standards and reagents required are available, in date,
   and released for use per SOP-007.
4. Confirm the required equipment is within its calibration interval per SOP-010.
5. Record the assignment: laboratory number, test, method version, analyst,
   assignment date, and due date.
6. The analyst acknowledges the assignment before beginning work.
7. Reassignment during execution — analyst unavailable, qualification lapsed
   mid-run, equipment failure — is recorded as a new assignment with the reason.
   The original assignment is **not** erased or overwritten.
8. Where a test must be repeated, the repeat is a distinct assignment carrying its
   own justification and its relationship to the original determination.

## Records produced

| Record | Form | Held by |
| --- | --- | --- |
| Test assignment record | Assignment sheet, one per sample, multiple rows | Filed with the sample's worksheets |
| Laboratory workload schedule | Whiteboard, transcribed weekly into a workbook | Laboratory supervisor |

## Signatures and what they mean

| Step | Signed by | Meaning of the signature |
| --- | --- | --- |
| 5 | Laboratory supervisor | *I assign this test to this analyst.* I have confirmed qualification, standards, reagents and equipment status at the time of assignment. |
| 6 | Analyst | *I accept this assignment.* I am qualified for this method version and I will perform this determination. |
| 7 (exception) | Laboratory supervisor | *I have reassigned this test and recorded why.* |

## Storage

Assignment records are filed with the sample's worksheet package under the
laboratory number.

## Where a spreadsheet appears today

The workload schedule lives on a whiteboard and is transcribed weekly into a
workbook. Neither is a controlled record; the assignment sheet is. The workbook is
what the supervisor actually manages the laboratory from, and it carries due-date
and capacity information that exists nowhere in the record.

## Data contract with the result spine

The spine must model assignment at **test granularity** with a many-to-one
relationship to the sample, and must retain superseded assignments rather than
overwriting them. Each assignment binds `(laboratory number, test, method version,
analyst, timestamp)` and asserts a qualification check against SOP-008 at bind time.
