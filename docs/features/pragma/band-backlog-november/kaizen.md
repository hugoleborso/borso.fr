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

Session: 06711f4e-d7cb-5372-89ce-02fb8c62cc26

- [2026-11-15 06:43] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-15 06:46] `visual-validator` scripts/phone.sh touch flips the page to 1280 px and back while re-applying the viewport, so a horizontal scroller that turns sm:overflow-visible snaps to scrollLeft 0 and the post-tap screenshot hides the tapped pill.
- [2026-11-15 06:47] `main` check-spec-records.sh exited 1 silently on every new spec with no CREATE TABLE, because grep under pipefail found nothing
- [2026-11-15 06:49] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-15 06:54] `back-link` Workspace typecheck and lint cannot confirm one agent's change while parallel agents leave the shared app red (streaks, session-page, SessionDetail), so each agent has to filter the output by hand.
- [2026-11-15 06:58] `scene-tabs` pragma typecheck, lint and the vocabulary gate fail on another agent's half-done streaks/studies work, so verifying one's own files needs a grep filter over the shared output
- [2026-11-15 06:58] `scene-tabs` convertChordsAboveLyrics spliced chords into ASCII tab staff lines and tonality read string names like E| as chords, with no test pasting a tab
- [2026-11-15 06:59] `session-order` SessionDetail.tsx sat at 300 of 300 counted lines, so any new feature on the session screen fails max-lines and must first move code out
- [2026-11-15 06:59] `session-order` Workspace lint panicked in tsgolint on a file another parallel agent had just deleted (studies.utils.ts), blocking lint for every agent until it settled
- [2026-11-15 07:04] `flames` Moving the flame inputs into streaks.service closed an import cycle through members.repository's delete cascade, so presence writes needed their own presences.service.ts file.
- [2026-11-15 07:23] `visual-validator` Proving that browser back does not reopen a child page after a back-link tap needed a fresh browser and a new sign-in, because entries pushed earlier in the same tab made an older child entry look like a back-link defect.
- [2026-11-15 07:26] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-15 07:26] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-15 07:28] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-15 07:33] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-15 07:34] `tab-transpose` The worktree guard refuses a shell command whose prose holds the four-letter word for a number character, reading it as the version-control tool, so sed edits to fret prose had to go through Edit.
