# Friction inventory for PR #230

PR #230 kept three items from the closed kaizen PR #177, in a session that first closed the stale kaizen PRs #177 and #179. Sources are its archived log at `docs/features/meta/salvage-kaizen-177/kaizen.md` (2 lines, 2 writers), one line logged after the archive, the operator's messages, its 3 commits and its CI runs, which were all green. This sweep runs in the same session as the PR, at the operator's request.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `scripts/kaizen.sh list` logged the word `list` as friction | archived log 12:24 `main`, removed by hand before the archive | dantotsu: the-friction-log-that-recorded-a-typo |
| 02 | implementation | The session piped `git push` into `tail`, then piped `git commit` the same way in a later call | archived log 12:24 `hook:no-swallowed-push`, and the same line logged after the archive | no-op: the hook refused both before anything ran. PR #228's sweep logged the same row |
| 03 | pr-description | The first PR body draft had a 216-character Validation item | `check-pr-body.ts` refusal, this session | no-op: the budget gate caught it on the first draft |
| 04 | implementation | commitlint warned `footer-leading-blank` on both commits | commit hook output, this session | no-op: a warning, not a refusal, and the CI commitlint check passed |
| 05 | post-merge | A stale `.claude/skills/blueprint/blueprint-context.json` made the stop hook ask twice to commit it, and auto mode refused its deletion | stop hook messages; auto mode refusal | no-op: a container leftover from before #224 removed its generator. Deleted on the operator's go, and nothing in the repo writes it now |
| 06 | conception | The operator said the first report on #177 and #179 was not clear and asked for a table of item, relevance and effort | operator message | no-op: first correction of its kind. `CLAUDE.md` turns a repeated correction into a hook or a doc |
| 07 | conception | Kaizen PRs #177 and #179 stayed open two weeks, until main moved under them and they conflicted | PR dates 2026-10-13 and 2026-10-14; `git merge-tree` conflicts | no-op: when to merge a kaizen PR is the operator's call. Raised under Patterns |
| 08 | post-merge | The operator chose to run this sweep in the shipping session, against the `CLAUDE.md` rule of a new conversation | operator message | no-op: an operator decision, as on PR #228 |
| 09 | post-merge | The merge event reached the session about 40 minutes after the merge | notification queued 13:14 UTC; merge just after 12:32 UTC | no-op: no action waited on it |
