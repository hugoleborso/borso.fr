# An agent `main` added is not dispatchable in a session that predates it

Observed on PR #63. `.claude/agents/standards-reviewer.md` landed on `main` in
commit `a9c72ce`. A session that had started before that commit merged the
branch in, checked out the file, read it, confirmed it was on disk — and every
attempt to dispatch it failed with *agent type not found*.

**The agent registry is read once, at session start.** Everything downstream of
that — the list of dispatchable `subagent_type` values, and the tool schema
that validates them — is fixed for the life of the session. Pulling a new
definition into the working tree changes the filesystem and nothing else.

The same holds for a definition you write yourself mid-session: authoring
`.claude/agents/<name>.md` does not make `<name>` dispatchable in the session
that authored it.

## What it looks like

The failure names the symptom rather than the cause, and the file being right
there makes the message read as a bug:

```
Agent type 'standards-reviewer' not found
```

`ls` shows it. `cat` shows it. `git log` shows the commit that added it. None
of that matters.

## What to do

- **Start a new session.** The cheapest fix, and the only complete one.
- **Or run the work inline.** A subagent definition is a system prompt plus a
  tool list; a skill that dispatches one can be followed by hand in the main
  session instead. That is what happened here — the standards review ran
  in-session against the same checklist.

## The tell worth remembering

If a capability appeared in your working tree *during* this session — an agent,
and by the same mechanism a hook or a settings entry — assume the running
session does not have it, and check before spending time on why it is missing.
The inverse is the useful habit: after merging `main` into a long-lived branch,
skim what arrived under `.claude/` before relying on any of it.

## See also

- [`../dantotsus/the-scoped-gate-that-charged-for-all-of-main.md`](../dantotsus/the-scoped-gate-that-charged-for-all-of-main.md)
  — the other thing that same merge cost.
