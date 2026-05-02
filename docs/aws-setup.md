# AWS one-time setup

Everything Hugo runs by hand to bring a fresh AWS account into a state where the monorepo can deploy itself. Sequential — later steps depend on earlier ones.

You go through this **once** per AWS account. The end state is: shared infra deployed, GitHub Repository Variables filled, prod and prod-shared environments configured with you as required reviewer.

## 1. Root account hardening (never log in as root again after this)

In the AWS console, signed in as the root user:

- [ ] **Enable MFA on root.** FIDO2 hardware key + TOTP backup.
- [ ] **Account alias** → set to `borso` (IAM dashboard).
- [ ] **Alternate contacts** → set a billing alternate to a secondary email (Account → Account).
- [ ] **Default currency** → `EUR` (Account → Account).
- [ ] **IAM access to Billing** → "IAM user and role access to Billing information" → Allow (Account → Account).
- [ ] **Cost Anomaly Detection** → create a monitor on "AWS services" → email subscription.
- [ ] **Free-Tier alerts** → Billing → Billing preferences → check the box.

The shared stack itself creates the $5/$20/$50 budgets in step 7 — don't create them by hand here. (AWS Budgets only supports USD; the EUR default-currency setting above only affects how invoices are displayed in the console.)

## 2. IAM Identity Center

Region: `eu-west-3` (region-pinned forever once chosen).

1. **Identity Center → Enable.**
2. **Settings → identity source: default** (Identity Center directory).
3. **Users → Add user `hugo`** with your email.
4. **Permission sets:**
   - **Admin** → `AdministratorAccess`, 4 h sessions. Used for `borso-admin` profile.
   - **ClaudeDev** → `ReadOnlyAccess` + `ViewOnlyAccess` + the inline deny policy below. 1 h sessions. Used for `borso-claude` profile (see `local-dev.md` for why).
5. **Assign both permission sets** to user `hugo` for this account.
6. **Note the SSO start URL.**

