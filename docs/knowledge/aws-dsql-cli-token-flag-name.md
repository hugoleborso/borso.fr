# `aws dsql generate-db-connect-admin-auth-token` wants `--hostname`, not `--identifier`

Symptom on a current AWS CLI v2 (`aws-cli/2.34.x`) :

```
$ aws dsql generate-db-connect-admin-auth-token \
    --identifier abc123 --region eu-west-3
aws: error: the following arguments are required: --hostname
```

The repo's own `scripts/dsql-shell.sh` used `--identifier` (cluster
ID without the trailing host suffix) for the past few months. That
flag is no longer accepted ; the CLI wants the full cluster endpoint
via `--hostname <endpoint>`.

## Working invocation

```sh
ENDPOINT=$(aws ssm get-parameter \
  --name "/borso/${APP}/dsql-cluster-endpoint" \
  --region "$REGION" \
  --query 'Parameter.Value' --output text)

aws dsql generate-db-connect-admin-auth-token \
  --hostname "$ENDPOINT" \
  --region "$REGION" \
  --expires-in 60 \
  --output text
```

The endpoint string looks like `<cluster-id>.dsql.eu-west-3.on.aws`
— exactly the value `DsqlClusterStack` publishes to SSM at
`/borso/<app>/dsql-cluster-endpoint`.

## When the change happened

Couldn't pin to a release note ; the AWS CLI's DSQL surface is
moving fast in 2026. Treat `--hostname` as canonical going forward.
If a future AWS CLI re-introduces `--identifier`, support both —
but ship with `--hostname` so any current operator's shell works.

## Repo touch-points

- `scripts/seed-admin-pin.sh` — uses `--hostname`.
- `scripts/dsql-shell.sh` — used `--identifier` until PR
  `./lessons-from-pr-27`, fixed to `--hostname` in the same
  kaizen sweep that landed this knowledge entry.

## Defensive shape

If a script grabs the token and then hands it to `psql`, guard
against an empty token (which a CLI error would produce) before
running `psql` :

```sh
TOKEN=$(aws dsql generate-db-connect-admin-auth-token \
  --hostname "$ENDPOINT" --region "$REGION" \
  --expires-in 60 --output text)
[ -z "$TOKEN" ] && { echo "error: empty DSQL admin token" >&2; exit 1; }
```

Otherwise `psql` falls back to its interactive password prompt
and the failure looks like "the user typed the wrong PIN" instead
of "the upstream CLI rejected the flag".
