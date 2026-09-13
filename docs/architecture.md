# Architecture

**Read this first, and read the warning before anything else.**

> ### Built is not decided
>
> This repository contains a **340-line prototype**. The wayfinder map contains **forty-odd resolved decisions** that specify a substantially different and much larger system. **Almost none of those decisions is implemented.**
>
> This document is split accordingly. [What is built](#what-is-built-today) describes code you can run today. [What is decided and not built](#what-is-decided-and-not-built) points at the tickets. **Never infer from this document that a decision has been implemented, and never infer from a closed ticket that code exists.**
>
> If you are changing behaviour: the code is the authority on what happens now, and the ticket is the authority on what should happen next. Where they disagree — and they disagree nearly everywhere — the disagreement is expected and is not a bug to fix in passing.

The design applies Matt Pocock's [codebase-design and domain-modeling skills](https://github.com/mattpocock/skills). Workflow invariants live in one deep module. Screens and HTTP handlers do not calculate status, enforce transitions, or evaluate specifications themselves. That principle has held and should continue to hold.

---

## What is built today

Roughly 3,400 lines of TypeScript, of which the domain core is 340.

| Path                                                 | Lines | What it is                                                                       |
| ---------------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `src/laboratory/laboratory.ts`                       | 214   | The command module. The whole domain.                                            |
| `src/laboratory/contracts.ts`                        | 126   | Types, Zod command schema, **and all reference data as compile-time constants**. |
| `src/main.tsx`                                       | 1,186 | The entire front end, one file.                                                  |
| `server/http.ts`, `server/main.ts`, `server/seed.ts` | 233   | HTTP, static serving, demo seed.                                                 |
| `tests/laboratory.test.ts`, `tests/http.test.ts`     | 425   | 11 tests, all passing.                                                           |

### The module interface

`Laboratory.execute(command, actor)` performs one validated business action atomically. `Laboratory.snapshot()` returns the working view.

The command vocabulary is **five verbs**: `receive`, `assign`, `record`, `submit`, `review`. The implementation owns required fields, role restrictions, result revisions, specification checks, independent review, status transitions, optimistic concurrency, and activity history.

SQLite is private to the module. Tests use a real SQLite database through the same interface as production, not mocked SQL. There is no repository layer or plugin framework, and none should be added before a real need exists. Tests inject a clock and a database path.

### What the storage actually is

Two tables:

```sql
samples  (id TEXT PRIMARY KEY, document TEXT NOT NULL)   -- one JSON blob per sample
activity (id INTEGER PRIMARY KEY, sampleId, action, actor, at, detail)
```

**A sample is a JSON document.** Every command reads the whole document, parses it, mutates it, re-serialises it and writes it back. Tests, results and their history all live nested inside that blob.

**`snapshot()` is unbounded.** It reads _every_ sample document, `JSON.parse`s each one, and reads _every_ activity row — and `src/main.tsx` calls it after every command. This is the single most consequential fact about the current code.

### Invariants that are genuinely enforced

These are real, tested, and must not be weakened by any refactor:

- **One transaction per command.** `BEGIN IMMEDIATE` with rollback on any throw (`laboratory.ts:61`, `:193`, `:196`).
- **Optimistic concurrency.** A stale `revision` is rejected with 409 rather than overwriting newer work.
- **Dynamic separation of duties.** A reviewer who recorded any result on the sample is refused (`laboratory.ts:163-170`).
- **Historical OOS blocks approval.** `hasException` scans _all_ results, not the latest, so a later passing revision does not erase an earlier out-of-specification flag. This is a standing domain distinction and it has a test named after it.
- **Approved records are locked.**
- **The specification is snapshotted at receipt** — currently by value-copy, since `receive` spreads the method's `min`/`max` onto the sample document. This works by construction rather than by intent; **any reshape must preserve it deliberately.**

### Reference data is a compile-time constant

`people` and `methods` are `as const` arrays in `contracts.ts`. There is **no users table, no methods table, no versions, no specifications, no lots, no instruments** — anywhere. Every decision that presupposes those tables presupposes something that does not exist in any form.

---

## Known defects in what is built

Recorded here so they are not rediscovered. None is fixed.

| Where                          | Defect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `laboratory.ts:31`             | `PRAGMA user_version=1` runs **unconditionally on every construction**, not only on creation, stomping the value a version-gated migration runner reads. Found by [#32](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/32), which decided the ordering requirement and left the fix as build work.                                                                                                                                                                                                                                                                                                            |
| `src/main.tsx:123-129`, `:597` | Duplicate-receipt path: the POST succeeds, `reload()` throws, `execute()` returns `false` (`:129`), and the intake modal is only closed on `true` (`:597`) — so the form stays open and resubmittable. **The map cites `main.tsx:687` for this; that line number was measured against the pre-retirement file and no longer points at the defect.** The mechanism is decided ([#17](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/17), [#54](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/54)); the client half is [#58](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/58). |
| `laboratory.ts:76`, `:82`      | **Laboratory numbers do not reset per year.** The sequence is `COUNT(*) + 1` over all samples ever, formatted with the current year — so sample 43 received in 2027 becomes `LAB-2027-0043`. Also four digits where [#25](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/25) and [#48](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/48) assume six plus a `-C01` container suffix.                                                                                                                                                                                                           |
| `server/http.ts:22-23`         | The cross-origin check hardcodes `http://`. Under [#12](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/12)'s TLS decision every write would 403.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `laboratory.ts:133-134`        | Specification comparison is `>=` / `<=`, hardcoded. Endpoint inclusivity is an undeclared choice; [#49](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/49) makes it explicit.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## What is decided and not built

Each line names a decision and the shape it imposes. **The ticket is the authority; nothing here restates its reasoning.**

**The data model is reshaped in three steps, none applied.** [#25](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/25) makes the unit of work a _test_ and a sample one _container_, with append-only assignments. [#26](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/26) makes a result an aggregate of append-only determinations and pins the specification by id plus content hash. [#27](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/27) makes an investigation an entity and status temporal. [#32](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/32) is how the blob explosion is proved. [#49](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/49) amends #26's limit union into a `Bound { literal, inclusive }` and requires decimal text throughout — see [#56](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/56), which nothing yet answers.

**Persistence stays SQLite, one process, one writable connection.** [#17](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/17), decided on arithmetic. [#33](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/33) adds a second connection opened `readOnly: true` for the query module and forbids holding a read transaction across an `await`. [#54](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/54) puts command idempotency in a dedicated `commands` table checked inside the write transaction, below any module boundary.

**The module stays one module.** [#37](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/37) refused a Laboratory/Materials split. [#6](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/6)'s real three-way split — command, query, storage — is still the target, and **two of its three parts are unbuilt.** How ~17 handlers are organised inside the one module is [#57](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/57).

**Three append-only event streams**, one per aggregate root — `samples`, `users`, `methods` ([#46](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/46)). [#8](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/8) sizes and indexes `activity` and forbids one specific query shape. A system stream is pending in [#59](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/59).

**Reads become a query module.** [#18](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/18) makes the queue a stateless read-time projection with keyset paging and ten indexes. **`snapshot()` is deleted.**

**Accounts, roles, methods and materials become tables.** [#7](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/7) local accounts and flat role grants; [#29](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/29) method versions admitted by a forward-dated act; [#21](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/21) materials and lots with no stock model; [#43](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/43) instruments; [#23](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/23) QC checks scoped to an instrument and an interval.

**Operations.** [#12](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/12) deployment, backup and upgrade; [#51](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/51) one maintenance mode in which reads stay up; [#30](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/30) archive as a query-scope horizon, with rows never moving and only Certificate bytes tiered.

**Workflow.** [#9](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/9) feature scope and the four seams; [#24](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/24) Certificates; [#28](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/28) aliquots and holding times; [#34](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/34) qualification at assignment; [#36](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/36) QA never logs in; [#38](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/38) resamples; [#42](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/42) transcribed registers; [#47](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/47) take-up; [#48](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/48) scan resolution; [#50](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/50) the bench during QA approval transit.

**The 3D explorer is retired** ([#20](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/20)). Its code is preserved on the branch `explorer/retired-3d-scene`, which is **never merged to `main`**. Do not reintroduce it.

---

## Standing distinctions

Any change that makes one of these unrepresentable is wrong, regardless of how much simpler it looks.

- Review approval is **not** manufacturing batch release.
- An activity record is **not** an electronic signature. The prototype has the former and not the latter, deliberately.
- A PDF chromatogram is **not** the complete analytical record.
- An investigation explains and dispositions an out-of-specification result; **it never deletes its history.**
- A numeric range comparison is **not** a decision rule. No uncertainty guard bands.
- The specification is **snapshotted onto the sample at receipt** and never retroactively rewritten.

---

## Deliberate limits

One laboratory. Numeric tests. Fictional methods and specifications. A local single-process database. **Demo actor selection is not authentication.** Activity records are transactional but not tamper-resistant against the database owner — and note that [#33](https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/33)'s read-only connection defends against mistakes, not adversaries, and must never be described as tamper-evidence.

There are no electronic signatures, raw data uploads, instrument integrations, validated calculations, controlled methods, retention policies, disaster recovery, or compliance claims. Validation is **deferred, not abandoned**; distribution as a product is permanently out of scope.

Approved records are locked by the workflow. Out-of-specification results block approval; no disposition shortcut is implemented.
