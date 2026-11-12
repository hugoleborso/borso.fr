# ADR-2026-11-12T1838: The monorepo runs on Node 24 locally, in CI and in every Lambda

- **Status:** proposed
- **Date:** 2026-11-12
- **Deciders:** Hugo Borsoni
- **Tags:** meta, cdk, tooling

## Context

The monorepo pins Node 22 in four places. `.nvmrc` holds `22.23.4`, and every workflow reads it through `node-version-file: .nvmrc`. The root `package.json` declares `engines.node: ">=22"`. The `pnpm-workspace.yaml` catalog pins `@types/node` to `^22.10.5`. Every Lambda that `infra/cdk` and `apps/talos/cdk` build runs `Runtime.NODEJS_22_X` with an esbuild target of `node22`. `docs/local-dev.md` says `.nvmrc` exists for Lambda runtime parity, so the local version and the Lambda version move together or the rule breaks. Node 22 reaches end of life on 2027-04-30, and Node 24 on 2028-04-30 (measured, `nodejs/Release` `schedule.json`). Node 26 became Active LTS on 2026-10-28, but `aws-cdk-lib` 2.276.0, the latest published version, exposes no `NODEJS_26_X` (measured, `aws-lambda/lib/runtime.d.ts`). `infra/shared` already runs one `nodejs24.x` function, the default of a CDK custom resource (measured, `borso-shared.template.json`). The operator approved the move to Node 24 on 2026-11-12, as a pull request separate from the docs work in hugoleborso/borso.fr#318.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | low | every app must answer exactly as before | the core suites of every app under Node 24, and each preview the pull request deploys |
| One pull request whose previews are validated before merge | operator | high | the merge redeploys every full-stack app to prod in parallel | the previews of pragma, last-loop-lepin, banana-rush and the static sites |
| Local and Lambda run the same major | author | high | `docs/local-dev.md` makes `.nvmrc` the Lambda parity pin | `.nvmrc` against `HANDLER_RUNTIME` in `lambda-api.ts` |
| Support window left | author | medium | each runtime move redeploys every app, so fewer is better | end-of-life dates in `nodejs/Release` `schedule.json` |
| Available to CDK today | author | high | a runtime CDK does not name cannot be deployed through the shared constructs | the `Runtime` static members of the installed `aws-cdk-lib` |

## Decision

**Node 24 everywhere, in one pull request.** `.nvmrc` moves to `24.22.3`, `engines.node` to `>=24`, the `@types/node` catalog to `^24.19.2`, and every Lambda to `Runtime.NODEJS_24_X` with the esbuild target `node24`. It is the newest runtime CDK can deploy, it buys a year more support than Node 22, and it keeps local, CI and Lambda on one major.

## Consequences

- `+` local, CI and Lambda run the same major, so the parity rule in `docs/local-dev.md` holds.
- `+` the runtime is supported until 2028-04-30 instead of 2027-04-30.
- `-` the merge redeploys every full-stack app to prod at once with a new runtime, so a runtime regression reaches every API together.
- `-` Node 24 entered maintenance on 2026-10-20, so a move to Node 26 follows once CDK names `NODEJS_26_X`, with another redeploy of every Lambda.
- `~` `@types/node` 24 types the Node 24 API, so code can now call APIs that Node 22 lacked. Nothing in the repository still runs Node 22.

## Alternatives considered

### Option A — Node 24 everywhere, in one pull request (chosen)

- **Raised by:** operator
- **Summary:** bump `.nvmrc`, `engines`, the `@types/node` catalog, every Lambda runtime and every esbuild target together.
- **Strengths:**
  - one set of previews validates the whole move.
  - parity between local and Lambda holds.
- **Costs:**
  - every full-stack app redeploys to prod at merge.
- **Rationale:** it meets every high criterion. Every installed package's `engines` accepts 24.22.3, and every core suite plus `infra/cdk` at 100% coverage pass under it (measured).

### Option B — Stay on Node 22 (rejected)

- **Raised by:** author
- **Summary:** change nothing. The apps keep working until Node 22 reaches end of life on 2027-04-30.
- **Strengths:** no redeploy, no risk today.
- **Costs:** the same move, under a deadline, within six months.
- **Rejection rationale:** loses on support window. The operator already chose to move.

### Option C — Node 24 in the Lambdas only (rejected)

- **Raised by:** author
- **Summary:** move the Lambda runtimes and leave `.nvmrc` and CI on Node 22.
- **Strengths:** a smaller diff.
- **Costs:** tests run on a different major from production.
- **Rejection rationale:** loses on parity, the reason `.nvmrc` exists.

### Option D — Node 26 everywhere (rejected)

- **Raised by:** author
- **Summary:** skip to the current Active LTS.
- **Strengths:** support until 2029-04-30.
- **Costs:** a runtime string CDK does not name, outside the shared constructs' types.
- **Rejection rationale:** loses on availability. `aws-cdk-lib` 2.276.0 has no `NODEJS_26_X`. It wins once CDK ships it.

## Scores

|   | A, Node 24 everywhere | B, stay on 22 | C, Lambdas only | D, Node 26 |
|---|---|---|---|---|
| Does it change the app for its users | ✓ every suite passes | ✓ nothing moves | ✓ every suite passes | ✗ not testable on a Lambda runtime CDK lacks |
| One pull request, previews validated | ✓ one PR | ✓ no PR needed | ✓ one PR | ✗ cannot deploy a preview |
| Local and Lambda on one major | ✓ both 24 | ✓ both 22 | ✗ 22 locally, 24 in Lambda | ✗ no Lambda runtime |
| Support window left | ✓ until 2028-04-30 | ✗ until 2027-04-30 | ✓ until 2028-04-30 | ✓ until 2029-04-30 |
| Available to CDK today | ✓ `NODEJS_24_X` | ✓ `NODEJS_22_X` | ✓ `NODEJS_24_X` | ✗ absent |

## Implementation pointers

- Spec: none, a toolchain bump the operator approved on 2026-11-12
- Plan: none
- Commit: stamped by /after-task-kaizen on merge
- Files: `.nvmrc`, `package.json`, `pnpm-workspace.yaml`, `infra/cdk/src/constructs/lambda-api.ts` (`HANDLER_RUNTIME`), `infra/cdk/src/internal/handler-bundle.utils.ts`, `infra/cdk/src/internal/origin-verify.ts`, `infra/cdk/src/constructs/{dsql-agent-reader,dsql-schema,web-socket-channel}.ts`, `apps/talos/cdk/lib/constructs/{export-job,restore-drill}.ts`
- Related ADRs: ADR-2026-11-12T0008 (the bundle step whose target moves)
