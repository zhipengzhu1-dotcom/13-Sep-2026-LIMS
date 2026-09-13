# Build to 21 CFR Part 11 and ISO/IEC 17025 from day one

The lab is moving its paper-based nitrosamine testing to electronic records, and it must satisfy both FDA (21 CFR 211 and Part 11) and ISO/IEC 17025:2017. We decided that sign-in, Electronic signatures (name, date and time, meaning, password re-entry) and a complete audit trail (who, when, old value, new value, reason) come before any other feature, instead of being added once the workflow is proven. Adding them later would mean records created in the meantime could never be shown to be trustworthy, and the paper record could not be retired.

## Consequences

- The prototype's "pick a user" selector is replaced by real authentication.
- Electronic signatures are required when an Analyst submits results, when a Manager gives Approval, and when a Certificate of Analysis is amended. Receipt and individual result entry are audit-trailed but not signed.
- Paper remains the official record until a documented validation (user acceptance testing against a signed plan) is signed off by management; from that date the electronic record is official.
