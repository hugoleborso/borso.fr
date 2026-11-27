---
status: open
found-in: '#424'
right: 'The Claude Code cloud environment settings'
---

# Cloud environment project folder

Set the cloud environment so a session starts inside the repository checkout, not in the parent folder that holds several clones. A session started in the parent loads none of `.claude/settings.json`, so no hook runs, as `the-hooks-that-never-loaded.md` records. Its knowledge entry is delivered by a hook, so it cannot reach that case.

## Done when

A fresh session's SessionStart output shows the `[install-repo-deps]` lines, which only the repository's hook prints.
