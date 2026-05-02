# Local development

## Toolchain

| Need | Why |
| --- | --- |
| Node 22 (`.nvmrc`) | Lambda runtime parity. |
| pnpm 10 (via `packageManager` + corepack) | Workspaces; `npm`/`yarn` will not work. |
| `jq` | Required by the rtk PreToolUse hook (Claude Code). Almost always already installed. |
| Docker | Only needed if an app uses local Postgres (none do today). |

## First clone

```bash
git clone git@github.com:hugoleborso/borso.fr.git
cd borso.fr
pnpm install
```

`pnpm install` runs husky's `prepare` script, which installs the git hooks under `.husky/`.

## SessionStart hook

Whenever a Claude Code session opens this repo, `.claude/hooks/session-start.sh` fires. It runs `scripts/install-repo-deps.sh`, which:

1. Verifies `jq` is on PATH (fails fast if not).
2. Installs `rtk` (Rust Token Killer, see `.claude/hooks/rtk-rewrite.sh`) to `~/.local/bin` if missing.
3. Runs `pnpm install --frozen-lockfile`.

The hook also writes `export PATH="$HOME/.local/bin:$PATH"` to `$CLAUDE_ENV_FILE` so subsequent tool calls see `rtk`. Idempotent — typically ~500 ms when everything's cached.

If you're running Claude Code locally and want the same auto-install behavior outside the session hook, just run the script:

```bash
bash scripts/install-repo-deps.sh
```

## Common commands

```bash
# repo-wide
pnpm -r typecheck            # tsc --noEmit in every workspace
pnpm exec biome lint         # lint everything (root rules apply globally)
pnpm exec knip               # dead-code detection
pnpm -r test                 # run vitest in every workspace
pnpm -r build                # build every workspace that has a build script

# infra/cdk (the CDK constructs library)
pnpm --filter @borso/infra test:coverage   # tests + 100% coverage thresholds
pnpm --filter @borso/infra build           # tsc -p tsconfig.build.json + cp .code.js

# infra/shared (the CDK app for account-level singletons)
pnpm --filter @borso/shared-infra synth
pnpm --filter @borso/shared-infra diff
pnpm --filter @borso/shared-infra deploy
pnpm --filter @borso/shared-infra destroy
```

## Husky hooks

| Hook | When | What it does |
| --- | --- | --- |
| `commit-msg` | every commit | `commitlint` against the conventional-commit + scope-enum config |
| `pre-commit` | every commit | If `infra/cdk/**` changed: `@borso/infra test:coverage`. If `infra/shared/**` changed: `@borso/shared-infra test:coverage`. Both gate at 100% statements/branches/functions/lines. |
| `pre-push` | every push | `pnpm exec knip` repo-wide. |

### When `--no-verify` is OK

- The pre-commit coverage check fails because of an environmental issue you've already debugged (rare).
- You're on an in-progress branch where the half-extracted helper temporarily fails knip (not a problem because pre-push runs knip too, but if you're pushing from elsewhere — uncommon).

### When it isn't

- Tests fail and you want to commit "to keep moving." Fix the test or revert the change.
- A new conventional-commit scope you haven't added to the enum. Add it (`commitlint.config.js`) instead of bypassing.

## Granting Claude Code read access to AWS

Two patterns, depending on where Claude is running.

### Pattern A — Local Claude Code session (terminal)

Use the `borso-claude` SSO profile (set up in `aws-setup.md` step 3). Before launching Claude:

```bash
aws sso login --profile borso-claude
export AWS_PROFILE=borso-claude
export AWS_REGION=eu-west-3
claude            # or however you launch it
```

Claude inherits `AWS_PROFILE`/`AWS_REGION` and can run `aws` commands directly. Permissions are `ReadOnlyAccess + ViewOnlyAccess` minus the deny inline policy from the permission set — i.e. genuinely read-only, can't mutate IAM/CloudFormation/S3/Lambda/CloudFront/Route 53/DSQL even if it tries.

Pros: temporary credentials (1 h TTL via SSO), tight scope, no long-lived secrets to leak.
Cons: requires `aws sso login` before each Claude session that needs AWS — easy to forget.

### Pattern B — Claude Code on the web

SSO doesn't work in remote sessions because `aws sso login` opens a browser. Two workarounds:

1. **Skip AWS-aware work from web sessions.** Reach for AWS only from local sessions where pattern A applies. Cleanest.
2. **Dedicated IAM user with long-lived access keys** (only if you really want AWS access from web sessions):
   - Create an IAM user `borso-claude-readonly` with the same permissions as the `ClaudeDev` permission set (`ReadOnlyAccess` + the deny inline policy).
   - Issue an access key + secret access key.
   - Store them in `.claude/settings.json` `env` (which lives in this repo) — **do not commit them.** Add `.claude/settings.local.json` to `.gitignore` and put the keys there.
   - Rotate quarterly.
   - Revoke immediately if the laptop is lost.

   Trade-offs: long-lived keys can leak; the deny policy limits blast radius but doesn't eliminate it. Not recommended unless web sessions are the primary workflow.

### What "read state" looks like in practice

```bash
# State of an app's preview prefix in the shared bucket
aws s3 ls s3://borso-previews-${ACCOUNT}-eu-west-3/borso-fr/pr-123/

# Which CFN stacks exist
aws cloudformation list-stacks --query "StackSummaries[?StackStatus!='DELETE_COMPLETE'].StackName"

# Most recent Lambda errors
aws logs filter-log-events --log-group-name /aws/lambda/borso-fr-prod-api --start-time $(date -d '1 hour ago' +%s%3N) --filter-pattern ERROR

# Today's bill so far
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY --metrics UnblendedCost
```

The `ClaudeDev` permission set covers all of these.

## Adding/updating root-level dependencies

```bash
pnpm add -wD <pkg>            # workspace-root devDep
pnpm add --filter <ws> <pkg>  # specific workspace
```

The lockfile is committed. Renovate (Phase 4) keeps third-party deps moving automatically.
