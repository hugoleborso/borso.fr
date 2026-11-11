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

Session: 195f4c47-5090-50fb-b1f3-939eab69c395

- [2026-11-11 13:36] `wide-events` A module-level constant in a .core.ts survived Stryker though the core test asserted its value, because only a test that re-imports the module sees a static mutant.
- [2026-11-11 13:38] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-11 13:47] `technical-validator` The validator brief handed an ADR as the spec, and the technical-validator agent definition has no procedure for an ADR contract, so category A and D rows had to be improvised from Decision and Consequences prose.
- [2026-11-11 13:56] `wide-events-fix` scripts/mutate-changed.sh reads the whole working tree, so with parallel agents it mutates other apps' unfinished files and cannot be scoped to one app
- [2026-11-11 14:01] `wide-events-rollout` Stryker counted wide-event.core constants as covered by the adapter test because vi.resetModules reloads the core inside it, so constants only selectRouteName uses survived until selectRouteName moved to a module the adapter does not import.
- [2026-11-11 14:05] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-11 14:08] `wide-events-rollout` last-loop-lepin pnpm dev died at once because dev-db.sh expanded $6 under set -u and migrated the test database instead of the dev one dev:api reads.
- [2026-11-11 14:18] `technical-validator` A round 2 whose fix commits also roll the change out to three more apps makes the 'review only the diff since the reviewed SHA' scope as large as a round 1, with no plan naming those files.
- [2026-11-11 14:21] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
