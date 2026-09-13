# What does SQLite actually give you, and cost you, for a polymorphic append-only event table — and what does it cost to migrate an existing large `NOT NULL`-keyed event table into one?

**Asked by:** Orchestrator (Benchline wayfinder map research)
**Date:** 2026-09-11
**Status of sources:** Documentation claims are quoted from sqlite.org and nodejs.org/api/sqlite.html **fetched live on 2026-09-11**. sqlite.org does not version its HTML docs by URL, so "current" means "as served today". I checked currency explicitly on the one point where it mattered: sqlite.org's `changes.html` (fetched today) gives the newest SQLite release as **3.53.4 (2026-07-24)**, and records that **3.53.0 (2026-04-09)** added "Enhance ALTER TABLE to permit adding and removing NOT NULL and CHECK constraints." The SQLite **bundled in the locally installed Node is 3.51.3 (released 2026-03-13)** — i.e. *before* that feature landed, and I confirmed by probe that the syntax is rejected here (§5.1). The nodejs.org docs page currently served is a **v26.8.2** build; the locally installed runtime is **v24.15.0**, and every behavioural claim below was re-probed against the local runtime rather than taken from the docs page.

All performance figures come from scripts written to the session scratchpad (`/private/tmp/.../scratchpad`) and run in this session. Nothing was written to `src/`. No laboratory documents, client names, product names or batch identifiers appear in the synthetic data — subject keys are `SMP-nnnnnn` / `USR-nnnn` / `MV-nnnn` and the payload is filler text.

### Machine (read every figure as an optimistic bound)

| | |
|---|---|
| CPU | Apple M4 Max, 14 cores |
| Memory | 36 GiB (38,654,705,664 bytes) |
| OS | macOS 15.5 (Darwin 24.5.0), APFS on internal NVMe |
| Node | v24.15.0; `node:sqlite` `DatabaseSync`; SQLite 3.51.3 |
| Compile options (re-probed) | `ENABLE_DBSTAT_VTAB=1`, **`ENABLE_STAT4=0`**, `THREADSAFE=1`, `DEFAULT_MEMSTATUS=0` |

This is a fast laptop with an NVMe SSD and enough RAM to hold the whole 330 MB test database in the OS page cache. Figures on a modest server VM with slower storage should be expected to be **several times worse**, especially the migration numbers, which are I/O-bound. Query figures below are **warm-cache**.

---

## Findings

### 1. CHECK constraints: SQLite can enforce "exactly one of these three is non-null"

The constraint, written as a summed boolean (SQLite yields 1/0 from `IS NOT NULL`):

```sql
CONSTRAINT exactly_one_subject CHECK (
  (sampleId IS NOT NULL) + (userId IS NOT NULL) + (methodVersionId IS NOT NULL) = 1
)
```

Probe (`scratchpad/p1.mjs`), on a table with all three columns nullable and each carrying a `REFERENCES`:

| Insert | Result |
|---|---|
| exactly one non-null (`sampleId`) | **accepted** |
| exactly one non-null (`userId`) | **accepted** |
| zero non-null | **rejected** — `CHECK constraint failed: exactly_one_subject` |
| two non-null | **rejected** — same message |
| three non-null | **rejected** — same message |

`DatabaseSync` surfaces it as an ordinary catchable JS `Error`. Verbatim, as caught:

```
Error: CHECK constraint failed: exactly_one_subject
  code    = 'ERR_SQLITE_ERROR'
  errcode = 275          // SQLITE_CONSTRAINT_CHECK
  errstr  = 'constraint failed'
```

Naming the constraint puts the constraint name in the message, which is what makes it distinguishable in a `catch`. `errcode` 275 is specific to CHECK; FK violations return **787** (`SQLITE_CONSTRAINT_FOREIGNKEY`) and NOT NULL violations a different code again, so the three failure modes are separable programmatically without string-matching. (Confidence: high — directly observed.)

### 2. Foreign keys on nullable columns — and `node:sqlite` does *not* follow SQLite's default

**Documentation.** sqlite.org `foreignkeys.html` (fetched today):

> "The foreign key constraint is satisfied if for each row in the child table either one or more of the child key columns are NULL, or there exists a row in the parent table for which each parent key column contains a value equal to the value in its associated child key column."

and, for the enforcement default:

> "Foreign key constraints are disabled by default (for backwards compatibility), so must be enabled separately for each database connection. (Note, however, that future releases of SQLite might change so that foreign key constraints enabled by default. Careful developers will not make any assumptions about whether or not foreign keys are enabled by default but will instead enable or disable them as necessary.)"

> "It is not possible to enable or disable foreign key constraints in the middle of a multi-statement transaction (when SQLite is not in autocommit mode). Attempting to do so does not return an error; it simply has no effect."

**Probe.** On shape C, with FKs on, a row supplying only a valid `sampleId` (other two NULL) was accepted; a row supplying a `sampleId` that does not exist in `samples` was **rejected** with `FOREIGN KEY constraint failed` (errcode 787). So shape C does keep real referential integrity on whichever column is populated, and the NULL siblings are exempt exactly as documented.

**The `node:sqlite` deviation — this is the trap.** SQLite's own default is OFF. `DatabaseSync`'s is **ON**:

