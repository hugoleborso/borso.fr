# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [00:11] `main` check-claude-harness-active refuses every resumed session: SessionStart records the resumed session's id and a Bash tool call reports the original one, so the marker never matches
- [00:23] `main` rtk's compressed git log dropped the merge commit from the output, so the branch read as linear and rebased when it was a correct two-parent merge; only rev-list --parents settled it
- [21:23] `main` the pragma MCP search_songs returns the whole catalogue with no query, no pagination and no projection — 102 songs, 99715 chars, over the tool-result budget on the first call
- [21:23] `main` pragma MCP get_studies_overview returns a queue entry whose instrumentId (779b8f19-0cdb-4101-887c-507306f7a561, La Montagne) is in none of the instruments list_instruments returns
- [21:33] `hook:open-pr` opened a pull request leaving the friction log where the sweep cannot read it
- [21:33] `main` the merge notice fixed in PR 202 fired on gh pr merge and still reached nobody: a PreToolUse hook's plain stdout goes to the debug log, and the decisions row accepted either channel
