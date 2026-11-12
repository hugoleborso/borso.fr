# Friction inventory, PR #300

`feat(talos): computed page sections, visible lateness, closeness 0 to 5`,
squashed onto `main` as
[`38cfce0`](https://github.com/hugoleborso/borso.fr/commit/38cfce0ca0aa837a228b66b7a4d58853d7520348)
on 2026-11-12. 46 commits, 84 files, one session. 28 of the 46 commits are
PR #292's, because the branch was stacked on that pull request's branch. The
18 others are 12 commits of work and 6 merges (counted on the commit list).

Sources walked: `scripts/kaizen.sh sweep-input 38cfce0c` (17 lines in 2
archives, the two the sweep prompt named), the nine session facts the prompt
carried, the body of #300 (no comment and no review thread, measured), its 46
commits, the check runs of its head `b808e8e` (no failed run; earlier heads
were not read), the four validation reports, the inventory of PR #292's sweep
(merged as #304), and the one open kaizen pull request, #302, which sweeps
PR #295.

Writers of the 17 lines: `technical-validator` 6, `closeness-scale` 2,
`closeness-all-kinds` 2, `computed-pages` 2, `computed-pages-fix` 1, and four
hook refusals. Every subagent logged under its label, and no line is `main`'s.

Step 1c: the merge added no ADR (`git diff --name-only 38cfce0c^ 38cfce0c --
docs/adr/` prints nothing), so none was stamped.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | spec | The computed pages spec said `entity.upsert` already dropped the lines of « Faits », « Historique » and « Relations ». No code did, so C3.1 had nothing to extend and the first implementation dropped two sections of five | `[19:48] computed-pages`, `[20:07] technical-validator`; prompt fact 1; report 2005 *Notes*; `MEMORY-CONTRACT.md:22` at `def77d9` said the same of the `body` column (read this sweep) | `knowledge: a-spec-bullet-that-leans-on-what-the-code-already-does`. No check can read a sentence and know the code agrees, so this is the floor of the ladder, printed when a spec is written. The instance is closed in #300 (row 06) |
| 02 | spec | The closeness spec assumed `entity.upsert` may omit `kind`. The schema requires it since its first commit, `d98a860` (measured), so the "kind stored" branch could not be reached or tested | `[20:51] closeness-scale`; prompt fact 2 | `merge into` 01. The implementer of each feature hit its false premise within 30 minutes of the spec commit (19:31 to 19:48, 20:25 to 20:51) |
| 03 | conception | "A 0 is refused on a page that is not a person" was built without asking. The operator said it made no sense, and a third change accepted 0 on every kind with a second set of names | prompt fact 3; commits `35cd4d1`, `f07a86e`, `02b63ec` | `merge into` 01, the third unchecked assumption of the same two specs |
| 04 | conception | The operator called two questions unclear and asked for plainer ones with a concrete example | prompt fact 4 | `fixed:` this pull request. The question rule of `CLAUDE.md` now asks for the operator's words and one concrete example. It replaces the line, it adds none |
| 05 | validation | C4.2 and D.2 of the computed pages spec are sentences about the pull request body, and the validator runs before the pull request exists | `[20:07] technical-validator`; reports 2005 and 2024, A16 and A25, UNVERIFIABLE | `merge into` 01, which says such a line is a note for `/open-pr`. The body of #300 does state the contract change, in three *Notable* bullets (read this sweep) |
| 06 | validation | A page read then written back stored each line of the three older sections twice. Round 1 measured it and graded it a note, because the spec's own claim was met | report 2005 *Notes*; commit `3da2e2a` | `no-op:` fixed before the merge. `entity.upsert` is the only writer of an entity body besides the wikilink replace of a rename (`grep` on `api/src/memory`, this sweep), and `VOCABULARY.md:116` names the test that holds it |
| 07 | validation | A person scored 0 whose kind later changes kept its 0 on a kind whose scale was 1 to 5 | report 2054 A04; commit `efa2aeb` | `no-op:` moot since `02b63ec` accepts 0 on every kind |
| 08 | validation | No plan was written for either feature, so all four reports carry a `plan absent` row | reports 2005, 2024, 2054, 2345, A00; #300 body, *Gap: no plan*; prompt fact 9 | `no-op:` the validator keeps that row on purpose for a short-form spec, and the operator merged with the gap stated, as on #292 (its row 21). What the missing plan let through is rows 01 and 02, and the *Patterns* of this pull request say so |
| 09 | validation | `/visual-validation` was not run and no phone was used | #300 body, *Not run*; prompt fact 9 | `no-op:` stated in the body the operator merged, with 8 captures committed under the two `validation/screens/` folders |
| 10 | validation | The prompt says round 1 failed on spec claims without tests in both features | prompt fact 5; this sweep's `KAIZEN.md` | `no-op:` the reports do not show it. Both round 1 verdicts are PASS_EXCEPT_UNVERIFIABLE with no blocking finding, and the only category D failure is closeness D14, non-blocking, fixed in `efa2aeb`. The ten missing tests were #292's (its row 18) |
| 11 | validation | Seven non-blocking findings on the computed pages: a heading out of order, two constants declared twice, a `Held by` line missing, a function in the wrong file, a row type written by hand, a read of every fact to keep ten, a definition that counted two sections | reports 2005 (A08, B11 to B14, E06) and 2024 (B11) | `no-op:` the reviewer layer found each and `3da2e2a` or a later commit fixed it. `VOCABULARY.md:112` now counts five (read this sweep) |
| 12 | validation | The site restated `'personne'` and the 0 to 5 bounds the API enforces | report 2054 B11; commits `efa2aeb` (dismissed), `02b63ec` | `no-op:` `02b63ec` moved both to `domain/closeness.core.ts`, which the schema, the graph and the site read |
| 13 | validation | A `core-label-key` follower built its key with a template literal, and `no-dynamic-translation-keys` only reads the argument of `t()` | report 2345 B16; commit `ea87ed7`; prompt fact 8 | `no-op:` the reviewer layer found it and one commit fixed it. The function returns `ParseKeys`, so `tsc` still proved the twelve keys exist (measured by the validator, B16), and no missing string could ship. Widening the rule would guard a blueprint's shape, not a user |
| 14 | validation | The new `domain/closeness.core.ts` had no `@FollowsBlueprint` marker, and no gate asks for one | report 2345 B17; commit `ea87ed7`; prompt fact 8 | `no-op:` 183 of the 1,666 source files under `apps/` carry no marker today, 35 of the 362 `.core.ts` files among them (counted this sweep). A gate on new files would refuse a file no blueprint covers, and the marker feeds a report, not behaviour |
| 15 | validation | With a merge of `main` above the base, the diff, `vitest --changed <base>` and `mutate-changed.sh <base>` carried what the merge brought. Each validator moved the base by hand | `[20:07]`, `[21:00]`, `[23:50] technical-validator`, three of the four validator runs; 120 files against the feature's 28 in closeness round 2, 85 against 48 in computed pages round 1 (measured) | `fixed:` this pull request. `scripts/mutate-changed.sh` takes a file as a path, and `technical-validator.md` gives the command that lists the feature's own files. Before, a file scope matched nothing (measured, see *Proof* below) |
| 16 | validation | `gh pr list` answered 403, and the validator rebuilt the REST call | `[20:27] technical-validator` | `no-op:` already eradicated by #304. `what-a-hosted-session-cannot-do-on-github.md` triggers on `gh pr (view\|checks\|status\|list)` (read this sweep). The line was logged before that merge |
| 17 | implementation | `pnpm dev` never applied a changed `memory-seed.json` to a seeded database, so two implementers posted their seed rows by hand | `[19:48] computed-pages`, `[20:51] closeness-scale` | `no-op:` already eradicated by `the-dev-database-that-opened-no-screen` (#304). `apps/talos/test/dev-database.setup.ts:41` keys the seed on a hash of its operations (read this sweep) |
| 18 | implementation | The pre-push hook refused a branch that conflicted with `origin/main`, three times | `[19:04]`, `[19:56]`, `[19:57] hook:pre-push-conflict`; merges `65c6bca`, `341b893`, `c344a8d`, matched by time | `no-op:` the hook held. All three conflicts include `docs/adr/README.md`, which #304 gave a union merge (its row 13) |
| 19 | deploy | `merge-on-moved-base` refused a merge beside base commits no CI run had tested | `[23:03] hook:merge-on-moved-base` | `no-op:` this is #292's merge, its row 12. One session kept one `KAIZEN.md` for both pull requests, so the line was archived here. `3d03545` merged `main` in at 23:05 |
| 20 | implementation | After #292 was squashed, merging `main` into this branch conflicted on 11 files, resolved with `--ours` after checking that the trees matched. The operator then ruled one pull request, no stacks | prompt fact 6; commit `c931978`, whose message lists the 11 files | `no-op:` already eradicated by `three-pull-requests-for-one-afternoon-of-talos` (#304). Its hook refuses a pull request whose base is not `main`, and a second one from the same session |
| 21 | implementation | 15 of the 46 commits are merges, and 28 are another pull request's | #300 commit list | `merge into` 20 |
| 22 | deploy | `check_suite.completed` events arrived for older heads, and the merge hook reported that `main` had moved by two documentation pull requests during CI | prompt fact 7 | `no-op:` `what-a-hosted-session-cannot-do-on-github.md` already says to read the check runs and merge with `expectedHeadSha`, which is what makes an old event harmless. The hook refuses only when both sides changed a file (`pretool-merge-deploys-prod.sh:134`), and none was shared |
| 23 | implementation | `no-magic-numbers` flagged the literals of the tuple that is the closeness scale, so the line needed a disable comment | `[23:43] closeness-all-kinds` | `no-op:` a reasoned comment on the line is the exception path `CLAUDE.md` names. It is the only `no-magic-numbers` directive under `apps/`, `infra/` and `scripts/` (counted this sweep) |
| 24 | implementation | `GET /api/agent/export` returns rows in no stated order, so a test sorted two rows before asserting | `[23:43] closeness-all-kinds` | `no-op:` `MEMORY-CONTRACT.md:120` promises a dump of every table and no order. One writer, one test |
| 25 | implementation | A `flatMap` that returned `[]` for a rejected item left an equivalent Stryker mutant, because a later filter dropped the placeholder too. The knowledge entry on the 100% gates did not list that shape | `[20:21] computed-pages-fix` | `knowledge:` `writing-a-small-function-the-hundred-percent-gates-accept` gains the shape and the type-guard `filter` that shipped. The mutant is read in Stryker's source, version 9.6.1. It was not re-run |
| 26 | validation | Questions the validators asked that no commit answers: does a stale `expectedVersion` get its 409 when two `entity.upsert` arrive together, does any real body keep a hand-written list under a `###` heading inside a computed section, does `$t({{nameKey}})` escape the catalogue checks, which names does a page with no `type` get | reports 2005, 2024, 2054 and 2345, *Notes* | `no-op:` none is measured as a defect, and none can be settled here. The first needs two concurrent writes on Aurora DSQL, the second the production bodies. Both go to the operator in the hand-over of this sweep |
| 27 | post-merge | A synthetic merge commit cannot serve as a narrower base, because `vitest --changed` and `mutate-changed.sh` both diff from the merge base | this sweep's `KAIZEN.md`; from a synthetic base, 83 files by the merge-base diff both tools use against 36 by a plain diff (measured) | `merge into` 15. It is why the fix is a file scope and not another ref |
| 28 | post-merge | The final context reads 158,701 tokens after a compaction, where the same session read 760,192 for the #292 row | this sweep's `KAIZEN.md`; `get_session` | `no-op:` the row in `feature-cost.md` says so. The *Targets* table already calls the figure a ceiling of the last call |

Counts: 0 dantotsu, 2 knowledge, 2 fixed, 5 merged into another row, 19 no-op.

No dantotsu ships. The two defects the validators measured (rows 06 and 07)
were fixed or made moot before the merge, each with a test. The class behind
rows 01 to 03 has no rung above a triggered knowledge entry that this sweep
could build and prove.

## Proof for row 15

The scope filter of `scripts/mutate-changed.sh`, old and new, run on the 120
files changed between closeness round 1 (`35cd4d1`) and round 2 (`02b63ec`):

```
old filter, file scope: []
new filter, file scope: [apps/talos/domain/closeness.core.ts]
new filter, folder scope: apps/talos/domain/closeness.core.test.ts apps/talos/domain/closeness.core.ts apps/talos/domain/error-reporting.core.test.ts apps/talos/domain/error-reporting.core.ts
new filter, a prefix that is no path: []
```

The folder scope shows why a folder was not enough. `error-reporting.core.ts`
came in with the merge of `main`, and the old script would have mutated it.
The whole script was then run once with a file that is not gated,
`scripts/mutate-changed.sh HEAD scripts/mutate-changed.sh`, and it answered
`no gated file changed between HEAD and the working tree, so nothing ran`,
exit 0. No Stryker run was made with a file scope.
