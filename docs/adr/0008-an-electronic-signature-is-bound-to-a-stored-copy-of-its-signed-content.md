# An Electronic signature is bound to a stored copy of its Signed content

21 CFR 11.70 requires an Electronic signature to stay linked to its record so it cannot be excised, copied or transferred to falsify it, and §211.194(a)(7)–(8) expects a signature to show what its signer attested to (see `docs/regulatory/fda-electronic-records-and-lab-records.md`, checklist items 2 and 7). Before #28, a signature row held only the signed command (`sampleId`, `revision`) and could be updated or deleted; the Sample it pointed at is saved again on every later command, so the state at `revision` was not kept anywhere.

We decided that each signature stores a canonical copy of its Signed content, taken in the same transaction as the signing: the Sample as just saved, with its Tests, Results and OOS investigations, and for Approval the version and SHA-256 of the Certificate of Analysis just issued. Attachments are referred to by ID, since they are already immutable and hashed. A SHA-256 covers that copy together with the command, signer ID, printed name, signing time and meaning, and is checked on every read against the stored copy, never against the live Sample, so an Amendment or Retest never invalidates an earlier signature. The signatures table refuses UPDATE and DELETE at the database, like the audit trail.

A signature that fails its check stays visible and is shown as invalid wherever signatures appear; reading never throws, so the record stays inspectable. On that Sample, Submit for approval, Approval, Publish and starting an Amendment are refused, while Result entry and OOS work continue. Benchline offers no override: an invalid signature is cleared only under procedure, by Quality investigating and the System administrator restoring or correcting the database under an approved change record (ADR-0007).

## Considered Options

- **Hash the command and manifestation only.** Cheap, but it does not show which Result values were attested to.
- **Hash the live Sample without keeping a copy.** Every later command on the Sample would invalidate the signature.
- **Throw when a check fails.** It would hide the record from inspectors, and one altered row would make the whole workspace unreadable.
- **A signed Quality override.** It would let a Certificate go out on a signature known to be altered, against §11.70.
- **Add the Amendment's reason to the "amended by" Signed content.** The reason is given by the Coordinator or Manager who starts the Amendment, not by the Analyst, so the Analyst would be attesting to someone else's statement. Nothing is left unsigned without it: each corrected Result carries its own reason on the Sample, and the Certificate states the Amendment's reason under the re-approval's signature (ISO/IEC 17025 7.8.8.1 asks for it on the report).

## Consequences

- Every signature row carries a Sample-sized copy; storage grows with each signing.
- The migrations of #60 must carry signatures and their Signed content across unchanged; a migration that rewrites either invalidates every signature it touches.
- Plain SHA-256 guards against ordinary means only. Someone with the database file could drop the triggers and recompute a hash; access to the file is limited by procedure to the System administrator.
