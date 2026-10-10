---
date: 2026-10-10
introduced-at: conception
detected-at: review
severity: high
related-pr: e2693a3e (pragma), 5353b6de (last-loop-lepin)
fix-pr: this branch, claude/rate-limit-client-ip
fix-commits: [the commit that adds this file]
eradication-level: 2
time-to-detect: months
tags: [security, rate-limit, cloudfront, api-gateway, dsql, lambda]
blueprints: [repository-idempotent-upsert, middleware-public-rate-limit]
---

# The rate limit that let the attacker pick the bucket

## Symptom

Nobody saw it fail, which is the problem. A review found that every sign-in
limit in three applications could be reset at will by the caller:

| Application | Route | Budget the limit claimed |
| --- | --- | --- |
| pragma | `POST /api/auth/login` | 5 tries per 15 minutes |
| pragma | `POST /api/auth/recover-password` | 3 tries per hour on the band password, which opens every account |
| pragma | audience search and votes | 120 and 600 requests per minute |
| talos | passkey registration code and login | 10 tries per 15 minutes |
| last-loop-lepin | admin PIN | 5 tries per 5 minutes |

The way to reset it was written down. `docs/knowledge/driving-pragma-auth-from-a-validator.md`
told validators: *"A validator gets a fresh bucket by sending a different
`X-Forwarded-For` value per case, which is how the PR #107 run covered every
refusal in one session."* That sentence is also the exploit. A script that
sends `X-Forwarded-For: <random>` with every guess gets unlimited guesses at
the band password.

## Root-cause chain

```ts
export function readClientIp(headerValue: string | undefined): string {
  if (headerValue === undefined) return UNKNOWN_IP_PLACEHOLDER;
  const separatorIndex = headerValue.indexOf(',');
  const first = separatorIndex === -1 ? headerValue : headerValue.slice(0, separatorIndex);
  return first.trim();              // ← ❌ the first entry is the one the client wrote
}
```

1. **Why could one client have unlimited tries?** Each request landed in a
   new bucket, because the bucket key was `sha256(first entry of X-Forwarded-For)`.
2. **Why was the first entry the client's choice?** CloudFront does not
   replace `X-Forwarded-For`. The AWS documentation says that when the viewer
   sends one, CloudFront *"appends it to the end of the `X-Forwarded-For`
   header"*. `X-Forwarded-For: 1.2.3.4` from a viewer at `198.51.100.10`
   arrives as `1.2.3.4,198.51.100.10`. The trustworthy hop is the last one
   CloudFront wrote, never the first.
3. **Why did the code take the first?** Because the design said so. ADR-0004,
   line 28: *"The IP itself arrives from API Gateway in `x-forwarded-for`,
   whose **first** comma-separated entry is the real client."* The
   last-loop-lepin test pinned the same belief by name:
   *"answers the leftmost address when proxies appended their hops"*.
4. **Why did the mistake reach three applications?** talos was copied from
   pragma byte for byte (`ip-hash.utils.ts` was identical in both), and
   last-loop-lepin had its own copy in `auth.core.ts`. No shared shape and no
   lint rule said where an address may come from, so each copy was free to be
   wrong in the same way.
5. **Why was a correct key not enough on its own?** Two more holes sat
   behind it, both verified on 2026-10-10:
   - The prod APIs were reachable without CloudFront.
     `aws apigatewayv2 get-apis` listed `DisableExecuteApiEndpoint: False` for
     `pragma-prod-api`, `talos-prod-api` and `last-loop-lepin-prod-api`, and
     `GET https://8a1hc5xjva.execute-api.eu-west-3.amazonaws.com/api/health`
     answered 200. A direct caller can send any header at all, so no header
     alone can be trusted. An HTTP API supports neither a resource policy nor
     WAF, so the direct endpoint cannot simply be closed to everyone but
     CloudFront.
   - pragma kept its sign-in buckets in a `Map` inside the Lambda instance,
     never evicted, while an `auth_attempt` table sat unused in the schema.
     With a reserved concurrency of 10, ten instances each counted their own
     five tries. talos and last-loop-lepin used the table, but read the row and
     wrote it back in two statements, so two concurrent requests could both
     read count 4 and both pass. The `repository-idempotent-upsert` blueprint
     they followed is right for replaying a write, and wrong for a counter.

