# Adding an app

The standalone-openability invariant means each `apps/<slug>/` is self-contained. Adding one is mostly file creation, plus three repo-root touches so workflows and commits know about it.

## Pick a slug

The slug is what shows up in:

- the folder name (`apps/<slug>/`)
- the package name (`@borso-app/<slug>`)
- preview URLs (`https://<slug>-pr-<n>.preview.borso.fr`)
- the prod URL (subdomain of `borso.fr`, or apex)
- per-app DSQL cluster SSM path (`/borso/<slug>/dsql-cluster-{arn,endpoint}`)
- IAM resource patterns (`*-prod-*` and `*-pr-*`)
- the commitlint scope-enum

It must be lowercase kebab-case starting with a letter, max 32 chars (validated by `validateAppSlug` in `@borso/infra`).

## Per-app files

Inside `apps/<slug>/`:

- **`package.json`** — name `@borso-app/<slug>`, `private: true`, `type: "module"`, `dependencies: { "@borso/infra": "workspace:*" }`, scripts for `dev` / `build` / `lint` / `test` / `synth` / `deploy` / `destroy`.
- **`tsconfig.json`** — copy from an existing app; self-contained, no `extends`.
- **`biome.jsonc`** — `extends: ["../../biome.jsonc"]`, `"root": false`, `files.includes` scoped to the app's source dirs.
- **`commitlint.config.js`** — `extends: ['../../commitlint.config.js']`. Lets agents working inside the app read the convention without leaving the folder.
- **`cdk.json`** — `{"app": "tsx bin/app.ts"}`.
- **`bin/app.ts`** — CDK entrypoint. Reads `STAGE` and `PR_NUMBER` env, instantiates the right construct.
- **`README.md`** — how to run THIS app end-to-end, in isolation.
- **`.env.development`** — `localhost` URLs the frontend reads at dev time. Committed. (`.env.production` lives in CI, not the repo.)
- **`site/`, `src/`, `api/`, `db/`, etc.** — whatever the app needs.

## Three repo-root updates

When you add a new app, three files at repo root must learn its slug:

1. **`.github/path-filters.yml`** — add `<slug>: 'apps/<slug>/**'`. Drives which apps the preview/deploy workflows see as changed.
2. **`commitlint.config.js`** — add `<slug>` to the `scope-enum` array. Lets `git commit -m "feat(<slug>): …"` pass.
3. **`pnpm-workspace.yaml`** — *no change needed.* Already globs `apps/*`.

The workflows themselves auto-discover the app list from the workspace via `pnpm ls --filter "./apps/*" --json`, so you don't update the `apps=[…]` literal. (See `flows.md` for what the workflows actually do.)

## Acceptance for the new app

Before merging the PR that adds the app:

- [ ] `cd apps/<slug> && pnpm install && pnpm dev` works on a fresh checkout.
- [ ] Opening just `apps/<slug>/` in VS Code resolves all imports (the IDE shouldn't need to see siblings).
- [ ] No imports from sibling apps. (`apps/<slug>` may import from `@borso/infra`; nothing else from `apps/`.)
- [ ] `pnpm --filter @borso-app/<slug> build` succeeds.
- [ ] `pnpm --filter @borso-app/<slug> synth` produces a CFN template referencing the right cert + alias + domain.
- [ ] Preview workflow deploys the PR; the sticky comment URL renders the app.
- [ ] Closing the PR tears down `<slug>-pr-<n>` cleanly (no orphan stack, no orphan S3 prefix).

## When the app needs a database

DB-using apps need a slightly more involved `bin/app.ts` — see [`adding-a-fullstack-app.md`](./adding-a-fullstack-app.md) for the full recipe. The shape: declare a long-lived `<slug>-cluster` stack that owns the DSQL cluster + SSM publication, plus a per-stage stack that consumes `clusterStack.cluster` via cross-stack reference. CDK's `cdk deploy --all` walks them in dep order automatically — first preview deploy of a brand-new app just works regardless of stage. Per-stage schemas (`prod`, `pr_<n>`, `integ_<n>`) live inside the shared per-app cluster; `DROP CASCADE` on stack delete reclaims preview schemas. Prod's schema is never destroyed in normal ops.

Local dev for DB-backed apps is unspecified for now (no app uses a DB yet). When the first one lands, we'll decide between a per-app `docker-compose.yml` and a shared one at the repo root — see the discussion in commit `b812957`.
