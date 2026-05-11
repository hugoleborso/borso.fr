#!/usr/bin/env bash
# scripts/cleanup-pr-9.sh — one-shot pre-merge cleanup for PR #9.
#
# TEMPORARY. Will be removed in a follow-up commit on this same branch
# once Hugo confirms the cleanup landed.
#
# Destroys 4 stale preview stacks (PRs #2/#4/#6/#7 — all merged) and
# the 2 console-created CreatedByCloudFront-* WebACLs that sit on
# CloudFront for ~$10/mo while doing nothing.
#
# Idempotent — safe to re-run; each step skips if already done.
# Uses portable read prompts so it works under both bash and zsh
# (macOS default), but `bash scripts/cleanup-pr-9.sh` is recommended
# so the shebang's set -euo pipefail applies cleanly.

set -euo pipefail
export AWS_PROFILE=borso-admin
export AWS_REGION=eu-west-3
export CDK_DEFAULT_ACCOUNT=756586757578
# Disable the AWS CLI's less-pager — it makes macOS Terminal.app
# feel hung when describe-* commands emit large tables.
export AWS_PAGER=""

cd "$(git rev-parse --show-toplevel)"

confirm() {
  local prompt="$1" reply=""
  printf '%s [y/N] ' "$prompt"
  read -r reply
  [[ "$reply" == "y" || "$reply" == "Y" ]]
}

# `pnpm --filter @borso-app/borso-fr run destroy` now chains the
# infra build + app build internally (see apps/borso-fr/package.json
# in this PR). No need to pre-build here.

# ─────────────────────────────────────────────────────────────────────
# 1. Destroy stale preview stacks
# ─────────────────────────────────────────────────────────────────────
for pr in 2 4 6 7; do
  stack="borso-fr-pr-$pr"
  if ! aws cloudformation describe-stacks --stack-name "$stack" >/dev/null 2>&1; then
    echo "[skip] $stack: already gone"
    continue
  fi
  count=$(aws cloudformation describe-stack-resources --stack-name "$stack" \
    --query 'length(StackResources)' --output text)
  echo
  echo "=== $stack ($count resources) ==="
  if confirm "Destroy $stack?"; then
    STAGE=preview PR_NUMBER="$pr" pnpm --filter @borso-app/borso-fr run destroy
  else
    echo "[skip] $stack: declined"
  fi
done

# ─────────────────────────────────────────────────────────────────────
# 2. Optional: clear preview objects under the shared bucket now
# ─────────────────────────────────────────────────────────────────────
if confirm $'\nAlso clear s3://borso-previews/borso-fr/pr-{2,4,6,7}/ now?'; then
  for pr in 2 4 6 7; do
    aws s3 rm "s3://borso-previews/borso-fr/pr-$pr/" --recursive || true
  done
fi

# ─────────────────────────────────────────────────────────────────────
# 3. Detach + delete the two CreatedByCloudFront-* WebACLs
# ─────────────────────────────────────────────────────────────────────
DIST_ID="E3FBJN6J1RYNTS"   # borsouvertures.borso.fr
echo
echo "=== Detaching WebACL from $DIST_ID (borsouvertures.borso.fr) ==="

current_acl=$(aws cloudfront get-distribution --id "$DIST_ID" \
  --query 'Distribution.DistributionConfig.WebACLId' --output text)

if [[ -z "$current_acl" || "$current_acl" == "None" ]]; then
  echo "[skip] $DIST_ID: already has no WebACL"
else
  echo "Current WebACL: $current_acl"
  if confirm "Detach?"; then
    tmp=$(mktemp -d)
    aws cloudfront get-distribution-config --id "$DIST_ID" --output json > "$tmp/full.json"
    etag=$(jq -r '.ETag' "$tmp/full.json")
    jq '.DistributionConfig | .WebACLId = ""' "$tmp/full.json" > "$tmp/config.json"
    aws cloudfront update-distribution --id "$DIST_ID" \
      --if-match "$etag" --distribution-config "file://$tmp/config.json" >/dev/null
    rm -rf "$tmp"
    echo "[ok] WebACL detached."
    echo "Waiting 60s for CloudFront propagation before deleting WebACLs..."
    sleep 60
  fi
fi

echo
echo "=== Deleting empty CreatedByCloudFront-* WebACLs ==="
aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1 \
  --query 'WebACLs[?starts_with(Name,`CreatedByCloudFront-`)].[Name,Id]' \
  --output text | while IFS=$'\t' read -r name id; do
  [[ -n "$name" ]] || continue
  lock=$(aws wafv2 get-web-acl --scope CLOUDFRONT --region us-east-1 \
    --name "$name" --id "$id" --query 'LockToken' --output text)
  if confirm "Delete $name ($id)?"; then
    if aws wafv2 delete-web-acl --scope CLOUDFRONT --region us-east-1 \
        --name "$name" --id "$id" --lock-token "$lock"; then
      echo "  [ok] deleted"
    else
      echo "  [fail] usually WAFAssociatedItemException — wait 1 min and re-run section 3."
    fi
  fi
done

# ─────────────────────────────────────────────────────────────────────
# 4. Verify
# ─────────────────────────────────────────────────────────────────────
echo
echo "=== Remaining <app>-pr-<n> stacks ==="
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE \
  --query "StackSummaries[?contains(StackName,'-pr-')].StackName" \
  --output text

echo
echo "=== Remaining CloudFront WebACLs ==="
aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1 \
  --query 'WebACLs[].Name' --output text
