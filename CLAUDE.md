# borso.fr monorepo — agent guide

One developer. pnpm workspaces. Node 22. AWS eu-west-3 (+ us-east-1 for ACM).

For any "how does X actually work" question, [`docs/`](./docs/) is the source of truth — `architecture.md`, `flows.md`, `aws-setup.md`, `local-dev.md`, `adding-an-app.md`.

## Layout

- `apps/<slug>/` — one folder per app. Standalone-openable: `cd apps/<x> && pnpm dev` works on a fresh checkout. **No cross-app imports.**
- `infra/cdk/` — `@borso/infra`, the CDK constructs (StaticSite, LambdaApi, DsqlSchema, PreviewableApp). **100% test coverage gated.**
- `infra/shared/` — `@borso/shared-infra`, account-level singletons (certs, OIDC, DSQL cluster, previews CDN, deploy roles).

## Conventions

- **pnpm always** — no `npm` / `yarn`. Lockfile is committed.
- **Conventional commits**, scope-enum: `borso-fr`, `borsouvertures`, `infra`, `ci`, `docs`, `deps`. Husky enforces.
- **Biome** rules live in the root `biome.jsonc` and reach every workspace. Per-app configs extend root and set `"root": false`.
- **Stage** type is `'dev' | 'preview' | 'integ' | 'prod'`. `'dev'` is an app-code marker; constructs reject it via `assertDeployStage`.

## Hooks (think before bypassing with `--no-verify`)

- **SessionStart** → `scripts/install-repo-deps.sh` (rtk + pnpm deps).
- **PreToolUse(Bash)** → rtk rewrites commands for token savings.
- **pre-commit** → if `infra/cdk/**` changed, runs `@borso/infra test:coverage`.
- **pre-push** → runs `pnpm exec knip` repo-wide. Push-time, not commit-time, so multi-commit stories aren't blocked mid-refactor.
- **commit-msg** → commitlint.

## Don'ts

- Don't reintroduce `pragma` as a slug — it's the upstream `borso-platform` test fixture, renamed to `test-app` here.
- Don't `import`/`export` in `infra/cdk/src/internal/cf-host-routing-function.code.js` — it's CloudFront Function source, read at synth time as a string and shipped to the edge runtime.
- Don't add an app without updating `.github/path-filters.yml` and the commitlint scope-enum.
- Don't `--no-verify` past pre-commit unless coverage failure is genuinely unrelated to your change.
