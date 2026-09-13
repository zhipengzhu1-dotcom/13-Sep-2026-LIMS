# Synthetic SOP set

Source material for the Benchline User Requirements Specification.

> **Provenance: `archetype-assumed`.**
> Every document in this directory is **synthetic**. None of it was derived from,
> transcribed from, or checked against any real laboratory's standard operating
> procedures. The workflows are drawn from published industry references — 21 CFR
> 211 Subparts F, I and J; the FDA 2022 guidance *Investigating Out-of-Specification
> Test Results for Pharmaceutical Production*; USP General Notices and General
> Chapters <1058> and <1224>–<1226>; ICH Q2(R2), Q7 §6 and Q10 — and describe a
> conventional pharmaceutical QC laboratory, not a specific one.
>
> **No file here contains real SOP text, client names, product names, batch
> identifiers, analyst names, or results.** This is a standing constraint of the
> effort ([the map](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/1)),
> not a property of these particular documents.

## Why this exists, and what it is not

The Benchline effort needs a document set rich enough to write requirements from.
The lab's real SOPs are never uploaded to this repository (user decision,
2026-09-10). This set stands in for them **during design and build**.

It is **not** evidence of fitness for intended use. A URS traced to these files is
a URS traced to an industry archetype. See [The reconciliation gate](#the-reconciliation-gate).

## Provenance labels

Each SOP carries one label in its header. In this set **every SOP is
`archetype-assumed`** — the label exists so that later revisions can be promoted
individually as real-world confirmation arrives, and so the count of unconfirmed
documents is always visible.

| Label | Meaning |
| --- | --- |
| `archetype-assumed` | Shape drawn from published references. No confirmation from the deploying laboratory. |
| `lab-confirmed` | A person with access to the real effective SOPs has walked this document against them and recorded the differences. |

Current count: **13 `archetype-assumed`, 0 `lab-confirmed`.**

## Two resolutions

The [map](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/1) scopes the
whole effort at two depths, and this set follows it.

**Build-ready depth** — full procedure: numbered steps, the record produced, who
signs, **what the signature means**, and where the record is stored.

| | SOP | Area |
| --- | --- | --- |
| 1 | [SOP-001](SOP-001-sample-receipt-and-login.md) | Sample receipt and login |
| 2 | [SOP-002](SOP-002-method-and-specification-administration.md) | Method and specification administration |
| 3 | [SOP-003](SOP-003-analyst-assignment.md) | Analyst assignment |
| 4 | [SOP-004](SOP-004-worksheet-completion-and-calculation.md) | Worksheet completion and calculation |
| 5 | [SOP-005](SOP-005-result-review-and-approval.md) | Result review and approval |
| 6 | [SOP-006](SOP-006-oos-and-oot-handling.md) | OOS and OOT handling |
| 7 | [SOP-007](SOP-007-reagent-and-reference-standard-control.md) | Reagent and reference-standard control |
| 8 | [SOP-008](SOP-008-analyst-training-and-qualification.md) | Analyst training and qualification |

**Seam depth** — trigger, record produced, signer, and the **data contract** where
the workflow touches the result spine. No step-by-step procedure.

| | SOP | Area |
| --- | --- | --- |
| 9 | [SOP-009](SOP-009-sample-handling-and-storage.md) | Sample handling and storage |
| 10 | [SOP-010](SOP-010-equipment-calibration.md) | Equipment calibration |
| 11 | [SOP-011](SOP-011-stability-programme.md) | Stability programme |
| 12 | [SOP-012](SOP-012-retain-samples.md) | Retain samples |
| 13 | [SOP-013](SOP-013-certificate-of-analysis-issuance.md) | Certificate of Analysis issuance |

Also in this directory:

- [**walkthrough.md**](walkthrough.md) — one synthetic sample end to end on paper.
  Every hand-off, every signature, every place a spreadsheet appears.
- [**assumption-analysis.md**](assumption-analysis.md) — where the prototype's
  assumptions contradict the archetype, scored by cost to correct.

## Method and specification administration is digitised first

Decided on architectural grounds, not from a measured bottleneck — see
[ticket #4](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/4) for the
full argument and the honest statement of what was substituted for what.

In short: every other candidate workflow produces a result that is judged against a
limit. Benchline today copies *illustrative* limits at receipt. Digitising the
judgment before the criterion is governed yields signed results traced to
uncontrolled specifications — worse than paper, which at least does not imply
governance it lacks. §211.160(a) puts the specification itself under change control.
SOP-002 is therefore the first workflow to build.

## The reconciliation gate

**Before validation — not before building —** a person with access to the real
effective SOPs must walk the URS against them line by line and record every
difference. Under an archetype-only set this is a **redesign risk**, not a
line-by-line confirmation: the URS may prove traced to workflows the deploying
laboratory does not run, and the laboratory's real vocabulary has not been
collected at all.

The gate is owned by
[GAMP 5 categorisation and validation strategy](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/10)
and must appear in its validation deliverables. Its exit criterion is every SOP in
this directory promoted to `lab-confirmed` or superseded, with the differences
recorded.

## Status

**Partial. The effort this set was written for is deferred.**

On 2026-09-11 the map's destination was redrawn from *a cGMP-validated,
distributable laboratory system* to *Benchline carrying the lab's real workload*.
Validation is deferred, not abandoned, and this directory is retained for it.

Written (6 of 13): SOP-001 · SOP-002 · SOP-003 · SOP-004 · SOP-005 · SOP-006 —
the build-ready spine.

Not written: SOP-007 · SOP-008 (build-ready), SOP-009–SOP-013 (seam depth), and the
end-to-end paper walkthrough.

**Carried forward into the live map:** [assumption-analysis.md](assumption-analysis.md).
Everything else here waits for the deferred validation effort.
