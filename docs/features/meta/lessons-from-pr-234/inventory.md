# Friction inventory for PR #234

[PR #234](https://github.com/hugoleborso/borso.fr/pull/234), merged as
`f90296be`, added practice flames on pragma's Home and a 20:00 streak
reminder. Sources: the archived log
`docs/features/pragma/practice-streak/kaizen.md` (23 lines), one line logged
after the archive, the 18 commits, the four validation reports, 15 workflow
runs, and the PR's two bot comments. The PR had no review threads.

Writers in the log: `main` 3, `hook:no-swallowed-push` 2, `hook:no-broad-kill`
2, `technical-conception-01` 1, `implementation-01` to `-06` 7,
`technical-validation-01` and `-02` 2, `visual-validation-01` and `-02` 5. Every
subagent logged under its own label. Two validators hit the route glob
separately (rows 15 and 16). Two implementers hit the import graph (row 09).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The brief said PR #216 was merged, and the session found it open. | log 11:15 `main`; PR #216 `merged_at` 2026-10-29T11:15:38Z | no-op: #216 merged within the same minute, so the brief was right moments later. |
| 02 | implementation | `no-swallowed-push` refused a piped `git push` or `git commit` twice. | log 11:15 and 11:40 | no-op: the hook refused as designed, and its message names the fix. |
| 03 | implementation | commitlint's `subject-case` refused a subject that opened with "ADR for". | log 11:40 `main`; commit `41adc8c7` reworded | no-op: config-conventional refuses an upper-case opening word, and the message names the rule. One retry. |
| 04 | plan | The technical-conception template's self-check named eslint and `pnpm typecheck`, which pragma does not run. | log 11:49 `technical-conception-01`; `template.md:41-42` | fixed: kaizen commit "align the skills with no-comments and oxlint". The lines are gone, because the hooks run lint and typecheck. |
| 05 | implementation | Four skill files and the validator agent said "comments document the WHY only", while `borso/no-comments` refuses every prose comment. | log 12:05 `implementation-01`; `docs/standards/00-principles.md:148` | fixed: same commit. Each now states the rule the linter holds. |
| 06 | implementation | `git rm` staged a deletion that a subagent told not to stage had to undo. | log 12:05 `implementation-01` | no-op: the deletion was meant to ship, and the main session's commit staged it anyway. One agent, one undo. |
| 07 | plan | The plan put `StreakReminderKey` in a core file that another core file had to import back. | log 12:26 `implementation-02` | merge into 09. |
| 08 | implementation | A `console.log` in a passing CDK test printed nothing, so the value went to a scratch file. | log 12:26 `implementation-02`; measured: 0 lines plain or with `--silent=false`, 1 line with `--reporter=default` | knowledge: `vitest-hides-the-console-of-a-passing-test-from-an-agent`. |
| 09 | implementation | Twice the plan's file layout fought the import graph, once as two core files importing each other and once as `import/no-cycle` through members and sessions. | log 12:26 `implementation-02`, 13:14 `implementation-04` | no-op: the type checker and `import/no-cycle` caught both at once, and each fix was one move. |
| 10 | implementation | `no-broad-kill` refused `pkill`. This sweep hit it too. | log 12:45 and 14:02; this session 17:38 | no-op: the hook refused as designed, and its message gives `lsof -ti tcp:<port>`. |
| 11 | plan | The plan asked for a `flame` glyph that `INSTRUMENT_GLYPHS` already registered. | log 12:45 `implementation-03`; TS2783 | no-op: typecheck caught it in one compile, and commit `bfaeda92` later dropped the glyph for drawn marks. |
| 12 | validation | A tap on the `phone` session failed until the agent signed in there too. | log 12:45 `implementation-03` | knowledge: extended `driving-previews-with-agent-browser-and-argent`. |
| 13 | validation | The brief's base ref was the stacked slice-6 branch, rewritten by #216's squash, so the diff spanned 925 files. | log 12:46 `technical-validation-01` | no-op: #216 had merged, so the skill's default `origin/main` was right. The override came from the brief, and the validator recovered in one step. |
| 14 | validation | rtk cut each hunk of `git diff` at 100 added lines. | log 13:22 `technical-validation-02`; measured 356 against 100 lines plus `... (255 additions truncated)` | dantotsu: `the-reviewer-read-a-hundred-lines-of-each-hunk`. |
| 15 | validation | `network route '**/api/streaks*' --abort` printed Done and blocked nothing. Two validators hit it. | log 13:36 `visual-validation-01`, 13:59 `visual-validation-02`; measured `status 200` on 0.27.0, `aborted` on 0.35.2 | dantotsu: `the-browser-on-path-was-not-the-pinned-one`. |
| 16 | validation | `agent-browser --version` printed 0.27.0 against the 0.35.2 the knowledge was verified on. | log 13:36 `visual-validation-01`; start banner | merge into `the-browser-on-path-was-not-the-pinned-one`. |
| 17 | validation | The spec's happy-path numbers did not match the seeded fixture. | log 13:36 `visual-validation-01` | no-op: the validator mapped each step to a seeded member in the same state, and every mapped row still discriminated. |
| 18 | implementation | `find role link --name Home` matched nothing at 375 px, and `back` left `about:blank`. | log 13:50 `implementation-05`; both worked on 0.35.2 on a synthetic page | merge into `the-browser-on-path-was-not-the-pinned-one` (inferred, not reproduced on pragma). |
| 19 | validation | `phone.sh touch` tapped a hidden first match at 0,0. | log 13:53 `visual-validation-02`; before the fix "no touchstart reached the target", after it a real touch | fixed: kaizen commit "tap the first visible match". |
| 20 | validation | A dev server under the 30-minute background limit died during validation. | log 13:54 `main` | fixed: `/visual-validation` step 3 now starts it with `timeout: 7200000`. |
| 21 | implementation | Stryker made no mutant for `flame-mark.utils.ts`, and the gate passed at NaN. | log 14:23 `implementation-06` (after the archive); measured 51 mutants, all static, "Final mutation score of NaN" | knowledge: `a-file-of-constant-tables-passes-mutation-with-no-mutant`. Also fixed: the flame paths were checked by prefix, and are now pinned whole. |
| 22 | validation | Seed studies shifted whole 24 h steps, so two shared a Paris day after the clock change. | report `technical-validation-2026-10-29-1246.md` A28 | no-op: fixed in-PR by `0febe997`. The seed's two other 24 h offsets are a due date and a concert time whose Paris day nothing asserts (inferred). |
| 23 | validation | Study reads were named for days but returned rows. | same report, B13 | no-op: fixed in-PR by `0febe997`. |
| 24 | validation | No test ran two reminder jobs at once. | same report, E02 | no-op: fixed in-PR by `0febe997`, which adds the concurrent test. |
| 25 | validation | Member flames in the sheet painted outside the accent family. | `visual-validation-2026-10-29-1323.md` row 06 | no-op: fixed in-PR by `dba582b2`. |
| 26 | validation | Two overlapping study writes let a stale flame answer land last. | same report, row 25 | fixed: the in-PR fix `dba582b2` shares one mutation scope. This kaizen adds the rule and a `reviewer` bullet to `docs/standards/06-data-fetching.md`, the second time this shape appears after `setlist-entries`. |
| 27 | validation | The flame read failure was not visibly logged. | same report, row 31 | no-op: fixed in-PR by `dba582b2` through the error-reporting adapter. |
| 28 | validation | A deleted member's drop from the band count could not be shown, because the seeded member could not study. | `visual-validation-2026-10-29-1350.md` row 29 | no-op: the streaks core tests cover the deleted-member case, and the browser was the wrong layer. |
| 29 | validation | Nine server-side rows (push, job, Sentry, takes) were unverifiable in a browser. | both visual reports | no-op: the spec routed each to a core or controller test, and those tests exist in the technical reports. |
| 30 | post-merge | The operator asked for drawn flames after the PR opened, so the icon glyph gave way to the Blaze and the Bonfire. | commits `f971f359`, `bfaeda92` | no-op: a taste call made on the built chips and settled in one commit from a prototype. The screenshot folders 1430 and 1523 show the result before merge. |
| 31 | post-merge | The scheduler ADR stayed `proposed` after merge, and 25 merged ADRs from `0010` to `0046` were also still `proposed`. | commit `0febe997` body; `grep "Status:\*\* proposed" docs/adr` | fixed: ADR-202610291139 stamped `accepted`. `/after-task-kaizen` gains step 1c, since no step did it. |
| 32 | post-merge | The PR's commit list carried four #231 commits. | PR #231 commits | no-op: the cost row names them, and they stay counted in #231's row. |
| 33 | ci | One screenshots run was cancelled. | run 40891182658 | no-op: a newer push superseded it. Every other run was green. |

Counts: 2 dantotsu, 3 knowledge (2 new, 1 extended), 6 fixed, 3 merged, 19
no-op.
