# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [19:40] `visual-validator` the visual-validation brief gave the seed URL on the site host, but the preview API is on a separate <app>-pr-N-api host and CloudFront answers 403 to POST on the site distribution
- [19:40] `technical-validator` the feature under validation has a spec but no plan/plan.md, and nothing in the pipeline recorded whether the plan stage was skipped or failed
- [19:40] `technical-validator` the spec template's Test strategy section was absent from this spec, so the validator had no authoritative split between technical and visual assertions and had to guess which rows were its own
- [19:46] `visual-validator` scripts/browser.sh set viewport <w> <h> fails with 'Missing arguments' unless a third scale argument is passed, so the documented two-argument form does not work through the wrapper
