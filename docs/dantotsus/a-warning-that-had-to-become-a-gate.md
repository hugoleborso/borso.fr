---
date: 2026-08-19
introduced-at: self-validation
detected-at: local
severity: medium
related-pr: '#55'
fix-commits: [d6dd5ba5a, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-discarding-reset.core.ts, scripts/hooks/checks/no-discarding-reset.core.test.ts]
time-to-detect: minutes
tags: [git, hooks, meta, self-improvement-loop]
zone: .claude/skills/dantotsu
weak-point: prose-stands-in-for-a-check
---

# The knowledge entry warning about this was open in the same session that did it again

## User impact

An agent verifies a new gate by breaking something on purpose, then undoes
the break. In the sweep that wrote this entry, the undo also deleted the gate's
own pre-commit and CI wiring.

| | Seen | Expected |
| --- | --- | --- |
| `git reset --hard HEAD~1` after a two-line probe commit | The probe gone, and two uncommitted wiring edits gone with it, with no message | The probe gone, the wiring kept |

The command printed nothing and `git log` looked right. A `grep -c` run for an
unrelated reason a minute later showed the loss (measured in that session).
[`destructive-git-with-uncommitted-verification-work`](../knowledge/destructive-git-with-uncommitted-verification-work.md)
records three earlier losses of the same kind in one session on 2026-08-15.
This was the fifth.

## Causal chain

- Two uncommitted edits, the gate's wiring, disappeared.
  - The agent ran `git reset --hard HEAD~1` to drop its probe commit:

    ```bash
    git reset --hard HEAD~1   # ❌ resets the whole tree, not only the probe
    ```

    - The reset restored every tracked file to `HEAD~1`, including the files
      that held the uncommitted wiring.
      - The probe commit and the real work sat in the same working tree. The
        sweep planted the defect where the eradication was still being written.
        - The process the sweep followed asked for an eradication proven on a
          planted defect, and said nothing of where to plant it. The knowledge
          entry's advice, a throwaway branch or a copy in `/tmp`, sat in a file
          the agent had read that session (Method).
    - The knowledge entry that names this exact command was loaded in the
      session. The agent typed the command anyway (Man).

## Root cause of occurrence

*The agent thought `git reset --hard HEAD~1` drops the probe commit, actually
it resets every tracked file in the working tree, and the reflog keeps commits,
not uncommitted edits.* (Man)

The right answer was in the agent's context. The knowledge entry says *"`git
reset --hard` after a throwaway probe commit does the same thing to every
uncommitted file in the tree"*, and the session had read it. The prior of a
command typed a thousand times won over a file read earlier. Under the agentic
4M rule, the fix is therefore not another document. It is a gate that holds
when the prior wins, and a probe procedure that never puts the probe and the
work in one tree.

## Detection failure causes

- **Git:** `reset --hard` prints the new HEAD, and `checkout --` prints
  nothing. Neither tells a probe from the work, because only the state of the
  tree does.
- **Recovery:** the reflog covers commits, so an uncommitted edit destroyed
  this way has no copy.
- **Knowledge:** the entry had no command trigger at the time. It was read
  before the task, not at the moment the command was typed.
- **Counting:** three losses became five with no signal accumulating. Each
  read as a private mistake, so none raised the entry to a gate.

## Countermeasure

A PreToolUse check on Bash refuses `git reset --hard|--merge|--keep`,
`git checkout -- <path>` and `git restore <path>` while tracked modifications
exist. It lists the files at stake and names the two ways through:

```
git add <those paths> && git commit -m 'wip'   …   git reset --soft HEAD~1
git stash push -u -m 'before the probe'
```

On a clean tree the command destroys nothing and runs untouched, so the check
costs nothing in the ordinary case.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `d6dd5ba5a` added the shell hook. Commit `458e886c4`
(#411) deleted `.claude/hooks/pretool-no-discarding-reset.sh` and ported it to
`scripts/hooks/checks/no-discarding-reset.core.ts`, which holds the rule today:

```ts
const RULE = 'no-discarding-reset';
// …
  String.raw`${GIT_INVOCATION}(reset\s+(--hard|--merge|--keep)|checkout\s+--\s|restore\s)`,
```

Level 1 is not reachable inside git: no flag means "discard only what I
named", and removing the commands would break their many correct uses.

**Proof it can fail:** `scripts/hooks/checks/no-discarding-reset.core.test.ts`
holds the case *"refuses a hard reset over tracked changes, because it deletes
them with no reflog entry"*, plus the later defects found on PR #193: a chain
judged only on its first command, and a checkout named through `git -C` or
`cd` that the hook could not read. Each is a test case today.

**What it does not cover:** a staged-only change. `git diff --quiet` does not
report it, and the blob stays in the index, where `git fsck --lost-found` finds
it.

**Proposed:** subtract the dangerous state. The proof step of
`.claude/skills/dantotsu/SKILL.md` says today *"plant the defect on a scratch
copy"*, in prose. It would instead name one command that runs the probe in a
throwaway `git worktree add` on a temporary branch and removes it after. The
working tree that holds the real work is then never the one the probe resets,
so a discarding command during a probe has nothing to destroy. The hook stays
as the guard for every other moment.

**Similar instances:** the same sweep produced two siblings, each a command
whose reach was wider than its intent:
[`a-push-that-failed-and-reported-success`](./a-push-that-failed-and-reported-success.md)
and [`broad-pkill-killed-another-agents-measurement`](./broad-pkill-killed-another-agents-measurement.md).
`grep -n stash scripts/hooks/checks/no-discarding-reset.core.ts` finds only
the advice line, so `git stash drop` after a partial restore, recorded in the
knowledge entry above, is not gated.
