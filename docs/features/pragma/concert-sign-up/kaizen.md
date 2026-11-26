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

Session: 78a9cee8-6ad7-5552-b015-d73d4b1ef7ca

- [2026-11-26 09:35] `api-agent` The contract named a new request header but not domain/request-headers.core.ts, the registry CloudFront and CORS forward from, so the PATCH would have 403d in prod with every test green.
- [2026-11-26 09:35] `api-agent` A new pragma API slice must also be registered in three structural gates (stale-scope roots, derived read roots, MCP tool exclusions) that no brief or blueprint names, found only by the full core run.
- [2026-11-26 09:35] `main` I launched two build agents in the shared checkout without running /route, which asks for isolation worktree for parallel builds; that is why the Stop hook kept firing.
- [2026-11-26 09:40] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-26 09:44] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-26 09:47] `site-agent` The default 5-minute query stale time plus the persisted cache hid a just-saved public message and a fan-wish song from the next page load, found only in the browser.
- [2026-11-26 09:47] `site-agent` Only one Invariants file per vocabulary term, so a feature split across api and site folders needs a separate site-side term, learned from the vocabulary gate after writing three INVARIANTS sections.
