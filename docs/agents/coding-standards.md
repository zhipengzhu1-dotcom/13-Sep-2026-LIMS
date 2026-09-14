# Coding standards

Benchline follows Matt Pocock's engineering recommendations, as captured in his skills. This file is the standards source for `/code-review`. Where it is silent, match the surrounding code's naming, idiom and comment density.

## Module design

Call the `codebase-design` skill for the vocabulary (module, interface, depth, seam, adapter, leverage, locality) and use those terms exactly.

- **Deep modules.** Put a lot of behaviour behind a small interface. `src/laboratory/results.ts` is the model: one module owns a Result's life and its OOS investigation; handlers and the workspace ask it questions rather than reimplementing its rules.
- **The deletion test.** A module whose deletion would make complexity vanish is a pass-through; inline it. Keep it only if deleting it spreads complexity across its callers.
- **One adapter is a hypothetical seam.** Don't add a seam, parameter or hook until something actually varies across it.
- **Accept dependencies, don't create them.** Pass in time, id allocation and the audit writer (e.g. `notifiedAt`, `allocate`, `recordingAudit()`), so pure modules stay free of `node:*` and testable.
- **Return results, don't produce side effects.** Refusals come back as structured values (`{ code, reason, investigationId }`), not throws buried in callers.
- **Name things in the domain.** Use `CONTEXT.md` terms in types, functions, tests and UI labels, and respect its Avoid list.

## Tests

Build test-first with the `tdd` skill.

- **Red before green**, one vertical slice at a time: one test, then just enough code to pass it. No speculative features.
- **Test at the interface.** Verify behaviour through the module's public interface, never private functions or the database behind it. A test that breaks under a refactor that kept behaviour was coupled to the implementation.
- **No tautologies.** Expected values come from an independent source: a known literal, a worked example, the spec. Never recompute them the way the code does.
- **Mock only at system boundaries**: time, randomness, the file system, external services. Never mock Benchline's own modules; use the real SQLite store and `recordingAudit()` instead.
- **Test names describe what**, e.g. "an Analyst can't conclude an OOS investigation", not how.
- **No `as` assertions for partial test data.** Build real values; if partial data is genuinely needed, add `@total-typescript/shoehorn` (see the `migrate-to-shoehorn` skill), in tests only, never production code.

## Refactoring

Refactoring is not part of the red → green loop; it happens at review. `/code-review` checks this file and the repo's other agent docs, plus Fowler's code-smell baseline, as judgement calls this file can override.

## Before committing

`npm run build`, `npm test` and `npm run format:check` all pass.
