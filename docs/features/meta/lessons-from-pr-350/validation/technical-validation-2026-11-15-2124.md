# Technical validation — Lessons from PR #350 (kaizen sweep)

- Spec: [`../inventory.md`](../inventory.md) (kaizen inventory; its `fixed:` and `dantotsu:` decisions are the claims)
- Plan: none (kaizen sweep, no plan by design; no plan row)
- Branch: claude/lessons-from-pr-350
- Base: 9b8d380edad0b34fe301a33a097dfde3c354256d
- Run at: 2026-11-15T21:22:35Z
- Round: 2
- Reviewed: 9fe47d6d5e94fb34fdf27037a7fac0f8893f335b
- Touched workspaces: repository tooling (`scripts/`, root `vitest.config.ts` project), `.github/workflows/ci.yml`, `docs/dantotsus/`

Round 2 reads `git diff 4f5b14730c27a698d30c1c34fe2c6f3d73e83e02..HEAD`, one commit (`9fe47d6d5`) touching five files: `.github/workflows/ci.yml`, `docs/dantotsus/the-prompt-that-outranked-claude-md.md`, `scripts/check-docs-are-english.sh`, the new `scripts/check-docs-are-english.test.ts` and the round-1 report. No file under `apps/` changed (`git diff --name-only ... -- apps | wc -l` → 0). No merge of `main` sits above the base. HEAD did not move during the review. 0 use cases routed to /visual-validation. The fix commit dismisses no round-1 finding. It also adopts two round-1 Notes (index read, nested files), checked below as A rows.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Row 01, dantotsu | The dantotsu names the test and CI as eradication paths | docs/dantotsus/the-prompt-that-outranked-claude-md.md:9 | `eradication-paths: [scripts/check-docs-are-english.sh, scripts/check-docs-are-english.test.ts, .husky/pre-commit, .github/workflows/ci.yml]`; `pnpm exec tsx scripts/quality/check-dantotsu-front-matter.ts` → "324 dantotsus carry a complete, resolvable front matter", exit 0; `scripts/docs/check-doc-links.ts` exit 0 | PASS |
| A02 | Row 01 | With no argument the gate reads every tracked held file | scripts/check-docs-are-english.sh:28-30 | `if [ "$#" -eq 0 ]; then` / `set -- $(git ls-files -- 'docs/adr/*.md' 'docs/features/*.md')`. Whole-tree run on HEAD: exit 0 in 0.44 s real (measured), so the 15 French files on `main` stay exempt | PASS |
| A03 | Round-1 note | A staged file is read from the index | scripts/check-docs-are-english.sh:32-34, 43 | `if git cat-file -e ":$1" 2>/dev/null; then git show ":$1"; else cat -- "$1"; fi` / `read -r hits words < <(read_file "$file" \| awk '` | PASS |
| A04 | Round-1 note | Files nested under `spec/` and `plan/` are held | scripts/check-docs-are-english.sh:26 | `HELD_PATHS='^docs/(adr/[^/]+\|features/[^/]+/[^/]+/(spec\|plan)/.+)\.md$'` | PASS |
| A05 | Dantotsu, *Earning the run* | "the hook's scope matched 46 of the last 100 commits on `main`" and "a whole-tree run takes 0.46 s" | docs/dantotsus/the-prompt-that-outranked-claude-md.md:64-67 | Recomputed with `git diff-tree -m` over `git log -100` of `origin/main` and of the base: 46 and 46. Whole-tree run measured 0.442 s here | PASS |
| A06 | Dantotsu | "Raising the threshold to 4000 per thousand fails four of its seven tests, and removing the exemption fails one" | docs/dantotsus/the-prompt-that-outranked-claude-md.md:72-73 | Reproduced on a scratchpad copy of the script and test: `MINIMUM_PERMILLE=4000` → "4 failed \| 3 passed (7)"; origin/main exemption removed → "1 failed \| 6 passed (7)" | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | B09: no whole-tree run in `ci.yml` | `9fe47d6d5` .github/workflows/ci.yml:148 `- run: ./scripts/check-docs-are-english.sh`, in the `build` job, which checks out with `fetch-depth: 0` (ci.yml:43), so `origin/main` resolves for the exemption. With no argument the script walks every tracked held file (A02). On HEAD it exits 0 | PASS |
| R02 | D03: no test proves the gate refuses a French document | `9fe47d6d5` scripts/check-docs-are-english.test.ts:57-61 `it('refuses a French ADR that main does not hold'` → `expect(runGate(directory, FRENCH_ADR)).toBe(1);`, and :63-68 for a nested spec file. Round 1's failing cases now fail. `MINIMUM_PERMILLE=4000` fails 4 tests, `MINIMUM_HITS=1000` fails 4, and narrowing the nested pattern back to `[^/]+` fails 1 (measured, scratchpad copies) | PASS |
| R03 | D04: no test proves the gate passes an English document or a French file on `main` | `9fe47d6d5` scripts/check-docs-are-english.test.ts:76-83 `it('passes a French spec already on main'`, which commits the spec, points `refs/remotes/origin/main` at it and asserts `.toBe(0)`; :70-74 for an English ADR. Removing the `origin/main` exemption at script line 40 fails 1 test (measured) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware scripts/check-docs-are-english.test.ts` | exit 0, no output | PASS |
| B02 | Tooling typecheck | `pnpm run typecheck` (`tsc -p tsconfig.json --noEmit`, the tree CI's `build` job checks) | exit 0 | PASS |
| B03 | No `any`, assertions only `as const`/`as unknown`, no comments in TS | read the test in full | no `any`, no `as`; the error status is narrowed by `error instanceof Error && 'status' in error && typeof error.status === 'number'` (test:43); no comment | PASS |
| B04 | Names carry intent, magic values named | read the test in full | `GATE`, `FRENCH_SENTENCE`, `ENGLISH_SENTENCE`, `FRENCH_ADR`, `FRENCH_SPEC`, `makeRepository`, `runGate` | PASS |
| B05 | Standards checklist (10): "a test name states the behaviour and the condition" | read | test:57 `'refuses a French ADR that main does not hold'`, test:91 `'reads the staged copy, not the working tree'`, test:99 `'checks every tracked held file when given none'` | PASS |
| B06 | Standards checklist (14): "a check leaving the commit gets a whole-tree run in `ci.yml`" | `grep -n docs-are-english .github/workflows/ci.yml` | ci.yml:148, see R01 | PASS |
| B07 | Standards checklist (14): *Earning the run* answered in writing | read the dantotsu | docs/dantotsus/the-prompt-that-outranked-claude-md.md:64-67, see A05 (round-1 B10) | PASS |
| B08 | Standards checklist (01): no history note in a comment; CLAUDE.md "Never document ... a count" | read scripts/check-docs-are-english.sh in full | lines 2-3 `# Gate: an ADR, a spec or a plan is written in English, whatever a prompt asks.` / `# See docs/dantotsus/...`; line 11 `specs written before the rule are` carries no count (round-1 B11, B12) | PASS |
| B09 | Shell hygiene | `bash -n`, `scripts/check-no-racy-pipelines.sh` | syntax exit 0; "no script pipes a directory walk into an early-stopping consumer" | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | Repository tooling | `pnpm exec vitest run --changed 4f5b14730c27a698d30c1c34fe2c6f3d73e83e02 --reporter=verbose` at the root | 0; 1 file, 7 tests, all in `scripts/check-docs-are-english.test.ts` and each named in the output | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed 4f5b14730c27a698d30c1c34fe2c6f3d73e83e02` | no test file found; no file under `apps/` changed since the reviewed SHA, and round 1's C01 to C03 ran the talos core, e2e and mutation suites on that code | PASS |
| C03 | Mutation | `scripts/mutate-changed.sh` | not run: the round-2 diff changes no gated `.core`, `.utils` or `.adapter` file. A hand mutation pass over the shell gate is graded in D | PASS |
| C04 | `*.utils.ts` coverage | `git diff --name-only 4f5b147..HEAD` for `*.utils.ts` | none touched | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Row 01: the gate refuses a French ADR | `it('refuses a French ADR that main does not hold')` at scripts/check-docs-are-english.test.ts:57; assertion :60 `expect(runGate(directory, FRENCH_ADR)).toBe(1);` | PASS |
| D02 | Row 01: the gate refuses a French spec file, nested files included | `it('refuses a French spec in a nested folder of the spec')` at test:63; assertion :67 `.toBe(1)` | PASS |
| D03 | Row 01: a French file already on `main` is not held | `it('passes a French spec already on main')` at test:76; assertion :82 `expect(runGate(directory, FRENCH_SPEC)).toBe(0);` | PASS |
| D04 | Row 01: an English document quoting French product strings passes | `it('passes an English ADR that quotes French product strings')` at test:70; assertion :73 `.toBe(0)`. The fixture does not set up the condition its name states. `ENGLISH_SENTENCE` (test:10-11) quotes « Décider » and « la carte », 6 French hits over the whole file, under the 15 floor. Failing case: delete the guillemet strip at scripts/check-docs-are-english.sh:53 `gsub(/«[^»]*»/, " ", line)`, and all 7 tests still pass (measured). That mutant refuses an English ADR of six lines `The decision keeps the PWA, and the card shows « la carte est pour les propositions et nous ne prenons pas de licence ».` ("48 French function words in 145", exit 1; the shipped script exits 0). The backtick strip (line 52), double-quote strip (line 54) and blockquote skip (line 49) survive the same way. Nothing ships wrong today; a regression would refuse an English document, and its author would see the gate's message | FAIL (non-blocking) |
| D05 | Row 01: the commit-time check reads what is committed | `it('reads the staged copy, not the working tree')` at test:91; stages French, writes English to the working copy, asserts :96 `.toBe(1)`. Replacing `read_file` with `cat` fails it (measured) | PASS |
| D06 | Row 01: CI's whole-tree mode | `it('checks every tracked held file when given none')` at test:99; assertion :103 `expect(runGate(directory)).toBe(1);`. Removing the no-argument branch fails it (measured) | PASS |
| D07 | Row 01: files outside ADRs, specs and plans are ignored | `it('ignores a French file outside ADRs, specs and plans')` at test:85; a French `kaizen.md`, assertion :89 `.toBe(0)` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths and per-process state | `git diff 4f5b147..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty; the round-2 diff changes no file under `apps/`. The test's module-level `const repositories: string[] = []` (test:17) is per-test-run cleanup, emptied by `repositories.splice(0)` in `afterEach` | PASS |

## Blocking findings

- none

## Non-blocking findings

- D04 — the test named for an English ADR quoting French product strings quotes too few French words to need the stripping. Deleting the guillemet, backtick or double-quote strip, or the blockquote skip, fails no test.

## Notes

- `set -- $(git ls-files ...)` at scripts/check-docs-are-english.sh:29 word-splits and globs unquoted. No tracked held path holds a space or a glob character today (`grep -c` → 0 and 0). Should it read `git ls-files -z` into an array, so a future `docs/adr/a b.md` in French is not split into two unmatched fragments and skipped in CI?
- The `MERGE_HEAD` exemption at line 40 has no test, and removing it fails nothing (measured). Is a merge of `main` that brings a French file not yet on the local `origin/main` worth a test case?
- The test runs `git` with the parent's environment. `.husky/pre-push:294` runs the tooling suite, and `check-adr-gates.test.ts` follows the same pattern. Does any hook export `GIT_DIR` or `GIT_INDEX_FILE` while that suite runs? Nothing measured here shows that one does.

## Verdict: PASS
