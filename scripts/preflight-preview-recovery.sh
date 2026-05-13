#!/usr/bin/env bash
# Pre-deploy recovery for borso preview stacks. Cleans up state that a
# previous failed CI run would otherwise carry into the new deploy:
#
#   1. A stack in `ROLLBACK_COMPLETE` or `REVIEW_IN_PROGRESS` — CFN
#      refuses to update such stacks; `cdk deploy` falls into a
#      changeset-create loop and the job exits 1.
#   2. Orphan log groups `/aws/lambda/<app>-pr-<N>-*` left behind when
#      the Lambda was created and AWS auto-provisioned its log group
#      before the stack rolled back. CDK's explicit `LogGroup` resource
#      then collides with the auto-created one on the retry:
#      "Resource of type 'AWS::Logs::LogGroup' already exists".
#   3. Orphan custom-named buckets `<app>-preview-photos-<N>` for the
#      same reason — CFN explicit-name `Bucket` resource refuses to
#      create when the bucket already exists (whether retained or
#      orphaned).
#
# Idempotent. Safe to run on a clean account (every probe is a "describe →
# is-present? then delete" pattern). Per-PR scope only — refuses to act
# on the prod stack.
#
# Usage: preflight-preview-recovery.sh <app-slug> <pr-number>
#
# Eradication for docs/dantotsus/preview-deploy-orphans-block-recreate.md.

set -euo pipefail

if [ "${1:-}" = "" ] || [ "${2:-}" = "" ]; then
  printf '[preflight] usage: %s <app-slug> <pr-number>\n' "$0" >&2
  exit 64
fi

APP_SLUG="$1"
PR_NUMBER="$2"
STACK_NAME="${APP_SLUG}-pr-${PR_NUMBER}"
LOG_GROUP_PREFIX="/aws/lambda/${STACK_NAME}-"
BUCKET_PREFIX="${APP_SLUG}-preview-photos-"
REGION="${AWS_REGION:-eu-west-3}"

if [[ "$STACK_NAME" == *"-prod" ]]; then
  printf '[preflight] refusing to operate on prod stack %s\n' "$STACK_NAME" >&2
  exit 65
fi

log() { printf '[preflight] %s\n' "$*"; }

if ! command -v aws >/dev/null 2>&1; then
  log "aws CLI missing — skipping (assume local sandbox)."
  exit 0
fi

# --- 1. Stuck stack states ------------------------------------------------
STACK_STATUS="$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || true)"

case "$STACK_STATUS" in
  ROLLBACK_COMPLETE|REVIEW_IN_PROGRESS|ROLLBACK_FAILED|UPDATE_ROLLBACK_FAILED)
    log "stack $STACK_NAME is $STACK_STATUS — deleting before redeploy"
    aws cloudformation delete-stack \
      --stack-name "$STACK_NAME" \
      --region "$REGION"
    aws cloudformation wait stack-delete-complete \
      --stack-name "$STACK_NAME" \
      --region "$REGION"
    log "deleted"
    ;;
  '')
    log "stack $STACK_NAME does not exist — nothing to clean"
    ;;
  *)
    log "stack $STACK_NAME is $STACK_STATUS — leaving in place"
    ;;
esac

# --- 2. Orphan Lambda log groups ------------------------------------------
mapfile -t ORPHAN_LOG_GROUPS < <(
  aws logs describe-log-groups \
    --log-group-name-prefix "$LOG_GROUP_PREFIX" \
    --region "$REGION" \
    --query 'logGroups[].logGroupName' \
    --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' || true
)

for log_group in "${ORPHAN_LOG_GROUPS[@]:-}"; do
  if [ -z "$log_group" ]; then continue; fi
  log "deleting orphan log group $log_group"
  aws logs delete-log-group \
    --log-group-name "$log_group" \
    --region "$REGION" || log "  (delete failed — non-fatal)"
done

# --- 3. Orphan photos bucket(s) -------------------------------------------
ORPHAN_BUCKET="${BUCKET_PREFIX}${PR_NUMBER}"
if aws s3api head-bucket --bucket "$ORPHAN_BUCKET" --region "$REGION" >/dev/null 2>&1; then
  log "deleting orphan photos bucket $ORPHAN_BUCKET (emptying first)"
  aws s3 rm "s3://$ORPHAN_BUCKET" --recursive --region "$REGION" || true
  aws s3api delete-bucket --bucket "$ORPHAN_BUCKET" --region "$REGION" || log "  (delete failed — non-fatal)"
fi

log "preflight complete"
