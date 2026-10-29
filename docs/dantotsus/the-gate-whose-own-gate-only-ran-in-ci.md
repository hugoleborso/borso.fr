---
date: 2026-10-29
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#219'
fix-pr: '#220'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-push]
time-to-detect: same day
tags: [meta, gates, harness, ci]
zone: .husky
weak-point: gate-measures-nothing
recurs: none (the earlier gate entries are about a gate that measured nothing; this one is about not being told a gate needed proving)
---

# The gate whose own gate only ran in CI

## Symptom

PR #219 added a mechanism — `gate:deploy-smoke-agent-reader` — and cited it
from `docs/standards/11-database.md`. Locally, every gate passed:

```
Every standard names a mechanism that exists and runs.
```

CI then failed `gate-canaries (fast)` and `gate-canaries (slow)`. Twice, across
two heads, because the first fix replaced the mechanism rather than giving it
what it was missing:

```
no canary: gate deploy-smoke-agent-reader — nothing proves it can fail
113 gate(s), 112 with a canary.
```

Both red runs cost a full CI cycle to say something a two-second local command
knew.

## Root-cause chain

1. **Why did CI fail?**
   Every mechanism a standard cites must have a canary — a planted defect
   proving the mechanism refuses it. The new one had none.
2. **Why did the author not know?**
   Nothing said so at the moment of citing. The enforcement ledger runs on the
   commit, resolves the citation, and reports success: it asks whether the
   mechanism *exists and runs*, never whether anything proves it can fail.
3. **Why is the answer not in the ledger?**
   Discovering the lint canaries runs the eslint-rules suite, which costs ten
   seconds of CPU — thirty times the pre-commit per-check budget. The ledger
   runs on the commit in 158 ms and cannot afford the question.
4. **Why was the gap invisible rather than merely expensive?**
   `gate-canaries.ts --inventory` answers it in one command, and nothing in any
   hook runs it. A command nobody runs is a command nobody knows about.
5. **Why did the first attempt at a fix make it worse?**
   The question was read as *"this mechanism is wrong"* rather than *"this
   mechanism is unproven"*, so the mechanism was redesigned before anything
   asked what the canary would have to be.

**Root cause:** thought the ledger was the gate on citations, actually it is
half of it — the half that can be answered cheaply — and the other half lived
in a command with no caller.

## Detection failure causes

- **The enforcement ledger:** passes. By design: it resolves existence and
  scope, not provability.
- **Pre-commit:** runs the ledger and nothing else about mechanisms.
- **Pre-push:** ran no canary check at all.
- **Code review:** adding a `gate:` bullet looks like documentation. Nothing on
  the page says it carries an obligation.

## Countermeasure

- **Code:** pre-push runs the canary inventory when the push changes a
  mechanism.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the obligation is stated where it is incurred)

**Reference:** PR #220 · commit `self`

**The actual fix:** the existing command gets a caller, on the pushes that can
break its answer.

```diff
+if echo "$changed" | grep -qE '^(scripts/standards/(gates\.core|canary-registry)\.ts|docs/standards/[0-9].*\.md|\.husky/pre-commit)$'; then
+  echo "[pre-push] running the canary inventory (a mechanism changed)"
+  if ! pnpm exec tsx scripts/standards/gate-canaries.ts --inventory; then
+    echo "[pre-push] a cited mechanism has no canary. Nothing proves it can fail." >&2
+    exit 1
+  fi
+fi
```

Verified both ways by removing this PR's own canary from the registry:

```
inventory exit without the canary = 1
inventory exit restored = 0
```

**The scope is the point, not an optimisation.** The command costs ten seconds
of CPU, so paying it on every push would be the mistake
[`the-check-that-cost-more-than-the-defect.md`](./the-check-that-cost-more-than-the-defect.md)
is about. It is paid by a push that edits the gate definitions, the canary
registry, a numbered standard or the commit hook — the four places a citation
can appear or a mechanism can change. Every other push pays nothing.

**A cheaper version was attempted and withdrawn.** The completeness question
was first reimplemented inside the ledger from the statically declared
canaries, on the reasoning that a discovered lint canary can only ever cover an
oxlint rule. It produced 32 problems against 0, because it reinvented
`listMechanisms()` and got reviewer bullets and empty targets wrong. The
existing implementation was correct; a second one was not, which is the
third time in two pull requests that writing a second copy of a rule was the
error. Reverted.

**Sibling defects swept:** none. `--inventory` is the only completeness check,
and it now has exactly one caller outside CI.

## See also

- [`the-check-that-cost-more-than-the-defect.md`](./the-check-that-cost-more-than-the-defect.md) — why the scope is narrow.
- [`the-connection-parameter-no-mock-could-refuse.md`](./the-connection-parameter-no-mock-could-refuse.md) — the mechanism that triggered this.
- [`docs/standards/14-tool-runtime-budgets.md`](../standards/14-tool-runtime-budgets.md)
