# Where the prototype's assumptions break

Derived from the synthetic SOP set in this directory, against the six assumptions
in `docs/next-steps.md` and the module described in `docs/architecture.md`.

> **This file survived the 2026-09-11 destination change.** The synthetic SOP set
> around it was written to source a validation URS, which is now deferred. This
> analysis is retained because every contradiction below is a **capacity or data-model**
> problem as much as a compliance one — it bites at 20 users and 1000 samples/month
> regardless of whether anyone validates the system.

## The six assumptions

| # | Prototype assumes | The archetype requires | Bites at scale? | Cost to correct |
| --- | --- | --- | --- | --- |
| 1 | One sample belongs to one client and batch | A submission may carry **multiple containers** under one laboratory number, each with a container index and its own chain-of-custody line (SOP-001 §5, §7) | **Yes.** 1000 samples/month with multi-container submissions is a different row count and a different unique key | Schema change; additive |
| 2 | One assigned analyst per sample | Assignment is **per test**, not per sample. One sample carries tests assigned to different analysts, on different days, on different instruments, with superseded assignments retained (SOP-003 §1, §7) | **Yes — the sharpest one.** 20 analysts cannot share a per-sample assignment model; it serialises the lab | **High.** Breaks the `assign` command's shape and the work-queue view |
| 3 | Numeric value and supporting reference | Replicates, an unrounded outcome **and** a rounded reportable value, the formula and its inputs, invalidated determinations retained in place, and a pointer to the instrument's electronic record (SOP-004 §5–§7) | **Yes.** Result rows multiply by the replicate factor | **High.** Result becomes a small aggregate, not a scalar |
| 4 | Illustrative method limits copied at receipt | The **snapshot is right**; what is missing is the controlled `(method, version, effective date, specification)` behind it, plus the rounding rule travelling with the limit (SOP-002 §2, §8) | Moderately | Additive — the snapshot seam already exists |
| 5 | Separate analyst and reviewer roles | Correct in shape. Missing: the reviewer's own qualification check, and evaluation of standard/reagent/calibration status **as at the determination timestamp** rather than as at review time (SOP-005 §1, §4) | **Yes.** Temporal status queries are the expensive kind | Moderate; requires temporal status |
| 6 | Any OOS history blocks routine approval | Too blunt. The archetype needs `investigation`, `disposition` and `invalidated-with-cause` as first-class states, and a retest plan whose approval timestamp precedes the first retest (SOP-006 §4, §7, §10) | At volume, a permanent hard block accumulates stuck samples | **High.** New entity and new states |

## What this means for the rerouted map

Three of the six — **per-test assignment**, **results as aggregates**, and
**investigation as an entity** — are structural. They change the shape of
`Laboratory.execute()`'s command vocabulary, not just the tables beneath it. They
are cheapest to take **before** the persistence and concurrency work, not after,
because the row counts they imply are what that work has to size for.

The honest number: assumption 2 alone turns one assignment row per sample into one
per test. At 1000 samples/month with a conventional test panel, that is the
difference between ~12k and ~60–100k rows a year on that table alone — before
assumption 3 multiplies result rows by the replicate factor.

## What was not produced

The end-to-end paper walkthrough of one synthetic sample, and SOPs 007–013, were
in scope for the validation destination and were not written. See
[README](README.md#status).
