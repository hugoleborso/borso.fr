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

Session: 30e4c5f8-685a-5fe9-9e56-1bf187450c5d

- [2026-11-12 07:41] `main` jsdom has no AnimationEvent, so React listens for webkitAnimationStart and a test firing animationstart reaches no handler
- [2026-11-12 07:48] `hook:commitlint` commitlint refused a commit message: feat(talos): Phaistos coin icon and cold-start opening
- [2026-11-12 07:54] `technical-validator` A short-form spec routes nothing to /visual-validation, so CSS-only choreography claims (spin count, timing, light sweep) land in category D with no test form but a structural citation of keyframes.
- [2026-11-12 07:54] `technical-validator` The opacity guard test for the 3D coin reads only class names and inline style, so the validator had to read tokens.css keyframes by hand to see that the gleam layer animates opacity.
- [2026-11-12 08:05] `technical-validator-2` The brief's scratchpad work folder did not exist, so the first redirect into it failed and a test run had to be repeated.
