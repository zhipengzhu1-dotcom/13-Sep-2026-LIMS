# An Admin acts in every role, still bound by separation of duties

The lab has three people, too few to staff Coordinator, Analyst and Manager separately, so the lab owner asked for a "super admin" with access to everything. We decided to add an Admin role that acts in every role: it sees every workspace view and may perform every command a Coordinator, Analyst or Manager may, and can be assigned Samples as their Analyst. Permission is decided in one place (`actsAs` in `contracts.ts`, used by `requireRole` and by the workspace), rather than by per-command exceptions.

Compliance is kept, not bypassed. An Admin acts only as themselves: every act is attributed to their own signed-in account on the audit trail, and every Electronic signature needs their own password and records their own printed name and its meaning. The one hard rule of ADR-0003 still binds an Admin: nobody, an Admin included, gives Approval to a Sample on which they entered, corrected or retested a Result. Without it, one person could test, approve and publish a Certificate of Analysis alone, and the independent check that ADR-0003 kept in place of peer review would be lost. A lab of three can still meet it: whoever tests a Sample is never the one who approves it.

## Consequences

- An Admin who tests a Sample needs a Manager (or another Admin) to approve it; the workspace shows the same disabled Approve and the core the same refusal as for a Manager.
- Role-specific queues are unchanged for the other roles; only the Admin's navigation lists every view.
- An Admin can be selected wherever a Coordinator assigns an Analyst.
- Account administration is still out of scope; the demo Admin is seeded like the other accounts.
