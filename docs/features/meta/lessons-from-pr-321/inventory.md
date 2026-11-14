# Friction inventory of PR #321

PR #321 turned borsouvertures into a daily opening trainer: decks, an
explorer, a line stepper, Stockfish, and progress synced across devices. It
was squash-merged as `8b2c78a38`. The sources were:

- `scripts/kaizen.sh sweep-input 8b2c78a`, which listed 82 lines in one
  archive, `docs/features/borsouvertures/opening-trainer/kaizen.md`, and no
  line logged after it;
- the 44 commits of `claude/tender-pasteur-svwn2z`, three of them merges of
  `main`;
- the pull request's 6 comments, all from the bot, and its review threads,
  of which there were none;
- its 4 validation reports;
- the open kaizen pull request #334 (lessons from PR #327), read for overlap;
- `get_session` on `session_01K69KnFCVP2PxWDkNkQZcSH`, the one session in the
  commits' trailers.

The archive names 39 writers. The subagents were told their label. The walls
several writers hit are the ones that matter: convention-drift reading the
index (five writers), the phone tooling having no drag (three writers, four
lines), offline emulation missing the service worker (two), the Modal closing
itself (two), and the broad-kill hook (thirteen refusals).

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | spec | `VOCABULARY.md` gave 477 variations and 1837 lines and named a hook file that had moved | kaizen:`explore-borsouvertures` 23:34, `spec-opening-trainer` 23:50 | no-op. Fixed in PR #321: the file now says 2313 lines and 587 variations (`VOCABULARY.md:367`, `:622`, measured) |
| 02 | spec | The README spoke of a Lichess pin while the build fetched `refs/heads/master` | kaizen:`explore-borsouvertures` 23:34 | no-op. Fixed in PR #321: `build-openings.ts:36` pins `LICHESS_COMMIT` (measured) |
| 03 | spec | Research needed three fetch paths, because GitHub pages, Wikimedia and lichess.org each refused a different client | kaizen:`research-datasets` 23:38 | no-op. `wikimedia-rate-limits-the-session-egress.md`, from the sweep of PR #324, covers the Wikimedia half, and the other two refusals cost one retry each |
| 04 | spec | The Chess.com profile named in the brief held one game from 2010 | kaizen:`chesscom-analysis` 23:49 | no-op. The account name is a fact only the operator holds. The analysis then ran on 1,127 of his games (PR body) |
| 05 | spec | The brief named a superseded ADR as the sign-in precedent | kaizen:`spec-opening-trainer` 23:50 | no-op. `docs/adr/README.md` marks it superseded, and the agent read the code instead. One line, one writer |
| 06 | spec | The learn-by-tree spec says Lichess studies are CC-BY-SA, which this task's research contradicted | kaizen:`spec-opening-trainer` 23:50, `docs/features/borsouvertures/learn-by-tree/spec/spec.md:117` | no-op. That spec is the record of a shipped feature, and ADR-2026-11-13T0004 now holds the licence finding |
| 07 | spec | The spec template lets a perspective be ticked only after an `AskUserQuestion` answer, which a subagent cannot get | kaizen:`spec-opening-trainer` 23:50 | fixed: this PR. `.claude/skills/specification/template.md` now accepts an answer relayed by the caller, as SKILL.md's *A piloted subagent cannot ask* already said |
| 08 | conception | The session ran Node 22 while the repository requires Node 24 | kaizen:`adr-opening-trainer` 23:57 | no-op. This sweep's container runs v24.22.3 (measured) |
| 09 | conception | `docs/flows.md` still described a preview reading a prod-owned cluster through SSM | kaizen:`technical-conception-01` 00:21 | no-op. `grep -n -i ssm docs/flows.md` finds nothing now (measured) |
| 10 | conception | The spec's operator-backlog row for the API Sentry DSN was work a session could do | kaizen:`technical-conception-01` 00:21 | no-op. The PR's four backlog rows no longer include it (PR body, *Notable*) |
| 11 | conception | The spec kept deck text in the i18n catalogues while promising a deck is one folder | kaizen:`technical-conception-01` 00:21 | no-op. ADR-2026-11-13T0004's final text puts ideas outside the catalogues (`docs/adr/README.md:143`), and each deck folder holds `ideas.en.md` and `ideas.fr.md` (measured) |
| 12 | implementation | The plan started the vendored Stockfish with `node`, and the module package loaded it as ESM | kaizen:`implementation-01` 00:37 | no-op. Caught on the first run. Stockfish runs as a Web Worker (ADR-2026-11-13T0003) |
| 13 | implementation | The 12-ply line minimum excluded an 11-ply mating line | kaizen:`slice-2b` 00:42 | no-op. A content choice, and the deck's override keeps the card |
| 14 | implementation | The deck format did not say whether a needlessly disambiguated SAN move passes | kaizen:`slice-2d` 00:50 | no-op. `build:decks` exists now and answers by running it |
| 15 | implementation | Two content agents told to stay out of the repository rewrote the deck gates as scratch scripts | kaizen:`slice-2a` 00:51, `slice-2c` 00:52 | no-op. One brief caused both. The gates now live in the app as `build:decks` and `check:decks` |
| 16 | implementation | Stryker's shared `disableTypeChecks` glob prepended `// @ts-nocheck` to the vendored Stockfish worker, which broke its digest test | kaizen:`implementation-01` 01:17 | fixed: this PR. PR #321 narrowed the glob for borsouvertures only. The shared glob now reads `site/src`, which also keeps it off pragma's and talos's `site/public/sw.js`, and the local override is gone. A borsouvertures dry run passed 1,250 tests (measured) |
| 17 | implementation | The no-broad-kill hook refused `pkill` or `killall` thirteen times, and a subagent had to walk a four-level `pnpm dev` tree to stop it | kaizen:`hook:no-broad-kill` ×13, `tab-icons-01` 19:35 | merge into PR #334, whose `the-kill-recipe-that-left-the-server-listening` puts a working process-group stop in the refusal |
| 18 | implementation | `convention-drift` read the index, so a deleted but unstaged file crashed it with ENOENT, and an agent that may not stage needed a private index | kaizen:`implementation-02` 02:28, `fix-round-02` 11:59, `operator-feedback-01` 15:34, `open-explorer-01` 16:25, `board-mark-01` 18:21 | no-op. Five writers. Fixed in PR #321 by `0d1275cb5`, and PR #334's `the-index-listed-a-file-the-disk-no-longer-had` owns the entry. New untracked files stay unchecked on purpose, so pre-commit judges what the commit holds (`check-pure-modules-have-callers.sh`, comment above `list_working_tree_files`) |
| 19 | implementation | `git rm` stages a deletion, which a subagent forbidden to stage had to undo | kaizen:`fix-round-02` 11:59 | merge into PR #334, whose `pretool-subagent-no-staging.sh` refuses `git rm` from a subagent |
| 20 | implementation | `.setup.ts`, `.store.ts` and `.adapter.ts` are layers in the blueprint tooling, and the naming standard does not define them | kaizen:`implementation-02` 02:28 | dantotsu: the-lists-that-named-the-apps-by-hand. `docs/standards/01-naming.md` defines all 18 suffixes of `LAYER_BY_FILE_SUFFIX`, and section 6 of `check-coupled-lists.sh` refuses a suffix the table lacks |
| 21 | implementation | A brief read the `# timeout` column of the Stryker table as survivors and sent the fix to the wrong file | kaizen:`mutation-fix-01` 09:01 | knowledge: extends `how-a-mutation-survivor-hides.md` |
| 22 | implementation | The full coverage run hit 30 s route-test timeouts at load 15 and passed file by file | kaizen:`mutation-fix-01` 09:01 | no-op. `a-timeout-under-parallel-gates-is-not-a-regression.md` says to re-run alone, which the agent did |
| 23 | implementation | Playing a deck line in a browser needed a hand-written chess.js helper, because the page showed only the last move | kaizen:`implementation-05b` 09:02 | no-op. One writer, and the line stepper shipped later in the same PR (`d8350cd11`) |
| 24 | implementation | `pnpm --filter <app> dev -- --port N` was ignored | kaizen:`implementation-03b` 09:08 | no-op. The dev script is `concurrently` now, and Vite moves to the next free port by itself. Two full dev servers of one app would still share the API port and the seeded Postgres, which no port flag fixes. One writer |
| 25 | implementation | A fixture computed in a `describe` body left a mutant alive | kaizen:`implementation-03b` 09:08 | no-op. `how-a-mutation-survivor-hides.md` already has *A call made at `describe` level is covered by no test* |
| 26 | implementation | The Modal atom closed itself on mount under StrictMode | kaizen:`implementation-06b` 09:18, `redesign-01` 10:59 | no-op. Two writers, fixed in PR #321: `onClose` now checks `event.currentTarget.open` (`Modal.tsx:36`). No other app has a Modal atom (measured) |
| 27 | implementation | Node 22's zstd stream rejected the Lichess puzzle dump's skippable frames | kaizen:`implementation-04b` 09:28 | no-op. `scripts/traps/puzzle-dump.adapter.ts` cuts the frames and is tested, so a rebuild goes through it |
| 28 | implementation | A slice resumed after a stopped agent had no record of which gates had run | kaizen:`implementation-04b` 09:28 | no-op. One resume. Re-running was the right check, because a stopped agent's results would be stale anyway |
| 29 | implementation | An agent-browser session came back blank, most likely because a parallel agent ran `close --all` | kaizen:`implementation-04b` 09:28 | fixed: this PR. `pretool-no-broad-kill.sh` refuses `agent-browser close --all` |
| 30 | implementation | `blueprint-indexing.ts --accept` rewrote about 1,400 unrelated lines, so a rename meant hand-editing the baseline | kaizen:`implementation-07` 09:52 | fixed: this PR. A bare `--accept` rewrote 1,958 lines on a clean `main` and now rewrites 35, the files it already records (measured) |
| 31 | implementation | Merging `main` brought back 68 borsouvertures entries and one pragma entry in `blueprint-subjects.json` for files that no longer existed | commit:`8a250d75c` | no-op. The refusal of vanished files (PR #325) landed while #321 was open. Pre-commit now refuses such an entry at the commit that deletes the file |
| 32 | implementation | `check-pure-modules-have-callers` caught the old board's drop helper at commit time | commit:`ae54bef71` | no-op. The gate did its job at the first commit, which removed the helper |
| 33 | validation | An uncommitted edit by another session appeared in the shared tree in the middle of a review | kaizen:`technical-validation-01` 10:12 | no-op. `two-agents-in-one-working-tree.md` covers it, and the report records the reviewed SHA |
| 34 | validation | The spec routed every step to visual validation, which left category D with no row | kaizen:`technical-validation-01` 10:12 | no-op. The validator split the deterministic claims by judgement and still found D28 and D05 |
| 35 | validation | A `vi.resetModules` re-import made static mutants survive | kaizen:`fix-round-01` 10:45 | no-op. `how-a-mutation-survivor-hides.md` already has *A test that re-imports a module turns its constants into live mutants* |
| 36 | validation | A guard refused `agent-browser eval` with a CSS attribute selector | kaizen:`redesign-01` 10:59 | no-op. No hook under `.claude/hooks` reads `agent-browser` commands (grep, measured), so the refusal came from the harness, and `get html` worked |
| 37 | validation | `phone.sh` only taps. A board takes moves by drag, a click on a square does nothing, and a square cancels the click after a touch | kaizen:`redesign-01` 10:59, `visual-validation-01` 11:40 ×2, `board-feel-01` 09:58 | fixed: this PR. `scripts/phone.sh drag '<from>' '<to>'` sends a real CDP touch drag. Three writers each wrote their own driver before |
| 38 | validation | The ActionBar spacer wasted 24 px, and the Play tab overflowed by 149 px, not the short scroll the brief said | kaizen:`redesign-02` 11:22 ×2 | no-op. The visual validator's row 38 caught the fold, and `docs/standards/05` now asks for tabs past the fold (`f628f8448`) |
| 39 | validation | `pnpm --filter @borso/shared` matched no package and exited 0 with no test run | kaizen:`technical-validation-02` 11:29 | dantotsu: a-filter-that-named-no-package-ran-no-test-and-passed. `.npmrc` sets `fail-if-no-match=true`, so the same call exits 1 (measured before 0, after 1) |
| 40 | validation | CI's mutation job was still running at review time | kaizen:`technical-validation-02` 11:29 | no-op. The row stayed UNVERIFIABLE, which is the honest verdict |
| 41 | validation | `agent-browser set offline` and route aborts do not reach service-worker requests | kaizen:`visual-validation-01` 11:40, `visual-validation-02` 12:18 | knowledge: extends `agent-browser-cli-quirks.md`, which its `\bagent-browser\b` trigger prints at every call |
| 42 | validation | `phone.sh touch` takes only a CSS selector, and the action buttons carry no attribute but their text | kaizen:`visual-validation-02` 12:18 | no-op. One writer, and one injected data attribute was enough. A selector by text would be a second query language in the tool |
| 43 | validation | Standard 08 asks for `cva` while the `atom-lookup-variants` blueprint sanctions a hand-built table | kaizen:`fix-round-02` 11:59 | fixed: this PR. Standard 08 names both forms. An app without `class-variance-authority` uses the record, because the dependency is an ADR decision |
| 44 | validation | The preview bundle has no Sentry DSN, so a "Sentry receives it" row is UNVERIFIABLE every run | kaizen:`visual-validation-02` 12:18 | no-op. The operator-backlog row from PR #298 already asks for `SENTRY_DSN` to reach previews |
| 45 | validation | The hooks refused swallowed push errors (2), a discarding reset (1), `--` to a test script (3), a conflicting push (1) and a merge beside untested base commits (1) | kaizen:`hook:*` | no-op. Each guard refused, and the agent retried without the command |
| 46 | implementation | The deck game never said the reader had left the deck | kaizen:`operator-feedback-01` 15:34 | no-op. Fixed in PR #321 (`d8350cd11`): the status band says he left the deck and names its move |
| 47 | implementation | New cards came in deck order, so a deck appended after 520 file cards would never be introduced | kaizen:`open-explorer-01` 16:25 | no-op. The browser proof caught it before merge. A My lines card now carries a scheduled day, so it is due rather than queued (`daily-plan.core.ts:81`, inferred from the code) |
| 48 | implementation | A click that suspends on `use()` ran in a synchronous `act`, which dropped the Suspense retry under load. A raised `findBy` timeout had hidden it, and `--cpu-prof` wrote no profile | kaizen:`explorer-speed-01` 17:35 ×3 | knowledge: extends `a-timeout-under-parallel-gates-is-not-a-regression.md` with the exception. The test fix is `351ef1eca` |
| 49 | implementation | A body `font-feature-settings` rule overrode every `tabular-nums` class, and no gate saw it | kaizen:`polish-01` 19:15 | fixed: this PR. `check-stylesheet-contents.sh` refuses `font-feature-settings` in an app stylesheet |
| 50 | implementation | CDP `Network.setBlockedURLs` does not block a dedicated worker's script | kaizen:`board-feel-01` 09:58 | knowledge: extends `agent-browser-cli-quirks.md` |
| 51 | validation | Round 1 found 5 blocking findings (A33, A35, D28, E02, E04), round 2 found 3 (A05, A06, D05), and the first visual run failed rows 03, 38 and 40 | report:`technical-validation-2026-11-13-1004.md`, `-1115.md`, `visual-validation-2026-11-13-1127.md` | no-op. The validators caught each one before merge, and `f30dc9d6e` and `ff24c69e8` fixed them. Two rounds is the target |
| 52 | pr-description | The PR body says CLAUDE.md still calls borsouvertures site-only and leaves it out of `db-read.sh` | PR body, *Notable* | dantotsu: the-lists-that-named-the-apps-by-hand. CLAUDE.md no longer lists apps by hand. It says what a static and a full-stack app hold, and points at `db-read.sh`'s header for the readable apps |
| 53 | post-merge | The feature cost $389.38, against a $150 target | `get_session`, `docs/quality/feature-cost.md` | no-op. Recorded in the cost table. See *Patterns* in the pull request |
| 54 | post-merge | The pull request had no review thread, and its six comments came from the bot | `pull_request_read` | no-op. The operator steered in the session. His one product correction is row 46 |

## Lines this sweep logged

| # | Friction | Decision |
| --- | --- | --- |
| S1 | The knowledge hook printed the Dashboard artifact entry after `kaizen.sh sweep-input`, because that entry's output trigger `is not defined` matched the friction line "require is not defined" | fixed: this PR. The trigger is now `the page threw: .* is not defined`, the text `check-dashboard-page.ts` prints, plus that command. The old output no longer prints it, and the dashboard error still does (measured) |
| S2 | `phone.sh touch` run twice on one page reported every event twice, because each run left its listeners on the page | fixed: this PR. Each tap aborts the previous probe's listeners (measured 4, 8, 12 events, now 4, 4, 4) |
| S3 | A touch drag on react-chessboard sends touchend to the piece node React removed on drop, so a document listener never hears it | fixed: this PR. `touch-drag.ts` also listens on the dragged element and reports each event once |
| S4 | `setsid` run in the background forks, so `$!` is not the server's process group | merge into PR #334, whose recipe finds the group from the listening port, not from `$!` |
