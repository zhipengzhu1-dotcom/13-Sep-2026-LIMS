# In production, the Admin stands in for every role without account or configuration rights

Two jobs have shared the name "admin" until now:

- the **Admin** role, which acts in every role (ADR-0004);
- the work of administering Benchline itself: accounts, configuration, deployment and maintenance.

We decided to separate the two at Go-live. This decision was made in zhipengzhu1-dotcom/13-Sep-2026-SOP-Management#9 and confirmed by the user on 2026-09-14.

**Before Go-live:** Benchline's developer holds the Admin role with full permissions, to make development run smoothly. Paper is the official record until validation sign-off (ADR-0001), so nothing done in the Admin role before Go-live is a GMP record. It stays on the append-only audit trail.

**After Go-live:** the Admin role is held by one backup person, the lab's most senior Analyst, who is its Deputy technical manager. That person stands in for every role and is still bound by separation of duties (ADR-0003, ADR-0005). They hold **no account or configuration rights**. The developer administers accounts and configuration, deploys and maintains Benchline as an **external provider** with no laboratory role. The Quality lead approves every account change and every release.

We chose this because FDA's data-integrity Q&A (Q4) expects system administration to be independent of record creation (see `docs/regulatory/fda-electronic-records-and-lab-records.md`, #33). Keeping account and configuration rights out of the role that creates records removes that conflict at its source.

We rejected making Admin a maintenance-only role with no lab work. The lab still needs one backup who can stand in for any role.

This decision partly supersedes ADR-0004. Its stand-in role and separation of duties still apply. The Go-live split above is new.

## Consequences

- The validation for Go-live shows that the Admin role holds no account or configuration rights. When account administration is built (#52), it must never be granted to the Admin role, and nobody may change their own account.
- The account log and release records must be reviewable by the Quality lead and exportable for internal audit (#52).
- The external provider's access to the server and database is restricted, logged and covered by the same Quality lead approval, because that access could otherwise reach records and the audit trail. Signature immutability is tracked in #28, and password and signature controls in #29.
- Seeded demo accounts, including the demo Admin, are removed before Go-live (#30).
- The validation report states the Go-live date as the cut-off after which electronic records are official.
