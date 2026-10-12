# Friction inventory: the weekend fan-out

Swept: merged #156, #159, #161, #162, #163, #164, #165, #166, #169; closed
#157, #124 to #127 and #152; open #118. Primary input is
[`kaizen.md`](./kaizen.md), the consolidated friction log of twelve agents
plus this sweep's own two lines. No review threads were left on the merged
pull requests; the only CI comments were the DSQL schema quota on #164 and
#165.

## Grouped by writer

| Wall | Writers | Entry |
| --- | --- | --- |
| Worktree guard and rtk refuse git and compound commands | dantotsu-races, knowledge-triggers, weak-point-build, gate-canaries, dantotsu-api-imports, helix-pilot (2), sentry, kaizen-sweep | D3 + K1 |
| Pre-push timeouts and OOM under load | pr-118 (2), merge-queue (2), dantotsu-rate-limit, dantotsu-api-imports, sentry | D2b |
| Shared local Postgres database | pr-118, merge-queue, dantotsu-rate-limit, sentry | D1 |
| `@borso/infra` not built in a fresh worktree | pr-118, sentry | D4 |

## Rows

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | 53 of 168 dantotsus carried no resolvable fix commit, and nothing validated the front matter | kaizen: weak-point 12:33 | no-op: eradicated by #162, which shipped `check-dantotsu-front-matter.ts` in pre-commit and CI |
| 02 | implementation | a helper script that changed into the repository wrote its output there by relative path | kaizen: dantotsu-audit 12:35 | no-op: an agent's throwaway script; the fan-out rules already put every scratch file in the scratchpad, and the file was not committed |
| 03 | implementation | a shallow session clone made every old fix commit read as dangling | kaizen: dantotsu-audit 12:35 | dantotsu: a-shallow-clone-reads-every-old-fix-as-missing |
| 04 | implementation | the docs link check reads every markdown file in the working tree, so a code-only commit failed on an unstaged doc's link to an untracked file | kaizen: dantotsu-races 13:58 | no-op: one occurrence, and the failing link was in the agent's own uncommitted doc; staging the doc with the code it describes is the commit shape the check expects |
| 05 | implementation | a concurrent back-e2e test passed racy code until it opened its pool connections first | kaizen: dantotsu-races 13:58 | no-op: recorded in #161's own entry, `five-monkeys-at-a-three-seat-table.md` |
| 06 | implementation | the worktree guard refused commands mixing git with pipes, globs or heredocs | kaizen: dantotsu-races 13:58 | merge into the-rewrite-that-hid-git-from-the-guard |
| 07 | ci | `test:coverage` passed locally, CI's `test:core` coverage failed on a schema callback covered only by back-e2e | kaizen: dantotsu-races 14:20 | dantotsu: two-coverage-gates-answered-to-one-name |
| 08 | implementation | pre-commit ESLint reported unresolved types in a fresh worktree because `@borso/infra` had no `dist/` | kaizen: pr-118 00:33 | dantotsu: the-worktree-that-could-not-see-its-own-infra |
| 09 | implementation | a push that merged main mutated 81 talos files main had changed | kaizen: pr-118 00:53 | dantotsu: the-fetch-that-undid-the-narrowing |
| 10 | implementation | talos mutation beside every app's tests timed out four unrelated tests | kaizen: pr-118 01:48 | dantotsu: the-gates-that-timed-each-other-out |
| 11 | implementation | pre-push typecheck OOM-killed while sibling agents ran mutation | kaizen: pr-118 02:48 | merge into the-gates-that-timed-each-other-out |
| 12 | implementation | parallel worktrees ran pragma back-e2e against one database, 76 failures | kaizen: pr-118 04:32 | dantotsu: four-worktrees-one-test-database |
| 13 | implementation | infra-cdk dsql-schema test passed its 30 s timeout under four Stryker runs | kaizen: merge-queue 02:08 | merge into the-gates-that-timed-each-other-out |
| 14 | implementation | four Stryker runs, a coverage suite and app suites at once; three attempts for one push | kaizen: merge-queue 04:01 | merge into the-gates-that-timed-each-other-out |
| 15 | implementation | two worktrees shared one pragma database | kaizen: merge-queue 04:39 | merge into four-worktrees-one-test-database |
| 16 | implementation | PostToolUse hooks printed plain stdout, which goes to the debug log, and a failing call fires PostToolUseFailure | kaizen: knowledge-triggers 13:34 | no-op: fixed in #159, the pull request that found it, which registers the hooks on both events |
| 17 | implementation | the worktree guard refused compound commands, heredocs and loops | kaizen: knowledge-triggers 13:34 | merge into the-rewrite-that-hid-git-from-the-guard |
| 18 | implementation | a test rendering its subject at `describe` level hid 66 mutants | kaizen: weak-point-build 14:01 | knowledge: how-a-mutation-survivor-hides, extended |
| 19 | implementation | the guard refused a heredoc or `python -c` whose text mentions git | kaizen: weak-point-build 14:01 | knowledge: the-worktree-guard-reads-shell-text |
| 20 | implementation | v8 counts each `?? ''` after a capture group as a branch | kaizen: weak-point-build 14:01 | no-op: one occurrence, solved in #162 with a helper that throws on the impossible case, which is the shape the purity standard already asks for |
| 21 | implementation | parallel worktrees shared one cluster and database; 503s | kaizen: dantotsu-rate-limit 13:44 | merge into four-worktrees-one-test-database |
| 22 | implementation | pre-push timeouts with the load average at 40 | kaizen: dantotsu-rate-limit 15:12 | merge into the-gates-that-timed-each-other-out |
| 23 | implementation | the typescript-eslint project service reported a planted file not found after it was deleted and re-created in one process | kaizen: gate-canaries 13:59 | no-op: only the canary runner deletes and re-creates a linted path within one ESLint process, and #164 merged with its canaries green, so nothing outside that runner can hit it |
| 24 | implementation | the guard refused `prettier --check` because an argument contained `.github` | kaizen: gate-canaries 13:59 | merge into the-rewrite-that-hid-git-from-the-guard (the rewritten `rtk` launcher was what the guard could not read past) |
| 25 | implementation | `prettier --write` over an app folder reformatted unrelated files | kaizen: dantotsu-api-imports 14:48 | no-op: pre-commit checks staged files by design (CLAUDE.md, Hooks); format the files you change, not the folder |
| 26 | implementation | the guard refused for-loops, pipes into sed and heredocs | kaizen: dantotsu-api-imports 14:48 | merge into the-rewrite-that-hid-git-from-the-guard |
| 27 | implementation | talos `App.test.tsx`'s 4 s `flushUntil` timed out beside four mutation suites | kaizen: dantotsu-api-imports 15:32 | merge into the-gates-that-timed-each-other-out |
| 28 | implementation | the guard refused read-only globs, loops and chained git | kaizen: helix-pilot 12:33 | merge into the-rewrite-that-hid-git-from-the-guard |
| 29 | implementation | rtk turned every git call into `rtk git`, which the guard refused | kaizen: helix-pilot 12:33 | dantotsu: the-rewrite-that-hid-git-from-the-guard |
| 30 | implementation | banana-rush `dev:db` drops every table before migrating | kaizen: helix-pilot 12:47 | no-op: `dev:db` is the reset command by design, and the only caller that ran it per invocation was the closed #157 pilot |
| 31 | implementation | plain git refused because rtk prefixes it | kaizen: sentry 12:31 | merge into the-rewrite-that-hid-git-from-the-guard |
| 32 | implementation | pragma typecheck failed with TS2307 in a fresh worktree; `test:core` builds infra, `typecheck` did not | kaizen: sentry 12:42 | merge into the-worktree-that-could-not-see-its-own-infra |
| 33 | implementation | pragma back-e2e failed 49 tests while another process used `pragma_test` | kaizen: sentry 13:54 | merge into four-worktrees-one-test-database |
| 34 | implementation | `check-instructions-name-installed-tools` failed once without naming the file, then passed unchanged | kaizen: sentry 14:09 | no-op: one occurrence and not reproduced; with nothing to reproduce there is no cause to fix |
| 35 | implementation | eight first-test timeouts in infra/cdk and eslint-rules suites under parallel gates | kaizen: sentry 14:25 | merge into the-gates-that-timed-each-other-out |
| 36 | conception | ADR numbers reserved by message drifted: main took 0028, Sentry moved to 0031, #118 to 0032 to 0034 | transcript: coordinator brief; `docs/adr` on main | dantotsu: the-reservation-nobody-else-could-read |
| 37 | deploy | preview deploys failed with `more than 10 schemas not allowed` | comment on #165; #164 | no-op: eradicated by #169's schema budget |
| 38 | implementation | the guard refused a python heredoc that edited a TypeScript file mentioning `runGit` | kaizen: kaizen-sweep | merge into the-worktree-guard-reads-shell-text |
| 39 | implementation | testing the edited rtk hook through a live call was denied as self-modification | kaizen: kaizen-sweep | no-op: the classifier is right to stop an agent exercising a hook it just changed; the hook was tested by feeding it JSON from a script instead |
