# Friction inventory, PR #251 (setlist breaks)

Sources: the archived log `docs/features/pragma/setlist-breaks/kaizen.md` (6
lines), the two technical-validation reports in the same folder, the 5 commits
of PR #251, its conversation (one preview comment, no review thread), its 18
check runs (all green at merge) and `get_session` on
`session_01K69KnEgGhRxs5YnwwG4V2U`.

Writers in the log: `main` 2, `technical-validator` 2, `hook:no-broad-kill` 1,
`hook:no-swallowed-push` 1. The main session implemented without subagents, so
no agent went unlabelled.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `hook:no-broad-kill` refused a `pkill` or `killall`. | kaizen 17:45 | no-op: the hook refused before anything ran, and the line is filed under the guard-hooks wall (`docs/quality/working-conditions.md:90`). |
| 02 | implementation | The exact MCP tool count and the route-to-tool coverage are only discovered by running the database-backed assistant suite, so a new route meets them late. | kaizen 17:45 (`main`); `tool-coverage.test.ts` passed with no database in 4.9 s (measured) | fixed: `tool-coverage.test.ts` and the tool-count pin move into the `core` project, which pre-push runs. A planted route with no tool now fails `vitest run --project core --changed HEAD` (`GET /api/setlists/:id/planted`, measured). |
| 03 | implementation | `prettier --write` reformatted unrelated files. The formatter is oxfmt, and nothing said so before the run. | kaizen 17:45 (`main`); global prettier 3.8.1 at `/opt/node22/bin/prettier`; with the leftover `.prettierrc.json` it flags 2 oxfmt-clean files in one folder (measured) | knowledge: `diff-driven-checks-that-choke-on-sql-and-case-statements` rewritten, with a command trigger on a prettier invocation. fixed: `.prettierrc.json` deleted; `oxfmt --check` output is unchanged without it (measured). Recurs [the-formatter-the-repository-told-me-to-run-was-not-its-own](../../../dantotsus/the-formatter-the-repository-told-me-to-run-was-not-its-own.md). |
| 04 | validation | The spec has no Test strategy, Use cases or Files-to-change section, so the validator rebuilt categories A and D from Behaviour and Data shape. | kaizen 17:46 (`technical-validator`); both reports' headers; the same paragraph in `setlist-order-survives` and `several-calendar-feeds` reports | fixed: `technical-validator.md` treats the short form as valid input and stops asking for the missing sections, which three reports in a row asked for and no spec added. |
| 05 | pr-description | `hook:no-swallowed-push` refused a piped `git push` or `git commit`. | kaizen 17:48 | no-op: same as row 01. |
| 06 | validation | `vitest --coverage` in `apps/pragma` failed with `ENOENT` on `coverage/.tmp/coverage-27.json`; the validator guessed a parallel run. | kaizen 17:52 (`technical-validator`); report 1745 Notes; reproduced with two concurrent runs (measured) | dantotsu: `two-coverage-runs-shared-one-scratch-folder` |
| 07 | validation | The MCP ambiguity hint numbered songs by shared position, so a break shifted it (A09). | report 1745 A09; `ace7d308` | no-op: round 1 caught it before merge and `setlist-tool.core.test.ts:163` pins the fix. |
| 08 | validation | The spec claimed "the undo of a removal needs no change", which was false (A19). | report 1745 A19 | no-op: the validator reproduced it under `tsx` before merge and the spec was amended in `ace7d308`. CLAUDE.md's *Verify before asserting* is the rule it broke, and validation held it. |
| 09 | validation | `pnpm knip` failed on the unused `deleteBreaksOfSetlistWithin` (B03). | report 1745 B03; `6e6696e7` | no-op: the knip gate caught it before merge. |
| 10 | validation | Six spec bullets had no test (D10, D11, D19, D21, D22, E07). | report 1745 | no-op: category D, built from the bullets, caught all six; `ace7d308` added them. |
| 11 | validation | Round 2 failed on one missing undo hook test (R06). | report 1812 R06; `fe265aa7` | no-op: fixed inside the two-round cap, without a third round. |
| 12 | post-merge | A break added or deleted between a song removal and its undo made the undo's reorder answer `409 reorder-stale` and left the remembered break one song early (A04). It shipped as "Open". | report 1812 A04; PR #251 body, *Notable* | fixed: `restoreBreakPlacement` merges the remembered placement into the current break list; a hook test fails on the old code (`"y"` missing from the reorder, measured). |
| 13 | pr-description | A known defect went into the PR body as "Open", which is none of fix, dismiss or ask. | PR #251 body | merge into 12 |
| 14 | validation | B12, repository-owned transactions, dismissed. | `ace7d308` message | no-op: dismissed with a concrete reason, as CLAUDE.md asks. |
| 15 | validation | Closing a vote can race a `POST /breaks` (report Notes). | report 1745 Notes | no-op: the operator declined a server check that refuses a break while a vote is open. Not reopened. |
| 16 | conception | No plan was written; A00 UNVERIFIABLE was dismissed "for this size". | `ace7d308` message; reports A00 and A01 | no-op: no finding in either report traces to the missing plan (inferred from both reports), and the validator still records `plan absent`. |
| 17 | validation | `/visual-validation` did not run as a skill; a manual Playwright pass at 375 px replaced it. | PR #251 body, *Gap: visual validation* | no-op: disclosed as a gap in the body, and the operator merged it with that disclosure. |
| 18 | conception | No ADR for the `setlist_break` table. | PR #251 body, *Notable* | no-op: `/route`'s ADR triggers (dependency, secret, column driven by an external service, cross-cutting structural choice) name none of a new table inside one app. |
| 19 | post-merge | Creating the kaizen card timed out and the session ended unsure it existed. | `get_session` `post_turn_summary` | no-op: CLAUDE.md's fallback, paste the prompt, worked; this sweep started from it. |
| 20 | post-merge | The feature's cache-write ceiling is $4.80 against a $2 target, and its final context 407,358 against 150k. | `get_session` usage | no-op: recorded in `docs/quality/feature-cost.md`; both are ceilings, not medians. |
| 21 | implementation | The tool-count pin forced one `save_setlist_break` tool instead of three. | PR #251 *Decisions* table | merge into 02 |
