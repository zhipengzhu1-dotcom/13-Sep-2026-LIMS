# SQLite migration mechanics and backup: what the primary documentation says about a row-rewriting `samples.document` migration

**Asked by:** orchestrator (Benchline wayfinder map effort), row-rewriting migration exploding `samples.document` JSON into five relational tables
**Date:** 2026-09-11
**Status of sources:** All SQLite citations checked against the live pages at sqlite.org on 2026-09-11 (current documentation, not a mirrored or draft copy — `www2.sqlite.org/draft/...` mirrors were seen in search results but not used). Node.js citations checked against the current `nodejs.org/api/sqlite.html` page, which documents the module as of the latest Node.js release line at time of check. Version numbers for `backup()` and stability markers are quoted directly from that page's own History/Stability annotations, not inferred.

## Findings

### 1. SQLite's "generalized ALTER TABLE procedure"

Source: https://www.sqlite.org/lang_altertable.html, section "Making Other Kinds Of Table Schema Changes" (12-step procedure).

Reproduced as documented:

1. "If foreign key constraints are enabled, disable them using `PRAGMA foreign_keys=OFF`."
2. "Start a transaction."
3. "Remember the format of all indexes, triggers, and views associated with table X." (e.g. `SELECT type, sql FROM sqlite_schema WHERE tbl_name='X'`)
4. "Use `CREATE TABLE` to construct a new table 'new_X' that is in the desired revised format of table X."
5. "Transfer content from X into new_X using a statement like: `INSERT INTO new_X SELECT ... FROM X`."
6. "Drop the old table X: `DROP TABLE X`."
7. "Change the name of new_X to X using: `ALTER TABLE new_X RENAME TO X`."
8. "Use `CREATE INDEX`, `CREATE TRIGGER`, and `CREATE VIEW` to reconstruct indexes, triggers, and views associated with table X."
9. "If any views refer to table X in a way that is affected by the schema change, then drop those views ... and recreate them."
10. "If foreign key constraints were originally enabled then run `PRAGMA foreign_key_check` to verify that the schema change did not break any foreign key constraints."
11. "Commit the transaction started in step 2."
12. "If foreign keys constraints were originally enabled, reenable them now."

Key documented details:
- `PRAGMA foreign_keys` is turned off *before* the transaction starts (step 1, outside the `BEGIN`), and re-enabled only after `COMMIT` (step 12). The documentation does not describe `PRAGMA legacy_alter_table` as part of this procedure; that pragma is discussed elsewhere on the same page in connection with the plain `ALTER TABLE RENAME` command's handling of references inside triggers/views, not this 12-step generalized procedure.
- `PRAGMA foreign_key_check` (step 10) runs *inside* the transaction, before `COMMIT` (step 11) — i.e. it is the last check performed before the change is made durable.
- `PRAGMA integrity_check` is **not** named anywhere in the 12-step procedure. It is not part of this documented sequence.
- Documented order is: create new → copy data → **drop old → rename new to old** (steps 6 then 7). The documentation explicitly labels the reverse — rename old table out of the way first, then create/copy/drop — as the **incorrect** procedure, stating verbatim: "The incorrect procedure ... does not always work, especially with the enhanced rename table capabilities added by versions 3.25.0 and 3.26.0. In the procedure on the right, the initial rename of the table to a temporary name might corrupt references to that table in triggers, views, and foreign key constraints." The safe procedure is described as always naming the *new* table something temporary, then renaming it into the final name at the end — never renaming the original table away from its name mid-procedure.

### 2. Transactional DDL

