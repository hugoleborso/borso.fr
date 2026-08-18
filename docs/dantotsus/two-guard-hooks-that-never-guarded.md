---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#60'
fix-pr: '#62'
fix-commits: [195b354]
eradication-level: 2
time-to-detect: 3 months
tags: [harness, hooks, gates, meta, self-improvement-loop]
---

# Two guard hooks that never guarded

## Symptom

While sweeping PR #60 I ran a command the open-pr hook is written to
refuse. It ran. The hook's three rejection lines never appeared:

```
$ echo "<the open-pr trigger> --body short"
<the open-pr trigger> --body short
```

Running the hook by hand showed it working perfectly — it printed the
refusal and exited 1. The command ran anyway.

## Root-cause chain

1. **Why did the command run?** The harness did not treat the hook's
   exit code as a refusal.
2. **Why not?** A PreToolUse hook blocks on exit **2**. Any other
   non-zero code is a non-blocking error: it is shown and the call
   proceeds.
3. **Why did the hook exit 1?** Its header states the contract as
   *"exit 1 + stderr message → command is blocked"*. Both guard hooks
   carry that sentence, and both were written to it.
4. **Why did nobody notice for three months?** Because the failure is
   silent in the good case. A hook that refuses nothing looks exactly
   like a hook whose condition was never met, and the conditions here
   are rare by design — a short pull-request body, a kill by name
   pattern. Nothing ever printed "this should have been blocked".
5. **Why did the sibling hook matter?** `pretool-no-broad-kill.sh` is
   the shipped eradication of
   [`broad-pkill-killed-another-agents-measurement`](./broad-pkill-killed-another-agents-measurement.md).
   That dantotsu has been recorded as eradicated at level 2 since it
   was written, and the eradication had never once fired.

**Root cause:** thought *"a non-zero exit from a PreToolUse hook blocks
the call"*, actually *"only exit 2 blocks; everything else is advisory,
so a gate written with exit 1 is a log line wearing a gate's clothes"*.

## Detection failure causes

- **Typing:** shell, no types to disagree with.
- **Linter / static analysis:** `actionlint` covers workflows, not
  hooks; nothing reads a hook's exit code against the harness contract.
- **Functional validation locally:** the hooks were tested by piping
  JSON into them by hand, which shows the message and the exit code and
  proves nothing about what the harness does with either. Both hooks
  pass that test today and passed it while inert.
- **CI:** hooks are a local-harness surface; no job exercises them.
- **Code review:** the header asserts the contract, and the code matches
  the header. Reviewing the two together can only confirm they agree.
- **Production monitoring:** a gate that never fires produces no signal
  distinguishable from a gate whose condition never arose.

## Countermeasure

- **Code:** commit `195b354` — both hooks exit 2 on refusal, and both
  headers now state the real contract, including what exit 1 does.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gates now actually gate)

**Reference:** [PR #62](https://github.com/hugoleborso/borso.fr/pull/62) · commit [`195b354`](https://github.com/hugoleborso/borso.fr/commit/195b354)

**The actual fix:**

```diff
-#   - exit 1 + stderr message → command is blocked; the message is
-#     surfaced to the agent so it can self-correct.
+#   - exit 2 + stderr message → command is blocked; the message is
+#     surfaced to the agent so it can self-correct. Exit 1 does NOT block:
+#     the harness treats any non-zero-but-not-2 code as a non-blocking
+#     error, prints it, and runs the command anyway.
@@
-  exit 1
+  exit 2
 }
```

Verified in both directions on the live harness: before the change the
triggering command reached the shell and printed; after it, the call is
refused and the hook's message is returned to the agent.

**Sibling defects swept:** arming the gates exposed a second defect in
both — each matched a *mention* as readily as an *invocation*, so the
first version of the fix commit was refused twice for quoting the
commands in its own message. Both hooks now read the command with its
heredoc bodies stripped, via `.claude/hooks/strip-heredocs.py`, and the
open-pr matcher additionally requires the command at the head of a shell
segment. Five cases per hook cover both directions.

## See also

- [`broad-pkill-killed-another-agents-measurement`](./broad-pkill-killed-another-agents-measurement.md) — the dantotsu whose eradication was inert.
- [`a-gate-that-reported-success-while-measuring-nothing`](./a-gate-that-reported-success-while-measuring-nothing.md) — same family: a green signal that measured nothing.
- [`an-approval-gate-that-only-existed-in-a-comment`](./an-approval-gate-that-only-existed-in-a-comment.md) — a protection asserted in prose that nothing enforced.
