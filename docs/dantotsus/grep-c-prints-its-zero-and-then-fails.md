---
date: 2026-08-21
introduced-at: implementation
detected-at: local
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/81
fix-pr: https://github.com/hugoleborso/borso.fr/pull/82
fix-commits: [pending]
eradication-level: 1
time-to-detect: one push — the first docs-only one after the defect shipped
tags: [shell, hooks, pre-commit, gates, ci, stryker, mutation]
---

# `grep -c` prints its zero and then fails

## Symptom

Every push whose diff touches no application died in the hook, before the
first gate finished:

```
[pre-push] gating 1 changed file(s) — range: this push
[pre-push] start: knip
.husky/pre-push: 207: arithmetic expression: expecting EOF: " 0
0 + 2 "
husky - pre-push script failed (code 2)
```

The kaizen pull request for PR #81 is the first docs-only push after the
defect shipped, so the loop's own follow-up is what found it.

## Root-cause chain

1. **Why did the arithmetic see two lines?**
   `$(echo "$changed_app_slugs" | grep -c . || echo 0)` produced `0\n0`.
2. **Why two zeros?**
   `grep -c` **prints its count and then exits 1** when the count is zero. The
   count `0` goes to stdout, the non-zero status fires `|| echo 0`, and the
   fallback appends a second `0` to the same substitution.
3. **Why was the fallback there at all?**
   The line two comments below it in the same file explains: *"a failing
   command substitution inside an assignment aborts the hook under `set -e`"*.
   The author reached for `|| echo 0` to supply a value, not realising `grep`
   had already supplied one.
4. **Why did it not fire on the pull request that introduced it?**
   `changed_app_slugs` was non-empty on every push of PR #81 — it changed all
   four applications. `grep -c .` matched, exited 0, and the fallback never
   ran. The bug needs an **empty** slug list, which means a push touching only
   `docs/`, `scripts/`, or `.claude/`.

**Root cause:** we thought `cmd || fallback` supplies a value when `cmd`
fails; actually `grep -c` fails *while succeeding at printing*, so the guard
does not replace the output — it concatenates with it.

## Detection failure causes

- **Typing / linter:** `.husky/pre-push` is shell. `actionlint` covers
  workflows, not hooks.
- **Functional validation locally:** every push during PR #81 carried
  application changes, which is the branch of the condition that works.
- **CI:** the hook runs before the push, so CI never sees the failure — it
  sees no push at all.
- **Code review:** `|| echo 0` on a counter reads as ordinary defensive shell.
  It is the correct idiom for almost every other command.

## Countermeasure

Take the status without touching the output, and give the arithmetic a
default of its own:

```sh
changed_app_count=$(printf '%s\n' "$changed_app_slugs" | grep -c . || true)
BORSO_MUTATION_RUNS_IN_FLIGHT=$(( ${changed_app_count:-0} + 2 ))
```

`|| true` swallows the exit status and prints nothing, so the substitution is
exactly what `grep` printed. Verified across the three shapes: no app changed
→ `2` runs in flight, one app → `3`, two apps → `4`.

## Eradication (mandatory — code-level)

**Level 1 — the shape that failed is gone.** The fallback that concatenated is
replaced by a status-only guard plus a parameter default, which cannot produce
a second value because it produces no value at all.

The reasoning is written on the line, in the file's own convention, so the next
editor reaching for `|| echo 0` reads why it is wrong here before typing it.

Note the general rule, which is worth more than this one call site: **a command
that prints on failure cannot be guarded with `|| <something that prints>`.**
`grep -c`, `wc -l` on a failed pipeline, and `find … | wc -l` all have this
shape. Use `|| true` and a `${var:-0}` default.

## Related

- [`the-shell-gates-are-only-ever-run-where-they-pass.md`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md)
  — the same blind spot one level up: 26 gate scripts with no tests, exercised
  only on trees where they already pass.
- [`a-timeout-under-parallel-gates-is-not-a-regression.md`](../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md)
  — why `BORSO_MUTATION_RUNS_IN_FLIGHT` exists in the first place.
