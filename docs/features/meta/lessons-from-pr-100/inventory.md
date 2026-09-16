# Friction inventory — PR #100

Every friction event of the task that shipped the tasks-by-member and
compositions screens, in the order it happened. The decision column is what
`/after-task-dantotsus` did with it. The body of PR #102 links here rather
than carrying the table, because the PR-body budget refuses a table this
size — which is row 16.

`KAIZEN.md` held **one** line at sweep time, written by the visual validator
because its dispatch prompt told it to. The main session logged none of its
own, so rows 1-15 were rebuilt from the transcript, the commits and the CI
runs. That is row 15, and it is the reason two of the three dantotsus below
exist.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `pnpm lint` reported a missing sibling test for `tasks.schema.ts` while the file sat beside it; the cache lives at the repo root because the script `cd`s there, and the app-level cache I cleared was not the one being read | transcript: two clean-and-retry cycles before `npx eslint <file>` alone said "No issues found" | no-op: `docs/dantotsus/eslint-cache-useless-on-a-fresh-checkout.md` and `docs/knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md` already hold the cache-staleness shape; the new part is only which directory the cache is in, and `--cache-location` is on the line above it in `package.json` |
| 02 | implementation | A Python `str.replace` over a JSX block rewrote `SongEditForm.tsx` into 343 000 lines; recovered with `git checkout` and redone with the Edit tool | transcript: `error TS1128` at line 343510 | no-op: the recovery was one command and the lesson — a blind string replace is not an editor — is the Edit tool's whole reason for existing |
| 03 | implementation | Four mutants survived the pre-push gate; three were equivalent, pointing at redundant guards rather than at missing tests | `stryker` output on the first push attempt | knowledge: appended to `how-a-mutation-survivor-hides.md` |
| 04 | implementation | A filtered `vitest --coverage` run reported 0% for every gated file the filter excluded and failed its thresholds | transcript: `ERROR: Coverage for lines (0%) … setlist-status.core.ts` | no-op: CLAUDE.md's pre-push section already states that a per-file coverage threshold cannot run over a changed-only selection, which is exactly what this was |
| 05 | implementation | `max-lines` refused `SongEditForm.tsx` twice — once for the origin field, once again after the merge brought Deezer's fields | `pnpm lint` on both occasions | merge into row 14: both were the same file arriving at the ceiling from two directions |
| 06 | validation | The validator failed two rows because the checklist named the wrong composition; the screen and the data agreed and the brief did not | `KAIZEN.md` (`visual-validator`), `report:docs/features/pragma/tasks-and-compos/validation/visual-validation-20260915-1954.md` rows 11 and 17 | dantotsu: `the-seed-said-one-compo-and-the-checklist-said-another` |
| 07 | validation | A third row failed for asking the chord chart to render chords above lyrics, a layout no screen in the application has | same report, row 16 | merge into row 06: one brief, written from assumption rather than from the tree, produced both |
| 08 | validation | The done checkbox was a 16 by 16 px tap target, the row around it inert | same report, unasked-for findings | no-op: found and fixed inside the PR (`abc45e3`), which is the validation layer working |
| 09 | pr-description | The body's `<details>` toggles were refused by `pretool-github-pr-body.sh`; the sanitizer would have flattened them | hook stderr, `create_pull_request` refused | no-op: the guard fired and named the fix, which is a rung-2 eradication doing its job |
| 10 | pr-description | A second body was refused for an autolinked preview URL | hook stderr, `update_pull_request` refused | no-op: same guard, same verdict |
| 11 | pr-description | A markdown link to a `.md` file came back from the server wrapped in double backticks and broken, which the corpus records as a shape that survives | `comment:` PR #100 body read back after `update_pull_request`; `docs/knowledge/github-mcp-pr-body-sanitizer.md` says a `.md` target is untouched | knowledge: `github-mcp-pr-body-sanitizer.md`, after a round-trip probe on PR #102 |
| 12 | implementation | `git commit -C ORIG_HEAD` reused a merge commit's message, so the feature landed under "Merge pull request #98" until amended | `commit:b3fd128` (amended from `d1baaa3`) | no-op: a wrong flag, caught on the next `git log`, with no trace left in history |
| 13 | merge | Two branches numbered a migration `0006`; git merged both cleanly and the apply order fell to alphabetical luck | `commit:13f1a84`, the merged directory listing | dantotsu: `two-branches-took-the-same-migration-number` |
| 14 | merge | `SongEditForm.tsx` crossed the 300-line ceiling because both sides added fields to it | `pnpm lint` after the merge; resolved by extracting `SongClassificationFields` | no-op: the ceiling did its job twice in one PR; the file is now three components lighter than it was |
| 15 | post-merge | The friction log held one line for a day of work, and none of the five hook refusals above wrote themselves down | `KAIZEN.md`, rows 09 / 10 / 12 of this table | dantotsu: `the-hooks-that-refused-a-call-and-forgot-it` |
| 16 | post-merge | The sweep's own skill requires the inventory table at the top of the kaizen PR body, and the PR-body budget landed by PR #101 refuses a body that size | `.claude/skills/after-task-dantotsus/SKILL.md` step 5 against `scripts/pr/check-pr-body.ts` | dantotsu: merged into `the-hooks-that-refused-a-call-and-forgot-it` as a sibling sweep — the skill now sends the inventory to a committed file and the body links it |

## Patterns

- **Three rows (09, 10, 11) are the same vendor**: the GitHub MCP body
  sanitizer. Two were caught by the guard that exists; the third is a shape
  the guard believed safe. The pattern is that the guard's knowledge is a
  snapshot, and the entry behind it already demands a round-trip probe before
  any new claim — which is what row 11 got.
- **Three rows (09, 10, 12) were refusals nobody recorded.** The guards work
  and their evidence evaporates. That is row 15, and it is the systemic one:
  every other row in this table had to be reconstructed.
- **Two rows (06, 07) are one brief written from assumption.** Neither was a
  defect in the screens. Both cost a validation round, and the fix is to make
  the data a committed fixture rather than a claim in a prompt.
- **Two rows (05, 14) are one file at its ceiling.** Not a defect; a limit
  doing what a limit does, twice, which is the signal that the file was
  carrying more than one job.
