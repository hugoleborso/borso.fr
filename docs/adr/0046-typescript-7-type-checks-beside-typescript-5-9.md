# ADR-0046: TypeScript 7 runs the type checks, TypeScript 5.9 stays for the JavaScript API

- **Status:** proposed
- **Date:** 2026-10-27
- **Deciders:** Hugo Borsoni
- **Tags:** meta, tooling, gates

## Context

The type checks are gates: one per application on push and in CI, and one over
the repository's own tooling, which belongs to no workspace. With TypeScript
5.9, pragma's took 32 s and the tooling's 6.6 s, so the tooling check had left
the commit for the push to meet [standard 14](../standards/14-tool-runtime-budgets.md).

TypeScript 7 is the compiler rewritten in Go. Its `tsc` reads the same
`tsconfig.json` files. It does not offer the JavaScript API that tsx, knip,
`typescript-eslint` and several generators under `scripts/` import, and
`infra/cdk` emits its `dist/` with `tsc`.

## Decision

**Install TypeScript 7 beside 5.9, as the npm alias `typescript-native`, and
point every type-check script at it.** The applications, `infra/shared` and the
root `typecheck` scripts call `node node_modules/typescript-native/bin/tsc`.
`typescript` stays at 5.9 for everything that imports it, and `infra/cdk` keeps
building and type-checking with it, so the published `dist/` is unchanged.

## Consequences

- `+` pragma's type check measured 9.7 s against 32 s, the tooling check 1.2 s
  against 6.6 s, and every workspace type-checks with no new error.
- `+` The tooling check is back on the commit.
- `-` Two compilers can disagree on a file. Each gate runs one of them, so a
  disagreement shows up as one gate failing where the other passes.
- `-` The alias shadows the `tsc` binary: pnpm links the higher version when
  two packages name the same binary, so in every workspace that declares
  both, a bare `tsc` is TypeScript 7. The scripts name the path to make that
  visible, and `infra/cdk` does not declare the alias, so its `tsc` stays 5.9.
- `~` TypeScript 7 was released as `typescript@7.0.2`; the npm alias is how one
  package name holds two majors.

## Alternatives considered

### Option A — TypeScript 7 for the checks, 5.9 for the API (chosen)

- **Summary:** as in the decision.
- **Strengths:** a three- to five-fold faster check with no change to any tool
  that imports TypeScript.
- **Costs:** one more dependency, two compiler versions to keep in step.
- **Rationale:** the only option that speeds up the checks without touching
  the tools that need the JavaScript API.

### Option B — `@typescript/native-preview` (rejected)

- **Summary:** the preview package that ships the same compiler as `tsgo`.
- **Strengths:** a binary name that does not shadow `tsc`.
- **Costs:** its last release is a July 2026 development build; TypeScript 7.0.2
  is the stable release of the same compiler.
- **Rejection rationale:** a stale preview build of a compiler that is now
  released; the binary name is not worth that.

### Option C — stay on TypeScript 5.9 (rejected)

- **Summary:** keep one compiler.
- **Strengths:** no new dependency.
- **Costs:** the tooling check stays off the commit, and pragma's check stays
  past half the push budget.
- **Rejection rationale:** fails the runtime budget the checks are held to.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Fits the runtime budgets | high | Standard 14 |
| Tools importing TypeScript keep working | high | tsx, knip, the RuleTester and the generators |
| Same diagnostics | high | A gate that changes its verdicts is a different gate |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Fits the runtime budgets | ✓ | ✓ | ✗ |
| Tools importing TypeScript keep working | ✓ | ✓ | ✓ |
| Same diagnostics | ✓ none new on any workspace | ✓ | ✓ |

## Implementation pointers

- Files: `pnpm-workspace.yaml` (`typescript-native`), each application's
  `package.json` `typecheck` script, `.husky/pre-commit` (`typecheck-tooling`)
- Related ADRs: ADR-0045, whose tsgolint builds its programs with the same
  compiler
- Commit: stamped on merge
