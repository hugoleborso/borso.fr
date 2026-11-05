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

Session: b330cf0d-0b70-597e-a0ca-4821e8b675e6

- [2026-11-05 17:58] `session-time` Parallel agents running pnpm dev in pragma collide on the fixed API port 3004, so a second worktree's site silently talks to another worktree's API.
- [2026-11-05 18:04] `shell` The worktree isolation guard refuses every 'agent-browser eval' call, so reading layout in the page needs a hand-written CDP Runtime.evaluate script.
- [2026-11-05 18:04] `shell` Chromium cannot reproduce an iOS visual-viewport pan or keyboard, so a sheet-behind-keyboard check needs visualViewport.height overridden by hand.
- [2026-11-05 18:06] `task-note` agent-browser eval is refused by the worktree-isolation guard, so measuring DOM values needs a separate Playwright script.
- [2026-11-05 18:06] `task-note` Two agents running pragma pnpm dev share ports 5174/3001 and one local database, so one agent's reseed changes the other's data and sign-in.
- [2026-11-05 18:06] `task-note` No WebKit can run in the sandbox (missing gtk4 and gstreamer libraries), so an iPhone-only layout bug cannot be reproduced here.
- [2026-11-05 18:09] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-05 18:09] `listen-lineup` The worktree isolation hook refuses agent-browser calls that use a shell variable or eval, so every browser step must be spelled out literally.
- [2026-11-05 18:09] `listen-lineup` pragma dev hardcodes vite port 5174 and API port 3001, so a second worktree cannot run its own full pnpm dev beside another agent's.
- [2026-11-05 18:15] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-05 18:18] `main` Pragma dev ports are hard-coded, so parallel worktree agents collide on ports and on one local database
- [2026-11-05 18:23] `technical-validator` The harness note appended to the validator prompt still forbids writing report .md files while the agent definition makes writing report_path the deliverable.
- [2026-11-05 18:31] `validation-fix` The no-lineup placeholder was written by hand in three components with no shared molecule, so the song Lineup tab drifted from the setlist rows and SessionSetlistPreview still keeps its own copy under sessions.noLineup.
- [2026-11-05 18:39] `technical-validator` Round 1 reviewed a SHA that predates the spec commit, so the round-2 diff shows the whole spec as a new file and hides which lines the dismissal amended.
