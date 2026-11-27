---
date: 2026-08-10
introduced-at: conception
detected-at: local
severity: low
related-pr: '#40'
fix-commits: [9b8d380ed]
eradication-level: 2
eradication-paths: [.husky/pre-commit]
time-to-detect: minutes
tags: [prettier, formatter, hooks, pre-commit, self-improvement-loop]
zone: .husky/pre-commit
recurs: [biome-formatter-was-not-gated]
---

# The formatter was a detector with no writer

## User impact

A `git commit` was rejected by `.husky/pre-commit`, because a freshly written
file carried layout the formatter wanted different:

```
[pre-commit] running prettier on staged files
Checking formatting...
[warn] infra/shared/test/unit/__snapshots__/borso-shared.template.json
[warn] Code style issues found in the above file.
husky - pre-commit script failed (code 1)
```

The remedy was always the same three steps: run the writer, `git add` again,
commit again. Each cost a full cycle for zero semantic change. Expected: a
commit that carries formatted files without anyone formatting by hand.

The friction was first written up against Biome in PR #37, which never
merged. PR #40 replaced Biome with ESLint and Prettier, and the friction
survived unchanged.

## Causal chain

- The commit was rejected for layout only.
  - The pre-commit hook ran the formatter in check mode, which reports drift
    and fails:

    ```sh
    echo "[pre-commit] running prettier"
    pnpm exec prettier --check . --cache   # ← ❌ refuses drift it could have written
    ```

    - Commit `314f24821` (PR #40), written by an agent, replaced Biome's
      `biome check` with this line. It kept the shape of the gate it
      replaced: a check that rejects.
      - That shape came from the Biome entries, `biome-lint-was-not-gated-anywhere`
        and `biome-formatter-was-not-gated`. Their eradications gated lint and
        format the same way, as checks at commit and CI. The process treated
        a formatter like a linter. **Method.**

## Root cause of occurrence

*Thought the formatter belongs at the gate as a check, like the linter,
actually its rewrite is layout only and deterministic, so the gate can write
and stage the result instead of refusing the commit.* Method: the gate design
was inherited from the lint gate, whose autofix is not safe to apply
silently. The edit-time hook's own header states that difference for
`eslint --fix`, and the format gate never applied it to itself.

## Detection failure causes

- **Typing and linter:** layout is not behaviour.
- **Local validation:** the gate caught every drift, one step too late, as a
  rejected commit.
- **Code review:** once the gate exists, drift never reaches a reviewer, so
  the cost of each rejection was visible only in sessions.

## Countermeasure

Commit `ebabfe765` (PR #45) added a `PostToolUse` hook on
`Edit|Write|MultiEdit` that ran Prettier's writer on the file just touched.
It covered only those tools. A write made with `sed`, a heredoc or a script
still reached the commit unformatted. The same hook later formatted files
outside the repository, see
[`the-formatter-reached-outside-the-repository`](./the-formatter-reached-outside-the-repository.md).

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`9b8d380ed`](https://github.com/hugoleborso/borso.fr/commit/9b8d380ed)
(PR #359). The writer moved to the commit, where the check already was.

```sh
# The commit formats what it carries, so nobody formats by hand.
if [ "$#" -gt 0 ] && [ -x node_modules/.bin/oxfmt ]; then
  node_modules/.bin/oxfmt --no-error-on-unmatched-pattern "$@" >/dev/null
  git add -- "$@"
fi
```

Every file whose whole change is staged is formatted and staged again,
however it was written. A file with unstaged changes is left to the check,
because staging it would commit work its author held back. That is the gap
that keeps this at level 2. The hook's comment records the cost before the
move: "nineteen archived friction lines record it".

**Proposed:** delete the edit-time writer,
`scripts/hooks/checks/format-write.core.ts`, and its registration. The commit
now formats every staged file, including those written by `sed` or a
heredoc, and only files inside the repository can be staged. Removing it
removes its "read it again before an exact-text replace" notice and makes
the out-of-repository defect impossible.

**Proof it can fail:** not replayed for this entry. Read from the hook's
code, an unformatted file whose whole change is staged is rewritten by
`oxfmt` and staged again before the check runs (inferred).

**Similar instances:** `grep -n -- "--check" .husky/pre-commit` lists the
other checks that only report. Lint stays a check on purpose, because its
autofix rewrites code, not layout.
