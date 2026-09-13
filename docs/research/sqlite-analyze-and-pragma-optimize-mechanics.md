# Who runs ANALYZE, and on what occasion — SQLite/Node mechanics

**Asked by:** Benchline wayfinder ticket #68 ("Who runs ANALYZE, and on what occasion")
**Date:** 2026-09-11
**Status of sources:** Fetched directly from `sqlite.org` (the pages `lang_analyze.html`, `pragma.html#pragma_optimize`, and `lockingv3.html`) and from `nodejs.org`'s `node:sqlite` API docs on 2026-09-11. The Node.js docs fetched by default resolve to a version labelled v26.8.2; I re-fetched the version-pinned URL `https://nodejs.org/docs/latest-v24.x/api/sqlite.html` to confirm the same text applies to the codebase's stated Node v24.15.0 line (the `node:sqlite` module's stability history entry explicitly names v24.15.0 as the release where it became a release candidate, so the API surface described below is the one in effect for that version). No superseded/withdrawn source (e.g. the withdrawn NIST HB 150-2020, or FDA's superseded data-integrity draft) is cited anywhere in this document — none of the questions touch FDA or NIST material.

## Findings

### 1. SQLite's own rule of thumb for when ANALYZE is worth rerunning

The `ANALYZE` documentation (https://www.sqlite.org/lang_analyze.html) states the general principle without a numeric threshold:

> "Statistics gathered by ANALYZE are not updated as the content of the database changes. If the content of the database changes significantly, or if the database schema changes, then one should consider rerunning the ANALYZE command in order to update the statistics."

The numeric threshold does exist, but it lives in the `PRAGMA optimize` documentation (https://www.sqlite.org/pragma.html#pragma_optimize), under "Determination Of When To Run Analyze." `PRAGMA optimize`'s own internal heuristic (not a recommendation to the application, but the literal rule the pragma uses to decide whether to invoke `ANALYZE` on a given table) is, quoting in full:

> "In the current implementation, a table is analyzed if and only if all of the following are true:
> 1. MASK bit 0x02 is set.
> 2. The table is an ordinary table, not a view or virtual table.
> 3. The table name does not begin with "sqlite_".
> 4. One or more of the following are true:
>    1. The 0x10000 bit of MASK is set
>    2. One or more indexes on the table lack entries in the sqlite_stat1 table.
>    3. The query planner used sqlite_stat1 statistics for one or more indexes of this table at some point during the lifetime of the current database connection.
> 5. One or more of the following are true:
>    1. One or more indexes on the table lack entries in the sqlite_stat1 table.
>    2. The number of rows in the table has increased or decreased by 10-fold since the last time ANALYZE was run on the table."

So the closest thing SQLite publishes to "an order-of-magnitude change" rule is condition 5.2 above: a table's row count changing 10-fold since its last `ANALYZE`. That rule is scoped to `PRAGMA optimize`'s internal decision logic, not offered as freestanding guidance for when to run a full `ANALYZE` directly. The docs immediately add: "The rules for when tables are analyzed are likely to change in future releases."

### 2. `PRAGMA optimize` vs. full `ANALYZE`

Per https://www.sqlite.org/pragma.html#pragma_optimize:

- **What it does differently.** `PRAGMA optimize` does not unconditionally re-run `ANALYZE` on every table. It only analyzes tables meeting the five-part test quoted in Finding 1 — in short, tables that either have never been analyzed, or were actually consulted by the query planner on this connection, or have grown/shrunk 10-fold since their last `ANALYZE`. Its own doc text: "This pragma is usually a no-op or nearly so and is very fast. On the occasions where it does need to run ANALYZE on one or more tables, it sets a temporary analysis limit, valid for the duration of this pragma only, that prevents the ANALYZE invocations from running for too long."
- **Cost characteristics.** It is documented as cheap in the common case ("usually a no-op or nearly so and is very fast") because of the skip logic above, and even when it does act, it caps the cost via a temporary `PRAGMA analysis_limit`.
- **Recommended usage pattern**, quoted verbatim:
  > "1. Applications with short-lived database connections should run "PRAGMA optimize;" once, just prior to closing each database connection.
  > 2. Applications that use long-lived database connections should run "PRAGMA optimize=0x10002;" when the connection is first opened, and then also run "PRAGMA optimize;" periodically, perhaps once per day or once per hour.
  > 3. All applications should run "PRAGMA optimize;" after a schema change, especially after one or more CREATE INDEX statements."

  This confirms the "at startup and at connection close" recollection with a correction: the *startup* call for long-lived connections is specifically `PRAGMA optimize=0x10002` (mask bit `0x10000` — "check the size of all tables, not just tables that have been recently used" — combined with the default analyze-on-benefit bit `0x2`), not a bare `PRAGMA optimize`. The *close* recommendation (for short-lived connections) is a bare `PRAGMA optimize;`. For long-lived connections the periodic re-run is a bare `PRAGMA optimize;`, suggested at "once per day or once per hour" cadence — the doc does not commit to a single cadence.
- **The MASK bits**, quoted in full:
  > "0x00001 — Debugging mode... 0x00002 — Run ANALYZE on tables that might benefit. On by default. 0x00010 — When running ANALYZE, set a temporary PRAGMA analysis_limit to prevent excess run-time. On by default. 0x10000 — Check the size of all tables, not just tables that have been recently used, to see if any have grown and shrunk significantly and hence might benefit from being re-analyzed. Off by default." The default MASK is `0xfffe`.

### 3. Cost of a full `ANALYZE` at Benchline's scale

- The `ANALYZE` doc states plainly (https://www.sqlite.org/lang_analyze.html, via the fetched excerpt): "By default, ANALYZE does a full scan of every index. This can be slow for large databases." I could not retrieve from sqlite.org an explicit statement of asymptotic complexity (e.g. "O(n) in row count") in those words; the documented behavior — a full index scan — implies a cost that scales with the number of rows in each analyzed table's indexes, but I have not found a primary-source sentence that states this scaling explicitly in Big-O terms. Treat "roughly linear in rows scanned" as an inference from "full scan of every index," not a direct quote.
- `sqlite_stat1` collection (the plain, no-histogram statistics table) does not require `SQLITE_ENABLE_STAT4`. Per the same page: "The default implementation stores all statistics in a single table named 'sqlite_stat1'. If SQLite is compiled with the SQLITE_ENABLE_STAT4 option, then additional histogram data is collected and stored in sqlite_stat4." Benchline's build has `ENABLE_STAT4=0`, so only `sqlite_stat1` is ever populated — `sqlite_stat1` collection is unconditional and does not depend on the STAT4 compile flag.
- A non-zero `PRAGMA analysis_limit` (the mechanism `PRAGMA optimize` uses internally, and which an application could also set before running `ANALYZE` directly) trades completeness for speed, but the docs are explicit that this specifically disables `sqlite_stat4`, which is moot for Benchline since STAT4 isn't compiled in anyway: "The content in the sqlite_stat4 table cannot be computed with anything less than a full scan. Hence, if a non-zero analysis limit is specified, the sqlite_stat4 table is not computed." `analysis_limit` values of 100–1000 are the documented recommended range when it is used.
- I found no sqlite.org page giving measured wall-clock numbers for `ANALYZE` at a specific row count (e.g. Benchline's projected 400,000–1,100,000-row, year-two scale). That would have to come from measurement against Benchline's own database, not from the documentation — I did not run such a measurement, since this scout task is documentation-only.

### 4. `node:sqlite` support for `ANALYZE` / `PRAGMA optimize`, and event-loop blocking

- `node:sqlite`'s `DatabaseSync.exec()` is documented as "a wrapper around `sqlite3_exec()`" and accepts arbitrary SQL text, with no statement-type allowlist/denylist. Nothing in the Node.js `node:sqlite` docs singles out `ANALYZE` or `PRAGMA optimize` for special treatment, restriction, or unsupported-statement error — they run as ordinary SQL exactly like any other statement.
- The docs state, of the synchronous classes involved (`DatabaseSync`, `StatementSync`): "All APIs exposed by this class execute synchronously." Node's own docs do not add an explicit sentence warning that a slow `ANALYZE` call blocks the event loop for its duration — that consequence follows directly from "execute synchronously" plus `ANALYZE`'s own documented full-index-scan cost (Finding 3), not from a Node-specific caveat.
- Module stability: the `node:sqlite` history note (surfaced in the v24.x doc fetch) records "v24.15.0 — SQLite is now a release candidate," consistent with the ticket's stated Node v24.15.0. The `readOnly` constructor option is documented as: "If true, the database is opened in read-only mode. If the database does not exist, opening it will fail. Default: false" — consistent with the ticket's description of the query module's read-only connection, and with `ANALYZE`/writes to `sqlite_stat1` failing there (that specific error string was supplied by the ticket, not independently reproduced by this scout from Node's docs, which do not enumerate the read-only error text).

### 5. Whether SQLite auto-refreshes stats on writes

The `ANALYZE` documentation's own statement (quoted in Finding 1) is the direct confirmation: "Statistics gathered by ANALYZE are not updated as the content of the database changes." Ordinary `INSERT`/`UPDATE`/`DELETE` traffic does not touch `sqlite_stat1`. The only documented ways `sqlite_stat1` changes are: an explicit `ANALYZE` statement, an explicit `PRAGMA optimize` invocation (which internally runs `ANALYZE` on qualifying tables per Finding 1's five-part test), or manual manipulation of the `sqlite_stat1` table itself (e.g. dropping/editing it, which the docs describe elsewhere as a supported but manual mechanism, not covered in the pages fetched here). So staleness is unbounded absent one of those explicit triggers — there is no ambient auto-refresh.

### 6. Locking behavior of `ANALYZE`, and interaction with `BEGIN IMMEDIATE` writers

- `ANALYZE` writes to the `sqlite_stat1` table, and https://www.sqlite.org/lockingv3.html documents locking purely in terms of statement type, not table identity: "After a BEGIN command, a SHARED lock will be acquired when the first SELECT statement is executed. A RESERVED lock will be acquired when the first INSERT, UPDATE, or DELETE statement is executed." Because `ANALYZE`'s implementation deletes and re-inserts rows in `sqlite_stat1`, it acquires a RESERVED lock the same way any ordinary write statement would — the lockingv3 page does not name `ANALYZE` specifically, so this is an inference from the documented mechanics of what `ANALYZE` does (writes to a real table) combined with the documented lock-acquisition rule for writes, not a direct quote naming `ANALYZE`.
- lockingv3.html's definitions, quoted: "A RESERVED lock means that the process is planning on writing to the database file at some point in the future but that it is currently just reading from the file. Only a single RESERVED lock may be active at one time, though multiple SHARED locks can coexist with a single RESERVED lock." And: "An EXCLUSIVE lock is needed in order to write to the database file. Only one EXCLUSIVE lock is allowed on the file and no other locks of any kind are allowed to coexist with an EXCLUSIVE lock." Commit requires escalating to EXCLUSIVE: "Obtain a PENDING lock and then an EXCLUSIVE lock on the database file. If other processes still have SHARED locks, the writer might have to wait until those SHARED locks clear before it is able to obtain an EXCLUSIVE lock."
- A `BEGIN IMMEDIATE` writer takes a RESERVED lock up front (per the same locking model) and only one RESERVED lock can be held database-wide at a time, so `ANALYZE` and a concurrent `BEGIN IMMEDIATE` writer would contend for that single RESERVED slot — whichever gets there first blocks the other until it commits/rolls back. I did not find a sqlite.org page stating this `ANALYZE`-vs-`BEGIN IMMEDIATE` interaction in those specific terms; it is my inference from the two documented mechanisms (what `ANALYZE` writes, and how RESERVED locks are acquired and serialized), not a direct quote about `ANALYZE` and `BEGIN IMMEDIATE` together.
- I found no sqlite.org source estimating how long `ANALYZE` would hold that lock at a specific row count such as Benchline's projected year-two range (400,000–1,100,000 rows across tables, per ticket #8). That figure would require measurement against Benchline's own data, which is out of scope for a documentation-only scout task.

## What I could not establish

- A primary-source sentence stating `ANALYZE`'s cost in explicit asymptotic terms (e.g., "O(n) in row count"). The documentation says it does "a full scan of every index" and can be "slow for large databases," which supports but does not literally state a linear-cost claim.
- Any sqlite.org page that names `ANALYZE` explicitly in the same sentence as `BEGIN IMMEDIATE`, RESERVED-lock contention, or lock-hold duration at a given scale. The lock analysis above is an inference chaining two separately-documented facts (what ANALYZE writes; how RESERVED locks work), not a single quoted source describing the interaction directly.
- Any measured wall-clock timing for `ANALYZE` or `PRAGMA optimize` at Benchline's specific row counts (400,000–1,100,000 rows across tables). No sqlite.org or Node.js documentation page offers benchmark numbers at that scale; producing one would require running it against Benchline's actual database, which this scout did not do.
- Whether the Node.js `node:sqlite` docs contain any *dedicated* discussion of `PRAGMA optimize` or `ANALYZE` — they do not; both are only reachable as arbitrary SQL through `exec()`/`prepare()`, with no named caveats either way.

## Sources

- SQLite, "ANALYZE," https://www.sqlite.org/lang_analyze.html — fetched 2026-09-11 (current live sqlite.org page; SQLite documentation is versioned continuously with the sqlite.org site itself, no separate "final version" date is published on the page).
- SQLite, "PRAGMA optimize," https://www.sqlite.org/pragma.html#pragma_optimize — fetched 2026-09-11 (current live sqlite.org page).
- SQLite, "File Locking And Concurrency In SQLite Version 3," https://www.sqlite.org/lockingv3.html — fetched 2026-09-11 (current live sqlite.org page; describes the legacy rollback-journal locking model, which the docs use as the reference vocabulary for lock names such as RESERVED/EXCLUSIVE even under WAL).
- Node.js, `node:sqlite` API documentation, https://nodejs.org/docs/latest-v24.x/api/sqlite.html — fetched 2026-09-11, version-pinned to the v24.x doc line; stability history entry within that page confirms v24.15.0 as the release where `node:sqlite` became a release candidate, matching the ticket's stated Node version.
