# A Record copy is audited on its Sample and anchored by its manifest hash

21 CFR 11.10(b) and §211.180(c) require accurate and complete copies of records in human-readable and electronic form, and FDA's Data Integrity Q&A (Q9) says a true copy keeps the original's metadata and dynamic nature (see `docs/regulatory/fda-electronic-records-and-lab-records.md`, checklist item 16). Before #55 the lab made true copies on paper under an Interim bridge.

We decided that a Record copy is one ZIP per Sample: a PDF for reading, `record.json` with the same record (each Electronic signature and Certificate of Analysis version as stored, with its hash and whether it verified when the copy was made), every calculation worksheet a Result ever referenced as its stored bytes, and `manifest.sha256` listing the SHA-256 of each of those files. Anyone who can see the Sample may make one, the Quality lead included: making a copy is not a command and changes nothing on the record, so `refuseQualityLead` does not apply.

Each copy writes one audit entry in the Sample's history, after the archive is built and before it is served: the actor, the time, and the manifest's own SHA-256 as `recordCopy.manifestSha256`. If that entry cannot be written, no copy is served. A manifest alone proves only that the files agree with each other, since whoever alters a file can regenerate it; the entry lets anyone check a copy against Benchline's own record. A copy therefore cannot contain its own entry: its audit trail runs to the last entry before the copy was made.

## Considered Options

- **Record the copy lab-wide only, like an Access event.** It would keep the Sample's history to changes, but someone reviewing the Sample would not see the copies made of it.
- **Model the copy as a command.** It would put it through the command seam and its key, but the Quality lead, who must be able to export, is refused every command.
- **Rely on the manifest inside the ZIP.** Anyone can regenerate it after editing a file.
- **Render the PDF in the browser, as Certificates are printed (#85).** The server could not hash what it never produced, so the manifest and its audit entry would cover only what the browser chose to send.

## Consequences

- Every copy adds an entry to the Sample's history, including after Approval. Nothing that reads the history for the workflow (Amendments, change summaries) looks at `exportRecordCopy` entries.
- Visibility of Client data by role is not restricted by this decision (#89).
- A Record copy is not a backup and does not satisfy §211.180(d) retention on its own.
- The PDF embeds Noto Sans (SIL Open Font License), which covers Latin, Greek and Cyrillic scripts. A character it cannot draw prints as `?`, and the PDF says so; `record.json` keeps the text as stored.
