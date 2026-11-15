# Technical validation — Friction inventory of PR #351

- Spec: [`../inventory.md`](../inventory.md) (a kaizen sweep: its `fixed:`, `knowledge:` and `dantotsu:` decisions are the claims)
- Plan: none, by design for a kaizen sweep
- Branch: claude/lessons-from-pr-351
- Base: c5c3c2e5496755d0def0ff4d8b5a62d4a18b2df5
- Run at: 2026-11-15T09:29:48Z
- Round: 1
- Reviewed: 9b3e494d1d96b88ba5bad7e0f348685ae29f825f
- Touched workspaces: @borso-app/pragma (test seed only); the rest is `.claude/`, `.husky/`, `scripts/` and `docs/`, which no workspace test runner reads

`git rev-list --merges <base>..HEAD` printed nothing, so the diff is the branch's five commits. The inventory routes nothing to `/visual-validation`: 0 use cases routed to /visual-validation; out of scope for this report. Category D holds the behavioural claims only (hooks, scripts, seed); the documentation claims (rows 06, 14's record, 16, 17) are checked in category A and by the doc gates in B.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | row 01 | A hook speaks when a design canvas starts | .claude/settings.json:155, .claude/hooks/pretool-mockup-reads-visual-rules.sh:23 | `"matcher": "Artifact"`; `quickstart:design) ;;`. Run with `{"session_id":"s1","tool_input":{"action":"quickstart","intent":"design"}}` → `hookEventName "PreToolUse"` with the note, exit 0; second call in the same session → silent; `intent:"document"` → silent. The printed grep, run for pragma, reaches `apps/pragma/api/src/members/INVARIANTS.md:18: On every screen, a member colour means that member and nothing else` | PASS |
| A02 | row 01 | The /specification sentence the hook replaces is removed | .claude/skills/specification/SKILL.md:87 | `-... Read the app's \`VOCABULARY.md\` first, because it holds visual rules such as what a colour means.` removed; the rest of the bullet kept | PASS |
| A03 | row 01 | The hook speaks on "a publish whose intent is a design" (its header, line 12-13) | .claude/hooks/pretool-mockup-reads-visual-rules.sh:24-25 | `publish:*)` / `[ -n "$TYPE_URL" ] \|\| exit 0`. The Artifact tool's schema (read from this session's transcript) says `type_url` is "the Artifact type to create this new, private Artifact from", for any type ("for a deck or a design"). Failing case: `{"session_id":"s4","tool_input":{"action":"publish","type_url":"<a slides or document type>","title":"Q3 slides"}}` → prints the mockup visual-rules note, though no design canvas starts. Advisory, once per session | FAIL (non-blocking) |
| A04 | row 05 | Every PreToolUse refusal adds that nothing in the call ran | .claude/hooks/kaizen-refusal.sh:30-32 | `case "$(ps -o args= -p "$PPID" ...)" in *.claude/hooks/pretool-*)` / `echo "[refused] Nothing in this call ran, ..."`. All 22 calls from `pretool-*.sh` are followed by `exit 2` (grep of each call site); `.husky/` callers do not match the pattern. Observed live this session: `pretool-subagent-no-staging` refused a call and the stderr ended with `[refused] Nothing in this call ran, the steps chained before the refused one included.` | PASS |
| A05 | row 06 | The knowledge entry says a metric on production rows ships as a fixture test named in the spec | docs/knowledge/input-vs-output-metrics.md:60,68 | `## An input metric measured on production rows ships as a test`; `copy the rows it needs into a fixture of the pure function's test, with a test named after the metric, and write that test's path in the spec` | PASS |
| A06 | row 08 | The seed adds Chœurs sung by Léa on Afterglow, and a Bass and Keys swap between Marc and Sarah on Midnight Drive | apps/pragma/api/src/__test/test-seed-fixture.core.ts:18,34,36,41,127-128,211 | `{ name: 'Chœurs', family: 'vocal', icon: 'choir' }`; Léa `['Guitare', 'Chant', 'Chœurs']`; Afterglow `Léa: ['Guitare', 'Chœurs']`; Midnight Drive `Marc: ['Clavier'], Sarah: ['Basse']`, directly after Slow Burn's `Marc: ['Basse'], Sarah: ['Clavier']` in setlist order (`SEED_SONGS[index]` at test-seed.service.ts:211). `'choir'` is an `InstrumentIcon` (domain/instrument.core.ts:26) | PASS |
| A07 | row 09 | `scripts/stop-port.sh <port>` replaces the three-line recipe the refusal printed | .claude/hooks/pretool-no-broad-kill.sh:48, scripts/stop-port.sh:20-35, .claude/skills/visual-validation/SKILL.md:81 | `echo "[no-broad-kill]   scripts/stop-port.sh 5173"`. Ran: nothing listening → `nothing listens on 47391`, exit 0; setsid server with a child → `stopped process group 853`, group left with zombies only, port free; server in the caller's own group → `stopping only pid 886`, caller alive, port free; no argument → usage, exit 1 | PASS |
| A08 | row 09 | stop-port stops a server "without touching another agent's processes" (its header, line 2-3) | scripts/stop-port.sh:26,34 | `group="$(ps -o pgid= -p "$listener" ...)"` then `kill -- "-$group"`. Measured with `lsof -iTCP -sTCP:LISTEN`: 127.0.0.1:43357 is `claude` pid 165 and 127.0.0.1:34859 is `environment-manager` pid 156, both in pgid 90. Failing case: `scripts/stop-port.sh 43357` (a mistyped or misread port) → `kill -- -90`, which stops Claude Code and the environment manager. The old recipe carried the same exposure | FAIL (non-blocking) |
| A09 | row 14 (and 15) | The pre-push guard asks the merge GitHub makes, with no merge driver | .husky/pre-push:81-90 | `GIT_ATTR_SOURCE="$empty_tree" git merge-tree --write-tree --name-only HEAD origin/main` / `if [ "$conflict_status" -eq 1 ]`. Reproduced in a throwaway repository (branch keeps `f.md merge=union`, main drops it, both edit `f.md`): new guard exit 1 (refuses), plain merge-tree 0, old guard `pass`; clean branch → 0; unrelated histories → 128, skipped as the comment says. On this branch → 0. Git here is 2.43, above the 2.40 the comment requires | PASS |
| A10 | row 14 | The dantotsu `the-union-merge-only-this-checkout-could-see` is written | docs/dantotsus/the-union-merge-only-this-checkout-could-see.md:1-16 | `related-pr: '#351'`, `eradication-paths: [.husky/pre-push]`, `recurs: [the-conflict-warning-that-spoke-after-the-push]` (that file exists). `check-dantotsu-front-matter.ts` → `322 dantotsus carry a complete, resolvable front matter` | PASS |
| A11 | row 16 | The ADR index is restored to PR #352's page | docs/adr/README.md:52-60 | `git diff 13670458a:docs/adr/README.md HEAD:docs/adr/README.md` prints nothing; the page keeps `This folder keeps no list of its records` and the three `grep` recipes, with the 159 resurrected lines removed | PASS |
| A12 | row 17 | ADR-2026-11-15T0627 is accepted | docs/adr/2026-11-15T0627-pragma-lineup-grid-marks-a-change-by-fill-intensity.md:3 | `- **Status:** accepted` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware apps/pragma/api/src/__test/test-seed-fixture.core.ts apps/pragma/api/src/__test/test-seed.controller.test.ts` | exit 0, no output | PASS |
| B02 | Formatting | `pnpm exec oxfmt --check` on the two TS files and the inventory | `All matched files use the correct format.` | PASS |
| B03 | knip | `pnpm knip` | exit 0, configuration hints only, none about a changed file | PASS |
| B04 | No `any`, assertions limited to `as const` / `as unknown`, no `useEffect` | `grep -nP '\bany\b\|\bas (?!const\b\|unknown\b)[A-Z]\|useEffect'` on the changed TS | none found (grep exit 1) | PASS |
| B05 | Names carry intent, no abbreviations | read the changed TS and shell | seed names are band data (`'Chœurs'`, `'Clavier'`); shell names `listener`, `group`, `own_group`, `conflict_status`, `empty_tree` | PASS |
| B06 | Magic numbers | test-seed.controller.test.ts:75,84 | `instruments: 6`, `.toBe(6)`: expected values in an assertion, beside the existing `members: 4` and `songs: 6` | PASS |
| B07 | Standards checklist (every `reviewer` bullet) on the changed source under `apps/` | read test-seed-fixture.core.ts in full | data tables only; no comment, no boolean name, no verb-named function, no repository, no transaction, no effect, no i18n key, no route. No bullet applies to a changed line | PASS |
| B08 | Doc gates | `check-dantotsu-front-matter.ts`, `check-doc-links.ts`, `check-knowledge-triggers.sh`, `check-adr-numbers-resolve.sh` | all four exit 0 | PASS |
| B09 | Shell scripts parse; settings stays valid JSON | `bash -n` on .husky/pre-push, scripts/stop-port.sh, kaizen-refusal.sh, the new hook; `jq empty .claude/settings.json` | `syntax-ok`, `json-ok`. shellcheck is not installed here, see Notes | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed c5c3c2e5496755d0def0ff4d8b5a62d4a18b2df5 --coverage --reporter=verbose` | 0; 7 files, 39 tests, including test-seed-fixture, test-seed-studies (`logs each study on an instrument the member plays in that song`) and test-seed-task-board; coverage 100% of the 5 gated lines | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed c5c3c2e5496755d0def0ff4d8b5a62d4a18b2df5 --reporter=verbose` | 0; 49 files, 485 tests, including `test-seed.controller.test.ts > seeds a coherent fixture (instruments, members, songs, setlist)` | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh c5c3c2e5496755d0def0ff4d8b5a62d4a18b2df5 apps/pragma/api/src/__test/test-seed-fixture.core.ts` | 0; `every changed gated file passed mutation`. The file is module-level tables, so Stryker made no mutant (score n/a) | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` has a sibling test | 60 files, none missing | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | row 14: the pre-push guard refuses a branch that conflicts with main only under a merge driver | (none found). Failing case: put back the old `git merge-tree "$merge_base" HEAD origin/main \| grep -q '^+<<<<<<<'` at .husky/pre-push:81-85 → every test in the repository still passes, and a branch declaring `merge=union` on a file main also edited is pushed with no CI again. The dantotsu's "Proof it can fail" is a hand run; `scripts/pre-push-range.test.ts` shows the repository's harness for a git script in a throwaway repository. I reproduced the refusal by hand (A09) | FAIL (non-blocking) |
| D02 | row 05: a PreToolUse refusal says nothing in the call ran | (none found). Failing case: delete kaizen-refusal.sh:30-34 → no test fails. Observed working live (A04) | FAIL (non-blocking) |
| D03 | row 01: the mockup hook speaks once per session on a design quickstart and stays silent otherwise | (none found). Failing case: change `quickstart:design` to `quickstart:designs` at pretool-mockup-reads-visual-rules.sh:23 → no test fails, and the hook never speaks. Run by hand (A01) | FAIL (non-blocking) |
| D04 | row 09: stop-port stops the listener's group, and only the listener when the group is the caller's | (none found). Failing case: drop the own-group check at stop-port.sh:28 → no test fails, and a server started in the caller's group takes the caller down with it. Run by hand (A07) | FAIL (non-blocking) |
| D05 | row 08: the seed holds a second vocal instrument that someone plays on a song | test-seed.controller.test.ts:75 `instruments: 6` and :84 `.toBe(6)` pin only the count. Failing case: change Chœurs to `family: 'harmonic'`, or drop it from Afterglow's lineup at test-seed-fixture.core.ts:211 → every test passes, and the dev seed again has no second vocal instrument on any song | FAIL (non-blocking) |
| D06 | row 08: the seed holds a swap between two consecutive songs (Marc and Sarah, Bass and Keys, Slow Burn to Midnight Drive) | (none found). Failing case: set Midnight Drive back to `Marc: ['Basse'], Sarah: ['Clavier']` at test-seed-fixture.core.ts:127-128 → every test passes, and the dev seed holds no swap. `test-seed-task-board.core.test.ts` shows the repository's pattern for pinning a seed property a screen needs (`leaves one member with nothing owed, so an empty column is on screen`) | FAIL (non-blocking) |

All six are typed non-blocking: each fix works today (reproduced in A01, A04, A06, A07, A09), so nothing breaks if it ships. What is missing is the test that keeps it working.

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Database writes | Check-then-write | `git diff <base>...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty. The seed service that writes the fixture is unchanged; only its data tables moved | PASS |
| E02 | Module-level state | Per-process state | The only changed API file, test-seed-fixture.core.ts, adds no `let` and no `new Map`/`new Set`. The new hook keeps a per-session marker file under `$TMPDIR`; two Artifact calls at once in one session can both print the note, which is advisory and harmless | PASS |

