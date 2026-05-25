#!/usr/bin/env bash
# Seed (or rotate) the admin PIN hash in last-loop-lepin's `prod.admin_credentials`
# table. Every preview schema clones from `prod` on next deploy, so this is the
# single source of truth — seed once here and every PR's preview inherits.
#
# Usage:
#   ./scripts/seed-admin-pin.sh
#
# Prompts for the PIN (silent), generates the scrypt hash in the exact format
# the API expects (`scrypt$<saltHex>$<keyHex>`, 16-byte salt + 64-byte key, cf.
# `apps/last-loop-lepin/api/src/auth/auth.service.ts:29`), then UPSERTs row
# id=1 via `psql` over a freshly-issued DSQL admin token under the
# `borso-admin` SSO profile.
#
# After this runs, redeploy any in-flight preview to propagate (or wait for
# the next CFN update event on its DsqlSchema custom resource).
set -euo pipefail

PROFILE="${PROFILE:-borso-admin}"
APP="${APP:-last-loop-lepin}"
REGION="${REGION:-eu-west-3}"
SCHEMA="${SCHEMA:-prod}"

for cmd in aws psql node; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "error: ${cmd} not installed" >&2
    exit 1
  fi
done

# Re-establish SSO creds if expired — no-op if already valid.
if ! aws sts get-caller-identity --profile "${PROFILE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "+ aws sso login --profile ${PROFILE}"
  aws sso login --profile "${PROFILE}"
fi

# Read the PIN silently — no echo, no shell history, no argv.
read -rsp "Admin PIN: " PIN
echo
if [[ -z "${PIN}" ]]; then
  echo "error: empty PIN, aborting." >&2
  exit 1
fi

# Generate the hash in the format `verifyPinAgainstHash` parses:
# `scrypt$<saltHex>$<keyHex>` with 16-byte salt + 64-byte derived key.
HASH=$(PIN="${PIN}" node -e '
  const { scryptSync, randomBytes } = require("node:crypto");
  const salt = randomBytes(16);
  const key = scryptSync(process.env.PIN, salt, 64);
  process.stdout.write(`scrypt$${salt.toString("hex")}$${key.toString("hex")}`);
')
unset PIN

# Cluster endpoint comes from the DsqlClusterStack SSM output, same path as
# scripts/dsql-shell.sh uses.
ENDPOINT_PARAM="/borso/${APP}/dsql-cluster-endpoint"
echo "+ aws ssm get-parameter --name ${ENDPOINT_PARAM}"
ENDPOINT=$(aws ssm get-parameter \
  --profile "${PROFILE}" \
  --name "${ENDPOINT_PARAM}" \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)
CLUSTER_ID="${ENDPOINT%%.*}"

echo "+ aws dsql generate-db-connect-admin-auth-token --identifier ${CLUSTER_ID}"
TOKEN=$(aws dsql generate-db-connect-admin-auth-token \
  --profile "${PROFILE}" \
  --identifier "${CLUSTER_ID}" \
  --region "${REGION}" \
  --expires-in 60 \
  --output text)

echo "+ psql UPSERT prod.admin_credentials (id=1)"
PGPASSWORD="${TOKEN}" PGOPTIONS="--search_path=${SCHEMA},public" \
  psql "host=${ENDPOINT} port=5432 user=admin dbname=postgres sslmode=require" \
       -v ON_ERROR_STOP=1 \
       -c "INSERT INTO admin_credentials (id, scrypt_hash, updated_at)
           VALUES (1, '${HASH}', now())
           ON CONFLICT (id) DO UPDATE
             SET scrypt_hash = EXCLUDED.scrypt_hash, updated_at = now();" \
       -c "SELECT id, left(scrypt_hash, 14) || '…' AS hash_prefix, updated_at
             FROM admin_credentials;"
unset TOKEN HASH

cat <<'NOTE'

✓ prod.admin_credentials seeded.

Next steps:
  - Prod login works immediately on next request.
  - To propagate to an already-deployed preview, re-trigger the CFN update on
    its DsqlSchema custom resource. Easiest: empty commit + push on the
    preview's branch, or rerun the preview workflow from the Actions tab.
NOTE
