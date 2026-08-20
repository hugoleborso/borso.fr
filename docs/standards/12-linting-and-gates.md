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
```

There is no per-application ESLint configuration. The flat config at the root
reaches every workspace, each application's `lint` script runs `eslint` from
the root against its own folder, and an application-specific exception is a
`files:` block in the root file — e.g. the one that lets `borsouvertures` say
`piece`. One file is the point: a rule cannot be quietly relaxed in a corner.

Every custom rule ships with a `RuleTester` suite, because a lint rule that
misfires costs more than the rule saves.

## What the shared configuration turns on

The configuration starts from `@eslint/js` recommended,
`typescript-eslint` strict and stylistic with type checking, the React hooks
plugin, the React refresh plugin, `eslint-plugin-import-x` for resolution and
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
| `borso/no-comments`                                    | [00](./00-principles.md)                                   |
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
| `borso/no-adapter-import-in-pure-module`               | [02](./02-purity-and-core-files.md)                        |
| `borso/no-outbound-call-outside-adapter`               | [06](./06-data-fetching.md), ADR-0012                      |
| `borso/test-file-has-sibling-source`                   | [10](./10-testing.md)                                      |
| `borso/no-cross-slice-repository-imports`              | [04](./04-backend-architecture.md)                         |
| `borso/no-raw-sql-outside-migrations`                  | [11](./11-database.md)                                     |
| `borso/no-server-state-in-use-state`                   | [06](./06-data-fetching.md)                                |
| `borso/no-flat-components-folder`                      | [05](./05-frontend-architecture.md)                        |
| `borso/no-dynamic-translation-keys`                    | [09](./09-i18n.md)                                         |
| `borso/no-string-concatenated-class-names`             | [08](./08-styling.md)                                      |
| `borso/no-use-effect`                                  | [07](./07-state-and-effects.md)                            |
| `borso/no-inline-subscribe-in-use-sync-external-store` | [07](./07-state-and-effects.md)                            |
| `borso/no-component-css-imports`                       | [08](./08-styling.md)                                      |
| `borso/no-literal-jsx-text`                            | [09](./09-i18n.md)                                         |
| `borso/no-abbreviated-identifier`                      | [01](./01-naming.md)                                       |
| `borso/function-names-are-verb-phrases`                | [01](./01-naming.md)                                       |
| `borso/verb-promises-match-return-type`                | [01](./01-naming.md)                                       |
| `borso/no-french-identifiers`                          | [01](./01-naming.md)                                       |
| `borso/no-step-named-value`                            | [01](./01-naming.md)                                       |
| `borso/no-discarded-await-before-navigation`           | a dantotsu, [06](./06-data-fetching.md)                    |
| `borso/no-circle-in-non-uniform-svg`                   | a dantotsu, kept from the Biome plugins                    |

Six of the rules above came across from the Biome grit plugins, which are
`no-type-assertion-except-unknown`, `no-controller-imports-outside-service`,
`no-direct-api-fetch-in-site`, `no-api-anchor-in-site`,
`no-inline-subscribe-in-use-sync-external-store`, and
`no-circle-in-non-uniform-svg`. Two of the six read the file name now, where
the grit versions had to infer the file's role from its import paths, so they
misfire less.

## Why the configuration is shaped the way it is

The shape of `eslint.config.js` is the result of measurements, not taste. The
numbers below are why a block is scoped, off, or written as an explicit list,
and each is the kind of thing a reader would otherwise re-derive by turning a
rule on and drowning.

### Unicorn is an explicit list, never the recommended set

Unicorn ships around a hundred rules in its recommended set, and most are style
choices with no standard behind them. Enabling the set wholesale produced
**2334 findings** here, the large majority of them renames that fight this
repository's own conventions — `Props` to `Properties`, `utils` to `utilities`.

So the enabled rules are listed one by one. Each either enforces a rule from
`docs/standards/`, or it catches a defect class rather than a preference.
**Adding a rule to that block means writing down which of the two it is.**

### Rules that are off, and what turning them on would have cost

- **`@typescript-eslint/require-array-sort-compare`** defaults to
  `ignoreStringArrays: true`. Every finding the rule produced here was a
  `string[]` where lexicographic order is the intended one, and adding
  `localeCompare` to satisfy it **would have changed migration file ordering**,
  because that collation gives `-` and `_` variable weight. The setting keeps
  the defect that matters: a bare `.sort()` on `number[]`.
- **`no-magic-numbers` is off in tests.** A test names its value in the `it`
  title and in the expectation beside it, so hoisting `42` to a constant moves
  the number away from the assertion that gives it meaning. There are around
  **fifteen hundred** such values across the repository.
- **`@typescript-eslint/require-await` is off in tests.** `await act(async () =>
  …)` takes React's asynchronous path only when the callback returns a promise,
  a `fetch` stub has to return one, and a Lambda handler fixture is async by its
  signature.
- **`no-param-reassign`** carries
  `ignorePropertyModificationsForRegex: ['Element$', 'Node$']`. A DOM node handed
  to a `querySelectorAll(...).forEach` callback has no caller to surprise, and
  writing `element.style.transform` is the whole of a canvas animation.

### Two file sets that need their own block

- **`**/*.code.js`** is CloudFront Function source. `no-unused-vars` runs there
  with `varsIgnorePattern: '^handler$'`, because `handler` looks unused —
  nothing in this repository calls it. The CloudFront Functions runtime does, by
  that exact name, and there is no import to make the reference visible. The
  same files stay on **ES5 syntax on purpose**, for the same runtime.
- **CDK entry points under `bin/`** are compiled by `tsconfig.cdk.json`, and the
  type-aware project service only ever looks for the nearest `tsconfig.json`, so
  it cannot see them. They are linted without type information rather than not
  at all.

### What the custom rules learned by being wrong first

Three rules report far less than their first version did, and the gap is the
point:

- **`borso/conditions-live-in-pure-functions`** used to report every syntactic
  branch, which produced roughly **nine hundred** findings, almost none of which
  named a decision.
- **`borso/pure-functions-live-in-core-files`** read the function's own body for
  a handful of markers, and so called roughly **a third** of what it reported
  pure when it was not.
- **`borso/no-query-hooks-outside-organisms`** matches `use…` bindings imported
  from `lib/queries/`, not a list of hook names: reading only the four known
  names **missed every violation this repository actually had**.

Two smaller determinations worth not re-deriving: `borso/no-components-outside-buckets`
treats the `Page` suffix as the discriminator for a route's own page because
**sixteen of the eighteen** router-rendered files carry it across all three
applications with a `routes/` folder (the two that do not are reported); and the
claim prefixes `borso/decisions` enforces are unicorn's
`consistent-boolean-name` set plus one addition, `show`.

`node:path` and `node:url` are deliberately absent from the impure module list:
they compute strings from strings.

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
files. It is the cheap hook: nothing in it reads the whole repository's tests.

Both eslint invocations, here and in CI, pass `--max-warnings 0`. Several rules
the standards lean on ship at `warn` from their plugin's recommended preset,
`react-hooks/exhaustive-deps` and `react-hooks/incompatible-library` among
them, and eslint exits 0 on a warning. Without the flag those rules print into
a log nobody reads and stop nothing, which makes them advice again.

It also runs the cheap whole-repository checks, each a git-index read plus a
grep, and each guarding a class no linter sees because the evidence lives in
two files at once:

| Script | Fails when |
|--------|------------|
| `check-single-stylesheet.sh` | an application ships a second `.css` file |
| `check-migration-sql-dsql-compat.sh` | a migration uses SQL Aurora DSQL rejects |
| `check-frontend-env-vars.sh` | a site reads a `VITE_*` variable no workflow sets, so the code behind it never runs |
| `check-pure-modules-have-callers.sh` | a `*.core.ts` or `*.utils.ts` is reached only from its own test, where coverage and mutation both score it at full marks while it runs nowhere |
| `check-non-module-scripts.sh` | an application's HTML carries a `<script src>` without `type="module"`, which ships un-bundled and 404s |
| `check-app-registration.sh` | a new application is missing its path filter or its commitlint scope, so it never deploys and nothing says so |
| `check-pwa-assets.sh` | a web app manifest names an icon that does not ship |
| `check-negative-claims-are-dated.sh` | a knowledge entry says a tool does not work and carries no date |

`check-frontend-env-vars.sh` and `check-pure-modules-have-callers.sh` each
carry an allowlist keyed by variable or by path, and every entry in one states
its reason. That is deliberate: both checks describe situations that can be
legitimate, and writing the reason down is what separates a decision from an
oversight.

The hook also greps the workflows for a `pnpm --filter <pkg> deploy` that
should have been `pnpm --filter <pkg> run deploy`, because seven script names
are pnpm built-ins and pnpm silently prefers its own.

The pre-push hook runs `knip` for dead code, `actionlint` for the workflows,
the tests each pushed commit affects, and the mutation tests for the pure files
those commits changed.

CI mirrors every one of the whole-repository checks above, so skipping a hook
delays the failure rather than removing it, and adds `tsc --noEmit`, the test
suites for each changed application, the coverage gate, and `cdk synth` for
every application. The synth is what covers `cdk/bin/*.ts`: the per-app stack
tests call `build<App>Stack()` directly, so a break in the entry point that
reads `STAGE` and names the stacks passes every other gate and surfaces in the
automatic production deploy after the merge.

## Suppressing a rule

Write `// eslint-disable-next-line <rule> -- <reason>` with a reason after the
two dashes, and the configuration rejects a disable comment that has no reason.

Never pass `--no-verify` to git. When a hook fails, fix what it found, because
in a repository where an agent writes most of the code, the gates are the
review.

## Enforced by

- `gate:eslint` runs over the staged files on commit and over the repository in
  CI, both with `--max-warnings 0`.
- `gate:prettier` runs over the staged files on commit and over the repository
  in CI.
- `gate:typecheck` runs `tsc --noEmit` in every workspace, and again over the
  tooling that belongs to none. `scripts/`, `.claude/skills/` and
  `eslint-rules/` are not workspaces, so `pnpm -r typecheck` never reached them
  and the root `tsconfig.json` is what does: every generator and every gate this
  repository runs on itself is checked by the same compiler as the applications.
  `tsx` strips types without reading them, so before this a name that no longer
  existed ran until the branch that reached it, and a return-type annotation
  naming a type nobody imported was invisible.
- `gate:eslint-rule-suites` runs the `RuleTester` suite every custom rule ships
  with, because a rule that misfires costs more than the rule saves.
- `gate:knip` fails on an unused file, export or dependency.
- `gate:actionlint` fails on a malformed workflow, which is where a
  `paths-filter` base misuse and a shell quoting bug both hid.
- `gate:commitlint` fails a message that is not a conventional commit or names
  a scope outside the enumeration.
- `eslint:@eslint-community/eslint-comments/require-description` rejects a
  disable comment with no reason after the two dashes. The short spelling
  `eslint-comments/require-description` is not the rule's identifier, and this
  document cited it for months.
- `script:scripts/check-coupled-lists.sh` fails when two copies of one list
  disagree — the architecture generator's trigger paths in the commit hook and
  in its workflow, and the gated file suffixes in `eslint-rules/impurity.js` and
  in every `vitest.config.ts`. Neither half is wrong on its own, which is why a
  reviewer reads past both.
- `script:scripts/check-dated-records-are-append-only.sh` fails a change that
  edits or deletes a file under `docs/**/validation/` or
  `docs/standards/reviews/`. Those are dated records of what a validator saw and
  what a reviewer cleared, and the date is in the file name, so a
  repository-wide rename reaching into one destroys the record rather than
  correcting it — which is how a `sed` across the tree silently rewrote a
  finding from months earlier. Adding a report is the point; changing one is
  not. It reads the index on commit and a branch range in CI, because a runner
  has nothing staged.
- `script:scripts/check-no-racy-pipelines.sh` fails a `set -o pipefail` script
  that pipes a directory walk into `head` or `grep -q`. The consumer closes the
  pipe first and the producer's write error fails the script, and whether that
  happens is timing — the instance it was written for passed five consecutive
  local runs and failed on the first CI run of the same commit.
- `script:scripts/check-hook-decisions.sh` fails a `PreToolUse` hook that decides
  against its own contract, feeding each one a command it must refuse and a
  mention of that command it must let through. Every one of these hooks answers
  the same question — invocation or mention? — and three have answered it
  wrongly, each after the last was fixed, because the hooks were part of the
  untested shell surface described in
  [`the-shell-gates-are-only-ever-run-where-they-pass`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md).
  They are the half of that surface a table can reach: a hook reads a command
  off stdin and answers with an exit code, so its inputs are strings rather
  than a repository.
- `script:scripts/check-frontend-env-vars.sh` fails a site reading a `VITE_*`
  variable no workflow sets, which Vite substitutes as `undefined` at build
  time while nothing else complains.
- `script:scripts/check-migration-sql-dsql-compat.sh` fails a migration using
  SQL that Aurora DSQL rejects, which no local Postgres run would catch.
- `script:scripts/check-non-module-scripts.sh` fails an application's HTML
  carrying a `<script src>` without `type="module"`, which ships un-bundled and
  404s.
- `script:scripts/check-no-null-bytes.sh` fails a tracked text file carrying a
  NUL byte. A NUL is legal inside a string, renders as nothing in an editor,
  shows as unchanged whitespace in a diff, and passes ESLint, Prettier and
  `tsc`; it surfaces much later as an `execFileSync` refusing an argument or a
  separator that silently stopped matching.
- `generator:scripts/standards/rule-provenance.ts` records which rules were
  written because a defect actually happened, by reading the eradication section
  of every dantotsu, and which were written from principle. It gates nothing:
  the ratio is an input to the decision about the next rule, and several of the
  best rules here were written before anything went wrong.
- `script:scripts/check-app-registration.sh` fails a directory under `apps/`
  that has no `.github/path-filters.yml` filter or no commitlint scope, and a
  filter naming an application that is not there. Both failures are silent
  otherwise: the application simply never gets a preview deploy, and no
  workflow reports it.
- `reviewer` checks that the reason on a disable comment is a claim about that
  line which a reader can check, and not "pre-existing" or "will fix later".
