---
status: done
summary: >-
  Closed E1, the one blocker from technical-validation-04, in a single commit.
  The HTTP API's credentialed preflight allow-list now carries x-ballot-token
  beside content-type and authorization, so the three public audience writes
  survive the browser preflight in preview, where the site and the API sit on
  different hosts. A synthesis test pins the allow-list on the template, which
  is the assertion the workspace had nowhere: the whole suite drives the Hono
  app in-process, where no browser enforces CORS. Nothing else moved. The
  infra/cdk suite is 337 tests green at 100% statement, branch, function and
  line coverage, infra/shared is 35 green with the committed borso-shared
  template snapshot unchanged, and eslint, prettier and typecheck are clean on
  both files.
artifacts:
  - infra/cdk/src/constructs/lambda-api.ts
  - infra/cdk/test/unit/lambda-api.test.ts
next:
  kind: validate
---

# Implementation, fix round four

A fix round on `claude/concert-sound-voting-c7r8w7`, scoped to the single row
`technical-validation-04` failed the branch on. One commit, two files, no other
change in the working tree.

## E1 — the preflight allow-list did not carry the ballot token

`apps/pragma/site/src/lib/queries/audience.queries.ts` sends the ballot on a
custom request header, `x-ballot-token`. A custom header is not a CORS-safelisted
one, so the browser sends an `OPTIONS` preflight before every one of the three
public writes and refuses to send the write itself unless the response's
`Access-Control-Allow-Headers` names that header.

`LambdaApi` builds two preflight shapes. The credentialed one, taken whenever a
caller passes a non-empty `allowedOrigins`, listed `['content-type',
'authorization']` and nothing else. `PreviewableApp` always passes exactly one
origin — the site's own — at `infra/cdk/src/constructs/previewable-app.ts:85`,
so every stage that stands the API up on a host of its own takes that branch and
every audience write from a real browser died at the preflight.

The list is now a named constant beside the other CORS constant in the file:

```ts
const CORS_ALLOWED_REQUEST_HEADERS = ['content-type', 'authorization', 'x-ballot-token'];
```

and the credentialed branch spreads it into `allowHeaders`. The name is what
carries the intent that a bare third string in an inline array would not.

### Which stages this was actually broken in

Worth stating precisely, because a stageless claim about routing gets inherited
verbatim by the next reader.

- **Prod** — unaffected. The site reaches the API same-origin under `/api`,
  wired only when `isProductionStage` holds
  (`infra/cdk/src/internal/stage-wiring.utils.ts:23`). A same-origin request is
  not a cross-origin one, so no preflight is issued and the allow-list is never
  consulted.
- **Local dev** — unaffected. The Vite proxy at `apps/pragma/vite.config.ts:27`
  makes the API same-origin to the browser for the same reason.
- **Preview** — this is where it broke. `.github/workflows/preview.yml:103`
  bakes a separate API host into the bundle, so every write is cross-origin,
  every write preflights, and every preflight was refused.

So the fix changes nothing prod serves today and repairs the stage the feature
is actually reviewed in.

### The wildcard branch is deliberately untouched

The other shape, taken when no `allowedOrigins` are passed, sets
`allowOrigins: ['*']` with no `allowHeaders` at all. No application in this
repository reaches it — `PreviewableApp` is the only caller and it always passes
an origin — and widening it is outside the blocker, which named the credentialed
list. Left as it is.

## The test the workspace did not have

`grep allowHeaders infra/cdk/test/` returned nothing before this round, and the
pragma suite cannot cover it: the whole suite drives the Hono app in-process,
where no browser enforces CORS and every header arrives regardless. The gap was
structural, not an oversight in any one test.

The new case in `infra/cdk/test/unit/lambda-api.test.ts` synthesises the
construct with one allowed origin and asserts the emitted
`AWS::ApiGatewayV2::Api` carries `AllowCredentials: true`, the origin, and the
three headers in order. It follows `test-cdk-synth`, the blueprint the file
already carries: assert on the CloudFormation template rather than on the
construct object, so the check reads what CloudFormation will actually receive.

Neither file is new, so both `@FollowsBlueprint` markers already in them
(`reusable-cdk-construct` on the class, `test-cdk-synth` on the describe) stand
unchanged, and no marker was added.

## Gates

| Gate | Result |
| --- | --- |
| `pnpm --filter @borso/infra run test` | 21 files, 337 tests, green |
| `pnpm --filter @borso/infra run test:coverage` | 100% statements 468/468, branches 203/203, functions 102/102, lines 444/444 |
| `pnpm --filter @borso/shared-infra run test` | 2 files, 35 tests, green; `borso-shared.template.json` snapshot unchanged |
| `pnpm --filter @borso-app/pragma run test` | 15 files, 102 tests, green |
| `pnpm exec eslint` on both changed files | clean |
| `pnpm exec prettier --check` on both changed files | clean |
| `pnpm --filter @borso/infra run typecheck` | clean |

The committed `borso-shared` template snapshot does not move: `borso-shared`
composes the account-level singletons and holds no `LambdaApi`, so no
`shared-deploy` dispatch is owed for this commit. `git status --short` at the
end of the round lists exactly the two files above.

## What did not change

No ADR trigger. No new dependency, no new secret, no schema column, and nothing
beyond the ratified spec — the change adds one string to an existing allow-list
and one assertion to an existing suite.
