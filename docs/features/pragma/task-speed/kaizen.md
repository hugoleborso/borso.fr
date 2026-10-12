# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [08:50] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [08:56] `main` setlist-filter.core computed each member's instruments per row since 9a94594 but no component rendered them; the 'my part' view silently lost its answer and no test or gate noticed a projection with no reader
- [08:56] `main` the bars page carried two buttons labelled Save, and the first one on the page saved the outreach template; the earlier mobile audit measured both buttons and passed them, because it checked sizes, not which control a job reaches first
- [08:56] `main` playwright's request.post('/api/auth/login') did not leave a usable session cookie for the page against the vite dev proxy; signing in through the form did
- [11:52] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [17:00] `main` git push to the session branch was rejected with 'remote rejected (Internal Server Error)' six times over ~3 minutes while fetch worked; pushing the same files through the GitHub API succeeded
