# SOP-004 — Worksheet completion and calculation

> **Provenance: `archetype-assumed`** — synthetic document, no real laboratory content.
> **Resolution:** build-ready · **References:** 21 CFR 211.194(a), 211.68(b); FDA Data Integrity Q&A (2018) Q1–Q3, Q7; PIC/S PI 041-1 §8

## Purpose

To record the execution of an analytical determination and the arithmetic that
converts raw observations into a reportable result.

## Scope

All determinations performed under an assignment issued by SOP-003.

## Roles

| Role | Responsibility |
| --- | --- |
| Analyst | Executes the method, records raw data, performs and records the calculation |
| Second-person reviewer | Verifies the worksheet under SOP-005 |

## Procedure

1. Obtain the current **worksheet** for the method version assigned. Worksheets are
   controlled forms issued against the method version; a worksheet from a superseded
   version must not be used.
2. Record, contemporaneously and in indelible ink: date, analyst, equipment
   identifiers, reference standard and reagent lot identifiers (SOP-007), and
   environmental conditions where the method requires them.
3. Record **raw data at the point of generation**. Instrument printouts are signed,
   dated, and attached to the worksheet; the printout is the raw data and the
   worksheet entry is a transcription of it. Both are retained.
4. Where the instrument produces an electronic record, the electronic record is the
   raw data. A printout alone is not a complete record where the electronic system
   retains integration parameters, audit trail, or reprocessing history.
5. Record **all** determinations performed, including those the analyst believes to
   be invalid. A determination is never discarded at the bench. An observation
   judged invalid is retained, annotated, and referred under SOP-006.
6. Perform the calculation stated in the method version. Record the formula used,
   the input values, and the unrounded outcome.
7. Apply the rounding rule from the specification **once**, at the final step, and
   record the reportable value. Do not round intermediate values.
8. Compare the reportable value to the specification snapshot carried by the sample.
   Where the value is outside the limit, **stop and initiate SOP-006 before
   proceeding.** Do not repeat the determination, adjust the calculation, or
   re-integrate in search of a conforming value.
9. Corrections use a single strike-through leaving the original legible, with the
   correct entry, the reason, the initials and the date. Never obliterate,
   overwrite, or use correction fluid.
10. Sign the worksheet and submit the package to review.

## Records produced

| Record | Form | Held by |
| --- | --- | --- |
| Analytical worksheet | Controlled form issued against the method version | Sample worksheet package |
| Instrument printout | Attached and signed | Sample worksheet package |
| Instrument electronic record | Held in the instrument data system | Instrument data system |
| Calculation record | Section of the worksheet, or an attached calculation sheet | Sample worksheet package |

## Signatures and what they mean

| Step | Signed by | Meaning of the signature |
| --- | --- | --- |
| 3 | Analyst, on each printout | *This printout is the raw output of the determination I performed on the date stated.* |
| 10 | Analyst | *I performed this determination according to the method version named, I recorded everything I observed, and the reportable value is the outcome of the recorded calculation.* This attests to **completeness** as well as correctness — it asserts that no determination has been omitted. |

## Storage

Worksheet packages are filed by laboratory number. Electronic instrument records
remain in the instrument data system and are referenced from the worksheet, not
transcribed into it.

## Where a spreadsheet appears today

The calculation. Almost universally. A workbook takes the printout values, applies
the formula, and returns the reportable value — and the analyst transcribes that
value onto the worksheet by hand. The workbook is typically **unlocked, unversioned,
uncalculated-by-anyone-else, and stored on a shared drive**. It performs a
GxP-relevant calculation and is not validated, not access-controlled, and carries no
audit trail. This is the largest single data-integrity exposure in the archetype.

## Data contract with the result spine

The spine consumes `(assignment, raw observations, formula, unrounded outcome,
rounding rule, reportable value, conformance verdict)` and must retain **every**
determination, including invalidated ones, with its relationship to the others. The
conformance verdict is computed by the spine from the sample's specification
snapshot, never entered by the analyst. A provenance seam must exist that points at
the instrument's electronic record without copying it.
