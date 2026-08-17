# `pnpm exec prettier` and `node_modules/.bin/prettier` are not the same formatter

Observed 2026-08-15 in this repository.

`pnpm exec prettier --write <files>` reformatted at **80 columns**. The repo's
`.prettierrc` sets `printWidth: 100`, and `node_modules/.bin/prettier --write`
on the same files produced 100. Two spellings of "run the local prettier",
two different results.

The damage is not the columns. Running it over a set of files rewrote **eight
files nobody had touched**, because the pre-commit hook then saw them as
modified — and one of the rewrites unescaped a `—` inside
`apps/pragma/package.json`, which is a content change hiding inside a
formatting run.

**Use `node_modules/.bin/prettier`** for any manual formatting pass. The
pre-commit hook already does the right thing; this only bites when a human or
an agent formats by hand.

Cheap tell: if a `--write` touches files outside the ones you named, stop and
check `git diff` before staging anything.

## See also

- [`docs/dantotsus/the-formatter-was-a-detector-with-no-writer.md`](../dantotsus/the-formatter-was-a-detector-with-no-writer.md)
  — the formatter gate's own history in this repo.
