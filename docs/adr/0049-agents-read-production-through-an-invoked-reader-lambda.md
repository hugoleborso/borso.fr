# ADR-0049: Agents read production through an invoked reader Lambda

- **Status:** accepted
- **Date:** 2026-10-28
- **Deciders:** Hugo Borsoni
- **Tags:** agents, dsql, lambda, security, cdk
- **Supersedes:** ADR-0044

## Context

ADR-0044 gave a hosted session one read path into the `prod` schema of pragma,
last-loop-lepin and banana-rush: `scripts/db-read.sh`, signing in to Aurora DSQL
as the SELECT-only role `ai_reader_prod` over the Postgres wire protocol on port
5432. Its premise was that a session on claude.ai/code can open that port. It
cannot: the sandbox's egress refuses 5432, so the path is unreachable from the
only place the authorised identity exists. The identity is the IAM user
`AI-Dev-ReadOnly`, whose access keys live in the hosted project environment; a
local session signs in as a different principal and is refused by DSQL at the
Postgres layer. Measured on 2026-10-27 and 2026-10-28: TCP 5432 is open from a
laptop, `borso-admin` reaches Postgres and is refused there because the role
mapping names only the IAM user, and the `ReadOnlyAIDev` SSO permission set is
refused at IAM before connecting. Aurora DSQL has no HTTP data API — the CLI
carries twelve control-plane commands and nothing that executes SQL — so there
is no managed alternative to the wire protocol.

A second force arrived with the first. ADR-0044's table blocklist and its
refusal of writes and locking reads live in
`scripts/database/read-only-query.utils.ts`, a client-side script that the
calling session runs itself. The database role is the real backstop; the script
is a convenience that a caller can simply not call. That was acceptable while
the script was the only way to reach the port. Once the transport moves, the
question of where the rule is enforced is open, and the answer should not be
re-chosen by accident.

## Decision

**A reader Lambda per application, invoked through the AWS Lambda API.**
`db-read.sh` calls `aws lambda invoke` against a function named by each app's
prod stack; the function holds the read-only assessment and connects to its own
cluster as `ai_reader_prod`. The transport is `lambda.eu-west-3.amazonaws.com`,
which a hosted session already reaches for SSM and CloudFormation, so no
hostname is published and no shared secret exists: the caller is authenticated
by SigV4 as the IAM principal it already is. It wins over the two HTTPS endpoint
shapes on the auth boundary and on exposed surface without losing anywhere, and
over doing nothing because it moves the guard to a place the caller cannot skip.

## Consequences

- `+` A hosted session can read production, which has never once worked.
- `+` The blocklist and the write refusal run where the caller cannot bypass
  them, so the script stops being the only thing between an agent and a
  credential table.
- `-` `Explicit-write-deny` loses its blanket `lambda:Invoke*`. It becomes a
  `NotResource` pair naming the three functions, the same shape ADR-0044 applied
  to `dsql:*`. Every narrowing of that policy is a door in the document that
  bounds everything else the user can do, and the policy is unreadable from any
  session because `iam:GetUserPolicy` is inside it.
- `-` Changing the refusal rules becomes a production deploy. Editing a regex in
  `read-only-query.utils.ts` was a commit; editing it in the Lambda is a release
  of three applications. The rule gets safer and slower at the same time.
- `-` `db-read.sh` stops working against a stack whose production deploy has not
  run since this decision landed. It needs the `AgentReaderFunctionName` output
  to exist, and refuses on its absence rather than falling back — which is
  deliberate, because the fallback would be the unguarded path.
- `~` The `dsql:DbConnect` allow stays on `AI-Dev-ReadOnly`, so a laptop holding
  that access key can still reach the cluster as `ai_reader_prod` with `psql` by
  hand. Nothing in this repository drives that path any more: the assessment
  moved into the function, so the break-glass connection carries the database's
  own `SELECT` grant and nothing else. That grant, not a script, is what bounds
  it.

## Alternatives considered

### Option A — Reader Lambda invoked through the AWS API (chosen)

- **Summary:** a `DsqlAgentReader` construct in `infra/cdk`, instantiated by each
  full-stack app's prod stack beside its `DsqlSchema`. The function receives
  `{ query }`, runs the shared read-only assessment, opens a `BEGIN READ ONLY`
  transaction as `ai_reader_prod` on its own cluster and returns capped rows.
  `db-read.sh` keeps its interface and becomes a caller of `aws lambda invoke`.
