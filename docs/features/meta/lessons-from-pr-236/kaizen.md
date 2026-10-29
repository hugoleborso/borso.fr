# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.
- [2026-10-29 15:50] `hook:open-pr` opened a pull request with a body too thin for the template
- [2026-10-29 16:10] `hook:open-pr` refused gh pr create: the body is outside the budget: [pr-body] Body: 727 countable chars, limit 700 [pr-body] 1 violation(s) in /var/folders/q0/zsrmwzl15wd2z7zdkps_4d_00000gn/T/tmp.vcTYcjgKko
- [2026-10-29 16:10] `main` check-pr-body.ts passed the kaizen draft, then the gh pr create hook refused the rendered body plus footer at 727 of 700 countable chars
