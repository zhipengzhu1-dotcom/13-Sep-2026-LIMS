# ZODB/Zope write concurrency, and GPL-2.0 obligations for internal SENAITE use

**Asked by:** Orchestrator — SENAITE feasibility scouting (two-question dispatch, ZODB concurrency + GPL-2.0 internal-use obligations)
**Date:** 2026-09-11
**Status of sources:** Fetched and read primary sources directly (zodb.org/zodb-docs.readthedocs.io current-version pages, zope.readthedocs.io, relstorage.readthedocs.io, zeo.readthedocs.io, the ZODB GitHub repository's own `repozo.py` source, gnu.org GPLv2 licence text, gnu.org GPL FAQ (current, undated-but-live page), and the LICENSE files committed in `senaite/senaite.core` and `senaite/senaite.lims` on GitHub, `master` branch, fetched today). No NIST HB 150 or FDA data-integrity guidance was relevant to either question, so the "superseded draft" trap noted for this project did not arise here. All URLs and the date accessed (2026-09-11) are listed in Sources.

---

## QUESTION A — ZODB/Zope write concurrency

### A1. Optimistic concurrency, ConflictError, and conflict resolution

- ZODB uses an **optimistic concurrency control** model, not locking. Two connections may both read and modify the same object; the conflict is only detected when a transaction attempts to **commit**. "The timestamp-based approach used by ZODB is referred to as an *optimistic* approach, because it works best if there are no conflicts." — [ZODB Transactions and Concurrency guide](https://zodb.org/en/latest/guide/transactions-and-threading.html) (current docs, accessed 2026-09-11).
- "If two connections modify the same object at the same time, one of the connections will get a conflict error when it tries to commit." — same source. That error is `ZODB.POSException.ConflictError`.
- "When a conflict error occurs, the transaction must be aborted before retrying the update." The `transaction` package provides an `attempts()` helper to structure retry loops. — same source.
- **Conflict resolution**: certain persistent types can define a `_p_resolveConflict(oldState, savedState, newState)` method; if it returns successfully the commit proceeds without raising `ConflictError`, otherwise the error is raised as normal. "Commonly used objects that implement conflict resolution are buckets and `Length` objects provided by the BTree package." — [ZODB Conflict Resolution doc](https://zodb-docs.readthedocs.io/en/latest/ConflictResolution.html) and the transactions-and-threading guide, both accessed 2026-09-11.
- Explicit guidance from the ZODB project itself: "It's generally best to avoid conflicts in the first place, if possible" — i.e., design so that "multiple connections don't update the same object at the same time" rather than relying on conflict resolution. — [ZODB Transactions and Concurrency guide](https://zodb.org/en/latest/guide/transactions-and-threading.html).
- **ZPublisher retry**: on `ConflictError`, the Zope publisher automatically re-runs the entire request (re-parsing the HTTP request and re-executing the view) up to a configured number of times before surfacing the error to the client. Community/documentation figures put the default retry count at **three attempts**. There is at least one open, documented Zope issue asserting the retry mechanism's `HTTPRequest.retry_max_count` defaults to 0 in some configurations and is not correctly wired to the `max_conflict_retries` setting in `zope.conf` — i.e., retry behaviour has had real, tracked defects. — [zopefoundation/Zope issue #413, "Retry on ConflictError is broken"](https://github.com/zopefoundation/Zope/issues/413), accessed 2026-09-11. I did not independently verify current (2026) default retry-count behaviour against the live Zope source for the exact version SENAITE pins; this is flagged under "What I could not establish."

### A2. Same-object / shared BTree / catalog contention

- ZODB's own project documentation states plainly that the **catalog is the primary contention point** in real deployments: "The hot points for ConflictErrors are the catalogue indexes. Some of the indexes do not support conflict resolution and you will see ConflictErrors under write-intensive loads." — [Laurence Rowe, "An overview of the ZODB," zodb.org](https://zodb.org/en/latest/articles/ZODB-overview.html), accessed 2026-09-11. This is a ZODB-project-hosted document, not a third-party blog.
- The same document recommends two documented mitigations for write-intensive catalog indexing: (a) `Products.QueueCatalog` / `Products.PloneQueueCatalog`, which defers/serializes catalog updates through a separate ZEO client, and (b) offloading text indexing to an external search engine via `collective.solr`. Both are named, real packages referenced directly in that primary source.
- BTrees (the data structure backing `portal_catalog` indexes and most ZODB containers) are specifically engineered for this: "It's generally better to use BTree objects than PersistentMapping objects, because they're scalable and because they handle conflicts better," and BTrees are "optimized for use inside ZODB's optimistic concurrency paradigm, and include explicit resolution of conflicts detected by that mechanism." — ZODB guide/articles, same sources as above.
- **Conclusion on this sub-question**: yes, this is documented — by the ZODB project itself — as a known write-contention hotspot, not merely a folklore/community claim. The documentation does not give a numeric threshold (e.g., "N concurrent writers before this becomes a problem"); it describes the mechanism and the mitigation packages, not a load figure.

### A3. Scaling architecture: ZEO vs RelStorage, multiple processes

- ZODB's default bundled storages do **not** support multiple processes writing to one database: "For ZODB to support multiple processes, you need to use a storage such as ZEO, RelStorage, or NEO, as none of the included storages do." (paraphrased from search of zope/zodb documentation, consistent with the ZEO and RelStorage docs cited below — I was not able to pull this exact sentence from a single fetched primary page, so treat the sentence itself as a paraphrase; the underlying fact — that FileStorage alone is single-process — is corroborated by the ZEO and RelStorage docs themselves, below.)
- **ZEO**: "ZEO is a ZODB storage implementation that allows multiple client processes to persist objects to a single ZEO server... Any number of processes can create a `ClientStorage` instance, and any number of threads in each process can be using that instance." — [ZEO documentation](https://zeo.readthedocs.io/en/latest/), accessed 2026-09-11; also [Zope Book, "Scalability and ZEO"](https://zope.readthedocs.io/en/latest/zopebook/ZEO.html).
- **RelStorage**: stores ZODB pickles in a relational database (PostgreSQL 10+, MySQL 5.7.19/8.0, Oracle 10g+, SQLite 3.8.3+ are the versions the docs list). "Multiple Python processes on multiple machines can read and write the same ZODB database concurrently, similar to ZEO, but RelStorage does not require ZEO... Multiple processes on a single machine can read and write a local ZODB database using SQLite without needing to start and manage another process." RelStorage also documents support for "ZODB 5's parallel commit feature: Database writers only block each other when they would conflict." — [RelStorage documentation](https://relstorage.readthedocs.io/), accessed 2026-09-11.
- Net documented position: a single shared server running plain FileStorage is single-process by default; **ZEO or RelStorage are the documented paths to letting more than one process serve the same ZODB**, and both are first-party/community-standard components in the Zope/ZODB ecosystem (not third-party forks).

### A4. Published throughput / concurrent-writer figures

- **I could not find a primary-source, numeric figure** (e.g., "N writers/sec" or "N concurrent writers supported") published by the ZODB, Zope, or Plone projects. The documentation describes the *mechanism* (optimistic concurrency, retry, catalog hotspots, ZEO/RelStorage scaling paths) but does not publish benchmark numbers for concurrent-writer ceilings. Community discussion threads and blog posts exist but are not primary sources and were excluded per this task's sourcing rules. This is a genuine gap, stated as such below.

### A5. Packing and backup/restore

- **Packing**: "A file storage stores data in a single file that behaves like a traditional transaction log, and periodically the file is packed to free up space. When this is done, current records as of the pack time or later are copied to a new file, which replaces the old file." — [ZODB FileStorage / Storage APIs reference](https://zodb.org/en/latest/reference/storages.html) and [`ZODB.FileStorage.interfaces`](https://zodb.org/en/latest/_modules/ZODB/FileStorage/interfaces.html), accessed 2026-09-11. Options include `pack_gc` (garbage collection during pack) and `pack_keep_old` (retain the pre-pack file as `.old`).
- **Why it's required / growth without it**: FileStorage is append-only (a transaction log of every object revision ever committed). Without packing, the `Data.fs` file grows without bound as old object revisions accumulate; packing is the documented mechanism to reclaim that space by discarding non-current revisions older than the pack time.
- **Backup/restore**: the ZODB project ships `repozo.py` (in the ZODB source tree itself) as the documented backup/restore tool for FileStorage. Its own docstring: "repozo.py -- incremental and full backups of a Data.fs file and index," with `-B/--backup`, `-R/--recover`, `-V/--verify` modes, support for incremental backups (a full backup is forced if a pack has occurred since the last incremental), and optional gzip compression. — [`ZODB/src/ZODB/scripts/repozo.py`, zopefoundation/ZODB, `master` branch](https://github.com/zopefoundation/ZODB/blob/master/src/ZODB/scripts/repozo.py), accessed 2026-09-11.
- RelStorage-backed deployments instead rely on the underlying RDBMS's own backup/restore tooling (documented in RelStorage's docs), which is a materially different operational model than repozo/FileStorage.

---

## QUESTION B — GPL-2.0 obligations for internal use

**This section states legal text and FSF's own published interpretation of it. It is not legal advice.**

### B1. What triggers the source-distribution obligation

- GPLv2 §0 defines its scope: "Activities other than copying, distribution and modification are not covered by this License; they are outside its scope. The act of running the Program is not restricted..." — [GNU GPL v2.0 full text](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html), accessed 2026-09-11.
- §1 covers verbatim copying/distribution of source, conditioned on preserving notices and including the licence.
- §2 covers distributing modified versions ("work based on the Program"): it requires (a) marking changed files with notices, (b) that "any work you distribute or publish, that in whole or in part contains or is derived from the Program" be licensed under GPLv2 "as a whole," and (c) that interactive programs print an appropriate copyright/warranty notice — but §2's conditions are explicitly about what you must do **if you distribute or publish**.
- §3 requires that when you distribute the Program (or a derivative) in object/executable form, you must accompany it with the complete corresponding machine-readable source (or a written offer to provide it, valid for at least three years, or — for noncommercial distribution — pass along the offer you received).
- The consistent thread across §§0–3: **every operative obligation in GPLv2 is triggered by copying, distributing, or publishing** — not by running or modifying the software.

### B2. Internal, non-distributed use — does it trigger anything?

- FSF's GPL FAQ, entry "Is use within one organization or company 'distribution'?" (anchor `#InternalDistribution`): "No, in that case the organization is just making the copies for itself. As a consequence, a company or other organization can develop a modified version and install that version through its own facilities, without giving the staff permission to release that modified version to outsiders." — [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html), accessed 2026-09-11.
- The same FAQ entry adds the boundary condition: "However, when the organization transfers copies to other organizations or individuals, that is distribution. In particular, providing copies to contractors for use off-site is distribution."
- FSF's general summary elsewhere in the same FAQ: modifying and using GPL-covered software privately, without ever releasing it, does not trigger the source-release requirement; that requirement applies only "if you release the modified version to the public in some way."
- **Applied to the stated facts** (one server, our own employees, our own network, no copies conveyed to any outside party, no contractors given off-site copies): on the plain text of this FAQ entry, internal use of a modified SENAITE by employees of a single organization, on infrastructure that organization controls, does **not** by itself trigger a GPLv2 source-disclosure obligation. This is FSF's own stated interpretation of its own licence — it is persuasive but is not a court holding, and the FAQ explicitly frames this guidance as FSF's opinion, not legal advice. **This is not legal advice.**

### B3. GPL-2.0 vs AGPL-3.0 on network use, and which licence SENAITE actually uses

- AGPLv3 adds a network-interaction clause not present in GPLv2 or GPLv3: FSF's FAQ states AGPLv3 "requires a program to offer source code to 'all users interacting with it remotely through a computer network'" (anchor `#AGPLv3ServerAsUser`), and separately addresses what counts as such interaction (anchor `#AGPLv3InteractingRemotely`). GPLv2 has **no equivalent clause** — running a GPLv2 program as a network service for your own users, without distributing copies of the program itself, is the FSF's own noted gap that AGPL was written to close.
- **Confirmed licence of SENAITE**: I fetched the `LICENSE` file directly from both `senaite/senaite.core` and `senaite/senaite.lims` on GitHub, `master` branch, today. Both files contain the full **GNU General Public License, Version 2, June 1991** text verbatim (opening lines: "GNU GENERAL PUBLIC LICENSE / Version 2, June 1991 / Copyright (C) 1989, 1991 Free Software Foundation, Inc."). — [senaite/senaite.core LICENSE](https://github.com/senaite/senaite.core/blob/master/LICENSE), [senaite/senaite.lims LICENSE](https://github.com/senaite/senaite.lims/blob/master/LICENSE), both accessed 2026-09-11. I did not additionally cross-check every subpackage/plugin in the SENAITE ecosystem beyond these two core repositories.
- Net: SENAITE is licensed **GPL-2.0, not AGPL**. The network-use/"offer source to remote users" clause that AGPL would impose does not appear in the licence actually governing SENAITE.

### B4. A separate front-end talking to SENAITE only over HTTP/JSON — derivative work?

- FSF FAQ, "What is the difference between an 'aggregate' and other kinds of 'modified versions'?" (anchor `#MereAggregation`): "Where's the line between two separate programs, and one program with two parts? This is a legal question, which ultimately judges will decide. We believe that a proper criterion depends both on the mechanism of communication (exec, pipes, rpc, function calls within a shared address space, etc.) and the semantics of the communication (what kinds of information are interchanged)."
- Same entry: "If the modules are included in the same executable file, they are definitely combined in one program... By contrast, pipes, sockets and command-line arguments are communication mechanisms normally used between two separate programs. So when they are used for communication, the modules normally are separate programs. But if the semantics of the communication are intimate enough, exchanging complex internal data structures, that too could be a basis to consider the two parts as combined into a larger program." — [GNU GPL FAQ, `#MereAggregation`](https://www.gnu.org/licenses/gpl-faq.html), accessed 2026-09-11.
- The FAQ's plugin-specific guidance (anchors `#GPLPlugins`, `#GPLAndPlugins`) draws the same distinction by mechanism: fork/exec without intimate shared-data-structure communication → separate programs; dynamic linking with shared function calls/data structures → single combined program; a main program that only invokes a plug-in's entry point and waits for return is called out explicitly as "a borderline case."
- **Applied to the stated facts** (a separate front-end application communicating with SENAITE only over HTTP/JSON, i.e., a socket-based, arms-length protocol exchanging structured-but-not-shared-memory data): this sits within the pattern the FSF FAQ calls "normally... separate programs" (pipes/sockets, not shared address space or dynamic linking). FSF's own FAQ text goes only as far as stating the criterion ("mechanism" + "semantics/intimacy" of communication) and explicitly says the ultimate line is "a legal question which ultimately judges will decide" — it does not issue a categorical ruling that HTTP/JSON communication is always non-derivative. **This is a genuinely fact-dependent, contested legal question; the FAQ describes the test but does not resolve it for every case, and this section is not legal advice.**

---

## What I could not establish

- **No numeric concurrent-writer or write-throughput ceiling** is published in ZODB, Zope, or Plone primary documentation. The documentation describes mechanism and mitigations (ZEO, RelStorage, QueueCatalog, collective.solr) but not benchmark figures for a workload like ~5–9 concurrent writers / ~1000 samples/month.
- I could not independently confirm the **current default retry-count value** (commonly cited as three) against the live source of the specific Zope/SENAITE version stack in use, only that ZPublisher's retry-on-ConflictError mechanism exists and has at least one documented open defect (Zope issue #413) affecting how `zope.conf`'s `max_conflict_retries` interacts with `HTTPRequest.retry_max_count`.
- One sentence in A3 ("none of the included storages [support multiple processes]") is a paraphrase reconstructed from search-engine synthesis rather than a sentence I personally verified on a single fetched primary page; the underlying claim is corroborated independently by the ZEO and RelStorage primary docs, but the exact wording should not be treated as a verbatim quote.
- **The GPL-2.0/derivative-work question in B4 is not settled by any primary source** — FSF's own FAQ states the criterion is ultimately a matter for courts, and no court ruling was located (or sought, since this task is confined to primary regulatory/documentation sources, and case law was out of scope for this pass). Whether a specific proposed front-end architecture (auth handling, session sharing, direct database access vs. pure HTTP API, degree of UI reuse from SENAITE templates, etc.) would be found "intimate" enough to be a combined work depends on implementation facts not yet specified in this ticket.
- I did not review SENAITE's dependency tree for any AGPL-licensed subcomponents that might be bundled alongside the GPL-2.0-licensed core; I confirmed only the two named top-level repositories' own LICENSE files.

---

## Sources

**ZODB / Zope / Plone (Question A)**
- ZODB, "Transactions and Concurrency" (guide), https://zodb.org/en/latest/guide/transactions-and-threading.html — current docs, accessed 2026-09-11
- ZODB, "Conflict Resolution," https://zodb-docs.readthedocs.io/en/latest/ConflictResolution.html — current docs, accessed 2026-09-11
- Laurence Rowe, "An overview of the ZODB," https://zodb.org/en/latest/articles/ZODB-overview.html — ZODB-project-hosted article, current docs, accessed 2026-09-11
- ZODB, "Storage APIs" reference, https://zodb.org/en/latest/reference/storages.html — current docs, accessed 2026-09-11
- ZODB source, `ZODB.FileStorage.interfaces`, https://zodb.org/en/latest/_modules/ZODB/FileStorage/interfaces.html — current docs, accessed 2026-09-11
- ZODB source repository, `repozo.py`, https://github.com/zopefoundation/ZODB/blob/master/src/ZODB/scripts/repozo.py — `master` branch, accessed 2026-09-11
- ZEO documentation, https://zeo.readthedocs.io/en/latest/ — current docs, accessed 2026-09-11
- Zope Book, "Scalability and ZEO," https://zope.readthedocs.io/en/latest/zopebook/ZEO.html — current docs, accessed 2026-09-11
- RelStorage documentation, https://relstorage.readthedocs.io/ — current (4.2.x/4.3.x dev) docs, accessed 2026-09-11
- zopefoundation/Zope, Issue #413, "Retry on ConflictError is broken," https://github.com/zopefoundation/Zope/issues/413 — accessed 2026-09-11

**GPL-2.0 / SENAITE licensing (Question B)**
- GNU General Public License, Version 2, June 1991 (full text), https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html — accessed 2026-09-11
- GNU GPL FAQ (current, live page — not versioned/dated by FSF but continuously maintained; entries cited by anchor), https://www.gnu.org/licenses/gpl-faq.html — accessed 2026-09-11 — anchors used: `#InternalDistribution`, `#MereAggregation`, `#AggregateContainers`, `#GPLPlugins`, `#GPLAndPlugins`, `#AGPLv3ServerAsUser`, `#AGPLv3InteractingRemotely`
- senaite/senaite.core, `LICENSE`, `master` branch, https://github.com/senaite/senaite.core/blob/master/LICENSE — accessed 2026-09-11
- senaite/senaite.lims, `LICENSE`, `master` branch, https://github.com/senaite/senaite.lims/blob/master/LICENSE — accessed 2026-09-11

*Not legal advice. Prepared as a factual scouting pass only; no recommendation is made.*
