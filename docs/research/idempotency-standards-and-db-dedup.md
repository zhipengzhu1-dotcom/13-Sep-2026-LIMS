# Standards and precedents for idempotent write commands over HTTP and DB-layer deduplication

**Asked by:** Orchestrator — Benchline wayfinder map, idempotency-mechanism interface-design decision
**Date:** 2026-09-11
**Status of sources:** Verified directly against primary sources on 2026-09-11:
- RFC 9110 fetched from httpwg.org (the current, published edition; RFC 9110 obsoleted RFC 7231 in 2022 and is the current HTTP Semantics RFC).
- draft-ietf-httpapi-idempotency-key-header status checked directly on datatracker.ietf.org (not a mirror or summary) on 2026-09-11.
- Stripe, PayPal, Adyen pages fetched from their own developer-docs domains (docs.stripe.com, developer.paypal.com, docs.adyen.com) on 2026-09-11.
- sqlite.org and postgresql.org pages fetched directly (PostgreSQL "current" version docs, i.e. tracks the latest stable release; not pinned to a specific numbered version — noted as an open item below).

## Findings

### 1. RFC 9110 — HTTP Semantics — idempotent methods and POST

RFC 9110, §9.2.2 "Idempotent Methods":

> "A request method is considered idempotent if the intended effect on the server of multiple identical requests with that method is the same as the effect for a single such request. Of the request methods defined by this specification, PUT, DELETE, and safe request methods are idempotent."

Source: https://httpwg.org/specs/rfc9110.html#idempotent.methods (§9.2.2), accessed 2026-09-11.

POST is **not** listed among the idempotent methods. §9.2.2 further states:

> "A client SHOULD NOT automatically retry a request with a non-idempotent method unless it has some means to know that the request semantics are actually idempotent, regardless of the method, or some means to detect that the original request was never applied."

and gives an example: "a user agent can repeat a POST request automatically if it knows (through design or configuration) that the request is safe for that resource" — i.e. RFC 9110 acknowledges that POST *can* be made idempotent by application-level design, but does not itself define a mechanism for doing so; idempotency of POST is not a protocol-level property, it is something the resource/application must establish out-of-band.

§9.3.3 "POST" (the method definition) describes POST's semantics as submitting a representation for resource-specific processing, including "Creating a new resource that has yet to be identified by the origin server," and does not mention idempotency at all — RFC 9110 leaves POST idempotency entirely out of scope.

Source: https://httpwg.org/specs/rfc9110.html#POST (§9.3.3), accessed 2026-09-11.

### 2. draft-ietf-httpapi-idempotency-key-header — current status

Checked directly on datatracker.ietf.org, 2026-09-11:

- **Status: Expired Internet-Draft** (datatracker page badge reads "Expired Internet-Draft," "Expired & archived").
- **Latest revision: -07**, dated **2025-10-15**.
- **Intended RFC status: Standards Track — but it did not reach RFC.** The datatracker's "Intended RFC status" / outcome field reads "Expired." It has not been published as an RFC.
- Authored by Jayadeba Jena and Sanjay Dalal, developed under the IETF HTTP APIs (httpapi) working group, superseding an earlier individual draft (draft-idempotency-header).

Source: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ and .../history/, accessed 2026-09-11.

**Implication for citation:** this draft is not an adopted standard. It is a lapsed, non-normative proposal. Any description of its content below (semantics, retry behaviour, status codes, key scope, retention guidance) describes what an *expired draft* proposed, not an established IETF standard — I did not re-fetch the full draft text body given it is expired and non-authoritative; I flag this as a gap in "What I could not establish" rather than presenting its content as settled specification.

### 3. Industry precedent — vendor API docs

**Stripe** (docs.stripe.com/api/idempotent_requests, accessed 2026-09-11):

> "Stripe's idempotency works by saving the resulting status code and body of the first request made for any given idempotency key, regardless of whether it succeeds or fails. Subsequent requests with the same key return the same result, including 500 errors."

> "A client generates an idempotency key, which is a unique key that the server uses to recognize subsequent retries of the same request. How you create unique keys is up to you, but we suggest using V4 UUIDs, or another random string with enough entropy to avoid collisions. Idempotency keys are up to 255 characters long."

> "You can remove keys from the system automatically after they're at least 24 hours old. We generate a new request if a key is reused after the original is pruned."

> "The idempotency layer compares incoming parameters to those of the original request and errors if they're not the same to prevent accidental misuse." (I.e., same key + different body → documented error, not silent reuse.)

