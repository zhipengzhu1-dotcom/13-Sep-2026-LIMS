# libuv threadpool upper bound, and Node 24.x stability status of `crypto.argon2`

**Asked by:** Ticket #35, "Login-storm measurement: Argon2id authentication at shift-start concurrency" (orchestrator)
**Date:** 2026-09-11
**Status of sources:** Checked directly against libuv's hosted documentation (docs.libuv.org, v1.x branch) and libuv's own source (`src/threadpool.c`, `libuv/libuv` GitHub, `v1.x` branch); checked Node's `doc/api/crypto.md` and `doc/changelogs/CHANGELOG_V24.md` on the `v24.x`/`main` branches via raw.githubusercontent.com, and the merged-PR record via the GitHub API. All retrieved 2026-09-11. This supersedes nothing in `docs/research/node-password-hashing-and-sessions.md`; it resolves the two gaps that file left open.

## Findings

### 1. `UV_THREADPOOL_SIZE` — documented default and maximum

libuv's own threadpool documentation states:

> "Its default size is 4, but it can be changed at startup time by setting the `UV_THREADPOOL_SIZE` environment variable to any value (the absolute maximum is 1024)."
— https://docs.libuv.org/en/v1.x/threadpool.html, retrieved 2026-09-11.

This is corroborated by libuv's own source, `src/threadpool.c` (`libuv/libuv`, `v1.x` branch):

```c
#define MAX_THREADPOOL_SIZE 1024
...
buflen = ARRAY_SIZE(buf);
err = uv_os_getenv("UV_THREADPOOL_SIZE", buf, &buflen);
val = NULL;
if (err == 0)
  val = buf;

if (val != NULL)
  nthreads = atoi(val);
if (nthreads == 0)
  nthreads = 1;
if (nthreads > MAX_THREADPOOL_SIZE)
  nthreads = MAX_THREADPOOL_SIZE;
```
— https://github.com/libuv/libuv/blob/v1.x/src/threadpool.c, retrieved 2026-09-11.

So: the maximum is **1024**, it is documented (not merely inferred from source), and a value above it is **silently clamped** to 1024 — `atoi()` parses the env var, and if the result exceeds `MAX_THREADPOOL_SIZE` it is simply reset to that ceiling with no error, warning, or thrown exception. A value of `0` (or anything `atoi` cannot parse to a positive integer) is silently floored to `1`, not left at the default of 4.

**libuv version bundled in Node 24.x:** `deps/uv/include/uv/version.h` on the `v24.x` branch reports:

```c
#define UV_VERSION_MAJOR 1
#define UV_VERSION_MINOR 52
#define UV_VERSION_PATCH 1
```
— https://github.com/nodejs/node/blob/v24.x/deps/uv/include/uv/version.h, retrieved 2026-09-11. That is libuv 1.52.1, which post-dates the 1.30.0 release where the maximum was raised from an earlier, lower ceiling (128) to 1024 (per the current libuv docs' own historical note on the same page). I did not independently verify the 128-figure or the exact version it changed in from a second primary source — see gaps below — but the number that matters for Node 24.x (1024, silently clamped) is confirmed directly from the source Node 24.x actually ships.

### 2. Stability of `crypto.argon2` in Node 24.x

