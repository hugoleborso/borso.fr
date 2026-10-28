---
summary: 'Without `--type-aware`, oxlint reports an `eslint-disable` naming a type-aware rule as unused, and a JS-plugin rule is named by its alias; lint with `--type-aware` before trusting either.'
triggers:
  output:
    - 'Unused eslint-disable directive'
  commands:
    - 'oxlint'
---

# oxlint without `--type-aware` reads a type-aware directive as unused

oxlint runs the type-aware rules, such as `typescript/no-floating-promises`,
only when it is given `--type-aware`. Without the flag those rules do not run,
so a `// eslint-disable-next-line typescript/no-misused-promises -- <reason>`
suppresses nothing, and oxlint reports it:

```
error: Unused eslint-disable directive (no problems were reported).
```

The directive is not stale. Lint the same file with `--type-aware` before
deleting it:

```bash
pnpm exec oxlint --type-aware <file>
```

This is why `.husky/pre-commit` lints the staged files with
`--report-unused-disable-directives-severity=off`, and the push hook and CI,
which pass `--type-aware`, are where an unused directive fails.

## A rule run through an alias is named by the alias

Four upstream ESLint plugins run as oxlint JavaScript plugins under aliases:
`unicorn-js`, `jsx-a11y-js`, `react-hooks-js` and `eslint-js`. A directive for
one of their rules has to use the alias, `jsx-a11y-js/no-autofocus`, because
`jsx-a11y/no-autofocus` names oxlint's native rule, which is a different rule
and is not on. See
[ADR-0045](../adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md) and the
alias table in [standard 12](../standards/12-linting-and-gates.md).
