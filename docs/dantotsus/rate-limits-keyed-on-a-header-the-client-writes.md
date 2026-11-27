---
date: 2026-10-10
introduced-at: conception
detected-at: review
severity: high
related-pr: none (introduced by commits e2693a3e in pragma and 5353b6de in last-loop-lepin)
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/no-client-supplied-address-header.js, apps/pragma/api/src/helpers/client-address/client-address.core.ts, infra/cdk/src/internal/cf-api-viewer-address.code.js]
time-to-detect: months
tags: [security, rate-limit, cloudfront, api-gateway, dsql, lambda]
blueprints: [repository-idempotent-upsert, middleware-public-rate-limit]
zone: apps/pragma/api/src/auth
---

# The rate limit that let the attacker pick the bucket

## User impact

Nobody saw it fail, which is the problem. A review found that any caller could
reset every sign-in limit in three applications at will. A script sending
`X-Forwarded-For: <random>` with each guess got unlimited guesses at pragma's
band password, which opens every account.

| Application | Route | Budget the limit claimed | Budget it held |
| --- | --- | --- | --- |
| pragma | `POST /api/auth/login` | 5 tries per 15 minutes | unlimited |
| pragma | `POST /api/auth/recover-password` | 3 tries per hour | unlimited |
| pragma | audience search and votes | 120 and 600 requests per minute | unlimited |
| talos | passkey registration code and login | 10 tries per 15 minutes | unlimited |
| last-loop-lepin | admin PIN | 5 tries per 5 minutes | unlimited |

## Causal chain

- A caller got unlimited tries on every sign-in route.
  - Branch 1. Each request landed in a new bucket.
    - The bucket key was `sha256(first entry of X-Forwarded-For)`.

      ```ts
      export function readClientIp(headerValue: string | undefined): string {
        if (headerValue === undefined) return UNKNOWN_IP_PLACEHOLDER;
        const separatorIndex = headerValue.indexOf(',');
        const first = separatorIndex === -1 ? headerValue : headerValue.slice(0, separatorIndex);
        return first.trim(); // ← ❌ the first entry is the one the client wrote
      }
      ```

      - CloudFront appended the viewer's real address after the client's value.
        `X-Forwarded-For: 1.2.3.4` from a viewer at `198.51.100.10` arrived as
        `1.2.3.4,198.51.100.10`.
      - e2693a3e (pragma) and 5353b6de (last-loop-lepin) wrote the line from
        ADR-2026-05-19T1955, line 28: *"The IP itself arrives from API Gateway
        in `x-forwarded-for`, whose **first** comma-separated entry is the real
        client."* talos copied pragma's `ip-hash.utils.ts` byte for byte.
  - Branch 2. A direct caller could send any header at all.
    - The prod APIs answered without CloudFront. `aws apigatewayv2 get-apis`
      listed `DisableExecuteApiEndpoint: False` for the three prod APIs, and
      `GET https://8a1hc5xjva.execute-api.eu-west-3.amazonaws.com/api/health`
      answered 200 (measured 2026-10-10).
  - Branch 3. pragma's sign-in buckets were counted per Lambda instance.
    - They lived in a `Map` inside the instance, never evicted, while an
      `auth_attempt` table sat unused. With a reserved concurrency of 10, ten
      instances each counted their own five tries.
  - Branch 4. Two concurrent requests could both pass at count 4 in talos and
    last-loop-lepin.
    - The bucket was read and written back in two statements, following the
      `repository-idempotent-upsert` blueprint, which is right for replaying a
      write and wrong for a counter.

## Root cause of occurrence

*Thought `X-Forwarded-For` is a list proxies build, so its first entry is where
the request came from, actually the client writes the first entry, every proxy
only appends, and the one to trust is a value the proxy you control sets itself
and the client cannot reach.* (Material)

The code and its tests were built from the ADR's sentence, so the wrong belief
was in the input. The AWS CloudFront documentation says that when the viewer
sends the header, CloudFront *"appends it to the end of the `X-Forwarded-For`
header"*. The last-loop-lepin test pinned the same belief by name: *"answers the
leftmost address when proxies appended their hops"*.

## Detection failure causes

- **Typing:** a header is `string | undefined`. Nothing in the type says who
  wrote it.
- **Linter:** no rule knew that some headers are client-controlled, and no
  shared shape said where an address may come from, so each of the three
  copies was free to be wrong the same way.
- **Tests:** the tests sent `x-forwarded-for` to *choose* a bucket, which is
  the bypass used as a fixture. No test sent a forged header and expected the
  limit to hold.
- **Review and the ADR walk:** the wrong sentence was in the decision record,
  so code checked against the ADR agreed with it.
- **Validation:** the PR #107 validator met the limiter, worked around it with
  a new header per case, and wrote the workaround down as knowledge in
  `docs/knowledge/driving-pragma-auth-from-a-validator.md`: *"A validator gets
  a fresh bucket by sending a different `X-Forwarded-For` value per case"*.
  The tool that should have noticed "I just bypassed a security control"
  recorded it as a testing tip.
