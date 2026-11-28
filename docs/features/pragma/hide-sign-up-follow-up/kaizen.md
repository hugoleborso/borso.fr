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

Session: 3d0f35c1-8d0e-4710-8803-383b3ffe9c1a

- [2026-11-28 11:25] `main` TS2307 for mailchecker, validator and qrcode.react until pnpm install --frozen-lockfile ran; branch was level with origin/main (where: apps/pragma: pnpm run typecheck)
- [2026-11-28 11:26] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report (where: mcp__github__create_pull_request)
- [2026-11-28 11:31] `visual-validator` an in-page 20 ms sampler saw innerWidth, scrollWidth and clientWidth all at 1280 for a moment during a phone.sh touch, then back to 375; a max-scrollWidth overflow probe read 1280 at a 375 px phone (where: scripts/phone.sh touch, http://localhost:5174/)
- [2026-11-28 11:31] `visual-validator` the sheet's 'Dismiss' button keeps its English accessible name while the rest of the sheet reads French (Fermer, Prénom, Valider) (where: http://localhost:5174/ sign-up sheet, fr locale)
