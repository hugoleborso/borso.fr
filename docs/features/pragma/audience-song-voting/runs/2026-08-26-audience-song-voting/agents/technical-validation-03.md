---
agent: technical-validation-03
stage: validate
feature: pragma/audience-song-voting
spec: docs/features/pragma/audience-song-voting/spec/spec.md
plan: docs/features/pragma/audience-song-voting/plan/plan.md
branch: claude/concert-sound-voting-c7r8w7
head: 8f8a148214b2e3371a1078d61b6c77c9cb7d498a
base: origin/main at 231bfc7b7600cbd8f0de18c93656249067a6803f
verdict: FAIL
status: failed
date: 2026-08-26
next:
  kind: fix
  scope: 'infra/cdk — the HTTP API CORS allow-list does not carry the request header the audience writes send'
adr-trigger: none
gates:
  install: 'pass — pnpm install --frozen-lockfile'
  eslint: 'pass — 75 changed source files, --max-warnings 0, 0 problems'
  prettier: 'pass — changed files, markdown and the .sql migration excluded'
  typecheck: pass
  build: 'pass — built in 4.02 s'
  test: 'pass — 140 files, 1323 tests, both projects, 185 s'
  coverage: 'pass — perFile 100%: statements 1792/1792, branches 897/897, functions 446/446, lines 1524/1524'
  knip: pass
  blueprint-indexing: 'pass — 1082 files, 164 blueprints, 1018 followers'
  architecture-graph: 'pass — pragma 296 files across 15 slices'
  convention-drift: pass
  enforcement-ledger: pass
  vocabulary-paths: pass
  migration-dsql-compat: pass
  no-comments-in-styles-and-markup: pass
  pure-modules-have-callers: pass
failing:
  - 'E1 — the three public audience writes send the custom header x-ballot-token, and the HTTP API CORS allow-list at infra/cdk/src/constructs/lambda-api.ts:132 carries content-type and authorization only, so the browser preflight blocks them. Holds in prod and in local dev, both same-origin; breaks in preview, the stage the PR deploys'
unverifiable:
  - 'U1 — DSQL behaviour on the two concurrent paths (the settlement claim, a second POST /rounds). The back-e2e suite runs on local Postgres, which blocks where DSQL aborts at commit; no cluster is reachable from this session'
  - 'U2 — the seven named analytics events still have no emitter anywhere in apps/pragma and no row in the plan. Spec-versus-plan gap, carried forward from round two'
  - 'U3 — every rendered assertion (the counter moving, the countdown reaching zero, the winner appearing). /visual-validation owns it'
artifacts:
  - docs/features/pragma/audience-song-voting/validation/technical-validation-2026-08-26-2231.md
---

# Verdict — technical validation, audience song voting, round three

**FAIL, one row.** Full report:
[`../../../validation/technical-validation-2026-08-26-2231.md`](../../../validation/technical-validation-2026-08-26-2231.md).

The four rows round two failed on are all genuinely closed, and I re-checked each
against the code rather than against the fix report. The suggestion route now
carries the open-round gate, the session-exists check and the session-kind check,
and refuses a practice and an unknown session with 422 and a concert at rest with
409. The public writes share one rate-limiter instance ahead of the ballot gate.
The round history reads the clock through `Intl.DateTimeFormat` on the viewer's
own zone rather than slicing an ISO string, pinned by a test that compares against
the local reading. And the round-closed refusal now has two tests, one on a round
nobody opened and one on a round that genuinely settled.

**Sixteen gates are green on this sha**, including the full suite at 1323 tests
and 100% per-file coverage on all four counters.

**The two rules the spec singled out both hold.** No mutation carrying `onMutate`
invalidates or refetches, directly or through a helper; `useCastVote` and
`useRetractVote` snapshot, write optimistically and roll back, and the two writes
that reconcile do it from their own response. There is no `useEffect` anywhere in
`apps/pragma/site/src` — not merely none in the diff — and the countdown derives
during render from `closesAt` and a one-second store read through
`useSyncExternalStore`, with the interval owned by the store.

**The three properties the brief named are each pinned by a discriminating test.**
Settlement is idempotent in the pure function, in a single conditional `UPDATE …
WHERE settled_at IS NULL RETURNING id`, and in one transaction the claim shares
with the append; a back-e2e row waits the real thirty seconds, fires two
concurrent state reads and asserts exactly one setlist entry. The tie test earns
its keep because the identifier fallback would pick the other song, so it tells
the rule from the fallback beneath it, and the retraction sibling pins that the
standing is recomputed from surviving rows. The audience-choice case is pinned at
the composition root, which is the only level that can see it: `selectPool`
receives an already-filtered manual set, so the test puts a manual setlist and an
audience-choice setlist on one concert and asserts only the first excludes.

**What fails is a routing property, and it is stage-scoped.** The three public
writes send `x-ballot-token`, the first custom request header this front end
sends to its own API. A custom header makes the browser preflight, and the HTTP
API answers that preflight from `lambda-api.ts:132`, whose allow-list is
`['content-type', 'authorization']`. Same-origin `/api` is added to the
distribution only when `isProductionStage(stage)`
(`stage-wiring.utils.ts:23`), and `preview.yml:103` bakes a separate API host, so
**in `prod` and in local `dev` nothing is cross-origin and the feature works,
while in `preview` — the stage the pull request deploys and the stage the visual
validator would drive — casting, retracting and suggesting cannot leave the
browser.** Every test here passes because they all drive the Hono app in-process,
where no browser enforces CORS, and nothing pins the allow-list:
`grep -rn "allowHeaders" infra/cdk/test/` returns nothing.

The remedy is one line in `infra/cdk/src/constructs/lambda-api.ts` plus the
coverage suite and template snapshot that workspace gates.
