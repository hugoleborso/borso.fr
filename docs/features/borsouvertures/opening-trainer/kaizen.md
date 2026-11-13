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
