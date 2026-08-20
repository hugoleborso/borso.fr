---
date: 2026-08-19
introduced-at: self-validation
detected-at: local
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-commits: []
eradication-level: 2
time-to-detect: minutes
tags: [git, hooks, meta, self-improvement-loop]
---

# The knowledge entry warning about this was open in the same session that did it again

## Symptom

Verifying a new gate means breaking something on purpose and watching the gate
fail. Undoing the break is one command:

```bash
git reset --hard HEAD~1        # drop the probe commit
git checkout -- <file>         # or undo the probe edit
```

Both take everything else that was uncommitted with them. In the sweep that
wrote this entry, `git reset --hard HEAD~1` — run to discard a two-line probe
commit — also deleted the pre-commit and CI wiring for the gate being probed.
The command printed nothing. `git log` looked right. The two edits were simply
gone, and the only reason it was noticed at all was a `grep -c` run for an
unrelated reason a minute later.

`docs/knowledge/destructive-git-with-uncommitted-verification-work.md` describes
exactly this. It has been in the repository since **three losses in one
session**. It did not prevent the fourth, or the fifth.

## Root-cause chain

1. The moment the command is reached for is, by construction, the middle of a
   verification: something is deliberately broken and something else is
   deliberately correct, in the same working tree.
2. The two are indistinguishable to `git`. `reset --hard` restores the whole
   tree; there is no "except the part I meant to keep".
3. Neither command warns. `reset --hard` prints the new HEAD;
   `checkout --` prints nothing at all.
4. There is no recovery. The reflog covers commits, not the working tree, so an
   uncommitted edit destroyed this way has no copy anywhere.
5. The knowledge entry, being knowledge, only helps a reader who thinks to read
   it. Nobody consults a warning about a command they have typed a thousand
   times.

**The general form, and it is the one this repository already knows in another
costume:** *a written warning that keeps failing to prevent the same loss is a
gate waiting to be written.* PR #55 found the same shape one layer up — a
reviewer bullet that kept producing the same finding became the
`verb-promises-match-return-type` lint rule. This is that loop applied to
`docs/knowledge/`.

## Detection failure causes

- **The loss is silent and immediate.** No error, no prompt, no artefact left
  behind to notice later.
- **The command is correct almost every time it is run**, so no amount of care
  makes the dangerous case stand out. Only the state of the tree distinguishes
  them, and that state is not in the command.
- **Knowledge is read before a task, not during one.** By the time the command
  is typed, the entry describing it is one of eighty files nobody is looking at.
- **The count was never visible.** Three losses became four became five with
  nothing accumulating a signal; each one read as a private mistake.

## Countermeasure

`.claude/hooks/pretool-no-discarding-reset.sh`, a `PreToolUse` hook on `Bash`
that refuses `git reset --hard|--merge|--keep`, `git checkout -- <path>` and
`git restore <path>` **while tracked modifications exist**, lists the files at
stake, and names the two ways through:

```
git add -A && git commit -m 'wip'   …   git reset --soft HEAD~1
git stash push -u -m 'before the probe'
```

The condition is the whole design. On a clean tree the command destroys nothing
and runs untouched, so the hook costs nothing in the ordinary case and fires
only in the state where the loss is possible.

## Eradication

**DevX check, level 2.** The command cannot run in the state that loses work,
and the message arrives at the moment it is needed rather than in a file
somebody has to remember exists.

Level 1 is not reachable: `git` offers no flag that means "discard only what I
named", and removing the commands from the vocabulary would break the many uses
that are correct.

Verified in both tree states, the clean case in a scratch repository so the
state was unambiguous:

| Tree | Command | Expected | Result |
| --- | --- | --- | --- |
| clean | `git reset --hard HEAD~1` | allowed | exit 0 |
| tracked modification present | `git reset --hard HEAD~1` | blocked | exit 2, naming the three files |
| tracked modification present | `git checkout -- docs/standards/01-naming.md` | blocked | exit 2 |
| tracked modification present | `git restore scripts/foo.ts` | blocked | exit 2 |
| tracked modification present | `git reset --soft HEAD~1` | allowed | exit 0 |
| tracked modification present | `git status --short` | allowed | exit 0 |
| tracked modification present | `echo "never run git reset --hard here"` | allowed | exit 0 |

The last row is the mention-versus-invocation case, handled by the same two
strippers as the sibling hook: heredoc bodies first, quoted arguments second.

**What this deliberately does not cover:** a staged-only change, which
`git diff --quiet` does not report. That one is recoverable — the blob is in the
index and `git fsck --lost-found` finds it — so blocking on it would refuse a
safe command for a loss that can be undone.

## See also

- [`destructive-git-with-uncommitted-verification-work`](../knowledge/destructive-git-with-uncommitted-verification-work.md) — the knowledge entry this is the eradication of, kept because its examples are the evidence.
- [`a-push-that-failed-and-reported-success`](./a-push-that-failed-and-reported-success.md) — the sibling hook, same shape, same session.
- [`broad-pkill-killed-another-agents-measurement`](./broad-pkill-killed-another-agents-measurement.md) — the first hook in this family.
