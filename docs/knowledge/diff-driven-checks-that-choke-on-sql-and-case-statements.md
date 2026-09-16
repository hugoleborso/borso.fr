# Two tool shapes that break a diff-driven check

Both of these cost a validator time in one task. Neither is a defect in this
repository; both are worth knowing before reaching for the obvious command.

## `prettier --check` on a changed-file list dies on `.sql`

A check built from `git diff --name-only` and piped into prettier fails as
soon as the change includes a migration:

```
[error] No parser could be inferred for file: apps/pragma/api/src/database/migrations/0009_bar_owner.sql
```

Prettier treats an unknown extension as an error, not as a file to skip. The
pre-commit hook does not hit this because it filters the staged list by
extension first; a validator or a one-off script that feeds prettier the raw
diff does.

Filter before you pipe:

```sh
git diff --name-only --diff-filter=d origin/main...HEAD \
  | grep -vE '\.(sql|snap)$' \
  | xargs -r node_modules/.bin/prettier --check
```

Use `node_modules/.bin/prettier` rather than `pnpm exec prettier` — the agent
harness rewrites the latter to a different version, which
`scripts/check-coupled-lists.sh` refuses for that reason.

## The harness rewriter mangles `case … esac` inside a loop

A bash `case` statement written inside a `for` loop, passed through the
PreToolUse rewriter, came back as a syntax error. The rewriter is a token
transformation, and `;;` inside a compound command is not something it always
survives.

Two ways around it, both cheap: write the branch as `if` / `elif`, or put the
script in a file and run the file. A script on disk is passed through
untouched, which is a good reason to prefer one for anything with real
control flow — and it is reviewable, unlike a one-liner.

## See also

- [`../dantotsus/the-formatter-the-repository-told-me-to-run-was-not-its-own.md`](../dantotsus/the-formatter-the-repository-told-me-to-run-was-not-its-own.md) — where the prettier-invocation rule comes from.
- [`../dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md`](../dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md) — another shell shape that silently changed meaning.
