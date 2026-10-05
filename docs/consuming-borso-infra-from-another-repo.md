# Consuming borso.fr infra from another repo

`@borso/infra` (the constructs in `infra/cdk/`) can deploy an app that lives in another repository, into the same AWS account, on a `*.borso.fr` hostname. The first consumer was the private repository `hugoleborso/talos`, which deployed a PWA at `talos.borso.fr`; that app now lives in [`apps/talos`](../apps/talos/README.md) and deploys through this repository's own workflow, so nothing consumes the constructs from outside today. This page is the setup talos used, kept for the next consumer, and the limits of that setup. `TalosDeployRole` below is now unused.

## What borso.fr provides

| Piece | Where | Note |
| --- | --- | --- |
| The constructs | `infra/cdk/` as the pnpm package `@borso/infra` | Built with `tsc` from the package's own `tsconfig.build.json`. Nothing at the borso.fr root is read at build time. |
| A deploy role | `TalosDeployRole`, created by `infra/shared/lib/deploy-roles.ts`, ARN published at SSM `/borso/shared/talos-deploy-role-arn` | Trusts only `repo:hugoleborso@44852104/talos@1401805496:environment:prod`, the immutable subject talos tokens carry. See [the subject format](#the-subject-format-of-the-consumers-tokens). |
| Certificate, zone, SSM values | the `borso-shared` and `borso-shared-certs` stacks | `cert-borso-fr-arn` covers `borso.fr` and `*.borso.fr`, so `talos.borso.fr` needs no new certificate. |
| The alias preflight | `scripts/preflight-cloudfront-aliases.sh` | A plain bash script; it needs `aws` and `jq` and nothing from the borso.fr workspace. |

## The subject format of the consumer's tokens

The `sub` claim of a GitHub Actions token starts with a prefix that each repository configures, and a deploy role must trust exactly that prefix. Read it before writing the role:

```sh
scripts/print-oidc-subject.sh hugoleborso/talos --record
```

The script calls `gh api repos/<owner/repo>/actions/oidc/customization/sub`, prints the prefix and the `subjectFormat` to pass to `githubActionsPrincipal`, and with `--record` writes the prefix to `infra/shared/oidc-subject-prefixes.json`. The shared-stack test fails on any trusted claim whose prefix is not recorded there, so a role cannot ship with a guessed format. The API returns one of three shapes:

| API answer | Prefix | `subjectFormat` |
| --- | --- | --- |
| `use_immutable_subject: false` | `repo:<owner>/<name>` | `{ kind: 'name' }` |
| `use_immutable_subject: true` | `repo:<owner>@<ownerId>/<name>@<repoId>` | `{ kind: 'immutable', ownerId, repositoryId }` |
| `use_default: false` | a custom claim template | not supported; the script fails |

borso.fr is on the name format. talos is on the immutable format (`repo:hugoleborso@44852104/talos@1401805496`), so `TalosDeployRole` trusts only that form. The name form is left out on purpose: talos never emits it, and the ids pin the trust to this exact repository, so a renamed or recreated repository under the same name cannot obtain the role. If a consumer changes the setting, its next deploy fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity` until the role is updated and `shared-deploy` is dispatched.

## What the deploy role can and cannot do

`TalosDeployRole` carries no managed policy and no resource permission. It may only assume the four CDK bootstrap roles of the account (`cdk-hnb659fds-{deploy,file-publishing,image-publishing,lookup}-role-<account>-*`) and call `cloudfront:ListDistributions` for the preflight. `cdk deploy` does everything else through those bootstrap roles.

That is narrower than `ProdDeployRole`, which also holds `PowerUserAccess`, but it does not confine talos to stacks named `talos-*`. The bootstrap deploy role can create or update any stack in the account, and CloudFormation then acts with the bootstrap execution role, which is `AdministratorAccess` under the default bootstrap this account uses (see [`aws-setup.md`](./aws-setup.md#4-cdk-bootstrap-both-regions)). The real boundary is the trust: only a job of the talos repository that runs in its `prod` GitHub environment can obtain the role. Confining talos by stack name would need a second bootstrap with its own qualifier and a scoped execution policy, which nothing here does yet.

## Setup in the consumer repository

### 1. Submodule

```sh
git submodule add https://github.com/hugoleborso/borso.fr.git vendor/borso.fr
```

Use the https URL, so `actions/checkout` can fetch the public submodule without a key. Move to a newer borso.fr with `git submodule update --remote vendor/borso.fr` and commit the new pointer. borso.fr's own `deploy.yml` never redeploys talos when the constructs change; talos picks up a construct change only when it bumps the pointer.

### 2. pnpm workspace and catalog

`@borso/infra` declares its dependencies with `catalog:`, so the consumer's `pnpm-workspace.yaml` must define every name below, or `pnpm install` stops with "No catalog entry". Copy the versions from `vendor/borso.fr/pnpm-workspace.yaml` at the pinned commit. `aws-cdk-lib` and `constructs` must resolve to the same version in both packages, because CDK checks construct identity across packages.

```yaml
packages:
  - infra
  - vendor/borso.fr/infra/cdk

catalog:
  '@aws-sdk/dsql-signer': '^3.1121.0'
  '@stryker-mutator/core': '9.6.1'
  '@stryker-mutator/vitest-runner': '9.6.1'
  '@types/node': '^22.10.5'
  '@vitest/coverage-v8': '^5.0.3'
  aws-cdk: '^2.1142.0'
  aws-cdk-lib: '^2.270.0'
  constructs: '^10.8.1'
  esbuild: '^0.28.2'
  postgres: '^3.4.5'
  tsx: '^4.23.13'
  typescript: '^5.7.2'
  vitest: '^5.0.3'
```

The Stryker and Vitest entries are only used by `@borso/infra`'s own tests, but pnpm resolves every `catalog:` reference of a workspace package, so they are required anyway. Add `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to the consumer's root `package.json`, so esbuild can install its binary and `NodejsFunction` bundles locally instead of in Docker.

Run every pnpm command from the consumer's root, with `--filter`. `vendor/borso.fr` has its own `pnpm-workspace.yaml`, so a pnpm command run inside it treats borso.fr as a separate workspace. Exclude `vendor/` from the consumer's ESLint, Prettier and `tsc` scopes.

### 3. CDK package

`infra/package.json`:

```json
{
  "name": "@talos/infra",
  "private": true,
  "type": "module",
  "scripts": {
    "synth": "pnpm --filter @borso/infra run build && cdk synth --all",
    "deploy": "pnpm --filter @borso/infra run build && cdk synth --all && ../vendor/borso.fr/scripts/preflight-cloudfront-aliases.sh cdk.out && cdk deploy --all --require-approval never"
  },
  "dependencies": { "@borso/infra": "workspace:*" },
  "devDependencies": {
    "@types/node": "catalog:",
    "aws-cdk": "catalog:",
    "aws-cdk-lib": "catalog:",
    "constructs": "catalog:",
    "esbuild": "catalog:",
    "tsx": "catalog:",
    "typescript": "catalog:"
  }
}
```

`infra/cdk.json`:

```json
{ "app": "tsx bin/app.ts", "context": { "@aws-cdk/aws-iam:minimizePolicies": true } }
```

`infra/bin/app.ts`, with the site build in `../app/dist` and the Lambda handler in `../api/src/lambda.ts`:

```ts
import { PreviewableApp, requireAwsAccount, requireDeployStage } from '@borso/infra';
import { App, Stack } from 'aws-cdk-lib';

const APP_SLUG = 'talos';
const PROD_DOMAIN = 'talos.borso.fr';
const REGION = 'eu-west-3';

const stage = requireDeployStage();
if (stage !== 'prod') {
  throw new Error(`talos deploys only to prod, got '${stage}'.`);
}

const app = new App();
const stack = new Stack(app, `${APP_SLUG}-prod`, {
  env: { account: requireAwsAccount(), region: REGION },
});

new PreviewableApp(stack, 'Talos', {
  app: APP_SLUG,
  stage,
  domainName: PROD_DOMAIN,
  frontend: { distPath: '../app/dist', bucketNameSuffix: 'account' },
  api: { entry: '../api/src/lambda.ts' },
});
```

`PreviewableApp` at the `prod` stage composes `StaticSite` and `LambdaApi` and serves the API on the same origin under `/api/*`. A site with no API uses `StaticSite` directly with the same `app`, `stage` and `domainName`. Synthesized from a workspace laid out this way, the stack holds one distribution aliased to `talos.borso.fr`, a bucket `talos-prod-<account id>`, a function `talos-prod-api`, A and AAAA records for `talos.borso.fr.`, and the tags `Project=borso`, `App=talos`, `Stage=prod`, `ManagedBy=cdk`. The slug `talos` passes `validateAppSlug`.

### Bucket names are global

S3 bucket names are unique across every AWS account, not only this one. `StaticSite` names the prod bucket `<app>-prod` by default, so a short slug can already belong to a stranger: the first talos deploy failed with `The requested bucket name is not available` because `talos-prod` was unavailable, although S3 answered `NoSuchBucket` for it, so a lookup cannot prove a name is free. Pass `bucketNameSuffix: 'account'` to `StaticSite`, or `frontend.bucketNameSuffix` to `PreviewableApp`, and the bucket becomes `<app>-prod-<account id>`, which nobody outside the account can hold. The stack must set `env.account`, because the name is computed at synth time; synth fails otherwise. The option changes nothing at the `preview` and `integ` stages, which write to the shared previews bucket. Existing borso.fr apps keep `<app>-prod`: renaming a bucket replaces it, and their names are already theirs. See [the dantotsu](./dantotsus/a-bucket-name-someone-else-already-owned.md). The `Project=borso` tag means talos counts against the account's `borso-monthly-*` budgets.

### 4. GitHub settings of the consumer

| Setting | Value |
| --- | --- |
| Environment | `prod`. The name is the literal string `TalosDeployRole` trusts. It needs no reviewer rule. |
| OIDC subject customization | leave it as it is, or rerun `scripts/print-oidc-subject.sh` and update the role after changing it. |
| Variable `AWS_REGION` | `eu-west-3` |
| Variable `AWS_ACCOUNT_ID` | the 12-digit account id |
| Variable `TALOS_DEPLOY_ROLE_ARN` | the value of SSM `/borso/shared/talos-deploy-role-arn`, which is `arn:aws:iam::<account>:role/TalosDeployRole` |

### 5. Deploy workflow

`.github/workflows/deploy.yml`:

```yaml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

concurrency: deploy-prod

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod
    env:
      STAGE: prod
      AWS_REGION: ${{ vars.AWS_REGION }}
      CDK_DEFAULT_ACCOUNT: ${{ vars.AWS_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@v7
        with:
          submodules: true
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter <site package> run build
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.TALOS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      - run: pnpm --filter @talos/infra run deploy
```

The job must declare `environment: prod`. Without it the token's subject is `repo:hugoleborso@44852104/talos@1401805496:ref:refs/heads/main` and the role refuses it; see [`knowledge/github-oidc-sub-claim-per-trigger.md`](./knowledge/github-oidc-sub-claim-per-trigger.md). Use `pnpm run deploy`, never `pnpm deploy`, which is a pnpm built-in.

## Order of operations

1. Read the consumer's subject format with `scripts/print-oidc-subject.sh <owner/repo> --record`, then merge the borso.fr change that adds or updates its deploy role.
2. Dispatch `shared-deploy` in borso.fr. It is `workflow_dispatch` only, so nothing creates the role or the SSM parameter until this runs.
3. Read the ARN: `aws ssm get-parameter --name /borso/shared/talos-deploy-role-arn --query Parameter.Value --output text --region eu-west-3`.
4. Set the talos variables and environment, then push to talos `main`.

## Previews are not supported

The constructs would build a talos preview: `StaticSite` at the `preview` stage writes to the `borso-previews` bucket under `talos/pr-<n>` and the shared CDN answers on `talos-pr-<n>.preview.borso.fr`. Two things stop it from working today:

- `PreviewDeployRole` trusts only `hugoleborso/borso.fr`, and `TalosDeployRole` only trusts the `prod` environment. No role lets a talos pull request deploy.
- borso.fr's `cleanup-orphans.yml` lists every `<app>-pr-<n>` stack in the account and fails its run on any whose app is not a borso.fr workspace, so a `talos-pr-<n>` stack would turn borso.fr's nightly sweeper red. Even with the slug known, it would look the PR number up in the wrong repository.

Enabling previews means a talos `pull_request` subject on a preview role, a teardown workflow in talos that destroys the stack when its PR closes, and teaching `cleanup-orphans.yml` which repository owns which slug. Until then the consumer deploys `prod` only, which is why `bin/app.ts` above refuses any other stage.
