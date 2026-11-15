# Technical validation — Lessons from PR #350 (kaizen sweep)

- Spec: [`../inventory.md`](../inventory.md) (kaizen inventory; its `fixed:` and `dantotsu:` decisions are the claims)
- Plan: none (kaizen sweep, no plan by design; no plan row)
- Branch: claude/lessons-from-pr-350
- Base: 9b8d380edad0b34fe301a33a097dfde3c354256d
- Run at: 2026-11-15T21:17:48Z
- Round: 1
- Reviewed: 4f5b14730c27a698d30c1c34fe2c6f3d73e83e02
- Touched workspaces: @borso-app/talos (api, domain), repository tooling (`scripts/`, `.husky/`, `.claude/skills/`)

No merge of `main` sits above the base (`git rev-list --merges` printed nothing). HEAD did not move during the review. 0 use cases routed to /visual-validation; the inventory holds no browser-runtime claim. The `no-op` and `merge into` rows of the inventory name no change on this branch and get no row.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Row 01, dantotsu | "dantotsu: `the-prompt-that-outranked-claude-md`" | docs/dantotsus/the-prompt-that-outranked-claude-md.md:1-13 | `eradication-level: 2` / `eradication-paths: [scripts/check-docs-are-english.sh, .husky/pre-commit]`; `pnpm exec tsx scripts/quality/check-dantotsu-front-matter.ts` exit 0, `check-doc-links.ts` exit 0 | PASS |
| A02 | Row 01 | "a pre-commit gate refusing a French ADR, spec or plan" (wired) | .husky/pre-commit:347-348 | `run_check_on_files docs-are-english '^docs/(adr/\|features/[^/]+/[^/]+/(spec\|plan)/)' \` / `scripts/check-docs-are-english.sh` | PASS |
| A03 | Row 01 | The gate refuses the French draft and passes the English ones | scripts/check-docs-are-english.sh:56-59 | `if [ "$hits" -ge "$MINIMUM_HITS" ] && [ $((hits * 1000)) -ge $((words * MINIMUM_PERMILLE)) ]; then`. Reproduced on a copy rooted in the scratchpad: `e57e309` "reads as French: 402 French function words in 1887." exit 1; `d106487` exit 0; `27f1519` exit 0 | PASS |
| A04 | Row 01 / dantotsu | A file already on `main` is not held; without the exemption the gate names exactly 14 French specs and plans plus one transcript | scripts/check-docs-are-english.sh:33 | `if git cat-file -e "origin/main:$file" 2>/dev/null \|\| git cat-file -e "MERGE_HEAD:$file" ...; then continue`. Over the 175 held files, exempt run exit 0; with the exemption removed, 15 refusals (the 14 named plus `front-page-redesign/spec/design-chat-transcript.md`). English documents peak at 4.2 per thousand (`banana-rush/lobby-and-game/spec/spec.md`), French ones start at 87.9, against a 40 threshold | PASS |
| A05 | Row 02 | Removal of the second copy goes to `docs/operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md` | that file:1-5, 34-38 | `status: open` / `found-in: '#350'` / `right: 'write access to hugoleborso/talos, ...'`; `## Done when` with a `grep -niE` check, as `docs/operator-backlog/README.md` asks | PASS |
| A06 | Row 09 | "the decision line limit is now computed in the domain from the option and comment limits" | apps/talos/domain/proposal.core.ts:11-15 | `export const MAXIMUM_DECISION_OPTION_LENGTH = 200;` / `export const MAXIMUM_DECISION_COMMENT_LENGTH = 2000;` / `export const MAXIMUM_DECISION_LINE_LENGTH =` / `MAXIMUM_DECISION_OPTION_LENGTH + MAXIMUM_DECISION_COMMENT_LENGTH + DECISION_LINE_FRAME_ALLOWANCE;` (2500, as before) | PASS |
| A07 | Row 09 | The memory verb's line cap reads the domain value | apps/talos/api/src/memory/memory-changes.schema.ts:2,15 | `import { MAXIMUM_DECISION_LINE_LENGTH } from '@domain/proposal.core';` / `const decisionLineSchema = z.string().max(MAXIMUM_DECISION_LINE_LENGTH);` | PASS |
| A08 | Row 09 | The API's option and comment caps read the same domain values | apps/talos/api/src/proposals/proposals.schema.ts:25-26 | `option: z.string().max(MAXIMUM_DECISION_OPTION_LENGTH).optional(),` / `comment: z.string().max(MAXIMUM_DECISION_COMMENT_LENGTH).optional(),` | PASS |
| A09 | Row 10 | "`/technical-validation` asks a dismissal to name its file, and sends a reason only another repository could confirm to the operator" | .claude/skills/technical-validation/SKILL.md:72-73 | `The reason names the file that holds it. A reason only another repository or a running agent could confirm is a question, not a dismissal;` / `**ask the operator**, when it is a product call or rests on what this repository cannot show.` | PASS |
| A10 | Not in inventory | The PR #350 ADR is stamped accepted | docs/adr/2026-11-15T0636-...-pwa-card.md:3 | `- **Status:** accepted`; `.claude/skills/adr/SKILL.md:169` "On PR merge (`/after-task-kaizen`), every ADR whose status is `proposed` ... gets stamped to `accepted`" | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware` on the five changed `.ts` files | exit 0, no output | PASS |
| B02 | Dead code | `pnpm knip --workspace apps/talos` | exit 0, one configuration hint about `.css` | PASS |
| B03 | No `any`, assertions only `as const`/`as unknown`, `noUncheckedIndexedAccess`, `useEffect` | grep on changed `.ts` files | none found; no index access added | PASS |
| B04 | Names carry intent, magic numbers named | read the diff | `DECISION_LINE_FRAME_ALLOWANCE = 300` named; the test's `'x'.repeat(2000)` became `'x'.repeat(MAXIMUM_DECISION_COMMENT_LENGTH)` (proposals.controller.test.ts:166) | PASS |
| B05 | Standards checklist (02): "a limit or a rule written in a site does not restate one the API enforces" | grep `2000\|maxLength\|MAXIMUM_` in apps/talos/site/src | no comment or option cap restated in the site | PASS |
| B06 | Standards checklist (01): "a definition in a `VOCABULARY.md` and a rule in an `INVARIANTS.md` are still true" | grep `decision line` in talos INVARIANTS/VOCABULARY | apps/talos/api/src/proposals/INVARIANTS.md:14 describes the line's format, unchanged by this diff | PASS |
| B07 | Standards checklist (10): "a test name states the behaviour and the condition" | read | proposal.core.test.ts:253 `'fits the longest choice and comment the API accepts within the memory line limit'` | PASS |
| B08 | Standards checklist (14): "a new check in `.husky/pre-commit` declares a scope naming everything it reads ... that it fits the budget" | read the hook line and the script; time it | Scope `^docs/(adr/\|features/[^/]+/[^/]+/(spec\|plan)/)` covers every file the script reads (it also reads `origin/main`, a ref, not a path). Measured with bash `time`: 0.005 to 0.007 s CPU on the 3,569-word `race-day-live/spec/spec.md` held, against a 300 ms budget | PASS |
| B09 | Standards checklist (14): "a check leaving the commit gets a whole-tree run in `ci.yml`"; 14's table, "Every other check in the hook — whole tree — `ci.yml`"; 12, "CI mirrors every one of the whole-repository checks above, so skipping a hook delays the failure rather than removing it" | `grep -n docs-are-english .github/workflows/*.yml` | no match. Failing case: a French ADR added through a path that runs no husky hook (a GitHub API or web commit, or a commit made with the hook skipped) reaches `main` with every CI job green, which is the PR #350 defect this gate exists to stop. `ci.yml:43` checks out with `fetch-depth: 0`, so the script's `origin/main` exemption works there. Introduced: this branch. Fix size: one line in `ci.yml` (run the script over the PR's added held files). The same gap is pre-existing for `check-spec-records.sh` and `check-adr-criteria.sh` | FAIL (blocking) |
| B10 | Standards checklist (14): "a new check on the commit answers *Earning the run*" in writing | `git log -3 --format=%B`, the dantotsu | neither the commit `63cad6a6b` nor the dantotsu states the two numbers. Measured here: 32 of the last 100 commits touch the scope; 106 commits ever touched what it guards (the same paths), so the check earns its run. Introduced: this branch. Fix size: one line in the dantotsu | FAIL (non-blocking) |
| B11 | Standards checklist (01): "a comment documents something the code cannot say, and is not ... a history note" | read scripts/check-docs-are-english.sh in full | lines 4-8: `# PR #350's first ADR was written in French, because the prompt of the session` / `# that wrote it said so. Another session wrote that prompt, ...` is a history note; the `See docs/dantotsus/...` pointer at line 8 already carries it. Introduced: this branch. Fix size: one file | FAIL (non-blocking) |
| B12 | CLAUDE.md Writing: "Never document what goes stale ... or a count of them" | read | scripts/check-docs-are-english.sh:31 `# Fourteen specs and plans written before the rule are French.` The count goes stale the first time one is translated. Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B13 | Shell hygiene | `bash -n`, `scripts/check-no-racy-pipelines.sh` on the script | syntax exit 0; "no script pipes a directory walk into an early-stopping consumer" | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos core | `pnpm --filter @borso-app/talos exec vitest run --project core --changed 9b8d380edad0b34fe301a33a097dfde3c354256d --coverage --reporter=verbose` | 0; 13 files, 155 tests, including `domain/proposal.core.test.ts > formatDecisionLine > fits the longest choice and comment the API accepts within the memory line limit` | PASS |
| C02 | @borso-app/talos back-e2e | `pnpm --filter @borso-app/talos run test:e2e --changed 9b8d380edad0b34fe301a33a097dfde3c354256d --reporter=verbose` | 0; 22 files, 145 tests, including `proposals.controller.test.ts > the proposal routes > records a choice with the longest comment the API accepts` | PASS |
| C03 | @borso-app/talos mutation | `scripts/mutate-changed.sh 9b8d380edad0b34fe301a33a097dfde3c354256d apps/talos` | 0; `proposal.core.ts` 167 killed, 0 survived, score 100.00 | PASS |
| C04 | `*.utils.ts` coverage | `git diff --name-only` for `*.utils.ts` | none touched | PASS |
| C05 | Repository tooling (`scripts/`) | `pnpm exec vitest run --changed 9b8d380edad0b34fe301a33a097dfde3c354256d --reporter=verbose` at the root | 0, "No test files found"; no test exercises the changed gate (see D03, D04) | UNVERIFIABLE |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Row 09: the longest option and comment the API accepts fit inside the memory line limit | `describe('formatDecisionLine')` › `it('fits the longest choice and comment the API accepts within the memory line limit')` at apps/talos/domain/proposal.core.test.ts:253; assertion line 261 `expect(longestLine.length).toBeLessThanOrEqual(MAXIMUM_DECISION_LINE_LENGTH);` with option and comment at their maximums. Mutation run kills every arithmetic mutant of the sum | PASS |
| D02 | Row 09: the API records a choice with the longest comment it accepts | `it('records a choice with the longest comment the API accepts')` at apps/talos/api/src/proposals/proposals.controller.test.ts:160; asserts `expect(response.status).toBe(200);` and `expect(page).toContain(\`- 2026-10-05 10:12 : acceptée (pas cette semaine) — ${comment}\`);` with `comment = 'x'.repeat(MAXIMUM_DECISION_COMMENT_LENGTH)` | PASS |
| D03 | Row 01: the gate refuses a French ADR, spec or plan | (none found). `grep -rn check-docs-are-english scripts/*.test.ts scripts/**/*.test.ts` prints nothing; the root `vitest --changed` run found no test file. Failing case: change scripts/check-docs-are-english.sh:25 `HELD_PATHS` so no path matches, or line 24 to `MINIMUM_PERMILLE=4000`; the gate then passes the French draft of `e57e309`, and no test fails. The proof in the dantotsu is a hand run. The inventory's own row 05 names the same rock, "a gate shipped without a run on a passing case", and `scripts/check-adr-gates.test.ts` is the in-repo pattern for testing a gate script in a temporary directory | FAIL (blocking) |
| D04 | Row 01: the gate passes an English document and a French file already on `main` | (none found). Failing case: delete the `origin/main` exemption at scripts/check-docs-are-english.sh:33; editing any of the 15 French files on `main` is then refused at commit, and no test fails | FAIL (blocking) |
| D05 | Row 10: a dismissal names its file, or goes to the operator | structural: the claim is skill prose an agent reads; .claude/skills/technical-validation/SKILL.md:72 `The reason names the file that holds it.` | PASS |
| D06 | Row 02: the second copy's removal is on the operator backlog | structural: docs/operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md:2 `status: open`, listed by `grep -l '^status: open' docs/operator-backlog/*.md` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths and per-process state | `git diff 9b8d380ed...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| grep -cE 'insert\(\|update\(\|delete\(\|onConflict\|transaction\('` → 0; `grep -E '^\+(let\|const) [a-zA-Z_]+ = new (Map\|Set)\|^\+let '` over the `apps/` diff → nothing. The diff adds only `const` numbers in `proposal.core.ts:11-15` | PASS |

## Blocking findings

- B09 — `check-docs-are-english.sh` has no run in `ci.yml`, so a French ADR committed without the husky hook merges green, against standard 14's whole-tree mirror rule.
- D03 — no test proves the gate refuses a French document; breaking `HELD_PATHS` or the threshold fails nothing.
- D04 — no test proves the gate passes an English document or a French file already on `main`; removing the exemption fails nothing.

## Non-blocking findings

- B10 — the commit and the dantotsu do not answer *Earning the run* in writing (measured here: 32 of the last 100 commits, 106 ever; it earns its run).
- B11 — scripts/check-docs-are-english.sh:4-8 is a history note the dantotsu link already carries.
- B12 — scripts/check-docs-are-english.sh:31 states a count ("Fourteen") that goes stale.

## Notes

- C05 is UNVERIFIABLE because the tooling workspace has no test for the changed shell gate; the substance is graded in D03 and D04.
- The script reads each path's working-tree copy, not the staged blob. Should it read `git show :<path>`? Staging a French ADR and then rewriting the working copy in English without staging it commits the French. Every other per-file check in `.husky/pre-commit` reads the working tree the same way, so this note is not graded against this branch.
- The hook's scope passes nested files such as `docs/features/x/y/spec/mockups/notes.md` (185 files on `HEAD`), but `HELD_PATHS` at line 25 holds only the 175 direct children. Is leaving nested spec material unheld intended?
- The awk tokeniser splits on `[^a-zà-ÿ]+`, measured here under mawk 1.3.4. Does it behave the same under the BSD awk of a macOS checkout? Nothing here could run that awk.
- `check-spec-records.sh` and `check-adr-criteria.sh` also have no `ci.yml` run, which predates this branch (see B09).

## Verdict: FAIL
