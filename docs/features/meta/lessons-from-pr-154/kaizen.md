# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [12:48] `main` a component test with a wrong literal type passed pre-commit and pre-push because neither runs tsc and vitest strips types; only CI's typecheck would have caught it
- [13:01] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [13:03] `main` the eradication for explanatory UI text was a name-list gate with an exception file; the operator rejected it as too heavy for what it catches, and it only saw sentences filed under the expected key names
- [13:44] `main` the Deezer and Spotify icons were glyphs drawn by hand instead of the official marks; the operator spotted them as fake, and nothing in the icon atom distinguishes a brand mark from a drawn glyph
