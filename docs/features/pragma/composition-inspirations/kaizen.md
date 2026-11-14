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

Session: 311d1bbc-59b6-5d54-923f-2be5af96f4c7

- [2026-11-13 21:16] `main` The SessionStart hook install-repo-deps failed to provision agent-browser (Chromium step), so /visual-validation has no browser in this session; the operator also flagged a hook break earlier in the session.
- [2026-11-13 21:22] `plan` The spec's Files-to-change named api/src/realtime/stale-scope.core.ts and per-song sketch:<songId> scopes, but written roots live in domain/stale-scope.core.ts and are per API root only, so a spec author cannot see the invalidation model without reading four files.
- [2026-11-13 21:22] `plan` Nothing tells a spec author that a new /api root fails the MCP route-coverage gate (tool-coverage.test.ts) unless it gets a tool or a TOOL_EXCLUSIONS reason.
- [2026-11-13 22:04] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 22:06] `implementation` require('playwright') from apps/pragma resolves the workspace Playwright 1.65 whose chromium build is not in /opt/pw-browsers, so a screen check only launches from a script outside the repo that resolves the global /opt/node-tools Playwright.
- [2026-11-13 22:24] `technical-validator` scripts/check-vocabulary-paths.sh run from apps/pragma prints 'no application ships a VOCABULARY.md' and exits 0, so a wrong working directory reads as a pass
- [2026-11-13 22:45] `fix-round-1` The B04 brief proposed listInspirationsNewestFirst for the service, which the repository already exports, so the rename needed a second name (listInspirationViewsNewestFirst).
- [2026-11-13 22:45] `fix-round-1` The validation report cited InspirationCard.tsx:235 for a literal at line 31 of a 52-line file, so the line number could not be trusted to locate the finding.
- [2026-11-13 23:13] `visual-validator` After scripts/phone.sh touch exits, eval in the phone session reports innerWidth 1280 while screenshots still render at 375, so width measurements after a tap are wrong until set viewport is re-run.
- [2026-11-13 23:19] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
