# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [00:07] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [00:15] `infra-role` In a worktree-isolated agent every plain git command is refused because the rtk rewrite turns it into rtk git, which the worktree guard cannot verify; only /usr/bin/git works.
- [00:15] `infra-role` The worktree had no node_modules and lacked ADRs 0033-0035 that the task named, so the ADRs had to be read from the main checkout.
- [00:11] `pragma-kind` the rtk rewrite turns a plain git command into rtk git, which the worktree-isolation guard refuses, so a worktree agent must call /usr/bin/git directly
- [00:12] `pragma-kind` scripts/reports.sh blueprints exits 254 with no message in a fresh worktree that has no node_modules, instead of saying pnpm install is missing
- [00:16] `pragma-kind` pragma's typecheck script fails in a fresh worktree on a missing @borso/infra until infra is built, though test:core already chains that build
- [00:26] `pragma-kind` prettier --check flags vote-deck.core.ts, lineup-slots.core.ts and file-drop.utils.ts on a clean checkout although printing each file through prettier yields the same bytes
- [00:29] `pragma-kind` the spec and the task both wrote ADD COLUMN kind text NOT NULL DEFAULT 'idea', which DSQL refuses; nothing in the spec template checks a migration line against the DSQL-compat gate
- [00:30] `main` The two worktree agents wrote their friction to their own worktree's KAIZEN.md, which archive never reads, so their entries had to be copied by hand.
- [00:31] `main` Stryker's perTest coverage reported mutants as survived for code a test file ran at describe level, outside any it(), which read as missing assertions.
- [2026-11-04 02:29] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-04 02:29] `pragma-kind-2` CLAUDE.md says Prettier is the only formatter and pre-commit runs prettier --check, but a hook refuses prettier because the repo now formats with oxfmt
- [2026-11-04 02:35] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
- [2026-11-04 02:51] `sentry-static` Adding a catalog dependency to one app rewrites the shared pnpm-lock.yaml, which parallel agents also rewrite, so the lockfile diff cannot be scoped to one agent's paths.
- [2026-11-04 02:54] `sentry-banana` Adding a catalog dependency to one app rewrites the shared root pnpm-lock.yaml, which parallel agents adding the same packages to other apps also edit, so the 'touch only apps/<slug>/**' brief cannot hold for a dependency change.
- [2026-11-04 02:57] `sentry-talos` check-frontend-env-vars.sh compares VITE_ names across all apps and workflows, so it passes for talos's VITE_SENTRY_DSN because pragma sets it, and cannot tell whether talos's own deploy job sets it.
- [2026-11-07 10:56] `main` The mutation gate passed locally and failed in CI because mutate-changed.sh reads git diff, so a new file still untracked was never mutated.
- [2026-11-09 08:04] `main` The dashboard artifact type runs each page script in its own scope, so a function declared in one script and called from another throws only at runtime in the published page, with no gate or local check catching it.
- [2026-11-09 08:07] `main` A card built as a CSS grid with an implicit auto column silently takes its minimum width from its widest child, so an inner scroll container stretches the whole page sideways instead of scrolling, and nothing in the repo measures page width against the viewport.
