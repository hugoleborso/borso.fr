# borso.fr monorepo — agent guide

One developer. pnpm workspaces. Node 22. AWS eu-west-3 (+ us-east-1 for ACM).

For any "how does X actually work" question, [`docs/`](./docs/) is the source of truth.

## Layout

- `apps/<slug>/` — one folder per app. Standalone-openable: `cd apps/<x> && pnpm dev` works on a fresh checkout. **No cross-app imports.**
- `infra/cdk/` — `@borso/infra`, the CDK constructs (StaticSite, LambdaApi, DsqlSchema, PreviewableApp). **100% test coverage gated.**
- `infra/shared/` — `@borso/shared-infra`, account-level singletons (certs, OIDC, DSQL cluster, previews CDN, deploy roles).

## Conventions

- **pnpm always** — no `npm` / `yarn`. Lockfile is committed.
- **Conventional commits**, scope-enum: `borso-fr`, `borsouvertures`, `infra`, `ci`, `docs`, `deps`. Husky enforces.
- **Biome** rules live in the root `biome.jsonc` and reach every workspace. Per-app configs extend root and set `"root": false`.
- **Stage** type is `'dev' | 'preview' | 'integ' | 'prod'`. `'dev'` is an app-code marker; constructs reject it via `assertDeployStage`.

## Clean code

- **Names carry the intent.** No one-letter locals (`h`, `c`, `x`) outside trivial scopes like `for (let i = 0; ...)`. Prefer `accumulator`, `candidate`, `entry`. Function names should describe the result, not the mechanism (`digestMigrations`, not `hashMigrations`).
- **Magic numbers and strings get names.** A bare `31` or `'\n---\n'` inside a function body becomes a named const. Same file is fine; the const declaration documents the choice.
- **Comments are for the WHY, not the WHAT.** Default to none. Only write a comment for: a non-obvious infra constraint (CloudFront Functions runtime, CFN intrinsics, advisory locks), a workaround for a third-party bug, or behavior a future reader would otherwise misread. Don't restate what the code does.
- **JSDoc is allowed on shared / exported functions.** Use it to document the contract (inputs, return value, surprising edge cases) and any cross-cutting notes (e.g. "called by the CFN custom resource provider"). Don't JSDoc internals just because.
- **Type assertions are restricted.** Only `as unknown` (single step, e.g. for JSON-parsing escape hatches) and `as const` (literal narrowing) are allowed. `as Foo` and `as unknown as Foo` are both banned by the `no-type-assertion-except-unknown` Biome plugin — chained casts are a type assertion in disguise. If you need a narrower type after `as unknown`, use a TypeScript type guard (`x is Foo`) or parse with a Zod schema. `as any` is hard-banned via `noExplicitAny`.

## Hooks

**Never `--no-verify`.** If a hook fails, fix the underlying problem and re-commit. Bypassing the hook silently lands broken code in main; in an AI-driven repo the gates are the safety net.

- **SessionStart** → `scripts/install-repo-deps.sh` (rtk + pnpm deps; AWS CLI v2 installed conditionally when `AWS_ACCESS_KEY_ID` is set).
- **PreToolUse(Bash)** → rtk rewrites commands for token savings.
- **pre-commit** → if `infra/cdk/**` or `infra/shared/**` changed, runs the matching `test:coverage`.
- **pre-push** → runs `pnpm exec knip` repo-wide. Push-time, not commit-time, so multi-commit stories aren't blocked mid-refactor.
- **commit-msg** → commitlint.

## AWS access from a session

If `AWS_ACCESS_KEY_ID` is in the env, the SessionStart hook installs AWS CLI v2 and you can run `aws …` directly. The keys come from claude.ai/code's per-project environment configuration; setup is in [`docs/aws-setup.md`](./docs/aws-setup.md#12-optional-grant-claude-code-on-the-web-read-access-to-aws). The IAM user behind those keys is read-only with explicit denies on every mutation verb — you can `aws s3 ls`, `aws cloudformation list-stacks`, `aws ce get-cost-and-usage` etc., but can't mutate anything.

## Don'ts

- Don't reintroduce `pragma` as a slug — it's the upstream `borso-platform` test fixture, renamed to `test-app` here.
- Don't `import`/`export` in `infra/cdk/src/internal/cf-host-routing-function.code.js` — it's CloudFront Function source, read at synth time as a string and shipped to the edge runtime.
- Don't add an app without updating `.github/path-filters.yml` and the commitlint scope-enum.
- Don't `--no-verify`. Ever. Fix the hook failure instead.
