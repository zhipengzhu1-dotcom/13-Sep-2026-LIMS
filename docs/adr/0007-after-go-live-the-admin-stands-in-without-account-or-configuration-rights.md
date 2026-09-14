# After Go-live, the Admin stands in for every role without account or configuration rights

ADR-0004 gave one Admin role access to everything because the lab had three people. The lab now has seven, so that rationale no longer describes it, and the role still mixed two jobs: standing in for every role, and administering Benchline's accounts and configuration. FDA's data-integrity Q&A (Q4) expects system administration to be independent of record creation (see `docs/regulatory/fda-electronic-records-and-lab-records.md`).

We decided to split the two jobs at Go-live, as the lab's responsibilities matrix sets out (zhipengzhu1-dotcom/13-Sep-2026-SOP-Management#9). Before Go-live, Benchline's developer also holds the Admin role with full permissions; paper is still the official record (ADR-0001). After Go-live, the Admin is the lab's one backup person, its most senior Analyst, who stands in for every role within separation of duties (ADR-0003, ADR-0005) and holds no account or configuration rights. The developer becomes the System administrator, an external provider with no laboratory role.

This removes the conflict from the Admin role. It remains for the System administrator, because the same person develops, deploys and administers accounts. Its safeguards are:

- every account change is recorded on a Form and approved by the Quality lead;
- nobody changes their own account, a procedure that already applies;
- the account log is part of every internal audit;
- the System administrator deploys to production only after the Quality lead approves the release record.

We rejected making the Admin a maintenance-only role with no lab work, because the lab still needs a backup who can stand in for any role.

"Every role" means every lab role: Coordinator, Analyst and Manager. The Admin never stands in for the Quality lead (#67), a read-only role that sees every Sample, the lab-wide audit trail and every Sample with an invalid Electronic signature, and runs no command. The Quality lead's periodic review covers the Admin's own bench work and Access events, so the Admin standing in would review their own work; the SOP names a deputy, who holds a Quality lead account of their own, instead. Since nobody approves a change to their own account, a change to the Quality lead's account is approved by that deputy.
