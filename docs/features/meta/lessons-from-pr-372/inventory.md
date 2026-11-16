# Friction inventory, PR #372

The archived log `docs/features/pragma/song-edit-button/kaizen.md` holds no
line, because it was archived before visual validation ran.
`scripts/kaizen.sh sweep-input 1a3683fa` returns 0 lines. The three lines below
were logged after the archive. This sweep ran in the shipping session at the
operator's request, so its transcript is a source too.

Writers: `hook:visual-validation` 1, `visual-validator` 1, `main` 1. No line
reads `main` for an agent's wall, so the one subagent was told its label.

| # | When | Friction | Sources / evidence | Rock | Decision |
| --- | --- | --- | --- | --- | --- |
| 01 | validation | `scripts/phone.sh touch` exited 1 on a tap that reached its target, with the page left 1280 px wide | log line `visual-validator` 16:37; 2 failures in 6 runs reproduced by the sweep | `touch-tap.ts` exits without waiting for its CDP session to detach, and the late detach drops the viewport `phone.sh` re-applied | dantotsu: the-tap-that-closed-the-door-after-it-left |
| 02 | post-merge | The operator asked to run the kaizen here, and the session asked him to confirm it first | log line `main` 18:11; transcript, "Ici quand même ... je demande ça aux agents 25% du temps" | CLAUDE.md, `/after-task-kaizen` and `/open-pr` forbade the sweep in the shipping session even when he asks | fixed: the commit adding this file lets the shipping session run it when the operator asks, without asking again |
| 03 | pr-description | `create_pull_request` was refused because no visual-validation report was committed | log line `hook:visual-validation` 16:35 | none to remove. The hook is the gate, and it refused before anything shipped | no-op: the gate did its job, and `/route` already lists visual validation for a front-end change |
| 04 | implementation | The session skipped `/route` on a change that touched five files | transcript | a written rule with no hook | merge into 03: the only cost was finding the validation step at the PR, which the hook caught |
| 05 | validation | `/visual-validation` needs a `spec.md`, so a spec was written after the code | commit `5cdef6a7` | none. The spec is the validator's only input, by design | no-op: twenty lines, and it gave the validator its eight assertions |
| 06 | implementation | Local tests ran by file name and missed `SongDetailPage.test.tsx`, which asserted the old menu | pre-push `tests-pragma` failed once, then passed | none to remove. The pre-push gate runs `vitest --changed` | no-op: the gate caught it in 68 s, before anything left the machine |
| 07 | implementation | Two tests asserted "no edit button beside the menu", a product choice the operator reversed | `SongDetailHeader.test.tsx`, `SongDetailPage.test.tsx` | none. A test that pins a product choice changes with it | no-op: the expected cost of reversing a product choice |
| 08 | validation | The validator saved passing screenshots in the committed evidence folder, and the main session moved them to `.pending-upload/` by hand | transcript | none. `/visual-validation` step 7 says to move them, and the main session had read only to step 6 | no-op: the step exists and was followed once read |
| 09 | validation | The Stop hook asked to commit untracked files while the validator was still writing them | transcript | the hook cannot see a running subagent | no-op: one turn, handled by committing the spec by explicit path |
| 10 | pr-description | A Validation item was 101 countable characters against a limit of 100 | `check-pr-body.ts` output | none. The checker is the gate | no-op: one word cut |
| 11 | post-merge | Two lines were logged after the archive and had to be pasted into the kaizen prompt by hand | `sweep-input` returned 0 lines | the archive runs before validation and the PR, which still produce friction | no-op: the paste rule covers it, and this sweep ran in the session that holds the lines |
| 12 | post-merge | The sweep reached for `pkill` to stop the scratch HTTP server it started, and the hook refused it | log line `hook:no-broad-kill` 18:10 | none. The hook is the gate and names the kill by port or pid | no-op: refused before it ran, fixed on the next call with `kill $(lsof -ti tcp:8765)` |
| 13 | post-merge | The sweep changed the same-session kaizen rule in CLAUDE.md and two skills, missed a copy in the merge hook, and the operator saw it only after the merge | transcript, "C'est bête de s'en rendre compte après" | the hook kept its own copy of a CLAUDE.md rule, so one rule lived in four places | fixed: the hook now points to CLAUDE.md's Self-improvement loop instead of restating it |