- **Strengths:**
  - Auth boundary: SigV4 against an IAM principal, by construction. There is no
    credential whose theft grants access on its own.
  - Exposed surface: nothing is published. The function has no URL and is
    reachable only through an AWS API call the caller must already be entitled
    to make.
  - Guard location: the assessment runs inside the function, so a caller that
    skips `db-read.sh` gains nothing.
  - Reachability: the hosted session already calls `ssm get-parameter` and
    `cloudformation get-template` against the same API host.
- **Costs:**
  - One `lambda:InvokeFunction` allow on three named ARNs, and the removal of
    `lambda:Invoke*` from the blanket deny.
  - Three function instances to deploy, each with its DSQL grant and its synth
    tests.
  - A rule change now ships through a prod deploy rather than a commit.
- **Rationale:** it is the only option that wins both high-weight security
  criteria without publishing anything. The per-app instantiation is deliberate
  and is argued below.

### Option B — Lambda Function URL with `AWS_IAM` auth (rejected)

- **Summary:** each app exposes a Function URL whose `authType` is `AWS_IAM`;
  `db-read.sh` signs the POST with SigV4 and sends it over ordinary HTTPS.
- **Strengths:**
  - The same IAM boundary as A: an unsigned request is refused by Lambda before
    the handler runs.
  - An ordinary POST, so any client that can sign works, not only a holder of
    the AWS CLI.
- **Costs:**
  - One publicly resolvable hostname per application. It refuses unsigned
    callers, but it exists, answers, and is one more thing to watch.
  - A signer declared in `db-read.sh`. `@smithy/signature-v4` is already in the
    lockfile transitively, so this is a declaration rather than a new package —
    a smaller cost than it first appeared.
- **Rejection rationale:** it loses only on exposed surface, a `medium`
  criterion, and ties A everywhere else. That is enough here because A pays
  nothing to avoid the loss. It would win if the endpoint ever needed a caller
  that holds signing credentials but not the AWS CLI — a browser, a webhook, a
  third party. Nothing here does.

### Option C — `POST /api/agent/sql` guarded by a bearer token (rejected)

- **Summary:** the shape talos runs today under ADR-0039. The route joins each
  app's existing Hono API; a middleware compares an `Authorization` header
  against a secret in Secrets Manager.
- **Strengths:**
  - In production since ADR-0039, with its middleware, its zod body schema and
    its server-side assessment already written and tested.
  - No new infrastructure: the API, the Lambda and the DB access all exist.
- **Costs:**
  - A shared secret per application to create, distribute, rotate and revoke,
    which outlives the route it guards.
  - Three public routes that speak to production.
- **Rejection rationale:** it loses the auth-boundary criterion, weighted
  `high`. Stealing one string is enough to read production, where A and B
  require an AWS identity. Reusing the talos shape is a real pull — *Reuse
  before you build* — but the thing worth reusing is its server-side assessment,
  not its authentication, and A reuses that just as well.

### Option D — Do nothing (rejected)

- **Summary:** accept that a sandbox cannot open 5432. `db-read.sh` stays a
  Postgres client, usable only from a local session holding the
  `AI-Dev-ReadOnly` access key, and ADR-0044 narrows from "a hosted session" to
  "a laptop with that key in a profile".
- **Strengths:**
  - No new surface, no new secret, no new code, no policy change.
  - It works today: the key `AKIA3AKAVXXFO6D4I7MM` is active, and a local
    profile on it would make the existing path run unchanged.
- **Costs:**
  - The reason ADR-0044 existed was the hosted session. Without it the feature
    answers a question nobody has: a local session already has `borso-admin` and
    can read anything.
  - The guard stays in a script the caller may skip, and the two existing
    implementations of the rule — `memory-guards.core.ts` and
    `read-only-query.utils.ts` — stay two.
- **Rejection rationale:** it loses both the guard-location and the
  single-implementation criteria, and keeps the feature's stated audience
  locked out. It would win if the sandbox's egress policy were expected to open,
  which is Anthropic's to decide and not something this repository can observe —
  so the option is recorded as a live fallback rather than a plan.

## Why one function per application, not one in `infra/shared`

The implementation is shared and the instance is not, which is how every other
piece of this repository's infrastructure is built: `DsqlSchema` and `LambdaApi`
are single constructs in `infra/cdk` instantiated per app. Three reasons make
the instance per-app rather than central.

- **Blast radius.** DSQL clusters are per-app and owned by each app's prod
  stack. One function reaching all three would need `DbConnect` on all three
  clusters and a role in each schema, so a single compromised function reads
  every production database. Three functions each read one.
