# Friction inventory of PR #345

PR #345 cleared pragma's Sentry issues BORSOFR-N and BORSOFR-Q and set the `sentry-issues-open` ceiling to 0. It merged on 2026-11-14 as `c373c02`.

Sources read: `scripts/kaizen.sh sweep-input c373c02` (1 line, in `docs/features/pragma/sentry-issues-to-zero/kaizen.md`), the line pasted from after the archive, the 7 commits, the one pull-request comment (the preview bot), the 20 check runs, the technical-validation report and the open kaizen pull requests #340, #341, #344 and #346.

Writers of the 2 lines: `main` 1, `hook:api-validation` 1. The technical validator ran and logged nothing (measured, the archive has no `technical-validator` line). No implementation subagent was spawned (inferred, every commit names one session).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | A back-e2e test hardcoded the DSQL retry count 3, so raising the count failed in `tasks.controller.test.ts`, far from the change. | `kaizen.md` 22:58 `main`; commit `26b2181` | no-op: fixed in #345, where the test imports `CONFLICTED_WRITE_MAX_ATTEMPTS`. The three give-up callers of `abortCommitsWritingTable` now all import it, and the other eleven pass 1 or 2 to test a recovery (measured, `grep -rn "abortCommitsWritingTable(" apps/pragma`). |
| 02 | pr-description | `api-validation` refused the pull request, which changed `apps/pragma/api/` with no review report. | pasted line 23:00 `hook:api-validation`; report `technical-validation-2026-11-14-2300.md`; PR opened 23:12 | dantotsu: tier-one-ended-on-a-review-that-needs-a-spec-it-never-wrote |
| 03 | conception | The spec and plan were committed after both fixes, so the review read a spec written from the code. | commits `26b2181` and `1d61db5` at 22:58, `a1fa62d` (spec and plan) at 23:00:49 | merge into tier-one-ended-on-a-review-that-needs-a-spec-it-never-wrote |
| 04 | process | The same refusal appears in five earlier sweeps, each recorded as a no-op because the hook held. | `inventory.md` of PRs #292 row 25, #293-298 row 21, #302 row 03, #316 row 05, #324 row 06, and #339 row 02 on the open PR #340 | merge into tier-one-ended-on-a-review-that-needs-a-spec-it-never-wrote |
| 05 | validation | Two cases of an `it.each` printed the same test name (B14, non-blocking). | report row B14; commit `1765d46` | no-op: fixed in #345 by `1765d46` before the pull request opened |
| 06 | implementation | The commit header `docs(docs):` repeats its type as its scope. | commit `6076ca4` | no-op: `docs` is a listed scope and the file it changed, `docs/quality/targets.md`, sits outside any app |
| 07 | pr-description | The cause of OC001, previews migrating on the shared cluster, is inferred and not measured. | PR body, *Notable* | no-op: labelled inferred as CLAUDE.md asks. Moving previews off the cluster is an architecture call the spec leaves to the operator |
| 08 | post-merge | Coordination with an open sweep: PR #340 rewrites the same block of `pretool-api-change-needs-validation.sh`. | `git diff origin/main...origin/claude/lessons-from-pr-339` | fixed: this sweep drops its drafted hook line and edits only `/route`, so the two pull requests do not conflict |
| 09 | deploy | none. Every check run on the head passed on the first run. | 20 check runs on `65b2bc0` | no-op: nothing failed |

Counts: 1 dantotsu, 2 merged into it, 1 fixed, 5 no-op, 0 knowledge.
