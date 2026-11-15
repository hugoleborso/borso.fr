# Technical validation — The glossary stays in VOCABULARY.md and each term's rules move to an INVARIANTS.md in its folder

- Spec: ADR-2026-11-15T0628, [`../../../../adr/2026-11-15T0628-glossary-and-invariants-are-two-files.md`](../../../../adr/2026-11-15T0628-glossary-and-invariants-are-two-files.md)
- Plan: none (plan absent; files taken from the diff)
- Branch: claude/vocabulary-invariants-split
- Base: 4ef620ab088eafb1e101a3a36ecec8d77505631c
- Run at: 2026-11-15T06:44:19Z
- Round: 2
- Reviewed: 27f4ece5c0e659b113596211c5527280872cd23e
- Touched workspaces: root (`scripts/`, `.husky/`, `docs/`), markdown headings in all six `apps/<app>/`

Spec is ADR-2026-11-15T0628. This round reads only `git diff e428b38f..27f4ece5`, one commit (27f4ece5). It changes `scripts/check-vocabulary-paths.sh`, adds `scripts/check-vocabulary-paths.test.ts`, widens one scope in `.husky/pre-commit`, and edits line 1 of the 77 `INVARIANTS.md` and of `docs/VOCABULARY.md` (every markdown hunk is `@@ -1 +1 @@`, measured). The commit carries no new scope, so no file round 1 never read is walked. No merge commit sits above the reviewed SHA. 0 use cases routed to /visual-validation, because this change has no screen.

