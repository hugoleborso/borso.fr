# Two agents in one working tree, and how to tell one is there

PR 50 ran two audit-and-fix workflows against the same checkout at the same
time. That was an accident — the first run was believed dead and a second was
launched — and the way it surfaced is worth knowing, because the failure is
quiet.

## What a concurrent writer looks like

The second run's round-one fixer opened with 21 findings to fix and shipped
none. Its reasoning, from its own report:

> Another process is actively editing `apps/pragma/site/src` right now, on the
> same finding list. Evidence: `git diff` content md5 changed across a 60s
> sample (`573867f5` → `aaeecba6`).

That is the check to steal:

```bash
before=$(git diff | md5sum); sleep 60; after=$(git diff | md5sum)
[ "$before" = "$after" ] || echo "somebody else is writing this tree"
```

It also found that most of its findings no longer reproduced — the other run had
already fixed them — which is the second tell: measurements that contradict a
report written twenty minutes ago.

Refusing to write was the right call. Two fixers editing the same files would
have produced interleaved edits nobody could review, and the round cost only
tokens.

## Rules that follow

- **Stage explicit paths.** `git add <path> …`, never `git add -A` or
  `git add .`, when anything else might be writing. A blanket add sweeps another
  agent's half-finished edit into your commit.
- **A commit is the handoff.** Uncommitted work belongs to whoever is writing
  it; do not run gates over a tree that is still moving, and expect a spurious
  failure if you do.
- **Check before pushing.** `git status --short` immediately before a push, and
  again if the push takes minutes.

## Before you conclude a background run is dead

The accident happened because a filesystem search for the first run's state came
back empty and was read as proof. It was a `find -maxdepth 6`, and the state
lived deeper — under a *second* project folder, because a session started from a
subdirectory gets its own:

```
~/.claude/projects/-home-user-borso-fr/…                 # the session
~/.claude/projects/-home-user-borso-fr-apps-pragma/…     # its workflow scripts
```

So search both, and prefer a liveness signal over a directory listing:

```bash
find ~/.claude/projects -maxdepth 4 -name 'journal.jsonl' -newermt '-10 minutes'
ls -lt ~/.claude/projects/*/*/subagents/workflows/*/agent-*.jsonl | head
```

A file written in the last minute means agents are still running, whatever the
task list says. `/workflows` shows the same thing without the archaeology.
