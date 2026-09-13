# Does SQLite's WAL checkpoint/read-scaling behavior survive Benchline's write-contention profile?

**Asked by:** Ticket #31, "Contended write cost: does the persistence decision survive measurement?" (https://github.com/zhipengzhu1-dotcom/10-Sep-2026-LIMS/issues/31)
**Date:** 2026-09-11
**Status of sources:** All SQLite facts verified directly against the current pages at sqlite.org on 2026-09-11 (sqlite.org does not version its HTML documentation by release number the way a versioned API doc would; these are the live pages served at the canonical URLs below, which describe current WAL-mode behavior as of SQLite's present WAL implementation). The `node:sqlite` facts were checked against the Node.js v26.8.2 API documentation and against the `DatabaseSync::Open()` open-flag logic in `src/node_sqlite.cc` in the `nodejs/node` `main` branch, both fetched 2026-09-11.

## Findings

### 1. What triggers automatic checkpointing, and what "a checkpoint cannot complete while a reader is active" means

**Default automatic checkpoint trigger.** SQLite's WAL documentation states plainly:

> "By default, SQLite will automatically checkpoint whenever a COMMIT occurs that causes the WAL file to be 1000 pages or more in size, or when the last database connection on a database file closes."

— https://www.sqlite.org/wal.html, §3.1 "Automatic Checkpoint," and restated in §2.1.

The 1000-page default (~4MB at the standard 4096-byte page size) is controlled by `PRAGMA wal_autocheckpoint`, the C API `sqlite3_wal_autocheckpoint()`, or the compile-time `SQLITE_DEFAULT_WAL_AUTOCHECKPOINT` option. Automatic checkpoints run in **PASSIVE** mode (see below).

**What blocking-by-a-reader means.** SQLite's own text, §6 "Avoiding Excessively Large WAL Files":

> "A checkpoint is only able to run to completion, and reset the WAL file, if there are no other database connections using the WAL file. If another connection has a read transaction open, then the checkpoint cannot reset the WAL file because doing so might delete content out from under the reader. The checkpoint will do as much work as it can without upsetting the reader, but it cannot run to completion. The checkpoint will start up again where it left off after the next write transaction. This repeats until some checkpoint is able to complete."

— https://www.sqlite.org/wal.html, §6.

So a single long-lived reader **delays** completion — it does not cause silent data loss or an error, and the checkpoint mechanism itself tracks resumable progress. The critical distinction is between one long-lived reader (which eventually ends, letting the checkpoint finish) and a *continuously renewing* population of readers with no gap between them:

> "However, if a database has many concurrent overlapping readers and there is always at least one active reader, then no checkpoints will be able to complete and hence the WAL file will grow without bound."

— same section. This is the condition that matters for Benchline's ~20-concurrent-reader, always-on profile: it is not any one reader's duration that matters, it's whether the reader population as a whole ever has a gap.

**Checkpoint modes — PASSIVE / FULL / RESTART / TRUNCATE.** From `PRAGMA wal_checkpoint` documentation (https://www.sqlite.org/pragma.html#pragma_wal_checkpoint):

- **PASSIVE** — checkpoints as many WAL frames as possible *without waiting* for readers or writers to finish; never invokes the busy-handler; this is what automatic checkpointing uses and what `sqlite3_wal_checkpoint()` (the older, non-`_v2` call) does. **Can partially succeed** in the presence of active readers — it simply stops at the oldest active reader's mark and reports how far it got.
- **FULL** — blocks until there is no writer and all readers are on the most recent snapshot, then checkpoints all frames; readers may still proceed concurrently but the call can block waiting for them to catch up to the latest snapshot before finishing.
- **RESTART** — does FULL, then additionally blocks until all readers currently using the WAL file finish, so that the next writer restarts the WAL from the beginning.
- **TRUNCATE** — does RESTART, then truncates the WAL file to zero bytes on success.

The pragma's return row makes the "partial success" state machine-readable: the first returned column is 1 if a RESTART/FULL/TRUNCATE checkpoint was *blocked from completing* by another connection actively using the database, and the second/third columns report pages-in-WAL vs. pages-actually-moved-back — i.e., FULL/RESTART/TRUNCATE can also complete only *partially* and report that fact, they are not guaranteed atomic completions either. Only PASSIVE is documented as never blocking; RESTART and TRUNCATE are the modes documented elsewhere as the ones that "ensure the checkpoint runs to completion" (by blocking new readers from starting against the old WAL position) — but note this still requires existing readers to eventually finish, it does not forcibly evict them.

### 2. What "the WAL will grow without bound" means in practice — hard failure or pure growth/read-amplification cost

SQLite's documentation, in the same §6 passage quoted above, frames this purely as an unbounded-growth condition, not as a distinct crash/error mode:

> "...then no checkpoints will be able to complete and hence the WAL file will grow without bound."

The only place SQLite's docs describe a hard failure tied to WAL file size is unrelated to checkpoint starvation — it concerns individual transaction size, not steady-state file growth:

> "For transactions larger than about 100 megabytes, transactions might run more slowly... For transactions in excess of a gigabyte, WAL mode may fail with an I/O or disk-full error." (paraphrasing large-transaction guidance found alongside the WAL performance discussion at https://www.sqlite.org/wal.html)

That is a per-transaction-size caveat, not a description of what happens when the *cumulative* WAL grows because checkpoints are starved. For the starvation scenario itself, SQLite documents two concrete costs, both on the read path, not a crash:

> "...read performance deteriorates as the WAL file grows in size since each reader must check the WAL file for content and the time needed to do this check is proportional to the size of the WAL file."

— https://www.sqlite.org/wal.html (performance considerations, same page).

So per SQLite's own documentation: unbounded WAL growth under continuously-overlapping readers is a **read-amplification and file-growth cost that compounds over time**, not a documented distinct hard-failure mode by itself. It would eventually intersect with an actual disk-full condition if left unchecked indefinitely, but the docs describe that as a consequence of unbounded growth on finite storage, not as a separate WAL-specific failure trigger.

### 3. Documented recommendations for checkpoint scheduling under read-heavy, always-on workloads

SQLite's own recommendation, verbatim, from §6:

> "This scenario can be avoided by ensuring that there are 'reader gaps': times when no processes are reading from the database and that checkpoints are attempted during those times. In applications with many concurrent readers, one might also consider running manual checkpoints with the SQLITE_CHECKPOINT_RESTART or SQLITE_CHECKPOINT_TRUNCATE option which will ensure that the checkpoint runs to completion before returning. The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running."

— https://www.sqlite.org/wal.html, §6.

This is the full extent of SQLite's own scheduling guidance: (a) find or engineer reader gaps and checkpoint then, or (b) accept that RESTART/TRUNCATE checkpoints will force new readers to wait. **SQLite's documentation does not give a time-based cadence** (e.g., "checkpoint every N seconds") as an alternative and does not itself recommend one over the other for a workload where reader gaps may never reliably occur — it names the tradeoff (reader-gap detection vs. blocking readers) without adjudicating between them for any particular workload shape.

**WAL size alarm threshold.** I found **no SQLite-documented "alarm" or "safe maximum" WAL file size** distinct from the 1000-page (~4MB) *automatic checkpoint* default. The 1000-page figure is a checkpoint-trigger threshold under normal (non-starved) operation, not a stated ceiling for a starved WAL. SQLite's docs describe the growth-without-bound condition qualitatively (worse read performance, larger file) but do not name a page count or byte size at which the condition becomes dangerous rather than merely degraded. Any such threshold is therefore application-specific engineering judgment, not something sqlite.org publishes as authoritative — I state this as a documented absence, not as license to invent a number.

### 4. Can `node:sqlite`'s `DatabaseSync` run `PRAGMA wal_checkpoint` from a `readOnly: true` connection?

Node's `node:sqlite` documentation (Node.js v26.8.2, https://nodejs.org/api/sqlite.html) documents the `readOnly` constructor option for `DatabaseSync` (default `false`; if `true`, "the database is opened in read-only mode... If the database does not exist, opening it will fail") but **does not mention `wal_checkpoint` or any PRAGMA-level restriction tied to `readOnly` at all** — there is no statement in Node's docs about which PRAGMAs are permitted or blocked under a read-only connection.

Looking at the implementation directly (`src/node_sqlite.cc`, `DatabaseSync::Open()`, `nodejs/node` `main` branch, fetched 2026-09-11): when `readOnly` is `true`, the connection is opened with plain SQLite flags —

```
SQLITE_OPEN_READONLY | SQLITE_OPEN_URI
```

— versus `SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_URI` when not read-only. There is no `node:sqlite`-specific interception or blocking of PRAGMA statements based on the `readOnly` flag; whatever happens next is ordinary SQLite behavior for a connection opened with `SQLITE_OPEN_READONLY`.

I could **not** find an explicit sqlite.org statement (in `wal.html`, `pragma.html#pragma_wal_checkpoint`, or `c3ref/wal_checkpoint_v2.html`) that says in so many words "a connection opened SQLITE_OPEN_READONLY cannot execute PRAGMA wal_checkpoint" or names the exact error code returned in that case. What the docs do establish, combined, is:
- `PRAGMA wal_checkpoint`'s NOOP mode "does not checkpoint any frames" and exists only to read back status — this is consistent with something a read-only handle could execute, since it performs no I/O against the database file.
- PASSIVE, FULL, RESTART, and TRUNCATE all describe moving WAL content back into the main database file, which is a write to the database file itself, and `sqlite3_wal_checkpoint_v2()`'s documented error set includes `SQLITE_BUSY` (checkpoint lock held elsewhere) but the reference page I fetched does not spell out an `SQLITE_READONLY`-on-read-only-handle case explicitly.

This is a genuine gap in what sqlite.org states directly; whether a read-only-opened connection can execute a checkpointing (non-NOOP) `PRAGMA wal_checkpoint` is not answered by the pages I checked and I am not asserting a behavior I have not confirmed in the primary source. See "What I could not establish" below.

## What I could not establish

- **Whether `PRAGMA wal_checkpoint(PASSIVE|FULL|RESTART|TRUNCATE)` succeeds, fails, or errors on a connection opened `SQLITE_OPEN_READONLY`** (which is what `node:sqlite`'s `readOnly: true` maps to). Neither `wal.html`, `pragma.html#pragma_wal_checkpoint`, nor `c3ref/wal_checkpoint_v2.html` states this explicitly in the text I retrieved. This would need to be confirmed either by locating a more specific sqlite.org statement I did not find, by inspecting SQLite's C source directly, or by empirical testing against the actual `node:sqlite` build in use — none of which I performed, since the task calls for primary-source documentation facts, not source-level archaeology or a local experiment.
- **Any sqlite.org-published numeric WAL-size "alarm" threshold** beyond the 1000-page automatic-checkpoint default. The documentation names the growth-without-bound condition qualitatively but not quantitatively.
- **Whether SQLite's own docs recommend time-based checkpoint scheduling** as an alternative to reader-gap detection for workloads (like Benchline's) where a true reader gap may be rare or nonexistent. The docs name only the reader-gap approach and the RESTART/TRUNCATE-forces-readers-to-wait tradeoff; they do not evaluate a fixed-interval scheduling policy.
- **The exact error code** returned to `node:sqlite` (or to the SQLite C API generally) when a checkpoint that requires writing to the main database file is attempted on a read-only-opened handle — I found the pragma's general error/return semantics but not a documented statement narrowly covering this case.

## Sources

- SQLite, "Write-Ahead Logging" (`wal.html`), §2.1, §3.1, §6 "Avoiding Excessively Large WAL Files," and the performance-considerations passage on read-amplification and large-transaction I/O-failure risk. https://www.sqlite.org/wal.html — fetched 2026-09-11.
- SQLite, "PRAGMA Statements," `PRAGMA wal_checkpoint`. https://www.sqlite.org/pragma.html#pragma_wal_checkpoint — fetched 2026-09-11.
- SQLite C API reference, `sqlite3_wal_checkpoint_v2()`. https://www.sqlite.org/c3ref/wal_checkpoint_v2.html — fetched 2026-09-11.
- Node.js API documentation, `node:sqlite` module, `DatabaseSync` constructor options (`readOnly`). https://nodejs.org/api/sqlite.html — Node.js v26.8.2 documentation, fetched 2026-09-11.
- `nodejs/node` repository, `src/node_sqlite.cc`, `DatabaseSync::Open()` — `main` branch, fetched 2026-09-11 (open-flag mapping for `readOnly`; confirms no PRAGMA-level interception specific to `node:sqlite`).
