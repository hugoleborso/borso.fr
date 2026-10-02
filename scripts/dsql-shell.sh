#!/usr/bin/env bash
# Open a `psql` session against an Aurora DSQL cluster with a freshly-issued
# admin auth token. Token expires after 1 h — re-run the script to refresh.
#
# Usage:
#   APP=pragma ./scripts/dsql-shell.sh                              # prod by default
#   APP=pragma STAGE=preview PR_NUMBER=12 ./scripts/dsql-shell.sh   # a specific preview
#   APP=last-loop-lepin REGION=eu-west-3 ./scripts/dsql-shell.sh
#
# APP has no default. It used to default to last-loop-lepin, written when that
# was the only application with a cluster; with three, a forgotten APP opened
# the wrong production database without saying so. See
# docs/dantotsus/the-database-shell-that-opened-the-other-app.md.
#
# Defaults assume the borso-readonly profile is already exported in the
# shell (or that AWS_ACCESS_KEY_ID/SECRET are set for `AI-Dev-ReadOnly`).
set -euo pipefail

APP="${APP:?APP is required: name the application whose cluster to open, for example APP=pragma}"
REGION="${REGION:-eu-west-3}"
STAGE="${STAGE:-prod}"
PR_NUMBER="${PR_NUMBER:-}"

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not installed. apt: \`sudo apt-get install postgresql-client\`" >&2
  exit 1
fi
if ! command -v aws >/dev/null 2>&1; then
  echo "error: aws cli v2 not installed. see docs/aws-setup.md." >&2
  exit 1
fi

# Cluster ARN + endpoint are exported by `DsqlClusterStack` as SSM params.
# Schema (search_path) follows the per-stage convention from
# `infra/cdk/src/internal/naming.ts`.
if [[ "${STAGE}" == "prod" ]]; then
  SCHEMA="prod"
elif [[ "${STAGE}" == "preview" ]]; then
  if [[ -z "${PR_NUMBER}" ]]; then
    echo "error: STAGE=preview requires PR_NUMBER" >&2
    exit 1
  fi
  SCHEMA="pr_${PR_NUMBER}"
else
  echo "error: unknown STAGE '${STAGE}' (expected prod|preview)" >&2
  exit 1
fi

ENDPOINT_PARAM="/borso/${APP}/dsql-cluster-endpoint"
echo "+ aws ssm get-parameter --name ${ENDPOINT_PARAM} --region ${REGION}"
ENDPOINT=$(aws ssm get-parameter \
  --name "${ENDPOINT_PARAM}" \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)

# Current AWS CLI v2 wants `--hostname <full-endpoint>`, not
# `--identifier <cluster-id>`. See
# docs/knowledge/aws-dsql-cli-token-flag-name.md.
echo "+ aws dsql generate-db-connect-admin-auth-token --hostname ${ENDPOINT}"
TOKEN=$(aws dsql generate-db-connect-admin-auth-token \
  --hostname "${ENDPOINT}" \
  --region "${REGION}" \
  --expires-in 3600 \
  --output text)

echo "+ psql against ${APP}'s cluster at ${ENDPOINT} (schema: ${SCHEMA})"
echo "  Aurora DSQL does not enforce foreign keys, and the migration runner writes"
echo "  to the per-stage schema. \\dt lists this application's tables."
echo
PGPASSWORD="${TOKEN}" PGOPTIONS="--search_path=${SCHEMA},public" \
  psql "host=${ENDPOINT} port=5432 user=admin dbname=postgres sslmode=require"
