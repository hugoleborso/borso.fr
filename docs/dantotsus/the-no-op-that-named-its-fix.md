---
date: 2026-10-06
introduced-at: conception
detected-at: local
severity: low
related-pr: "#108"
fix-pr: "#PRNUM"
fix-commits: [a515b15]
eradication-level: 5
time-to-detect: weeks
tags: [self-improvement-loop, hooks, harness, skill]
---

# The no-op that named its fix

## Symptom

While stopping a dev server on PR #136, the `no-broad-kill` hook refused
`pkill` and suggested:

```
[no-broad-kill] If the PID is lost, find the one holding YOUR port rather than every match:
[no-broad-kill]   ss -lptn 'sport = :5173'
```

Running it gave `ss: command not found`. The PID was found by hand with `ps`.

## Root-cause chain

1. **Why did the advice fail?** `ss` is not installed in the hosted container.
2. **Why was it still advised?** The message was written on a machine that had
   `ss`, and nothing runs the commands a hook message suggests.
3. **Was it known?** Yes. PR #108's inventory, row 20, logged exactly this and
   said `fuser` works.
4. **Why was it not fixed then?** The row's decision was `no-op: worth a line
   in the hook's message …`. A no-op closes the row, and the line it named was
   never written.
5. **Why could a no-op name a fix?** The sweep skill defined a no-op as
   "already eradicated or too small", and required a reason without saying
   what a reason may contain.

**Root cause:** we thought a no-op row closes a finding that needs no work,
but a no-op whose reason names a change closes a finding that still needs that
change, and nobody is left to make it.

## Detection failure causes

- **Gates:** `check-instructions-name-installed-tools` checks the tools a skill
  or CLAUDE.md tells an agent to run. A hook's refusal message is not one of
  the files it reads.
- **Review of the PR #108 kaizen:** the reviewer read the row as settled,
  because "no-op" is the word for settled.

## Countermeasure

- **Code:** commit `a515b15` — the hook suggests `lsof -ti tcp:<port>`,
  checked here to return the listening PID.

## Eradication (mandatory — code-level)

**Type:** knowledge addition (level 5 — knowledge)

**Where:** `plugins/borso-harness/skills/after-task-dantotsus/SKILL.md`

**What changed:** a no-op whose reason names a change is no longer a no-op.
The change is made in the kaizen PR, and the row is recorded as
`fixed: <commit>`, a decision the skill now lists. A gate that reads inventory
decisions for proposed changes would be level 2, but deciding whether a
sentence proposes a change is not something a grep can do reliably; the skill
rule is what the sweep reads at the moment it writes the row.

**Reference:** [PR #PRNUM](https://github.com/hugoleborso/borso.fr/pull/PRNUM) · commit `a515b15`

**The actual fix:**

```diff
-  echo "[no-broad-kill]   ss -lptn 'sport = :5173'" >&2
+  echo "[no-broad-kill]   lsof -ti tcp:5173    (ss is not installed in the hosted container)" >&2
```

**Sibling defects swept:** no other hook message names `ss`.

## See also

- [`broad-pkill-killed-another-agents-measurement.md`](./broad-pkill-killed-another-agents-measurement.md)
- [`docs/features/meta/lessons-from-pr-108/inventory.md`](../features/meta/lessons-from-pr-108/inventory.md), row 20