## Blocking findings

- none

## Non-blocking findings

- A03 — the mockup hook speaks on a publish from any Artifact type, not only a design, unlike its header.
- A08 — `scripts/stop-port.sh` kills a whole process group with no check of what the group is; port 43357 here would stop Claude Code.
- D01 — no test pins the pre-push guard's refusal of a conflict a merge driver hides.
- D02 — no test pins the refusal sentence in kaizen-refusal.sh.
- D03 — no test pins when the mockup hook speaks.
- D04 — no test pins stop-port's group and own-group behaviour.
- D05 — no test pins a second vocal instrument played on a seeded song.
- D06 — no test pins the seeded Bass and Keys swap.

## Notes

- shellcheck is not installed in this container, so the four changed shell files were checked with `bash -n` only. Is a shell linter wanted in the gates?
- The guard trusts the dantotsu's claim that GitHub's merge ref applies no attribute at all. Reading attributes from the empty tree also drops `binary` and `-merge`. Does GitHub honour those, so that a binary file both sides changed could differ between the two merges? Both would report a conflict in the case I can think of, so I found no failing case.
- docs/knowledge/screenshotting-talos-behind-its-passkey.md:43 still tells a reader to stop servers with `lsof -ti tcp:5180`. Should it name `scripts/stop-port.sh` now?
- The dantotsu records `eradication-level: 1` for a git hook, which the ladder in docs/dantotsus/README.md:19-22 describes as level 2 ("pre-commit"). Eight other records with a `.husky` path also say level 1, and the front-matter check accepts it. Is that the intended reading?

## Verdict: PASS
