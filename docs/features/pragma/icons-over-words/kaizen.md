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

Session: 3f56ffac-0ee9-590a-ae48-632ac93ba661
- [2026-11-19 19:50] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-19 19:55] `icons-implementer` A PreToolUse hook that rejects one word in a compound Bash command silently drops every other step of that command, so an edit chained before it never ran and looked like a lint fix that did not take.
- [2026-11-19 20:03] `technical-validator` pnpm exec oxlint --type-aware prints nothing at all on a clean run, so a clean lint is indistinguishable from a run that never started without echoing the exit code
- [2026-11-19 20:04] `visual-validator-icons` The seeded pragma data has no session with three or more actions, so validating the crowded action row needed a hand-made practice dated today, and the datetime-local spinbuttons ignored typed digits until the value was set through script.
- [2026-11-19 20:04] `visual-validator-icons` The icons-over-words spec says a page header with three or more actions, but the only such row in the app is the bottom action bar of a practice session, so the validator had to guess which surface the claim meant.
- [2026-11-19 20:04] `visual-validator-icons` No seeded content is authored by a deleted member, so the former-member words rule cannot be checked in a local browser.
- [2026-11-19 20:12] `icons-fixer` VOCABULARY.md refuses the word part for an instrument a member holds, yet MemberPartGlyphs and its MemberPartGlyph type use it, so new code reusing them has to pick between the vocabulary and the existing name.
- [2026-11-19 20:19] `visual-validator-icons-r2` Spec rule 5 says 'name fields and pickers' keep words without saying whether an instrument toggle picker counts, so the lineup editors could not be judged PASS or FAIL from the spec alone.
- [2026-11-19 20:19] `visual-validator-icons-r2` The 'former member' label needs a deleted member's take or inspiration, which the local seed lacks and a shared local database makes unsafe to create.
- [2026-11-19 20:25] `icons-fixer-2` LineupSlots draws no chip under jsdom because getBoundingClientRect reports width 0, so every lineup render test must stub it and ResizeObserver by hand.
