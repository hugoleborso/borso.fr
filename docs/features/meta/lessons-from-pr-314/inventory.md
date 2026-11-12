# Friction inventory for PR #314

PR #314 gave the Talos PWA the Phaistos coin as its icon and a cold-start
opening. Sources: the archive `docs/features/talos/phaistos-icon/kaizen.md`
(5 lines), the line logged after it, the shipping session's transcript
(session_01K69KnCkGVwNDQy7uL7VPYi, read with `list_events` from 07:40 to
11:57 UTC), the two validation reports, the branch's six commits, the pull
request's comments and its check runs.

Writers in the archive: `main` 1, `hook:commitlint` 1, `technical-validator`
2, `technical-validator-2` 1, plus `hook:no-swallowed-push` 1 after the
archive. Every subagent logged under its label, so the sweep is not blind to
them.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | A test firing `animationstart` reached no handler, because jsdom has no `AnimationEvent` and React then listens for the webkit names. Pragma's `OpeningScreen.test.tsx` and `RequireSession.test.tsx` had each hit the same wall alone. | archive line 07:41 (`main`); `grep -rln webkitAnimation apps/*/site/src` finds all three tests | dantotsu: a-test-fired-an-event-react-was-not-listening-for |
| 02 | implementation | Commitlint refused `feat(talos): Phaistos coin icon and cold-start opening` for `subject-case`. Five such refusals in four tasks, all on a proper noun or an acronym. | archive line 07:48 (`hook:commitlint`); reproduced with `pnpm exec commitlint`; `grep -rh commitlint docs/features/*/*/kaizen.md` | dantotsu: commitlint-refused-every-proper-noun |
| 03 | validation | A short-form spec routed nothing to `/visual-validation`, so spin count, timing and light sweep got only a structural citation of keyframes. The visual validator builds rows only from sections a short-form spec lacks, and 11 short-form features have no visual-validation report. | archive line 07:54 (`technical-validator`); report `technical-validation-2026-11-12-0750.md` preamble; `.claude/agents/visual-validator.md` step 2 | fixed: this pull request's commit, which routes browser-only claims of a short-form spec to `/visual-validation` in both agent definitions |
| 04 | validation | The opacity guard test read only class names and inline style, so the validator read `tokens.css` keyframes by hand. | archive line 07:54 (`technical-validator`); round 1 row D24 | no-op: fixed in the pull request by `aad17fe98`, whose test reads the coin's keyframes from `tokens.css`. Round 2 row R02 saw it fail on a planted `opacity` |
| 05 | validation | The brief's scratchpad work folder did not exist, so the first redirect failed and a test run was repeated. Two earlier validator lines record the same wall, one with a lost gate log. | archive line 08:05 (`technical-validator-2`); `grep -rhi "did not exist" docs/features/*/*/kaizen.md` | dantotsu: a-work-folder-every-brief-named-and-nobody-made |
| 06 | pr-description | `hook:no-swallowed-push` refused a command that sent `git commit` output to `/dev/null` and piped `git push` into `tail -1`. | line logged after the archive; transcript 08:31:06Z, retried at 08:31:13Z with logs kept, `commit=0` and `push=0` | no-op: the refusal was right, since the command hid every pre-commit refusal, and the retry cost 7 seconds |
| 07 | validation | Round 1 ended FAIL on four blocking findings (gleam opacity, a guard test reading class names, an unpinned dock logo, an untested session flag). | report `technical-validation-2026-11-12-0750.md` | no-op: all four were fixed in `aad17fe98`, and round 2 rows R01 to R04 verified each |
| 08 | validation | The fix round amended spec Opening 6 to let the gleam fade its own opacity. Round 1 had called that choice a product call, and no operator message approved it. | transcript 07:57:23Z decision, 08:04:56Z message telling the operator; round 2 note R01 | no-op: the amendment kept the rule's intent (no mirrored back), its premise is observable and was observed on the opening frames, and the operator read it at 08:04 and merged at 11:55 |
| 09 | validation | Round 2 ended FAIL on R06: a dismissal reason that was false for two inline-style literals. The fix landed after the report, with no third round. | report `technical-validation-2026-11-12-0805.md`; commit `8706552ad` | no-op: CLAUDE.md caps validation at two rounds. On `main`, `SpinningCoin.tsx:16` and `OpeningOverlay.tsx:20` derive both values from constants (measured) |
| 10 | validation | Round 2 noted that `scripts/mutate-changed.sh 20bf60b8 apps/talos` also mutated `opening.core.ts` and `class-name.utils.ts`. | round 2 Notes | no-op: not reproduced. At `aad17fe98` the committed changed set holds only `opening.adapter.ts` (measured), and the next commit touched neither file. The cause is unknown, and every mutant was killed |
| 11 | validation | Spec Icon 4 says the title coin is 28 px, and no test pinned the size. | round 2 note R03 | fixed: this pull request's commit, which asserts `width` 28 in `App.test.tsx` |
| 12 | validation | `favicon.ico` was declared `sizes="48x48"` while it holds 16, 32 and 48. | round 1 Notes; `file apps/talos/site/public/icons/favicon.ico` | fixed: this pull request's commit, which sets `sizes="16x16 32x32 48x48"` |
| 13 | validation | `shouldOpenThisLoad` is named as a question and writes the session flag. | round 2 finding B04 (non-blocking) | no-op: `unicorn-js(consistent-boolean-name)` refuses a boolean function without a question prefix. The rename to `consumeOpening` failed lint here (measured) |
| 14 | validation | Reduced motion switched on during the opening leaves the overlay hidden in the DOM until the next load. | round 1 Notes | no-op: the overlay is `display: none` and inert, and the validator found it blocks nothing |
| 15 | validation | Round 1 asked whether `onPointerDown` would ghost-tap a bottom tab on a phone. | round 1 Notes | no-op: spec Opening 4 moved the skip to `click`, and round 2 row D01 pins it |
| 16 | plan | `plan/plan.md` is absent. | round 1 row A20 | no-op: dismissed with a reason that round 2 row R05 checked and found true |
| 17 | conception | The Drive originals were out of reach, so every icon size is upscaled from 360 px copies. | spec *Out of scope*; `docs/operator-backlog.md` | no-op: logged in the operator backlog, where an access task belongs |
| 18 | implementation | The operator refused a header bar that costs height. | transcript 11:16:38Z | no-op: a product call, recorded in spec Icon 4 and shipped in `5e285a6e4` |
| 19 | pr-description | The operator asked for screenshots, suspecting overlap, a minute before merging. | transcript 11:54:25Z; screenshots comment 11:56:52Z | merge into 03: with no visual-validation report, the operator had nothing that checked the screens for him |
| 20 | post-merge | `pull_request_read` returned 503 twice at the start of this sweep. | this session | no-op: transient. The merge was confirmed from `main`'s squash commit `39a585dde` |
| 21 | post-merge | Every `list_events` page of the shipping session overflowed the tool output limit. | this sweep's `transcript-search` subagent | no-op: `docs/knowledge/reading-another-sessions-transcript-with-list-events.md` printed and was followed |
| 22 | post-merge | This sweep's `git checkout --` to undo a rename was refused, because it would have discarded the sweep's other edits. | `hook:no-discarding-reset` in this session's `KAIZEN.md` | no-op: the guard worked as written |

Counts: 3 dantotsus, 3 fixed, 1 merge, 15 no-op.
