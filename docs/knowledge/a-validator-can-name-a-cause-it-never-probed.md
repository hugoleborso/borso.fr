# A validator can name a cause it never probed

A visual-validation run on `pragma` logged this, twice, as friction:

> the pragma login screen reports an HTTP 429 rate-limit from the auth API as
> 'Wrong name or password', so a validator debugging a failed login chases
> the wrong cause

It reads like a defect report. It is not one. Probing the running API
directly, six times from one address:

```
attempt 4: 401 {"error":"invalid-credentials"}
attempt 5: 401 {"error":"invalid-credentials"}
attempt 6: 429 {"error":"rate-limited"}
```

and the front end maps that status to its own message:

```ts
const LOGIN_ERROR_KEY_BY_STATUS = new Map([
  [429, 'auth.rateLimited'],   // "Too many attempts — try again in a few minutes."
  [401, 'auth.invalidPassword'],
]);
```

The chain is correct end to end. What the validator saw were its own five
wrong-password attempts, each answered 401 and each rendered *"Wrong name or
password"* — which is accurate. It then attributed the later failures to the
limiter it knew existed, without asking the API what it had answered.

## Why this matters more than the wrong claim

A validator's rows carry evidence by construction: the standard requires a
screenshot or a deterministic check per row. Its **Notes** carry prose, and
prose is where a causal claim goes when it has no evidence to attach. Both
halves end up in the same report, under the same authority, and a reader
downstream — a kaizen sweep, an operator, the next agent — cannot tell which
half was measured.

Two things follow:

- **A cause in a Notes block is a hypothesis until a probe is cited.** Treat
  it as one when reading a validation report, and write it as one when
  producing a report: *"the page said X; I did not check what the API
  answered"* costs one clause and is true.
- **The cheap probe is usually one `curl`.** The loop above took seconds and
  settled a claim that would otherwise have become a dantotsu with an
  eradication for a defect that does not exist — which is worse than the
  original friction, because it would have added a gate protecting nothing.

## The real lesson about the login screen

There is one, and it is smaller: a member who trips the limiter *before*
getting their password right sees the 401 message for their first five
attempts and the 429 message afterwards, which is accurate in both cases
because the limiter counts attempts rather than identities. If that ever
needs changing, the change is in the API's outcome order, not in the front
end's mapping.

Last verified: 2026-09-16 — six `curl -X POST /api/auth/login` calls from one
forwarded-for address against the running dev API: attempts one to five
answered `401 {"error":"invalid-credentials"}`, the sixth `429
{"error":"rate-limited"}`, and `login.core.ts` maps 429 to
`auth.rateLimited`.

## See also

- [`../dantotsus/lectured-without-reading-the-code.md`](../dantotsus/lectured-without-reading-the-code.md) — the same failure by a different reader.
- [`../dantotsus/said-the-file-was-unreachable-without-looking.md`](../dantotsus/said-the-file-was-unreachable-without-looking.md) — a claim about one's own harness, also unprobed.
