# The Laboratory error check counts toward separation of duties

ADR-0003 and ADR-0004 bar anyone from giving Approval to a Sample on which they entered, corrected or retested a Result. We extend that rule to whoever recorded a Laboratory error check on the Sample: the check is the Analyst's own review of their bench work, so the approver must be independent of it just as of the Result itself. Opening or concluding an OOS investigation does not count; those are the Manager's supervisory acts, and barring the concluding Manager from approving would often leave a lab of three with no one to give Approval.

## Consequences

- In practice the rule binds an Admin: a Manager cannot record a Laboratory error check, but an Admin assigned the Sample can, and may then not approve it.
