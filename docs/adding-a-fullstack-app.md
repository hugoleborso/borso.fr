# Adding a full-stack previewable app

This is the recipe for a new app that uses **all four** of `@borso/infra`'s constructs together — `StaticSite` + `LambdaApi` + `DsqlSchema` + `DsqlCluster`, composed by `PreviewableApp`. For frontend-only apps, the simpler [`adding-an-app.md`](./adding-an-app.md) covers what's needed.

The shape we're describing:

- A static frontend served from CloudFront + S3 (per-app prod bucket, shared previews bucket).
- A single-Lambda HTTP API (Hono-style routing inside one function) at its own domain.
- A per-app Aurora DSQL cluster (owned by a dedicated `<slug>-cluster` stack) with a per-stage Postgres schema.

## 0. Pre-flight

Read [`adding-an-app.md`](./adding-an-app.md) for the slug rules and the standalone-openability invariant. The slug shows up in stack names, IAM patterns, the per-app DSQL cluster's SSM path, and the commitlint scope. Pick it once.

For the rest of this doc, replace `<slug>` with your app's slug (e.g. `notes`, `dashboard`).

## 1. Folder layout

```
apps/<slug>/
├── package.json              # @borso-app/<slug>
├── tsconfig.json
├── biome.jsonc
├── commitlint.config.js
├── cdk.json                  # {"app": "tsx bin/app.ts"}
├── README.md
├── .env.development          # localhost URLs the frontend reads at dev time
├── bin/app.ts                # CDK entry: PreviewableApp({ frontend, api, database })
├── site/                     # static frontend source (HTML/CSS/JS or a build output)
├── api/index.ts              # Hono-style Lambda entry
└── db/migrations/            # 0001_init.sql, 0002_…sql, …
```

`apps/borso-fr/` is the canonical reference for the frontend-only subset. There's no full-stack reference yet (this doc is the spec for the first one).

## 2. `package.json`

```json
{
  "name": "@borso-app/<slug>",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"pnpm dev:site\" \"pnpm dev:api\"",
    "dev:site": "python3 -m http.server --directory site 5173",
    "dev:api": "tsx watch api/index.ts",
    "build": "rm -rf dist && cp -R site dist",
    "lint": "biome lint",
    "typecheck": "tsc --noEmit",
    "synth": "pnpm --filter @borso/infra run build && pnpm build && cdk synth --all",
    "diff": "pnpm --filter @borso/infra run build && pnpm build && cdk diff --all",
    "deploy": "pnpm --filter @borso/infra run build && pnpm build && cdk deploy --all --require-approval never",
    "destroy": "cdk destroy --all --force"
  },
  "dependencies": {
    "@borso/infra": "workspace:*",
    "hono": "^4.0.0",
    "postgres": "^3.4.5",
    "@aws-sdk/dsql-signer": "^3.726.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "aws-cdk": "^2.180.0",
    "aws-cdk-lib": "^2.180.0",
    "concurrently": "^9.0.0",
    "constructs": "^10.4.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

`postgres` and `@aws-sdk/dsql-signer` are runtime deps because the API Lambda imports them. esbuild bundles them inline at synth time (no transient install — see the DsqlSchema bundling decision in the `@borso/infra` source).

## 3. CDK entry: `bin/app.ts`

DB-using apps declare **two stacks**: a long-lived `<slug>-cluster` that owns the DSQL cluster, and a per-stage stack that owns everything else. CDK's cross-stack reference machinery makes `cdk deploy --all` walk them in dep order automatically — no manual ordering, no first-deploy footgun.

```ts
#!/usr/bin/env tsx
import {
  DsqlClusterStack,
  PreviewableApp,
  requireAwsAccount,
  requireDeployStage,
  requirePrNumber,
} from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';
import * as path from 'node:path';

const APP_SLUG = '<slug>';
const PROD_DOMAIN = '<slug>.borso.fr'; // or apex / a custom domain
const REGION = 'eu-west-3';

const stage = requireDeployStage();                  // throws on STAGE=dev
const prNumber = stage === 'prod' ? undefined : requirePrNumber();
const account = requireAwsAccount();
const stageStackId =
  stage === 'prod' ? `${APP_SLUG}-prod` : `${APP_SLUG}-pr-${prNumber}`;

const app = new App();

// 1. Cluster stack — long-lived, owns the per-app DSQL cluster + SSM
//    publication. Deletion-protected. Same on every cdk synth/deploy
//    regardless of stage.
const clusterStack = new DsqlClusterStack(app, `${APP_SLUG}-cluster`, {
  env: { account, region: REGION },
  app: APP_SLUG,
});

// 2. Stage stack — created/destroyed per stage (prod / preview / integ).
const stageStack = new Stack(app, stageStackId, {
  env: { account, region: REGION },
  crossRegionReferences: true,
});

new PreviewableApp(stageStack, 'App', {
  app: APP_SLUG,
  stage,
  prNumber,
  domainName: stage === 'prod' ? PROD_DOMAIN : undefined,
  frontend: { distPath: path.resolve('./dist') },
  api: {
    entry: path.resolve('./api/index.ts'),
    environment: {
      // anything your handler reads via process.env at runtime
    },
  },
  database: {
    migrationsPath: path.resolve('./db/migrations'),
    cluster: clusterStack.cluster,  // cross-stack ref; CDK orders the deploys
  },
});
```

Output: the `PreviewableApp` exposes `site`, `api`, `database`, `cluster` as public fields if you need to pass them to other constructs.

Frontend-only apps don't need the cluster stack — drop both `database` and the `DsqlClusterStack` instantiation.

## 4. The API handler (`api/index.ts`)

Single Lambda, doing its own routing. Use Hono or any framework that maps a `(request) => response` function:

```ts
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import postgres from 'postgres';
import { DsqlSigner } from '@aws-sdk/dsql-signer';

