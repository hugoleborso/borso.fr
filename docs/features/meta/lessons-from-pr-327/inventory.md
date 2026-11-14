# Friction inventory of PR #327

PR #327 added compositions, sketches and inspirations to pragma and was
squash-merged as `c4ec9b94e`. The sources were:

- `scripts/kaizen.sh sweep-input c4ec9b94e`, which listed 10 lines in one
  archive, `docs/features/pragma/composition-inspirations/kaizen.md`;
- the 8 lines logged after the archive, pasted in the sweep's prompt;
- the PR's 18 commits;
- its 2 bot comments (it had no review thread);
- its 5 validation reports;
- the session facts the prompt gave.

No `kaizen` pull request was open (`list_pull_requests`, state open, read
2026-11-14). The merge added no ADR.

The archive names its writers. There were nine labels: `main`, `plan`,
`implementation`, `technical-validator`, `fix-round-1`, `visual-validator`,
`compositions`, `revision-fixes` and `visual-fixes`, plus two hook
refusals. So the subagents were told their label. Two writers logged the
phone width after a tap. Three entries, from two writers, are about stopping
a dev server.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | The operator changed two product decisions on the preview. A composition became its own record, and an inspiration can now be created from a lane | commit:`abee2077e`, spec rows dated "operator, on the preview" | dantotsu: the-operator-redrew-the-feature-on-the-preview. The operator picked option A on 2026-11-14, so a spec now needs a dated Records row for each table it creates |
| 02 | validation | The spec revision routed only steps 1 to 7 to visual validation, so the catalogue step and its edge cases had no test (D03, D08) | report:`technical-validation-2026-11-14-0015.md` D03, D08 | merge into the-operator-redrew-the-feature-on-the-preview. Routing was fixed in `e3a6b512a` |
| 03 | spec | The spec named per-song `sketch:<songId>` scopes and the API's `stale-scope.core.ts`, while written roots are per API root | kaizen:`plan` 21:22 | no-op. The *Written root* entry of `apps/pragma/VOCABULARY.md` says it in one line, and the plan caught it before any code |
| 04 | spec | Nothing told the spec author that a new `/api` root needs an MCP tool or a `TOOL_EXCLUSIONS` reason | kaizen:`plan` 21:22 | no-op. The *Tool* entry of `VOCABULARY.md` says it, `tool-coverage.test.ts` fails on such a route, and the plan caught it before any code |
| 05 | implementation | The SessionStart hook installed agent-browser and could not find it, so no browser was available | kaizen:`main` 21:16, commit:`e2bc65a88` | fixed: `e2bc65a88` in PR #327. This sweep's SessionStart installed and found it (measured) |
| 06 | implementation | `require('playwright')` from an app resolves Playwright 1.65, whose Chromium build is not in `/opt/pw-browsers` | kaizen:`implementation` 22:06 | dantotsu: the-workspace-playwright-asked-for-a-chromium-the-image-never-had |
| 07 | implementation | The no-broad-kill hook refused `pkill` or `killall` twice | kaizen:`hook:no-broad-kill` 22:04, 23:19 | dantotsu: the-kill-recipe-that-left-the-server-listening |
| 08 | validation | Under `setsid`, `$!` is the wrapper's PID, so killing it left the dev server running | kaizen:`visual-fixes` 00:58 | merge into the-kill-recipe-that-left-the-server-listening |
| 09 | validation | `check-vocabulary-paths.sh` run from `apps/pragma` passed on an empty set. Four more checks did the same | kaizen:`technical-validator` 22:24 | dantotsu: the-check-that-passed-on-an-empty-directory |
| 10 | validation | Round 1 found that a refused lane delete still deleted another song's clips (A15) | report:`technical-validation-2026-11-13-2219.md` A15 | no-op. The validator caught it before the merge, and `d98b2315e` fixed it with a test |
| 11 | validation | Round 1 found 14 surviving mutants (C03) | report:`technical-validation-2026-11-13-2219.md` C03 | no-op. The mutation gate did its job, and `d98b2315e` brought the score to 100 |
| 12 | validation | A fix brief proposed `listInspirationsNewestFirst`, which the repository already exported | kaizen:`fix-round-1` 22:45 | no-op. The type checker refused the duplicate at once, and it cost one rename |
| 13 | validation | The report cited `InspirationCard.tsx:235` for a literal on line 31 of a 52-line file | kaizen:`fix-round-1` 22:45. `git show 946bb2729:…InspirationCard.tsx` has 52 lines, literal at :31 (measured) | no-op. It was one wrong line out of the report's citations, and the quote in the same cell located it |
| 14 | validation | After `phone.sh touch`, the page read 1280 px wide while screenshots stayed at 375 | kaizen:`visual-validator` 23:13, `visual-validator-revision` 00:39 | dantotsu: the-tap-that-left-the-phone-at-desktop-width |
| 15 | validation | YouTube playback rows 09, 20, 26, 28 and 34 were UNVERIFIABLE because the player showed "Video unavailable" | report:`visual-validation-2026-11-13-2330.md`, `…-2026-11-14-0026.md` | knowledge: youtube-refuses-playback-to-the-session-egress |
| 16 | validation | Row 41's UI races could not be produced, because live invalidation removed the stale item first | report:`visual-validation-2026-11-13-2330.md` row 41 | no-op. API probes proved both refusals. The UI race is unreachable by design |
| 17 | validation | The validator could not sign in as Léa, because the `dev:db` banner listed first names | commit:`5e3a525c8` | fixed: `5e3a525c8` in PR #327 |
| 18 | validation | Rows 12 and 48 failed. `setQueryData` cleared another member's invalidation, and a member delete never refreshed reads derived from members in the writer's tab | report:`visual-validation-2026-11-14-0026.md`, commit:`5cec41564` | no-op. PR #329 eradicated it at level 2 with `writeKeepingStaleness` and the `no-direct-query-cache-write` rule, and its own sweep owns the entry |
| 19 | implementation | Migration 0027 recreated `sketch_lane`, because 0026 had run on the preview and DSQL cannot drop a NOT NULL column | commit:`4d8eb548b` | no-op. Section 10 of `docs/knowledge/dsql-postgres-compat-gaps.md` covers it, and the migration took the right path |
| 20 | pr-description | The merge of `main` conflicted on `cache-write.queries.ts`, because PR #329 fixed the same bug in parallel | commit:`3c55788cd` | no-op. Two sessions fixed one bug, the later one generalised it, and the conflict was resolved once |
| 21 | pr-description | The screenshots dispatch from `/open-pr` step 5b cancelled the pull request's gallery check | post-archive `main` 23:26, ci:run 43526307152 attempt 1 cancelled | dantotsu: the-gallery-request-that-cancelled-the-gallery-check |
| 22 | post-merge | `scripts/db-read.sh` failed on `ILIKE '%x%'`. The reader cut any trailing string literal, so `%` was not the cause | post-archive `main` 23:37 | dantotsu: the-percent-sign-that-was-blamed-for-a-missing-string |
| 23 | implementation | `convention-drift.ts`, and `hotspots.ts` too, crashed on a file deleted but not yet staged | post-archive `compositions` 23:59 | dantotsu: the-index-listed-a-file-the-disk-no-longer-had |
| 24 | implementation | `git mv` staged a rename for a subagent told not to stage | post-archive `compositions` 23:59 | dantotsu: a-rename-that-staged-itself |
| 25 | validation | A spec revision after a passed round 2 had no defined round | post-archive `technical-validator-revision` 00:13 | dantotsu: a-revision-after-a-passed-review-had-no-round |
| 26 | validation | `mutate-changed.sh` reused a stale Stryker incremental file. `full-suite.yml` had the same gap on `main` | post-archive `revision-fixes` 00:24 | dantotsu: a-fixture-changed-and-stryker-kept-the-verdict |
| 27 | post-merge | Three review rounds and $95.36 for the feature | `get_session`, `docs/quality/feature-cost.md` | no-op. The third round came from row 01 |

## Lines this sweep logged

These lines went into this sweep's own `KAIZEN.md` and were handled here.

| # | Friction | Decision |
| --- | --- | --- |
| S1 | `check-dantotsu-front-matter` refuses an eradication path not yet tracked, so a subagent that may not stage cannot turn its entry green | no-op. The main session commits by paths, and its commit ran the check green. The refusal is correct for a commit |
| S2 | A process-group kill guarded with `$$` killed its own pipeline | merge into the-kill-recipe-that-left-the-server-listening, whose recipe guards with `$BASHPID` |
| S3 | The container has no man pages | no-op. Each quote was fetched once from man7.org or git-scm.com |
| S4 | Stryker fails in a scratch worktree whose `node_modules` is a symlink | no-op. A probe can run in the shared tree on a gitignored path |
| S5 | The friction line blamed `%` while the reader cut trailing literals | merge into the-percent-sign-that-was-blamed-for-a-missing-string |
| S6 | `hook:subagent-no-staging`, `hook:no-prettier`, `hook:no-discarding-reset` refused an agent once each | no-op. Each hook did its job once, and each agent retried without the command |