> "All POST requests accept idempotency keys. Don't send idempotency keys in GET and DELETE requests because it has no effect. These requests are idempotent by definition."

**Retention window documented by Stripe: 24 hours (minimum).**

**PayPal** (`PayPal-Request-Id`, developer.paypal.com/api/rest/reference/idempotency/, accessed 2026-09-11):

- Documented behaviour on same key/same body: "the latest status of the previous request that used that same header" is returned rather than repeating the action.
- Different-body behaviour: **not explicitly documented** on this page.
- Concurrent same-key requests: "When you send two simultaneous API requests with same PayPal-Request-Id header, PayPal processes the first request and might fail the second request."
- **Retention window: not a fixed value on this page.** The page explicitly defers: "Not all APIs support this header. To determine whether your API supports it and for information about how long the server stores the ID, see the reference for your API." PayPal documents retention as **per-API-endpoint, not globally specified.**
- Key generation guidance: "PayPal recommends that you use the UUID standard for the PayPal-Request-Id header value because it meets the 38 single-byte character limit," and the value "must be unique for both each request and an API call type."
- Applies to REST API POST calls; PayPal states not all APIs support the header.

**Adyen** (`Idempotency-Key`, docs.adyen.com/development-resources/api-idempotency/, accessed 2026-09-11):

> "Idempotency keys are valid for a period of 7 to 14 days after first submission."

- Same key/same body: "the response to the first attempt will be returned without duplication."
- Different body with same key: not explicitly addressed on this page.
- Concurrent same-key requests: return a transient error (HTTP 422 or 409, documented error code 704: "request already processed or in progress").
- "The Adyen API supports idempotency on POST requests (other request types such as GET, DELETE and PUT are idempotent by definition)."
- Key generation guidance: "Generate unique idempotency keys per request using the version 4 (random) UUID type to prevent two API credentials under the same account from accessing each others responses." Maximum key length 64 characters.
- Scope: keys are "stored at a company account level" and not cross-checked across regional endpoints.

**Retention windows, concretely, as documented:**
| Vendor | Documented retention window |
|---|---|
| Stripe | "at least 24 hours" (auto-pruned no earlier than that) |
| PayPal | Not fixed — "see the reference for your API" (per-endpoint) |
| Adyen | "7 to 14 days after first submission" |

### 4. Client-generated vs. server-generated keys

All three vendors document the key as **client-generated**, submitted before the request is sent, and reused verbatim on retry:

- Stripe: "A client generates an idempotency key... How you create unique keys is up to you, but we suggest using V4 UUIDs, or another random string with enough entropy to avoid collisions."
- PayPal: recommends "the UUID standard."
- Adyen: recommends "version 4 (random) UUID."

None of the three vendor pages fetched contain a server-generated-key mode; the documented pattern in all three is client-generates-before-first-attempt, then reuses-on-retry (this reuse-on-retry behaviour is implicit in how "subsequent requests with the same key" and "retrying a request" are described, e.g. Stripe: "if a connection error occurs, you can safely repeat the request" using the same key). None of the pages I fetched contain an explicit normative statement of the form "the key MUST be generated before the first attempt" as a standalone rule — it is described operationally (the key identifies "the request," and repeating "the request" means resending the same key), rather than stated as an explicit numbered requirement.

### 5. Database-layer deduplication — SQLite and PostgreSQL

**SQLite:**
- `INSERT ... ON CONFLICT` (UPSERT), sqlite.org/lang_upsert.html: causes an INSERT that would violate a UNIQUE or PRIMARY KEY constraint (or a specified unique index) to instead perform `DO UPDATE` or `DO NOTHING`, using `excluded.<column>` to reference the values that would have been inserted. Multiple `ON CONFLICT` clauses can be chained and are evaluated in order; a `DO UPDATE` conflict-resolution is always effectively ABORT-on-other-violations (the statement rolls back on any other constraint violation).
- `RETURNING`, sqlite.org/lang_returning.html: usable on INSERT, UPDATE, and DELETE, including upserts — documented explicitly: "A RETURNING clause for an UPSERT reports both inserted and updated rows." Not usable on virtual tables, and only at top level (not inside triggers).

