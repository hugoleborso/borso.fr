---
summary: 'This repository formats with oxfmt (`pnpm format <files>`), and the prettier on the PATH is a global 3.8.1 that rewrites files oxfmt passes; the rewriter also mangles a `case … esac` in a loop, so put control flow in a file.'
triggers:
  commands:
    - '(^|[;&|(]\s*|\bexec\s+|\bnpx\s+|\bdlx\s+)prettier\b'
  output:
    - 'No parser could be inferred for file'
---

# Two tool shapes that break a one-off check

Both of these cost an agent time. Neither is a defect in this repository's
code; both are worth knowing before reaching for the obvious command.

## Prettier is on the PATH, but it is not this repository's formatter

The formatter is oxfmt, since
[ADR-0045](../adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md). Its
config is `.oxfmtrc.json`. The image still ships a global prettier
(`/opt/node22/bin/prettier`, 3.8.1), so `prettier --write` runs and rewrites
files oxfmt already accepts. On 2026-11-03 it reformatted unrelated files in
PR #251. Run against the leftover `.prettierrc.json`, it flagged 2 of the
oxfmt-clean files in `apps/pragma/site/src/components/organisms` (measured).
That config was deleted in PR #251's kaizen.

You rarely need a formatter at all. The PostToolUse hook
`posttool-format-write.sh` runs oxfmt on every file a Write or an Edit
touches. For a file written another way, run `pnpm format <files>`, or
`pnpm format:check` to check the tree.

oxfmt skips a `.sql` file in its argument list without an error (measured on
a migration), so the `No parser could be inferred` failure prettier raised on
a changed-file list is gone with it.

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
