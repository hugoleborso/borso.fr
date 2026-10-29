# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [2026-10-29 11:15] `main` The brief said PR #216 was merged into main, but it is open; Home exists only on its head branch.
- [2026-10-29 11:15] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-10-29 11:40] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-10-29 11:40] `main` commitlint's subject-case rule refused a subject starting 'ADR for', so an acronym after the scope reads as upper-case.
- [2026-10-29 11:49] `technical-conception-01` The technical-conception template's code-quality list names eslint and pnpm typecheck while pragma gates with oxlint through 'pnpm lint', so every plan has to rewrite the list by hand.
- [2026-10-29 12:05] `implementation-01` The implementation skill says comments document the why, while docs/standards/00-principles.md and oxlint borso/no-comments forbid every prose comment, so the skill leads an implementer to write comments the linter then refuses.
- [2026-10-29 12:05] `implementation-01` Deleting a tracked file with git rm (even --cached) stages it, which a subagent told not to stage has to undo; the brief could name rm plus git restore --staged as the safe way.
- [2026-10-29 12:26] `implementation-02` The plan put StreakReminderKey in streak-reminder.core.ts while notifications.core.ts NotificationPayload must name it, which would make the two core files import each other, so the type moved to notifications.core.ts.
- [2026-10-29 12:26] `implementation-02` Vitest's core project swallows console.log from a CDK test, so inspecting a synthesized resource took a write to a scratch file.
- [2026-10-29 12:45] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-10-29 12:45] `implementation-03` The plan asked for a new flame glyph in Icon.tsx, but INSTRUMENT_GLYPHS already registers 'flame', so the duplicate key only surfaced as a TS2783 at typecheck.
- [2026-10-29 12:45] `implementation-03` scripts/phone.sh touch runs in its own 'phone' agent-browser session, so a tap after signing in on the default session fails with 'no element matches' until you sign in again there.
- [2026-10-29 12:46] `technical-validation-01` The brief's base_ref origin/claude/pragma-ux-redesign-slice-6 was rewritten after this branch stacked on it, so base_ref...HEAD spans 925 files and the review had to diff from d4ca9ba0 instead.
- [2026-10-29 13:14] `implementation-04` A study write that answers the flames could not live in streaks.service, because import/no-cycle flags it through members and sessions once studies.service re-exports it, so the read-after-write composition had to move into the studies slice.
- [2026-10-29 13:22] `technical-validation-02` git diff output is rewritten by an rtk wrapper that truncates hunks, so a validator must know to call rtk git diff --no-compact to read the whole diff
- [2026-10-29 13:36] `visual-validation-01` agent-browser network route with the glob '**/api/streaks*' let the request through with a 200 and printed Done, so only an exact URL aborted it.
- [2026-10-29 13:36] `visual-validation-01` agent-browser --version prints 0.27.0 while the knowledge entries say they were verified on 0.35.2, so which quirks apply is unclear.
- [2026-10-29 13:36] `visual-validation-01` The spec's happy-path numbers (12, 4, five members, 1 joker) do not match the seeded dev fixture (four members, flames 4/1/0/0), so each step had to be remapped to whichever seeded member was in the same state.
- [2026-10-29 13:50] `implementation-05` agent-browser find role link --name Home matched nothing on pragma at 375 px and history.back left the tab on about:blank, so an in-app multi-cycle check needed DOM clicks via eval.
- [2026-10-29 13:53] `visual-validation-02` phone.sh touch taps the first selector match even when it is hidden (pragma's desktop sidebar nav), so it taps at 0,0 and reports a failed touch instead of naming the invisible target.
- [2026-10-29 13:54] `main` A dev server started with the default 30-minute background limit died mid-visual-validation; start it with the 2 h limit.
- [2026-10-29 13:59] `visual-validation-02` agent-browser network route with a '**/api/streaks*' glob printed Done and blocked nothing, while the exact URL worked, so an abort test can silently run against a live endpoint.
- [2026-10-29 14:02] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
