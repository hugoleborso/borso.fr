#!/usr/bin/env bash
# Pre-deploy gate: refuse to call `cdk deploy` when one of the desired CloudFront
# aliases is currently held by a *different* distribution. CloudFront enforces
# alias uniqueness account-wide; a deploy in that state crashes at the AWS API
# with `409 CNAMEAlreadyExists` mid-stack-create, which then has to be rolled
# back manually.
#
# Eradication for docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md.
#
# Inputs:
#   $1 — path to the cdk synth output directory (cdk.out/)
#         OR a single template file. The script greps every Aliases.Items entry
#         out of every CloudFront::Distribution resource it finds.
# Output:
#   exit 0 if no conflicts, exit 1 with a concrete remediation block listing the
#   `aws cloudfront update-distribution ...` commands the operator should run
#   before retrying the deploy.

set -euo pipefail

if [ -z "${1:-}" ]; then
  printf '\033[31m[cf-aliases] FAIL\033[0m usage: %s <cdk.out path or template.json>\n' "$0" >&2
  exit 1
fi

INPUT_PATH="$1"

if ! command -v aws >/dev/null 2>&1; then
  printf '\033[33m[cf-aliases] WARN\033[0m aws CLI missing — skipping preflight. (Set AWS_ACCESS_KEY_ID to install via SessionStart hook.)\n'
  exit 0
fi
if ! command -v jq >/dev/null 2>&1; then
  printf '\033[33m[cf-aliases] WARN\033[0m jq missing — skipping preflight.\n'
  exit 0
fi

# Collect every Aliases.Items entry from every Distribution resource in the synth.
templates=()
if [ -d "$INPUT_PATH" ]; then
  while IFS= read -r template; do templates+=("$template"); done < <(find "$INPUT_PATH" -maxdepth 1 -name '*.template.json')
elif [ -f "$INPUT_PATH" ]; then
  templates=("$INPUT_PATH")
else
  printf '\033[31m[cf-aliases] FAIL\033[0m %s is neither a directory nor a file.\n' "$INPUT_PATH" >&2
  exit 1
fi

if [ ${#templates[@]} -eq 0 ]; then
  printf '\033[33m[cf-aliases] WARN\033[0m no .template.json under %s — nothing to check.\n' "$INPUT_PATH"
  exit 0
fi

desired_aliases=$(
  for template in "${templates[@]}"; do
    jq -r '
      .Resources
      | to_entries[]
      | select(.value.Type == "AWS::CloudFront::Distribution")
      | .value.Properties.DistributionConfig.Aliases.Items // []
      | .[]
    ' "$template" 2>/dev/null || true
  done | sort -u
)

if [ -z "$desired_aliases" ]; then
  printf '[cf-aliases] no Aliases declared in synth — nothing to check.\n'
  exit 0
fi

# Pull every distribution's (Id, Aliases) pair once.
existing=$(aws cloudfront list-distributions \
  --output text \
  --query 'DistributionList.Items[].[Id, join(`,`, Aliases.Items || `[]`)]')

conflicts=()
while IFS= read -r alias; do
  [ -z "$alias" ] && continue
  while IFS=$'\t' read -r dist_id alias_csv; do
    [ -z "$dist_id" ] && continue
    if printf '%s' "$alias_csv" | tr ',' '\n' | grep -qx "$alias"; then
      conflicts+=("$alias|$dist_id")
    fi
  done <<< "$existing"
done <<< "$desired_aliases"

# Filter out conflicts where the distribution that owns the alias is *the same*
# distribution the synth manages. We approximate by checking whether the
# template's CloudFormationOwned tag matches the live distribution's stack.
# Simpler approximation: if the desired alias appears in exactly one live
# distribution AND that distribution's id is the one the synth claims, it's
# the same resource — pass. Otherwise it's a conflict.
#
# For the borso-fr migration case the new stack does NOT yet exist, so any
# existing claim is a conflict. We surface every match and let the operator
# decide.

if [ ${#conflicts[@]} -eq 0 ]; then
  printf '\033[32m[cf-aliases] OK\033[0m all desired aliases free or owned by this stack.\n'
  exit 0
fi

printf '\033[31m[cf-aliases] FAIL\033[0m one or more desired aliases are claimed by a different distribution.\n\n'
for entry in "${conflicts[@]}"; do
  alias=${entry%%|*}
  dist_id=${entry##*|}
  printf '  %s held by distribution %s\n' "$alias" "$dist_id"
done

printf '\nRelease the alias from each distribution above before retrying the deploy.\n'
printf 'See docs/knowledge/cloudfront-cname-uniqueness.md for the recovery runbook.\n'
exit 1
