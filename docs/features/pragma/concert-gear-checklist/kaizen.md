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

Session: 2ce07eef-67cd-5603-98a5-2f5f8f6a8f73

- [2026-11-25 21:39] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-25 21:39] `technical-conception` The brief asked a subagent to commit and push, but the subagent-no-staging hook refuses git add and commit from a subagent.
- [2026-11-25 22:01] `implementation-01` The spec and plan ask slice 2 to drop session.gear with a generated Drizzle migration, but Aurora DSQL refuses DROP COLUMN (domain/INVARIANTS.md, migrations 0006, 0027, 0031), so no planning gate checked the drop against the DSQL gaps.
- [2026-11-25 22:01] `implementation-01` The lint hook run on Write reports import/no-cycle for a file the .oxlintrc.json override exempts, because the worktree path prefix does not match the override glob, so the hook cries wolf in every worktree.
- [2026-11-25 22:03] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-25 22:22] `implementation-02` The plan and the spec order a Drizzle migration that drops session.gear, but DSQL refuses DROP COLUMN, which docs/knowledge/dsql-postgres-compat-gaps.md already records, so neither phase checked the plan's DDL against it.
- [2026-11-25 22:22] `implementation-02` The worktree guard refuses a heredoc or one-liner that writes an i18n catalogue from Python when the shell text also names git, so the edit had to move into a script file.
- [2026-11-25 22:24] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-25 22:26] `integrate-implementation-02` Implementation round 02 shipped with an unused export (GearCopySourceRecord) that fails the knip pre-push gate, so the round's own gates did not include knip.
- [2026-11-26 08:09] `technical-validator` Checking whether an import/no-cycle exemption is still needed requires a probe oxlint config at the repo root, because the config's JS plugin paths are relative and fail to load from a scratch directory.
- [2026-11-26 08:09] `technical-validator` The plan's risk register still says no migration touches session.gear while its own row and the spec ship migration 0033 erasing it, so the plan contradicts itself after the 2026-11-26 decision.
- [2026-11-26 08:25] `implementation-03` A fresh subagent worktree has no node_modules, so scripts/reports.sh blueprints fails until pnpm install runs there.
- [2026-11-26 08:34] `technical-validator` The round-2 rule checks dismissals made in a commit message, but this fix commit put its dismissals in a committed triage file the message only points to, so the rule's reach was unclear.
- [2026-11-26 08:37] `gear-concurrency-tests` The brief's test command uses --project core, which excludes every *.controller.test.ts, so it reports green without running the concurrent tests (back-e2e project holds them).
- [2026-11-26 08:49] `visual-validator` scripts/phone.sh touch 'text=<name>' exited with a bare Node.js stack on a link whose text spans several child elements, instead of saying no element matched the name.
- [2026-11-26 08:49] `visual-validator` The spec's design canvas is a claude.ai artifact a validator cannot open, so microcopy and chip-shape rows the artboard decides cannot be checked against it.
- [2026-11-26 08:50] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-26 08:50] `ship` The ship-stage brief tells a subagent to commit and push, but the subagent-no-staging hook forbids git add and git commit from any subagent.
