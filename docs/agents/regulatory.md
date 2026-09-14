# Regulatory guidelines

Benchline is a GMP laboratory system of record, bound by 21 CFR Part 11, 21 CFR 211 and ISO/IEC 17025:2017 (ADR-0001). The requirements live in `docs/regulatory/`, one file per source family. Each maps every requirement to Benchline, cites its source, and ends with a developer checklist.

| File | Consult when the change touches |
|---|---|
| `docs/regulatory/fda-electronic-records-and-lab-records.md` | the audit trail, Electronic signatures, accounts and access, record copies, retention or backup, the laboratory record behind a Result |
| `docs/regulatory/fda-oos-and-nitrosamine-control.md` | Results, LOD/LOQ, Limits and Acceptable intakes, Conformity statements, OOS investigations, Retests |
| `docs/regulatory/iso-17025-laboratory-information.md` | Sample receipt, handling and custody, Certificates of Analysis and Amendments, decision rules, nonconforming work, validation of changes |

## Consult before building

When a ticket, spec, refactor or fix touches any area in the table:

1. Dispatch one subagent per matching file. Brief it with the planned change in `CONTEXT.md` terms, and ask it to return every requirement and checklist rule that bears on the change, each with its citation and a verdict for the planned change: **satisfied**, **at risk** or **violated**.
2. Carry every reported rule into the work: a test or acceptance criterion for each satisfied or at-risk rule, a change to the plan for each violated one.
3. Bring the user any rule that conflicts with an ADR, the spec or the ticket, quoting the citation, and wait for their decision. Regulatory text and ADRs are both authorities; the user reconciles them.

Consultation is done when every reported rule is covered by a test, a plan change or a user decision.

## Review against them

When reviewing a change in these areas, add the rules the consultation reported to the Standards axis, and treat a violated rule as a blocking finding.

## Keep them current

Each file records what its sources said on the dates in its Sources section, and marks judgments about Benchline's code as unverified. Change a requirement only from a freshly fetched primary source: run `/research` to refresh the file when a guidance revision newer than the one it cites exists, or when the code it judged has changed.
