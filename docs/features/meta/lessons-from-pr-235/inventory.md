# Friction inventory for PR #235

PR #235 switched pragma's Sentry on in prod and moved it to one `borsofr`
project tagged `app: pragma`. Sources are its archived log at
`docs/features/pragma/sentry-shared-project/kaizen.md` (2 lines, from `main`
and `hook:no-swallowed-push`), one hook line logged after the archive, facts
the shipping session passed to this sweep, the squash commit `85a61342`, and
its CI runs, which were all green on head `a9da2f6`. The PR has no review
threads. Its one comment is the preview bot's. The archive names no subagent,
so either none ran or none was given a label (unknown).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `.claude/skills/blueprint/blueprint-context.json` showed up untracked and tripped the stop hook | archived log 15:16 `main`; PR #230 inventory row 05 saw the same file | fixed: `f90296be` (#234) ignores the file again. This PR adds a comment above the line so nobody removes it as dead. #224 deleted the generator and its ignore line together, while cloud clones restored from older snapshots still hold the file |
| 02 | implementation | The session piped `git push` into `tail` and the hook refused it | archived log 15:31 `hook:no-swallowed-push` | no-op: the hook refused it before anything ran, as designed. 103 such refusals sit in 24 of the 48 archived logs (measured), and the `guard-hooks-refuse-a-command` wall in `docs/quality/working-conditions.md` counts them |
| 03 | pr-description | The same refusal a second time | line logged after the archive, 15:44 `hook:no-swallowed-push` | merge into 02 |
| 04 | implementation | The pre-push gate failed once on `SetlistSongPicker.test.tsx` with "window is not defined". The file passed 3 of 3 runs alone | shipping session's report; fix in `85a61342` (fake `setTimeout`, `clearAllTimers` after each test) | knowledge: a-debounce-that-outlives-its-test-file |
| 05 | implementation | Four more organisms use the same `debounce` in `useMemo` and might leak the same way | `AddSongForm`, `SongSearch`, `BarPlaceSearch`, `SuggestSongField`; this sweep read their tests and ran the five files 3 times together, 25 of 25 green each time | merge into a-debounce-that-outlives-its-test-file: none of their tests leaves a timer pending, so nothing to fix |
| 06 | post-merge | pragma ran in prod with Sentry off for 17 days after #163, and nothing said so | `6385b572` (#163) maps `vars.PRAGMA_SENTRY_DSN`, which did not exist, and drops the `ALLOWED_UNSET` line of `check-frontend-env-vars.sh`; merge dates 2026-10-12 and 2026-10-29 | dantotsu: the-variable-the-workflow-set-to-nothing |
| 07 | implementation | `preview.yml` still said the DSN is a repository variable after #235 moved it to the prod environment | `.github/workflows/preview.yml` at `f90296be`; the preview job names no environment | fixed: this PR corrects the comment |
| 08 | implementation | One commit wrote the Sentry org and project into the workflows, the next read them back from variables | commits 3 and 4 of `85a61342` | no-op: the operator chose where the settings live, and #235's Decisions table records it |
| 09 | validation | No technical-validation report exists for #235 | `docs/features/pragma/sentry-shared-project/` holds only `kaizen.md` | no-op: a 24-line configuration change whose CI passed. Whether `/route` sized it below a validator is unknown |
| 10 | post-merge | Two branches wrote the same `.gitignore` line in parallel | `origin/claude/ecstatic-rubin-egofk1` is #234's branch, whose squash `f90296be` carries the line; `origin/claude/beautiful-planck-b486wd` `e0513542` is unmerged and adds it again | merge into 01: that branch drops its copy when it takes `main` |
