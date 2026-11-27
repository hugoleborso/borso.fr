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

Session: 9c2962d1-4876-40d6-aed0-4c98e04db32b

- [2026-11-27 09:24] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-27 09:26] `main` Controller lint refuses a slice's own .core import, so a file name constant had to travel through the service outcome
- [2026-11-27 09:28] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-27 09:37] `technical-validator` HEAD moved from the reviewed SHA to a spec-only commit while the validator was running tests, so the run guard on the recorded SHA failed mid-review
- [2026-11-27 09:48] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-27 09:48] `hook:pr-body` wrote a pull-request body carrying markup the server silently strips
- [2026-11-27 09:51] `visual-validator` A no-venue concert or one with a public message cannot be created through the API, so the validator had to write the local dev database by hand to reach the spec's summary-without-venue and description cases.
- [2026-11-27 10:02] `main` dev-server.sh start reports no URL when its log holds binary bytes, because grep calls the log a binary file while the server is in fact up
- [2026-11-27 10:06] `visual-validator` The pragma seed holds no practice and no past concert, so checking the calendar route's 422 refusals needed hand-made sessions through the members API.
- [2026-11-27 10:06] `visual-validator` The spec's 'buttons stay inside the ticket at every width' did not say how it applies at phone widths, where the action row is a fixed bottom bar outside the ticket border.
- [2026-11-27 10:21] `visual-validator` The local seed holds one upcoming concert and no practice, past concert or venue-less concert, so the calendar refusal and no-venue rows needed sessions created through the API and a direct SQL edit.
- [2026-11-27 10:21] `visual-validator` phone.sh start opens the phone session in English via navigator.language, so a French accessible-name check at phone width had to be redone in the default session.
