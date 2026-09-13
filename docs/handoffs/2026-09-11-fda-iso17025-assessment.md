# Handoff: Benchline laboratory system assessment

## Purpose and user intent

The user asked for an opinion on their current project and what a modern analytical chemistry laboratory electronic management system should have to support FDA and ISO/IEC 17025 requirements. They then requested this handoff so another session can read the proposal.

This was a read-only assessment of application code and documentation, with build/test verification and current-source research. No application changes, requirements approval, deployment, or implementation were requested or completed. The proposed roadmap is advice, not an accepted implementation specification or a compliance determination.

## Project context and existing artifacts

The project is Benchline, an extensible local pharmaceutical analytical laboratory prototype. In the next session, select its repository as the workspace. Paths below are relative to that repository; personal filesystem identifiers are deliberately omitted.

Read these rather than recreating their content:
- `AGENTS.md`: repository constraints and skill requirements.
- `CONTEXT.md`: laboratory vocabulary; review is distinct from manufacturing batch release and activity records are distinct from electronic signatures.
- `docs/architecture.md`: public module interface, existing protections, extension seams, and deliberate limits.
- `README.md`: implemented workflow and local-use restrictions.
- `docs/next-steps.md`: existing candidate increments, not approved requirements.
- `docs/synthetic-sops/assumption-analysis.md`: already documents structural gaps involving per-test assignment, richer results, controlled versions, and investigations.
- `docs/synthetic-sops/README.md`: consult before using synthetic SOPs; they are not the user's actual approved laboratory procedures.
- `src/laboratory/laboratory.ts`, `src/laboratory/contracts.ts`, `server/http.ts`, `server/main.ts`: reviewed implementation.
- `tests/laboratory.test.ts` and `tests/http.test.ts`: workflow and API verification.

## Assessment delivered to the user

The project has a sound workflow foundation but is not ready to manage regulated laboratory records. Its existing safeguards are worth preserving; see the architecture and implementation references above for details.

The assessment assumed pharmaceutical drug QC because that is the repository's stated domain. The user's actual regulatory scope, product types, accreditation scope, laboratory procedures, and intended electronic-record use remain unconfirmed. Applicable FDA predicate requirements and Part 11 must be assessed together. ISO/IEC 17025 addresses the laboratory's competence, impartiality, and consistent operation; software alone cannot establish compliance or accreditation.

The central product recommendation: make every reported result defensible through linked evidence of who performed the work, which approved procedure applied, what generated the data, and why the result was accepted.

Recommended capability coverage (recommendations, not a claim that regulations require separate software modules):
1. Authenticated identities, account lifecycle, authorization, sessions, and separation of responsibilities.
2. Protected audit trails and documented review; electronic signatures where used, bound to the exact record version with identity, time, and meaning.
3. Complete sample lifecycle including condition, quantities, containers, aliquots, custody, storage, holding times, and disposal; barcodes as an efficiency improvement.
4. Controlled methods and product specifications, effective versions, validation/verification evidence, calculations, and rounding rules.
5. Analytical worksheets covering preparation, weights, dilutions, replicates, formulas and inputs, unrounded/reportable values, and retained invalidated determinations.
6. Instrument integrations and original-data provenance, including sequences, acquisition and processing methods, metadata, reprocessing, checked imports, and controlled archival access.
7. Equipment qualification/calibration/maintenance and reagent/reference-standard lots, certificates, preparation, expiry, and use history.
8. Method-specific personnel competence and authorization, including reviewers; per-test assignment.
9. Analytical quality assurance: system suitability, blanks, controls, recoveries, duplicates, trends, proficiency testing and interlaboratory comparisons where applicable.
10. Investigations and quality management: OOS, unexpected/OOT results, nonconforming work, deviations, retest plans, impact assessment, corrective actions, and effectiveness checks.
11. Controlled report/CoA issuance and amendments, preserving original issued versions; applicable uncertainty and conformity statements.
12. System lifecycle controls: intended-use requirements, risk assessment, validation evidence, controlled changes, interface verification, retention, exports, backups, restoration tests, and incident handling.

