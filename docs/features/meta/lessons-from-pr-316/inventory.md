# Friction inventory, PR #316

PR #316 landed the Dependabot batch (minor-and-patch group, `@hono/node-server`
2, hono 4.13.16) and moved the four API Lambdas to `@hono/aws-lambda`. Sources:
the archive `docs/features/meta/dependabot-2026-11-12/kaizen.md` (one line, by
`scripts/kaizen.sh sweep-input 5dc75b21c`), two lines the kaizen prompt pasted,
the four commits, the round 1 validation report, the check runs of PR #316 and
of the three Dependabot pull requests, and `get_session` on the merged session.
The pull request has no review thread and no human comment.

All three log lines were written by hooks or the validator, none by the main
session. The merged session spawned one agent, the validator, and its line
names its label.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | The session's first act was a merge of a Dependabot pull request, and `merge-on-moved-base` refused it because `main` had moved under its CI | archive line `[17:20] hook:merge-on-moved-base`; session created 17:19:22 (`get_session`) | no-op: the hook refused the untested combination it exists to refuse, and the session took the reversible step it named |
| 02 | post-merge | That pull request's own CI was red (`build`), and no hook refuses a merge on a red check; `main` has no branch rule (`rules/branches/main` returned `[]`, `protected: false`) | check runs of #311 and #267 heads list `build` as failed (measured) | dantotsu: a-red-pull-request-only-luck-kept-off-main. The operator chose on 2026-11-12 that a merge waits for green |
| 03 | implementation | hono 4.13.9 marked `hono/aws-lambda` `@deprecated`, so a patch bump failed `typescript/no-deprecated` and the build | commit `3349ad5`; ADR-2026-11-12T1724 | no-op: the ADR records the move and the lint did its job; `@hono/aws-lambda` 1.0.1 accepts hono 5 |
| 04 | implementation | #267 and #269 sat red for a week (opened 2026-11-05) and #311 since 01:35, so the batch was rebuilt by hand on one branch | `gh api pulls/267`, `269`, `311` created and closed timestamps | no-op: the weekly Dependabot cadence and the five-pull-request cap in `.github/dependabot.yml` are the operator's choice; nothing broke while they waited |
| 05 | pr-description | `api-validation` refused the pull request until a technical-validation report was committed | pasted line `[17:24] hook:api-validation` | no-op: the gate the operator scoped on 2026-11-05 fired as designed; the round it forced found B14, two stale knowledge pointers |
| 06 | validation | `vitest --changed` reads no lockfile or catalog change, so 42 upgrades ran one pragma test file locally | pasted line `[17:29] technical-validator`; report note under *Notes* | fixed: validator runs the full core suite of each affected app when the lockfile or catalog moves (`.claude/agents/technical-validator.md`) |
| 07 | validation | The validator ended its report with a question to the operator, whether to hold the merge until CI is green | report *Notes*, first bullet | merge into 06: with the full core run the gap the question covered is closed locally, and the e2e suite is CI's by CLAUDE.md |
| 08 | post-merge | Measuring row 06's cost, the sweep ran pragma's full core suite and it failed: `RequireSession.test.tsx` flakes about one run in seven | 2/20 on `main`, 3/20 at `b9d8f4651`, 4/20 with #315 reverted, 0/30 after the fix (measured) | dantotsu: a-retry-test-that-waited-a-fixed-number-of-turns |
| 09 | post-merge | A first reading blamed PR #316's react-query bump for the flake (0/12 before against 2/12 after, run concurrently); sequential runs showed it predates #316 | this sweep's runs | merge into 08: the dantotsu records the bisection, and the claim never left this session |
| 10 | validation | One round, PASS, one non-blocking finding fixed before merge | `technical-validation-2026-11-12-1735.md` | no-op: nothing failed |
| 11 | post-merge | The ADR the merge added already reads `accepted` in the file and the index | `docs/adr/2026-11-12T1724-*.md:3`, `docs/adr/README.md:120` | no-op: nothing to stamp |
