# Friction inventory for PR #238

PR #238 let a pragma member connect several calendars, each listed under its
feed's own name. Sources are its archived log at
`docs/features/pragma/several-calendar-feeds/kaizen.md` (8 lines: 3 from
hooks, 2 from `technical-validator`, 1 from `technical-validator-2`, 2 from
`visual-validator`), the events the operator's prompt listed, the ten branch
commits, the two technical and one visual validation reports, and CI runs
40918532741 (red), 40920276387 (cancelled by the next push) and 40920966846
(green). The PR has no review threads. Its two comments are bots'. No line
came from an implementation agent, so either the main session implemented or
its agents logged nothing (unknown).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | A `git push` or `git commit` was piped into another command and the hook refused it | archived log 14:28 `hook:no-swallowed-push` | no-op: refused before anything ran, as designed. The `guard-hooks-refuse-a-command` wall in `docs/quality/working-conditions.md` counts these |
| 02 | implementation | The same refusal a second time | archived log 14:31 `hook:no-swallowed-push` | merge into 01 |
| 03 | validation | A `--changed` core run exited 1 once with "window is not defined" from `SetlistSongPicker.test.tsx`, a file outside the diff, and passed on rerun | archived log 14:35 `technical-validator` | merge into the-ref-that-cancelled-every-keystroke: this flake started the chain. #235 fixed it in the test file at 15:57 UTC and `docs/knowledge/a-debounce-that-outlives-its-test-file.md` covers it |
| 04 | implementation | Round 1's fix cancelled the debounce through `ref={() => publishSearchedTitle.cancel}`. React 19 ran that cleanup on every commit, so Add songs never searched the music service | commit `1dfe16e5`; report `technical-validation-2026-10-29-1451.md` row B07; fix `74a0171b` | dantotsu: the-ref-that-cancelled-every-keystroke |
| 05 | validation | No test covered the service search after typing, so the core suite passed with the regression in | report `technical-validation-2026-10-29-1451.md` row B07; test added in `74a0171b` | merge into the-ref-that-cancelled-every-keystroke |
| 06 | validation | HEAD moved from `1f8c003e` to `e0513542`, a `.gitignore` commit, while round 1 was reviewing | archived log 14:42 `technical-validator` | no-op: round 2 reads the diff since the reviewed SHA, so the commit was reviewed there. It touched no code |
| 07 | validation | Proving the ref regression needed a jsdom probe in the scratchpad, because the validator may not add a test in the repo and vitest collects only under `apps/` | archived log 14:58 `technical-validator-2` | no-op: one agent, once, and the probe worked. The test `74a0171b` added now holds the case |
| 08 | validation | Round 1 found the order test for same-name calendars would catch a missing tie-break only about one run in two, because the ids were random | report `technical-validation-2026-10-29-1451.md` row D01 | no-op: fixed in `74a0171b` with fixed ids, and round 2 found it held |
| 09 | validation | On `pnpm dev` the seed attached zero calendar feeds, because its `http://localhost` fixture addresses fail the feed-address rule | archived log 15:07 `visual-validator` | knowledge: pragma-calendar-fixtures-attach-only-on-a-preview. It also matches the `seed-and-fixture-out-of-step` wall |
| 10 | validation | The reader refuses non-public hosts too, so the validator needed public ICS feeds and direct dev-database writes | archived log 15:16 `visual-validator` | merge into pragma-calendar-fixtures-attach-only-on-a-preview |
| 11 | validation | Row 27, the name trim and 120 character cap, was UNVERIFIABLE for want of such a feed | report `visual-validation-2026-10-29-1505.md` row 27 | merge into pragma-calendar-fixtures-attach-only-on-a-preview, which sends that row to `ics.core.test.ts` |
| 12 | validation | With a calendar connected, a refused address closed the add field and lost the typed value | report `visual-validation-2026-10-29-1505.md` row 11 | no-op: `21cf9441` made `onSave` return `'saved' \| 'refused'`, so the form cannot close on a refusal it cannot see, and a test holds it |
| 13 | validation | Find a slot printed the same bare line for every unnamed failing calendar, where Account numbered them | report `visual-validation-2026-10-29-1505.md` row 21 | no-op: `21cf9441` computes the number once in the API for both screens |
| 14 | validation | At 375 px similar long names were cut to the same prefix | report `visual-validation-2026-10-29-1505.md` row 22 | no-op: layout at 375 px is visual validation's job, and it caught it. `21cf9441` wraps the name |
| 15 | validation | Technical validation passed the three rows visual validation then failed | rows 12 to 14; both round reports | no-op: the technical validator reads code against the spec and the visual one drives the screen, in that order on purpose. The three fixes took one commit |
| 16 | validation | The validator reached for `pkill` or `killall` and the hook refused it | archived log 15:22 `hook:no-broad-kill` | no-op: refused before anything ran, as designed |
| 17 | implementation | The blueprint-index pre-commit refused a commit after a `@FollowsBlueprint` marker was moved on purpose | operator's prompt; commit `1dfe16e5` | no-op: the refusal is the design, and its message prints the exact `--accept <file>` command (`scripts/blueprints/subjects.core.ts`) |
| 18 | implementation | Two merges of `main` conflicted, on `blueprint-subjects.json` and on `me-tools.controller.ts` | commits `17c3d348`, `2e5aed5b` | no-op: parallel feature branches touching one shared file, resolved in the merge |
| 19 | ci | The mutation job failed on 8 surviving mutants. Six needed sharper tests and two were dead code | run 40918532741 job `mutation`; fix `2a9aa7f9` | no-op: mutation runs in CI by choice, because it took 194 s of a 244 s push on PR #216 (`scripts/mutate-changed.sh`). One red run is the price that choice accepted |
| 20 | ci | The per-file coverage gate failed on the index callback of `calendar-feeds.schema.ts` after the push hook had passed | run 40918532741 job `app-tests (pragma)`; fix `7550244b` | dantotsu: the-coverage-gate-a-wrong-comment-kept-in-ci |
| 21 | ci | The skills told the implementer and the validator that coverage is CI's, so neither ran it | `plugins/borso-harness/skills/technical-validation/standard.md`, `agents/technical-validator.md`, `skills/implementation/SKILL.md` before this PR | merge into the-coverage-gate-a-wrong-comment-kept-in-ci |
| 22 | post-merge | Both CI failures happened after the log was archived, and no line recorded them | archive commit `d1c62205` at 15:24 UTC; fixes at 17:18 and 17:23 UTC | no-op: the prompt that started this sweep carried both, the channel `/open-pr`'s After the merge names |
| 23 | pr-description | The PR opened at 17:09 UTC, three hours after the first commit, so CI first ran on the near-final tree | PR created_at; first CI run 40918532741 | no-op: CI ran on every push. Pushing earlier would have met the same two gates sooner, which row 20's fix now moves to the push |
