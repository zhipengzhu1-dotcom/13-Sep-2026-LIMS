# Handoff: independent prototype assessment

Date: 2026-09-11

## Purpose and authorization

The user requested an honest assessment of this repository as a prototype for digitalizing their laboratory, then asked to save that opinion for another session. This document preserves the assessment and its evidence. It does not authorize implementation of the recommendations.

The user explicitly requested a new folder under `docs`; that location overrides the handoff skill's default temporary-directory destination.

## Assessment delivered to the user

**Benchline is a credible early workflow prototype with a sound engineering foundation. It demonstrates sample tracking and review well, but does not yet capture enough analytical work to digitalize the laboratory end to end.**

| Area | Assessment |
| --- | --- |
| Sample receipt through result review | Working, coherent prototype |
| Record history and workflow safeguards | Strong foundation |
| Representation of actual laboratory work | Substantially simplified |
| Shared, day-to-day operation | Not ready |
| Foundation worth extending | Yes |

The strongest feature is the centralized workflow engine and its meaningful persistence tests. Existing safeguards are implemented behavior, not merely UI promises. See [architecture](../architecture.md), [workflow implementation](../../src/laboratory/laboratory.ts), and [workflow tests](../../tests/laboratory.test.ts) for the rules rather than treating this handoff as another specification.

The main product weakness is that the application records the **destination of an analysis more than the analysis itself**. Staff would still perform much of the work elsewhere and transcribe the outcome into Benchline. The current model's most consequential limitations are sample-level assignment, scalar results, hardcoded methods/specifications, and exceptions without an operational completion path. Physical sample tracking and final report issuance are also thin or absent. Details already exist in [next steps](../next-steps.md) and [assumption analysis](../synthetic-sops/assumption-analysis.md).

Those documents identify useful hypotheses; synthetic SOPs do not establish actual staff workflow. No real SOP reconciliation or staff observation was performed in this review.

## Additional engineering findings

1. **Workspace reads are unbounded.** `Laboratory.snapshot()` reads every sample document and all activity; the UI reloads this snapshot after successful commands. As histories accumulate, payload and rendering costs need measurement and eventually bounded queries. No scale benchmark was run, and the review did not establish SQLite itself as a bottleneck.
2. **Possible duplicate receipt after refresh failure.** In `App.execute()` in [src/main.tsx](../../src/main.tsx), a successful command followed by a failed workspace reload returns `false`. The intake callback therefore leaves the form open, and the save control becomes available again. A resubmission could create another sample because receipt has no idempotency key. This is a source-inspection finding, not a browser-reproduced bug. Verify the failure path before choosing a fix.
3. **The automated baseline is useful but limited.** Passing tests do not establish multiuser reliability, backup recovery, or complete browser workflow correctness. Demo identities and missing backup/restore remain barriers to shared use. See the repository's documented scope rather than inferring operational or regulatory readiness.

## Product recommendation

Pause further 3D refinement and prioritize one representative sample type handled completely with fictional data modeled on the actual process. The explorer is sensibly optional and isolated, but additional visual refinement currently contributes less than a complete analytical worksheet, test-level assignment, or reliable report generation.

Have a coordinator, analyst, and reviewer walk through that representative workflow. Record every point where they leave the application, repeat an entry, or invent a workaround. The next milestone should demonstrate reduced work and preservation of required information, rather than simply add more screens.

This was advice, not a user-approved build sequence. Preserve the existing constraint that real SOPs and sensitive laboratory records stay outside the repository.

## Verification and limits

- Reviewed repository source, architecture, tests, next-step documents, and synthetic assumption analysis, including the current uncommitted explorer work.
- Ran `npm run check`: production build and **19 tests passed**. Build emitted nonfatal dependency annotation warnings and an optional explorer chunk-size advisory.
- Fresh browser inspection was unavailable: the computer-use tool reported no available browser. UI conclusions came from source inspection. Prior browser evidence is in [explorer verification](../explorer-verification.md); it was not repeated in this review.
- A local HTTP probe could not connect; an attempted `npm run dev` then exited because ports 5173 and 24678 were occupied. No server was successfully started by the review. This does not establish an application defect.
- No application source was changed or committed during the review. The check regenerated build output. This handoff is the requested documentation addition.
- The worktree already contained modified tracked files and untracked explorer, test, documentation, and scratch files. Treat those as pre-existing work; inspect `git status` before any edits and do not discard them.
- No external regulatory or software-market research was performed. This assessment concerns the repository's implemented behavior and documented scope.

## Suggested skills

- **codebase-design**: required by repository instructions if the next session changes module interfaces, particularly assignment or result commands.
- **domain-modeling**: required when changing laboratory terminology; useful for clarifying observations, calculations, reportable results, retests, and investigations.
- **diagnosing-bugs**: use if investigating the save-success/refresh-failure path described above.
- **handoff**: use if transferring further decisions to another session.

Read [AGENTS.md](../../AGENTS.md), [CONTEXT.md](../../CONTEXT.md), and [architecture](../architecture.md) before changing behavior. Keep workflow invariants in the laboratory module and follow the repository's required checks. Do not apply the throwaway `prototype` workflow to this extensible application.

## How the next session should use this

Use this as an independent opinion and a starting point for discussion. Distinguish implemented capabilities, documented future intentions, and recommendations. If the user asks to proceed, select the next bounded increment around their actual bottleneck; do not interpret the handoff as approval for a broad rewrite or shared deployment.
