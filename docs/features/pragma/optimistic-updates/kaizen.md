# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [09:55] `main` the delete test asserted the optimistic write then stopped before the response resolved, so it passed against the exact bug the user reported
- [09:55] `main` a probe component mounting only the mutation cannot reproduce an invalidateQueries defect: invalidate refetches active queries only, so the first regression test passed against the broken code
- [09:55] `main` a blueprint description prescribed the shape a dantotsu had already forbidden, and both lived in the same standard document three sections apart; nothing compares a blueprint's text to the standard it illustrates
- [10:47] `standards-reviewer` seal.ts verify prints the reviewable file list only on failure, so a reviewer has to fail the gate once to learn which files are in scope
- [11:05] `standards-reviewer` a previous round sealed punches.ts under a blanket sentence ('every response and request type in the diff is derived through the Hono client') that was false of that file, so a hand-written cache-response type passed one round and fails the next — a per-file claim would not have survived the write
- [11:35] `standards-reviewer` docs/standards/06-data-fetching.md still tells you to write an eslint-disable-next-line on a sibling-key refetch, but the rewritten no-refetch-of-optimistically-written-query no longer fires there, so reportUnusedDisableDirectives would reject that disable
- [11:43] `main` a python edit script asserted three replacements and wrote at the end, so one failed assert silently discarded the two edits that had already succeeded and the stale prose survived two more rounds
- [11:55] `standards-reviewer` seal.ts verify names a file as unsealed without saying whether it has ever been sealed, so a reviewer has to grep seals.jsonl by hand to tell a first review from a re-review after an edit
- [12:49] `standards-reviewer` a @FollowsBlueprint tag sits on the line above its subject, so inserting a function directly under it silently moves the claim to the new function and no generator notices
- [13:04] `standards-reviewer` the reviewer brief names which files were fixed, but seal.ts verify is the only trustworthy source of what needs review, and the two disagree whenever a fix touches a file the brief did not mention
