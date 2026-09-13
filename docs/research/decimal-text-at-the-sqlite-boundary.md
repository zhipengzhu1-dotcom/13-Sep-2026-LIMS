# What exactly happens to decimal text at the SQLite boundary, and what does that cost?

**Asked by:** Orchestrator (Benchline wayfinder map scouting task)
**Date:** 2026-09-11
**Status of sources:** SQLite documentation fetched live from sqlite.org on 2026-09-11 (current pages, no dated/versioned snapshot exists for these reference pages — sqlite.org's docs track the latest release, currently SQLite 3.4x series as of this date). Node docs fetched live from nodejs.org/api/sqlite.html on 2026-09-11; the fetched page reflects a version of the API newer than what ships in this machine's Node 24.15.0 (it documents a `boolean`-binding feature "added in v26.8.0" that this machine's Node 24.15.0 does **not** have — confirmed by experiment below). All experiments run locally with `node --version` = **v24.15.0** on this machine (Darwin 24.5.0), using `node:sqlite`'s `DatabaseSync`, in-memory databases (`:memory:`), September 2026.

All claims below are labeled **VERIFIED** (I ran the code or read the cited doc text myself this session) or **SECONDARY** (inferred/not independently re-run).

## Findings

### 1. Type affinity

SQLite's own affinity rules (VERIFIED, quoted from https://www.sqlite.org/datatype3.html, fetched 2026-09-11):

- TEXT affinity rule: "If the declared type of the column contains any of the strings 'CHAR', 'CLOB', or 'TEXT' then that column has TEXT affinity. Notice that the type VARCHAR contains the string 'CHAR' and is thus assigned TEXT affinity."
- No-type-declared rule: "If the declared type for a column contains the string 'BLOB' or if no type is specified then the column has affinity BLOB." — **but this is the affinity rule for schema/index purposes; it does not mean SQLite silently converts an inserted string.** My own experiment (below) shows a column declared with no type at all still stores and returns the exact string, matching BLOB-affinity behavior of "leave input mostly alone" for text.
- NUMERIC affinity rule (falls through when none of INT/CHAR-CLOB-TEXT/BLOB/REAL-FLOA-DOUB match): "Otherwise, the affinity is NUMERIC."
- Behavior of TEXT affinity column: "A column with TEXT affinity stores all data using storage classes NULL, TEXT or BLOB. If numerical data is inserted into a column with TEXT affinity it is converted into text form before being stored."
- Behavior of NUMERIC affinity column: "When text data is inserted into a NUMERIC column, the storage class of the text is converted to INTEGER or REAL (in order of preference) if the text is a well-formed integer or real literal, respectively."

**Experiment (VERIFIED)** — `node:sqlite` `DatabaseSync`, inserting the strings `'98.0'`, `'0.10'`, `'1.40e3'`, `'102.35'`, `'98'` into columns of declared type `TEXT`, no type, `NUMERIC`, `REAL`, `INTEGER`:

```
--- t_text (TEXT) ---
"98.0" string sqlite typeof= text
"0.10" string sqlite typeof= text
"1.40e3" string sqlite typeof= text
"102.35" string sqlite typeof= text
"98" string sqlite typeof= text
--- t_none (no declared type) ---
"98.0" string sqlite typeof= text
"0.10" string sqlite typeof= text
"1.40e3" string sqlite typeof= text
"102.35" string sqlite typeof= text
"98" string sqlite typeof= text
--- t_numeric (NUMERIC) ---
98 number sqlite typeof= integer
0.1 number sqlite typeof= real
1400 number sqlite typeof= integer
102.35 number sqlite typeof= real
98 number sqlite typeof= integer
--- t_real (REAL) ---
98 number sqlite typeof= real
0.1 number sqlite typeof= real
1400 number sqlite typeof= real
102.35 number sqlite typeof= real
98 number sqlite typeof= real
--- t_integer (INTEGER) ---
98 number sqlite typeof= integer
0.1 number sqlite typeof= real
1400 number sqlite typeof= integer
102.35 number sqlite typeof= real
98 number sqlite typeof= integer
```

**Conclusion (VERIFIED):** only a column declared `TEXT` (or with no declared type at all, which falls under BLOB affinity and also passes strings through unchanged for this test) round-trips `"98.0"` byte-for-byte, with `typeof` remaining `string` in JS. `NUMERIC`, `REAL`, and `INTEGER` declared columns all silently convert `"98.0"` to the JS number `98`, discarding the trailing zero — this is exactly the failure mode the "decimal text" decision guards against. `NUMERIC` and `INTEGER` columns even collapse `"1.40e3"` to the integer `1400`.

### 2. Node `node:sqlite` binding and return types

From Node's official docs (nodejs.org/api/sqlite.html, fetched 2026-09-11) — **SECONDARY for the parts not exercised, VERIFIED for the parts I tested**:

- Documented bindable JS types: `null`, `number`, `bigint`, `boolean` ("added in v26.8.0"), `string`, `Buffer`, `TypedArray`, `DataView`, `ArrayBuffer`, `SharedArrayBuffer` ("added in v26.8.0"). Quote: "Binding any other value throws an `ERR_INVALID_ARG_TYPE` error."
- Documented SQLite→JS return mapping: `NULL`→`null`, `INTEGER`→`number` or `bigint` (configurable), `REAL`→`number`, `TEXT`→`string`, `BLOB`→`Uint8Array`.
- `readBigInts`: quote — "When reading from the database, SQLite `INTEGER`s are mapped to JavaScript numbers by default. However, SQLite `INTEGER`s can store values larger than JavaScript numbers are capable of representing. In such cases, this method can be used to read `INTEGER` data using JavaScript `BigInt`s... If Node.js reads an `INTEGER` value from SQLite that is outside the JavaScript safe integer range, and the option to read BigInts is not enabled, then an `ERR_OUT_OF_RANGE` error will be thrown." Available as constructor option `readBigInts`, `db.prepare(sql, { readBigInts: true })`, or `statement.setReadBigInts(enabled)`.

**Experiment (VERIFIED)** on Node v24.15.0:

- Binding `'98.0'` (string), `98.0` (number), `98n` (bigint), `null`, and a `Buffer` all succeeded.
- Binding `true` (boolean) **failed** with `Provided value cannot be bound to SQLite parameter 1.` — confirming that on this machine's Node 24.15.0, boolean binding is **not** supported (consistent with the fetched docs' note that boolean binding is "added in v26.8.0", i.e. a later Node release than what this deployment target uses).
- Reading back: TEXT column → JS `string`; REAL column → JS `number`; INTEGER column → JS `number`; NULL → JS `null`; BLOB (bound a `Buffer`) → returned as `Uint8Array`, not `Buffer` (`Buffer.isBuffer()` on the returned value was `false`).
- `readBigInts`: with default settings, reading an `INTEGER` value `9007199254740993n` (just past `Number.MAX_SAFE_INTEGER`) threw `RangeError: Value is too large to be represented as a JavaScript number... ERR_OUT_OF_RANGE`. After calling `statement.setReadBigInts(true)`, the same read returned `9007199254740993n` correctly as a `bigint`. This confirms the flag is real and required for large integers, though it is not relevant to decimal-text values, which never hit this path since they are stored as TEXT.
- There is **no implicit numeric coercion of a bound string** by the Node layer itself — the string `'98.0'` bound as a parameter went in as text regardless of target column; the conversion to a number observed in section 1 happens **inside SQLite** as a function of column affinity, not in the Node binding layer.

### 3. Comparison, sorting, and available escapes

**SQLite comparison/sort semantics (VERIFIED by experiment).** In a `TEXT` column with default BINARY collation, `ORDER BY v` sorted `('9.5','98.0','100','98')` as:

```
lexicographic ORDER BY v: [ '100', '9.5', '98', '98.0' ]
```

i.e. `'100'` sorts before `'9.5'` and `'98'`, which is not numeric order. Confirmed with direct comparisons:

```
text compare '100' < '98'?        -> 1 (true, lexicographic)
CAST('100' AS REAL) < CAST('98' AS REAL)? -> 0 (false, correct numeric answer)
unary_plus: 100 < 98 (numeric literals) -> 0
```

**Escapes tested (VERIFIED):**

- `CAST(v AS REAL)` in `ORDER BY` produced correct numeric order: `['9.5','98.0','98','100']`.
- Unary `+` (`ORDER BY +v`) did **not** change the order — it stayed lexicographic (`['100','9.5','98','98.0']`), matching the SQLite docs quote (https://www.sqlite.org/lang_expr.html, fetched 2026-09-11): "The unary operator + is a no-op. It can be applied to strings, numbers, blobs or NULL and it always returns a result with the same value as the operand." Unary `+` is **not** a numeric-comparison escape for TEXT-affinity data — this is a finding worth flagging since it is sometimes assumed to force numeric affinity; it does not, on this SQLite/Node build.

**Expression indexes (VERIFIED / quoted from https://www.sqlite.org/expridx.html, fetched 2026-09-11):**
Quote: "The SQLite query planner will consider using an index on an expression when the expression that is indexed appears in the WHERE clause or in the ORDER BY clause of a query, exactly as it is written in the CREATE INDEX statement." And: "The query planner does not do algebra" — e.g. an index on `(x+y)` will not match `WHERE y+x=22`. Restrictions quoted/paraphrased: only deterministic expressions are indexable (no `random()`, no non-deterministic functions), no subqueries, expression may reference only columns of the indexed table, and expression indexes cannot appear in `PRIMARY KEY`/`UNIQUE` table constraints (only in `CREATE INDEX`). Supported since SQLite 3.9.0 (2015-10-14) per that page; older SQLite files using expression indexes are not readable by earlier versions.

I verified the query planner does use such an index with a real `EXPLAIN QUERY PLAN` — see section 4.

**Custom collations and custom functions in `node:sqlite` (VERIFIED by inspecting the live `DatabaseSync.prototype`):**

```
DatabaseSync proto methods: [
  'aggregate','applyChangeset','close','constructor','createSession',
  'createTagStore','enableDefensive','enableLoadExtension','exec',
  'function','loadExtension','location','open','prepare','setAuthorizer'
]
```

- `db.function(name[, options], fn)` **exists** and works — registering a scalar SQL function `as_real` and using it in `ORDER BY as_real(v)` correctly numeric-sorted the same test rows: `['9.5','98.0','98','100']`.
- `db.aggregate(...)` exists (for custom aggregate functions) but was not exercised here.
- `db.createSession(...)` exists, but it is for SQLite's session/changeset extension (tracking and applying row changes, `applyChangeset`) — **not** a collation mechanism.
- There is **no** `createFunction`-named method (the method is literally named `function`), and I found **no method for registering a custom collation sequence** anywhere on `DatabaseSync.prototype`. This matches what the fetched Node docs describe (custom scalar/aggregate functions are documented; no `createCollation`/collation-registration API is documented). This is a **finding of absence**, not proof a hidden API doesn't exist — I checked the live prototype's own-property list and the fetched official docs page; neither shows one.

### 4. Which queries mechanically need numeric comparison, and their cost

Mechanically, any SQL-level operation that must order or range-filter decimal-text values numerically (rather than lexicographically) needs one of: `CAST(col AS REAL)` in the predicate/ORDER BY, a registered custom function via `db.function()` used the same way, or an expression index built on one of those exact expressions. This applies to: range queries over results (e.g. "results between X and Y"), sorting by value, and aggregate/trend queries that need true numeric ordering or bucketing.

**Performance experiment (VERIFIED)** — 200,000-row in-memory tables, Node v24.15.0, this machine, September 2026. Built `r_text(id, v TEXT)` with random 2-decimal values as strings, and `r_real(id, v REAL)` with the numeric equivalent. Ran `SELECT id FROM ... WHERE <predicate> BETWEEN 400 AND 401`.

```
a: text, no index, CAST(v AS REAL) BETWEEN 400 AND 401
   rows: 179   time: 11.72 ms
   EXPLAIN QUERY PLAN: SCAN r_text

b: text, expression index CREATE INDEX ... ON r_text(CAST(v AS REAL)), same query
   rows: 179   time: 0.080 ms
   EXPLAIN QUERY PLAN: SEARCH r_text USING COVERING INDEX idx_text_real (<expr>>? AND <expr><?)

c: REAL column with a plain index CREATE INDEX ... ON r_real(v), WHERE v BETWEEN 400 AND 401
   rows: 179   time: 0.070 ms
   EXPLAIN QUERY PLAN: SEARCH r_real USING COVERING INDEX idx_real (v>? AND v<?)
```

A repeat of the same three queries in the same session (after the indexes existed / after first execution) all completed in ~0.025 ms each; this drop from 11.7ms likely reflects warmed statement/page caching within the same process and should not be read as "unindexed text scans are free the second time" — the `EXPLAIN QUERY PLAN` for the unindexed case (`a`) still shows a full `SCAN r_text`, i.e. still O(n) by plan, just fast in absolute terms for 200k rows resident in memory. I did not attempt to isolate cache effects further.

**Observed cost, mechanically:** an unindexed numeric comparison over decimal-text forces a full table scan with a `CAST` applied per row (`SCAN`, no index use). An expression index on the exact `CAST(v AS REAL)` expression lets the planner use it (`SEARCH ... USING COVERING INDEX`) and is, in this run, indistinguishable in speed from an equivalent index on a native `REAL` column. Building and maintaining that expression index is an extra schema object and extra write-path cost (each insert/update must maintain the index) not present in the plain-`REAL` design; I did not measure insert/update overhead in this session.

### 5. Storage cost

From SQLite's own record-format documentation (https://www.sqlite.org/fileformat2.html, fetched 2026-09-01 — **note: I did not independently verify a byte count on disk with a hex dump in this session; the byte counts below are the documented serial-type sizes, not a measured file diff**, so this sub-claim is **SECONDARY** in the sense that I did not run a raw file-format inspection, though it is a direct quote/paraphrase of the primary spec):

- Serial type 7 = IEEE-754 64-bit float (`REAL`): always 8 bytes of payload.
- Serial types ≥ 12: even N is BLOB with `(N-12)/2` bytes; odd N is TEXT with `(N-13)/2` bytes of payload (no NUL terminator stored).
- For the string `"98.0"` (4 characters): serial type 21 (odd → TEXT), payload = `(21-13)/2 = 4` bytes.
- For the string `"102.35"` (6 characters): serial type 25 (odd → TEXT), payload = `(25-13)/2 = 6` bytes.
- A `REAL` value is always 8 bytes of payload regardless of its digits.
- Each record cell also carries a small varint header per column (1 byte for most small serial-type codes) that I did not separately measure; this is common to both TEXT and numeric columns and is not unique to the decimal-text design.
- **Integer-valued numbers stored as text** (e.g. `"98"`, 2 characters) cost only their character count as TEXT payload (2 bytes) — there is no special-casing that makes a text column store `"98"` as cheaply as SQLite's own zero/one serial-type optimizations (serial types 8 and 9, which store the integers 0 and 1 in **zero bytes** of payload) — those zero-byte optimizations apply only to genuine `INTEGER`-affinity columns, not to TEXT.

**Net effect (secondary, derived from the above primary numbers, not independently disk-measured this session):** for short decimal strings (≤8 characters), TEXT storage is generally at or below the fixed 8-byte cost of a `REAL`; for longer decimal strings (9+ characters, e.g. very long trailing-zero-padded values) TEXT storage costs more per row than a `REAL`.

### 6. JSON

**Experiment (VERIFIED)** — a JSON column `spec` holding `{"limit_str":"98.0","limit_num":98.0}` (as produced by `JSON.stringify` in Node), queried via SQLite's JSON1 `json_extract`:

```
json_extract(spec,'$.limit_str') -> '98.0', typeof = text
json_extract(spec,'$.limit_num') -> 98,     typeof = integer
```

So `json_extract` **preserves** a JSON string value's exact text (`"98.0"` stays `"98.0"`), but a JSON **number** is extracted as SQLite's own numeric type — and note this observation goes one step further back: **the loss for `limit_num` already happened in JavaScript before the JSON ever reached SQLite.**

```
JS: JSON.stringify({limit_str:"98.0", limit_num: 98.0})
 -> '{"limit_str":"98.0","limit_num":98}'
JS: JSON.parse('{"limit_str":"98.0","limit_num":98}')
 -> { limit_str: 'string "98.0"', limit_num: 'number 98' }
```

`JSON.stringify` on the JS number `98.0` produces the JSON text `98` (JS has no distinct float/int types and no concept of a "trailing zero" on a `Number`, so `98.0 === 98` and stringifies identically) — the trailing zero is already gone at the JavaScript layer, before SQLite's JSON1 functions are ever invoked. A JSON **string** field (`"98.0"`), by contrast, round-trips through both `JSON.stringify`/`JSON.parse` and SQLite's `json_extract` unchanged, because it is opaque text to both layers.

## What I could not establish

- I did not measure actual on-disk file size differences with a persistent (non-`:memory:`) database and a hex/byte-level diff; the storage-cost figures in section 5 are the documented serial-type formulas, not an independently measured file size in this session.
- I did not measure INSERT/UPDATE-path overhead of maintaining an expression index (section 4) versus a plain REAL index; only SELECT-side timing was measured.
- I could not find, and did not exhaustively search beyond the fetched docs page and the live `DatabaseSync.prototype`, any Node.js proposal or flag for custom collation support; absence of evidence in the current docs/prototype is not a guarantee no such flag exists under a different, undocumented name.
- The "second-run" 0.025ms timings for the unindexed scan (section 4) are not explained by the `EXPLAIN QUERY PLAN` output alone (which still shows a full scan for that query); I flagged this as a caching artifact but did not isolate the cause further.
- I did not test WAL-mode or on-disk (non-memory) databases; all experiments used `:memory:` `DatabaseSync` instances, consistent with this being a single-process server design question but not a full production I/O benchmark.

## Sources

- SQLite, "Datatypes In SQLite", https://www.sqlite.org/datatype3.html — fetched 2026-09-11, current page (tracks latest SQLite release).
- SQLite, "SQL As Understood By SQLite: Expressions" (unary operators), https://www.sqlite.org/lang_expr.html — fetched 2026-09-11.
- SQLite, "The SQLite Query Planner: Indexes On Expressions", https://www.sqlite.org/expridx.html — fetched 2026-09-11.
- SQLite, "Database File Format" (serial type codes), https://www.sqlite.org/fileformat2.html — fetched 2026-09-11.
- Node.js, "SQLite" API docs, https://nodejs.org/api/sqlite.html — fetched 2026-09-11; cross-checked against locally observed behavior on Node v24.15.0, which lacks at least one feature (`boolean` parameter binding) that the fetched docs describe as added in a later release (v26.8.0) — flagged explicitly above rather than cited as current-for-this-deployment without qualification.
- Local experiments: `node:sqlite` `DatabaseSync`, Node v24.15.0, Darwin 24.5.0, run 2026-09-11, scripts executed from the session scratchpad (not part of the repository).
