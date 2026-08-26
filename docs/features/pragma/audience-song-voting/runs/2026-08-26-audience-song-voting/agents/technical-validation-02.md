---
agent: technical-validation-02
stage: validate
feature: pragma/audience-song-voting
spec: docs/features/pragma/audience-song-voting/spec/spec.md
plan: docs/features/pragma/audience-song-voting/plan/plan.md
branch: claude/concert-sound-voting-c7r8w7
head: 449dc419b90472cd2eb049d6db430a78e908937f
base: origin/main
verdict: FAIL
status: failed
date: 2026-08-26
next:
  kind: fix
  scope: 'apps/pragma — the public suggestion route and one missing error-case test'
adr-trigger: none
gates:
  eslint: 'pass — 72 changed source files, --max-warnings 0, 0 problems'
  prettier: 'pass — 77 changed files, markdown and the .sql migration excluded'
  typecheck: pass
  build: pass
  test: 'pass — 140 files, 1314 tests, both projects'
  coverage: 'pass — 100% statements 1789/1789, branches 895/895, functions 445/445, lines 1522/1522, perFile'
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
  - 'A1 — POST /concerts/:sessionId/suggestions carries no open-round gate, no session-exists check and no session-kind check; probed 201 on a practice, on a concert at rest, and on a session id that does not exist'
  - 'A2 — the IP-hash limiter reaches GET /search only, so the one public write that creates catalogue rows has no budget at all'
  - 'A3 — selectRoundHistoryLines slices an ISO string, so the band panel labels every round with a UTC hour, two hours off in Paris'
  - 'D1 — the spec error case "a vote on a closed or already-settled round is refused with a conflict" has no test; no assertion in the suite names round-closed'
unverifiable:
  - 'U1 — whether the vote page reaches the API in the preview stage. Prod is same-origin and safe; preview bakes a separate API host and app.ts applies a bare cors() that answers Allow-Origin * with no Allow-Credentials against hc''s credentials: include. Pre-existing, not driven from here'
  - 'U2 — the seven named analytics events still have no emitter anywhere in apps/pragma and no row in the plan'
artifacts:
  - docs/features/pragma/audience-song-voting/validation/technical-validation-2026-08-26-2127.md
---

# Verdict — technical validation, audience song voting, round two

**FAIL, 4 rows.** Full report:
[`../../../validation/technical-validation-2026-08-26-2127.md`](../../../validation/technical-validation-2026-08-26-2127.md).

The eight rows the previous round failed on are all genuinely closed, and I
re-checked each rather than taking the fix report's word for it. Every gate is
green on this sha, including the full suite at 1314 tests and 100% per-file
coverage on all four counters, plus knip, the four repository generators in
`--check` mode and the four shell gates.

**The five passes the brief asked for specifically all hold.** No mutation
carrying `onMutate` invalidates or refetches; `useCastVote` and `useRetractVote`
each snapshot, write optimistically and roll back on error, and the two writes
that do reconcile do it from their own response through `setQueryData`. There is
no `useEffect` anywhere in `apps/pragma/site/src` — not merely none in the diff —
and the countdown derives during render from `closesAt` and a one-second clock
read through `useSyncExternalStore`, with the interval owned by the store rather
than by a component. Settlement is idempotent at the statement level: a
conditional `UPDATE … WHERE settled_at IS NULL RETURNING id` claims the round,
only the claimer appends, the two share one transaction, and a back-e2e row waits
the real thirty seconds and fires two concurrent state reads to prove one entry
lands. The tie test now distinguishes the rule from the identifier fallback — the
song the fallback would pick loses — and a sibling case pins determinism when
count and latest vote are both tied. The pool test puts a manual setlist and an
audience-choice setlist on the same concert and asserts only the first excludes,
which is exactly the property asked for and the one the pure function cannot
decide.

**What fails is one hole with two faces plus two smaller rows.** The plan wrote
`open-ballot.middleware.ts` as *"gate the public write routes on a concert that
has an open round and a well-formed ballot token"*. What shipped checks the token
shape only. Votes and retractions survive because the service refuses
`round-closed` on its own, but `acceptSuggestion` has no such check: it never
loads the session, never reads `session.kind`, never looks for a round. Probed
through `createApp()` against the real database, a suggestion returns **201** on
a practice session, on a concert with no round running, and on a session id that
does not exist. On an `mbid` the catalogue does not hold, that path calls
MusicBrainz and inserts a `song` row — so the reachable effect of one
unauthenticated request to a made-up UUID is a new row in the band's catalogue.
The limiter that exists and could bound this is wired to `GET /search` alone, and
the spec's zero-defect strategy names it as one of the two mitigations of the
public surface; neither mitigation reaches this route. Separately the band panel
labels each round in the history by slicing characters 11 to 16 out of an ISO
string, which is a UTC hour presented as a time — a round opened at 21:30 in
Paris reads 19:30. And the spec's first error case, a vote on a closed or settled
round refused with a conflict, has no test at all; the behaviour is correct, but
the missing detection is the one the plan nominated and the one that would have
caught the suggestion route.

**Routing and auth, named by stage, because same-origin `/api` is prod-only
here.** Ungated access is stage-independent: `buildAppRouter` has no
stage-conditional branch and a back-e2e row drives all six public routes and both
gated routes through the composition root with no cookie, so the public surface
is public and the two band routes 401 in every stage. How a *browser* reaches the
API is not stage-independent. In **prod** `VITE_API_BASE` is unset, the client
resolves its base to `/`, and the audience calls are same-origin with no
preflight — nothing at risk. In **preview** the workflow bakes
`https://<app>-pr-<n>-api.preview.borso.fr`, so every call is cross-origin
against a bare `cors()`; reading hono 4.12.18's source, that sets
`Access-Control-Allow-Origin: *` and never sets `Access-Control-Allow-Credentials`,
which a request in credentials mode `include` cannot pass. The new
`x-ballot-token` header is not the problem — hono echoes the requested headers
when `allowHeaders` is empty. This is pre-existing configuration the diff does not
touch and I did not drive a preview host, so it is recorded as unverifiable
rather than failed. It does mean `/visual-validation` has to run the public page
on the preview URL in a context with no session cookie; a green `pnpm dev` run is
not evidence about preview, because there the API is same-origin and the question
never arises.
