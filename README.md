# Benchline — analytical laboratory prototype

A local laboratory workspace for pharmaceutical sample receipt → analyst assignment → numerical result entry → independent review. The repository is the foundation for an extensible application, with a deep workflow module instead of business rules scattered across screens.

## Run locally

Requires Node.js 24 or later.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Five fictional samples are created on first start. Data persists in `data/prototype.sqlite` across refreshes and restarts. The server binds only to your computer. No hosted services are needed at runtime.

```sh
npm run check  # Type checking, production build, workflow and HTTP tests
npm start      # Serve a previously built production UI locally
```

## Try the complete workflow

1. As **Morgan Lee · coordinator**, receive a sample and choose its tests. Open the sample and assign **Alex Chen** or **Sam Rivera**.
2. Close the record and select the assigned analyst in the top-right demo-user selector. Open the sample, enter results and run/worksheet references, and submit for review.
3. Switch to **Taylor Brooks · reviewer**. Open the Review queue, examine results and history, and approve or return the sample with comments.
4. For a returned sample, switch back to its analyst, revise the result with a reason, and resubmit. Earlier values remain visible in the result revisions and activity history.

Assay demo limits are 98–102%; water 0–0.5%; total impurities 0–1%, inclusive. These are invented examples, not product specifications. Current **or historical** out-of-specification results block approval even after a passing revision. A future investigation module must explicitly resolve that condition; the prototype does not implement disposition.

## What's included

- Sample register with search, status filters, priority, due dates and progress.
- Receipt with automatic laboratory number and test specification snapshots.
- Assigned-analyst result entry, supporting references and revision reasons.
- Independent review, returns for correction and locked approved records.
- Transactional activity history, persisted local records and stale-edit protection.
- Method catalog, per-analyst work queue and review queue.

## Design and future development

The design uses Matt Pocock's [skills repository](https://github.com/mattpocock/skills), specifically **codebase-design** and **domain-modeling**, already available in the development environment. [CONTEXT.md](CONTEXT.md) is the domain glossary; [docs/architecture.md](docs/architecture.md) documents the module interface and extension seams. Future contributors should use these skills when changing module interfaces or domain terminology.

`src/laboratory/laboratory.ts` owns transitions, validation, permissions, specification checks, revisions and persistence. Its public interface is `snapshot()` and `execute(command, actor)`, plus lifecycle methods. `contracts.ts` defines the vocabulary shared with the UI. Tests call this same interface with real SQLite, including persistence across reopen, stale writes, and disallowed actions. HTTP and React are callers of that interface.

Suggested next product decisions are captured in [docs/next-steps.md](docs/next-steps.md).

## Scope of evaluation

Use fictional data only. Demo-user selection is not authentication or an electronic signature. This is not a validated pharmaceutical record system and makes no compliance claim. There are no raw-data uploads, instrument connections, controlled method administration, sample inventory, investigation disposition, report issuance, backups or operational qualification. SQLite records can be changed by the computer owner. Review approval is not manufacturing batch release.

Data is excluded from Git. To begin another evaluation without losing prior records, stop the server and move the complete `data` directory to a named backup location before restarting. SQLite may have WAL companion files while running; do not copy only the main database during an active session.
