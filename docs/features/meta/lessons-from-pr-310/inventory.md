# Friction inventory, PR #310

PR #310, `docs: lessons from PRs #293 and #298`, was squashed onto `main` as
[`856569930`](https://github.com/hugoleborso/borso.fr/commit/856569930) on
2026-11-12, 15 commits and 26 files. It was itself a kaizen sweep.

Sources walked: `scripts/kaizen.sh sweep-input 856569930` (7 lines, 6 by
`main` and 1 by `hook:no-broad-kill`, all from one session); PR #310's commits;
its comments (5, all preview bot) and review threads (none); the merged
session's transcript, `session_01K69KnDzbVY3yxgGHEWuPgJ`, read with
`list_events` for the operator's messages and the one `AskUserQuestion`; open
pull requests (none labelled `kaizen`); row 48 of
[`../lessons-from-pr-293-298/inventory.md`](../lessons-from-pr-293-298/inventory.md).
The transcript shows no `Agent` call on its last three pages, so no subagent
went unlogged (measured on those pages only).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The sweep built four mechanisms that changed how the operator works, proved each, and he refused all four once he read them | row 48 of #310's inventory, `no-op: the sweep's own doing`; commits `feb9caa`, `94695d1`, `f5552f1`, then `522fc33`, `54b943d`; `[02:12] main` | `dantotsu: the-sweep-that-decided-how-the-operator-works`. Row 48's reason named no eradication, so it was not a no-op |
| 02 | conception | A draft pull request opened without a report, which rested on a draft deploying its preview, and the operator asked why | `[01:49] main`; transcript 01:38 UTC, « Mais je veux pas qu'un draft déploie sa preview. Pourquoi est-ce que tu fais ça? »; `feb9caa`, `522fc33` | `merge into` 01 |
| 03 | conception | Two minutes after a closed question, the session built the option it had marked recommended | transcript 01:50 `AskUserQuestion`, 01:52 « Choix noté »; `94695d1` at 01:53 | `merge into` 01 |
| 04 | conception | The test clock forced to 23:10 UTC eradicated a test #298 had already fixed, and tests of the Paris day already covered both sides | `f5552f1`; `54b943d` body; transcript 02:10 grep of the Paris-day tests | `merge into` 01. This is candidate 3, the push for the highest level |
| 05 | conception | A hook kept the validator in the foreground, which would have frozen the main session during every review | `feb9caa`; transcript 02:09 « il faut absolument que le validateur soit en arrière-plan » | `merge into` 01 |
| 06 | conception | The closed question's options listed what the hook would gate, not that an early pull request runs CI again at every push, and the operator refused the option he picked | transcript 01:50 `AskUserQuestion` input; 02:09 « Tu rejoues plein de fois la CI » | `dantotsu: the-question-that-left-out-the-cost-he-cared-about` |
| 07 | pr-description | The first summary used the prompt's candidate numbers, a hook file name and « round », and the operator asked for it again | `[02:12] main`; transcript 02:02 and 02:06 « là c'est pas clair du tout » | `merge into` 06 |
| 08 | conception | The operator offered a blocking subagent as an alternative for the validator, and the session kept it in the background with a report copied once | transcript 02:09 « Ou alors tu veux que ce soit un sous-agent qui bloque [...] pourquoi pas »; `54b943d` | `no-op:` the kept fix removes the cause, a draft report read in place, without making anything wait |
| 09 | post-merge | The operator said he does not want a draft to deploy its preview, the session offered to add the condition, and nobody answered before the merge | transcript 01:38, 01:54, 02:02; `.github/workflows/preview.yml` has no `draft` condition (`grep -n draft` prints nothing, this session) | `no-op:` a change to when a preview runs is the operator's call by row 01's rule. It is the second question of this pull request's reply |
| 10 | post-merge | `check-knowledge-triggers.sh` passed a dash-led command trigger to jq as an option | `[00:40] main` | `no-op:` already eradicated by `4941fb1` in #310 |
| 11 | post-merge | #293's ADR had no row in the index table, and the gate passed it | `[00:40] main` | `no-op:` already eradicated by `e933719` in #310. The ADR reads `accepted` in its file and its row (read this session) |
| 12 | post-merge | A clock-shifted run read the working tree while a gate was half edited | `[00:40] main` | `no-op:` the clock runs left with `f5552f1`'s mechanism, so the class has no source |
| 13 | post-merge | `no-broad-kill` refused a `pkill` | `[00:55] hook:no-broad-kill` | `no-op:` the hook held, and its message names `TaskStop` |
| 14 | post-merge | The operator's refusals and the closed question exist only in the session's transcript; the pull request has no review thread | `get_review_comments` returned 0 threads; transcript pages | `no-op:` the friction log carried rows 01 and 07, and the transcript held the rest. Reading it is row 16 |
| 15 | post-merge | Three earlier refusals of an agent-built mechanism sat as side notes in other entries, with no entry naming the class | `the-interface-that-explained-itself.md:64`, `a-written-runtime-budget-nobody-enforced.md:99`, the PR #228 line of `/after-task-kaizen` | `merge into` 01, as its `recurs:` |
| 16 | post-merge | Reading the transcript, each `list_events` page spilled to a file and the hook printed the entry on `get_files`, while the entry on `list_events` stayed silent. Its trigger needs `has_more` in the output, and a spill message has none. It also said a `kinds` filter keeps a page inline, and `kinds: [user]` spilled 74,812 characters | this sweep, three `list_events` calls; `reading-another-sessions-transcript-with-list-events.md:5` | `knowledge: reading-another-sessions-transcript-with-list-events`, extended. A trigger on the spilled file's name, the `kinds` claim corrected with the measure, and how to find typed messages and a closed question |

Counts: 2 dantotsu, 1 knowledge, 0 fixed, 7 merged, 6 no-op.

## The three candidates of the prompt

1. **Reversible work or the operator's decision.** The four mechanisms fell
   on the reversible side, because `CLAUDE.md` sends only product and
   architecture decisions to the operator, and a change to when he is asked,
   when CI runs or what a session waits for is neither. A hook cannot tell
   them apart: the kept and the refused changes edited the same hook file,
   and a kept change also added a refusal (row 01's entry measures it). The
   skill can, by that three-part test, and now does.
2. **The missing consequence.** Confirmed. The recommended option named two
   costs from the hook's side and not the CI reruns he refused it for (row 06).
3. **The push for the highest level.** Confirmed for the clock (row 04), and
   it fed the other three. The reframe that called knowledge « almost always
   wrong » is rewritten, and two lines of pressure are removed.
