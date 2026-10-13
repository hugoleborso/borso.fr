# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [00:43] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [00:44] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [00:47] `da-planche` A PostToolUse formatter reformatted a scratchpad HTML file outside the repo, tripling its line count past the brief's 900-line budget.
- [00:50] `da-bronze` The PostToolUse formatter hook rewrote a scratchpad HTML file outside the repo with Prettier, tripling its line count past the brief's 900-line budget.
- [00:50] `da-bronze` A CSS custom property set inline on a parent did not reach a child component that redefines the same property, so a per-instance size override silently did nothing.
- [01:01] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [01:03] `main` the Button's text-on-bronze colour was silently dropped by tailwind-merge whenever size lg added text-body, because twMerge read the custom font-size token as a colour