```
new DatabaseSync(':memory:')                                     -> PRAGMA foreign_keys = 1
new DatabaseSync(':memory:', {enableForeignKeyConstraints:false}) -> PRAGMA foreign_keys = 0
```

With the default connection, inserting a dangling reference threw `FOREIGN KEY constraint failed` with no pragma set by the caller. nodejs.org/api/sqlite.html (fetched today) documents this:

> `enableForeignKeyConstraints` — "If `true`, foreign key constraints are enabled. This is recommended but can be disabled for compatibility with legacy database schemas. The enforcement of foreign key constraints can be enabled and disabled after opening the database using `PRAGMA foreign_keys`. **Default: `true`.**"

Two consequences that are facts, not advice: (a) FK behaviour under `node:sqlite` differs from the same schema opened by the `sqlite3` CLI or most other bindings, so a migration script run outside Node behaves differently by default; (b) **step 1 of SQLite's 12-step table-rebuild procedure ("disable foreign keys") is not a no-op here** — it must be done explicitly, and per the quote above it cannot be done once `BEGIN` has run. (Confidence: high — docs and probe agree.)

Other observed `DatabaseSync` connection defaults: `journal_mode=memory` for `:memory:` databases, `synchronous=2` (FULL). For file databases `journal_mode` must still be set to WAL explicitly.

### 3. Generated columns — and a route to real FKs for shape B

sqlite.org `gencol.html` (fetched today): generated columns arrived in **3.31.0 (2020-01-22)**; "Generated columns may have NOT NULL, CHECK, and UNIQUE constraints, and foreign key constraints, just like ordinary columns"; "an index using STORED generated columns is an ordinary index, but an index using one or more VIRTUAL generated columns is an expression index"; and the limitation that matters for migration: "**one cannot add new STORED columns using the ALTER TABLE ADD COLUMN command. Only VIRTUAL columns can be added using ALTER TABLE.**" `lang_altertable.html` repeats it: "The column may not be GENERATED ALWAYS ... STORED, though VIRTUAL columns are allowed."

Probe results (`p2.mjs`, `p3.mjs`):

| Operation | Result |
|---|---|
| `CREATE TABLE` with `... VIRTUAL` and `... STORED` generated columns | works |
| `CREATE INDEX` on a **VIRTUAL** generated column | works; planner uses it (`SEARCH g USING INDEX g_v (sampleRef=?)`) |
| `CREATE INDEX` on a **STORED** generated column | works |
| `ALTER TABLE ADD COLUMN ... VIRTUAL` on a **non-empty** table | works; existing rows read back with the computed value |
| `ALTER TABLE ADD COLUMN ... STORED` on a **non-empty** table | **rejected** — `cannot add a STORED column` |
| `ALTER TABLE ADD COLUMN ... STORED` on an **empty** table | **accepted** (undocumented nuance — see caveat) |
| Generated columns in `PRAGMA table_info` | absent; they appear in `PRAGMA table_xinfo` with `hidden` = 2 (VIRTUAL) / 3 (STORED) |

*Caveat on the empty-table case:* sqlite.org states the STORED restriction unconditionally, but on 3.51.3 the statement succeeded against a zero-row table and failed against a two-row table. I could not find documentation acknowledging this row-count dependence, so it should be treated as an implementation detail, not a guarantee.

**The non-obvious result.** Shape B's "no real FK possible on the subject" premise is **not strictly true on this SQLite version.** A VIRTUAL generated column that projects the subject key only for one discriminator value can carry a `REFERENCES` clause, and it is enforced:

```sql
ALTER TABLE events ADD COLUMN sampleRef TEXT
  GENERATED ALWAYS AS (CASE WHEN subjectType='sample' THEN subjectId END) VIRTUAL
  REFERENCES samples(id);
```

Measured on a table already containing one valid sample event, one dangling sample event, and one user event:

- The `ALTER TABLE` itself **succeeded** against the non-empty table with the pre-existing dangling row still present (SQLite does not validate existing rows at `ALTER` time).
- A subsequent `INSERT` of a *new* event referencing a non-existent sample was **rejected**: `FOREIGN KEY constraint failed`.
- A subsequent `INSERT` of a valid sample event was accepted.
- `PRAGMA foreign_key_check` **found the pre-existing violation**: `{table:'ev', rowid:2, parent:'samples', fkid:0}` — and it also found it when the FK pragma was off during loading, i.e. `foreign_key_check` works as a retrospective audit of already-loaded data.
- The user-type row (where the generated expression is NULL) was exempt, consistent with §2.

So the referential-integrity axis does not cleanly separate B from C on this version: B can be retrofitted with enforced, `ALTER TABLE`-addable FKs per subject type, at the cost of one virtual column per type and no storage. (Confidence: high for the behaviour on 3.51.3 — directly observed, and consistent with the documented statement that generated columns may carry foreign key constraints. I did not test this against other SQLite versions.)

### 4. Partial indexes: usable, but the planner frequently declines to use them

**Documentation.** sqlite.org `partialindex.html` (fetched today), "Queries Using Partial Indexes":

