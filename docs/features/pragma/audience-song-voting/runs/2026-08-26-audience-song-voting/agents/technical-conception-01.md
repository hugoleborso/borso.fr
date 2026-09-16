---
status: done
summary: Wrote the engineering plan for the audience song-voting feature. Every Q.O.D. row, every API route, every database change, every edge and error case and every out-of-scope item maps to a file path with a self-check, and the rows whose decisions come from ADR-0015 or ADR-0016 link them. The three placements the brief singled out are pinned precisely: the public and gated audience routers, whose mount interaction I measured in this workspace rather than assumed; lazy idempotent settlement, claimed with a conditional update and committed in one transaction with the setlist append; and the nullable-forever setlist_sheet.kind column with its narrowing moved into setlists.core.ts. Fifteen risks carry a detection path each. Six engineering decisions the spec left open were taken and recorded rather than escalated, so nothing blocks implementation.
artifacts:
  - docs/features/pragma/audience-song-voting/plan/plan.md
  - docs/features/pragma/audience-song-voting/runs/2026-08-26-audience-song-voting/agents/technical-conception-01.md
next:
  kind: validate
---

# Technical conception verdict, audience song voting

## What was produced

[`docs/features/pragma/audience-song-voting/plan/plan.md`](../../../plan/plan.md), following [the technical-conception standard](../../../../../../../.claude/skills/technical-conception/standard.md). It carries the five required sections plus a mount-time contract, a workspace inventory read from the tree, and a pattern coherence pass.

## The inventory contradicted the brief in one place

The brief and the orchestrator's gate command name the workspace `@borso/pragma`. `apps/pragma/package.json` names it `@borso-app/pragma`, and `pnpm --filter @borso/pragma run test` answers `No projects matched the filters`. Every gate in the plan uses the real name.

The same reading found that `run test` is the `back-e2e` project alone. The pure and component tests are `run test:core`, and the per-file 100% thresholds only apply under `run test:coverage`. The plan lists all three as separate gates, because a composite gate naming only `run test` would leave every new pure file uncovered and still report green.

## The three placements the brief singled out

**(a) The two audience routers.** I did not assume how Hono composes two sub-routers mounted at one prefix. I ran a probe against the `hono` installed in this workspace and measured three cases:

- public router mounted first, gated router second, both at `/api/audience`: the public `GET` answers 200 and the gated `POST` answers 401. Correct.
- gated router mounted first, public second, both at `/api/audience`: the public `GET` answers **401**. A gated sub-router carrying `.use('*')` registers `/api/audience/*` in the parent and swallows every public route mounted after it.
- the two at different prefixes: the public route answers 200 either way.

So under the spec's URL shape the two routers genuinely share a prefix, and mount order is load-bearing while nothing in the router type records it. The plan therefore does two things rather than one. The gated router applies `requireSharedPasswordSession` per route instead of through `.use('*')`, which removes the hazard structurally, and the composition root still mounts public first. The pinning test drives all six public routes through `createApp()` with no session cookie, because the defect only exists once both routers are mounted together, so a test over the routers in isolation would pass while the surface was dead.

This also describes existing code. `/api/admin/set-password` is public and `/api/admin/rotate-password` is gated with `.use('*')`, and today the first is reachable only because `app.ts` happens to mount the bootstrap router first. That is a latent trap in the current tree, not something this feature introduces. I logged it to the kaizen journal rather than widening this plan's scope.

**(b) Lazy, idempotent settlement.** `settleRound` is pure, takes `now` as a parameter, and returns a four-arm union with an `already-settled` arm. The idempotence that matters is not in the pure function though, it is in the write: two concurrent reads both see `settled_at IS NULL`, so the claim is a conditional `UPDATE ... WHERE settled_at IS NULL` and only the caller that claimed the row appends the setlist entry. The claim and the append share one transaction lent out by the setlists slice, following `repository-owned-transaction`, so a claim cannot commit without its entry. On Aurora DSQL the loser of that race aborts at commit with a serialization failure, which the service converts into a re-read rather than a 500. Three risk rows cover the three ways this can still go wrong, each with a detection path.

**(c) `setlist_sheet.kind`.** Added by `ALTER TABLE ... ADD COLUMN "kind" text;` with no constraint, so it is nullable forever. The Drizzle column carries neither `.notNull()` nor `.default()`, which is what stops a future `drizzle-kit generate` from emitting a statement DSQL refuses. `scripts/check-migration-sql-dsql-compat.sh` already rejects `ADD COLUMN ... NOT NULL` and both directions of `ALTER COLUMN ... SET/DROP NOT NULL`, and pre-commit runs it on any staged migration, so this is gated rather than remembered.

One correction to the spec's file list came out of this. The spec puts `resolveSetlistKind` in `setlists.schema.ts`, but `borso/pure-functions-live-in-core-files` treats only `.core.ts` and `.utils.ts` as pure files, so a branching pure function there is a lint error. The narrowing goes into the existing `setlists.core.ts` and the repository row mapper calls it, following `repository-row-mapper`.

## Six decisions taken rather than escalated

The plan lists them in their own section. The two worth naming here are that the short `/vote` address needs an endpoint the spec's API table does not carry, so `GET /api/audience/live` is added to serve behaviour that was already ratified, and that ADR-0015's change to the search return type is shared with the existing gated `/api/songs/search`, so its controller, service, query module and search organism join the change set even though the spec's file list omits them.

None of the six is a product decision or an architecture decision, so none is an ADR trigger, and none is left as an open question. The plan's open-questions section is empty on purpose: an item there is a hard block on `/implementation`, and there is nothing here a human needs to answer.

## ADR handling

ADR-0015 and ADR-0016 are ratified and committed on this branch. They are not triggers. Every plan row whose decision descends from one of them links it, which is nine rows for ADR-0015 and two for ADR-0016.

## Gates

The plan's pre-flight list has nineteen entries. It names `pnpm exec eslint` and `pnpm exec prettier --check`, never `biome check`, because ADR-0007 removed that binary from the repository. Two entries are `human:` gates: re-reading the `adapter-rate-limited-fetch` blueprint description against the adapter it now misdescribes, and the visual validation run, which must drive the public page in a browser context carrying no session cookie and must wait the real thirty seconds.

## Friction logged

Three entries under the `plan` label: the workspace-name mismatch, the technical-conception template still prescribing `pnpm exec biome lint` after ADR-0007, and the Hono mount-order trap.
