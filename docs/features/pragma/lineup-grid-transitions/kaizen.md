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

Session: de104781-a483-5a91-95b9-266dced7046a

- [2026-11-15 06:06] `main` Mockups used one colour per instrument although VOCABULARY.md says a member colour is the only colour on a lineup; I did not read VOCABULARY.md before designing.
- [2026-11-15 06:17] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-15 06:23] `implementer` The no-prettier hook rejects a whole compound Bash command when one segment calls prettier, so an edit script earlier in the same command silently never runs and a test run after it reads the old file.
- [2026-11-15 06:29] `technical-validator` Checking the spec's input metric (changes per row on Alliance 3) against prod took a hand-written tsx probe feeding db-read rows to buildLineupGrid, because the slice-3 task-metrics measure needs a running browser session.
- [2026-11-15 06:38] `visual-validator` The pragma dev seed has no second vocal instrument (Chœurs) and no setlist with a swap or a voice-only run, so every vocal-transition assertion of lineup-grid-transitions needed a setlist built by hand through the API.
- [2026-11-15 06:38] `visual-validator` The spec's input metric names the prod Alliance 3 setlist, which the dev seed lacks, so checking it meant reading prod lineups with db-read.sh and rebuilding four rows locally with one member short.
- [2026-11-15 06:39] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