> "Let X be the expression in the WHERE clause of a partial index, and let W be the WHERE clause of a query that uses the table that is indexed. Then, the query is permitted to use the partial index if W⇒X ... SQLite does not have a sophisticated theorem prover with which to determine W⇒X. Instead, SQLite uses two simple rules to find the common cases where W⇒X is true, and it assumes all the other cases are false."

> Rule 1: "If W is AND-connected terms and X is OR-connected terms and if any term of W appears as a term of X, then the partial index is usable. ... The terms in W and X must match exactly. SQLite does not do algebra to try to get them to look the same. The term 'b=6' does not match 'b=3+3' or 'b-6=0' or 'b BETWEEN 6 AND 6'."

> Rule 2: "If a term in X is of the form 'z IS NOT NULL' and if a term in W is a comparison operator on 'z' other than 'IS', then those terms match. ... any query that uses operators =, <, >, <=, >=, <>, IN, LIKE, or GLOB on column 'c' would be usable with the partial index."

**Measured (shape B, 1M rows, 990k `'sample'` / 5k `'user'` / 5k `'method'`).** Indexes `ev_part_sample ON events(at,id) WHERE subjectType='sample'` and `ev_part_user ON events(at,id) WHERE subjectType='user'`, after `ANALYZE`. Query: `SELECT id,at FROM events WHERE subjectType=<v> ORDER BY at DESC LIMIT 50`.

| Discriminator value | Plan chosen freely | Median | Plan when forced with `INDEXED BY` | Median |
|---|---|---|---|---|
| `'user'` (5k rows, 0.5%) | `SCAN events USING COVERING INDEX ev_part_user` | **0.017 ms** | same | 0.013 ms |
| `'sample'` (990k rows, 99%) | `SEARCH events USING INDEX events_subject (subjectType=?)` + `USE TEMP B-TREE FOR ORDER BY` | **182.0 ms** | `SCAN events USING COVERING INDEX ev_part_sample` | **0.016 ms** |

The partial index is **usable** for the hot value — forcing it gives 0.016 ms — but the planner declines it and instead sorts 990,000 rows in a temp B-tree. That is a **~11,000×** miss on a query the schema was indexed for. See §8 for the statistics behind it.

Matching-rule behaviour observed on shape C's `WHERE sampleId IS NOT NULL` partial indexes:

| Query predicate | Plan |
|---|---|
| `WHERE sampleId = ?` | `SEARCH events USING COVERING INDEX ev_sample (sampleId=?)` — rule 2 applies |
| `WHERE sampleId LIKE 'SMP-01%'` | `SCAN events USING COVERING INDEX ev_sample` — rule 2 applies |
| `WHERE sampleId IS NOT NULL` (990k rows) | `SCAN events USING INDEX ev_at` — index *not* used |
| `WHERE sampleId IS NULL` | `SCAN events` |
| no predicate on `sampleId` | `SCAN events` |

The `IS NOT NULL` row is a cost decision, not a rule-2 failure: the same predicate on the *rare* column (`WHERE userId IS NOT NULL`, 5k rows) **did** use the partial index — `SEARCH events USING INDEX ev_user (userId>?)`, 4.50 ms. The `IS NULL` and no-predicate rows are genuine rule failures, exactly as rule 2's own documented counter-example predicts.

**One correctness check worth recording.** A partial index being chosen for a *parameterised* predicate (`WHERE subjectType=?` bound to `'user'`) looked like it could return wrong rows if the statement were re-bound to `'sample'`. It does not: re-binding the same prepared statement across `user`/`sample`/`method`/`user` returned the correct rows and correct counts (5000 / 990000 / 5000 / 5000) every time — SQLite re-prepares when a bound value changes the viable plan. (Confidence: high — verified by re-binding a single prepared statement in sequence.)

### 5. Migration cost — the central measurement

#### 5.1 `ALTER TABLE` cannot relax `NOT NULL` on this SQLite version

sqlite.org `lang_altertable.html` (fetched today) lists exactly four capabilities: **rename table, rename column, add column, drop column.** On relaxing `NOT NULL` it says:

> "The ability to set or drop NOT NULL constraints from a column using the ALTER TABLE ALTER COLUMN syntax was **added in SQLite 3.53.0 (2026-04-09)**."

The bundled SQLite here is **3.51.3 (2026-03-13)** — four weeks earlier. Probe confirms the syntax is not merely unavailable but unparseable:

| Statement | Result on 3.51.3 |
|---|---|
| `ALTER TABLE a ALTER sampleId DROP NOT NULL` | `near "ALTER": syntax error` |
| `ALTER TABLE a ALTER COLUMN sampleId DROP NOT NULL` | `near "ALTER": syntax error` |
| `ALTER TABLE a MODIFY sampleId TEXT NULL` | `near "MODIFY": syntax error` |
| `INSERT INTO a(sampleId) VALUES(NULL)` | `NOT NULL constraint failed: a.sampleId` |

So on the runtime actually installed, **relaxing `NOT NULL` in place is impossible and the 12-step rebuild is the only route.** This is a version-boundary fact with a four-week margin: a future Node that bundles SQLite ≥ 3.53.0 would change the answer. (Confidence: high.)

