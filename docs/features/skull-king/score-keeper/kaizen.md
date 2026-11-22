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

Session: ad865e12-19a9-534e-8381-937289236af4

- [2026-11-22 18:00] `main` Mockups again carried too much text in the UI; the operator had to say 'less text, you always have this problem'.
- [2026-11-22 18:11] `main` Copying banana-rush as the scaffold for a new full-stack app is a manual tar, rename and strip; no script or blueprint creates a new app.
- [2026-11-22 18:14] `main` I offered a reduced 'one phone, no sync' option although banana-rush already holds the sync pattern; the operator called it lazy.
- [2026-11-22 18:15] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-22 18:17] `api-agent` The skull-king scaffold landed without a pnpm-lock.yaml importer entry, so every agent's gates fail until someone runs a non-frozen install.
- [2026-11-22 18:18] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-22 18:33] `site-agent` A PostToolUse formatter rewrote a just-written file, so a later exact-string replace on the pre-format text silently did nothing until typecheck caught it.
- [2026-11-22 18:33] `site-agent` The site was written against an /api/accounts contract the spec does not spell out (body and response shapes of /me/games, registration), so the shapes had to be read off the API agent's half-built schema files.
- [2026-11-22 18:33] `site-agent` The skull-king scaffold copied banana-rush files with their @Blueprint declarations, which the blueprint index then refused as duplicates.
- [2026-11-22 18:38] `main` I wrote the spec without /specification and without reading the whole rulebook; the operator had to ask, and the ghost, Harry and Tigress rules surfaced only then.
- [2026-11-22 18:44] `api-agent` The shared domain types changed mid-task (rascalBet) before the message announcing them arrived, so the back end failed to typecheck with no requirement to explain why.
- [2026-11-22 18:49] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-22 18:51] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
- [2026-11-22 18:53] `vocab-agent` The skull-king glossary pointed eleven terms at one combined 'Round and entry' invariants section, which check-vocabulary-paths only catches at pre-commit, after the docs were written.
- [2026-11-22 19:20] `technical-validator` A probe test's console.log output in the skull-king back-e2e project shows only with --reporter=verbose, so the first probe run printed nothing and had to be repeated.
- [2026-11-22 19:34] `hook:no-test-double-dash` passed -- to a pnpm test script, which makes Vitest run every file
- [2026-11-22 19:46] `fix-round-1` A PreToolUse hook that refuses a chained Bash command also drops the file edit chained before it, and the refusal reads like a test-runner hint, so an edit can silently never happen.
- [2026-11-22 19:46] `fix-round-1` Every back-e2e request prints a wide-event JSON line to stdout, so a race test's failure is buried under hundreds of log lines unless the run is grepped.
- [2026-11-22 19:57] `fix-round-1` Stryker's incremental file kept a Survived verdict for a mutant whose line was unchanged though the code around it changed, so a killed mutant kept failing the gate until its test file moved.
- [2026-11-22 20:14] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-22 20:25] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-22 20:25] `visual-validator` agent-browser has no WebAuthn virtual-authenticator command, so checking a passkey flow needed a hand-written CDP script held open in the background
- [2026-11-22 20:25] `visual-validator` agent-browser eval shares one global scope across calls, so a second top-level const in a loop failed with 'Identifier already declared' and silently skipped bid taps
- [2026-11-22 20:27] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
- [2026-11-22 20:40] `fix-visual` agent-browser has no command for a WebAuthn virtual authenticator, so checking a signed-in screen needs a hand-written playwright-core script that holds a CDP session on the agent-browser page while agent-browser drives it
- [2026-11-22 20:40] `fix-visual` the visual report found six spec breaks that no test held (a missed toggle kept as local draft, digits in join codes, chips under 44 px), because no gate measures tap target size or reads the spec's data shape against the alphabet
- [2026-11-22 20:52] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-22 20:54] `visual-validator` agent-browser has no locale setting and --args --lang=fr-FR leaves navigator.language at en-US, so checking French copy needed a hand-written init script.
- [2026-11-22 20:54] `visual-validator` Passkey screens need a CDP virtual authenticator held open by a background node process, and no repo script provides one for agent-browser sessions.
- [2026-11-22 20:54] `visual-validator` The service worker is disabled under the dev server, so checking it needed a scratch vite build and vite preview on another port.
- [2026-11-22 21:07] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-22 21:13] `visual-validator` agent-browser has no locale option, and starting a session with AGENT_BROWSER_ARGS=--lang=fr-FR left navigator.language en-US and sent localhost through the agent proxy, so the page stayed about:blank.
- [2026-11-22 21:13] `visual-validator` scripts/phone.sh swipe on a horizontally scrolling grid cannot be read back, because its 1280 px relayout clamps scrollLeft to 0 before the 375 px viewport returns.
- [2026-11-22 21:13] `visual-validator` A CDP virtual authenticator attached with Playwright connectOverCDP landed on a hidden chrome://new-tab-page target, pages()[0], so the first passkey attempt failed silently with no error on screen.
- [2026-11-22 21:27] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-22 21:28] `visual-validator` The skull-king service worker never registers under the dev server, so checking the spec's caching claim needs a scratch vite build and a vite preview the validator must start and stop by pid.
- [2026-11-22 21:28] `visual-validator` Passkey flows need a CDP virtual authenticator held open by a hand-written Node WebSocket script, because agent-browser has no WebAuthn command.
