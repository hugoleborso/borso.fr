#!/usr/bin/env bash
# Seed (or rotate) the admin PIN hash in one last-loop-lepin schema's
# `admin_credentials` table. Defaults to `prod`; set SCHEMA to reach another.
#
# Usage:
#   ./scripts/seed-admin-pin.sh                 # prod
#   SCHEMA=pr_57 ./scripts/seed-admin-pin.sh    # one preview stage
#
# Prompts for the PIN (silent), generates the scrypt hash in the exact format
# the API expects (`scrypt$<saltHex>$<keyHex>`, 16-byte salt + 64-byte key, cf.
# `apps/last-loop-lepin/api/src/auth/auth.service.ts:29`), then UPSERTs row
# id=1 via `psql` over a freshly-issued DSQL admin token under the
# `borso-admin` SSO profile.
#
# Portable across bash + zsh: the silent prompt uses `stty -echo` (not
# `read -rsp` which zsh interprets as a coprocess prompt).
#
# Seeding one schema reaches no other. A preview clones `prod` when its schema
# is created, but `admin_credentials` sits in that clone's tableBlocklist (see
# apps/last-loop-lepin/cdk/lib/stack.ts) so that a public preview URL cannot
# carry production's PIN hash. Each stage's admin area therefore stays
# unreachable until its own schema is seeded by this script.
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

# Silent PIN read. `read -rsp` works in bash but zsh treats `-p` as
# coprocess-only, so the prompt is printed separately and `stty -echo`
# disables terminal echo around the read.
printf 'Admin PIN: '
stty -echo
trap 'stty echo' EXIT INT TERM
IFS= read -r PIN
stty echo
trap - EXIT INT TERM
echo
if [ -z "${PIN}" ]; then
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

# AWS CLI's `aws dsql generate-db-connect-admin-auth-token` wants the full
# endpoint via `--hostname`, not the bare cluster id. (Earlier docs / older
# helper scripts mention `--identifier`; the public CLI ships `--hostname`.)
echo "+ aws dsql generate-db-connect-admin-auth-token --hostname ${ENDPOINT}"
TOKEN=$(aws dsql generate-db-connect-admin-auth-token \
  --profile "${PROFILE}" \
  --hostname "${ENDPOINT}" \
  --region "${REGION}" \
  --expires-in 60 \
  --output text)
if [ -z "${TOKEN}" ]; then
  echo "error: empty DSQL admin token — check AWS CLI output above." >&2
  exit 1
fi

echo "+ psql UPSERT ${SCHEMA}.admin_credentials (id=1)"
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
