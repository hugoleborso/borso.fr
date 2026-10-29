# Friction inventory for PR #228

PR #228 was the kaizen of PR #224. Sources are its archived log at `docs/features/meta/lessons-from-pr-224/kaizen.md` (2 lines, 2 writers), the operator's corrections in the session, its 5 commits and its CI runs, which were all green. This sweep runs in the same session as the PR, at the operator's request.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | validation | Proof runs fed to a guard hook logged their refusals to `KAIZEN.md` | archived log 10:40 `main` | no-op: fixed in PR #228, where `/after-task-kaizen` step 5 names `KAIZEN_LOG_REFUSALS=0` |
| 02 | implementation | The sweep piped its own `git commit` into `grep` | archived log 10:41 `hook:no-swallowed-push` | no-op: the hook refused it as designed |
| 03 | implementation | The sweep added a PR title workflow and a dantotsu for a cosmetic commit header. The operator removed both | operator message; the `revert(ci)` commit on PR #228 | fixed: the skill's "Knowledge is enough" reframe now says that a defect costing no one anything is a no-op, not a new gate |
| 04 | pr-description | The operator asked why "Never --no-verify" left `CLAUDE.md`. The reason was only in a commit message | operator message | no-op: the operator agreed with the reason, and a body budget of 700 characters cannot carry every removed line |
| 05 | post-merge | `spawn_task` called right after the merge timed out after 60 s | this session, measured | fixed: `CLAUDE.md`, `/open-pr`, `/after-task-kaizen` and the merge hook's notice now say to propose the kaizen and call `spawn_task` once the operator approves |
| 06 | post-merge | Reusing the merged branch name needed a force-push, and auto mode refused it | this session, measured | no-op: the follow-up went to a fresh branch, `claude/lessons-from-pr-228` |
| 07 | post-merge | `get_session` usage on a resumed session matched only the latest resume. `cache_write_tokens` equalled `used_tokens` at 281,772 | `get_session` on `session_01K69KnC3z5ZgBCLywzoUmpj`, worker epoch 4 | knowledge: reading-another-sessions-transcript-with-list-events now says a running or resumed session's usage may cover only its latest resume (inferred) |
| 08 | post-merge | `main` carries a second header with a scope as its type, `pragma: UX redesign (#216)` | `git log origin/main` | no-op: the operator decided a non-conventional title does not warrant a gate |