const app = new Hono();

// Lazy-initialized DB connection. Lambda containers persist across
// invocations; reuse the connection but build it on first request so cold
// starts don't fail if env vars aren't set yet (e.g. local dev).
let sql: ReturnType<typeof postgres> | undefined;
async function db() {
  if (sql) return sql;
  const { DSQL_ENDPOINT, DSQL_SCHEMA } = process.env;
  if (!DSQL_ENDPOINT || !DSQL_SCHEMA) {
    throw new Error('DSQL_ENDPOINT / DSQL_SCHEMA must be set');
  }
  const signer = new DsqlSigner({ hostname: DSQL_ENDPOINT });
  const token = await signer.getDbConnectAuthToken();
  sql = postgres({
    host: DSQL_ENDPOINT,
    port: 5432,
    database: 'postgres',
    username: 'admin',
    password: token,
    ssl: 'require',
    connection: { search_path: DSQL_SCHEMA },
  });
  return sql;
}

app.get('/health', (c) => c.json({ ok: true, schema: process.env.DSQL_SCHEMA }));

app.get('/items', async (c) => {
  const rows = await (await db())`SELECT id, name FROM items`;
  return c.json(rows);
});

export const handler = handle(app);
```

The `LambdaApi` construct injects `STAGE`, `APP`, `DSQL_ENDPOINT`, `DSQL_SCHEMA` automatically, and grants the Lambda's role `dsql:DbConnect` on the per-app cluster.

## 5. Migrations (`db/migrations/`)

Forward-only SQL files, alphabetically ordered. Naming pattern is `<NNNN>_<name>.sql`; the migration runner only picks up files matching `^[0-9]{4}_.+\.sql$` (so `README.md` and other noise are ignored).

```
db/migrations/
├── 0001_init.sql
├── 0002_add_users.sql
└── 0003_index_items_name.sql
```

Each file runs in order, idempotently, inside the per-stage schema (`prod`, `pr_<n>`, or `integ_<n>`). The runner is a CFN custom resource, advisory-locked to prevent concurrent runs from racing.

**No DOWN migrations.** Forward-only is the contract — DSQL doesn't support FKs anyway, so most schema-narrowing changes are easier done via additive migrations + a backfill.

## 6. Custom domain for the API (optional)

By default the API lives at the auto-generated `*.execute-api.eu-west-3.amazonaws.com/<stage>` URL emitted as `ApiUrl` in the CFN outputs. If you want `api.<slug>.borso.fr`:

1. Add a wildcard ACM cert covering `api.<slug>.borso.fr` to `infra/shared/lib/certs-stack.ts` (us-east-1 if used by CloudFront, eu-west-3 for API Gateway).
2. Pass `api.customDomain: 'api.<slug>.borso.fr'` to `PreviewableApp`.
3. Redeploy shared infra (Actions tab → `shared-deploy`) to provision the cert.
4. Then redeploy the app's prod stack.

## 7. Three repo-root updates

Same as `adding-an-app.md`:

1. `.github/path-filters.yml` — add `<slug>: 'apps/<slug>/**'`.
2. `commitlint.config.js` — add `<slug>` to the `scope-enum` array.
3. `pnpm-workspace.yaml` — no change; already globs `apps/*`.

Workflows auto-discover the app from the workspace.

## 8. Local dev

- **Frontend:** `pnpm dev:site` — `python3 -m http.server` from `site/`.
- **API:** `pnpm dev:api` — `tsx watch api/index.ts`. The handler runs as a plain Node process; mock the request via `curl localhost:3000/health` (Hono's local adapter).
- **DB (DEV mode):** unspecified. The first DB-backed app should add a `docker-compose.yml` (per-app or repo-root) that stands up local Postgres on `:5432`, set `DSQL_ENDPOINT=localhost` / `DSQL_SCHEMA=dev` in `.env.development`, and patch the API handler's `db()` factory to skip the DSQL signer when `STAGE === 'dev'`. See the open question in `CLAUDE.md` for the per-app vs shared compose-file decision.

## 9. Acceptance checklist (pre-merge)

- [ ] `cd apps/<slug> && pnpm install && pnpm dev` works on a fresh checkout.
- [ ] No imports from sibling apps. Imports `@borso/infra` only.
- [ ] `pnpm --filter @borso-app/<slug> build` succeeds.
- [ ] `pnpm --filter @borso-app/<slug> synth` produces TWO stacks: `<slug>-cluster` and `<slug>-{prod,pr-<n>}`.
- [ ] PR preview deploys cleanly on first push (no manual prod-first ordering needed). `cdk deploy --all` walks the cluster stack first because of the cross-stack reference. Sticky comment URL renders the app, `/health` returns 200, `/items` (or whatever your seed migration creates) returns expected data.
- [ ] Closing the PR tears down `<slug>-pr-<n>` cleanly. The cluster stack persists across PR teardowns; only the per-stage schema is dropped.

## 10. What you don't have to do

- **Add the app slug to a workflow's matrix.** The workflows discover apps via `pnpm ls -r --filter "./apps/*" --json`.
- **Wire IAM for the Lambda → DSQL grant.** `PreviewableApp` does it.
- **Worry about cluster lifecycle.** Prod owns it, deletion-protected. Preview/integ never create or destroy the cluster, only the schema.
- **Pre-create a Lambda layer for `postgres`.** esbuild bundles it inline.

## See also

- [`architecture.md`](./architecture.md) — what each construct produces, and why we chose DSQL over RDS.
- [`flows.md`](./flows.md) — preview/prod deploy + cleanup-orphans flows.
- [`local-dev.md`](./local-dev.md) — AWS access and read-only IAM patterns.
