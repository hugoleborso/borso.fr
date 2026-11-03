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

Session: 6343e190-b8d8-5610-94a7-a31e7eb44b7a

- [2026-11-03 07:04] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-11-03 07:20] `implement` The plan named ensureQueryData and prefetchQuery, which TanStack Query 5.102.8 deprecates and oxlint no-deprecated rejects, so the plan was written without checking the installed API.
- [2026-11-03 07:20] `implement` PersistQueryClientProvider awaits onSuccess before it ends restoring, so a plan that says to run a prefetch from onSuccess blocks the first screen unless the call is fired and not returned.
- [2026-11-03 07:27] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-11-03 07:31] `technical-validator` The setlist-order-survives spec has no Use cases, Test strategy, Q.O.D. or Files to change sections, so categories A and D had to be built from its Behaviour list and the plan table.
- [2026-11-03 07:39] `main` The main session could not run the full pragma app (API, database, signed-in session) to reproduce the menu bug, so it checked the menu on a copied DOM in Playwright instead of the real screen.
- [2026-11-03 07:40] `main` Correction of the previous line: pnpm dev in apps/pragma does run the full app here (local Postgres, seeded members, password pragma-preview); the session assumed it could not and never tried until the operator asked.
