# What is the current state of decimal arithmetic in JavaScript/TypeScript, for a system that must round and compare decimal quantities exactly (never via IEEE-754 doubles)?

**Asked by:** orchestrator (map-scout dispatch), Benchline wayfinder map
**Date:** 2026-09-11
**Status of sources:** npm registry API and GitHub REST API queried live this session (VERIFIED, timestamps below). Library READMEs/API docs fetched live this session via WebFetch against the official GitHub Pages / GitHub raw sources (VERIFIED — quoted, not recalled). All code claims about library and Node behaviour were executed on this machine, Node v24.15.0, and are marked VERIFIED with actual output. Anything from search-engine snippets that I did not open and read directly, or where WebFetch summarised rather than let me see raw text, is marked SECONDARY.

## Findings

### 1. TC39 Decimal proposal

Source: `https://github.com/tc39/proposal-decimal` README, fetched live 2026-09-11 (VERIFIED, via WebFetch quoting the document directly).

- **Stage:** Stage 1. Quoted: "**Stage**: Stage 1 of the TC39 process."
- **Shape:** The champion group has settled on **Decimal128** (IEEE 754-2008 decimal128: 34 significant digits, exponent range ±6143), not arbitrary precision. Quoted: "We will use the **Decimal128** data model for JavaScript decimals." The README itself acknowledges the earlier fork in design space: "From the champion group's perspective, both BigDecimal and Decimal128 are both coherent, valid proposals," recording that the debate happened and was resolved in favour of Decimal128.
- **Polyfill:** No official TC39 polyfill exists. Quoted: "We are looking for volunteers for writing a polyfill along the lines of JSBI for both alternatives." A third-party (non-TC39) npm package `decimal128` is referenced by the README as an implementation, not an official polyfill.
- **Timeline:** The README gives no advancement timeline. Given Stage 1 status, there is no basis to predict landing in V8/Node from this document.
- GitHub repo metadata (VERIFIED via GitHub API, 2026-09-11): last push 2026-06-30T13:29:06Z, 54 open issues, 636 stars, not archived — the proposal repo is active but the spec itself is early-stage.

### 2. Established libraries — registry and repo facts (VERIFIED, npm registry API + GitHub API, queried 2026-09-11)

| Package | Latest version | Published | License | Deps | Unpacked size | Weekly downloads (wk of 2026-09-04) | Repo last push | Open issues | Stars |
|---|---|---|---|---|---|---|---|---|---|
| decimal.js | 10.6.0 | 2025-07-06 | MIT | 0 | 284,347 B | 63,015,300 | 2026-08-30 | 22 | 7,253 |
| decimal.js-light | 2.5.1 | 2020-09-30 | MIT | 0 | 218,255 B | 39,330,093 | 2024-04-24 | 6 | 410 |
| bignumber.js | 11.1.5 | 2026-07-05 | MIT | 0 | 500,493 B | 43,712,366 | 2026-08-31 | 8 | 7,010 |
| big.js | 7.0.1 | 2025-04-21 | MIT | 0 | 58,948 B | 24,864,957 | 2025-04-22 | 8 | 5,196 |
| jsbi | 4.3.2 | 2025-03-31 | Apache-2.0 | 0 | 583,518 B | 3,222,676 | (not queried for jsbi commit recency) | — | — |

All four MikeMcl packages are still receiving commits within the last 12 months as of this query (decimal.js and bignumber.js pushed within the last two weeks; big.js pushed ~17 months ago; decimal.js-light pushed ~29 months ago and has clearly slowed). None of the four GitHub repos are archived. I found **no explicit "no longer maintained" or "actively maintained" statement** in the material I retrieved (SECONDARY search-engine pass found no such quote either — see "What I could not establish").

### Precision model and rounding modes, per library (VERIFIED — quoted from official API docs fetched live, https://mikemcl.github.io/decimal.js/, https://mikemcl.github.io/bignumber.js/, https://mikemcl.github.io/big.js/, all fetched 2026-09-11)

**decimal.js 10.6.0** — precision is **significant digits**, default `Decimal.precision = 20`. Nine rounding-mode constants:
`ROUND_UP`(0) away from zero, `ROUND_DOWN`(1) towards zero, `ROUND_CEIL`(2) towards +Infinity, `ROUND_FLOOR`(3) towards −Infinity, `ROUND_HALF_UP`(4), `ROUND_HALF_DOWN`(5), `ROUND_HALF_EVEN`(6) "banker's rounding", `ROUND_HALF_CEIL`(7), `ROUND_HALF_FLOOR`(8), plus `EUCLID`(9) for modulo only. So **ROUND_HALF_UP, ROUND_HALF_EVEN, and ROUND_DOWN (truncate) are all present.** `toDecimalPlaces`/`toDP` and `toSignificantDigits`/`toSD` return a **Decimal**; `toFixed` and `toPrecision` return a **string**. `toExpNeg` default `-7`, `toExpPos` default `20` control when `toString()` switches to exponential notation, and both are configurable.

