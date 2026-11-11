# Friction inventory: PR #252

PR #252 opened every pragma song on the same four tabs, made energy editable
in the Order screen and renamed song notes to Comments. Sources are the
archived log at `docs/features/pragma/song-tabs/kaizen.md` (6 lines, writers
`hook:no-swallowed-push` 3, `hook:no-broad-kill` 1, `main` 2), two lines logged
after the archive and pasted into the sweep's prompt, the PR's 4 commits, its
18 check runs, its 2 bot comments and `get_session` on the session. The PR has
no review thread and no validation report.

No subagent wrote a line. Whether the session dispatched any is unknown,
because the transcript was not read.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The session piped `git commit` or `git push` into another command and the hook refused it, three times in two minutes | archive 18:07, 18:07, 18:08 `hook:no-swallowed-push` | no-op: already eradicated by `64794c90` (lessons from PR #250), which rewrites the pipe with `set -o pipefail` instead of refusing it. PR #252's session ran before it merged |
| 02 | implementation | The session reached for `pkill` or `killall` | archive 18:07 `hook:no-broad-kill`; measured: 19 archived logs carry the line | no-op: PR #250's sweep, row 04, found no rewrite possible because only the caller knows its PID, and the message already gives the PID and `lsof -ti tcp:<port>` forms |
| 03 | implementation | Prettier on pragma files reformatted three unrelated files | archive 18:41 `main` | dantotsu: `prettier-ran-in-an-oxfmt-repository` |
| 04 | implementation | PR #251's session hit the same wall 56 minutes earlier | `docs/features/pragma/setlist-breaks/kaizen.md` 17:45 | merge into 03. Two tasks on one day is the systemic signal |
| 05 | implementation | A stray `.prettierrc.json` from commit `314f2482` made Prettier look like the formatter | `ls -a`; ADR 2026-10-27T2320 replaced Prettier with oxfmt | merge into 03, deleted |
| 06 | implementation | Splitting `SongChartPreviews` moved its blueprint marker and pre-commit refused the commit | archive 18:41 `main`; `blueprint-subjects.json` diff in `ccf12bda` | no-op: the refusal caught real subject drift and names the exact `blueprint-indexing.ts --accept <file>` command (read in `scripts/blueprints/subjects.core.ts`). The log's "after the push hook had already run" ordering could not be reconstructed without the transcript |
| 07 | implementation | One new icon pushed `Icon.tsx` past `max-lines` 300 and the commit was refused until `cloud` and `star` were deleted | pasted line; commit `77fa071` | dantotsu: `the-line-limit-was-the-only-dead-glyph-detector` |
| 08 | implementation | `cloud` and `star` had no caller and nothing reported them | commit `77fa071` message; knip does not track object keys | merge into 07 |
| 09 | pr | Main moved with PR #251 and conflicted on `SetlistOrderList.tsx`; pre-push warned only after the push, and CI did not run until `origin/main` was merged in | pasted line; merge commit `8cc28ea` | dantotsu: `the-conflict-warning-that-spoke-after-the-push` |
| 10 | pr | Two lines were logged after the archive commit `f3640f3` | prompt | no-op: `/open-pr`'s after-the-merge step pastes them into the kaizen prompt, and this prompt carried both (measured) |
| 11 | validation | No technical or visual validation report was committed | `docs/features/pragma/song-tabs/` holds only `kaizen.md` | no-op: the PR body records a local walk at 375 px and five screenshots. Whether `/route` chose this tier is unknown |
| 12 | ci | Every check run on the head was green; none ran before the merge commit | `get_check_runs` on `8cc28ea` | merge into 09 |
| 13 | sweep | The first draft of the Prettier hook refused `grep -rn prettier docs` | this session, proof table in the dantotsu | merge into 03, fixed before commit with a command-word match |
| 14 | sweep | The first conflict proof planted a line main had not touched, and the hook passed it | this session | no-op: a clean merge is the correct pass. The second plant conflicted and was refused |
| 15 | post-merge | The merge added no ADR | `git diff --name-only ccf12bda^ ccf12bda -- docs/adr/` is empty | no-op: nothing to stamp |
