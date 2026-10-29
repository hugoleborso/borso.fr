# ADR-0046: TypeScript 7 replaces TypeScript 5.9

- **Status:** accepted
- **Date:** 2026-10-27
- **Deciders:** Hugo Borsoni
- **Tags:** meta, tooling, gates

## Context

The type checks are gates: one per application on push and in CI, and one over
the repository's own tooling, which belongs to no workspace. With TypeScript
5.9, pragma's took 32 s and the tooling's 6.6 s, so the tooling check had left
the commit for the push to meet [standard 14](../standards/14-tool-runtime-budgets.md).

TypeScript 7 is the compiler rewritten in Go, released as `typescript@7.0.2`.
Its `tsc` reads the same `tsconfig.json` files and emits the same output. Its
package has no stable JavaScript API: it ships an unstable API under
`typescript/unstable/*` that talks to a compiler process over a project, and
no function that parses one file on its own.

A first version of this decision kept 5.9 beside 7, as the npm alias
`typescript-native`, on the belief that `infra/cdk` had to keep emitting its
`dist/` with 5.9. That was wrong: compiled with 7, `infra/cdk`'s `dist/`
differs only in the quote style of one declaration file,
`internal/shared-ssm.d.ts`. What did import 5.9 was four things:

- `scripts/architecture/architecture-model.ts`, which walks every application's
  syntax trees with the 5.9 compiler API;
- the `RuleTester` suites in `eslint-rules/`, which parsed TypeScript with
  `@typescript-eslint/parser`;
- commitlint's TypeScript configuration loader, an optional peer it needs only
  for a `.ts` configuration;
- react-i18next's optional peer, which needs nothing installed.

## Decision

**`typescript` is 7.0.2, under its own name, and is the only TypeScript in the
repository.** Every `typecheck` script and the `typecheck-tooling` check call a
plain `tsc`, and `infra/cdk` builds its `dist/` with it. The four dependants
moved as follows:

- **The architecture model parses with `oxc-parser`.** It was already in the
  dependency tree at 0.152.0, through `@sentry/bundler-plugins` (and knip at
  0.147.0), so declaring it adds no package to the lockfile. `syntax-tree.ts`
  gives the model the few things it took from the compiler API: children in
  source order from oxc's `visitorKeys`, a parent map, and line numbers. The
  six generated `*-architecture.json` models are byte-identical before and
  after the port.
- **The `RuleTester` suites run on oxlint's `RuleTester`**
  (`oxlint/plugins-dev`), which parses with oxc, the same parser the rules meet
  in the real linter. Three suites also checked that a disable comment
  silences their rule. oxlint's `RuleTester` does not apply disable comments,
  so those cases moved to `eslint-rules/disable-directives.test.js`, which
  plants a bare and a disabled file for each of the three rules and runs the
  real oxlint over them once. `typescript-eslint` is removed.
- **commitlint needs nothing.** `commitlint.config.js` is JavaScript, so its
  TypeScript loader is never called; the `commit-msg` hook still refuses a
  message without a type and a message with an unknown scope.
- **react-i18next's peer** asks for `typescript@^5`. It is optional, so it
  stays unmet, and every application that uses react-i18next type-checks
  clean with 7.

ESLint itself stays installed. `eslint-js` loads two of its core rule files,
`no-octal` and `no-dupe-args`, which oxlint does not implement, and the
upstream plugins oxlint loads as JavaScript plugins (`eslint-plugin-unicorn`,
`eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`) declare it as a peer.

## Consequences

- `+` pragma's type check measured 9.7 s against 32 s, the tooling check 1.2 s
  against 6.6 s, and every workspace type-checks with no new error.
- `+` The tooling check is back on the commit.
- `+` One compiler: a file cannot pass one gate and fail another because two
  versions disagree on it.
- `-` The architecture model depends on oxc's syntax tree, whose node names
  differ from the compiler's. A change to the model now reads ESTree, and an
  oxc-parser release that renames a node changes the model; the generator's
  `--check` would show it on the next run.
- `-` The `RuleTester` no longer exercises disable comments. The directive
  cases run against the real linter instead, which is slower per case and
  needs the planted files to sit where the configuration turns each rule on.
- `~` react-i18next prints an unmet-peer warning on install.

## Alternatives considered

### Option A — TypeScript 7 only, the dependants ported (chosen)

- **Summary:** as in the decision.
- **Strengths:** one compiler, the faster checks, no new package.
- **Costs:** the model and the rule suites were rewritten.
- **Rationale:** the only option that removes the second compiler.

### Option B — TypeScript 7 for the checks, 5.9 beside it for the API (rejected)

- **Summary:** the first version of this decision: 7 as the alias
  `typescript-native`, 5.9 kept as `typescript`.
- **Strengths:** no tool had to change.
- **Costs:** two compilers to keep in step, and a `tsc` binary whose version
  depended on which package pnpm linked last.
- **Rejection rationale:** it rested on a wrong claim about `infra/cdk`, and
  the four dependants were cheap to move.

### Option C — the TypeScript 7 unstable API for the model (rejected)

- **Summary:** walk the syntax trees through `typescript/unstable/sync`.
- **Strengths:** the same compiler for the model and the checks.
- **Costs:** an API marked unstable, driven through a project and a compiler
  process rather than a parse of one file.
- **Rejection rationale:** the model needs syntax only, and a parser already
  in the tree gives it without the instability.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Fits the runtime budgets | high | Standard 14 |
| Same outputs | high | The model and the `dist/` are what other gates read |
| No new package | medium | A new dependency is an ADR trigger of its own |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Fits the runtime budgets | ✓ | ✓ | ✓ |
| Same outputs | ✓ model byte-identical, `dist/` one quote style | ✓ | ? not measured |
| No new package | ✓ oxc-parser was already in the lockfile | ✗ a second compiler | ✓ |

## Implementation pointers

- Files: `pnpm-workspace.yaml` (`typescript: '7.0.2'`), each workspace's
  `typecheck` script, `.husky/pre-commit` (`typecheck-tooling`),
  `scripts/architecture/syntax-tree.ts`,
  `scripts/architecture/architecture-model.ts`, `eslint-rules/rule-tester.js`,
  `eslint-rules/disable-directives.test.js`
- Related ADRs: ADR-0045, whose tsgolint builds its programs with the same
  compiler
- Commit: stamped on merge
