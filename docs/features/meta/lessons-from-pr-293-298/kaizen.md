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

Session: 24f184c7-9ecb-5d91-bc79-415f3860fdb3

- [2026-11-12 00:40] `main` check-knowledge-triggers.sh refused a command trigger that starts with a dash, because the pattern reaches jq as an option, and its message names jq's usage and not the entry
- [2026-11-12 00:40] `main` the ADR the merge of PR 293 added had a line in the topic list of docs/adr/README.md and no row in the index table, so there was no status cell to stamp, and check-adr-numbers-resolve.sh passed it
- [2026-11-12 00:40] `main` a clock-shifted run of every workspace read the working tree while the sweep edited a gate, so its control run failed on the sweep's own half-made change
- [2026-11-12 00:55] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-12 01:49] `main` the sweep built an eradication on a draft pull request deploying its preview, read from preview.yml, and the operator does not want a draft to deploy one
- [2026-11-12 02:12] `main` the sweep built four mechanisms the operator refused once he read them: a draft pull request that opens without a report, a gate at the merge, a validator in the foreground and a forced test clock
- [2026-11-12 02:12] `main` the first summary of the sweep named its changes by the sweep's own labels, and the operator asked for it to be explained again
