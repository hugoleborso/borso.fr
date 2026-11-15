# Friction inventory of PR #351

Sources: the archived log `docs/features/pragma/lineup-grid-transitions/kaizen.md`
(7 lines: `main` 1, `implementer` 1, `technical-validator` 1, `visual-validator`
2, two hook refusals), the merged session's transcript read with `list_events`,
the pull request's 9 commits and the branch's workflow runs.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The mockups gave each instrument its own colour, and the session recommended one, though a member colour is the only colour pragma draws. | kaizen `main` 06:06; transcript 23:01 "la basse en bleu", operator 06:05 "les couleurs c'est uniquement les membres du groupe" | fixed: `.claude/hooks/pretool-mockup-reads-visual-rules.sh` speaks when a design canvas starts; the /specification sentence it replaces is removed |
| 02 | conception | Eight mockup variants were drawn before /route or /specification ran, so the rule PR #351 added to /specification step 9 would not have been read. | transcript: `Artifact quickstart intent:"design"` at 22:41, route skill read at 06:13 | merge into 01: the hook fires on the canvas, whatever skill ran |
| 03 | conception | The operator found VOCABULARY.md far too long to read. | operator 06:14 | no-op: PR #353 split each vocabulary into a glossary and folder invariants, merged 07:18 UTC |
| 04 | spec | Two corrections on what counts as a change: adding backing vocals is not one, and voice never counts. | operator 22:40, 22:58 | no-op: product decisions, recorded in the spec and ADR-2026-11-15T0627 |
| 05 | implementation | The no-prettier hook refused a compound command, so the edit chained before Prettier never ran and a later test read the old file. | kaizen `implementer` 06:23, `hook:no-prettier` 06:17 | fixed: `kaizen-refusal.sh` adds to every PreToolUse refusal that nothing in the call ran |
| 06 | validation | The technical validator wrote a tsx probe feeding `db-read.sh` rows to `buildLineupGrid` to check the input metric on Alliance 3. | kaizen `technical-validator` 06:29 | knowledge: `input-vs-output-metrics` now says a metric on production rows ships as a fixture test named in the spec |
| 07 | validation | The visual validator rebuilt four Alliance 3 rows locally for the same metric. | kaizen `visual-validator` 06:38 | merge into 06: two of three agents hit it |
| 08 | validation | The dev seed had no second vocal instrument and no swap, so every vocal assertion needed a setlist built by hand. | kaizen `visual-validator` 06:38 | fixed: the seed adds Chœurs, sung by Léa on Afterglow, and a Bass and Keys swap between Marc and Sarah on Midnight Drive |
| 09 | validation | A validator reached for pkill to stop a dev server. Forty archived logs hold eighty such refusals. | `hook:no-broad-kill` 06:39; `grep -rh 'hook:no-broad-kill' docs/features --include=kaizen.md` | fixed: `scripts/stop-port.sh <port>` replaces the three-line recipe the refusal printed |
| 10 | validation | A probe failed with `Cannot find module .../domain/lineup.core` and was retried with absolute paths. | transcript 06:28 | no-op: the wall `workspace-commands-depend-on-the-directory` already holds it |
| 11 | validation | A production read failed with `relation "setlists" does not exist`; the table is `setlist_sheet`. | transcript 06:37 | no-op: the error named the relation and the next query used the real one |
| 12 | pr-description | The body checker reported three violations. | transcript 06:39 | no-op: the checker did its job, fixed in one pass |
| 13 | implementation | The Stop hook flagged uncommitted files twice while subagents were still writing. | transcript 06:17, 06:35 | no-op: the files were committed once the agents finished; no work was lost |
| 14 | ship | `4c0193b` was pushed while the branch conflicted with main, and the pre-push conflict guard passed it. | transcript 07:02 push output; no run for `4c0193b` in `list_workflow_runs`; reproduced on a clone | dantotsu: `the-union-merge-only-this-checkout-could-see` |
| 15 | ship | The session told the operator the preview was redeploying, filtered the push through `grep`, and read no run for 80 minutes. | transcript 07:02:28 "La preview se redéploie avec ce commit" | merge into 14: once the guard refuses, `git push` prints a failure the filter keeps |
| 16 | post-merge | Main carries the ADR index PR #352 deleted, under a line saying it keeps none. PR #353's union merge brought it back. | `git show <sha>:docs/adr/README.md` rows: 0 at `13670458a`, 70 at `2cfa2a34d` | merge into 14, and fixed: the index is restored to PR #352's page |
| 17 | post-merge | ADR-2026-11-15T0627 was merged as proposed. | `git diff --name-only 1cd9de773^ 1cd9de773 -- docs/adr/` | fixed: accepted |
| 18 | validation | The operator dropped the instruments put down from a changed cell after seeing the preview. | operator 07:00, commit `4c0193b` | no-op: a product call made on the preview, which is what the preview is for |
| 19 | conception | The operator asked for side-by-side mockups on front-end features. | operator 06:05 | no-op: PR #351 shipped it in /specification step 9 |
| 20 | implementation | A grep exited with code 2. | transcript 06:15 | no-op: a malformed pattern, retried once |
