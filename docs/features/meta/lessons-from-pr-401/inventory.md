# Friction inventory of PR #401

PR #401 was the sweep of PR #399. Its session ended at 248,971 tokens of
context, above the 150,000 threshold (measured, `get_session`
`context_usage.used_tokens`), so this sweep ran in its own session. The
operator approved the hand-off ("oui lance-la", 10:47).

Sources: `scripts/kaizen.sh sweep-input 7c6106d` (1 line, 1 archive, writer
`transcript-399`), the operator's 2 typed messages and the 2 friction lines
`scripts/kaizen/operator-messages.ts` printed from all 5 user pages of
`session_01K69KnD2jCKy2sJwcF55YRY` plus 2 small inline ones, the 3 commits, 0
comments and 0 review threads, 21 check runs with no failure, no validation
report, and the open pull requests (no open `kaizen` one). Each line has one
writer, so none is systemic by count.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | post-merge | Six of fifteen `list_events` pages of the PR #399 sweep were scanned by eye, because `operator-messages.ts` read only spilled pages. | archive line `transcript-399` 21:10 | The script took saved files as arguments, and an inline page is never saved | `scripts/kaizen/operator-messages.ts`; the sweeping session's own transcript already holds every page (measured: 5 spilled and 2 inline here) | dantotsu: the-line-logged-after-the-hand-off |
| 02 | post-merge | The shipping session logged a friction line 10 s after starting this sweep, while its prompt said "No line was logged after the archive". It lived only in that container. | transcript 10:48:15 (this session created), 10:48:25 (`logged as main`) | The hand-off prompt was the only carrier of a late line, written by hand before the session's last turns | `.claude/skills/open-pr/SKILL.md` *After the merge*, `CLAUDE.md`, `/after-task-kaizen` step 1 | merge into the-line-logged-after-the-hand-off; the script now prints every line the listed session logged, and the paste step is gone from all three |
| 03 | post-merge | The `screens-shown` Stop hook blocked a turn that said pages were "scanned by eye" and compared no screen. | the line of row 02; reproduced here, the hook blocked "Six of fifteen pages were scanned by eye." | `by eye` in the hook's claim pattern matches any reading done by hand | `.claude/hooks/stop-screens-shown-not-described.py`; second misfire of the same pattern after the-guard-that-read-before-and-after-as-screens | fixed: `fix(meta): screens-shown no longer reads "by eye"`, in this pull request. `by eye` is gone from the pattern; the claim that created it, "identical by eye, at most 41/255 on one pixel channel", still blocks on "pixel channel" (measured both) |
| 04 | post-merge | Lead: pre-push runs `kaizen.sh balance` on `lessons-from` branches. Is push the right moment? | replay of the balance on PR #399's commits: 69d48e3 +205/-30, c96fc24 +250/-30, ba61136 +366/-30, fe4ddbe +90/-30, 856fab9 +93/-465 (measured) | The hand-written walk was chosen before any code existed | `/after-task-kaizen` step 3, where the eradication is picked; no event a hook can see fires there | no-op: at PR #399's first push the gate would have refused, after the 137-line walk (eb52a28, 19:40:53) and before the fixture and mutation suite (ba61136, 20:13) and the red CI. The five first commits sit within 21 s (19:40:53 to 19:41:14), so a commit gate fires no earlier. Push is the earliest moment that sees code |
| 05 | post-merge | The hand-off prompt of the PR #399 sweep, 21:07. | transcript 21:07:38 | none | none | no-op: direction with no lesson |
| 06 | post-merge | Operator, 10:47: "oui lance-la". | transcript 10:47:43 | none | none | no-op: approval of this hand-off |
| 07 | pr-description | PR #401 opened at 21:14 and the operator merged it at 21:21, with every check green on the first run and no comment. | `get_check_runs`, 21 runs, none failed | none | none | no-op: nothing went wrong |
| 08 | post-merge | A `list_events` page with `limit: 3` came back with no data and `has_more: true`. | this session's call before 10:52 | `kinds` filters after the page is read | none | no-op: the knowledge entry on `list_events` already says so |
| 09 | implementation | The first draft of the reader met `no-comments`, the verb lint (`find…` returning an array) and `consistent-function-scoping`. | `oxlint --type-aware scripts/kaizen/` in this session | none, the gates did their job | none | no-op: renamed to `listListedPages`, helpers moved out |
| 10 | implementation | Two mutants survived: an empty-array fallback and a `join('')` separator. | `scripts/mutate-changed.sh` in this session | none | none | no-op: the fallback became an early return and a test splits text across blocks; `how-a-mutation-survivor-hides` already names both shapes |
| 11 | pr-description | This sweep adds 137 lines of code and removes 42, so `kaizen.sh balance` refuses it and `pre-push` will not let it go out. | `scripts/kaizen.sh balance` on the working tree; `knip` reports nothing unused; no installed package parses a Claude Code transcript (`node_modules/.modules.yaml`) | The reader is new code with tests, and nothing it replaces is code: the steps it replaces were prose, already trimmed | none found after a search of `scripts/`, `.claude/` and the counted `docs/` | open: one closed question to the operator, in the session that ran this sweep |
