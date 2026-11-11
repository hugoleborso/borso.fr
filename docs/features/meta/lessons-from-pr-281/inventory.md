# Friction inventory for PR #281

PR [hugoleborso/borso.fr#281](https://github.com/hugoleborso/borso.fr/pull/281)
rebuilt the 3S board on the Dashboard artifact type: every indicator scored
against a ceiling, measured over a week, twelve hours or sixty minutes, drawn
with real d3 charts. 16 files, 1,887 insertions, 18 commits, squashed onto
`main` as `5abe4b2b` on 2026-11-09.

## Where the lines came from

The task prompt named one archive,
`docs/features/meta/quality-dashboard/kaizen.md`, and 19 entries. Both were
wrong, which is row 16 and
[the-sweep-handed-a-log-it-had-already-read](../../../dantotsus/the-sweep-handed-a-log-it-had-already-read.md).
`scripts/kaizen.sh sweep-input 5abe4b2b`, added in this pull request, gives the
real input:

```
docs/features/meta/quality-dashboard-range-switch/kaizen.md — 3 line(s) this merge added, of 3 in the file
docs/features/meta/quality-dashboard/kaizen.md — 3 line(s) this merge added, of 19 in the file
  the other 16 line(s) came with an earlier pull request that reused this slug; they were swept with it

[kaizen] 6 line(s) to sweep, across 2 archive(s)
```

Six lines, one writer (`main`), two archives. Every line is `main`'s: the task
ran no subagents, so nothing here distinguishes one agent hitting a wall from
four. The rest of the inventory comes from the 18 commit messages, the CI check
runs, the pull-request body, `get_session` on
`session_01K69KnCk2rXC5mXMhzM8Sxn`, and the artifact type's own instructions.
PR #281 has no review comments and no validation reports.

Rows 23 to 38 are the 16 lines PR #263 archived into the same slug and swept in
[lessons-from-pr-263/inventory.md](../lessons-from-pr-263/inventory.md). They
are listed so the mapping is auditable, and each names the row that eradicated
it.

## Decisions

| Decision | Rows |
| --- | --- |
| dantotsu | 5 rows, 4 entries |
| knowledge | 2 |
| merge into another row | 5 |
| fixed in this pull request | 5 |
| no-op | 22, of which 16 are PR #263's lines |

## The inventory

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | The board's sections, scores and tooltips had to be rebuilt by hand, because nothing checked that the page kept its captions out of visible text | log: `main` 2026-11-06 12:06; commit `89675a5` moves every caption into a tooltip | merge into the-page-nobody-rendered-before-the-operator (nothing reads this page at all, which is the row below it) |
| 02 | conception | An inline script published in a plain artifact does not run, so the zoom dialog never opened on the published board though the same file worked in a browser | log: `main` 2026-11-06 18:38; commit `c28d9f1` | knowledge: the-dashboard-artifact-types-page-contract |
| 03 | implementation | Three layout rounds were spent on the board because nothing renders it in a browser before the operator sees it | log: `main` 2026-11-06 19:49; commits `7882838`, `8c34b75`, `0034087` | dantotsu: the-page-nobody-rendered-before-the-operator |
| 04 | implementation | The mutation gate passed locally and failed in CI, because `mutate-changed.sh` read `git diff` and the new dataset builder was still untracked | log: `main` 2026-11-07 10:56; commit `df66810` | dantotsu: the-gate-that-graded-a-file-git-had-not-met |
| 05 | implementation | The Dashboard type runs each page script in its own scope, so `drawChart`, declared in the second script and called from the third, threw on every call in the published page | log: `main` 2026-11-09 08:04; commit `05d36cf`; the type's own instructions, read 2026-11-09 | dantotsu: the-page-nobody-rendered-before-the-operator; the fact itself in knowledge: the-dashboard-artifact-types-page-contract |
| 06 | implementation | A card with an implicit `auto` grid column floored at its widest child, so the chips row never scrolled and the whole board did: 738 px of document in a 390 px viewport | log: `main` 2026-11-09 08:07; commit `61b68f1` | knowledge: a-grid-column-floors-at-its-widest-child; detection in the-page-nobody-rendered-before-the-operator |
| 07 | implementation | The second fix for the zoom rested on the same premise as the first, that a published artifact can drive a dialog without script, and failed the same way: `:target` and a link also never opened | commits `c28d9f1` then `ab1d3a3`, "never opened on the published board either" | merge into the-dashboard-artifact-types-page-contract (CLAUDE.md *Attack the premise* names the moment; the entry now states the premise) |
| 08 | implementation | CI's mutation gate found 61 survivors in the page renderer: the tests probed the markup with `toContain` on fragments, so a separator, a filter or a branch could change unnoticed | commit `4aefa85`; CI run on PR #281 | no-op: the gate caught every one before merge, and the test weakness it names is already [how-a-mutation-survivor-hides](../../../knowledge/how-a-mutation-survivor-hides.md), extended by PR #263's sweep for the same wall |
| 09 | implementation | CI's mutation gate found `findCeiling` could ignore the application, because the test's targets differed only by indicator id | commit `df66810` | no-op: the gate did its job; its local blind spot is row 04 |
| 10 | implementation | Every chart was drawn into a `viewBox` measured once with `preserveAspectRatio="none"`, so a second width stretched the bars, the ticks and their text on the operator's phone | commit `ee60d9d`; third occurrence of the trap in [svg-preserveaspectratio-distorts-non-uniform](../../../knowledge/svg-preserveaspectratio-distorts-non-uniform.md) | dantotsu: the-chart-stretched-where-no-lint-could-see-it |
| 11 | implementation | Two more layout faults found at 390 px while fixing the scope defect: the modal title ran under the Close button, and the date labels collided | commit `05d36cf` | merge into the-page-nobody-rendered-before-the-operator |
| 12 | implementation | A row whose applications all lacked a value read `no ceiling` while its chips below showed the ceiling they do have | commit `61b68f1` | no-op: fixed in the same commit, inside the pull request, with no gate to add |
| 13 | implementation | Seven indicator labels were renamed on the agent's own judgment and the operator reverted most of the rename one commit later | commits `db86e9e` then `a0838f9`, "The operator reads `5xx` directly, so the previous commit's `Failed requests` loses to it" | no-op: CLAUDE.md *Ask only for product calls* already covers it, and PR #228's lesson was that a cosmetic slip costing nobody anything is not worth a new gate |
| 14 | validation | No spec, no plan, no `/technical-validation` and no `/visual-validation` ran on a 16-file, 1,887-line change; the diff's only reader was its author | `docs/features/meta/quality-dashboard/` holds `spec/` and `plan/` from PR #263 and no `validation/`; `find … -name 'technical-validation*'` returns 0 | merge into the-page-nobody-rendered-before-the-operator, whose *Detection failure causes* records it |
| 15 | pr-description | The pull-request body reported "The type forbids rendering or browsing it, so nothing further was run", which is not what the type says | PR #281 body, *Validation · On the board itself*; the type's instructions say "Render or browse to the page only if asked, since that keeps them waiting" | merge into the-page-nobody-rendered-before-the-operator, where it is the root cause |
| 16 | post-merge | This sweep's prompt named one archive of two, and 19 entry lines of which 3 belong to PR #281; the other 16 were swept a week earlier by PR #263 | the prompt; `git log --first-parent origin/main -- docs/features/meta/quality-dashboard/kaizen.md` shows PR #263 then PR #281 | dantotsu: the-sweep-handed-a-log-it-had-already-read |
| 17 | post-merge | ADR 2026-11-05T0106, merged by PR #266 on 2026-11-05, still read `- **Status:** proposed` in the file and in `docs/adr/README.md` | `grep -l 'Status:\*\* proposed' docs/adr/*.md` | fixed: this pull request, stamped `accepted` in both places |
| 18 | post-merge | `docs/knowledge/README.md` and the svg entry still said the trap was enforced by a GritQL Biome plugin wired into `apps/pragma/biome.jsonc`, in a repository that deleted Biome | both files before this pull request; `eslint-rules/no-circle-in-non-uniform-svg.js` is where the rule lives | fixed: this pull request, both now name the ESLint rule and the new page check |
| 19 | implementation | Rendering the page locally needed `d3` as a root dev dependency, because the type supplies d3 to the published page and the repository had none | `node -e "require('d3')"` before the change; `elkjs` is the precedent, a root dev dependency used only by `scripts/architecture/` | fixed: this pull request. `d3` 7.9.0 and `playwright` from the catalog, both dev-only, both read by one gate. No ADR: it adds no architectural choice to any application, and stubbing d3 by hand is the shape [built-my-own-before-checking-the-library](../../../dantotsus/built-my-own-before-checking-the-library.md) warns about |
| 20 | post-merge | This sweep first wired the 4.2 s render into `.husky/pre-commit`, 14 times the 300 ms a pre-commit check is allowed | measured 4.2 s on 2026-11-09; [docs/standards/14-tool-runtime-budgets.md](../../../standards/14-tool-runtime-budgets.md) | no-op: the standard named the budget and the gate moved to pre-push, which gets 60 s. The standard did its job, which is the outcome [a-written-runtime-budget-nobody-enforced](../../../dantotsus/a-written-runtime-budget-nobody-enforced.md) was written for |
| 21 | post-merge | The shipping session still holds the retired board artifact `1kJhriURt4bM8bZLsoFmBe` and a duplicate `security.json` blob | `get_session` `post_turn_summary`: "Open: old artifact 1kJhriURt4bM8bZLsoFmBe and duplicate security.json blob" | no-op: deleting an artifact is the operator's call, named for them in this pull request's *Before merge* rather than acted on |
| 22 | post-merge | The pull request cost $166.34 against a $150 target, with a $22.24 cache-write ceiling against $2 | `get_session` on `session_01K69KnCk2rXC5mXMhzM8Sxn`, worker epoch 14 | fixed: this pull request adds the row to [docs/quality/feature-cost.md](../../../quality/feature-cost.md); the comparison is in the pull-request body's *Patterns* |
| 23 | implementation | A hook refused a `git push` or `git commit` piped into another command | log: `hook:no-swallowed-push` 00:07 | no-op: swept by PR #263, row 12 — the hook refused both before they ran |
| 24 | implementation | The rtk rewrite turned a plain `git` into `rtk git`, which the worktree guard refused | log: `infra-role` 00:15 | no-op: swept by PR #263, row 07 — the rtk hook was removed in #245 |
| 25 | implementation | A worktree arrived with no `node_modules` and without the ADRs the brief named | log: `infra-role` 00:15 | no-op: swept by PR #263, rows 04 and 11 |
| 26 | implementation | The rtk rewrite turned a plain `git` into `rtk git`, refused by the worktree guard | log: `pragma-kind` 00:11 | no-op: swept by PR #263, row 07 |
| 27 | implementation | `scripts/reports.sh blueprints` exited 254 with no message in a worktree without `node_modules` | log: `pragma-kind` 00:12 | no-op: swept by PR #263, row 04 — fixed there |
| 28 | implementation | pragma's `typecheck` failed in a fresh worktree until `@borso/infra` was built | log: `pragma-kind` 00:16 | no-op: swept by PR #263, row 08 — `ensure-infra-built.sh` runs on main |
| 29 | implementation | `prettier --check` flagged three files that printing through Prettier left byte-identical | log: `pragma-kind` 00:26 | no-op: swept by PR #263, row 09 — the repository formats with oxfmt |
| 30 | implementation | The spec and the task both wrote `ADD COLUMN … NOT NULL DEFAULT`, which DSQL refuses | log: `pragma-kind` 00:29 | no-op: swept by PR #263, row 10 — `check-migration-sql-dsql-compat.sh` refused it |
| 31 | implementation | Two worktree agents wrote their friction to their own worktree's `KAIZEN.md`, which `archive` never reads | log: `main` 00:30 | no-op: swept by PR #263, row 02 — `kaizen.sh` now writes to the main checkout |
| 32 | implementation | Stryker's perTest coverage reported mutants survived for code a test ran at `describe` level | log: `main` 00:31 | no-op: swept by PR #263, row 05 |
| 33 | implementation | A hook refused Prettier in a repository that formats with oxfmt | log: `hook:no-prettier` 2026-11-04 02:29 | no-op: swept by PR #263, row 09 |
| 34 | implementation | CLAUDE.md named Prettier while a hook refused it | log: `pragma-kind-2` 2026-11-04 02:29 | no-op: swept by PR #263, row 09 — CLAUDE.md now names oxlint and oxfmt only |
| 35 | implementation | A hook refused `git push` or `git commit` sent to `/dev/null` | log: `hook:no-swallowed-push` 2026-11-04 02:35 | no-op: swept by PR #263, row 12 |
| 36 | implementation | Adding a catalog dependency to one app rewrote the shared `pnpm-lock.yaml` that parallel agents also rewrite | log: `sentry-static` 2026-11-04 02:51 | no-op: swept by PR #263, row 06 — CLAUDE.md *Parallel agents* carries it |
| 37 | implementation | The same lockfile collision, from a second agent | log: `sentry-banana` 2026-11-04 02:54 | no-op: swept by PR #263, row 06 |
| 38 | implementation | `check-frontend-env-vars.sh` passed talos's `VITE_SENTRY_DSN` because pragma set it | log: `sentry-talos` 2026-11-04 02:57 | no-op: swept by PR #263, row 03 |
| 39 | post-merge | `check-dantotsu-front-matter.ts` reported `eradication-paths:` as *missing* on an entry that carried it as a multi-line YAML list, which sent this sweep looking for a field that was there | this session's friction log, 2026-11-09 22:02; `readField` returns `undefined` for an empty value and `checkRequiredFields` could not tell the two apart | fixed: this pull request, which says the field has no value on its line and that a list goes inline. 100% coverage and mutation held; the existing test already distinguished `severity: ''` from an absent `zone:` and only its expected message changed |