**Root cause:** *thought "`X-Forwarded-For` is a list proxies build, so its
first entry is where the request came from", actually "the client writes the
first entry, every proxy only appends, and the one you can trust is the last
entry written by the proxy you control — or better, a value that proxy sets
itself and the client cannot reach".*

## Detection failure causes

- **Typing:** a header is a `string | undefined`. Nothing in the type says who
  wrote it.
- **Linter:** no rule knew that some headers are client-controlled.
- **Tests:** the tests sent `x-forwarded-for` to *choose* a bucket, which is
  the bypass used as a fixture. Every rate-limit test passed because it relied
  on the hole. No test sent a forged header and expected the limit to hold.
- **Code review and the ADR walk:** the wrong sentence was in the decision
  record itself, so a reviewer checking the code against the ADR found them in
  agreement.
- **Validation:** the PR #107 validator met the limiter, worked around it with
  a new header per case, and recorded the workaround as knowledge. The tool
  that should have noticed "I just bypassed a security control" wrote it down
  as a testing tip instead. A second entry says the same thing:
  `driving-previews-with-agent-browser-and-argent.md` ("a stuck run can be
  unblocked by setting a different one on the browser").
- **Monitoring:** nothing logs a 429 or the number of distinct buckets, so a
  brute force would have looked like ordinary 401 traffic.

## Countermeasure

The address is no longer read from any header the client controls:

- The CloudFront `/api/*` behaviour runs a viewer-request function that sets
  `x-borso-viewer-address` to `event.viewer.ip`, overwriting anything the
  client sent under that name.
- CloudFront also sends `x-borso-origin-verify`, an origin custom header whose
  value is a generated Secrets Manager secret. The same secret reaches the API
  Lambda as `ORIGIN_VERIFY_SECRET`.
- `resolveClientAddress` trusts the viewer address only when the request
  carries that secret. Otherwise it uses `requestContext.http.sourceIp`, the
  TCP peer API Gateway accepted. A direct `execute-api` caller is therefore
  keyed on their real address, which makes the open endpoint harmless for
  rate limiting. On previews there is no CloudFront and no secret, and
  `sourceIp` is the client.
- Sign-in buckets are bumped in one `INSERT ... ON CONFLICT DO UPDATE ...
  RETURNING` statement. pragma's member login and band-password recovery moved
  into the existing `auth_attempt` table, with the budget name hashed into the
  key so the two budgets stay separate.
- pragma's audience limiter stays per instance, now with eviction, because a
  whole venue behind one address would otherwise be one row that every guest
  writes at the same moment. Its budget is therefore up to the reserved
  concurrency times wider than written, which the blueprint description says.
- Validators reset buckets with `POST /api/__test/rate-limits/reset`, mounted
  only where `ALLOW_TEST_SEED=1`, never in prod.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2), plus a shared shape

**Reference:** branch `claude/rate-limit-client-ip`, the commit that adds this
file.

- **`borso/no-client-supplied-address-header`** rejects the string literals
  `x-forwarded-for`, `x-real-ip`, `x-client-ip`, `true-client-ip`, `forwarded`
  and `cloudfront-viewer-address` anywhere in API source except tests, and
  rejects the trusted `x-borso-*` header names outside
  `helpers/client-address/client-address.core.ts`. The next application cannot
  read the forgeable header without an `eslint-disable` line and a reason a
  reviewer will read.
- **`client-address-resolution`** is a blueprint in pragma, followed by the
  identical copies in talos and last-loop-lepin, because applications may not
  import from one another. The pre-write hook puts it in front of whoever
  writes the next one.
- **`repository-atomic-counter`** is a blueprint for the single-statement
  bucket, so the next counter does not reach for the idempotent upsert.
- **`infra/cdk`** sets the viewer header and the origin secret on every
  `PreviewableApp` whose API sits behind CloudFront. `StaticSite` now requires
  `originVerifyValue` whenever it routes `/api/*`, so an API behaviour cannot
  be wired without it.
- **Tests that forge the header:** each application now has a back-e2e case
  that sends a new `X-Forwarded-For` on every attempt and expects the limit to
  hold, and one that fires concurrent attempts and expects exactly the excess
  to be refused.

**What this does not fix:** a client behind a shared address, such as a venue
or a mobile carrier's NAT, still shares a bucket with everyone else there.
That is the cost of any address-keyed limit, and the reason the audience
budgets are wide.