The `node:crypto` module as a whole carries `Stability: 2 - Stable` at the top of `doc/api/crypto.md` (https://github.com/nodejs/node/blob/v24.x/doc/api/crypto.md, line 5, retrieved 2026-09-11), and individual APIs can override that with their own stability marker.

`crypto.argon2` was added in v24.7.0 (`<!-- YAML added: v24.7.0 -->`) and, at introduction, carried an explicit override:

> `> Stability: 1.2 - Release candidate`

This override was **removed** by PR nodejs/node#63924, "doc,crypto: mark argon2 and encap/decap as stable" (Filip Skokan), which I confirmed merged into `main` at commit `7bb6dab70c` — GitHub API record: `"merged": true, "merged_at": "2026-06-17T10:53:32Z"`. The PR's diff (`patch-diff.githubusercontent.com/raw/nodejs/node/pull/63924.diff`, retrieved 2026-09-11) shows only the deletion of the `> Stability: 1.2 - Release candidate` line for `crypto.argon2`, `crypto.argon2Sync`, `crypto.encapsulate`, and `crypto.decapsulate` — no other text changed.

This commit is present in the v24.x LTS changelog: `doc/changelogs/CHANGELOG_V24.md` (`main` branch, retrieved 2026-09-11) lists commit `7bb6dab70c` / PR #63924 under the **v24.19.0 "Krypton" (LTS)** release, dated 2026-08-03. It remains present through the current v24.21.0 (2026-09-08).

Consequently, **the current `doc/api/crypto.md` on the `v24.x` branch carries no per-function stability override for `crypto.argon2` or `crypto.argon2Sync`** — the section has no `> Stability:` line at all — so the function inherits the module-level `Stability: 2 - Stable` marker. I found no `changes:` YAML entry recording this transition on the argon2 entries themselves (unlike, e.g., `crypto.hash`, which does carry an explicit `changes:` entry reading "This API is no longer experimental" for a comparable transition) — the argon2 doc entries only show `added: v24.7.0` with no further history.

**Runtime warning:** I did not find, in the doc source, any indication that calling `crypto.argon2`/`crypto.argon2Sync` emits a `process.emitWarning`/`ExperimentalWarning`. Node's convention is that APIs at "Stability: 1.x" (Experimental/Release candidate) are the ones documented as producing `--pending-deprecation`-style or `ExperimentalWarning` runtime notices, and no such note appears on the current argon2 entries. I did not independently execute Node 24.19+ to observe runtime behavior — this is a doc-only finding, not a confirmed runtime observation.

## What I could not establish

- Whether the 1024 ceiling in libuv actually changed from a prior lower limit (documentation mentions "increased... from a previous limit"; I did not pull the specific historical libuv commit/version that made that change, since it is not relevant to the version Node 24.x ships — 1.52.1 already has the 1024 ceiling).
- Whether `crypto.argon2`/`crypto.argon2Sync` ever emitted a runtime `ExperimentalWarning` while at "Stability: 1.2 - Release candidate" (v24.7.0 through the PR #63924 merge), and whether that warning, if it existed, was also removed. The doc diff only touches the stability text, not any warning-emission code, and I did not inspect `lib/internal/crypto/*` source for `emitExperimentalWarning` calls tied to argon2 — that would require a separate source-code check I did not perform.
- Independent confirmation of runtime behavior (no live execution of Node 24.19+ was performed; findings are from documentation and source text only).

## Sources

- libuv threadpool documentation, `v1.x` branch, https://docs.libuv.org/en/v1.x/threadpool.html — retrieved 2026-09-11.
- libuv source, `src/threadpool.c`, `libuv/libuv`, `v1.x` branch, https://github.com/libuv/libuv/blob/v1.x/src/threadpool.c — retrieved 2026-09-11.
- libuv version header bundled in Node, `deps/uv/include/uv/version.h`, `nodejs/node`, `v24.x` branch — https://github.com/nodejs/node/blob/v24.x/deps/uv/include/uv/version.h — retrieved 2026-09-11 (libuv 1.52.1).
- Node crypto docs, `doc/api/crypto.md`, `nodejs/node`, `v24.x` branch — https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/crypto.md — retrieved 2026-09-11.
- PR nodejs/node#63924, "doc,crypto: mark argon2 and encap/decap as stable" — https://github.com/nodejs/node/pull/63924 — merged 2026-06-17T10:53:32Z, diff via https://patch-diff.githubusercontent.com/raw/nodejs/node/pull/63924.diff — retrieved 2026-09-11.
- Node v24 changelog, `doc/changelogs/CHANGELOG_V24.md`, `nodejs/node`, `main` branch — https://raw.githubusercontent.com/nodejs/node/main/doc/changelogs/CHANGELOG_V24.md — retrieved 2026-09-11 (PR #63924 listed under v24.19.0, 2026-08-03; current line at v24.21.0, 2026-09-08).