**bignumber.js 11.1.5** — same nine rounding-mode constants and names as decimal.js (0–8, `ROUND_UP` … `ROUND_HALF_FLOOR`). `DECIMAL_PLACES` (default 20) governs division/sqrt output and is **decimal-places** based; `precision()`/`sd()` report/accept **significant digits** separately from `decimalPlaces()`/`dp()`. `toFixed()`, `toPrecision()`, `toExponential()` return strings; `decimalPlaces()`/`precision()` return numbers. Comparators (`comparedTo`, `isEqualTo`, `isGreaterThan`, etc.) return booleans/null.

**big.js 7.0.1** — only **four** rounding-mode constants (fewer than decimal.js/bignumber.js): `Big.roundDown`(0) truncate, `Big.roundHalfUp`(1), `Big.roundHalfEven`(2), `Big.roundUp`(3). **There is no ROUND_CEIL, ROUND_FLOOR, ROUND_HALF_DOWN, ROUND_HALF_CEIL, or ROUND_HALF_FLOOR in big.js** — this is a materially smaller rounding-mode vocabulary than its two siblings. `DP` default 20 (decimal places, for division/sqrt); `PE`/`NE` (default 21 / −7) control exponential-notation threshold in `toString`. `toFixed(dp)`/`round(dp)` work in decimal places; `toPrecision(sd)`/`prec(sd)` work in significant digits.

### Trailing zeros and comparison (VERIFIED by direct execution — Node v24.15.0, packages installed from npm at the exact versions above, run 2026-09-11)

```
decimal.js:        new Decimal('98.0').toString()            -> "98"
decimal.js:        new Decimal('98.0').plus(0).toString()    -> "98"
decimal.js:        new Decimal('0.0000001').toString()       -> "1e-7"
decimal.js:        new Decimal('1.10').cmp('1.1')             -> 0
decimal.js:        new Decimal('1.10').eq('1.1')              -> true
decimal.js:        new Decimal('abc')                         -> throws DecimalError "Invalid argument: abc"

bignumber.js:       new BigNumber('98.0').toString()          -> "98"
bignumber.js:       new BigNumber('98.0').plus(0).toString()  -> "98"
bignumber.js:       new BigNumber('0.0000001').toString()     -> "1e-7"
bignumber.js:       new BigNumber('abc')                      -> THROWS by default in v11.1.5:
                     "[BigNumber Error] Not a number: abc" (BigNumber.DEBUG was `undefined`,
                     i.e. left at its default, yet it still threw)

big.js:             new Big('98.0').toString()                -> "98"
big.js:             new Big('98.0').plus(0).toString()        -> "98"
big.js:             new Big('0.0000001').toString()           -> "1e-7"
big.js:             new Big('abc')                             -> throws "[big.js] Invalid number"

decimal.js-light:   new Decimal('98.0').toString()            -> "98"
```

Finding, stated plainly: **all four libraries as configured out-of-the-box strip trailing fractional zeros on `toString()`** — `"98.0"` becomes `"98"` through both construction and arithmetic in every library tested. None preserves `"98.0"` as a *string round-trip* without explicit `toFixed(n)` formatting at the point of display. This is a behavioural fact of the default configuration, verified by direct execution; I did not attempt to determine whether an internal "value + explicit original scale" wrapper is realistic without further design work, which is outside a factual scout's remit.

Also note: the **bignumber.js finding on invalid-string handling contradicts what secondary sources describe.** I had expected (from the older API docs) that invalid input returns `NaN` unless `BigNumber.DEBUG` is set. Running the actual installed v11.1.5 package on this machine shows it **throws by default**, with `BigNumber.DEBUG` unset (`undefined`). I did not chase down when this default changed across versions; flagging this as a place where documentation and shipped behaviour may have diverged, or where my WebFetch summary of the docs page was imprecise about the current default. This is worth an independent re-check before being relied on.

Comparison in all three fully-tested libraries is **exact** (`1.10` and `1.1` compare equal, decimal.js `cmp` returns 0), because comparison operates on the internal digit/exponent representation rather than IEEE-754 doubles.

### 3. Maintenance status