**PostgreSQL** (postgresql.org/docs/current/sql-insert.html, accessed 2026-09-11 — "current" tracks the latest stable release rather than a version-pinned URL, noted below):
- `ON CONFLICT DO NOTHING`: skips the insert if it would violate a unique or exclusion constraint; conflict target optional.
- `ON CONFLICT (...) DO UPDATE`: performs an atomic INSERT-or-UPDATE; conflict target is required; the `excluded` pseudo-table exposes the would-be-inserted row; supports a `WHERE` clause to further restrict which conflicting rows get updated.
- `RETURNING`: computes and returns values from each row actually inserted or updated as a result of `ON CONFLICT DO UPDATE`; documents `OLD`/`NEW` row references (`RETURNING WITH (OLD AS o, NEW AS n) ...`) to distinguish pre- and post-update values.

**Unique index on a client-supplied key inside the same transaction as the business write:** I found **no page on sqlite.org or postgresql.org that names or describes this as a pattern** (e.g., no page frames "store the client's idempotency key in a unique column and let the constraint do deduplication" as a documented recipe). Both sites document the underlying primitives (UNIQUE constraints, ON CONFLICT, RETURNING) individually and generically, but neither vendor's own documentation, in the pages fetched, presents the combination as an idempotency-key deduplication pattern per se. I am reporting the primitives as documented and not constructing or asserting the composite pattern as something these sources describe.

### 6. Natural-key vs. surrogate-key dedup

None of the sources fetched (RFC 9110, the expired IETF draft's datatracker status page, Stripe/PayPal/Adyen docs, sqlite.org, postgresql.org) contain an explicit, named discussion of "natural key" vs. "surrogate/opaque client-supplied key" deduplication as a documented design distinction. The vendor idempotency-key mechanisms (Stripe/PayPal/Adyen) are, by their documented design, opaque client-supplied tokens scoped to "a request," not business/domain keys — but none of the fetched pages explicitly contrasts this against deduplicating on a natural business key (e.g., a domain identifier such as a sample or container number). This is reported as absent from the sources examined, not as a settled position of the sources.

## What I could not establish

- The full technical content of draft-ietf-httpapi-idempotency-key-header (proposed status codes, error response bodies, key uniqueness scope, retention-window guidance) was not verified against the draft's own body text in this pass — only its datatracker status (Expired, rev -07, 2025-10-15) was confirmed. Because the draft is expired and non-normative, I have not treated any content summary of it as authoritative; a further pass would need to fetch the draft text itself (datatracker "Show full document" / htmlized view) and clearly label it as "an expired proposal describes X," not as a standard.
- PayPal does not document a single global retention window; it explicitly defers to "the reference for your API," so no single concrete duration exists to report for PayPal as a company-wide figure.
- Whether PayPal or Adyen error (vs. silently reuse) on same-key-but-different-body is not explicitly documented on the pages fetched — only Stripe explicitly documents an error in that case.
- Neither sqlite.org nor postgresql.org documents "unique index on a client-supplied key in the same transaction as the business write" as a named pattern; only the constituent primitives (UNIQUE/ON CONFLICT/RETURNING) are documented individually. No authoritative source found that frames this as a defined idempotency pattern.
- No source found (in the sources fetched) that explicitly distinguishes natural-key dedup from opaque-key dedup as a named design concept.
- The PostgreSQL documentation URL used ("current") is version-floating rather than pinned to a specific PostgreSQL release number; the exact release documented at fetch time was not separately recorded.

## Sources

- RFC 9110, "HTTP Semantics" — https://httpwg.org/specs/rfc9110.html (§9.2.1 Safe Methods, §9.2.2 Idempotent Methods, §9.3.3 POST), accessed 2026-09-11. This is the current, standards-track HTTP Semantics RFC (obsoletes RFC 7231).
- IETF Datatracker, draft-ietf-httpapi-idempotency-key-header — https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ and https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/history/, status checked 2026-09-11: Expired Internet-Draft, latest revision -07, 2025-10-15.
- Stripe, "Idempotent requests" — https://docs.stripe.com/api/idempotent_requests, accessed 2026-09-11.
- PayPal Developer, "Idempotency" (PayPal-Request-Id) — https://developer.paypal.com/api/rest/reference/idempotency/, accessed 2026-09-11.
- Adyen, "API idempotency" — https://docs.adyen.com/development-resources/api-idempotency/, accessed 2026-09-11.
- SQLite, "UPSERT" — https://www.sqlite.org/lang_upsert.html, accessed 2026-09-11.
- SQLite, "The RETURNING Clause" — https://www.sqlite.org/lang_returning.html, accessed 2026-09-11.
- PostgreSQL Documentation, "INSERT" (current) — https://www.postgresql.org/docs/current/sql-insert.html (covers ON CONFLICT and RETURNING), accessed 2026-09-11.
