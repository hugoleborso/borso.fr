# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [10:22] `standards-reviewer` the dispatching brief named four unsealed files and seal.ts verify named five, so an agent that trusts its brief over the gate silently skips a file
- [10:22] `standards-reviewer` checking a pixel claim in a comment needed a hand-rolled PNG decoder because the sandbox has no PIL and no image-measuring helper, while the claim itself could have been an assertion in the visual-validation run
- [10:38] `standards-reviewer` the fifth standards-review pass on this branch was again briefed with fewer files than seal.ts verify reports, so the brief and the gate disagree by default and only the gate is right
- [10:38] `standards-reviewer` a validation report re-run in the same commit as the layout change still described a readout the same branch had deleted, and nothing checks a validation document's claims the way the seal checks a comment's
- [11:47] `main` the container was reset mid-task and took an uncommitted merge plus a round of review fixes with it, and nothing in the session warns that the working tree is ephemeral
- [11:47] `main` argent declines gesture-swipe and gesture-custom on Chromium, which is exactly the gesture a phone audit needs, so the swipe-over-a-control test had to be hand-rolled against CDP Input.dispatchTouchEvent
- [11:47] `main` pre-push after merging main mutates every gated file main brought in, so pushing a one-file change took over ten minutes and was killed by a command timeout twice
- [11:47] `main` a pull request that conflicts with main silently stops triggering CI, with no signal on the PR page or in the checks list, which reads as GitHub Actions being down