- **The blocklist is per-app and already lives next to its schema.** pragma's
  `READER_TABLE_BLOCKLIST` is composed in `apps/pragma/cdk/lib/stack.ts` from
  the same lists the preview-seeding logic reads, and
  `scripts/check-coupled-lists.sh` gates that agreement. A central function
  would need those lists shipped to it, re-centralising something that is
  correct precisely because it sits beside the tables it names.
- **`infra/shared` never deploys automatically.** `shared-deploy.yml` is
  `workflow_dispatch` only, deliberately, so a stray push cannot rewrite OIDC
  providers or deploy roles. Putting the reader there would make the guard
  harder to update than the application it guards: a blocklist change would
  wait on a hand-triggered dispatch while the schema change it accompanies
  deploys on merge.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Strength of the auth boundary | high | The endpoint reads production. What an attacker must hold to impersonate the caller is the only question that matters. |
| Where the read-only guard runs | high | Today it is a client-side script; a caller that does not run it reads everything the SELECT role can see. |
| One implementation of the rule | high | `memory-guards.core.ts` and `read-only-query.utils.ts` are already two writings of the same idea; three more and they diverge silently. |
| Secret lifecycle cost | medium | A shared secret outlives the route it guards, and rotation and revocation are manual here. |
| Exposed Internet surface | medium | Every published hostname that speaks to production is a door that did not exist. |
| Reachable from the sandbox | medium | A binary filter: an option that cannot be called from a hosted session answers nothing. |

|  | A — invoked Lambda | B — Function URL, IAM | C — bearer token | D — do nothing |
|---|---|---|---|---|
| Auth boundary | ✓ SigV4, no credential whose theft alone suffices | ✓ same IAM identity | ✗ one stolen string is enough | ✓ nothing exposed |
| Guard location | ✓ inside the function | ✓ inside the function | ✓ inside the API | ✗ client-side script |
| One implementation | ✓ one construct, three instances | ✓ one construct, three instances | ✓ one middleware, three mounts | ✗ the two existing writings stay |
| Secret lifecycle | ✓ none | ✓ none | ✗ one secret per app, rotated by hand | ✓ none |
| Exposed surface | ✓ no published hostname | ✗ one public hostname per app | ✗ three public routes | ✓ none |
| Sandbox reachability | ✓ the API host already used for SSM | ~ ordinary 443, unproven | ~ ordinary 443, unproven | ✗ this is the problem |

The "one implementation" row does not separate A, B and C: it depends on the
refactor of the guard, not on the transport. It is kept because it is what
defeats D, and saying so is better than inventing a difference that is not
there.

## Implementation pointers

- Supersedes: [ADR-0044](./0044-read-only-production-database-access-for-agents.md) — its principals, its role and its blocklists stand; only its transport is replaced.
- Related: [ADR-0039](./0039-talos-memory-in-the-database.md) — talos keeps its own `POST /api/agent/sql`, and its `POST /api/agent/changes` write path through `applyChanges` is untouched by this decision.
- Files the decision lands in: `infra/cdk/src/constructs/`, `apps/{pragma,last-loop-lepin,banana-rush}/cdk/lib/stack.ts`, `scripts/db-read.sh`, `scripts/database/read-only-query.utils.ts`.
- Policy change: `Explicit-write-deny` on `AI-Dev-ReadOnly`, documented in [`docs/aws-setup.md`](../aws-setup.md) §12.7.
- Files the decision landed in: `infra/cdk/src/constructs/dsql-agent-reader.ts`, `infra/cdk/src/internal/agent-reader/{index.ts,read-only-query.utils.ts,principal.utils.ts}`, `infra/cdk/src/constructs/{dsql-schema.ts,previewable-app.ts}`, `scripts/database/{db-read.ts,read-target.utils.ts,reader-invocation.utils.ts}`, `scripts/db-read.sh`, `docs/aws-setup.md` §12.7.
- The assessment moved rather than being rewritten: `scripts/database/read-only-query.utils.ts` is now `infra/cdk/src/internal/agent-reader/read-only-query.utils.ts`, same code, same tests, bundled into the function. The client keeps only what it must decide before a call it cannot make — the application, the stage and the function to invoke.
- `DsqlSchema.grantReaderConnect` maps the function's execution role into `ai_reader_prod` beside the IAM user, through the same `Lazy.list` mechanism `grantConnect` already used for the API role.
- The three applications needed no stack change: `PreviewableApp` creates the reader whenever its schema provisions a reader role, so the three existing `readerPrincipalArns` call sites are what turns it on.
