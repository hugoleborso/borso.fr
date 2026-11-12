# Friction inventory, PR #292

`feat(talos): recurring tasks, an index on Jour, and one Todo tab`, squashed
onto `main` as
[`d87da29`](https://github.com/hugoleborso/borso.fr/commit/d87da2990)
on 2026-11-11. 28 commits, 134 files, one session. It carries the work of
PR #286 and PR #289, both closed without merging.

Sources walked: `scripts/kaizen.sh sweep-input d87da2990` (15 lines in 3
archives, the same three the sweep prompt named), the eight frictions the
prompt pasted, the body and the one bot comment of #292 (no review thread; #286
and #289 have no comment), its 28 commits, the workflow runs of its three
branches (no failed run, one cancelled, one still queued), the six validation
reports, the open pull requests (no other kaizen sweep open), and the branch of
PR #300 for rows 16 and 18.

Writers of the 15 lines: `technical-validator` 7, `index-navigation` 2, `main`
1, `routine-launch` 1, `index-navigation-fix` 1, `todo-switch` 1, and two hook
refusals. Each subagent had its label.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | validation | talos `pnpm dev` seeded no sign-in and no awaited commitment or grouped proposal, so the 375 px check ran on the real site with a stubbed API | `[12:12] main` | `dantotsu: the-dev-database-that-opened-no-screen`, commit `9542d8d` |
| 02 | validation | A hand-written script inserted a session row and signed its cookie to check a talos screen | `[13:14] routine-launch` | `merge into` 01, which prints that cookie |
| 03 | validation | The 375 px reviewer bullet could not be run, twice | `[13:23] technical-validator`; reports `routine-launch` 1317 B21 and 1336 B11, UNVERIFIABLE | `merge into` 01 |
| 04 | implementation | `pnpm dev:db` replayed the seed under the fixed key `dev-seed`, so a state added to `memory-seed.json` never reached a seeded database | `[17:51] index-navigation`; prompt friction 7 | `merge into` 01, which keys the seed on its content |
| 05 | validation | Measuring a screen registered a passkey, which closed registration for the next context, so each probe deleted its own row by hand | `[18:03] technical-validator`; report `index-navigation` 1753 Notes | `merge into` 01, the cookie needs no passkey |
| 06 | validation | The validator procedure names `agent-browser`, which cannot drive a CDP virtual authenticator, so the measure was a hand-written Playwright script | `[18:03] technical-validator` | `merge into` 01 |
| 07 | pr-description | The seed had no awaited commitment, no recent journal and only an expired proposal, so the video needed rows added by hand | `[19:02] todo-switch` | `merge into` 01, `dev-live-seed.json` dates those rows from the day |
| 08 | conception | One session opened #286, #289 and #292 from `main` for work where each needed the one before; the operator asked for stacking, then forbade it | prompt friction 1; #292 commits `2092435`, `b486f6a` (17:32, both branches merged in before its first commit); `.claude/skills/route/SKILL.md:60` | `dantotsu: three-pull-requests-for-one-afternoon-of-talos`, commit `ddc3bad` |
| 09 | implementation | 9 of #292's 28 commits are merges, 4 of them of the sibling branches into each other | #292 commit list: `2092435`, `b486f6a`, `965a6b0`, `b1eb059` | `merge into` 08 |
| 10 | pr-description | The operator backlog row named #286 and #289, both closed, as the source of a task | commit `44cc168` | `merge into` 08 |
| 11 | deploy | A `ci` run stayed `queued` from 20:31 and never started, the run before it stayed `in_progress` 64 minutes, and the API refused both a cancel (409) and a rerun (403) | prompt friction 2; runs 43092016616, 43096582465, 43115958396 (measured); githubstatus incident `dvy0t3mvh1lg`, 20:48 to 21:21 | `knowledge: a-queued-run-github-will-neither-cancel-nor-rerun` |
| 12 | deploy | `merge-on-moved-base` refused the merge right after a green CI, because `main` had moved on files the branch touched | prompt friction 3; commit `3d03545`, `ci` 23:06 to 23:12 | `no-op:` the gate of `two-merges-sixteen-seconds-apart-one-untested-main` held, and its price is the one run it cost |
| 13 | implementation | `docs/adr/README.md` conflicted in 3 of the 4 merges that had conflicts, after `main` renamed every ADR | prompt friction 4; commits `65c6bca`, `965a6b0`, `c344a8d` | `fixed: f420cd9`. `.gitattributes` gives the index a union merge. Replaying `65c6bca` with it leaves no conflict on that file (measured), and `check-adr-numbers-resolve.sh` refuses a row a rename left behind (measured, exit 1). The rename itself was one migration, #290's |
| 14 | implementation | `apps/talos/CONTRAT.md` conflicted in two merges and `App.tsx` in one | commits `65c6bca`, `965a6b0`, `3d03545` | `no-op:` three features edited the same contract sections and the same route table, which is the conflict 08 removes by keeping one branch |
| 15 | post-merge | The ADR the merge added was still `proposed` | `docs/adr/2026-11-11T1306-*.md` | `fixed: 08e2d26`, stamped `accepted` in the record and the index |
| 16 | spec | Two specs stated as fact what the code did not do: `entity.upsert` strips computed sections, and `entity.upsert` accepts an operation with no `kind` | prompt friction 5; on PR #300's branch, `closeness-scale/kaizen.md:19` and `computed-pages-and-freshness/kaizen.md:20` and `:23` | `no-op:` both specs and their three log lines are in PR #300, open and outside this sweep. They are archived there, so `sweep-input` hands them to its sweep |
| 17 | implementation | The scan prompt named the skill `scan`, a name inferred from a dropped prefix, and the real name is `scanner-sources` | commit `fcb01bb` | `no-op:` fixed before the merge by asking the agent session. The skill lives outside this repository (inferred from the commit message), so no command here could have settled it |
| 18 | validation | Round 1 failed for all three features: 9 spec claims no test held, and one concurrency rule with no concurrent test | prompt friction 6; reports 1215 (D02, D12, D14, D15), 1753 (D08, D20, D22, D28, D30), 1317 (E04) | `no-op:` category D and E caught all ten and each round 2 passed, inside the two-round budget. The prompt's "five of six" counts PR #300's reports too. The pattern is in the pull request's *Patterns*: every miss is wiring in a component, which mutation testing does not read |
| 19 | validation | The validators established the missing tests by reading, not by breaking the code, because they may write no file but the report | reports 1215 and 1223 Notes | `merge into` 18 |
| 20 | validation | Two decisions sent together both fired the routine and stored two runs, and a NUL character fired it then answered 500 | report 1317 A03, E03 (measured there); commit `8716148` | `no-op:` the validator's concurrency walk found both before the merge, and `8716148` made the write conditional inside the transaction |
| 21 | validation | Every report carries a `plan absent` row, and the body a *Gap: no plan* | six reports; #292 body | `no-op:` `.claude/agents/technical-validator.md` keeps the row on purpose for a short-form spec, and the operator merged with the gap stated |
| 22 | validation | The Todo tab commit landed after round 2 with no review, and `/visual-validation` was not run | #292 body, *Technical validation* and *Not run*; commit `022c2c5` | `no-op:` both are stated in the body the operator merged. The change is front-end only, so no gate asks for a report |
| 23 | validation | In the browser harness a long press opened the action sheet and the release closed it, on a tile and on a todo row | report 1753 Notes; #292 body *Notable* | `no-op:` this sandbox cannot settle it. `scripts/phone.sh` sends a tap, not a held touch, and there is no device. It is on code #292 did not write, and the kaizen pull request asks the operator to try it on his phone |
| 24 | implementation | `no-broad-kill` refused `pkill` | `[12:12] hook:no-broad-kill` | `no-op:` the hook held |
| 25 | pr-description | `api-validation` refused a pull request that changed an API with no report | `[12:14] hook:api-validation` | `no-op:` the hook held, and the report was run before the pull request opened |
| 26 | validation | `vitest --changed --coverage` printed an empty per-file table with every gated file at 100% | `[12:19] technical-validator` | `no-op:` reproduced. The summary under the table still gives what the gate read (343 statements on #292's diff). `--coverage.skipFull=false` does not fill the table (measured), and the cause was not probed further |
| 27 | validation | A probe for a suspected failing case needed a hand-written vitest config in the scratchpad | `[13:23] technical-validator` | `no-op:` one writer. The ban on writing to the repository is what keeps the validator's verdict independent, and the probe found row 20 |
| 28 | validation | `gh pr view` failed on GraphQL and the validator brief names no REST command | `[13:40] technical-validator` | `fixed: f420cd9`. `what-a-hosted-session-cannot-do-on-github.md`, which gives the REST call, now also triggers on `gh pr view`, `checks`, `status` and `list`, before the call fails |
| 29 | validation | `vitest --changed 42012559`, an all-digit short SHA, found no test file and exited 0 | `[17:55] technical-validator`; reproduced by this sweep | `fixed: f420cd9`, the validator passes `$(git rev-parse <ref>)` |
| 30 | implementation | The class `text-focus` set the focus colour, not the 22 px size, because `--color-focus` and `--text-focus` both existed | `[17:51] index-navigation` | `fixed: cebbd92`, the colour is `--color-focus-ring`. Built both ways: `.text-focus{color:…}` before, `.text-focus{font-size:…}` after (measured) |
| 31 | implementation | The `Held by` gate greps `^Held by:`, so an indented line was never checked | `[18:10] index-navigation-fix`; report 1813 Notes | `fixed: f420cd9`. `check-vocabulary-paths.sh` refuses an indented `Held by` line (planted on talos, exit 1) |
| 32 | implementation | A message from another Claude session relaying the operator's request did not count as a request, so each one was confirmed with the operator first, four round trips | prompt friction 8 | `no-op:` the harness treats a peer session's message as data on purpose. The cost is in the routing, and the kaizen pull request tells the operator |
| 33 | validation | Three questions the validators asked were never answered: two counters that can differ on « Jour », fence lines shown in a lesson body, `today.awaited_one` equal to `today.awaited_other` | report 1223 Notes | `no-op:` product questions, none measured as a defect. The index replaced the pills the first one names (inferred from the #292 body) |
| 34 | post-merge | The sweep prompt listed rows 16 and part of 18 as #292's friction, and their evidence is in PR #300 | this sweep's `KAIZEN.md` | `no-op:` found by grepping #300's branch. The prompt is written by hand, which the skill already warns about |
| 35 | implementation | A dev seed fixture written in TypeScript was refused by `no-french-identifiers`, because the memory wire format has French keys | this sweep's `KAIZEN.md` | `no-op:` the rule held. The dated rows are a JSON file, like `memory-seed.json` |
| 36 | implementation | `no-prettier` refused a Prettier call this sweep made | this sweep's `KAIZEN.md`, `[23:31] hook:no-prettier` | `no-op:` the hook held, and its message gives the oxfmt command |

Counts: 2 dantotsu, 1 knowledge, 6 fixed, 9 merged into another row, 18 no-op.
