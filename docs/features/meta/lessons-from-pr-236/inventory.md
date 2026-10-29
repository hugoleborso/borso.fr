# Friction inventory for PR #236

Sources: the archived log `docs/features/meta/preview-environment-cleanup/kaizen.md`
(two lines, both `main`), the merged session's own transcript (this sweep ran
in that session at the operator's request, so it is not a fresh look), the
pull request's CI runs and its teardown run 40907681787. The pull request had
no review threads and no red run.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The brief estimated about 200 environments; there were 398 | transcript: list before the purge | no-op: the count was measured and shown before the confirmation |
| 02 | conception | The brief said deleting an environment removes its deployments; measured, they survive | kaizen 15:49; `deployments?environment=preview-pragma-pr-98` returned 8 | knowledge: github-environments-outlive-their-pull-requests |
| 03 | implementation | WebFetch summaries of docs.github.com dropped the fine-grained permission table | kaizen 15:49 | merge into github-environments-outlive-their-pull-requests |
| 04 | implementation | `GITHUB_TOKEN` cannot get Administration write, so a PAT secret was needed | REST permissions table; workflow syntax page | merge into github-environments-outlive-their-pull-requests |
| 05 | conception | 398 environments had accumulated because teardown never deleted them | `gh api …/environments` count | dantotsu: three-hundred-and-ninety-eight-preview-environments |
| 06 | implementation | The cloud session's proxy refuses `/environments` with 403, so the work had to run locally | brief, measured by the operator | fixed: added to what-a-hosted-session-cannot-do-on-github |
| 07 | implementation | `preview-pragma-pr-235` appeared during the purge | transcript: list after the purge | no-op: an open PR's deploy recreates its environment by design |
| 08 | pr-description | KAIZEN.md opened with seven entries from an earlier task, labelled "logged earlier in this task", and the archive carried them | SessionStart log; archive printed 9 entries | dantotsu: the-friction-log-that-adopted-another-sessions-lines |
| 09 | pr-description | `gh pr create --body-file $D.body` was refused because the hook reads the command before the shell expands it | transcript: hook error | fixed: the hook names the unexpanded-variable case (same commit as row 08) |
| 10 | pr-description | That refusal was logged as "a body too thin for the template" | KAIZEN.md 15:50 `hook:open-pr` | fixed: the hook logs the reason it refused with (same commit as row 08) |
| 11 | pr-description | The PR body checker refused the `<app>` placeholder | transcript: check-pr-body output | no-op: the gate worked and the fix took one edit |
| 12 | post-merge | PR #236's teardown skipped all six environments with 404, so the token is not proven | run 40907681787 | merge into github-environments-outlive-their-pull-requests (documented as unproven until a PR with a live preview closes) |
| 13 | post-merge | The operator asked for the kaizen in the shipping session, against the skill's rule | merge hook notice | no-op: the operator's explicit choice; recorded in the sources line above |
| 14 | post-merge | A local session reports no token usage, so the cost row is unknown | `get_session self` | no-op: recorded as unknown in feature-cost.md |