- **Monitoring:** nothing logs a 429 or the number of distinct buckets, so a
  brute force would have looked like ordinary 401 traffic.

## Countermeasure

The address is no longer read from any header the client controls.

- The CloudFront `/api/*` behaviour runs a viewer-request function that sets
  `x-borso-viewer-address` to `event.viewer.ip`, overwriting anything the client
  sent under that name.
- CloudFront also sends `x-borso-origin-verify`, a value of 32 random bytes that
  a custom resource generates once per prod stack and returns with `NoEcho`. The
  API Lambda gets the same value as `ORIGIN_VERIFY_SECRET`.
- `resolveClientAddress` trusts the viewer address only when the request carries
  that value. Otherwise it uses `requestContext.http.sourceIp`, the TCP peer API
  Gateway accepted, so a direct `execute-api` caller is keyed on their real
  address. Previews have no CloudFront, and `sourceIp` is the client.
- Sign-in buckets are bumped in one `INSERT ... ON CONFLICT DO UPDATE ...
  RETURNING`. pragma's login and recovery moved into `auth_attempt`, with the
  budget name hashed into the key.
- pragma's audience limiter stays per instance, now with eviction, because a
  venue behind one address would otherwise be one row every guest writes at
  once. Its budget is up to the reserved concurrency times wider than written.
- Validators reset buckets with `POST /api/__test/rate-limits/reset`, mounted
  only where `ALLOW_TEST_SEED=1`.

<details><summary>Where the origin-verify value comes from</summary>

The operator ruled out Secrets Manager.

| Option | Holds? | Why |
| --- | --- | --- |
| Make `execute-api` reachable only from CloudFront | No | An HTTP API supports neither a resource policy nor WAF. A function URL with origin access control needs a SHA-256 of every `POST` body, which a browser form does not send. A CloudFront IP-range check fails because an attacker's distribution egresses from the same ranges. |
| Derive it from the stack ID | No | The prod stack IDs are UUID version 1 (`…-11f1-…`, read with `aws cloudformation describe-stacks` on 2026-10-12), a timestamp plus a host field. |
| A synth-time random value | At a cost | Every prod deploy rewrites the distribution and the Lambda, and `cdk diff` is never clean. |
| An SSM parameter or a KeyValueStore | Moves the problem | Something still has to generate the value, and the Lambda cannot read a KeyValueStore. |
| A custom resource that generates it at deploy | Yes | Runs once on create, returns `crypto.randomBytes(32)` with `NoEcho`, and the template holds only `Fn::GetAtt`. |

</details>

The ADR's line 28 now carries a dated correction.

## Eradication

**Type:** DevX check (level 2), plus a shared shape

**Reference:** commit [`1dfffcff`](https://github.com/hugoleborso/borso.fr/commit/1dfffcff),
the commit adding this file, merged in 2cf5ac1f0.

- **`borso/no-client-supplied-address-header`** rejects the literals
  `x-forwarded-for`, `x-real-ip`, `x-client-ip`, `true-client-ip`, `forwarded`
  and `cloudfront-viewer-address` in API source outside tests, and the trusted
  `x-borso-*` names outside `helpers/client-address/client-address.core.ts`.
- **`client-address-resolution`** is a blueprint in pragma, followed by the
  copies in talos and last-loop-lepin, since apps may not import one another.
- **`repository-atomic-counter`** is a blueprint for the single-statement
  bucket.
- **`infra/cdk`** sets the viewer header and the origin-verify value on every
  `PreviewableApp` whose API sits behind CloudFront. `StaticSite` requires
  `originVerifyValue` whenever it routes `/api/*`.
- **Forged-header tests:** each app has a back-e2e case that sends a new
  `X-Forwarded-For` on every attempt and expects the limit to hold, and one
  that fires concurrent attempts and expects exactly the excess refused.

The exploit still reaches agents. The body of
`docs/knowledge/driving-pragma-auth-from-a-validator.md` was corrected. Its
`summary:` on line 2, which is the line the knowledge hook prints, still says
"a fresh rate-limit bucket per `X-Forwarded-For`".

**Proposed:** rewrite that summary to name `POST /api/__test/rate-limits/reset`.
Then have `scripts/check-knowledge-triggers.sh` refuse a knowledge `summary:`
that names a header `no-client-supplied-address-header` bans, reading the list
from the rule's export rather than a copy. That makes the hook unable to print
the bypass as a tip again. Neither exists yet.

**Proof it can fail:** not pasted in the 2026-10-10 entry.

**Similar instances:** talos `ip-hash.utils.ts` and last-loop-lepin
`auth.core.ts` carried the same line, and both were fixed in the same commit.
`driving-previews-with-agent-browser-and-argent.md` had given the same tip.
