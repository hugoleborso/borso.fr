#!/usr/bin/env bash
# Write (or change) the operator's borsouvertures password in one schema's
# `operator_credential` row, and the session signing key in `app_config` if
# none is stored yet. Defaults to `prod`; set SCHEMA to reach another.
# ADR-2026-11-13T0002: no route enrols anyone, so this script is the only
# way the credential reaches prod. Running it again changes the password and
# signs out every device, which is also the recovery.
#
# Usage:
#   ./scripts/seed-operator-credential.sh                 # prod
#   SCHEMA=pr_57 ./scripts/seed-operator-credential.sh    # one preview stage
#
# Prompts for the password (silent), hashes it with the API's own function
# (`apps/borsouvertures/api/scripts/hash-password.ts`) so the format cannot
# drift, then UPSERTs over `psql` with a freshly issued DSQL admin token under
# the `borso-admin` SSO profile. Follows `scripts/seed-admin-pin.sh`.
set -euo pipefail

PROFILE="${PROFILE:-borso-admin}"
APP="borsouvertures"
REGION="${REGION:-eu-west-3}"
SCHEMA="${SCHEMA:-prod}"
CREDENTIAL_ID="0b5e0000-0000-4000-8000-000000000001"
SIGNING_KEY_ID="session-signing-key"
SIGNING_KEY_BYTES=32

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/apps/${APP}"
TSX="${REPO_ROOT}/node_modules/.bin/tsx"

for cmd in aws psql node; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "error: ${cmd} not installed" >&2
    exit 1
  fi
done
if [ ! -x "${TSX}" ]; then
  echo "error: ${TSX} missing. Run pnpm install at the repository root first." >&2
  exit 1
fi
if ! [[ "${SCHEMA}" =~ ^[a-z0-9_]+$ ]]; then
  echo "error: SCHEMA must match ^[a-z0-9_]+$, got '${SCHEMA}'." >&2
  exit 1
fi

if ! aws sts get-caller-identity --profile "${PROFILE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "+ aws sso login --profile ${PROFILE}"
  aws sso login --profile "${PROFILE}"
fi

# `read -rsp` is bash-only, so the prompt is printed apart and echo is
# switched off around the read.
printf 'Operator password: '
stty -echo
trap 'stty echo' EXIT INT TERM
IFS= read -r PASSWORD
printf '\nAgain: '
IFS= read -r PASSWORD_AGAIN
stty echo
trap - EXIT INT TERM
echo
if [ -z "${PASSWORD}" ]; then
  echo "error: empty password, aborting." >&2
  exit 1
fi
if [ "${PASSWORD}" != "${PASSWORD_AGAIN}" ]; then
  echo "error: the two passwords differ, aborting." >&2
  exit 1
fi
unset PASSWORD_AGAIN

HASH=$(cd "${APP_DIR}" && OPERATOR_PASSWORD="${PASSWORD}" "${TSX}" api/scripts/hash-password.ts)
unset PASSWORD
SIGNING_KEY=$(node -e "process.stdout.write(require('node:crypto').randomBytes(${SIGNING_KEY_BYTES}).toString('base64'))")

ENDPOINT_PARAM="/borso/${APP}/dsql-cluster-endpoint"
echo "+ aws ssm get-parameter --name ${ENDPOINT_PARAM}"
ENDPOINT=$(aws ssm get-parameter \
  --profile "${PROFILE}" \
  --name "${ENDPOINT_PARAM}" \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)

echo "+ aws dsql generate-db-connect-admin-auth-token --hostname ${ENDPOINT}"
TOKEN=$(aws dsql generate-db-connect-admin-auth-token \
  --profile "${PROFILE}" \
  --hostname "${ENDPOINT}" \
  --region "${REGION}" \
  --expires-in 60 \
  --output text)
if [ -z "${TOKEN}" ]; then
  echo "error: empty DSQL admin token, check the AWS CLI output above." >&2
  exit 1
fi

# The password hash and the key go through psql variables, so no quote in
# them can end the statement. A new password bumps the session epoch, which
# signs out every device. The signing key is written once and never rotated
# here, because rotating it would also sign everyone out for no reason.
echo "+ psql UPSERT ${SCHEMA}.operator_credential and ${SCHEMA}.app_config"
PGPASSWORD="${TOKEN}" PGOPTIONS="--search_path=${SCHEMA}" \
  psql "host=${ENDPOINT} port=5432 user=admin dbname=postgres sslmode=require" \
    -v ON_ERROR_STOP=1 \
    -v credential_id="${CREDENTIAL_ID}" \
    -v password_hash="${HASH}" \
    -v signing_key_id="${SIGNING_KEY_ID}" \
    -v signing_key="${SIGNING_KEY}" <<'SQL'
INSERT INTO operator_credential (id, password_hash, session_epoch, created_at)
  VALUES (:'credential_id', :'password_hash', 1, now())
  ON CONFLICT (id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        session_epoch = operator_credential.session_epoch + 1;
INSERT INTO app_config (id, hmac_key)
  VALUES (:'signing_key_id', :'signing_key')
  ON CONFLICT (id) DO NOTHING;
SELECT id, left(password_hash, 12) || '...' AS hash_prefix, session_epoch, created_at
  FROM operator_credential;
SELECT id FROM app_config;
SQL
unset TOKEN HASH SIGNING_KEY

echo
echo "${SCHEMA}.operator_credential written."
if [ "${SCHEMA}" = "prod" ]; then
  echo "Next: sign in at https://${APP}.borso.fr. A wrong password now answers 401, no longer auth-not-bootstrapped."
fi