The `ClaudeDev` deny policy (paste into the permission set as an inline policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "cloudformation:Create*",
        "cloudformation:Update*",
        "cloudformation:Delete*",
        "cloudformation:Execute*",
        "s3:Delete*",
        "s3:Put*",
        "lambda:Create*",
        "lambda:Update*",
        "lambda:Delete*",
        "lambda:Invoke*",
        "cloudfront:Create*",
        "cloudfront:Update*",
        "cloudfront:Delete*",
        "route53:Change*",
        "route53:Create*",
        "route53:Delete*",
        "dsql:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Read-only really means read-only.

## 3. Configure SSO profiles locally

```bash
aws configure sso
# Profile name: borso-admin
# Start URL: <from step 2>
# Region: eu-west-3
# Permission set: Admin
# Default region: eu-west-3
# Default output: json

aws configure sso
# Profile name: borso-claude
# Permission set: ClaudeDev
# Other settings same as above
```

Smoke-test the deny:

```bash
aws --profile borso-claude iam create-user --user-name x
# Should fail with AccessDenied — confirms the deny policy is active.
```

## 4. CDK bootstrap (both regions)

```bash
ACCOUNT=$(aws --profile borso-admin sts get-caller-identity --query Account --output text)
npx aws-cdk bootstrap "aws://$ACCOUNT/eu-west-3" --profile borso-admin
npx aws-cdk bootstrap "aws://$ACCOUNT/us-east-1" --profile borso-admin
```

`us-east-1` is required because ACM wildcards for CloudFront live there.

## 5. Verify the hosted zone

`borso.fr` must already exist as a Route 53 hosted zone with the registrar's NS records pointing at it. The shared stack uses `HostedZone.fromLookup`, which fails if the zone isn't authoritative.

```bash
aws --profile borso-admin route53 list-hosted-zones-by-name --dns-name borso.fr.
```

Should return one zone with a valid `Id`.

## 6. Pre-flight env vars

Set these in the shell where you'll run the next step:

```bash
export AWS_PROFILE=borso-admin
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export BORSO_BUDGET_EMAIL=hugo@example.com   # required; synth fails if absent
# optional:
# export BORSO_REGION=eu-west-3
```

The `BORSO_BUDGET_EMAIL` is mandatory in `infra/shared/lib/shared-stack.ts` — without it, synth throws. This is intentional; cost alarms can't be silently dropped.

## 7. Deploy the shared stack

From the repo root:

```bash
pnpm install
pnpm --filter @borso/shared-infra synth   # quick check; should produce two stacks
pnpm --filter @borso/shared-infra deploy
```

Two stacks land:

- `borso-shared-certs` (us-east-1) — wildcard ACM certs for `borso.fr` + `*.preview.borso.fr`. DNS validation runs against the existing hosted zone.
- `borso-shared` (eu-west-3) — OIDC provider, previews bucket+CDN, three deploy roles, three budgets, all `/borso/shared/*` SSM parameters.

This step typically takes 5–10 minutes the first time, mostly cert validation. Per-app DSQL clusters are not created here — each app's prod stack stands up its own cluster the first time it deploys to prod, publishing `/borso/<app>/dsql-cluster-{arn,endpoint}` for preview/integ stacks of the same app to look up.

## 8. Read deploy role ARNs from SSM

```bash
aws --profile borso-admin ssm get-parameters-by-path \
  --path /borso/shared --recursive \
  --query 'Parameters[].[Name,Value]' --output table
```

Note the values for:

- `/borso/shared/prod-deploy-role-arn`
- `/borso/shared/preview-deploy-role-arn`
- `/borso/shared/shared-deploy-role-arn`

You'll paste them into GitHub in the next step.

## 9. GitHub Repository Variables

In `hugoleborso/borso.fr` → **Settings → Secrets and variables → Actions → Variables**:

| Variable | Value | Where it comes from |
| --- | --- | --- |
| `AWS_REGION` | `eu-west-3` | constant |
| `AWS_ACCOUNT_ID` | your 12-digit account id | step 6's `$CDK_DEFAULT_ACCOUNT` |
| `PROD_DEPLOY_ROLE_ARN` | `arn:aws:iam::…:role/ProdDeployRole` | step 8 |
| `PREVIEW_DEPLOY_ROLE_ARN` | `arn:aws:iam::…:role/PreviewDeployRole` | step 8 |
| `SHARED_DEPLOY_ROLE_ARN` | `arn:aws:iam::…:role/SharedInfraDeployRole` | step 8 (reserved for a future shared-infra workflow) |

These are **Variables**, not Secrets — the role ARNs aren't sensitive (the trust policy gates who can assume).

## 10. GitHub Environments

In the same repo settings → **Environments**:

- **`prod`** — required reviewer: yourself. Optionally drop the requirement after a few months once you trust the pipeline.
- **`prod-shared`** — required reviewer: yourself. (Reserved for the future shared-infra workflow.)

The environment names are the literal strings the deploy roles trust — don't rename them without updating `infra/shared/lib/shared-stack.ts`.

## 11. Smoke-test the pipeline

Once the workflows from Phase 4 are merged:

1. Open a PR with a trivial change in `apps/borso-fr/site/`.
2. Watch the `ci` workflow go green.
3. Watch the `preview` workflow deploy and sticky-comment a `https://borso-fr-pr-N.preview.borso.fr` URL.
4. Open the URL — it should render the apex content.
5. Close the PR; the `teardown` job should destroy `borso-fr-pr-N`.
6. Verify in the AWS console: no leftover stack, no leftover S3 prefix.

## 12. (Optional) Grant Claude Code on the web read access to AWS

Skip this if you only run Claude Code locally — Pattern A in [`local-dev.md`](./local-dev.md#pattern-a--local-claude-code-session-terminal) covers that case via `aws sso login --profile borso-claude`.

For remote (claude.ai/code) sessions, `aws sso login` doesn't work because there's no browser. The simplest path is a dedicated IAM user with long-lived access keys, scoped strictly read-only. Trade-off: long-lived keys are visible to anyone with edit access on the Claude Code project environment; Anthropic does not yet offer encrypted-at-rest secrets storage. The IAM scope is what bounds the blast radius if a key leaks.

### 12.1 Create the IAM user

```bash
aws --profile borso-admin iam create-user --user-name claude-readonly

aws --profile borso-admin iam attach-user-policy \
  --user-name claude-readonly \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

# Reuse the deny inline policy from step 2 (the ClaudeDev permission set).
aws --profile borso-admin iam put-user-policy \
  --user-name claude-readonly \
  --policy-name ClaudeDevDeny \
  --policy-document file:///path/to/deny.json
```

The `deny.json` content is the same JSON from step 2 — keep it identical so the read-only guarantee stays in sync between the SSO permission set and this user.

### 12.2 Issue an access key

```bash
aws --profile borso-admin iam create-access-key --user-name claude-readonly
```

Copy the `AccessKeyId` and `SecretAccessKey` from the response. Store them somewhere you can retrieve later (1Password, etc.) in case you need to re-paste them after a rotation.

### 12.3 Configure the Claude Code on the web environment

In claude.ai/code, navigate to the project's environment configuration UI and set these variables:

| Var | Value |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | from step 12.2 |
| `AWS_SECRET_ACCESS_KEY` | from step 12.2 |
| `AWS_REGION` | `eu-west-3` |
| `AWS_ACCOUNT_ID` | from step 6's `$CDK_DEFAULT_ACCOUNT` |

These get exported into every cloud session for the project. The repo's `scripts/install-repo-deps.sh` (run by the SessionStart hook) detects `AWS_ACCESS_KEY_ID` and conditionally installs the AWS CLI v2 — local sessions without these vars set don't pay that install cost.

### 12.4 Rotation + revocation

- **Rotate every 90 days.** Issue a new key, update env vars in claude.ai/code, deactivate the old key, then delete it after a few days of cooldown.
- **If a key leaks**: `aws iam delete-access-key --user-name claude-readonly --access-key-id …` immediately, then update env vars.
- **If the IAM user gets compromised somehow**: `aws iam delete-user --user-name claude-readonly` and start over. The blast radius is whatever `ReadOnlyAccess` minus the deny policy allows — destructive ops are blocked even if a key leaks.

### 12.5 Why not a stronger setup

- **Bootstrap key + Secrets Manager / Vault**: worth it once compliance matters, multiple people have edit access on the Claude project, or the read scope grows beyond truly read-only. Single-developer scope doesn't earn the complexity yet.
- **STS-issued short-lived creds via a hosted endpoint**: would need to host a tiny Lambda that issues 1 h sessions; a 90-day rotation cadence on a static key is a simpler trade for now.

## Reference: SSM parameters

### Published by the shared stack (`/borso/shared/*`)

| Parameter | Value | Read by |
| --- | --- | --- |
| `/borso/shared/oidc-provider-arn` | OIDC provider ARN | `infra/cdk` constructs (StaticSite optional deploy role — currently unused in the monorepo) |
| `/borso/shared/hosted-zone-id` | Z…id of `borso.fr` zone | `StaticSite` (prod alias records) |
| `/borso/shared/hosted-zone-name` | `borso.fr` | `StaticSite` (prod alias records) |
| `/borso/shared/cert-borso-fr-arn` | wildcard cert (us-east-1) | `StaticSite` (prod distribution) |
| `/borso/shared/cert-preview-borso-fr-arn` | preview wildcard cert | `infra/shared` (the previews CDN itself) |
| `/borso/shared/previews-bucket-name` | shared previews bucket | `StaticSite` (preview/integ uploads) |
| `/borso/shared/previews-distribution-id` | shared previews CDN id | `StaticSite` (issues invalidation on every preview redeploy) |
| `/borso/shared/previews-distribution-domain` | shared previews CDN domain (`d…cloudfront.net`) | `StaticSite` (paired with the id above to construct an `IDistribution`) |
| `/borso/shared/prod-deploy-role-arn` | `ProdDeployRole` | step 9 (GitHub Variable) |
| `/borso/shared/preview-deploy-role-arn` | `PreviewDeployRole` | step 9 |
| `/borso/shared/shared-deploy-role-arn` | `SharedInfraDeployRole` | step 9 (reserved) |

### Published by each app's prod stack (`/borso/<app>/*`)

Created on first prod deploy of an app. Preview/integ stacks of the same app read these to share the cluster.

| Parameter | Value | Read by |
| --- | --- | --- |
| `/borso/<app>/dsql-cluster-arn` | per-app DSQL cluster ARN | `DsqlSchema` + Lambda IAM grants in preview/integ stacks |
| `/borso/<app>/dsql-cluster-endpoint` | per-app DSQL cluster endpoint | `DsqlSchema` migration runner + `LambdaApi` env in preview/integ stacks |
