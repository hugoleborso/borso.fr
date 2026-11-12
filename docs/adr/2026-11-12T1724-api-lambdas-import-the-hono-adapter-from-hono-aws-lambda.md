# ADR-2026-11-12T1724: API Lambdas import the Hono adapter from `@hono/aws-lambda`

- **Status:** accepted
- **Date:** 2026-11-12
- **Deciders:** Hugo Borsoni
- **Tags:** dependabot-2026-11-12, app architecture

## Context

The operator asked to merge the open Dependabot pull requests on 2026-11-12. Two of them, the minor-and-patch group and the hono bump, failed the `build` check on `scripts/lint-repository.sh` (measured, CI jobs 130909802104 and 130880865295). hono 4.13.9 marks `handle`, `LambdaEvent` and `LambdaContext` in `hono/aws-lambda` as deprecated, with the notice "`hono/aws-lambda` will be removed in v5. Install `@hono/aws-lambda` and import from there instead" (read in `hono/dist/types/adapter/aws-lambda/handler.d.ts` and `types.d.ts`). The repository lint fails on a deprecated import. The four full-stack apps, pragma, talos, banana-rush and last-loop-lepin, each import `handle` from that subpath in `api/src/main.ts`. A new dependency is an ADR decision under CLAUDE.md.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | low | the Lambda handler must answer exactly as before | the API tests and the preview deploy |
| The upgrade path to hono 5 stays open | author | high | hono 5 deletes the subpath | the deprecation notice disappears from lint |
| Smallest dependency surface | author | medium | each dependency is a review and a bump | packages added to the catalog |

## Decision

**Import from `@hono/aws-lambda`.** The package is hono's own split of the removed subpath, at 1.0.1 with a peer range of `hono >=4.13.9 || ^5.0.0-0` (read with `npm view`). It exports the same `handle`, `LambdaEvent` and `LambdaContext`. Each app lists it through the workspace catalog.

## Consequences

- `+` The build check passes and the Dependabot batch lands.
- `+` hono 5 needs no change to the Lambda entry points.
- `-` One more catalog dependency that Dependabot will bump.
- `~` pragma's `main.test.ts` mocks the new module path.

## Alternatives considered

### Option A: `@hono/aws-lambda` (chosen)

- **Raised by:** author
- **Summary:** add the package and change the four imports and one mock.
- **Strengths:**
  - follows the vendor's own migration notice
  - survives hono 5
- **Costs:**
  - one dependency
- **Rationale:** the only option that keeps the upgrade path open without new code.

### Option B: silence the deprecation on each import (rejected)

- **Raised by:** author
- **Summary:** an `eslint-disable-next-line` on the four imports.
- **Strengths:** no new dependency.
- **Costs:** breaks at hono 5 and hides the reason.
- **Rejection rationale:** loses on the upgrade-path criterion at any weight.

### Option C: hold hono at 4.13.7 (rejected)

- **Raised by:** author
- **Summary:** ignore the hono bump in Dependabot.
- **Strengths:** no change.
- **Costs:** every later hono fix waits, and the minor-and-patch group keeps failing.
- **Rejection rationale:** blocks the batch the operator asked to merge.

## Scores

|             | Option A | Option B | Option C |
|---|---|---|---|
| Users see no change | ✓ same API | ✓ no code change | ✓ no code change |
| Upgrade path to hono 5 | ✓ peer range covers 5 | ✗ subpath deleted in 5 | ✗ pinned |
| Dependency surface | ✗ one package | ✓ none | ✓ none |

## Implementation pointers

- Spec: this ADR
- Files: `apps/pragma/api/src/main.ts:1`, `apps/talos/api/src/main.ts:2`, `apps/banana-rush/api/src/main.ts:2`, `apps/last-loop-lepin/api/src/main.ts:1`, `apps/pragma/api/src/main.test.ts:13`, `pnpm-workspace.yaml`
- Related ADRs: none