Additional laboratory management coverage: document control, contract review, suppliers, complaints, confidentiality, impartiality, internal audits, and management review. These may be handled through a connected quality-management system instead of rebuilding them all in Benchline.

## Important distinctions in the proposal

- A PDF chromatogram may not be the complete analytical record. Preserve required original dynamic instrument data and metadata; integrate with the chromatography data system and controlled archive with explicit record ownership.
- Investigations must explain and disposition OOS results without deleting or concealing their history. Preserve current OOS protection while introducing a properly specified investigation workflow.
- Laboratory review approval must remain separate from manufacturing batch release.
- ISO 17025 technical considerations include measurement uncertainty, metrological traceability, and applicable conformity decision rules. A simple numeric range comparison cannot represent every rule. Do not automatically apply uncertainty guard bands to all pharmaceutical specifications; follow the applicable method, specification, and reporting requirements.
- The recommendations are neither a complete clause-by-clause gap assessment nor evidence that the lab meets any standard.

## Proposed development sequence — not yet approved

1. Define one actual workflow with laboratory QA using sanitized receipt, worksheet, review checklist, and report examples; map requirements to software controls, procedures, and verification evidence.
2. Establish identity and record protection: authentication, authorization, protected history, retention, and tested recovery before shared regulated use.
3. Make one analytical method complete: controlled versions, per-test assignment, preparation, replicates, calculations, equipment/material links, and original-data traceability.
4. Complete investigation, review, and controlled report issuance while preserving existing historical-result and approved-record protections.
5. Validate the defined intended use, then expand techniques, integrations, scheduling, and dashboards under controlled change.

The specific suggested next product increment was one complete HPLC assay workflow. The user has not yet selected or authorized its implementation. The next session should use this proposal as discussion context and follow the user's next instruction.

## Verification performed

`npm run check` passed during this session: TypeScript/build succeeded and all 19 tests passed. There were non-fatal dependency annotation and bundle-size warnings. Tests verify current application behavior; they are not regulatory validation. No browser walkthrough, production qualification, or laboratory procedure audit was performed. No source files were edited.

## Sources consulted

Use these primary sources to substantiate and refine requirements; do not treat this summary as a substitute for the applicable regulations or standard.
- ISO/IEC 17025:2017 overview (ISO lists it as current): https://www.iso.org/standard/66912.html
- FDA Part 11 scope and application: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- 21 CFR Part 11: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- 21 CFR 211.194 laboratory records (Cornell reproduction; direct eCFR section retrieval failed): https://www.law.cornell.edu/cfr/text/21/211.194
- FDA final December 2018 data integrity guidance: https://www.fda.gov/media/119267/download
- FDA May 2022 OOS guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/investigating-out-specification-oos-test-results-pharmaceutical-production-level-2-revision
- ILAC guidance series, including G8 decision rules and G17 uncertainty: https://ilac.org/publications-and-resources/ilac-guidance-series/

Research caution: search returned an older draft FDA data-integrity PDF; the final assessment used the 2018 final document linked above. NIST HB 150-2020 was found to be withdrawn/superseded and was not used as current authority. The full ISO standard was not reviewed clause by clause.

## Suggested skills

- `codebase-design`: required by repository instructions when designing or changing module interfaces. Keep invariants in the laboratory module and callers on its public interface; avoid speculative abstractions.
- `domain-modeling`: required when changing laboratory terminology, especially investigations, determinations, assignments, report issuance, and disposition.
- `research`: if the next task is a documented, sourced regulatory or technical investigation; use current authoritative sources and clearly separate requirements from implementation recommendations.
- `grilling`: only if the user asks to stress-test or interrogate the proposed plan.
- `handoff`: if transferring the subsequent session again.

Do not use the throwaway `prototype` workflow for this application. Do not spawn subagents unless the user or applicable skill/repository instructions explicitly request delegation. Respect the repository's local-only deployment restrictions and use fictional/sanitized data.