Each round-1 blocking finding was re-checked by mutation. The test file and an exact copy of the HEAD gate were copied into the scratchpad, and each `fail` line of the gate was replaced by `:` in turn. Then the 15 tests were run against each mutated copy. A test covers a check only when removing that check turns it red.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `plan_path: none` | UNVERIFIABLE |
| A01 | ADR context ("every one of those checks has to survive the change") | A rule sourced from a comment is refused in an INVARIANTS.md | scripts/check-vocabulary-paths.sh:193-198 | `done < <(grep -HnEi "$COMMENT_CITATION" "${invariants_files[@]}" \|\| true)`. GNU `grep -E` honours `\b`. The test `refuses an invariant sourced from the comment above` passes on HEAD and fails when `above` is removed from the pattern (mutation **comment-b**) | PASS |
| A02 | Consequences ("the repository glossary lists every application glossary") | The gate fails when docs/VOCABULARY.md does not link an app glossary | scripts/check-vocabulary-paths.sh:200-208 | `grep -qF "(../$vocabulary)" docs/VOCABULARY.md \|\| fail "docs/VOCABULARY.md does not list $vocabulary under ## Glossaries"` | PASS |
| A03 | Operator: every `Held by` line survives | The heading edits move no `Held by` line | 77 `apps/*/INVARIANTS.md` | Every hunk is line 1. `git grep -h '^Held by:' -- 'apps/*INVARIANTS.md' \| wc -l` → `346`, the round-1 count | PASS |
| A04 | Operator: the gate keeps checking every `Held by` line | The `held` and `indented` records are unchanged | scripts/check-vocabulary-paths.sh:132-136 | `/^Held by:/ { print "held\t" FILENAME "\t" $0; next }` and `/^[[:space:]]+Held by:/ …` are kept. Only the `citation` record moved out of awk. `./scripts/check-vocabulary-paths.sh` on HEAD exits 0 in 0.244 s | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A14: `awk -v` turned `\b` into a backspace, so `the comment above` passed an INVARIANTS.md | 27f4ece5 scripts/check-vocabulary-paths.sh:193-198, a `grep -HnEi` over every invariants file. The test at scripts/check-vocabulary-paths.test.ts:168-172 sets `'- As the comment above says, a thing'` and asserts `toBe(1)` at :171 | PASS |
| R02 | D01: no test for a `Held by` line in a glossary | scripts/check-vocabulary-paths.test.ts:111-115, `it('refuses a glossary carrying a Held by line')`, `expect(runGate(withFile(GLOSSARY_PATH, glossary))).toBe(1)` at :114. Removing the gate's fail at :109 turns only this test red | PASS |
| R03 | D02: no test for a rule bullet in a glossary | scripts/check-vocabulary-paths.test.ts:117-121, assertion at :120. Removing the fail at :113 turns only this test red. The valid tree at :107-109 keeps `- Code:` and the `Words we do not use` bullet green | PASS |
| R04 | D03: no test makes the gate fail on a term whose INVARIANTS.md lacks its section | scripts/check-vocabulary-paths.test.ts:123-127 (`INVARIANTS.replace('## Thing', '## Things')`) and :129-136 (Invariants path changed to `api/src/widgets/`). Both inputs also leave an orphan section, which a different check refuses. **Failing case:** replace `fail "$glossary sends $heading to $invariants, which has no section ## $heading"` (scripts/check-vocabulary-paths.sh:120) with `:`, and all 15 tests stay green (measured). The same holds for `…which is not in $base` at :118. The gate so mutated then exits 0 on this input: `apps/demo/VOCABULARY.md` with terms `Thing` and `Widget`, both `Invariants: \`api/src/things/INVARIANTS.md\``, and that file holding only `## Widget`. HEAD refuses it (`sends Thing to api/src/things/INVARIANTS.md, which has no section ## Thing`, exit 1), so the check works but nothing pins it. Fix size: one test input (a second term that owns the file's only section) | FAIL (blocking) |
| R05 | D04: no test for an orphan INVARIANTS.md section | scripts/check-vocabulary-paths.test.ts:138-142, assertion at :141. Removing the fail at :150 turns only this test red | PASS |
| R06 | D05: no test for the rewritten `Held by` check | scripts/check-vocabulary-paths.test.ts:144-166, four tests (missing file at :147, missing title at :153, malformed at :159, indented at :165). Each of the gate's fail lines at :164, :166, :162 and :147, removed in turn, turns exactly its own test red | PASS |
| R07 | D06: no test for the comment-citation refusal in an INVARIANTS.md | scripts/check-vocabulary-paths.test.ts:168-178, `the comment above` at :171 and `The file header says` at :177. Removing the fail at gate :196 turns both red | PASS |
| R08 | D07: no test for the `Lives in:` check in an app glossary and in docs/VOCABULARY.md | scripts/check-vocabulary-paths.test.ts:180-190, assertions at :183 and :189. Removing the fail at gate :98 turns both red | PASS |
| R09 | D10 (non-blocking) dismissed: "no hook scope in .husky/pre-commit has a test, and ci.yml runs this gate on the whole tree at every push" | `git grep -l -e 'pre-commit' -- '*.test.ts' '*.test.sh' '*.bats'` prints nothing. .github/workflows/ci.yml:17-20 `on: pull_request: push: branches: [main]`, and :117 `- run: ./scripts/check-vocabulary-paths.sh` with no path argument. The claim holds | PASS |
| R10 | B08 (non-blocking): the hook scope had `^D ` only under `apps/` | .husky/pre-commit:280 `^D (apps\|docs\|scripts\|\\.claude\|\\.husky\|\\.github)/\|^D CLAUDE\\.md\$`. Every first segment of a `Lives in:` path in docs/VOCABULARY.md is one of `.claude .github .husky CLAUDE.md apps docs scripts`. Tested against the scope: `D .claude/skills/route/SKILL.md`, `D scripts/kaizen.sh`, `D CLAUDE.md` run, `M apps/pragma/api/src/oauth/oauth.core.ts` skips. `touched` is built with `--no-renames` (pre-commit:13), so a rename is a `D` | PASS |
| R11 | B13 (non-blocking): 78 new headings used a long dash | `git grep -n '—' -- 'apps/*INVARIANTS.md' docs/VOCABULARY.md` finds only apps/pragma/api/src/mastery/INVARIANTS.md:18, a `Held by` test title that must match its test verbatim. Headings now read `# Invariants of pragma, in \`api/src/oauth\`` | PASS |
| R12 | D08 (non-blocking): nothing checked that docs/VOCABULARY.md lists every app glossary | scripts/check-vocabulary-paths.test.ts:192-196, assertion at :195. Removing the fail at gate :206 turns only this test red | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware scripts/check-vocabulary-paths.test.ts` | exit 0, no diagnostics | PASS |
| B02 | knip clean | `pnpm knip` | exit 0 (only the standing redundant-entry and `.css` notices) | PASS |
| B03 | No `any`, assertions limited to `as const` / `as unknown` | `grep -nP '\bany\b\|\bas (?!const\|unknown)\w' scripts/check-vocabulary-paths.test.ts` | none found. The exit status is narrowed with `error instanceof Error && 'status' in error && typeof error.status === 'number'` (:89), the shape of scripts/check-adr-gates.test.ts:55 | PASS |
| B04 | Names carry intent, constants named | read the test in full | `GATE`, `GLOSSARY_PATH`, `INVARIANTS_PATH`, `REPOSITORY_GLOSSARY`, `VALID_TREE`, `runGate`, `withFile`, `environmentWithoutGit`. No abbreviation, no bare literal path | PASS |
| B05 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed .ts | none found | PASS |
| B06 | Other gates the changed paths fall under | `check-no-racy-pipelines.sh scripts/check-vocabulary-paths.sh`, `check-no-null-bytes.sh`, `scripts/docs/check-doc-links.ts`, `bash -n .husky/pre-commit`, and the gate itself | all exit 0 | PASS |
| B07 | Message states what the check checks | scripts/check-vocabulary-paths.sh:205-206 | `grep -qF "(../$vocabulary)" docs/VOCABULARY.md \|\| fail "docs/VOCABULARY.md does not list $vocabulary under ## Glossaries"`. The grep reads the whole file, not the section. **Failing case:** drop `- [demo](../apps/demo/VOCABULARY.md)` from `## Glossaries` and keep a link `[its glossary](../apps/demo/VOCABULARY.md)` inside any term's definition, and the gate passes while the map no longer lists the app. Introduced: this branch. Fix size: one line (an awk range from `## Glossaries` to the next `## `) | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | root (`scripts/`) | `pnpm exec vitest run --changed $(git rev-parse e428b38f…) --reporter=verbose` | 0. It ran `scripts/check-vocabulary-paths.test.ts`, 15 tests | PASS |
| C02 | root (`scripts/`) | the same with `--coverage` | 0. No gated file is in the round-2 diff (`git diff --name-only e428b38f..HEAD \| grep -E '\.(core\|utils\|adapter)\.ts$'` is empty), so `mutate-changed.sh` has nothing to mutate | PASS |
| C03 | `*.utils.ts` in touched workspaces | `git diff --name-only e428b38f..HEAD \| grep utils` | none changed | PASS |

## D. Test coverage of spec

Round 2 re-grades the round-1 D rows in R02 to R12. No new behaviour enters the diff except the glossary-listing check, covered in R12.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Valid tree passes: a term reaching its invariants and a `Held by` naming a real test | `it('passes a glossary whose term reaches its invariants and whose invariant names a real test')` at scripts/check-vocabulary-paths.test.ts:107, `expect(runGate(VALID_TREE)).toBe(0)` at :108. Without it every `toBe(1)` could pass on a broken fixture | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write / per-process state | `git diff e428b38f..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty. The changed code is a shell gate, its test and a hook scope. Each test run writes only to its own `mkdtempSync` directory (scripts/check-vocabulary-paths.test.ts:75), removed in `afterEach` (:100-104) | PASS |

## Blocking findings

- R04: the two tests for a missing invariants section also leave an orphan section, so the "no section" and "file not there" checks (gate :118, :120) can be deleted with all 15 tests green. A term whose file holds only another term's section then passes the gate.

## Non-blocking findings

- B07: the glossary-listing check greps the whole of docs/VOCABULARY.md, so a link in a definition satisfies it while `## Glossaries` no longer lists the app.

## Notes

- A00: no plan exists for this meta change. Files were taken from the diff.
- Removing the glossary's comment-citation refusal (`fail "$1 sources a claim from a comment: $citation"`, gate :71) leaves all 15 tests green (measured). The check predates the branch and round 1 listed no D row for it, so it is not raised here. Should a test plant `the comment above` in a glossary too?
- The app glossaries still open with `# Vocabulary — <app>` (e.g. apps/pragma/VOCABULARY.md:1), as they did at base, while docs/VOCABULARY.md now reads `# Vocabulary of the repository`. Should the six headings follow?
- The round-1 notes on the talos *memory* `Held by` placement, the lazy-continuation rendering of `Held by` lines, and the bullet-only rule refusal received no answer in the commit. They remain questions.

## Verdict: FAIL
