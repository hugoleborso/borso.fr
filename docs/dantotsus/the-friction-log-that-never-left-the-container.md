---
date: 2026-10-27
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#199'
fix-commits: [02c715dc5, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/gh-pr-create.core.ts, .gitignore]
time-to-detect: 2 days
tags: [self-improvement-loop, harness, hooks, agents, meta]
zone: scripts/kaizen.sh
weak-point: prose-stands-in-for-a-check
recurs: [a-knowledge-entry-did-not-stop-the-second-hit]
---

# The friction log that never left the container

## User impact

PR #199 was built on claude.ai/code and merged from a laptop two days later.
The sweep that was supposed to read its friction log opened `KAIZEN.md` and
found five entries about a different feature. Everything PR #199 had learned
the hard way had to be rebuilt from thirteen commit messages, a CI history and
a pull-request body. Expected: the sweep reads PR #199's own friction lines.

## Causal chain

- The sweep found no friction log for PR #199.
  - The log lived only in the hosted container, which was reclaimed when the
    session ended. The sweep ran later on a laptop.
    - `scripts/kaizen.sh archive <slug>`, which copies the log into the
      branch, was never run.
      - CLAUDE.md asked for it in a paragraph addressed to a session about to
        finish. Commit `8356cd798`, written by an agent, wrote it:

        > **On a hosted session, archive it before you finish.**

        Finishing is not an event. No call happens at that moment for a hook
        to attach to, and no file's state says whether the step was taken.
        - The step exists only because commit `9d698e854` made the log a
          gitignored "Per-session kaizen scratch file ... Local-only by
          design", outside the branch. The same commit message that wrote the
          paragraph records the first near-loss, "33 entries from twelve
          different agent labels", and answered it with prose. **Method.**

## Root cause of occurrence

*Thought an instruction aimed at the end of a session will be followed,
actually a session has no end it can act on, and the one moment the log and
the branch are provably in the same place is the pull request.* Method: the
process put a required step at a moment that does not exist, to carry a file
the design kept out of the branch.

## Detection failure causes

- **Linter:** the file is gitignored, so nothing lints it.
- **CI:** CI sees the branch. A file that was never meant to be committed is
  invisible there.
- **Code review:** a missing archive looks exactly like a task with no
  friction, which is a legitimate outcome.
- **The loop itself:** `/after-task-kaizen` discovers the loss at the one
  moment it can do nothing about it.

## Countermeasure

`gh pr create` refuses while the friction log holds entries and the branch
commits no archive of it. The refusal names the command.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`02c715dc5`](https://github.com/hugoleborso/borso.fr/commit/02c715dc5)
(PR #202) added the refusal to the shell hook `pretool-gh-pr-create.sh`.
Commit [`458e886c4`](https://github.com/hugoleborso/borso.fr/commit/458e886c4)
deleted that hook and ported the check to
`scripts/hooks/checks/gh-pr-create.core.ts`:

```ts
function checkFrictionLogArchived(commandToRun: string, world: HookWorld): Verdict {
  const frictionLog = world.readText(KAIZEN_FILE);
  if (frictionLog === null) return PASS;
  const logged = frictionLog.split('\n').filter((line) => LOGGED_ENTRY.test(line)).length;
  if (logged === 0 || countArchivedKaizen(commandToRun, world) > 0) return PASS;
  return refuse(RULE, 'opened a pull request leaving the friction log where the sweep cannot read it', [...]);
}
```

The archive has to be on this branch. A check for one anywhere answers yes
for every branch, because the tree holds every past feature's log. That
version was written first and passed on a branch that archived nothing.

The same commit anchored the ignore pattern. Unanchored, `KAIZEN.md` matched
at every depth, and on a case-insensitive filesystem it also matched
`kaizen.md`, the name `archive` writes. `git add` skipped the archive in
silence on a Mac. `.gitignore` now reads `/KAIZEN.md` and `/KAIZEN.*.md`.

**Proposed:** subtract the step. A log the branch commits from its first line
reaches the sweep with no `archive` and no check on `gh pr create`, as
[`the-friction-log-that-adopted-another-sessions-lines`](./the-friction-log-that-adopted-another-sessions-lines.md)
proposes. That makes this defect impossible, where the hook only catches it
when the pull request opens.

**Proof it can fail:** the refusal fired on PR #202 itself, on five entries
from the talos work that had sat unswept in the log.

**Similar instances:** the `archive` subcommand already merged rather than
overwrote, after a task where three agents archiving in turn left only the
last one's entries.