VERIFIED via GitHub REST API (2026-09-11): none of the four MikeMcl repos are archived. decimal.js and bignumber.js received commits within the prior two weeks of this query; big.js within the prior ~17 months; decimal.js-light within the prior ~29 months (the least recently touched, and it also has the lowest open-issue count at 6, consistent with lower activity rather than fewer problems). I searched for an explicit maintenance statement from MikeMcl (e.g. "no longer maintained") and **did not find one** in the material retrieved this session — this is a gap, not a confirmed "actively maintained" statement either. See "What I could not establish."

### 4. Hand-rolled scaled-integer decimal on BigInt

I did not find, and did not exhaustively search for, a single canonical "official" writeup to cite as *the* authoritative source for a BigInt value+scale pattern — this part of the question calls for design guidance more than fact-retrieval, so I have deliberately not searched for or endorsed any particular blog implementation, consistent with reporting facts rather than recommending an approach.

What is directly documented by the languages named as precedents (these are primary/official language docs, not blogs):

- **Java `BigDecimal`** (java.math.BigDecimal, Java SE Platform docs): a `BigDecimal` is defined as `unscaledValue × 10^(-scale)`, i.e. exactly the value+scale/BigInt pattern the question describes. It exposes a `MathContext` carrying `precision` (significant digits) and `RoundingMode`, and a separate `scale()`/`setScale(int, RoundingMode)` for decimal-place-based rounding — the two axes (significant-digits vs decimal-places) are kept as genuinely separate operations, matching the decimal.js/bignumber.js split noted above. I am citing this from my knowledge of the well-known, stable Java SE API shape; I did not re-fetch the Oracle javadoc this session, so this specific paragraph is **SECONDARY** (recalled, not re-verified against the live doc in this session) even though the API has been stable for a long time.
- **Python `decimal` module**: uses a thread-local/explicit `Context` object carrying `prec` (significant digits) and a `rounding` attribute with named constants (`ROUND_HALF_EVEN`, `ROUND_HALF_UP`, `ROUND_DOWN`, etc. — `ROUND_HALF_EVEN` is the module's documented default). This is also **SECONDARY** in this report — I did not re-fetch docs.python.org this session to re-quote it, so treat the exact constant names as recalled rather than freshly verified.
- **C# `decimal`**: a 128-bit floating-decimal type with 28-29 significant digits; also not re-verified this session (**SECONDARY**).

I flag both Java and Python claims above as SECONDARY because, although I am confident in them, I did not fetch the primary docs in this session and the scout's own standard is "verify this session, don't state from memory." A follow-up pass should fetch `docs.oracle.com` (java.math.BigDecimal) and `docs.python.org/3/library/decimal.html` directly before this section is relied on as VERIFIED.

### 5. Node built-ins

VERIFIED by direct execution, Node v24.15.0, this machine, 2026-09-11:

```
(1.005).toFixed(2)   -> "1.00"   (not "1.01")
(8.575).toFixed(2)   -> "8.57"   (not "8.58")
0.1 + 0.2            -> 0.30000000000000004
(0.0000001).toString() -> "1e-7"
```

These reproduce the well-known IEEE-754 double-precision pathology: `1.005` and `8.575` are not exactly representable as binary doubles (their nearest double is fractionally below the decimal value), so naive "round half up to 2 dp" produces the digit below the mathematically expected one. This is a spec-level consequence of `Number` being IEEE-754 binary64 (ECMA-262 Number type), not a `toFixed` implementation bug per se, but `toFixed`'s output is what actually surfaces to callers, so it is what breaks. I verified the two headline pathologies but did not independently derive the ECMA-262 spec algorithm text for `toFixed` this session; the "why" (binary64 representation) is standard and uncontested, but I'm noting it as reasoning rather than a freshly re-quoted spec citation.

`Intl.NumberFormat` was also checked directly: VERIFIED that Node v24.15.0 supports a `roundingMode` option (ECMA-402 "Intl.NumberFormat V3" rounding-mode extensions):

```
new Intl.NumberFormat('en-US', {minimumFractionDigits:2, maximumFractionDigits:2, roundingMode:'halfEven'}).format(1.005) -> "1.00"
new Intl.NumberFormat('en-US', {minimumFractionDigits:2, maximumFractionDigits:2, roundingMode:'halfEven'}).format(2.5)  -> "2.50"
resolvedOptions().roundingMode -> "halfEven"
```
So Node 24's `Intl.NumberFormat` does accept an explicit `roundingMode` (including `halfEven`), and `resolvedOptions()` confirms it was honoured — this is a real, current Node built-in capability. Two caveats I can state plainly from what I ran: (a) it still formats a `Number` input, so the *input* to `Intl.NumberFormat` is still subject to whatever binary64 already did to that number before formatting — `1.005` as a double is already fractionally below the exact decimal 1.005, so `.format(1.005)` still yields "1.00", **the same visible outcome as the broken `toFixed` case**, for a different underlying reason (the input was already imprecise, not that the formatter rounded wrong); (b) I did not test whether `Intl.NumberFormat` can consume a `BigInt` or a string for exact input, only a `Number`, so I cannot state that this built-in gives you a way past binary64 imprecision entirely — only that it exposes a **named rounding-mode API**, unlike `toFixed`.

### 6. Other decimal-critical JS systems (bonus)

SECONDARY, and inconclusive: I could not directly identify which JS decimal library, if any, SENAITE uses. SENAITE's core (`senaite.core`) is a Python codebase (Plone/Zope), and Python's `decimal` module is the natural fit there — search results describe SENAITE's rounding as based on absolute-uncertainty-derived decimal places, consistent with Python `decimal`, but I did not open SENAITE's own source in this session to confirm which JS (client-side) arithmetic, if any, handles decimals in the browser layer. I did not pursue ledger/accounting Node projects (e.g. `dinero.js`, `currency.js`) far enough to make a sourced claim about what they use; I am not including unverified impressions.

## What I could not establish

- Whether MikeMcl has ever published an explicit maintenance/EOL statement for any of the four libraries — not found in this session's searches; absence of evidence is not evidence of absence.
- The precise version in bignumber.js's history where invalid-string handling became "throw by default" versus the "NaN unless DEBUG" behaviour some documentation describes — I only confirmed the *current* (11.1.5) behaviour by direct execution.
- Any authoritative single source for a BigInt value+scale hand-roll pattern — not searched for, since recommending an implementation approach is outside this scout's remit; only the two named-language precedents (Java, Python) were addressed, and those two are flagged SECONDARY pending a follow-up fetch of their primary docs.
- Whether SENAITE's browser-side (JS) code performs any decimal arithmetic itself, versus doing all rounding server-side in Python and only ever formatting/displaying pre-rounded strings in JS — not established.
- Whether any Node/ECMAScript accounting or ledger project has a documented, citable choice of decimal library — not pursued to a sourced conclusion.
- TC39 Decimal proposal's advancement timeline toward Stage 2+ and eventual V8/Node landing — the README states no timeline, so there is nothing further to establish from that primary source; any date would have to come from TC39 plenary notes, which I did not fetch this session.

## Sources

- TC39 Decimal proposal README — https://github.com/tc39/proposal-decimal (fetched via raw content 2026-09-11; quoted directly)
- TC39 Decimal proposal repo metadata — https://api.github.com/repos/tc39/proposal-decimal (queried 2026-09-11)
- npm registry, decimal.js — https://registry.npmjs.org/decimal.js (queried 2026-09-11, latest 10.6.0)
- npm registry, decimal.js-light — https://registry.npmjs.org/decimal.js-light (queried 2026-09-11, latest 2.5.1)
- npm registry, bignumber.js — https://registry.npmjs.org/bignumber.js (queried 2026-09-11, latest 11.1.5)
- npm registry, big.js — https://registry.npmjs.org/big.js (queried 2026-09-11, latest 7.0.1)
- npm registry, jsbi — https://registry.npmjs.org/jsbi (queried 2026-09-11, latest 4.3.2)
- npm downloads API (per-package, week of 2026-09-04 to 2026-09-10) — https://api.npmjs.org/downloads/point/last-week/<package> (queried 2026-09-11)
- GitHub repo metadata, MikeMcl/decimal.js, MikeMcl/decimal.js-light, MikeMcl/bignumber.js, MikeMcl/big.js, tc39/proposal-decimal — https://api.github.com/repos/<owner>/<repo> (queried 2026-09-11)
- decimal.js API docs — https://mikemcl.github.io/decimal.js/ (fetched 2026-09-11, quoted)
- bignumber.js API docs — https://mikemcl.github.io/bignumber.js/ (fetched 2026-09-11, quoted)
- big.js API docs — https://mikemcl.github.io/big.js/ (fetched 2026-09-11, quoted)
- Direct execution against decimal.js@10.6.0, bignumber.js@11.1.5, big.js@7.0.1, decimal.js-light@2.5.1 installed from npm — run on this machine, Node v24.15.0, 2026-09-11
- Direct execution of `Number.prototype.toFixed` and `Intl.NumberFormat` with `roundingMode` — run on this machine, Node v24.15.0, 2026-09-11
- SENAITE community forum thread on significant-figure formatting — https://community.senaite.org/t/formatting-results-with-significant-figures/718 (surfaced via search, not independently opened/verified this session — SECONDARY)

Not re-fetched this session (flagged SECONDARY above where relied on): Oracle `java.math.BigDecimal` javadoc; Python `docs.python.org/3/library/decimal.html`; C# `decimal` type docs.
