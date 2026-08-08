# 12. Lint and gates

## Rule

ESLint is the only linter in this repository, Prettier is the only formatter,
and every rule in the standards has an enforcement here or an explicit note
saying a reviewer checks it instead.

## Reason

A rule with no gate is advice, and advice erodes. The standards in this folder
therefore end with an "enforced by" section, and the present document is where
the enforcement lives.

ESLint replaced Biome because the custom rules the standards need go beyond
what Biome's plugin system can express. Biome plugins are GritQL patterns,
which match syntax and cannot follow a scope chain or read a type, so a rule
like "this function is pure" cannot be written as one. ESLint rules are
JavaScript with access to the scope manager and, through
`@typescript-eslint`, to the type checker.

## Layout

The configuration is a flat config at the repository root, and each workspace
extends it.

```
eslint.config.js              the shared configuration
eslint-rules/                 the custom rules, one file each
  index.js                    the plugin object
  <rule-name>.js
  <rule-name>.test.js         a RuleTester suite per rule
apps/<app>/eslint.config.js   extends the root, adds app specific overrides
```

Every custom rule ships with a `RuleTester` suite, because a lint rule that
misfires costs more than the rule saves.

## What the shared configuration turns on

The configuration starts from `@eslint/js` recommended,
`typescript-eslint` strict and stylistic with type checking, the React hooks
plugin, the React refresh plugin, `eslint-plugin-import` for resolution and
cycle detection, `eslint-plugin-unicorn` for the naming and correctness rules,
`eslint-plugin-vitest` on test files, and `eslint-plugin-jsx-a11y` on the front
ends.

It then adds the `borso` plugin, which holds every custom rule the standards
name.

Type-aware rules need a `project` setting, which makes them slower than the
syntactic rules, so `eslint --cache` is on and the cache file is ignored by
git.

## The custom rules

| Rule                                                   | Standard                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `borso/conditions-live-in-pure-functions`              | [02](./02-purity-and-core-files.md)                        |
| `borso/pure-functions-live-in-core-files`              | [02](./02-purity-and-core-files.md)                        |
| `borso/no-impure-calls-in-core-files`                  | [02](./02-purity-and-core-files.md)                        |
| `borso/no-type-assertion-except-unknown`               | [03](./03-typing.md)                                       |
| `borso/no-controller-imports-outside-service`          | [04](./04-backend-architecture.md)                         |
| `borso/no-array-methods-in-controllers`                | [04](./04-backend-architecture.md)                         |
| `borso/no-database-client-outside-repository`          | [04](./04-backend-architecture.md), [11](./11-database.md) |
| `borso/atomic-design-import-direction`                 | [05](./05-frontend-architecture.md)                        |
| `borso/no-query-hooks-outside-organisms`               | [05](./05-frontend-architecture.md)                        |
| `borso/no-direct-api-fetch-in-site`                    | [06](./06-data-fetching.md)                                |
| `borso/no-api-anchor-in-site`                          | [06](./06-data-fetching.md)                                |
| `borso/no-use-effect`                                  | [07](./07-state-and-effects.md)                            |
| `borso/no-inline-subscribe-in-use-sync-external-store` | [07](./07-state-and-effects.md)                            |
| `borso/no-component-css-imports`                       | [08](./08-styling.md)                                      |
| `borso/no-literal-jsx-text`                            | [09](./09-i18n.md)                                         |
| `borso/no-abbreviated-identifier`                      | [01](./01-naming.md)                                       |
| `borso/function-names-are-verb-phrases`                | [01](./01-naming.md)                                       |
| `borso/no-french-identifiers`                          | [01](./01-naming.md)                                       |
| `borso/no-circle-in-non-uniform-svg`                   | a dantotsu, kept from the Biome plugins                    |

Six of the rules above came across from the Biome grit plugins, which are
`no-type-assertion-except-unknown`, `no-controller-imports-outside-service`,
`no-direct-api-fetch-in-site`, `no-api-anchor-in-site`,
`no-inline-subscribe-in-use-sync-external-store`, and
`no-circle-in-non-uniform-svg`. Two of the six read the file name now, where
the grit versions had to infer the file's role from its import paths, so they
misfire less.

## The suppressions inventory

`eslint-suppressions.json` at the repository root holds every violation that
existed when a rule was turned on. ESLint reads the file, so a suppressed
violation does not fail the build, and a new violation of the same rule in the
same file does.

The file exists so a rule can be set to error on the day it is written, rather
than waiting until every old violation is fixed. Every entry is a line of debt
with a rule name and a count, so you can see what is left and pick something
off.

To see what is outstanding:

```bash
pnpm exec eslint . --no-warn-ignored   # green, because suppressions apply
node -e "const s=require('./eslint-suppressions.json');
  const byRule={};
  for (const file of Object.values(s))
    for (const [rule, entry] of Object.entries(file))
      byRule[rule] = (byRule[rule] ?? 0) + entry.count;
  console.log(byRule);"
```

After fixing some of them, run `pnpm exec eslint . --prune-suppressions` to
drop the entries that are no longer needed, and commit the smaller file.

Never add to the file by hand, and never run `--suppress-all` to make a new
violation go away. The file grows only when a new rule is switched on, and a
commit that grows it without adding a rule is a commit that hid a defect.

## The gates, in the order they run

The pre-commit hook runs `eslint --cache` and `prettier --check` on the staged
files, and it runs the coverage suite for `infra/cdk` or `infra/shared` when
either one changed.

The pre-push hook runs `knip` for dead code, `actionlint` for the workflows,
the mutation tests for the workspaces whose pure files changed, the check for
non-module script tags, and the check for pnpm reserved script names in the
workflows.

CI runs the same checks on every workspace the change touched, plus
`tsc --noEmit`, the full test suites, and a CDK synth.

## Suppressing a rule

Write `// eslint-disable-next-line <rule> -- <reason>` with a reason after the
two dashes, and the configuration rejects a disable comment that has no reason.

Never pass `--no-verify` to git. When a hook fails, fix what it found, because
in a repository where an agent writes most of the code, the gates are the
review.

## Enforced by

- The pre-commit, commit-msg, and pre-push hooks in `.husky/`.
- `.github/workflows/ci.yml`.
- `eslint-comments/require-description`, which rejects a disable comment with
  no reason.
