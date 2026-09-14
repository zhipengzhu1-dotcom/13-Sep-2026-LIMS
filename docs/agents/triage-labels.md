# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Go-live scope labels

This label records a disposition decided in the SOP-Management repo. It is not a triage role.

| Label             | Meaning                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `go-live-blocker` | In the frozen Go-live release (zhipengzhu1-dotcom/13-Sep-2026-SOP-Management#12) |

An issue that already cites a Go-live blocker disposition is not triaged again: apply `go-live-blocker`. An issue without `go-live-blocker` is outside the frozen release and is not grilled before Go-live unless the user reopens the scope.

Edit the right-hand column to match whatever vocabulary you actually use.
