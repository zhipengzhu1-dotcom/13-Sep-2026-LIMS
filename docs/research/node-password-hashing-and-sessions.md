# What can a plain Node.js application do for password hashing and server-side sessions in 2026 without native compiled dependencies, and what do the authoritative sources say the parameters should be?

**Asked by:** Orchestrator (multi-agent wayfinder-map effort), following the closed ticket that selected `node:sqlite` (`DatabaseSync`) partly to avoid native-compiled dependencies.
**Date:** 2026-09-11
**Status of sources:** All sources below were retrieved directly (via `curl`) on 2026-09-11 and quoted from the retrieved text, not from a summarizing tool, after an intermediate web-fetch summary produced at least two unverifiable/incorrect claims (see "What I could not establish" and inline notes). Node.js core docs were fetched from `nodejs.org/api/crypto.html` (current site, reflects the in-development/latest doc build — version markers for each API are quoted from the page's own "Added in" / "History" annotations). OWASP cheat sheets were fetched from the live `cheatsheetseries.owasp.org` pages. NIST SP 800-63B was fetched from `pages.nist.gov/800-63-4/sp800-63b.html`, which is **Revision 4** (the document that supersedes the older 800-63B; NIST's own CSRC page marks the prior 800-63B as withdrawn — see Sources). The W3C Secure Contexts spec was fetched from `w3c.org/TR/secure-contexts/`. npm package facts were pulled from the npm registry API and each project's own README on GitHub.

## Findings

### 1. Password-hashing primitives Node ships in core

Node's `node:crypto` module documents the following (quoted from `https://nodejs.org/api/crypto.html`, retrieved 2026-09-11):

- **`crypto.scrypt(password, salt, keylen[, options], callback)`** and **`crypto.scryptSync(password, salt, keylen[, options])`** — added in v10.5.0. Default options if not overridden: `cost` (N) = 16384, `blockSize` (r, alias `blockSize`/`r`) = 8, `parallelization` (p, alias `parallelization`/`p`) = 1, `maxmem` = `32 * 1024 * 1024` (32 MiB). The docs state: *"maxmem <number> Memory upper bound. It is an error when (approximately) `128 * N * r > maxmem`. Default: `32 * 1024 * 1024`."* This constraint means raising N or r beyond the OWASP-recommended values (below) requires also raising `maxmem` explicitly or the call throws.
- **`crypto.pbkdf2(password, salt, iterations, keylen, digest, callback)`** and **`crypto.pbkdf2Sync(...)`** — added in v0.5.5 (digest became a required, non-defaulted argument as of v8.0.0; iterations restricted to positive values as of v14.0.0). There is **no built-in default iteration count** — the caller must supply one.
- **`crypto.timingSafeEqual(a, b)`** — added in v6.6.0; performs constant-time comparison; both inputs must be equal length, otherwise it throws.
- **`crypto.randomUUID([options])`** — added in v15.6.0 / v14.17.0 (backported).
- **`crypto.randomBytes(size[, callback])`** — long-standing API for cryptographically strong random bytes.
- **`crypto.argon2(algorithm, parameters, callback)` and `crypto.argon2Sync(algorithm, parameters)` — added in v24.7.0.** This is a genuine, current Node core addition (confirmed by direct inspection of the live docs page, not assumed): it takes `algorithm` (`"argon2d"`, `"argon2i"`, or `"argon2id"`) and a `parameters` object with **all of** `message` (password), `nonce` (salt, ≥8 bytes), `parallelism`, `tagLength`, `memory` (KiB, must be ≥ `8 * parallelism`), and `passes` (iterations) as **required** fields, plus optional `secret` (pepper) and `associatedData`. There is **no built-in default** for any numeric parameter — the caller must choose all of them, which is exactly where the OWASP work-factor numbers below apply.

**Current Node.js LTS as of 2026-09-11**, per the official release schedule (`https://raw.githubusercontent.com/nodejs/Release/main/schedule.json`, retrieved 2026-09-11): **Node 24 ("Krypton")** is Active LTS (LTS start 2025-10-28, moves to Maintenance 2026-10-20, EOL 2028-04-30). Node 22 ("Jod") is in Maintenance LTS (since 2025-10-21, EOL 2027-04-30). Node 26 is the current non-LTS release line (started 2026-05-05; becomes LTS 2026-10-28). `crypto.argon2`/`argon2Sync` (added v24.7.0) is available in the current Active LTS line.

### 2. Native-compilation status of argon2 / bcrypt / bcryptjs on npm

