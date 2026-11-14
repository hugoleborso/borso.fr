# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps the archived
copy in a new conversation after the merge, classifies each line, and designs
the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored. Before the pull request opens, run
`scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy.

Session: 9499cdc7-5d1f-5719-8d50-a7d5c2d01baf

- [2026-11-12 23:34] `explore-borsouvertures` borsouvertures VOCABULARY.md says 477 variations and 1837 lines and names site/src/lib/useSessionStart.ts, but the shipped openings.json holds 587 variations and 2313 lines and the hook lives in session-start.hook.ts
- [2026-11-12 23:34] `explore-borsouvertures` borsouvertures README speaks of a Lichess pin, but build-openings.ts fetches refs/heads/master, so a rebuild is not reproducible
- [2026-11-12 23:38] `research-datasets` Research on third-party sources needed three different fetch paths because api.github.com and github.com pages are blocked, Wikimedia answers 429 to curl but not to WebFetch, and lichess.org blog pages answer 403 to both.
- [2026-11-12 23:49] `chesscom-analysis` The chess.com/borso profile named as the player's account holds one daily game from 2010 and no rapid or blitz rating, so the opening analysis brief could not run and the username should have been checked before briefing.
- [2026-11-12 23:50] `spec-opening-trainer` The brief named docs/adr/2026-05-19T1955-pragma-shared-password-auth.md as the sign-in precedent, but that ADR is superseded by 2026-09-14T1903 (per-member credentials), so the precedent had to be re-read from the code.
- [2026-11-12 23:50] `spec-opening-trainer` apps/borsouvertures/VOCABULARY.md states 1837 lines and 477 variations while the shipped openings.json holds 2313 lines and 587 variations.
- [2026-11-12 23:50] `spec-opening-trainer` The learn-by-tree spec says Lichess study content is CC-BY-SA and plans an importer, which contradicts this session's research that studies carry no reuse licence.
- [2026-11-12 23:50] `spec-opening-trainer` The specification template gates each perspective tick on an AskUserQuestion answer, which a subagent briefed by an absent operator cannot obtain.
- [2026-11-12 23:57] `adr-opening-trainer` The session's only node is 22.23.4 while package.json engines and .nvmrc require Node 24, so a Node-24-only dependency cannot be verified on the required runtime here.
- [2026-11-13 00:21] `technical-conception-01` docs/flows.md still says a preview looks up a prod-owned DSQL cluster through SSM and needs a first prod deploy, while every full-stack cdk entry point builds the cluster stack itself since the dsql-first-deploy dantotsu.
- [2026-11-13 00:21] `technical-conception-01` The spec's operator-backlog row for the API Sentry DSN is a workflow line a session can write, because vars.SENTRY_DSN is already set in the prod environment.
- [2026-11-13 00:21] `technical-conception-01` The spec and ADR-2026-11-13T0004 keep deck names in the i18n catalogues while promising that a deck is one folder, so adding a deck touches en.json and fr.json too.
- [2026-11-13 00:37] `implementation-01` The plan starts the vendored Stockfish with node <file> from site/public, but the app package.json is type module so Node loads the CommonJS engine file as ESM and it throws require is not defined.
- [2026-11-13 00:42] `slice-2b` The default line minimum of 12 plies excludes the 11-ply Nd6 smothered mate, so the deck had to override pliesPerLine to keep a real mating card.
- [2026-11-13 00:50] `slice-2d` The deck format does not say whether a SAN move with a needless disambiguation (Nge7 where chess.js prints Ne7 because the other knight is pinned) passes build-decks, so a content agent cannot tell if its line is valid before the build exists.
- [2026-11-13 00:51] `slice-2a` The content brief has no way to run build:decks or check:decks on a deck outside the repository, so a content agent rewrites both gates as scratch scripts.
- [2026-11-13 00:52] `slice-2c` A content agent told to stay out of the repository cannot run the plan's build:decks and check:decks gates, so it has to rewrite the legality, ideas and Stockfish checks as scratch scripts.
- [2026-11-13 01:17] `implementation-01` Stryker's shared disableTypeChecks glob prepends a ts-nocheck line to every .js under site/, so the vendored Stockfish worker differs in the sandbox and its digest test fails the dry run.
- [2026-11-13 01:18] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 02:28] `implementation-02` convention-drift and check-pure-modules-have-callers read the git index, so an agent told not to stage cannot prove a rename against them without a scratch copy of the index.
- [2026-11-13 02:28] `implementation-02` The suffixes .setup.ts, .store.ts and .adapter.ts count as layer markers in blueprint-utils but the suffix table in docs/standards/01-naming.md does not list or define them.
- [2026-11-13 09:00] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 09:01] `mutation-fix-01` The mutation brief read the 4 in the timeout column of the Stryker table as survivors, which pointed the fix at review-event-store.adapter.ts instead of the real survivor in deck-folders.adapter.ts
- [2026-11-13 09:01] `mutation-fix-01` The full borsouvertures coverage run fails on 30 s route-test timeouts at load average 15+ on 4 cores while parallel agents run, and passes file by file
- [2026-11-13 09:02] `implementation-05b` Playing a deck line to its end in agent-browser needed a hand-written chess.js helper, because the page exposes only the last opponent move and no move list.
- [2026-11-13 09:08] `implementation-03b` pnpm --filter <app> dev -- --port N is ignored because the dev script chains tsx and vite, so the server silently takes 5173 and can collide with a parallel agent.
- [2026-11-13 09:08] `implementation-03b` A test fixture computed in a describe body runs before Stryker activates a mutant, so a mutant only that fixture covers survives although the assertions would kill it.
- [2026-11-13 09:14] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 09:18] `implementation-06b` The Modal atom closes itself on mount under React StrictMode in dev, because the ref cleanup calls dialog.close() and the close event fires onClose, so a Modal opened from a click never shows in pnpm dev.
- [2026-11-13 09:19] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 09:28] `implementation-04b` The plan said zlib.createZstdDecompress streams the Lichess puzzle dump, but Node 22 rejects its pzstd skippable frames (ZSTD_error_prefix_unknown), so each frame has to be cut out and decompressed by hand.
- [2026-11-13 09:28] `implementation-04b` A previous agent stopped mid-slice left no record of which gates had run, so the resumed slice had to rerun build:traps and every test to know what held.
- [2026-11-13 09:28] `implementation-04b` My agent-browser session came back on about:blank with a fresh profile mid-check, most likely because a parallel agent ran close --all.
- [2026-11-13 09:37] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
- [2026-11-13 09:52] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-11-13 09:52] `implementation-07` blueprint-indexing.ts --accept rewrites about 1,400 unrelated lines of docs/standards/blueprint-subjects.json, so renaming one follower file means hand-editing the baseline key instead
- [2026-11-13 10:12] `technical-validation-01` An uncommitted edit to infra/cdk/src/internal/cf-host-routing-function.code.js appeared in the shared working tree mid-review, so the mutation and test runs read a tree that was not the reviewed SHA.
- [2026-11-13 10:12] `technical-validation-01` The spec routes every numbered step, edge case and error case to /visual-validation as one row each, which leaves category D of the technical validator with no row by the letter of the procedure, so the deterministic sub-claims had to be split out by judgement.
- [2026-11-13 10:45] `fix-round-01` A test file that calls vi.resetModules and re-imports a gated module makes Stryker report that module's static mutants as survived, though the sibling tests kill them.
- [2026-11-13 10:59] `redesign-01` The worktree isolation guard refuses agent-browser eval calls whose JavaScript contains a CSS attribute selector, so page checks need get html or a selector click instead.
- [2026-11-13 10:59] `redesign-01` Modal closed itself in dev because StrictMode re-runs its ref callback and the queued close event from the first detach reached onClose after the dialog had reopened.
- [2026-11-13 10:59] `redesign-01` scripts/phone.sh only taps, and the board takes moves by drag, so a touch board move cannot be proved with the repo's tooling.
- [2026-11-13 11:19] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 11:22] `redesign-02` The ActionBar spacer reserved the full bar height on top of the shell's 1.5rem bottom slack, so every action-bar screen wasted 24 px and no gate measured fit at 375 x 812.
- [2026-11-13 11:22] `redesign-02` The brief called the Play tab overflow a short scroll, but it measured 149 px, so the fix needed a layout move rather than a nudge.
- [2026-11-13 11:29] `technical-validation-02` pnpm --filter @borso/shared matches no workspace (the package is @borso/shared-infra) and exits 0 with no test run, so a wrong filter name reads as a green run.
- [2026-11-13 11:29] `technical-validation-02` CI's mutation job was still running at review time, so the brief's 'cite CI' for mutation could not be honoured and the row stays UNVERIFIABLE.
- [2026-11-13 11:32] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
- [2026-11-13 11:39] `hook:no-test-double-dash` passed -- to a pnpm test script, which makes Vitest run every file
- [2026-11-13 11:40] `visual-validation-01` agent-browser set offline and network route --abort do not reach requests a service worker makes, so an 'offline and not cached' row needs the service worker registration blocked by an init script to be reproduced
- [2026-11-13 11:40] `visual-validation-01` scripts/phone.sh covers taps only, so moving a piece on the borsouvertures board by touch needed a hand-written CDP touch-drag script
- [2026-11-13 11:40] `visual-validation-01` agent-browser click on a react-chessboard square does nothing and only drag moves a piece, which is not written in any knowledge entry
- [2026-11-13 11:55] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 11:59] `fix-round-02` Standard 08 asks cva for more than two variants while the atom-lookup-variants blueprint sanctions a hand-built table, so the two canonical sources disagree.
- [2026-11-13 11:59] `fix-round-02` convention-drift reads the git index, so a subagent that may not stage cannot run it after deleting a file without a private GIT_INDEX_FILE.
- [2026-11-13 11:59] `fix-round-02` git rm stages the deletion, which a subagent forbidden to stage must undo with git reset.
- [2026-11-13 12:18] `visual-validation-02` scripts/phone.sh touch takes only a CSS selector, and the borsouvertures action buttons carry no id, test id or aria-label distinct from their text, so a tap on Start or Next needed a data attribute injected by eval first
- [2026-11-13 12:18] `visual-validation-02` Neither the visual-validator brief nor the CLI help says that 'agent-browser set offline' does not stop service-worker fetches, so an offline-worker row needs an init script that blocks navigator.serviceWorker.register, rediscovered each run
- [2026-11-13 12:18] `visual-validation-02` The preview bundle carries no Sentry DSN, so the spec's 'Sentry receives it' clause can never be observed from a preview and goes UNVERIFIABLE every run
