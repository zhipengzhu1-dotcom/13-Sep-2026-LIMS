# Analysts calculate Results by hand and attach the worksheet

The LC-MS/MS instrument reports ng/mL, but Results are reported in ng/day (finished products) or ppm (raw materials). For the first release the Analyst performs that conversion outside the system and enters only the final Result, together with the instrument reading, the injection or sequence ID and the calculation worksheet as an attachment; the Manager checks the attachment at Approval. We chose this over building the calculation in, because it matches how analysts calculate today and lets the electronic workflow go live sooner. The known audit gap (the system cannot re-derive a Result) is closed by the attachment, not ignored.

## Consequences

- LOD and LOQ are stored per Method as two fixed pairs, one in ppm and one in ng/day, even though an ng/day LOQ really depends on the Maximum daily dose. This is accepted until the calculation moves into the system, at which point LOD and LOQ should be held in one unit and converted.
- A future in-system calculation should supersede this ADR rather than edit it.
