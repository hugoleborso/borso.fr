#!/usr/bin/env bash
# Refuses a preview deploy that would need a database schema the cluster
# cannot give, and names the pull requests holding the ones it has.
#
# Each full-stack application has one Aurora DSQL cluster, and every preview of
# it takes one schema there, `pr_<n>`, beside `prod`. DSQL allows at most ten
# schemas per database. The eleventh is refused by the migration runner inside
# CloudFormation, as `more than 10 schemas not allowed`, after the stack has
# already started creating, which reads as a broken custom resource rather than
# a full cluster and says nothing about who holds the other ten.
#
# This counts the preview stacks of the application that are standing, which is
# the same number as the schemas they own, and fails before CloudFormation is
# called. Redeploying a preview that already stands needs no new schema, so it
# always passes.
#
# Usage: preflight-preview-schema-budget.sh <app-slug> <pr-number>
#
# See docs/dantotsus/dependabot-previews-filled-the-schema-quota.md.

set -euo pipefail

if [ "${1:-}" = "" ] || [ "${2:-}" = "" ]; then
  printf '[schema-budget] usage: %s <app-slug> <pr-number>\n' "$0" >&2
  exit 64
fi

APP_SLUG="$1"
PR_NUMBER="$2"
REGION="${AWS_REGION:-eu-west-3}"
REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_DEFINITION="${REPOSITORY_ROOT}/apps/${APP_SLUG}/cdk/lib/stack.ts"

DSQL_SCHEMAS_PER_DATABASE=10
SCHEMAS_OUTSIDE_PREVIEWS=1
PREVIEW_SCHEMA_BUDGET=$((DSQL_SCHEMAS_PER_DATABASE - SCHEMAS_OUTSIDE_PREVIEWS))

STATUSES_HOLDING_A_SCHEMA=(
  CREATE_IN_PROGRESS CREATE_COMPLETE
  UPDATE_IN_PROGRESS UPDATE_COMPLETE_CLEANUP_IN_PROGRESS UPDATE_COMPLETE
  UPDATE_ROLLBACK_IN_PROGRESS UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS
  UPDATE_ROLLBACK_COMPLETE UPDATE_ROLLBACK_FAILED
  DELETE_IN_PROGRESS DELETE_FAILED
)

log() { printf '[schema-budget] %s\n' "$*"; }

if [ ! -f "$STACK_DEFINITION" ] || ! grep -q 'database:' "$STACK_DEFINITION"; then
  log "${APP_SLUG} declares no database; no schema to budget"
  exit 0
fi

if ! command -v aws >/dev/null 2>&1; then
  log "aws CLI missing; skipping (assume local sandbox)"
  exit 0
fi

standing_stacks="$(aws cloudformation list-stacks \
  --region "$REGION" \
  --stack-status-filter "${STATUSES_HOLDING_A_SCHEMA[@]}" \
  --query 'StackSummaries[].StackName' \
  --output text | tr '\t' '\n')"

holders=()
while IFS= read -r stack; do
  if [[ ! "$stack" =~ ^${APP_SLUG}-pr-([0-9]+)$ ]]; then continue; fi
  holder="${BASH_REMATCH[1]}"
  if [ "$holder" = "$PR_NUMBER" ]; then
    log "${stack} already stands and keeps its schema; nothing new to allocate"
    exit 0
  fi
  holders+=("$holder")
done <<<"$standing_stacks"

log "${APP_SLUG}: ${#holders[@]} of ${PREVIEW_SCHEMA_BUDGET} preview schemas taken"
if (( ${#holders[@]} < PREVIEW_SCHEMA_BUDGET )); then
  exit 0
fi

describe_pull_request() {
  local number="$1"
  if command -v gh >/dev/null 2>&1 &&
    gh pr view "$number" --json state,author,title \
      --template "{{.state}} by {{.author.login}}: {{.title}}" 2>/dev/null; then
    return
  fi
  printf 'state unknown'
}

printf '::error::%s cannot take a schema for PR #%s: its DSQL cluster allows %s and every preview slot is held.\n' \
  "$APP_SLUG" "$PR_NUMBER" "$DSQL_SCHEMAS_PER_DATABASE"
for holder in "${holders[@]}"; do
  printf '  #%s  %s\n' "$holder" "$(describe_pull_request "$holder")"
done
printf 'Close a pull request above to free its schema; closing tears its preview down.\n'
exit 1
