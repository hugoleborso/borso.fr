---
agent: technical-validation-01
stage: validate
feature: pragma/audience-song-voting
spec: docs/features/pragma/audience-song-voting/spec/spec.md
plan: docs/features/pragma/audience-song-voting/plan/plan.md
branch: claude/concert-sound-voting-c7r8w7
head: c8d33127a5c56484f119199118d2cfb03bdbac25
base: origin/main
verdict: FAIL
status: failed
date: 2026-08-26
next:
  kind: fix
  scope: 'apps/pragma — 4 code rows and 4 test rows'
adr-trigger: none
gates:
  eslint: 'pass — 68 changed source files, 0 errors, 0 warnings'
  prettier: 'pass — changed set minus *.md and the .sql migration'
  typecheck: pass
  build: pass
  test: 'pass — 140 files, 1299 tests, both projects'
  coverage: 'pass — 100% statements, branches, functions and lines, per file'
  knip: pass
  blueprint-indexing: pass
  architecture-graph: pass
  convention-drift: pass
  vocabulary-paths: pass
  migration-dsql-compat: pass
failing:
  - 'A16 — the band panel is on the concert page only; the spec and the plan both name the setlist editor as the second entry point'
  - 'A18 — a ballot token the server refuses is never re-minted; forgetBallotToken has no production caller'
  - 'A23 — a duplicate vote is refused as round-closed, the reason the spec attaches an alert threshold to'
  - 'A25 — ballotCount and capacity are computed and returned and the band panel renders neither'
  - 'D2 — the retraction tie test removes no vote; it re-pins D1 under different timestamps'
  - 'D7 — the audience-choice pool test is byte-for-byte the empty-manual-list test; the kind predicate is unexercised'
  - 'D8 — acceptSuggestion is untested; the mbid-already-in-catalogue resolution has no test'
  - 'D9 — the song-already-planned 409 has no test'
unverifiable:
  - 'U1 — the seven named analytics events have no substrate in the application and no row in the plan'
  - 'U2 — whether the public page reaches /api/audience in the preview stage; prod is same-origin, preview is cross-origin'
artifacts:
  - docs/features/pragma/audience-song-voting/validation/technical-validation-2026-08-26-2024.md
---

# Verdict — technical validation, audience song voting

**FAIL, 8 rows.** Full report:
[`../../../validation/technical-validation-2026-08-26-2024.md`](../../../validation/technical-validation-2026-08-26-2024.md).

Every gate the plan lists ran on this checkout and every one is green, including the full
suite at 100% per-file coverage over 1299 tests. The failures are not gate failures.

The two rules the spec asked for a specific pass on both hold. No mutation carrying `onMutate`
invalidates or refetches anywhere in the diff, and the vote and retraction reconcile from
their own responses with an `onError` rollback. No source file in the diff contains
`useEffect`; the countdown derives during render from a one-second external store read through
`useSyncExternalStore`, and a test pins that the interval is cleared on unmount. Round
settlement is idempotent and well defended: a conditional `UPDATE … WHERE settled_at IS NULL`
claims the round, only the claimer appends, the claim and the append share one transaction,
and it is pinned both purely and by a back-e2e test firing two concurrent state reads past the
close and asserting one setlist entry.

Four code rows fail. The band panel reaches only the concert page, not the setlist editor the
spec and the plan both name. A ballot token the server refuses is never replaced — the front
end caches it forever and `forgetBallotToken` has no caller outside its own test, so the spec's
"a fresh one is minted" does not happen. A duplicate vote is refused as `round-closed`, which
is the reason the spec's zero-defect strategy alerts on to detect a wrong countdown, so
ordinary double taps poison that signal. And `ballotCount` and `capacity` are computed,
returned over the wire and asserted in a test, then rendered nowhere — the one input metric
the spec ties to its output metric never reaches the band.

Four test rows fail, and two of them are the reason the green suite is not reassuring. The
retraction tie case removes no vote: it passes four votes where the previous test passed four
votes with one timestamp moved, so it re-pins the tie-break rule rather than the retraction.
The audience-choice pool case is byte-for-byte the empty-manual-list case already asserted
twelve lines above it; the rule it claims to guard lives in a repository predicate that no test
reaches, and no test puts a manual and an audience-choice setlist on the same concert. Both are
the exact detections the plan's risk register nominated. Separately, `acceptSuggestion` is
entirely unexercised — the only request that reaches the route asserts `not 401` and would pass
on a 500 — so neither the `mbid` resolution nor the `song-already-planned` refusal has a test.

Any claim about routing or auth in this feature has to name its stage. The ungated-access
property is proven at the Hono composition root, which is stage-independent: a back-e2e test
drives all six public routes and both gated routes through `createApp()` with no cookie. What
is stage-dependent is how a browser reaches the API. In **prod** `VITE_API_BASE` is unset and
the client resolves to `/`, so the audience calls are same-origin with no preflight. In
**preview** the workflow bakes a separate API host, so the new `x-ballot-token` header makes
every write preflighted and `credentials: 'include'` meets a bare `cors()` that answers
`Access-Control-Allow-Origin: *` with no `Access-Control-Allow-Credentials`. That is
pre-existing configuration the diff does not touch and it was not verified here. Visual
validation must drive the public page on the preview URL rather than on `pnpm dev`, or it
stays unknown.
