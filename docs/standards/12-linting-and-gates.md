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
| `borso/atomic-design-composition`                      | [05](./05-frontend-architecture.md)                        |
| `borso/atomic-design-import-direction`                 | [05](./05-frontend-architecture.md)                        |
| `borso/no-query-hooks-outside-organisms`               | [05](./05-frontend-architecture.md)                        |
| `borso/no-direct-api-fetch-in-site`                    | [06](./06-data-fetching.md)                                |
| `borso/no-api-anchor-in-site`                          | [06](./06-data-fetching.md)                                |
| `borso/no-vendor-sdk-outside-adapter`                  | [06](./06-data-fetching.md)                                |
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

## Exceptions live next to the line, never in a list

An exception to a rule is a claim about one line of code. It is written on that
line, in a comment, with the reason:

```ts
// eslint-disable-next-line borso/no-use-effect -- synchronises React with the ogl WebGL renderer, which owns its own canvas, resize listener and animation frame lifecycle
useEffect(() => { … });
```

Three settings make the shape hold, and all three are in `eslint.config.js`:

| Setting | What it rejects |
|---------|-----------------|
| `eslint-comments/require-description` | a disable with no `-- <reason>` |
| `linterOptions.reportUnusedDisableDirectives` | a disable that no longer suppresses anything |
| `eslint-comments/no-unlimited-disable` | a blanket `/* eslint-disable */` for a file |

The second one is the important one. When the underlying violation is fixed, the
comment becomes an error, so the excuse cannot outlive the problem. Nothing has
to be swept.

### What a reason has to be

A claim a reviewer can check, about this line. Write what is true about the
code.

```ts
// Good.
// eslint-disable-next-line @typescript-eslint/no-deprecated -- drizzle's callback form of pgTable cannot express a composite primary key, which DSQL requires here

// Bad. None of these is checkable.
// eslint-disable-next-line some/rule -- pre-existing
// eslint-disable-next-line some/rule -- will fix later
// eslint-disable-next-line some/rule -- this is fine
```

If the honest reason is that the fix is out of scope, say so and say what the
fix is: `-- splitting this controller needs the media domain extracted first,
which is a separate change`.

### Reach for a disable third, not first

1. **Fix the code.** This is the outcome for most findings.
2. **Scope the rule in `eslint.config.js`** if its stated reason does not hold
   for a whole class of file, with a comment saying why. `no-dynamic-delete`
   fires only on `delete process.env[NAME]` in tests, and `process.env` is not
   ours to redesign, so it is off for test files rather than disabled at
   fourteen call sites.
3. **Then a disable comment.** One line, one reason.

A disable that repeats itself across many files is a scoping decision wearing a
disguise. Move it to the config.

### What this replaced

Until this branch, the repository carried `eslint-suppressions.json`, a
path-keyed file holding every violation that existed when a rule was turned on.
It let a rule ship at `error` on the day it was written, which was the point,
and 1,631 entries went in on day one.

It was removed because it carried no reasons. An entry could be deliberate or it
could be debt and the file could not tell you which, so nobody read it and it
went stale in silence. The counts also flattered the code: two thirds of the
final inventory turned out to be a rule misfiring rather than a defect, and the
file made that indistinguishable from real debt.

The blueprint for the replacement shape is annotated at
`apps/borso-fr/site/components/organisms/Galaxy.tsx`.

## The gates, in the order they run

The pre-commit hook runs `eslint --cache` and `prettier --check` on the staged
files, and it runs the coverage suite for `infra/cdk` or `infra/shared` when
either one changed.

It also runs the cheap whole-repository checks, each a git-index read plus a
grep, and each guarding a class no linter sees because the evidence lives in
two files at once:

| Script | Fails when |
|--------|------------|
| `check-single-stylesheet.sh` | an application ships a second `.css` file |
| `check-migration-sql-dsql-compat.sh` | a migration uses SQL Aurora DSQL rejects |
| `check-frontend-env-vars.sh` | a site reads a `VITE_*` variable no workflow sets, so the code behind it never runs |
| `check-pure-modules-have-callers.sh` | a `*.core.ts` or `*.utils.ts` is reached only from its own test, where coverage and mutation both score it at full marks while it runs nowhere |

The last two carry an allowlist keyed by variable or by path, and every entry
in one states its reason. That is deliberate: both checks describe situations
that can be legitimate, and writing the reason down is what separates a
decision from an oversight.

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
