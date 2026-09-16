# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [21:02] `technical-validator` the validation report directory did not exist and the first gate runs failed on a redirect into a missing scratchpad subdirectory rather than on anything about the code
- [21:35] `technical-validator-2` a background command whose output redirect targeted a scratchpad subdirectory that did not exist yet reported exit 0 and lost the whole gate log, so the run looked successful and produced nothing
- [21:38] `visual-validator` pragma vote page opens a vote with targetSongCount null — the spec's 'set a target of 15 songs' has no UI control, so the budget is server-defaulted and unverifiable from the screen
- [21:52] `visual-validator` shell parsed 'set viewport 375 812>/dev/null' as an fd-812 redirect, so agent-browser silently got no height and reported 'Missing arguments for: set viewport'
- [21:58] `visual-validator` the vote tally has no polling, SSE or focus refetch, so a spec assertion about live cross-member totals could only be checked by waiting and giving up
- [22:02] `visual-validator` the brief said the band password was 'pragma-preview' but re-seeding does not re-bootstrap app_config, so the enrolment screen refused it and the fixture's stated password was wrong
- [22:51] `visual-validator-2` scripts/browser.sh dropped numeric positional arguments when the call was followed by a redirect in a chained command line, reporting 'Missing arguments for: mouse move'
- [23:04] `standards-reviewer` the reviewer bullet for standard 04 says a multi-table transaction is 'owned by the service' while standard 11's prose says it is opened in the repository, so the generated checklist contradicts the document it came from
