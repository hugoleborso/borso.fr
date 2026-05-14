#!/usr/bin/env bash
# Open a `psql` session against an Aurora DSQL cluster with a freshly-issued
# admin auth token. Token expires after 1 h — re-run the script to refresh.
#
# Usage:
#   ./scripts/dsql-shell.sh                                # last-loop-lepin (prod by default)
#   STAGE=preview PR_NUMBER=12 ./scripts/dsql-shell.sh     # a specific preview
#   APP=last-loop-lepin REGION=eu-west-3 ./scripts/dsql-shell.sh
#
# Defaults assume the borso-readonly profile is already exported in the
# shell (or that AWS_ACCESS_KEY_ID/SECRET are set for `claude-readonly`).
set -euo pipefail

APP="${APP:-last-loop-lepin}"
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

CLUSTER_ID="${ENDPOINT%%.*}"

echo "+ aws dsql generate-db-connect-admin-auth-token --identifier ${CLUSTER_ID}"
TOKEN=$(aws dsql generate-db-connect-admin-auth-token \
  --identifier "${CLUSTER_ID}" \
  --region "${REGION}" \
  --expires-in 3600 \
  --output text)

echo "+ psql against ${ENDPOINT} (schema: ${SCHEMA})"
echo "  Aurora DSQL doesn't enforce FKs and the migration runner writes to the"
echo "  per-stage schema. Tables: editions, runners, loop_punches, manual_dnfs,"
echo "  auth_attempts, _migrations."
echo
PGPASSWORD="${TOKEN}" PGOPTIONS="--search_path=${SCHEMA},public" \
  psql "host=${ENDPOINT} port=5432 user=admin dbname=postgres sslmode=require"
