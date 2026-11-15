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

Session: e857610b-399c-588f-b6b7-c682d1db29c8

- [2026-11-15 06:06] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-15 06:06] `main` The sweep offered the operator a per-PR iPhone checklist and a WebKit e2e run on a suite pragma does not have, instead of a detection that needs nobody.
- [2026-11-15 06:15] `main` The new viewport check passed on every page after oxfmt wrapped the meta tag, because its grep read one line and then checked nothing.
