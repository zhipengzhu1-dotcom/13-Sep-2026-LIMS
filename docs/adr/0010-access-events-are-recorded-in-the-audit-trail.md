# Access events are recorded in the audit trail, not a separate security log

FDA's data-integrity Q&A (Q1.c) counts attempts to access the system among the actions a system should record, and Q8 expects the lab to review access periodically; 21 CFR 11.300(d) requires attempted misuse of passwords to be detected (see `docs/regulatory/fda-electronic-records-and-lab-records.md`, checklist item 13). Part 11 does not say where these entries live: §11.10(e) covers only changes to records. Before #29, Benchline recorded no sign-in, sign-out or Failed attempt anywhere.

We decided to record every Access event (sign-in, sign-out, session expiry, Failed attempt, lockout, unlock, One-time password issued, password change) in the same audit trail as record changes, as entries about an account with no Sample. They get the same server time, the same database refusal of UPDATE and DELETE, and the same lab-wide audit trail screen, filtered by event type, that the Quality lead uses for the periodic review of Acceptable intakes, attachments and access. A Failed attempt on an unknown username names the username that was typed in place of an actor.

## Considered Options

- **A separate access log table.** It would keep the audit trail to record changes, but it would need its own immutability, its own review screen and its own export, and the periodic review would span two places.

## Consequences

- The audit trail no longer means only "who changed which record": readers of the lab-wide view see Access events among record changes unless they filter them out.
- The System administrator has no Benchline account (ADR-0007), so a server command prints Access events for their review of Failed attempts.
- A successful Electronic signature is already audited with its command, so it is not also recorded as an Access event.
