# Friction inventory of PR #353

PR #353 split each app's `VOCABULARY.md` into a short glossary and an `INVARIANTS.md` per folder, gated by `check-vocabulary-paths.sh`. It merged on 2026-11-15 as `2cfa2a34d`.

Sources read: `scripts/kaizen.sh sweep-input 2cfa2a34d` (9 lines, all in `meta/vocabulary-glossary-and-invariants/kaizen.md`), the 1 line the prompt pasted from after the archive, the pull request (7 commits, one bot comment, no review threads, merged by the operator), both technical-validation reports, the merge hook's refusal logic, and the open pull requests (#356 is the one open kaizen; none of its rows overlaps).

Writers of the 10 lines: `main` 4, `technical-validator` 2, `technical-validator-r2` 1, `hook:api-validation` 1, `hook:subagent-no-staging` 1, `hook:merge-on-moved-base` 1 (after the archive).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | Per-file greps made the vocabulary gate nine times slower once the rules spread over 77 files. | archive line 06:29; report 0632 B09 measures 0.221 s | no-op: the session measured it and replaced the greps with one pass before committing, and `docs/standards/14-tool-runtime-budgets.md` holds the budget that made it look |
| 02 | implementation | `/adr` had no mode for a main session that already weighed the options, so the ADR was written from the template by hand. | archive line 06:29 | fixed: `/adr`'s piloted mode now takes the same inputs from any session, without the orchestrator's verdict file |
| 03 | implementation | Moving markdown one folder deeper broke a relative link. | archive line 06:30; report 0632 A10 | no-op: `check-doc-links.ts` caught it at commit, which is that gate's job |
| 04 | pr-description | `api-validation` refused to open the pull request before a technical-validation report existed. | archive line 06:32 | no-op: the branch changed `api/src/punch/punch.schema.ts`, so the refusal was right, and the review it forced found blocking row 07 |
| 05 | validation | `subagent-no-staging` refused the validator's `git add` inside a throwaway repository in the scratchpad. | archive lines 06:33 and 06:38; probe: `cd <scratch repo> && git add .` exited 2 on `main` | fixed: the hook refuses only when the command's directory uses this checkout's index |
| 06 | validation | The rewritten gate had no test, so the validator mutated an exported tree by hand, eleven cases one at a time. | archive line 06:38; report 0632 D01 to D07 | no-op: round 1 typed it blocking and the branch shipped `check-vocabulary-paths.test.ts`; `the-shell-gates-are-only-ever-run-where-they-pass.md` covers the wider pattern, and a gate on it would only guard the harness |
| 07 | implementation | `awk -v` turned `\b` into a backspace, so moving a grep into awk dropped half the comment-citation check. | archive line 06:41; report 0632 A14; commit `0eee416` | knowledge: awk-v-eats-the-backslashes-of-a-regex |
| 08 | validation | One root test run with `--coverage` fails on every gated `scripts/*.core.ts` it does not import. | archive line 06:44; reproduced on `strip-heredocs.test.ts` | knowledge: extend writing-a-small-function-the-hundred-percent-gates-accept |
| 09 | validation | Round 2 failed on one test gap (R04), fixed after the round, and the operator was asked to judge it. | report 0641 R04; commit `fe83341` | no-op: the two-round rule sends findings left after round 2 to the operator, which the body did |
| 10 | validation | No plan existed, so A00 was UNVERIFIABLE in both rounds. | reports 0632 and 0641 A00 | no-op: the ADR carried every decision and each claim row was checked against it |
| 11 | post-merge | `merge-on-moved-base` refused the merge, because #341 and #352 had changed `CLAUDE.md`, `ci.yml`, `.husky/pre-commit` and `docs/adr/README.md` too. | pasted line 07:11; `comm` of the two diffs from `98834ca`; merge commit `e810eba` | no-op: the guard held as designed on real code both sides changed, and cost one CI run |

Counts: 2 fixed, 2 knowledge, 7 no-op.
