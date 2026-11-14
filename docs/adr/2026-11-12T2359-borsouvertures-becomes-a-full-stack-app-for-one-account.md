# ADR-2026-11-12T2359: borsouvertures becomes a full-stack app that serves one account

- **Status:** proposed. Decided by the agent on 2026-11-12, delegated by the operator, to ratify at pull-request review.
- **Date:** 2026-11-12
- **Deciders:** the agent, delegated by Hugo Borsoni
- **Tags:** opening-trainer, borsouvertures, cdk, data

## Context

borsouvertures is a static React PWA. Its CDK entry point builds one `StaticSite` and nothing else (read in `apps/borsouvertures/bin/app.ts`). The earlier spec wrote "No DSQL, no auth" and kept everything in one localStorage record (read in `docs/features/borsouvertures/learn-by-tree/spec/spec.md`, question 5). That spec also deferred spaced repetition because it needed persistence the app did not have.

The opening trainer needs that persistence. The operator decided on 2026-11-12 that his progress syncs across his devices, and that every other reader keeps progress in the browser only (read in the opening-trainer spec, "Perspectives confronted"). Sync is his decision and the spec never cuts it. The open question is what carries the sync, and how much of the app starts to depend on a server.

Two constraints close doors. Apps do not import each other, so nothing of pragma's API can be shared at run time. The app must keep working offline and for a reader with no account, so no screen may wait on the API.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | The operator's reviews must follow him from phone to laptop. A reader without an account must see no difference. | The visual-validation row "a review made in one browser profile shows in a second after sign-in", and every screen opened signed out |
| Progress syncs across the operator's devices | operator | high | It is the operator's decision 2026-11-12 and the reason the feature exists. | Input metric (b) of the spec |
| The app works with no server | author | high | It is an offline PWA, and readers without an account are the majority of its audience (inferred, the site is public). | Every review path runs with the network off |
| Reuse of what the repository already runs | author | high | The root `CLAUDE.md` says reuse first. A second persistence stack would be operated by one person. | Count of new shared constructs |
| New things to operate | author | medium | Each new stack adds deploy steps and operator-backlog rows. | Rows added to `docs/operator-backlog.md` |

## Decision

**borsouvertures gains `api/`, `cdk/` and `domain/`, and one Aurora DSQL schema that holds one account.** The stack moves from `StaticSite` to `PreviewableApp`, the same shape as `pragma`, `last-loop-lepin` and `banana-rush`. The API has two jobs, sign-in and the exchange of review events. It serves no content and no screen depends on it. This reverses the "No DSQL, no auth" line of the learn-by-tree spec. That spec is a dated record and is not edited. This record is the superseding note.

It would be worth reversing if the operator stops reviewing on a second device, or if the API is still used by one person when a second account is asked for. In the second case the one-account schema has to grow an account column, which DSQL can add but cannot constrain (read in ADR-2026-09-14T1903).

## Consequences

- `+` The operator's progress is on every device he signs in on.
- `+` Nothing new is built in `infra/cdk`. `PreviewableApp`, `LambdaApi` and `DsqlSchema` already exist (measured, `ls infra/cdk/src/constructs`).
- `+` Retention becomes readable from a table with `scripts/db-read.sh`, once the reader is granted.
- `-` A merge to `main` now runs a database migration for this app, and each preview creates a schema. The extra preview deploy time is unknown, it was not measured.
- `-` The app gains secret material and a public write route, where it had none. ADR-2026-11-13T0002 covers who may sign in.
- `-` Three operator-backlog rows exist only because of this choice (the reader grant, the Sentry DSN and the credential).
- `~` `VOCABULARY.md` says the app has no server and no account. That paragraph changes with the first API commit.
- `~` The table has no account column. One account is a property of the schema, not of a filter.

## Alternatives considered

### Option A — A full-stack app on the shared constructs, one DSQL schema (chosen)

- **Raised by:** operator (sync and a back end), author (the shape)
- **Summary:** `api/` is Hono on Lambda, `cdk/` builds a `PreviewableApp`, `domain/` holds the review-event rules both sides read.
- **Strengths:**
  - meets the sync criterion with constructs that are already gated at 100% coverage.
  - an idle DSQL cluster costs close to nothing, because DSQL bills per DPU and per GB-month (read in `docs/knowledge/dsql-serverless-pricing-vs-aurora.md`). The price itself is not restated here.
- **Costs:**
  - one more cluster stack, one Lambda, one schema per preview.
  - the blueprints for controller, service and repository now apply to this app.
- **Rationale:** it is the only option that meets both high criteria raised by the operator without a new construct.

### Option B — Stay static, progress stays on each device (rejected)

- **Raised by:** author
- **Summary:** Not doing it. The scheduler and the event log ship, and each browser keeps its own log. A file export and import could move a log by hand.
- **Strengths:** no server, no secret, no new operator task. Slices 1 to 5 of the spec ship unchanged.
- **Costs:** the phone and the laptop schedule the same card independently, so the operator reviews it twice or misses it.
- **Rejection rationale:** it fails the sync criterion, which the operator set. It is still the order of work. Sync is slice 6, and the app is usable alone before it.

### Option C — A DynamoDB table behind a Lambda (rejected)

- **Raised by:** author
- **Summary:** One table keyed by event id, no SQL schema, no migration runner.
- **Strengths:** no migration step. A key-value write fits an append-only log.
- **Costs:** no shared construct, no preview clone, no agent reader and no local stand-in exist for it (measured, `infra/cdk/src/constructs` holds none). Each would be new code under the 100% coverage gate.
- **Rejection rationale:** it loses on reuse. It would win only if DSQL's migration step became the main cost of this app, which is not observed.

## Scores

|  | A, full-stack on DSQL | B, stay static | C, DynamoDB |
|---|---|---|---|
| Changes the app for its users | ✓ progress follows the operator | ✗ two devices, two schedules | ✓ same as A |
| Progress syncs | ✓ | ✗ by hand at best | ✓ |
| Works with no server | ✓ the API is never on the review path | ✓ | ✓ same as A |
| Reuse | ✓ three existing constructs | ✓ nothing added | ✗ no construct, reader or local stand-in |
| New things to operate | ✗ a cluster, a Lambda, three backlog rows | ✓ none | ✗ the same, plus new constructs |

## Implementation pointers

- Spec: [`docs/features/borsouvertures/opening-trainer/spec/spec.md`](../features/borsouvertures/opening-trainer/spec/spec.md), "Architectural choices" and "Files to change"
- Plan: not written yet
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/borsouvertures/bin/app.ts`, `apps/borsouvertures/cdk/lib/stack.ts` (new), `apps/borsouvertures/api/` (new), `apps/borsouvertures/domain/` (new), `.github/path-filters.yml`
- Related ADRs: ADR-2026-08-13T0026 (the `domain/` folder this app copies). It reverses a line of the learn-by-tree spec, which no ADR recorded.
