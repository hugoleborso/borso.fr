---
agent: technical-validation-04
stage: validate
feature: pragma/audience-song-voting
spec: docs/features/pragma/audience-song-voting/spec/spec.md
plan: docs/features/pragma/audience-song-voting/plan/plan.md
branch: claude/concert-sound-voting-c7r8w7
head: 4154470e8a8c62735429bd76c81eaed29e22f7d7
base: origin/main at 231bfc7b7600cbd8f0de18c93656249067a6803f
verdict: PASS_EXCEPT_UNVERIFIABLE
status: done
date: 2026-08-26
adr-trigger: none
gates:
  install: 'pass — pnpm install --frozen-lockfile, already up to date'
  eslint: 'pass — 81 changed source files, --max-warnings 0, 0 problems'
  prettier: 'pass — changed files, markdown and the .sql migration excluded'
  typecheck: pass
  build: 'pass — built in 3.90 s'
  test-core: 'pass — 125 files, 1221 tests'
  test-back-e2e: 'pass — 15 files, 102 tests, local Postgres, 107 s'
  test-coverage: 'pass — 140 files, 1323 tests, perFile 100%: statements 1792/1792, branches 897/897, functions 446/446, lines 1524/1524'
  infra-cdk-coverage: 'pass — 21 files, 337 tests, 100% on all four counters'
  shared-infra: 'pass — 35 tests; the committed borso-shared template snapshot did not move, so no shared-deploy dispatch is owed'
  knip: pass
  blueprint-indexing: 'pass — 1082 files, 164 blueprints, 1018 followers'
  architecture-graph: 'pass — pragma 296 files across 15 slices'
  convention-drift: 'pass — no question gained a new answer'
  enforcement-ledger: 'pass — every standard names a mechanism that exists and runs'
  vocabulary-paths: pass
  migration-dsql-compat: pass
  no-comments-in-styles-and-markup: pass
  pure-modules-have-callers: pass
  non-module-scripts: pass
failing: []
unverifiable:
  - 'U1 — two genuinely simultaneous POST /rounds, and what DSQL does to the settlement claim''s loser. The sequential refusal is implemented and tested; the plan additionally promised a serialization-failure catch on both paths and a Promise.all back-e2e, and neither exists. What such a catch would have to handle is itself undecidable from here, since voting_round carries no unique constraint on an open round. Local Postgres blocks where DSQL aborts at commit, and no cluster is reachable from this session'
  - 'U2 — the seven named analytics events still have no emitter anywhere in apps/pragma and no row in the plan. Spec-versus-plan gap, carried forward from rounds two and three'
artifacts:
  - docs/features/pragma/audience-song-voting/validation/technical-validation-2026-08-26-2304.md
---

# Verdict — technical validation, audience song voting, round four

**PASS_EXCEPT_UNVERIFIABLE, two rows.** Full report:
[`../../../validation/technical-validation-2026-08-26-2304.md`](../../../validation/technical-validation-2026-08-26-2304.md).

Round three's single failure is genuinely closed, and I checked it against
`infra/cdk/src/constructs/lambda-api.ts` rather than against the fix report. The
CORS allow-list is now
`['content-type', 'authorization', 'x-ballot-token']` (`lambda-api.ts:31,133`),
and `lambda-api.test.ts:76-85` pins that three-entry list against a preview origin
with `AllowCredentials: true`, so the literal that had no test now has one. The
`infra/cdk` suite still sits at 100% on all four counters.

**That property is stage-scoped, so its fix is named the same way.** Same-origin
`/api` is production-only here: `selectSameOriginApiDomainName` returns
`undefined` for every non-production stage (`stage-wiring.utils.ts:19-23`),
`deploy.yml` bakes no `VITE_API_BASE` so the prod bundle calls a relative `/`,
and `preview.yml:103` bakes a separate API host. The three public writes send a
custom request header, which forces a CORS preflight the HTTP API answers from
its own configuration. Before this sha those writes worked in `prod` and in local
`dev` and were blocked in `preview` and `integ`; on this sha they work in all
four.

**Twenty gates are green**, including the full suite at 1323 tests across both
projects and 100% per-file coverage, and thirty-six spec rows pass.

**The two rules the spec singled out both hold, across the whole front end rather
than across the diff.** `grep -rn "invalidateQueries\|refetchQueries"` over
`audience.queries.ts` and `audience.utils.ts` returns nothing, so neither
`useCastVote` nor `useRetractVote` — the two mutations carrying `onMutate` —
re-reads the row it just wrote, directly or through a helper; the two writes that
do reconcile carry no `onMutate` and settle from their own response. And
`grep -rn "useEffect" apps/pragma/site/src` returns nothing at all: the countdown
derives during render from `closesAt` and a one-second store read through
`useSyncExternalStore`, whose interval the store starts and clears, and the
short-address redirect is a rendered `<Navigate replace />` rather than a
`navigate()` in an effect.

**The three properties the brief named are each pinned by a test that
discriminates rather than merely passes.** Settlement is idempotent in the pure
function, in one conditional `UPDATE … WHERE settled_at IS NULL RETURNING id`,
and in one real transaction the claim shares with the append, with a back-e2e row
that waits the real thirty seconds, fires two `GET /state` concurrently and
asserts one setlist entry. The tie test chooses identifiers that make the `songId`
fallback pick the other song, so it tells the rule from the tiebreak beneath it,
and its retraction sibling flips the winner after removing the vote that had
decided it, asserting the surviving list is one shorter so it cannot pass on an
unchanged input. The audience-choice case cannot be pinned in `pool.core.test.ts`,
because `selectPool` receives an already-filtered manual set; it is pinned at the
composition root instead, where one concert carries a manual setlist and an
audience-choice setlist and the state read returns only the second's song.

What is left is disclosed rather than failed. U1 is a plan promise the code does
not carry, on a path whose consequence depends on vendor behaviour no test in
this repository can exercise and which needs two band members tapping one button
within milliseconds. U2 is a spec section the plan never gave a home. Neither is a
defect I observed.
