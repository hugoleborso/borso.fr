# Friction inventory for PR #249

[PR #249](https://github.com/hugoleborso/borso.fr/pull/249) (`e523fbe2`)
swept PRs #246 and #247, wrote the React Aria ADR, and moved 14 of pragma's
primitives onto React Aria Components. Sources: the archived log
`docs/features/meta/lessons-from-pr-246-247/kaizen.md` (5 lines), 2 lines
the operator pasted from after the archive, the 15 commits, the session
transcript `session_01K69KnB5EhtrTuPUuosnWCt` (1,675 user and assistant
events, read in full), and this sweep's own log. The PR had no review thread
and no validation report.

Writers: `main` 1 (pasted), `hook:no-swallowed-push` 1, `hook:pr-body` 1,
`hook:no-discarding-reset` 1 (pasted), `pragma-baseline` 1, `aria-migration`
2, `energy-delay` 0 (stopped before logging). Every brief carried a label.
The operator sent 6 messages, and 3 of them corrected or redirected.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | validation | The migration report gave its screen verdict in words, "identical by eye", "41/255 on one pixel channel", with no image, and the operator had to write "SCREENSHOTS !!!!!" | pasted line `main` 00:14; transcript 18:20 and 00:13:57 | dantotsu: `the-screens-described-instead-of-shown` |
| 02 | validation | The subagents handed back scratchpad paths of the before and after shots, which the operator cannot open | transcript 18:08:58 | merge into 01 |
| 03 | validation | The 14-primitive migration ran no `/visual-validation`, so no shot reached the previews CDN gallery | no `validation/` folder in the PR's files | merge into 01: the Stop hook asks for the images whichever path produced them |
| 04 | implementation | Merging main broke five test files written for the old menu and sheet | commit `d955a500`; transcript 00:23:46, typecheck and `test:core` exit 1 | dantotsu: `a-test-that-could-see-inside-a-closed-menu` |
| 05 | post-merge | `shows no break and offers none in the My part view` passes with the filtered-mode guard deleted | this sweep, measured on a mutant | merge into 04: the test now opens the menu and fails on the mutant |
| 06 | implementation | The branch removed `stubSheetDialog` as unused while main added callers, so the merge failed to typecheck | transcript 00:23, `TS2305` | merge into 04: the helper existed only so tests could reach hidden dialog content |
| 07 | implementation | `Icon.test.tsx` "has a caller for the menu glyph" failed after the merge | commit `d955a500` | no-op: the caller check caught an orphaned glyph, as designed |
| 08 | implementation | The energy-delay subagent wrote `EnergyMeter.tsx` into the checkout while the main session ran the merge's gates, giving 8 failures that were not the merge's | transcript 00:23:28 and 00:28:04 | dantotsu: `a-prototype-in-the-tree-the-merge-was-using` |
| 09 | post-merge | The prototype went to `git stash` and a scratchpad patch, then was lost with the container | transcript 00:28:18 and 00:40; operator prompt | merge into 08: `merge-strands-no-work` refuses the merge while a stash exists |
| 10 | implementation | The main session said "the agent hasn't changed any file yet" three minutes before its edits broke the gates | transcript 00:20:36 | merge into 08 |
| 11 | implementation | The prototype stood on an energy bar main had rewritten in PR #252 and PR #256 | transcript 00:35 | merge into 08: the merge found it; the hook makes the parked work a decision |
| 12 | implementation | Three Stop-hook nags asked to commit files the migration subagent owned | transcript 17:10, 17:12, 17:16 | merge into 08: the same shared checkout |
| 13 | implementation | `no-discarding-reset` refused `git checkout --` of the prototype's files while the merge fixes were uncommitted | pasted line 00:28; transcript 00:28:12 | no-op: the guard kept the merge fixes; the stash it pointed to is row 09 |
| 14 | implementation | `git push … \| tail -4` was refused | archive 14:40 | no-op: since PR #254 the hook rewrites a piped push with `set -o pipefail` |
| 15 | implementation | `git push -q > /dev/null 2>&1; echo "early-push-check"` hid the push's errors and exit status, and no hook refused it | transcript 00:31:01; hook exit 0 on it (measured) | fixed: `no-swallowed-push` refuses a push or commit sent to `/dev/null`, proved on 3 shapes |
| 16 | pr-description | `check-pr-body.ts` passed a body whose 156-character branch link the pr-body hook then refused | archive 14:42; transcript 14:42:41 and 14:42:50 | fixed: the checker refuses a link target of 150 characters or more; mutation 100% |
| 17 | conception | The ADR picked its own criteria; the operator named two | transcript 15:28 | no-op: eradicated in PR #249 by `check-adr-criteria.sh` |
| 18 | conception | The operator asked for renders of every applicable component | transcript 15:28 | no-op: answered in PR #249 by the gallery artifact |
| 19 | validation | `POST /api/uploads/sign` returns 500 under `pnpm dev` | archive 15:40 `pragma-baseline` | no-op: CLAUDE.md says uploads need a preview since PR #249 |
| 20 | validation | The migration brief listed seeded ids from an earlier run, and each route returned 404 | archive 17:19 `aria-migration`; transcript 17:11 | knowledge: extended `driving-pragma-auth-from-a-validator` |
| 21 | implementation | React Aria's `Button` drops `title` | archive 17:19 `aria-migration` | no-op: standard 05 says so since PR #249 |
| 22 | post-merge | `merge_pull_request` refused a 7-character SHA | transcript 00:40:25 | no-op: the error names the fix and one retry merged |
| 23 | implementation | The second merge conflicted in `technical-validator.md`, which another kaizen had fixed the same way | commit `30281f3f`; transcript 00:31 | no-op: since PR #257 the sweep reads open kaizen PRs first |
| 24 | implementation | pre-push refused a branch that conflicted with main, so main was merged twice | transcript 00:31 | no-op: the gate worked; main moved during the fix |
| 25 | implementation | Auto mode refused appending `set -o pipefail` to the session hook | transcript 17:06 | no-op: the change was not needed, see row 14 |
| 26 | validation | The safety check denied `rm -f shots/*` with an unexpanded variable | transcript 15:32 | no-op: a guard working as designed |
| 27 | implementation | The subagent's lint-rule change fell to 97.22% coverage | transcript 18:09 | no-op: the coverage gate caught it before the push |
| 28 | conception | Six vendor-demo shots were retaken because React Aria's overlays tapped the demo's help button | transcript, the gallery shots before 15:44 | no-op: a one-time cost of shooting vendor docs |
| 29 | pr-description | The migration changed behaviour (ScoreInput saves on blur, tabs on arrow keys) and the ScoreInput question went unanswered four times before the merge | commit `e12adcb3`; transcript 18:20 to 00:15 | no-op: the operator merged with the change named in the commit; the question is raised again in the sweep's reply |
| 30 | post-merge | `get_session` does not find PR #247's second session | transcript 14:32 | no-op: recorded in `lessons-from-pr-246-247` row 20 |
| 31 | post-merge | Two lines were logged after the archive | the sweep prompt | no-op: the prompt pasted them, as the flow intends |
| 32 | conception | The first prompt carried a French app string pasted mid-sentence | transcript 14:29:48 | no-op: a copy slip with no effect |
| 34 | post-merge | The new screens-shown Stop hook blocked this sweep's reply, which quoted the old report's words and compared no screens | this session's Stop hook feedback | fixed: the hook skips quoted text; an unquoted claim still blocks (measured) |
| 33 | post-merge | This sweep's own commit sent git errors to `/dev/null` and the new guard refused it | this session's log, `hook:no-swallowed-push` | no-op: the row 15 guard firing on its author |

## Counts

34 rows: 3 dantotsus, 1 knowledge, 3 fixed, 8 merged into another row,
19 no-op.
