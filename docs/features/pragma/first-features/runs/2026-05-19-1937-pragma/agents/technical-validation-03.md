---
status: FAIL
summary: |
  Full-spec re-validation (round 3 of validation, against round-2 implementation
  at commit ff6657e). Gates green: typecheck, biome lint, knip, build, synth all
  pass; 151 core tests + 51 back-e2e tests all green. Vertical-slice restructure
  verified — the mid-round `domain/` aggregator is gone, every domain folder under
  `apps/pragma/api/src/` is a bounded context. BUT — six FAIL rows block ship.
  (1) Per-domain triad rule (CLAUDE.md "Back-end domains are vertical slices…",
  freshly codified in the validator standard B-row): every domain ships only
  `<domain>.controller.ts`, with Drizzle queries inlined into the route handlers.
  No `<domain>.service.ts / .repository.ts / .schema.ts` layer. The reference
  `last-loop-lepin` shape carries the full triad — pragma is one refactoring round
  short. (2) Setlist drag-reorder is explicitly punted ("v2 polish") and replaced
  with up/down buttons; designer pass pinned `handle` drag. (3) Mastery matrix is
  on `/mastery` not `/members`; has no scroll-wheel-±1, no right-click-clear, no
  live row/column averages. (4) Bars CRM has no stale-bar banner. (5) Offline
  cache scope is "any session GET" stale-while-revalidate rather than the spec's
  "next session only" via `/api/offline-manifest`. (6) Embed iframes for
  Spotify/Deezer/YouTube ship as plain `<a>` links — `embed.utils.ts` absent.
  Assertion counts: A 22 PASS / 5 FAIL; B 11 PASS / 1 FAIL; C 7 PASS / 0 FAIL;
  D 19 PASS / 2 FAIL (rolled up). Verdict: FAIL — not mergeable. Next: fix.
artifacts:
  - docs/features/pragma/first-features/validation/technical-validation-2026-05-20-0020.md
next:
  kind: fix
---

## Kaizen seeds

These are observations from this validation pass that should feed the
self-improvement loop (orchestrator ignores them):

- **The B08 failure is the second time in three rounds where the per-domain
  triad rule has been the load-bearing find.** The standard amendment landed in
  `cc5cc3e` — *during* this run — because round-1 surfaced the same gap. The
  implementer (`/implementation`) read the same standard the validator read, and
  shipped controllers-only anyway. Candidate fix: the implementation skill
  should carry a checklist row that explicitly says "for every new domain
  folder, scaffold the four-file triad and route the controller through the
  service layer", with a pre-flight grep that fails if a controller file
  imports the Drizzle schema directly. Right now the rule lives in CLAUDE.md +
  the validator's B-row but has no proactive enforcement in `/implementation`.

- **Spec-routing gap on category A vs D for the mastery matrix.** The spec says
  "click a cell to edit; scroll-wheel to ±1; right-click to clear; row averages
  + column averages update live". The validator's standard splits visual rows
  to `/visual-validation` and deterministic rows to `/technical-validation`,
  but the spec didn't enumerate which side this assertion goes to. Result: the
  validator had to make a judgement call. Specs should carry the explicit
  "UI behavioural assertions" sub-section the validator standard already
  anticipates — currently it's a free-form *Test strategy* paragraph. Worth a
  `/specification` skill amendment to require the sub-section verbatim.

- **The implementer's punted-feature comments** ("Reordering uses up/down
  buttons rather than HTML5 drag (handle pattern stays a v2 polish — …)" in
  `SetlistEditor.tsx:7`) are honest but unauthorised: the spec's designer pass
  pinned the `handle` drag pattern, and the implementer cannot demote a spec
  decision to "v2 polish" unilaterally. The implementation skill should
  forbid in-line "v2 polish" comments unless they reference an explicit spec
  amendment, and should make `/implementation` open a `kaizen` follow-up issue
  rather than ship the punt silently. A `grep` hook on `v2 polish` / `defer`
  inside source comments would catch this at pre-commit.

- **Coverage gates pass while two spec-named utils files are absent.** The
  100%-on-`*.utils.ts` rule only fires if the file *exists*. Missing utils
  files (no `manifest.utils.ts`, no `embed.utils.ts`) silently bypass the gate
  — the spec-named-but-missing case is exactly the gap. A complementary check
  in the validator: cross-reference plan-named files against the diff's
  file-list and FAIL on absent-but-promised paths. Could ship as a row in the
  technical-validation standard or as a pre-commit hook reading the plan's
  *Files to change* fence.