The dedicated transaction page (https://www.sqlite.org/lang_transaction.html) does not itself state in so many words that CREATE TABLE/DROP TABLE/ALTER TABLE/CREATE INDEX are transactional; it states only the general rule that "No reads or writes occur except within a transaction... any SQL command, except a few PRAGMA statements, will automatically start a transaction if one is not already in effect."

I could not find a single sqlite.org documentation page that states outright, in one sentence, "DDL is transactional in SQLite" — this is treated as a consequence of SQLite's general page-level atomic-commit design rather than called out as a special DDL property on a dedicated doc page. The atomic-commit page (https://www.sqlite.org/atomiccommit.html) describes the page-level journaling/rollback mechanism that applies uniformly to all writes, including schema changes, but does not name DDL statements specifically.

The **12-step ALTER TABLE procedure itself is the primary-source evidence** that SQLite's own documentation relies on and expects this behavior: step 2 explicitly opens a transaction, steps 4–10 include CREATE TABLE, INSERT, DROP TABLE, and ALTER TABLE ... RENAME all before step 11's COMMIT, and the whole point of doing so is that it can be rolled back as a unit if something fails partway through.

Documented exception: **VACUUM**. The `lang_vacuum.html` page states verbatim: "A VACUUM will fail if there is an open transaction on the database connection that is attempting to run the VACUUM," and further: "Unfinalized SQL statements typically hold a read transaction open, so the VACUUM might fail if there are unfinalized SQL statements on the same connection." A community forum thread on sqlite.org's own forum (https://sqlite.org/forum/info/ee84e06e00b70b72d1d88d73ed33ce88a9bc43cf510118d5d8e8b6f8a1c0fab6, "Does SQLite fully support Transactional DDL?") corroborates that SQLite draws no distinction between DML and DDL for transaction purposes — but a forum post is a community answer, not the owning documentation, and is noted here only as corroboration, not as a cited authority.

I did not find documentation stating `PRAGMA journal_mode` changes cannot run inside a transaction; this was not verified either way and should be treated as open (see "What I could not establish").

### 3. Locking and "downtime"

**WAL mode** (https://www.sqlite.org/wal.html):
- "Because writers do nothing that would interfere with the actions of readers, writers and readers can run at the same time." — i.e., readers do **not** block during a write transaction in WAL mode.
- Checkpointing is what can be blocked, not ordinary readers: "a long-running read transaction can prevent a checkpointer from making progress."
- On WAL growth during large write transactions: "A checkpoint can only complete when no other transactions are running, which means the WAL file cannot be reset in the middle of a write transaction. So a large change to a large database might result in a large WAL file." The page further documents: "WAL does not work well for very large transactions. For transactions larger than about 100 megabytes, traditional rollback journal modes will likely be faster. For transactions in excess of a gigabyte, WAL mode may fail with an I/O or disk-full error."
- Manual checkpointing: `PRAGMA wal_checkpoint;` or the C APIs `sqlite3_wal_checkpoint()` / `sqlite3_wal_checkpoint_v2()`. Automatic checkpointing is documented as triggered "when the WAL reaches 1000 pages or when the last connection closes," tunable via `PRAGMA wal_autocheckpoint`. Three checkpoint modes are documented: PASSIVE (default, non-blocking), FULL, and RESTART (more aggressive/blocking).

**Locking, rollback-journal mode** (https://www.sqlite.org/lockingv3.html): the write lock sequence is RESERVED → (memory cache fills) → PENDING → EXCLUSIVE, and the page states the EXCLUSIVE lock "must be held until all changes are committed," meaning "no other processes are able to access the database from the time the memory cache first spills to disk until the transaction commits." The page explicitly disclaims covering WAL: "The document only describes locking for the older rollback-mode transaction mechanism. Locking for the newer write-ahead log or WAL mode is described separately," pointing to `wal.html`.

Given the stated environment (WAL mode, `synchronous=FULL`), the documentation's own position is that readers are not blocked by the migration's write transaction, but the WAL file itself can grow large for a single big row-rewriting transaction, and a checkpoint cannot complete until that transaction finishes.

### 4. `node:sqlite` `DatabaseSync.prototype.backup()`

Source: https://nodejs.org/api/sqlite.html.

Documented signature: `sqlite.backup(sourceDb, path[, options])`.

- `sourceDb` — the `DatabaseSync` to back up; "must be open."
- `path` — string, Buffer, or URL; "If the file already exists, the contents will be overwritten."
- `options.source` — name of the source database (`'main'` by default, or an attached database).
- `options.target` — name of the target database (`'main'` by default, or an attached database).
- `options.rate` — "Positive number of pages to be transmitted in each batch of the backup." Default: `100`.
- `options.progress` — optional callback invoked after each backup step, receiving an object with `remainingPages` and `totalPages`.
- **Returns:** a `Promise` that "fulfills with the total number of backed-up pages upon completion, or rejects if an error occurs."
- **Concurrent-write behavior, quoted verbatim:** "The backed-up database can be used normally during the backup process. Mutations coming from the same connection - same `DatabaseSync` - object will be reflected in the backup right away. However, mutations from other connections will cause the backup process to restart."
- **Added in:** v23.8.0, v22.16.0 (per the page's own History annotation); a later History entry notes v23.10.0 extended `path` to accept Buffer/URL.
- **Stability:** the `node:sqlite` module as a whole is marked "Stability: 1.2 - Release candidate" on the current page, with History entries showing it moved from behind the `--experimental-sqlite` flag (removed as of v23.4.0/v22.13.0) to its current release-candidate status (noted as of v25.7.0). It is not marked fully Stable, and not marked Experimental at time of check — it is at the intermediate "Release candidate" stability level as the docs define it.

Underlying SQLite Online Backup API (https://www.sqlite.org/backup.html), same restart behavior:
- General description: "The online backup API allows the contents of one database to be copied into another database file, replacing any original contents of the target database. The copy operation may be done incrementally, in which case the source database does not need to be locked for the duration of the copy, only for the brief periods of time when it is actually being read from."
- Restart-on-write behavior, quoted: "If another thread or process writes to the source database while this function is sleeping, then SQLite detects this and usually restarts the backup process when `sqlite3_backup_step()` is next called." The page also documents a same-connection exception where a write from the same database handle driving the backup is folded in without a full restart.

### 5. `VACUUM INTO`

Source: https://www.sqlite.org/lang_vacuum.html.

- "If the INTO clause is included, then the original database file is unchanged and a new database is created in a file named by the argument to the INTO clause."
- The produced file: "The new database will contain the same logical content as the original database, fully vacuumed," with all deleted content purged, "leaving behind no forensic traces."
- It is documented as usable against a live database: "The VACUUM command with an INTO clause is an alternative to the backup API for generating backup copies of a live database."
- Exclusive-access requirement: not documented as needed for `VACUUM INTO` specifically. Plain `VACUUM` (without INTO) is documented elsewhere on the same page as failing "if there is an open transaction," but this constraint applies to the connection issuing the VACUUM, not to a requirement that the whole database be otherwise idle.
- Difference from the backup API, quoted: "The advantage of using VACUUM INTO is that the resulting backup database is minimal in size and hence the amount of filesystem I/O may be reduced. Also, all deleted content is purged from the backup... On the other hand, the backup API uses fewer CPU cycles and can be executed incrementally."
- Availability through `node:sqlite`: `VACUUM INTO ...` is plain SQL text, so it is executable via `DatabaseSync.prototype.exec()` like any other SQL statement; the Node docs do not list it as a distinct method, and I found no Node.js documentation stating any restriction on running `VACUUM INTO` through `exec()`.

### 6. Integrity verification pragmas

Source: https://www.sqlite.org/pragma.html.

**`PRAGMA integrity_check`** — checks: "Table or index entries that are out of sequence; Misformatted records; Missing pages; Missing or surplus index entries; UNIQUE, CHECK, and NOT NULL constraint errors; Integrity of the freelist; Sections of the database that are used more than once, or not at all." On success: "a single row with the value 'ok' is returned." On failure, returns up to N error-description rows (N defaults to 100). It does **not** check FOREIGN KEY constraints (that is `foreign_key_check`'s job).

**`PRAGMA quick_check`** — documented as "like integrity_check except that it does not verify UNIQUE constraints and does not verify that index content matches table content." Documented cost difference, quoted: "PRAGMA quick_check runs in O(N) time whereas PRAGMA integrity_check requires O(NlogN) time where N is the total number of rows in the database. Otherwise the two pragmas are the same." Does not check UNIQUE constraints or index-to-table content correspondence.

**`PRAGMA foreign_key_check`** — "checks the database, or the table called 'table-name', for foreign key constraints that are violated." Returns one row per violation, four columns: child table name, offending rowid (or NULL for WITHOUT ROWID tables), referenced table name, and the constraint's index (matching `foreign_key_list`'s first column). On success (no violations), it returns zero rows. It checks foreign keys only — it is not documented as checking anything else (structural integrity, UNIQUE, CHECK, etc. are outside its scope, which is why it is run as a companion to, not a replacement for, `integrity_check`).

No explicit runtime/cost notes are documented for `foreign_key_check` or `integrity_check` beyond the O(N) vs O(NlogN) comparison given for `quick_check`.

### 7. `PRAGMA user_version`

Quoted: "The user_version pragma will get or set the value of the user-version integer at offset 60 in the database header. The user-version is an integer that is available to applications to use however they want. SQLite makes no use of the user-version itself." Storage location: offset 60 of the database header (a fixed on-disk header field, not a table row). No concurrency caveats are documented on this pragma's own entry.

### 8. `node:sqlite`: `exec()` vs `prepare()`, multi-statement SQL

Source: https://nodejs.org/api/sqlite.html.

`exec()` is documented as: "This method allows one or more SQL statements to be executed without returning any results. This method is useful when executing SQL statements read from a file." This documents `exec()` as supporting multiple statements in one call, including a whole SQL file's worth of statements, consistent with it wrapping `sqlite3_exec()`. `prepare()` is documented as compiling a single SQL statement into a `StatementSync` for repeated/parameterized execution — it is not documented as accepting multiple statements in one call.

## What I could not establish

- No single sqlite.org page states in one explicit sentence that "DDL is transactional." This is documented implicitly through (a) the general transaction page's "any SQL command...will automatically start a transaction," and (b) the 12-step ALTER TABLE procedure's own reliance on wrapping CREATE/INSERT/DROP/ALTER inside `BEGIN...COMMIT`. Treat this as strongly evidenced by primary-source behavior rather than a directly quotable single-sentence guarantee.
- Whether `PRAGMA journal_mode` changes can run inside a transaction, and whether they are rollback-safe, was not verified from a primary source in this pass and is left open.
- `PRAGMA legacy_alter_table`'s exact documented interaction with the 12-step generalized procedure was not found — the pragma is documented on the same `lang_altertable.html` page but in connection with the simple `ALTER TABLE ... RENAME TO` command's legacy behavior for trigger/view/foreign-key references, not as a named step of the 12-step procedure itself. I did not find a sentence stating whether or how it should be set during the 12-step procedure.
- The Node.js `sqlite.html` docs page content was retrieved via a fetch/summarization pass rather than a raw HTML diff, so exact wording for `exec()`/`backup()` should be treated as a close paraphrase-with-quotes drawn from the live page rather than a byte-for-byte HTML capture; the substantive claims (signature, options, return type, restart-on-write sentence, version-added numbers, stability level) were independently quoted and are internally consistent with Node's documented conventions, but a maintainer should re-open the live page before relying on exact punctuation.
- No node:sqlite documentation was found addressing whether `exec()` itself is transactional/atomic across the multiple statements it runs (i.e., whether a mid-file failure rolls back statements already executed by that `exec()` call) — this is a gap in the Node docs, not something I could resolve from SQLite's own docs, since that behavior depends on Node's wrapper rather than SQLite core once `exec()` is not itself wrapped in an explicit transaction.

## Sources

- SQLite, "ALTER TABLE," https://www.sqlite.org/lang_altertable.html — live page, checked 2026-09-11.
- SQLite, "Transaction," https://www.sqlite.org/lang_transaction.html — live page, checked 2026-09-11.
- SQlite, "Atomic Commit In SQLite," https://www.sqlite.org/atomiccommit.html — live page, checked 2026-09-11.
- SQLite Forum, "Does SQLite fully support Transactional DDL?" https://sqlite.org/forum/info/ee84e06e00b70b72d1d88d73ed33ce88a9bc43cf510118d5d8e8b6f8a1c0fab6 — community forum post on sqlite.org, cited only as corroboration, not as owning documentation.
- SQLite, "Write-Ahead Logging," https://www.sqlite.org/wal.html — live page, checked 2026-09-11.
- SQLite, "File Locking And Concurrency In SQLite Version 3," https://www.sqlite.org/lockingv3.html — live page, checked 2026-09-11.
- SQLite, "The SQLite Online Backup API," https://www.sqlite.org/backup.html — live page, checked 2026-09-11.
- SQLite, "VACUUM," https://www.sqlite.org/lang_vacuum.html — live page, checked 2026-09-11.
- SQLite, "PRAGMA statements," https://www.sqlite.org/pragma.html — live page, checked 2026-09-11 (sections: integrity_check, quick_check, foreign_key_check, user_version).
- Node.js, "SQLite" module docs, https://nodejs.org/api/sqlite.html — live current-release doc page, checked 2026-09-11; `backup()` documented as Added in v23.8.0/v22.16.0, module Stability: 1.2 - Release candidate as of the History entries visible on the page (v25.7.0 entry marking release-candidate status).