The 12-step procedure, verbatim from `lang_altertable.html` § "Making Other Kinds Of Table Schema Changes", is: 1 disable foreign keys; 2 start a transaction; 3 record the format of all indexes/triggers/views via `SELECT type, sql FROM sqlite_schema WHERE tbl_name='X'`; 4 `CREATE TABLE new_X` in the revised format; 5 `INSERT INTO new_X SELECT ... FROM X`; 6 `DROP TABLE X`; 7 `ALTER TABLE new_X RENAME TO X`; 8 recreate indexes/triggers/views; 9 drop and recreate affected views; 10 `PRAGMA foreign_key_check`; 11 commit; 12 re-enable foreign keys.

#### 5.2 Measured: 1,000,000-row rebuild, `activity` (shape A) → `events` (shape B)

**Parameters.** Source table `activity(id INTEGER PRIMARY KEY, sampleId TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, detail TEXT NOT NULL)`, 1,000,000 rows, 50,000 distinct sample keys (20 events/sample), **mean 246.6 bytes of column payload per row** (`detail` is a ~185-byte JSON-ish string), two source indexes `(sampleId,id)` and `(at)`. Source database file **330,153,984 bytes (330 MB)**, page size 4096, WAL mode, `synchronous=FULL`, whole rebuild in **one transaction**. Script: `scratchpad/migrate.mjs`, file sizes polled from a parent shell process at full speed while the child worked.

| Step | Cumulative ms | main db file | WAL file |
|---|---|---|---|
| start (after `PRAGMA foreign_keys=OFF`) | 0 | 330,153,984 | 0 |
| `BEGIN` + read schema + `CREATE TABLE new_events` | 0 | 330,153,984 | 0 |
| `INSERT INTO new_events SELECT ...` (1M rows) | **568** | 330,153,984 | 273,588,632 |
| `DROP TABLE activity` | 627 | 330,153,984 | 273,930,592 |
| `ALTER TABLE new_events RENAME TO events` | 628 | 330,153,984 | 273,930,592 |
| `CREATE INDEX events_subject ON events(subjectType,subjectId,id)` | 1,081 | 330,153,984 | 304,224,952 |
| `CREATE INDEX events_at ON events(at,id)` | 1,361 | 330,153,984 | 341,618,072 |
| `PRAGMA foreign_key_check` | 1,362 | 330,153,984 | 341,618,072 |
| `COMMIT` | **1,618** | 603,910,144 | 343,402,032 |

**Headline numbers.**

| Measure | Value |
|---|---|
| Total wall-clock, 12-step rebuild of 1M rows | **1.62 s** (~1.6 µs/row) |
| Of which `INSERT..SELECT` | 0.57 s (35%) |
| Of which index builds | 0.73 s (45%) |
| Of which `COMMIT` / checkpoint | 0.26 s (16%) |
| **Peak WAL size** | **343,402,032 B (343 MB)** — *larger than the source database* |
| **Peak main db file** | **603,910,144 B (604 MB)** — 1.83× the source |
| **Peak combined disk high-water (main + WAL)** | **947,312,176 B (947 MB)** — **2.87× the 330 MB source** |
| Main file after the rebuild, un-VACUUMed | 603,910,144 B, with **64,155 of 147,439 pages on the freelist** (44% dead space) |
| `VACUUM` afterwards | **1,027 ms**, file settles to **341,131,264 B (341 MB)** |
| Full cycle including `VACUUM` | **~2.65 s**, transient peak 947 MB |

So: the WAL **does** blow up. Everything the rebuild touches — the whole new table and both new indexes — is written into the WAL because it is one uncheckpointable transaction, and `PRAGMA wal_autocheckpoint` cannot fire mid-transaction. The disk requirement for the operation is close to **three times the database size**, and without a `VACUUM` afterwards the file stays at ~1.8× forever.

#### 5.3 Positive control on the journal-mode claim

I claim WAL/FULL vs WAL/NORMAL makes no meaningful difference to this rebuild. Control showing the harness *would* have detected a difference (same rebuild, same source copy, only the pragmas varied):

| journal_mode / synchronous | Rebuild ms | Journal-or-WAL bytes just before COMMIT |
|---|---|---|
| WAL / FULL (2) | 1,450 | 341,618,072 |
| WAL / NORMAL (1) | 1,422 | 341,618,072 |
| **DELETE / FULL (2)** | **1,044** | **67,806,584** |
| **MEMORY / OFF (0)** | **961** | **0** |

The WAL/FULL→WAL/NORMAL delta (28 ms, ~2%) is within noise; the WAL→DELETE delta (406 ms, and a **5× smaller** on-disk journal) is not. The null result is therefore a real null, not an insensitive measurement. The mechanism is visible in the table: a single-commit transaction issues essentially one extra fsync under FULL, whereas the rollback-journal mode writes only the *original* page images (the file was mostly new pages, so the journal is small) rather than every new page.

#### 5.4 Measured: same source → shape C (nullable FKs + CHECK)

Same 1M-row source, same machine, WAL + `synchronous=FULL`, one transaction; parent tables (`samples` 50,000 rows, `users`, `methodVersions`) created and populated first; four indexes built (three partial subject indexes + `(at,id)`). Script `scratchpad/migc.mjs`.

