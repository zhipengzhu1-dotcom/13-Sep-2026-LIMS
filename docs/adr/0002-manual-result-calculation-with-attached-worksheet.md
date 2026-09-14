# Analysts calculate Results by hand and attach the worksheet

The LC-MS/MS instrument reports ng/mL, but Results are reported in ng/day (finished products) or ppm (raw materials). For the first release the Analyst performs that conversion outside the system and enters only the final Result, together with the instrument reading, the injection or sequence ID and the calculation worksheet as an attachment; the Manager checks the attachment at Approval. We chose this over building the calculation in, because it matches how analysts calculate today and lets the electronic workflow go live sooner. The known audit gap (the system cannot re-derive a Result) is closed by the attachment, not ignored.

## Consequences

- LOD and LOQ are fixed per Method in ppm, and its ng/day pair is that pair at the Method's Maximum-dose ceiling (ng/day = ppm × mg/day). Receipt refuses a Maximum daily dose above the ceiling of any requested Method, so the fixed ng/day LOQ is conservative for every Sample it judges (#57). The true ng/day LOQ at a lower dose is not derived; that waits until the calculation moves into the system (#36).
- A future in-system calculation should supersede this ADR rather than edit it.
