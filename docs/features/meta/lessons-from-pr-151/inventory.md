# Friction inventory — PR #151

Every friction event from Hugo's first request (« Do a UX pass on pragma… ») to the merge of PR #151. Sources: the six lines of `KAIZEN.md`, archived in [`docs/features/pragma/task-speed/kaizen.md`](../../pragma/task-speed/kaizen.md), the twelve commits, the transcript and the gate output. One agent, the main session, did all of the work; no subagent ran, so every `KAIZEN.md` line is written by `main` or a hook.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `setlist-filter.core.ts` computed each member's instruments per row and no row rendered them, since `9a94594`; the *my part* job lost its answer. | kaizen 08:56, commit:c229a98 | dantotsu: the-projection-nobody-rendered |
| 02 | implementation | Two unused messages, `mastery.subtitle` and `scaffold.subtitle`, found while listing explanatory keys. | this sweep | fixed: commit d26622c, merge into the-projection-nobody-rendered |
| 03 | implementation | The bars page had two *Save* buttons, the first saving the outreach template; the earlier mobile audit passed both. | kaizen 08:56, commit:c229a98 | dantotsu: the-audit-that-measured-buttons-not-jobs |
| 04 | conception | The operator corrected explanatory UI text three times: a page subtitle, a labelled create button, a procedural placeholder. | transcript: « Une UI qui explique ce qu'elle fait c'est un smell d'une mauvaise UI » | dantotsu: the-interface-that-explained-itself |
| 05 | implementation | `members.masteryMatrixSubtitle`, a paragraph of instructions, survived the pass. | this sweep | merge into the-interface-that-explained-itself; removing it is a product call |
| 06 | validation | A vote nobody scored could not be closed: the proposal answered 409 and the page had no other ending. | transcript: « close the vote ne marche pas ? », commit:2c4e615 | dantotsu: the-empty-vote-nobody-could-close |
| 07 | post-merge | A dev dependency added to pragma only deployed every app, to previews and to prod. | transcript: « Why does a development dep launches a redeploy of all apps ? » | dantotsu: a-dev-dependency-that-redeployed-every-app |
| 08 | post-merge | The preview run deployed `banana-rush`, which the operator asked about. | transcript: « Pourquoi une preview banana rush ? » | merge into a-dev-dependency-that-redeployed-every-app |
| 09 | implementation | `git push` was rejected with *Internal Server Error* six times while fetch worked. | kaizen 17:00 | knowledge: git-push-internal-server-error-while-fetch-works |
| 10 | implementation | Playwright's `request.post('/api/auth/login')` left no session the page could use behind the Vite proxy; signing in through the form worked. | kaizen 08:56 | no-op: cause not established; the harness signs in through the form, as a member does (spec line 46) |
| 11 | implementation | Playwright could not be resolved from a scratchpad script, and its bundled headless shell did not match the installed Chromium. | transcript | no-op: Playwright became a pragma dev dependency, and the spec documents `--chromium` |
| 12 | implementation | `no-swallowed-push` refused a commit piped into `tail`. | kaizen 08:50 | no-op: the hook did its job; rerun with a message file and `pipefail` |
| 13 | implementation | `no-discarding-reset` refused a reset that would drop uncommitted work. | kaizen 11:52 | no-op: the hook did its job; `git stash` was the right tool |
| 14 | implementation | Lint refused adapters without sibling tests, magic numbers, a 300+ line page, a nested ternary, `autoFocus` and a boolean name. | transcript | no-op: each rule fired as designed and named its fix |
| 15 | implementation | Stryker left equivalent mutants on undefined guards in the preference utils. | transcript | no-op: the guards were dropped and the function takes a non-optional storage |
| 16 | implementation | Pre-commit refused Playwright outside the catalog, a spec with no *Test strategy*, an edit to the dated `report.md` and a stale blueprint index. | transcript | no-op: four gates worked as written |
| 17 | implementation | A `json.dumps(sort_keys)` rewrite reordered both i18n files. | transcript | no-op: caught in the diff before commit; keys are now inserted in place |
| 18 | implementation | `SearchBar`'s `min-w-[260px]` pushed the inline search past 375 px. | transcript, commit:f93ef14 | no-op: the 375 px measurement of the pass caught it |
| 19 | validation | A close-vote order mismatch was misread as a bug; three runs showed the order kept. | transcript | no-op: corrected before it reached the operator |
| 20 | validation | `add-task` stays 0.3 s over budget. | `validation/after.json` | no-op: the fix is moving the Tasks tab, a product decision left with the operator |
| 21 | post-merge | `merge_pull_request` refused a short `expectedHeadSha`. | transcript | no-op: the error named the fix, a full 40-character SHA |
| 22 | implementation | A scratch helper script hung and was killed. | transcript | no-op: scratch code, not in the tree |
| 23 | post-merge | The first eradication for row 04, a gate on message key names with an exception list, was rejected by the operator as « une usine à gaz ». | transcript, commit:d26622c | merge into the-interface-that-explained-itself; gate removed, level 5 |

## Decisions

- 5 dantotsus, 1 knowledge entry, 1 fix, 13 no-ops, 3 merges.
- Rows 01, 03 and 06 share a shape: every control passed its own check and the job through them was broken. That is the pattern the task-speed harness addresses, and why its limit, running by hand only, is named in each entry.
