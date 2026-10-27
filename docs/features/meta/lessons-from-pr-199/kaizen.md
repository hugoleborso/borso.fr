# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [08:38] `lot3-pwa-db` The hand-started Postgres of lot 1 (scratchpad lot1/pg, port 54329) only restarts on macOS with LC_ALL=en_US.UTF-8 before pg_ctl, else it fails with a multithreaded postmaster.
- [09:09] `main` CloudFront answers an API 404 from talos.borso.fr/api/* with the SPA index.html and status 200, so an agent client reads HTML instead of {error}
- [09:10] `main` a SessionStart hook's stdout over 10,000 characters is moved to a file with a 2,000-character preview, which the plan's 80 KB context injection did not know
- [09:10] `main` the memory export reached 9.2 MB and the Lambda response limit of 6 MB turned it into a bare 500 with no log line visible without AWS access
- [09:23] `ux-audit` scripts/browser.sh échoue sans message sur macOS (cherche Chromium sous /opt/pw-browsers) et agent-browser screenshot bloque sur le Mac ; il a fallu signer une passkey logicielle en Node et poser le cookie à la main pour piloter la PWA Talos.
- [01:09] `main` the merge hook that names the prod blast radius was registered on the GitHub MCP call only, so a gh pr merge in Bash merged six apps to prod with nothing printed
- [01:09] `main` the auto mode classifier refused three read-only probes in a row (Production Reads, Cloud Storage Mass Delete), two of them guard probes that never touch prod data
- [01:09] `main` zsh does not word-split an unquoted variable, so a bash-style 'set -- $pair' loop passed empty resource ARNs to eight aws calls before the error named the real cause
- [01:09] `main` the Explicit-write-deny policy on AI-Dev-ReadOnly had never received the 12.6 screenshot carve-out the docs describe, and nothing in the repo can read an IAM policy to notice
- [01:09] `main` readerPrincipalArns comes out of CloudFormation as Fn::Join objects, so a string-list check on it matched nothing and the reader looked unprovisioned on a stack that had just deployed it
- [01:09] `main` db-read's table blocklist read [] both from an undeployed stack and from an app that blocks no table, so every table was readable before the deploy with no signal
- [01:09] `main` PR 199 ran on a hosted session and never archived its friction log, so this sweep rebuilt the inventory from commits and CI
- [01:18] `main` the harness-active gate refused the commit although the PreToolUse hooks had been firing all session: it reads a marker only SessionStart writes, and SessionStart left none in this desktop-app session
