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

These labels record the dispositions decided in the SOP-Management repo. They are not triage roles.

| Label             | Meaning                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `go-live-blocker` | In the frozen Go-live release (zhipengzhu1-dotcom/13-Sep-2026-SOP-Management#12)            |
| `interim-bridge`  | After Go-live; the release closing it withdraws a paper Interim bridge (with `enhancement`) |

An issue that already cites a disposition (Go-live blocker, Interim bridge or Permanent procedure) is not triaged again: apply the matching label. An issue without `go-live-blocker` is outside the frozen release and is not grilled before Go-live unless the user reopens the scope.

Edit the right-hand column to match whatever vocabulary you actually use.