| Step | Cumulative ms |
|---|---|
| `INSERT INTO new_events SELECT ...` — **CHECK evaluated per row** | 552 |
| drop + rename | 610 |
| 4 index builds | 1,281 |
| `PRAGMA foreign_key_check` — **0 violations, 174 ms** | 1,455 |
| `COMMIT` | **1,685** |

| Measure | Shape B target | Shape C target |
|---|---|---|
| Total rebuild | 1,618 ms | **1,685 ms** |
| Peak WAL | 343 MB | 338 MB |
| Peak combined disk | 947 MB | **944 MB** |

The CHECK constraint cost essentially nothing measurable during the bulk insert (552 ms vs 568 ms for shape B's constraint-free insert — within run-to-run noise). The distinct, attributable cost of shape C's referential integrity is the **174 ms `foreign_key_check`** at step 10, which is separate and required because step 1 turned FK enforcement off for the bulk load. (Confidence: high for the totals; the CHECK-is-free conclusion is medium — the two inserts differ in more than the CHECK, and I did not run a controlled CHECK-on/CHECK-off pair.)

### 6. Query cost at volume, A vs B vs C

**Parameters.** Four databases, each 1,000,000 event rows, identical content and identical skew — **990,000 `sample`, 5,000 `user`, 5,000 `method`** — 50,000 distinct samples, 500 users, 200 method versions, mean 246.6 B payload/row, page size 4096, WAL, `ANALYZE` run on each. Read-only connections. Each timing is the **median of 7–9 runs after a warm-up run**; the whole database fits in OS page cache, so these are warm-cache best cases. Script: `scratchpad/bench.mjs`, `bench2.mjs`.

File sizes: A 334,061,568 B · B 341,094,400 B · C 336,031,744 B.

#### 6a. "Last 50 events for one subject"

| Shape | Query | Plan | Median |
|---|---|---|---|
| A | `activity WHERE sampleId=? ORDER BY id DESC LIMIT 50` | `SEARCH activity USING INDEX activity_sample (sampleId=?)` | 0.018 ms |
| B | `events WHERE subjectType='sample' AND subjectId=? ORDER BY id DESC LIMIT 50` | `SEARCH events USING INDEX events_subject (subjectType=? AND subjectId=?)` | 0.018 ms |
| C | `events WHERE sampleId=? ORDER BY id DESC LIMIT 50` | `SEARCH events USING INDEX ev_sample (sampleId=?)` | 0.018 ms |

Rare type (one user, 50 rows returned): A 0.032 ms · B 0.037 ms · C 0.036 ms.

**All three shapes are indistinguishable on the single-subject query** — differences are ~0.005 ms, at or below the noise floor (max-of-7 excursions reached 0.245 ms from unrelated scheduling). Positive control that this harness resolves real differences: the OFFSET ladder in §6c spans 0.014 → 6.643 ms on the same instrument. (Confidence: high.)

#### 6b. The audit-trail view: cross-type, newest 50 — **the union does not materialise**

This was the most important measurement in the brief. Shape A's query is a three-way `UNION ALL` in a subquery with `ORDER BY at DESC, id DESC LIMIT 50`; B and C read one table with an `(at,id)` index.

| Query | Shape | Plan | Median |
|---|---|---|---|
| 1-day window (~2,787 rows in range) | A | `MERGE (UNION ALL)` / `MERGE (UNION ALL)` / `SEARCH activity USING INDEX activity_at (at>? AND at<?)` / `SEARCH accountEvents USING INDEX acct_at (...)` / `SEARCH methodEvents USING INDEX mev_at (...)` | 0.037 ms |
| | B | `SEARCH events USING INDEX events_at (at>? AND at<?)` | 0.032 ms |
| | C | `SEARCH events USING INDEX ev_at (at>? AND at<?)` | 0.033 ms |
| **Unbounded (all 1M rows), newest 50** | A | `MERGE (UNION ALL)` / `MERGE (UNION ALL)` / `SCAN activity USING INDEX activity_at` / `SCAN accountEvents USING INDEX acct_at` / `SCAN methodEvents USING INDEX mev_at` | **0.035 ms** |
| | B | `SCAN events USING INDEX events_at` | **0.031 ms** |
| | C | `SCAN events USING INDEX ev_at` | **0.033 ms** |

**Answer: yes, SQLite satisfies the union-with-limit without materialising all three tables.** The plan says `MERGE (UNION ALL)`, not a temp B-tree or a co-routine materialisation, and there is **no `USE TEMP B-TREE FOR ORDER BY` line**. SQLite recognises that each branch is already delivered in `at DESC` order by its own `at` index and performs a streaming N-way merge, stopping after 50 rows. The decisive evidence is the unbounded case: 0.035 ms over three tables totalling 1,000,000 rows is ~26 µs of work — arithmetically impossible if any branch had been materialised, and essentially identical to the 1-day-window case despite 359× more candidate rows.

The cost of shape A's union relative to the single-table shapes is **~4 µs, about 13%** — the per-row overhead of the merge comparator plus two extra B-tree cursors. This holds only while every branch has a usable index in the sort order; there is no evidence here about what happens if one branch lacks it. (Confidence: high for the "no materialisation" claim — the plan text and the flat scaling agree.)

#### 6c. Keyset pagination to page 100

**Parameters.** 50 rows/page, 100 pages (5,000 rows traversed), keyset predicate `(at<? OR (at=? AND id<?))` with `ORDER BY at DESC, id DESC LIMIT 50`. **Statements prepared once** outside the loop (with `prepare()` inside the loop, statement compilation added ~20–30% — 11.6/11.3/13.4 ms for B/C/A — so the figures below isolate execution).

| Shape | 100 pages total | Per page |
|---|---|---|
| B (one table, `(at,id)`) | **9.08 ms** | 0.091 ms |
| C (one table, `(at,id)`) | **9.10 ms** | 0.091 ms |
| A (3-way `UNION ALL`, 9 bound params/page) | **9.35 ms** | 0.094 ms |

Shape A's plan at page > 1 is still `MERGE (UNION ALL)` over three index scans — it re-seeks all three cursors on each page and stays streaming. The union's total penalty across 100 pages is **0.27 ms (3%)**.

**Positive control — the instrument does resolve differences at this scale.** The same query paged by `OFFSET` on shape B:

| OFFSET | Median |
|---|---|
| 0 | 0.014 ms |
| 4,950 | 0.029 ms |
| 50,000 | 0.168 ms |
| 500,000 | 3.606 ms |
| 999,950 | 6.643 ms |

A 474× spread. So the ~3% A-vs-B keyset difference being small is a measurement, not a blind spot. (Confidence: high.)

### 7. Index size on disk at 1M rows (`dbstat`, page size 4096)

`dbstat` totals reconciled exactly to the file size in all four databases, so these are complete.

| Shape | Table bytes | Index bytes (subject) | Index bytes (`at`) | Parent tables + autoindexes | **Total index bytes** | File |
|---|---|---|---|---|---|---|
| **A** (3 tables) | 271,020,032 + 1,372,160 + 1,372,160 | `activity_sample` 22,855,680 · `acct_user` 110,592 · `mev_mv` 106,496 | `activity_at` 36,839,424 · `acct_at` 188,416 · `mev_at` 188,416 | — | **60,289,024** | 334,061,568 |
| **B** (TEXT discriminator) | 273,756,160 | `events_subject(subjectType,subjectId,id)` 30,117,888 | `events_at(at,id)` 37,212,160 | — | **67,330,048** | 341,094,400 |
| **B2** (INTEGER discriminator) | 273,756,160 | `events_subject` 24,018,944 | `events_at` 37,212,160 | — | **61,231,104** | 334,995,456 |
| **C** (nullable FKs + CHECK) | 273,756,160 | `ev_sample` 22,855,680 · `ev_user` 110,592 · `ev_mv` 106,496 (all partial) | `ev_at` 37,212,160 | `samples` 892,928 + autoindex 1,056,768; `users` 12,288 + 12,288; `methodVersions` 4,096 + 4,096 | **60,284,928** (+1,982,464 parent-table overhead) | 336,031,744 |

Reading:

- **Shape A and shape C cost almost exactly the same in index bytes** (60,289,024 vs 60,284,928 — a 4 KB difference). C's *partial* indexes contain only the rows where the column is non-null, so they are byte-for-byte the same size as A's three separate full indexes over the same rows. Partial indexes are what makes C's index cost equal to A's rather than 3× it.
- **Shape B's subject index is the most expensive**, at 30,117,888 B — **+7,262,208 B (+32%)** over A/C's equivalent, because every one of the 1,000,000 entries carries the discriminator string as a prefix.
- C pays ~1.98 MB for parent tables and their implicit unique indexes, which A and B do not have at all (they have no parents to reference). That is the storage price of referential integrity in this test, and it scales with the number of distinct subjects, not events.
- Shape B's table heap is 2.7 MB larger than A's combined heaps for the same data — again the per-row discriminator string.

### 8. What bites

#### 8a. A TEXT discriminator costs about 25% of the discriminator index — and it is measurable

Same 1M rows, `subjectType` as `TEXT` ('sample'/'user'/'method') vs `INTEGER` (1/2/3), everything else byte-identical.

| Measure | TEXT (B) | INTEGER (B2) | Delta |
|---|---|---|---|
| `events_subject` index bytes | 30,117,888 | 24,018,944 | **−6,098,944 (−20.2%)** |
| Table heap bytes | 273,756,160 | 273,756,160 | 0 |
| Whole file | 341,094,400 | 334,995,456 | −6,098,944 (−1.8%) |
| Point lookup (`subjectType=hot AND subjectId=?`) | 0.016 ms | 0.013 ms | −0.003 ms (noise-adjacent) |
| `COUNT(*)` over the **rare** value (5k rows) | 0.052 ms | 0.045 ms | −0.007 ms |
| **`COUNT(*)` over the hot value (990k rows)** | **15.153 ms** | **11.753 ms** | **−3.40 ms (−22.4%)** |

So: **yes, measurably more, but only where you touch many index entries.** On point lookups the difference is at the noise floor; on a 990,000-entry index scan it is a consistent ~22%, which tracks the ~20% index-size difference almost exactly — i.e. the cost is page-count, not comparison cost. The table heap is unchanged because the discriminator is a rounding error against a 246-byte row. The whole-file difference is 1.8%. Note the table heap being *identical to the byte* confirms the two databases differ in nothing but the discriminator column, which is the control for this comparison. (Confidence: high.)

#### 8b. No STAT4 + a 99/0.5/0.5 skew produces a real, reproducible planner failure

`ENABLE_STAT4=0` on this build (re-probed). The consequence is visible directly in `sqlite_stat1` after `ANALYZE` on shape B:

```
events | events_subject | 1000000 333334 21 1
events | events_at      | 1000000 1 1
```

`333334` is the planner's belief about how many rows an `subjectType=?` equality returns: **total rows ÷ distinct values = 1,000,000 ÷ 3.** The true distribution is 990,000 / 5,000 / 5,000. STAT4 is exactly the mechanism that would record the per-value histogram; without it, the planner is structurally incapable of distinguishing the hot value from the rare ones on this column.

What that costs, measured (`SELECT * FROM ... WHERE <type predicate> ORDER BY at DESC LIMIT 50`):

| Shape | Rare type (`user`) | Hot type (`sample`) |
|---|---|---|
| **A** (own table) | `SCAN accountEvents USING INDEX acct_at` — **0.023 ms** | (it *is* the main table — 0.035 ms via the union, §6b) |
| **B** | `SEARCH events USING INDEX events_subject` + `USE TEMP B-TREE FOR ORDER BY` — **4.23 ms** | `SEARCH events USING INDEX events_subject` + `USE TEMP B-TREE FOR ORDER BY` — **209.6 ms** |
| **C** | `SEARCH events USING INDEX ev_user (userId>?)` + `USE TEMP B-TREE FOR ORDER BY` — **4.50 ms** | `SCAN events USING INDEX ev_at` — **0.037 ms** |

Three distinct facts here:

1. **The planner picks the same plan for a 0.5% value and a 99% value** in shape B, because `sqlite_stat1` tells it they are both 33%. For the rare type that plan is merely poor (4.23 ms — it sorts 5,000 rows). For the hot type it is catastrophic (209.6 ms — it sorts 990,000 rows in a temp B-tree to return 50).
2. **This is not fixed by adding a partial index.** Per §4, with `ev_part_sample ON events(at,id) WHERE subjectType='sample'` present and `ANALYZE` run — and with `sqlite_stat1` correctly recording that index as covering `990000` rows — the planner *still* chose the 182 ms temp-B-tree plan, while `INDEXED BY` proved the 0.016 ms plan was available. The planner had the row-count information and did not act on it.
3. **It is fixed by an index whose column order makes the sort unnecessary.** Replacing the partial indexes with a single `(subjectType, at, id)` index:

   | Value | Plan | Median |
   |---|---|---|
   | `'sample'` (990k) | `SEARCH events USING COVERING INDEX ev_type_at (subjectType=?)` | **0.012 ms** |
   | `'user'` (5k) | `SEARCH events USING COVERING INDEX ev_type_at (subjectType=?)` | **0.011 ms** |

   From 209.6 ms to 0.012 ms — a ~17,000× change — with no statistics improvement, purely because the index removes the choice. The planner's misestimate stops mattering when there is only one sane plan.

Shape C escapes the worst case for a different reason: its hot-type predicate is `sampleId IS NOT NULL`, which the planner could not match usefully to a partial index (§4) and so fell back to an ordered `ev_at` scan — an accident of the fallback being good rather than a good decision. Shape A escapes it structurally: the rare types live in 5,000-row tables where no plan is slow.

**Positive control for "the skew is what causes this":** the same schema, same index, same query text, differing only in the bound discriminator value, spans 4.23 ms to 209.6 ms (49×) under an identical plan. The plan is constant; only the row population under it changes. That isolates the cause to the row distribution rather than to the query or the index. (Confidence: high for all measurements. Medium for the attribution specifically to `ENABLE_STAT4=0` — the `sqlite_stat1` contents prove the planner holds a wrong cardinality estimate and that STAT4 is the documented mechanism for a better one, but I could not run a STAT4-enabled build side by side to confirm STAT4 would in fact change the choice.)

---

## What I could not establish

- **Whether a STAT4-enabled SQLite would actually choose differently.** I could not build or obtain a `SQLITE_ENABLE_STAT4` build to run the §8b comparison against. The claim "the planner lacks the information" is proven by `sqlite_stat1`'s contents; the claim "STAT4 would fix it" is an inference from SQLite's documented purpose for STAT4, not a measurement. Note the §4 result cuts slightly against it: the planner declined a partial index whose `sqlite_stat1` row *already* recorded the correct 990,000 count, which suggests at least part of the misjudgement is in the cost model's handling of `LIMIT` and sort-avoidance rather than in cardinality estimation alone.
- **Why the planner declines `ev_part_sample`.** I established *that* it does and that the alternative is ~11,000× faster, but not the mechanism inside the cost model. I did not run `EXPLAIN` (bytecode) or a `sqlite3_stmt_scanstatus` analysis.
- **Cold-cache behaviour.** Every query figure is warm — the 330 MB database sits in the OS page cache on a 36 GiB machine. I did not drop caches between runs (it requires elevated privileges on macOS), so I have no figures for a database larger than RAM or for first-touch reads from NVMe. The relative rankings should survive; the absolute numbers will not.
- **Concurrency.** Every measurement is single-connection, single-threaded. Nothing here says anything about what the migration's one long write transaction does to concurrent readers or writers, about WAL reader-blocking during the final checkpoint, or about `busy_timeout` behaviour. For an append-only event table under real write load this is a significant gap.
- **Scaling beyond 1M rows.** Everything was measured at exactly 1,000,000 rows and ~247 B/row. I did not measure 10M, and the migration figures in particular are dominated by I/O volume, which grows linearly while the disk high-water multiple (2.87×) should stay roughly constant — but I did not verify that.
- **The empty-table `ADD COLUMN ... STORED` nuance** (§3) contradicts sqlite.org's unconditional statement. I have the observation but no documentation explaining it and no cross-version check.
- **Trigger and view costs.** Step 3 and step 8 of the 12-step procedure concern triggers and views; my source table had none, so the rebuild timings include **zero** trigger/view reconstruction cost. A real append-only table with insert triggers or dependent views would cost more than 1.62 s, by an amount I did not measure.
- **`node:sqlite` stability.** The docs served today report stability **1.2 – Release candidate** for the module, on a v26.8.2 docs build; the local runtime is v24.15.0. I did not confirm the stability wording as published for the v24 docs tree specifically.

---

## Sources

**Documentation (all fetched live 2026-09-11; sqlite.org does not version its HTML docs by URL)**

- SQLite, "ALTER TABLE" (`lang_altertable.html`) — four ALTER capabilities; `ALTER COLUMN ... DROP NOT NULL` added in 3.53.0 (2026-04-09); the 12-step "Making Other Kinds Of Table Schema Changes" procedure; ADD COLUMN restrictions including the STORED/VIRTUAL rule: https://www.sqlite.org/lang_altertable.html
- SQLite, "SQLite Foreign Key Support" (`foreignkeys.html`) — NULL child-key exemption; FK enforcement off by default and per-connection; cannot toggle mid-transaction: https://www.sqlite.org/foreignkeys.html
- SQLite, "Generated Columns" (`gencol.html`) — added 3.31.0 (2020-01-22); FK/CHECK/NOT NULL/UNIQUE permitted on generated columns; VIRTUAL indexes are expression indexes; STORED cannot be added by ALTER TABLE; `table_xinfo` visibility: https://www.sqlite.org/gencol.html
- SQLite, "Partial Indexes" (`partialindex.html`) — the W⇒X usability rule and the two matching rules: https://www.sqlite.org/partialindex.html
- SQLite, "SQLite Release History" (`changes.html`) — newest release **3.53.4 (2026-07-24)**; **3.53.0 (2026-04-09)** "Enhance ALTER TABLE to permit adding and removing NOT NULL and CHECK constraints"; **3.51.3 released 2026-03-13** (the version bundled locally): https://www.sqlite.org/changes.html
- Node.js API documentation, `node:sqlite` (docs build served today reports **v26.8.2**; stability **1.2 – Release candidate**) — `DatabaseSync` constructor options, `enableForeignKeyConstraints` **Default: `true`**: https://nodejs.org/api/sqlite.html

**Local probes (run 2026-09-11 on Apple M4 Max / 14 cores / 36 GiB / macOS 15.5; Node v24.15.0; SQLite 3.51.3; scripts in the session scratchpad, not in this repository)**

| Script | Establishes |
|---|---|
| `p1.mjs` | CHECK exactly-one enforcement and error text/codes; FK-on-nullable behaviour; `DatabaseSync` FK default |
| `p2.mjs` | `enableForeignKeyConstraints:false`; `ALTER ... DROP NOT NULL` rejected on 3.51.3; generated-column creation, indexing, ALTER-add; `table_info`/`table_xinfo` |
| `p3.mjs` | STORED ADD COLUMN empty-vs-non-empty nuance; retrofitting an enforced FK onto shape B via a VIRTUAL generated column; `PRAGMA foreign_key_check` finding pre-existing violations |
| `gen.mjs` | Builds the 1M-row, 330 MB `activity` source table (246.6 B mean payload/row) |
| `migrate.mjs` + shell size poller | §5.2 12-step rebuild timings and disk high-water marks |
| `ctl.mjs` | §5.3 journal-mode/synchronous positive control |
| `migc.mjs` + shell size poller | §5.4 rebuild into shape C |
| `build3.mjs` | Builds A / B / B2 / C at 1M rows with the 99/0.5/0.5 skew |
| `bench.mjs`, `bench2.mjs` | §6 query timings, EXPLAIN QUERY PLAN, keyset pagination, OFFSET control |
| `bench3.mjs` | §7 `dbstat` index sizing; §8a TEXT vs INTEGER; §8b skew plans and `sqlite_stat1` |
| `bench4.mjs`, `bench5.mjs` | §4 partial-index choice vs usability (`INDEXED BY`), parameter re-prepare correctness, `(subjectType,at,id)` composite |
