# Friction inventory for PR #178

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | The operator closed a vote and the setlist page showed no song. | transcript: screenshot of *Set frappadingue de bar* | dantotsu: the-closed-vote-left-its-setlist-empty |
| 02 | implementation | The fix shipped without a test proving the setlist refetches. | commit: ca26e82 | merge into the-closed-vote-left-its-setlist-empty |
| 03 | implementation | `tsc -p site` failed because a site folder has no tsconfig; the app's tsconfig sits at the app root. | transcript: TS5057 | no-op: one wrong guess, corrected on the next call, and `CLAUDE.md` pre-push already names the per-app `tsc` |
| 04 | implementation | A `git push` piped into `tail` was refused by `hook:no-swallowed-push`. | KAIZEN.md, 20:31 | no-op: the hook worked as designed and printed the command to run |
| 05 | implementation | rtk did not install at SessionStart, GitHub API rate-limited. | SessionStart log | no-op: the hook already says it breaks nothing and how to pin a version |
| 06 | validation | The fix was not checked in a browser before merge. | PR #178 body | merge into the-closed-vote-left-its-setlist-empty: its test now proves the refetch without a browser |
| 07 | post-merge | The first kaizen draft aimed at a lesson; the operator asked for an eradication from tools, following the Notion agentic dantotsu frame. | transcript | fixed: this pull request adds `after-task-kaizen/dantotsu-frame.md` and makes level 5 unacceptable for a defect |
