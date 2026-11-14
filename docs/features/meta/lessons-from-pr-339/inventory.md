# Friction inventory, PR #339

PR #339 added a "to play" song status to the pragma catalogue and anchored the merge-deploys-prod hook to the project root. It merged on 2026-11-14 as `a5893533d`.

Sources read: the archived log `docs/features/pragma/song-status-to-play/kaizen.md` (8 lines, all added by this merge, per `scripts/kaizen.sh sweep-input`), the five squashed commits, the pull request's comments (the preview bot only) and review threads (none), its check runs (all green or skipped), both technical-validation reports, and the open `kaizen` pull requests #334 and #336 (no row overlaps).

Writers of the 8 lines: `main` 1, hooks 3 (`no-broad-kill`, `api-validation`, `no-prettier`), `technical-validator` 2, `technical-validator-2` 2. No implementation subagent was spawned (inferred, every commit names one session).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `pkill` or `killall` was reached for on a shared machine. | `kaizen.md` 20:32, `hook:no-broad-kill` | no-op: the hook refused it, which is its eradication working; the same row in the sweep of PR #324 reached the same verdict |
| 02 | pr-description | A pull request changing the API was about to open before a technical-validation report existed. | `kaizen.md` 20:34, `hook:api-validation`; first report at 20:52, PR opened 21:18 | no-op: the hook held the order, and both reports came first |
| 03 | implementation | `pretool-merge-deploys-prod.sh` was declared by a relative path, so it exited 127 and let every Bash call through after a `cd`. | `kaizen.md` 20:38; `git log -S` shows the path relative since `5d140956d` (2026-09-14) | dantotsu: the-merge-guard-that-a-cd-switched-off |
| 04 | validation | `origin/main` moved during round 1, so a `--changed` base read from it later ran #333's tests. | `kaizen.md` 20:52; report `technical-validation-2026-11-14-2034.md` preamble names both moves | fixed: `/technical-validation` resolves the base once to `git merge-base origin/main HEAD` |
| 05 | implementation | A back-e2e tools test hard-coding the status enum's error text failed first at validation. | `kaizen.md` 20:52; report row C02; plan *Gates* lists `test:core` only | fixed: `/implementation` step f runs `test:e2e --changed <base>` for an `api/` or `domain/` change, not the touched files by path |
| 06 | implementation | The test hard-coded a copy of the enum instead of reading it. | report row C02; fix in `36bc57c26` builds the message from `SONG_STATUSES` | merge into 05 (fixed in the PR itself) |
| 07 | validation | The site restated the API's status list as `songStatuses`, and the branch widened it in five places by hand. | report rows B11, D04 | no-op: the PR moved the list to `@domain/song-status.core`, and `grep -rn songStatuses apps/pragma` is empty (round 2 R03) |
| 08 | validation | `PoolEntryView.status` was a hand-written union. | report row B12 | no-op: fixed in the PR to the domain `SongStatus` (round 2 R04) |
| 09 | implementation | Prettier was run in a repository that formats with oxfmt. | `kaizen.md` 20:55, `hook:no-prettier` | no-op: the hook refused it before any file moved |
| 10 | validation | The documented `test:e2e` command prints only totals, so confirming one fixed test meant re-running it by hand. | `kaizen.md` 21:16; the sweep ran `test:e2e --changed <sha> --reporter=verbose` and got one ✓ line per test (measured) | fixed: the validator's and the standard's `test:e2e` command carries `--reporter=verbose` |
| 11 | validation | Stryker mutated `domain/song-status.core.ts` and gave it no row, so a reader could not tell zero mutants from a skipped file. | `kaizen.md` 21:16; the sweep ran Stryker on it with `song-origin.core.ts`: the table shows only `song-origin` and the score is 100, so the knowledge trigger on `score of NaN` stayed silent (measured) | fixed: `stryker-zero-test-guard.js` names each file in `mutate` that got no mutant |
| 12 | plan | The plan's *Risks* covered a new site against an old API, not an old tab against new data. | round 1 and 2 *Notes*; PR body *Notable* | no-op: a reload clears it, and the PR named it before the merge |
| 13 | validation | No `/visual-validation` report was committed; the main session checked the screen itself at 375 px. | `ls validation/` holds two technical reports; 7 of the 8 latest pragma features hold no visual report (measured) | fixed: the operator chose to require it on 2026-11-14, and the pull-request validation hook refuses a front-end change with no visual-validation report |
| 14 | ci | No red run. | check runs on `0fdd09b`: every job success or skipped | no-op: nothing failed |
| 15 | post-merge | The merge added no ADR. | `git diff --name-only a5893533d^ a5893533d -- docs/adr/` is empty | no-op: nothing to stamp |
| 16 | post-merge | A kaizen that touches only tooling waited for the operator's merge and could deploy a preview. | operator's answer on this sweep, 2026-11-14; `preview.yml` fingerprints the whole app tree, so a test-only change in an app built one (read) | fixed: the kaizen skill and CLAUDE.md let the session merge a kaizen whose fan-out names no app, and the preview drops a key whose every change is a test, markdown or test config |
| 17 | post-merge | Watched pull requests woke the session for comments the operator never writes. | operator's answer on this sweep, 2026-11-14 | fixed: CLAUDE.md and `/open-pr` act on CI results, the merge state and comments by `hugoleborso` only |

Counts: 1 dantotsu, 6 fixed, 1 merge, 9 no-op.
