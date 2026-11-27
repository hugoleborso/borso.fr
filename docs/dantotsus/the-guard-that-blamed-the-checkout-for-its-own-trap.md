---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#216'
fix-commits: [self, 458e886c4]
eradication-level: 1
eradication-paths: [scripts/hooks/checks/no-discarding-reset.core.ts, scripts/hooks/hook.ts]
time-to-detect: days
tags: [hooks, harness, git, agents]
zone: .claude/hooks/pretool-no-discarding-reset.sh
recurs: none (the hook refused for the reason it exists; only its message was wrong)
---

# The guard that blamed the checkout for its own trap

## User impact

Agents restoring one file in a dirty tree were refused with a message that
blamed the checkout, and followed advice that could not help.

| | Seen | Expected |
| --- | --- | --- |
| `git checkout -- <file>` in a dirty tree | "cannot tell whether this discards uncommitted work: the hook itself failed while reading the checkout." | the list of files at stake, with a commit or a stash offered |

Three agents on PR #216 logged it, and the hook logged itself five times
(counted from the friction logs of PR #216 when this entry was first written). `fix-all` wrote: "fails on a plain
literal git -C <repo> checkout -- <files>, saying it cannot read the
checkout, so restoring files needed a stash".

## Causal chain

- The hook printed "the hook itself failed while reading the checkout" for a literal path in a readable checkout.
  - Its `ERR` trap printed that message, not the path check:

```bash
trap 'refuse_unreadable_checkout "the hook itself failed while reading the checkout"' ERR
```

  - The trap fired on `git diff --quiet`, which exits 1 when the tree has changes, the one state where the hook has something to say:

```bash
  set +e
  git -C "$TARGET_DIRECTORY" diff --quiet 2>/dev/null   # exit 1 fires the ERR trap despite set +e
  DIFF_STATUS=$?
```

    - Commit `a83f0a600` (#200) wrote both, in `plugins/borso-harness/hooks/pretool-no-discarding-reset.sh`. An agent wrote it to read the exit status of `git diff`, and added the trap as a catch-all that names one guessed cause.

## Root cause of occurrence

*Thought `set +e` keeps a failing command from the `ERR` trap, actually an
`ERR` trap fires on any failing simple command whatever `set -e` says, and
only an `||` or an `if` exempts it.* (Material)

Nothing in the agent's context held the fact. At the parent commit,
`git grep -nE '\|\| [A-Z_]+=\$\?' a83f0a600^` finds no example of the right
pattern in the hooks or scripts. Had the agent known, it would have written
`git diff --quiet || DIFF_STATUS=$?`.

A catch-all trap that prints one specific cause made the misfire worse. Any
failure inside the hook read as user error.

## Detection failure causes

- **Local validation:** the proof run on the hook's own PR fed it a dirty tree and read only the exit code, 2, which is the same in both branches.
- **Review:** `set +e … set -e` reads as the standard way to read an exit status.
- **The trap's message:** it named a cause it had not checked, so every agent took it as a fact about the checkout.

## Countermeasure

The kaizen pull request for #216 and #231 read the status with `||`:

```diff
-  set +e
-  git -C "$TARGET_DIRECTORY" diff --quiet 2>/dev/null
-  DIFF_STATUS=$?
-  set -e
+  DIFF_STATUS=0
+  git -C "$TARGET_DIRECTORY" diff --quiet 2>/dev/null || DIFF_STATUS=$?
```

With one modified file, the refusal then read
"`git checkout -- README.md` discards tracked changes that are not committed
in .:" followed by the file (measured then).

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `458e886c4` (#411) deleted the bash hook and every other
`.claude/hooks/*.sh`. Claude Code now runs `scripts/hooks/hook.ts`, and the
check lives in `scripts/hooks/checks/no-discarding-reset.core.ts`. An exit
status is a value there, and no trap exists:

```ts
const diffStatus = walk.world.run('git', [...gitArgs, 'diff', '--quiet', '--', ...paths]).status;
if (diffStatus === 0) return PASS;
if (diffStatus !== 1) return refuseUnreadableCheckout(`git diff failed in ${target}`);
```

"Cannot read the checkout" now prints only when `git diff` exits with a status
other than 0 or 1.

**Proof it can fail:** not replanted this session. The TypeScript check has
no trap to misfire, so the bash defect cannot be planted in it.

**Similar instances:** `ls .claude/hooks` finds no directory, and
`git ls-files '*.sh' | xargs grep -ln ERR` finds no `ERR` trap in any tracked
shell script, only `ERROR` strings (measured 2026-11-27).
