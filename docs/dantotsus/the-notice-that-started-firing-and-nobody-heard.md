---
date: 2026-10-28
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#202'
fix-pr: '#217'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-merge-deploys-prod.sh, plugins/borso-harness/scripts/check-hook-decisions.sh]
time-to-detect: 1 day
tags: [hooks, harness, gates, meta, deploy]
zone: .claude/hooks
weak-point: gate-measures-nothing
recurs: [the-merge-whose-blast-radius-nobody-printed]
---

# The notice that started firing and nobody heard

## Symptom

PR #202 fixed a hook that names what a merge deploys: registered on the GitHub
MCP call alone, it had stayed silent through a `gh pr merge` while six
applications went to production. The fix made it match the Bash shape, and a
case in `check-hook-decisions.sh` proved it.

One day later the same session merged PR #202 itself with `gh pr merge 202`,
and saw nothing. Invoked by hand on that exact command the hook answers
correctly, exit 0, the blast radius printed. During the real call the text
never arrived.

## Root-cause chain

1. **Why did the notice not arrive?**
   It goes to stdout. A PreToolUse hook's plain stdout reaches the debug log
   and not the model.
2. **Why was stdout chosen?**
   The hook was written to be read by a person watching a terminal, and it was
   never a problem while it only fired on an MCP call nobody made.
3. **Why did the fix not catch it?**
   The fix asked *does the hook fire on this tool shape*. That was the whole
   question it had, because firing was the thing that had failed.
4. **Why did the new test pass?**
   The row added to the decisions table looked for its needle in the hook's
   `additionalContext` **or** its stdout, so that the table would not have to
   know which shape a hook had picked. That tolerance is what made the table
   green on a hook the model cannot hear.
5. **Why was the tolerance written?**
   To let one existing hook keep its shape instead of changing it. The table
   was adjusted to the hook rather than the hook to the contract.

**Root cause:** thought a hook that runs has done its job, actually a hook has
two halves — it fires, and it is heard — and the test written for the first
half was widened until it stopped asking about the second.

CLAUDE.md states the rule outright: *plain stdout from either reaches no model,
so every hook that informs answers with `additionalContext`.* It was read as
being about the knowledge-trigger hook, which is where it was learned.

## Detection failure causes

- **Linter / static analysis:** nothing relates a hook's output channel to what
  the harness forwards.
- **CI:** `check-hook-decisions.sh` ran and passed, because the assertion had
  been widened to accept both channels.
- **Code review:** the hook's output is correct text. Nothing on the page says
  where it goes.
- **The operator:** a hook that says nothing and a hook whose notice is
  discarded look identical from the chat.

## Countermeasure

- **Code:** the notice is an `additionalContext` answer, and the table accepts
  nothing else.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the table that proved the first half now asks
the second)

**Reference:** PR #217 · commit `self`

**The actual fix:** the hook answers on the channel the model reads.

```diff
-cat <<NOTE
-[merge-deploys-prod] merging pull request $PR into $BASE_BRANCH deploys to production.
-…
-NOTE
+NOTICE="[merge-deploys-prod] merging pull request $PR into $BASE_BRANCH deploys to production.
+…"
+jq -n --arg context "$NOTICE" \
+  '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $context}}'
```

and the table stops accepting the other one:

```diff
-  context="$(jq -r '.hookSpecificOutput.additionalContext // empty' <<<"$output")"
-  spoken="$context
-$output"
+  context="$(jq -r '.hookSpecificOutput.additionalContext // empty' <<<"$output")"
```

Putting the notice back on stdout makes `check-hook-decisions.sh` fail by name,
which is the state that let PR #202's merge through:

```
[check-hook-decisions] a hook decided against its own contract, or has none.
```

The completeness loop keyed on `additionalContext|^cat <<NOTE` so that the
stdout hook would be covered; it keys on `additionalContext` alone now, so a
repository-side hook that informs on the wrong channel has no rows at all and
is reported as missing them.

**Sibling defects swept:** none. `pretool-blueprint-context.sh` and
`knowledge-triggers.sh`, the other two hooks that inform, already answer with
`additionalContext`.

## See also

- [`the-merge-whose-blast-radius-nobody-printed.md`](./the-merge-whose-blast-radius-nobody-printed.md) — the first half of this defect, fixed one day earlier.
- [`the-hook-that-refused-the-page-explaining-it.md`](./the-hook-that-refused-the-page-explaining-it.md)
- [`docs/quality/weak-points.md`](../quality/weak-points.md) — `gate-measures-nothing`.
