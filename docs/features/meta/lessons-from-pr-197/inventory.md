# Friction inventory — PR #197

PR #197 (squashed as `9dcf7454`) gave every hook a runtime budget and met it with faster tools: oxlint and oxfmt replaced ESLint and Prettier, and TypeScript 7 replaced 5.9. The primary input is the friction log archived at [`docs/features/meta/tool-runtime-budgets/kaizen.md`](../tool-runtime-budgets/kaizen.md): 17 lines from two writers, `runtime-budgets` (2) and `rework-197` (15). The other sources are the branch's 32 commits, its 14 `ci` runs on GitHub, the session transcript, and the pull request, which carries no review threads and whose last run on the head was green.

The session's own `KAIZEN.md` holds no line from `rework-197`, `tools-eval` or `runtime-budgets`: the branch archived its log into the tree before each sweep could need it, which is the arrangement CLAUDE.md asks for. `tools-eval` logged nothing anywhere.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `check-claude-harness-active` refused a session whose `.claude` hooks visibly ran, because the main checkout's SessionStart predated the `--record` line and the worktree shares its git directory. | kaizen.md 14:31 (`runtime-budgets`) | no-op: transient; a session started after `b806f790` records itself at SessionStart, and the refusal names the one command, `--acknowledge`, that clears it |
| 02 | implementation | Pre-push timings swung from 55 s to 323 s on the same fixture while other sessions loaded the machine, and pragma's tests timed out. | kaizen.md 15:28 (`runtime-budgets`) | no-op: standard 14 keeps every local budget on CPU time for this reason (`9dcf7454`), and the pre-push gate limit is the eradication of the-gates-that-timed-each-other-out |
| 03 | implementation | An npm alias of `typescript@7` beside `typescript@5` shadowed the `tsc` binary of every workspace that declared both. | kaizen.md 01:34 (`rework-197`) | fixed: `9dcf7454` removed TypeScript 5.9 entirely (ADR-0046), so no workspace can declare two |
| 04 | implementation | oxlint reports a directive for a type-aware rule as unused whenever it runs without `--type-aware`. | kaizen.md 01:34 | no-op: knowledge oxlint-without-type-aware-reads-type-aware-directives-as-unused, added in `9dcf7454`, triggered by the output |
| 05 | implementation | oxlint's native `react/purity`, `unicorn/consistent-function-scoping`, `jsx-a11y/autocomplete-valid` and `jsx-a11y/no-autofocus` disagree with the plugins they port, and `@oxlint/migrate` maps them as equivalent. | kaizen.md 01:34 | fixed: `9dcf7454` runs the upstream rules as aliased JavaScript plugins; standard 12 tabulates each disagreement |
| 06 | implementation | oxlint places a JavaScript plugin's report on a comment one line above the comment. | kaizen.md 01:34 | merge into 07 |
| 07 | implementation | oxlint turns ESLint's column -1 into an offset on the previous line, so `eslint-comments` reports one line early and crashes on line 1. | kaizen.md 02:09 | fixed: `9dcf7454` (`fix(meta): the directive rules report on the right line`), recorded in standard 12 |
| 08 | implementation | A blanket `/* eslint-disable */` silenced `no-unlimited-disable`'s own report. | kaizen.md 02:09 | fixed: `9dcf7454` runs oxlint's own `no-unlimited-disable`, and a gate canary plants a blanket disable |
| 09 | implementation | oxlint reports React hooks rules as `react-hooks(rule)` while the configuration names them `react/rule`. | kaizen.md 02:09 | fixed: `9dcf7454` translates the name in `lint-configuration.core.ts`, held by its tests |
| 10 | implementation | JavaScript plugins load eagerly even inside an override, so `eslint-plugin-react-hooks` adds about 0.3 s to every oxlint run. | kaizen.md 01:34 | no-op: recorded in standard 14 and inside the commit budget, which the CI job measures |
| 11 | implementation | `pnpm why typescript -r` did not show `@stryker-mutator/core`, which imports `typescript` undeclared, so dropping 5.9 broke every mutation run and only the slow canaries showed it. | kaizen.md 08:11 | no-op: knowledge stryker-imports-typescript-without-declaring-it, added in `9dcf7454` with output triggers, and `stryker.shared.js` names no tsconfig |
| 12 | implementation | CI's `pre-commit-budget` fixture read 2732, 2274 and 2427 ms on reruns of one commit, every check's CPU moving by the same factor, so one runner sample cannot tell a regression from a slower machine. | kaizen.md 08:46; standard 14 measurement table | dantotsu: one-sample-could-not-tell-the-hook-from-the-runner |
| 13 | implementation | Inside a git hook `GIT_DIR` is set, so `git -C <dir> rev-parse --show-toplevel` answered the hook's folder, and a script finding its root that way read the wrong tree only under the hook. | kaizen.md 13:12; transcript: `lint-staged-files.sh` fixed with `cd "$(dirname "$0")/.."` | knowledge: git-sets-git-dir-inside-a-hook; `scripts/lint-workspace.sh` carried the same line and is fixed in this pull request |
| 14 | implementation | The eslint-cache PostToolUse hook fired on a grep of the standards naming a typescript-eslint rule, and told the agent to delete an ESLint cache in a repository that no longer runs ESLint. | kaizen.md 13:18; reproduced on `9dcf7454` with a grep payload | fixed: the hook counts only a line of ESLint's report, a silent row in `check-hook-decisions.sh` holds it, and the knowledge entry's trigger is narrowed the same way |
| 15 | implementation | `disable-directives.test.js` planted its fixtures in the real tree, so knip beside it in the pre-push wave reported them unused. | kaizen.md 13:27 | fixed: `9dcf7454` (`fix(meta): plant the directive test's files in a tree of links`) |
| 16 | implementation | `check-coupled-lists` kept triggering on `scripts/`, `.husky/` and `.github/` for months after it stopped reading them; nothing ties a scope to what a check reads. | kaizen.md 14:50 | fixed: `9dcf7454` narrowed the scope. The general tie stays a reviewer bullet in standard 14: an over-wide scope only costs CPU, which each check's budget measures, and a too-narrow one is backstopped by the whole-tree run in `ci.yml` |
| 17 | implementation | Pre-push gated 149 files and mutated pragma for 8 minutes on a push whose own work was 8 files, after merging a one-line main commit. | kaizen.md 15:21; replayed on `68cc7783` against remote `53d00219`: 149 files before, 8 after | dantotsu: the-merge-that-re-gated-the-whole-branch |
| 18 | implementation | The eight-minute pragma mutation run. | transcript; kaizen.md 15:21 | merge into the-merge-that-re-gated-the-whole-branch |
| 19 | validation | The pre-push range had been fixed four times, each replayed by hand and never kept as a test. | docs/dantotsus: a-stale-ref, a-force-push, the-scoped-gate, the-fetch | merge into the-merge-that-re-gated-the-whole-branch (each case is now a test) |
| 20 | validation | CI `pre-commit-budget` failed on `d6d17820` at 3.8 s against 3 s; the tooling type check ran for a shell script. | transcript; commit `b2820315` | merge into one-sample-could-not-tell-the-hook-from-the-runner (the scope itself was fixed in `9dcf7454`) |
| 21 | validation | CI run 933 failed `pre-commit-budget` at 3553 ms against 3500 ms. | ci: run 40520145502 | merge into one-sample-could-not-tell-the-hook-from-the-runner |
| 22 | validation | Runs 927, 932 and 934 were re-run 3, 3 and 6 times, every attempt green, to sample the runner by hand. | ci: run attempts listed with `gh api …/attempts/<n>/jobs` | merge into one-sample-could-not-tell-the-hook-from-the-runner (the job now samples three times itself) |
| 23 | implementation | Five commits cut CPU and rescheduled the hook's checks to win back margins of about 200 ms. | commits `b2820315`, `71e001f1`, `72c2046b`, `babc5443`, `2f3f6876` | merge into one-sample-could-not-tell-the-hook-from-the-runner |
| 24 | validation | A subagent pushed, listed every local gate it ran, reported "Nothing is failing", and `pre-commit-budget` was red on that push. | transcript: hand-back before the d6d17820 failure; operator message | merge into one-sample-could-not-tell-the-hook-from-the-runner (pre-push now says CI has not run on the sha) |
| 25 | validation | The operator raised the commit budget from 3.5 s to 4 s. | commit `0fb7c241`; ADR-0045 | no-op: an operator decision, recorded in ADR-0045 |
| 26 | validation | Runs 917 to 921 were cancelled. | ci: runs 40439518356 to 40442173965 | no-op: a newer push superseded each, which is the workflow's concurrency setting working |
| 27 | post-merge | The eslint-content-cache knowledge entry said `.husky/pre-commit` runs ESLint, and its trigger matched any output naming the rule. | `docs/knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md` on `9dcf7454` | merge into row 14 |
| 28 | post-merge | No review comments and no review threads on the pull request. | `get_review_comments`: 0 threads | no-op: nothing to sweep |

## Counts

| Decision | Rows |
| --- | --- |
| dantotsu | 2 (12, 17) |
| knowledge | 1 (13) |
| fixed in this pull request | 1 (14) |
| fixed in PR #197 itself (`9dcf7454`) | 7 (03, 05, 07, 08, 09, 15, 16) |
| merge | 9 (06, 18, 19, 20, 21, 22, 23, 24, 27) |
| no-op | 8 (01, 02, 04, 10, 11, 25, 26, 28) |
