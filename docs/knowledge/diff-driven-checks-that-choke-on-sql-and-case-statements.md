---
summary: 'oxfmt, not prettier, formats this repository and skips a `.sql` in a changed-file list; the rewriter mangles a `case … esac` in a loop, so put control flow in a file.'
triggers:
  output:
    - 'No parser could be inferred for file'
---

# Two tool shapes that break a one-off check

Both of these cost an agent time. Neither is a defect in this repository's
code; both are worth knowing before reaching for the obvious command.

## A changed-file list for the formatter

The formatter is oxfmt, since
[ADR-0045](../adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md), and
`pretool-no-prettier.sh` refuses a prettier run
([prettier ran in an oxfmt repository](../dantotsus/prettier-ran-in-an-oxfmt-repository.md)).
Feed a changed-file list to `pnpm format:check` or `node_modules/.bin/oxfmt
--check`. oxfmt skips a `.sql` file in its arguments without an error
(measured on a migration), so the `No parser could be inferred` failure
prettier raised on the same list does not happen.

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

- [`../dantotsus/the-formatter-the-repository-told-me-to-run-was-not-its-own.md`](../dantotsus/the-formatter-the-repository-told-me-to-run-was-not-its-own.md) — the first time a prettier run disagreed with the pinned formatter.
- [`../dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md`](../dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md) — another shell shape that silently changed meaning.