Checked directly against each project's own README/package metadata (npm registry `dist-tags.latest` and publish date, retrieved 2026-09-11):

- **`argon2`** (npm; GitHub `ranisalt/node-argon2`) — latest **0.45.1**, published 2026-07-21. This is a **native N-API addon** with prebuilt binaries published for common platforms, but its own README has a "Before installing" section stating: *"You can skip this section if the prebuilt binaries work for you. You **MUST** have a **node-gyp** global install before proceeding with the install, along with GCC >= 5 / Clang >= 3.3. On Windows, you must compile under Visual Studio 2015 or newer,"* i.e. a toolchain is required as a fallback whenever a prebuilt binary is not available for the target platform/Node ABI. The project's own README also notes that once Node's native `argon2`/`argon2Sync` (added v24.7.0, above) is available on all supported Node releases, this package intends to become a thin wrapper around it.
- **`bcrypt`** (npm; GitHub `kelektiv/node.bcrypt.js`) — latest **6.0.0**, published 2025-05-11. Also a native addon built with `node-gyp`; the README states prebuilt binaries are offered only "on a best-effort basis" and documents the node-gyp/GCC/Clang/Visual-Studio/Python toolchain requirement for building from source.
- **`bcryptjs`** (npm; GitHub `dcodeIO/bcrypt.js`) — latest **3.0.3**, published 2025-11-02. The README states it is *"written in pure JavaScript"* with *"zero dependencies"* and is "compatible to the 'bcrypt' [native] binding," at a documented ~30% speed cost. This package requires **no native toolchain and no compiled binary**.
- A pure-WASM alternative exists: **`hash-wasm`** (latest **4.12.0**, published 2024-11-19), whose own README describes it as using "hand-tuned WebAssembly binaries" "compiled from heavily optimized algorithms written in C," and its supported-algorithm list includes Argon2, bcrypt, scrypt, and PBKDF2. Because the WASM binary ships precompiled inside the npm package, it needs no build toolchain at install time on any platform. (An older package, `argon2-browser`, latest 1.18.0, published 2021-06-05, also ships an Argon2 WASM build but appears far less actively maintained by publish date; this project's currency could not be independently confirmed beyond that timestamp.) A native-Rust-binding alternative, `@node-rs/argon2` (latest 2.2.1, published 2026-09-10), also exists and, like `argon2`, ships prebuilt binaries via N-API but is not pure JS/WASM.

### 3. OWASP Password Storage Cheat Sheet — current recommendations (verbatim)

Retrieved directly from `https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html` on 2026-09-11 (the page carries no visible last-updated date, so currency is established only by the fact that it references **NIST SP 800-63B-4** by name, which was finalized in 2025 — see below):

Preference order, quoted: *"Use Argon2id with a minimum configuration of 19 MiB of memory, an iteration count of 2, and 1 degree of parallelism. If Argon2id is not available, use scrypt with a minimum CPU/memory cost parameter of (2^17), a minimum block size of 8 (1024 bytes), and a parallelization parameter of 1. For legacy systems using bcrypt, use a work factor of 10 or more and with a password limit of 72 bytes. If FIPS-140 compliance is required, use PBKDF2..."*

- **Argon2id** — five equivalent configurations given, trading CPU for RAM: `m=47104 (46 MiB), t=1, p=1` / `m=19456 (19 MiB), t=2, p=1` / `m=12288 (12 MiB), t=3, p=1` / `m=9216 (9 MiB), t=4, p=1` / `m=7168 (7 MiB), t=5, p=1`. The sheet notes the 46 MiB and 19 MiB rows are "Do not use with Argon2i."
- **scrypt** — five equivalent configurations: `N=2^17 (128 MiB), r=8, p=1` / `N=2^16 (64 MiB), r=8, p=2` / `N=2^15 (32 MiB), r=8, p=3` / `N=2^14 (16 MiB), r=8, p=5` / `N=2^13 (8 MiB), r=8, p=10`. Note the top-recommended `N=2^17` configuration exceeds Node's default scrypt `maxmem` of 32 MiB and requires the caller to raise `maxmem` explicitly (Finding 1 above).
- **bcrypt** — "work factor... a minimum of 10," input capped at 72 bytes.
- **PBKDF2** — *"PBKDF2-HMAC-SHA256: 600,000 iterations (recommended). PBKDF2-HMAC-SHA512: 220,000 iterations. PBKDF2-HMAC-SHA1: 1,400,000 iterations — legacy only, do not select for new systems."* The sheet states PBKDF2 "is permitted by NIST SP 800-63B-4 and has FIPS-140 validated implementations" and recommends HMAC-SHA-256 as the internal hash.

### 4. NIST SP 800-63B — confirmed current revision is **Rev. 4** (SP 800-63B-4)

NIST's own CSRC catalog lists the prior "800-63B (Withdrawn)" entry separately from the current "SP 800-63B-4, Digital Identity Guidelines: Authentication and Authenticator Management" (finalized/published 2025). I fetched the current document body directly from `https://pages.nist.gov/800-63-4/sp800-63b.html` on 2026-09-11 and confirmed the following by direct text search, quoted:

- Length: *"Verifiers and CSPs SHALL require passwords that are used as a single-factor authentication mechanism to be a minimum of 15 characters in length. Verifiers and CSPs MAY allow passwords that are only used as part of multi-factor authentication processes to be shorter but SHALL require them to be a minimum of eight characters in length. Verifiers and CSPs SHOULD permit a maximum password length of at least 64 characters."*
- Composition/rotation: *"Verifiers and CSPs SHALL NOT impose other composition rules (e.g., requiring mixtures of different character types) for passwords. Verifiers and CSPs SHALL NOT require subscribers to change passwords periodically. However, verifiers SHALL force a change if there is evidence that the authenticator has been compromised."*
- Breached-password screening: *"When processing a request to establish or change a password, verifiers SHALL compare the prospective secret against a blocklist that contains known commonly used, expected, or compromised passwords. The entire password SHALL be subject to comparison, not substrings or words that might be contained therein."*
- Verifier-side hashing: the document requires a per-password salt of *"at least 32 bits in length"* and states the hash and salt *"SHALL be stored for each password"* with a reference to the hashing scheme and cost factor SHOULD be stored to allow migration.

### 5. OWASP Session Management Cheat Sheet — session mechanics

Retrieved directly from `https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html` on 2026-09-11:

- Entropy: *"Session identifiers must have at least 64 bits of entropy to prevent brute-force session guessing attacks... a session ID with 64 bits of entropy can have 2^64 possible values. A strong CSPRNG... must be used to generate session IDs."*
- Cookie attributes: the sheet documents `Secure`, `HttpOnly`, `SameSite`, cookie-name-prefix (`__Host-`), `Domain`/`Path`, and `Expires`/`Max-Age` as the relevant attributes, with `Secure` described as: *"instructs web browsers to only send the cookie through an encrypted HTTPS (SSL/TLS) connection. This... is mandatory to prevent the disclosure of the session ID..."* — i.e. OWASP treats `Secure` as mandatory for session cookies, with no carve-out for non-TLS deployments in the section I could locate.
- Timeout: OWASP describes **idle timeout** and **absolute timeout** as concepts and requires both be enforced *server-side*, but I could **not** find any concrete minute/hour numbers recommended for either in the current page text — the section is prescriptive about mechanism, not about specific durations. (An earlier automated summary of this page produced specific numbers — e.g., "2–5 minutes," "15–30 minutes," "4–8 hours" — that I could not find anywhere in the actual page text on direct re-inspection; that summary appears to be fabricated and is not used here.)
- Rotation: *"The session ID must be renewed or regenerated by the web application after any privilege level change within the associated user session. The most common scenario where the session ID regeneration is mandatory is during the authentication process..."* Other listed triggers: password changes, permission changes, role escalation.
- Logout: *"Web applications must provide a visible and easily accessible logout... button... the web application must invalidate the session at least on server side."* Client-side cookie clearing alone is explicitly treated as insufficient by the surrounding text.

### 6. The `Secure` cookie / secure-context problem on plain HTTP

Retrieved directly from the W3C Secure Contexts spec, `https://www.w3.org/TR/secure-contexts/`, "Is origin potentially trustworthy?" algorithm, on 2026-09-11 (verbatim):

*"If origin's scheme is either 'https' or 'wss', return 'Potentially Trustworthy'... If origin's host matches one of the CIDR notations 127.0.0.0/8 or ::1/128, return 'Potentially Trustworthy'. If the user agent conforms to the name resolution rules in [let-localhost-be-localhost] and one of the following is true: origin's host is 'localhost' or 'localhost.' origin's host ends with '.localhost' or '.localhost.' then return 'Potentially Trustworthy'."*

This is the complete list of non-HTTPS cases the specification treats as trustworthy: **loopback addresses (127.0.0.0/8, ::1/128) and the `localhost`/`*.localhost` hostnames only.** The spec text I retrieved contains **no provision treating other private/LAN IP ranges (e.g. 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) or arbitrary intranet hostnames as secure contexts.** Practically, this means: a plain-HTTP server reachable at a private LAN IP address or an internal hostname other than `localhost`/`*.localhost` is **not** a secure context by this specification, and browsers that implement it will not send a cookie carrying the `Secure` attribute to such an origin (the cookie will simply never be transmitted, since `Secure` cookies are restricted to secure contexts) — nor will such an origin get access to secure-context-gated web platform features. I did not independently re-verify current Chrome/Firefox release-note text beyond this spec (see "What I could not establish").

### 7. NIST SP 800-63B-4 on re-authentication and session duration

Quoted directly from the current document, retrieved 2026-09-11:

- **AAL1**: *"A definite reauthentication overall timeout SHALL be established, which SHOULD be no more than 30 days at AAL1. An inactivity timeout MAY be applied but is not required at AAL1."*
- **AAL2**: *"A definite reauthentication overall timeout SHALL be established, which SHOULD be no more than 24 hours at AAL2. The inactivity timeout SHOULD be no more than 1 hour. When the inactivity timeout has occurred but the overall timeout has not yet occurred, the verifier MAY allow the subscriber to reauthenticate using only a successful password or biometric comparison in conjunction with the session secret."*
- **AAL3**: *"At AAL3, the overall timeout for reauthentication SHALL be no more than 12 hours. The inactivity timeout SHOULD be no more than 15 minutes. Unlike AAL2, AAL3 reauthentication requirements are the same as for initial authentication at AAL3."*

The document frames these as two distinct timeout types — "overall timeout" (from authentication/last reauthentication) and "inactivity timeout" — and requires periodic reauthentication at all three assurance levels, with the numeric ceilings above.

## What I could not establish

- **Current Chrome/Firefox behavior beyond the W3C spec text itself.** I confirmed the specification's algorithm directly, but did not independently re-fetch and quote Chrome's or Firefox's own current documentation pages describing their implementation of it (e.g., a Chromium "secure contexts" support page) — the spec text is the primary source and is authoritative, but a browser could in principle diverge from it in an undocumented way that I have not checked for 2026 browser versions specifically.
- **Whether the OWASP Session Management Cheat Sheet gives any numeric idle/absolute timeout recommendation elsewhere on the page** (e.g., in a table or appendix not reached by my keyword search). I searched the retrieved page text for concrete numbers and found none; I cannot rule out that a number exists in a part of the page my search missed, but I found no such number and flag this as unresolved rather than invented.
- **The maintenance status / currency of `argon2-browser`** beyond its last npm publish date (2021-06-05) — its README was not separately re-checked for a maintenance statement, so I only report the publish-date fact, not an editorial judgment about whether it is "current."
- **Whether Node's `crypto.argon2`/`argon2Sync` (added v24.7.0) has any documented default parameter values in a formal RFC/design doc beyond the API reference page** — the API reference marks every numeric parameter as REQUIRED with no default; I did not locate a separate Node.js design document discussing why no defaults were chosen.
- I did not evaluate or compare these facts against any specific implementation choice for this project — that is out of scope for this report.

## Sources

- Node.js `crypto` API documentation — https://nodejs.org/api/crypto.html — retrieved 2026-09-11 (live/current doc build; per-API "Added in" version annotations quoted inline above).
- Node.js Release schedule — https://raw.githubusercontent.com/nodejs/Release/main/schedule.json — retrieved 2026-09-11.
- npm registry package metadata for `argon2`, `bcrypt`, `bcryptjs`, `hash-wasm`, `argon2-browser`, `@node-rs/argon2` — https://registry.npmjs.org/ — retrieved 2026-09-11 (latest version + publish timestamp per package, quoted above).
- `node-argon2` README — https://github.com/ranisalt/node-argon2 (raw README fetched from `master` branch) — retrieved 2026-09-11.
- `node.bcrypt.js` README — https://github.com/kelektiv/node.bcrypt.js (raw README fetched from `master` branch) — retrieved 2026-09-11.
- `bcrypt.js` README — https://github.com/dcodeIO/bcrypt.js (raw README fetched from `master` branch) — retrieved 2026-09-11.
- `hash-wasm` README — https://github.com/Daninet/hash-wasm (raw README fetched from `master` branch) — retrieved 2026-09-11.
- OWASP Password Storage Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html — retrieved 2026-09-11 (live page; page carries no visible revision date, currency inferred from its own reference to NIST SP 800-63B-4).
- OWASP Session Management Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html — retrieved 2026-09-11.
- NIST SP 800-63B-4, *Digital Identity Guidelines: Authentication and Authenticator Management* — https://pages.nist.gov/800-63-4/sp800-63b.html — retrieved 2026-09-11. Confirmed as the current revision via NIST CSRC's separate listing of the prior 800-63B as withdrawn (https://csrc.nist.gov/pubs/sp/800/63/b/upd2/final) versus the current 800-63B-4 (https://csrc.nist.gov/pubs/sp/800/63/b/4/final).
- W3C Secure Contexts specification — https://www.w3.org/TR/secure-contexts/ — retrieved 2026-09-11.

---

## Addendum: async `crypto.argon2` and the libuv threadpool

**Agent-gathered.** **Retrieval date:** 2026-09-11.
**Status of sources:** Node core documentation and source retrieved directly from the `nodejs/node` GitHub repository (`main` branch, raw file content via `raw.githubusercontent.com`) and the GitHub REST API for pull-request metadata, both on 2026-09-11. RFC 9106 fetched via a fetch-and-summarize tool against `rfc-editor.org` (flagged below since it was not a direct-quote `curl`, unlike the rest of this addendum).

### 1. Documented signature and semantics of the async form

From `doc/api/crypto.md` in `nodejs/node` (`main` branch, retrieved 2026-09-11), both forms exist and are documented, both added in **v24.7.0**:

> ### `crypto.argon2(algorithm, parameters, callback)`
>
> \<!-- YAML
> added: v24.7.0
> -->
>
> ...
> `callback` {Function}
>   * `err` {Error}
>   * `derivedKey` {Buffer}
>
> Provides an asynchronous [Argon2][] implementation. Argon2 is a password-based
> key derivation function that is designed to be expensive computationally and
> memory-wise in order to make brute-force attacks unrewarding.
>
> ...
> The `callback` function is called with two arguments: `err` and `derivedKey`.
> `err` is an exception object when key derivation fails, otherwise `err` is
> `null`. `derivedKey` is passed to the callback as a [`Buffer`][].
>
> An exception is thrown when any of the input arguments specify invalid values
> or types.

> ### `crypto.argon2Sync(algorithm, parameters)`
>
> \<!-- YAML
> added: v24.7.0
> -->
>
> ...
> * Returns: {Buffer}
>
> Provides a synchronous [Argon2][] implementation. Argon2 is a password-based
> key derivation function that is designed to be expensive computationally and
> memory-wise in order to make brute-force attacks unrewarding.
>
> ...
> An exception is thrown when key derivation fails, otherwise the derived key is
> returned as a [`Buffer`][].

**Critically: neither the async nor the sync entry contains the phrase "threadpool" or any statement about blocking behaviour.** This was checked by grepping the full retrieved `crypto.md` (7,712 lines) for `threadpool`, `thread pool`, and `libuv` — the argon2 sections (lines 3442–3607) contain zero matches.

By contrast, Node's documentation has a standard, recurring sentence used for every other async crypto primitive that is threadpool-backed. Quoted verbatim from the same file:

`crypto.pbkdf2()` (line ~5609):
> This API uses libuv's threadpool, which can have surprising and
> negative performance implications for some applications; see the
> [`UV_THREADPOOL_SIZE`][] documentation for more information.

`crypto.randomBytes()` (line ~6001) and `crypto.randomFill()` (line ~6146) carry the identical sentence, each followed by an additional note that the async call is "carried out in a single threadpool request." `crypto.scrypt()`'s asynchronous form (and `crypto.generateKeyPair()`) are documented the same way at other points in the file, and this exact sentence recurs 6 times in the document, none of them under the argon2 heading.

**Finding: the async `crypto.argon2()` documentation does not use this standard phrasing, and makes no claim about threadpool execution or blocking behaviour at all.** The documentation text is silent on the question this ticket asks. This silence is itself notable given the sentence's routine use elsewhere in the same file for functions with directly comparable async/sync pairs (`pbkdf2`/`pbkdf2Sync`, `scrypt`/`scryptSync`).

Node's canonical, separate list of threadpool-backed APIs — `doc/api/cli.md`, section `UV_THREADPOOL_SIZE=size` (retrieved 2026-09-11) — also does **not** mention argon2:

> Asynchronous system APIs are used by Node.js whenever possible, but where they
> do not exist, libuv's threadpool is used to create asynchronous node APIs based
> on synchronous system APIs. Node.js APIs that use the threadpool are:
>
> * all `fs` APIs, other than the file watcher APIs and those that are explicitly
>   synchronous
> * asynchronous crypto APIs such as `crypto.pbkdf2()`, `crypto.scrypt()`,
>   `crypto.randomBytes()`, `crypto.randomFill()`, `crypto.generateKeyPair()`
> * `dns.lookup()`
> * all `zlib` APIs, other than those that are explicitly synchronous

This list gives `crypto.pbkdf2()`, `crypto.scrypt()`, `crypto.randomBytes()`, `crypto.randomFill()`, and `crypto.generateKeyPair()` as examples ("such as") — it is illustrative, not necessarily an exhaustive enumeration, and `argon2` (added after this list was last touched, in v24.7.0) is not named. **The documentation does not settle the question either way by naming argon2 explicitly in this list; its absence is consistent with either an oversight in the docs or with argon2 genuinely not (yet) being wired into this same illustrative sentence**, so this list alone is not conclusive — the source-code check below is.

### 2. The implementation, from source

The original PR that added the feature: **nodejs/node PR #50353**, "crypto: add argon2() and argon2Sync() methods" (confirmed via GitHub API search of `nodejs/node` pull requests, retrieved 2026-09-11). Its file list includes `src/crypto/crypto_argon2.cc`, `src/crypto/crypto_argon2.h`, `lib/internal/crypto/argon2.js`, and — notably — a change to `src/async_wrap.h` (needed to register a new `AsyncWrap::ProviderType`) and to `test/sequential/test-async-wrap-getasyncid.js`, which is the test that enumerates every `AsyncWrap` provider type Node has. Follow-on PRs against the same subsystem exist (#62863 "remove Argon2 KDF derivation from its job setup", #63170 the v24.x backport of that, #64776 a FIPS/error-handling fix, #63924 "mark argon2 ... as stable") but do not change the threading model.

Reading the current (`main` branch, 2026-09-11) source directly:

`src/crypto/crypto_argon2.h`:
```
struct Argon2Traits final {
  using AdditionalParameters = Argon2Config;
  static constexpr const char* JobName = "Argon2Job";
  static constexpr AsyncWrap::ProviderType Provider =
      AsyncWrap::PROVIDER_ARGON2REQUEST;
  ...
};

using Argon2Job = DeriveBitsJob<Argon2Traits>;
```

`Argon2Job` is a specialization of the generic `DeriveBitsJob<Traits>` template in `src/crypto/crypto_util.h` — the same template that backs `crypto.pbkdf2()`, `crypto.scrypt()`, and the WebCrypto `deriveBits` operations. That template is defined as:

```
class CryptoJob : public AsyncWrap, public ThreadPoolWork {
 public:
  ...
  explicit CryptoJob(Environment* env,
                     v8::Local<v8::Object> object,
                     AsyncWrap::ProviderType type,
                     CryptoJobMode mode,
                     AdditionalParams&& params)
      : AsyncWrap(env, object, type),
        ThreadPoolWork(env, "crypto"),
        mode_(mode),
        params_(std::move(params)) {
    // If the CryptoJob is async, then the instance will be
    // cleaned up when AfterThreadPoolWork is called.
    if (mode == kCryptoJobSync) MakeWeak();
  }
  ...
  void AfterThreadPoolWork(int status) override { ... }
```

and `DeriveBitsJob<Traits>::DoThreadPoolWork()` (also in `crypto_util.h`) is the method that actually runs the KDF, calling `DeriveBitsTraits::DeriveBits(...)` — for the argon2 specialization, this dispatches into `Argon2Traits::DeriveBits`, defined in `src/crypto/crypto_argon2.cc`, which calls into the OpenSSL/`ncrypto` Argon2 primitive.

**Finding: `crypto.argon2()`'s asynchronous form is a genuine `ThreadPoolWork`/`AsyncWrap` job, structurally identical in mechanism to `crypto.pbkdf2()` and `crypto.scrypt()`.** When `mode` is the async job mode, the constructor does *not* call `MakeWeak()` (that only happens for `kCryptoJobSync`), and the class overrides `AfterThreadPoolWork`, which is the libuv threadpool completion callback — this is only meaningful if the work itself (`DoThreadPoolWork`) is dispatched onto the threadpool via libuv's `uv_queue_work`, which is what `ThreadPoolWork::ScheduleWork()` (declared in `src/threadpoolwork-inl.h`, not separately re-inspected here but a well-established, long-standing Node internal used by every other `ThreadPoolWork` subclass) does. I did not re-derive `ThreadPoolWork::ScheduleWork()`'s body in this pass, but its use here follows the identical class hierarchy and job-lifecycle pattern as `crypto.pbkdf2()`/`crypto.scrypt()`, which are the primitives Node's own docs and CLI reference explicitly confirm are threadpool-backed. This is implementation evidence, not a documentation statement — see the gap noted in Finding 1.

**Version it landed in:** v24.7.0 (per the `added:` YAML annotation on both doc entries, consistent with the prior scout's finding).

### 3. Threadpool size consequence

`doc/api/cli.md`, `UV_THREADPOOL_SIZE=size` (retrieved 2026-09-11), quoted in full above (Finding 1). Key facts, quoted:

> Set the number of threads used in libuv's threadpool to `size` threads.
>
> ... one potential solution is to increase the size of libuv's
> threadpool by setting the `'UV_THREADPOOL_SIZE'` environment variable to a value
> greater than `4` (its current default value). However, setting this from inside
> the process using `process.env.UV_THREADPOOL_SIZE=size` is not guaranteed to work
> as the threadpool would have been created as part of the runtime initialisation
> much before user code is run.

**Default size: 4 threads.** The documentation states no upper bound in this text; it does not name a documented maximum, and I did not locate one elsewhere in the retrieved doc set — flagged as unresolved below rather than assumed to be unlimited.

**Arithmetic consequence, stated plainly:** with the default `UV_THREADPOOL_SIZE=4` and no other threadpool consumer active, at most 4 argon2 hash operations can run truly concurrently on the threadpool; a 5th queued request waits for one of the 4 to finish. The same threadpool is shared — per the `cli.md` list quoted above — with essentially all asynchronous `fs` operations (other than file watchers and explicitly-sync calls), `dns.lookup()`, and all asynchronous `zlib` operations, as well as `crypto.pbkdf2()`, `crypto.scrypt()`, `crypto.randomBytes()`, `crypto.randomFill()`, and `crypto.generateKeyPair()`. If argon2 is in fact scheduled through the same generic `ThreadPoolWork` mechanism (Finding 2), it competes for the same 4 slots as those operations; a burst of concurrent login attempts would consume some or all of those 4 slots for the duration of each hash, and any filesystem or DNS work scheduled during that window would queue behind them (and vice versa).

### 4. Memory consequence at the intended parameters

At `m=19456` KiB (19 MiB) per operation, N concurrent Argon2id hashes each allocate that memory independently and simultaneously (Argon2's KDF working set is proportional to `m`; nothing in the documentation or source reviewed here indicates the memory is shared or pooled across concurrent jobs). Arithmetically: N=4 (the default threadpool size) → 4 × 19 MiB ≈ 76 MiB transiently allocated for hashing alone, on top of whatever else the process holds; if `UV_THREADPOOL_SIZE` were raised to accommodate more concurrent users, memory scales linearly with it (e.g. N=20, matching the stated ~20 concurrent users, → 20 × 19 MiB ≈ 380 MiB).

**Memory ceiling comparable to scrypt's `maxmem`:** I searched the retrieved `crypto.md` argon2 sections (lines 3442–3607, quoted in full in Finding 1) for any parameter analogous to scrypt's `maxmem`. **None exists.** The `memory` parameter is described only as:

> `memory` {number} REQUIRED, memory cost in 1KiB blocks. Must be at least
> `8 * parallelism` and at most `2**32-1`. The actual number of blocks is rounded
> down to the nearest multiple of `4 * parallelism`.

There is no default value (it is REQUIRED, consistent with the prior scout's finding) and no upper-bound safety check comparable to scrypt's documented `128 * N * r > maxmem` error condition. **Finding: unlike `scrypt`, Node's `argon2`/`argon2Sync` documentation imposes no analogous memory ceiling or `maxmem`-style guard — the only bound is the parameter's own type range (up to `2**32-1` KiB), which is not a practical safety limit.** This means Node itself will not stop a caller from configuring memory costs that, multiplied across concurrent threadpool jobs, exceed available RAM; nothing in the reviewed documentation or source enforces a process- or job-level memory cap for argon2.

### 5. Measured timing figure

I did not find a documented benchmark figure specifically for `m=19456` KiB (19 MiB), `t=2`, `p=1` from a primary source. What RFC 9106 (`https://www.rfc-editor.org/rfc/rfc9106.html`, retrieved via a fetch/summarize step rather than a direct `curl`, flagged accordingly) states are different reference points, none matching the OWASP-minimum configuration in question:

- A "frontend server authentication" scenario the RFC describes as recommended to take approximately 0.5 seconds on a 2 GHz CPU using 2 cores, at `p=4` lanes and 1 GiB memory — far higher memory than 19 MiB.
- A "backend server authentication" scenario at 0.5 seconds on a 2 GHz CPU / 4 cores, `p=8` lanes, 4 GiB RAM.
- The RFC's own two headline "recommended options" are `t=1, p=4, m=2 GiB` and `t=3, p=4, m=64 MiB` — again neither matches `m=19 MiB, t=2, p=1`.

**None of RFC 9106's example timings use the OWASP-minimum parameter set** (`m=19456 KiB, t=2, p=1`) that this ticket asks about, and OWASP's own Password Storage Cheat Sheet (quoted in the base document, Finding 3) gives the parameter tuples themselves but no timing figures. I did not locate a primary-source benchmark for this specific configuration and am not estimating one. **This is an open question the sources do not settle.**

## What I could not establish (addendum)

- **No documented maximum for `UV_THREADPOOL_SIZE`.** The CLI doc states the default (4) and how to raise it, but does not state an upper bound in the text retrieved; libuv itself is known informally to impose an upper bound in some versions, but I did not verify this from libuv's own documentation and am not asserting a number.
- **`ThreadPoolWork::ScheduleWork()`'s exact call into `uv_queue_work`** was not independently re-read in this pass; the conclusion that argon2's async job is threadpool-backed rests on its use of the identical `CryptoJob`/`DeriveBitsJob` template and `AsyncWrap`/`ThreadPoolWork` class hierarchy as `pbkdf2`/`scrypt`, not on tracing every line of the scheduling call itself.
- **Whether the documentation's silence on threadpool behaviour for argon2 (Finding 1) is a doc omission that will be corrected, or an intentional distinction.** I found no Node issue or PR discussion addressing this gap specifically; the `cli.md` threadpool list's phrasing ("asynchronous crypto APIs such as...") is illustrative, not exhaustive, so its omission of argon2 is not itself proof of anything either way — the source-code evidence in Finding 2 is what supports the threadpool conclusion, not the documentation.
- **No primary-source measured timing figure for Argon2id at exactly `m=19456 KiB, t=2, p=1`** on any specific hardware — see Finding 5. RFC 9106's example timings all use different, larger-memory configurations.
- **RFC 9106 content in this addendum was retrieved via a fetch-and-summarize tool, not a direct-quote `curl`**, unlike the rest of this addendum; the quoted figures should be treated as slightly lower-confidence than the `curl`-retrieved Node source and documentation quotes.

## Sources (addendum)

- Node.js `crypto` API documentation source — `https://raw.githubusercontent.com/nodejs/node/main/doc/api/crypto.md` — retrieved via direct `curl` 2026-09-11 (`main` branch; argon2 sections carry `added: v24.7.0` YAML annotations).
- Node.js CLI documentation source (`UV_THREADPOOL_SIZE`) — `https://raw.githubusercontent.com/nodejs/node/main/doc/api/cli.md` — retrieved via direct `curl` 2026-09-11.
- `nodejs/node` PR #50353, "crypto: add argon2() and argon2Sync() methods" — `https://github.com/nodejs/node/pull/50353` — file list retrieved via GitHub REST API 2026-09-11.
- Related `nodejs/node` PRs (source-history context, not separately quoted): #62863, #63170, #63924, #64776, #64218, #62868 — identified via GitHub REST API search 2026-09-11.
- `nodejs/node` source, `src/crypto/crypto_argon2.h` — `https://raw.githubusercontent.com/nodejs/node/main/src/crypto/crypto_argon2.h` — retrieved via direct `curl` 2026-09-11 (`main` branch).
- `nodejs/node` source, `src/crypto/crypto_util.h` (`CryptoJob`, `DeriveBitsJob` templates) — `https://raw.githubusercontent.com/nodejs/node/main/src/crypto/crypto_util.h` — retrieved via direct `curl` 2026-09-11 (`main` branch).
- RFC 9106, *Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications* — `https://www.rfc-editor.org/rfc/rfc9106.html` — retrieved via fetch/summarize tool 2026-09-11 (flagged as lower-confidence retrieval method above; figures should be independently re-verified by direct text retrieval if they become load-bearing).
