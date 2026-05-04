#!/usr/bin/env bash
# Pre-deploy gate: refuse to call `cdk deploy` when one of the desired S3 bucket
# names (literal `bucketName` on a CDK Bucket) already exists in the account
# *and* is not part of any CloudFormation stack — i.e. it is an orphan from a
# previous failed deploy that retained the bucket.
#
# Eradication for docs/dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md.
#
# Inputs:
#   $1 — path to the cdk synth output directory (cdk.out/) OR a single
#         template.json file. The script walks every AWS::S3::Bucket resource
#         that declares an explicit BucketName.
# Output:
#   exit 0 if every desired bucket name is either free or owned by a live stack.
#   exit 1 with a remediation block listing the orphan buckets and the recovery
#   commands the operator should run before retrying the deploy.

set -euo pipefail

if [ -z "${1:-}" ]; then
  printf '\033[31m[orphan-buckets] FAIL\033[0m usage: %s <cdk.out path or template.json>\n' "$0" >&2
  exit 1
fi

INPUT_PATH="$1"

if ! command -v aws >/dev/null 2>&1; then
  printf '\033[33m[orphan-buckets] WARN\033[0m aws CLI missing — skipping preflight.\n'
  exit 0
fi
if ! command -v jq >/dev/null 2>&1; then
  printf '\033[33m[orphan-buckets] WARN\033[0m jq missing — skipping preflight.\n'
  exit 0
fi

templates=()
if [ -d "$INPUT_PATH" ]; then
  while IFS= read -r template; do templates+=("$template"); done < <(find "$INPUT_PATH" -maxdepth 1 -name '*.template.json')
elif [ -f "$INPUT_PATH" ]; then
  templates=("$INPUT_PATH")
else
  printf '\033[31m[orphan-buckets] FAIL\033[0m %s is neither a directory nor a file.\n' "$INPUT_PATH" >&2
  exit 1
fi

if [ ${#templates[@]} -eq 0 ]; then
  printf '\033[33m[orphan-buckets] WARN\033[0m no .template.json under %s — nothing to check.\n' "$INPUT_PATH"
  exit 0
fi

# Gather (stack-id, bucketName) pairs from every Bucket resource that pins a
# literal BucketName. Anonymous (CDK-named) buckets cannot collide so they are
# out of scope.
desired=$(
  for template in "${templates[@]}"; do
    stack_id=$(basename "$template" .template.json)
    jq -r --arg stack "$stack_id" '
      .Resources
      | to_entries[]
      | select(.value.Type == "AWS::S3::Bucket")
      | .value.Properties.BucketName
      | select(. != null and (type == "string"))
      | "\($stack)\t\(.)"
    ' "$template" 2>/dev/null || true
  done | sort -u
)

if [ -z "$desired" ]; then
  printf '[orphan-buckets] no Bucket resources with literal BucketName in synth — nothing to check.\n'
  exit 0
fi

orphans=()
while IFS=$'\t' read -r stack_id bucket_name; do
  [ -z "$bucket_name" ] && continue

  if ! aws s3api head-bucket --bucket "$bucket_name" >/dev/null 2>&1; then
    # Bucket name is free — no conflict.
    continue
  fi

  # Bucket exists. Is it owned by the target stack?
  owner_stack=$(
    aws cloudformation describe-stack-resources \
      --physical-resource-id "$bucket_name" \
      --output text \
      --query 'StackResources[0].StackName' 2>/dev/null || true
  )

  if [ "$owner_stack" = "$stack_id" ]; then
    # Bucket is part of the target stack — CFN will do an update, not a create.
    continue
  fi

  if [ -z "$owner_stack" ] || [ "$owner_stack" = "None" ]; then
    orphans+=("$bucket_name|$stack_id|orphan (no stack owns this bucket — leftover from a previous failed deploy)")
  else
    orphans+=("$bucket_name|$stack_id|owned by stack $owner_stack (different from target $stack_id)")
  fi
done <<< "$desired"

if [ ${#orphans[@]} -eq 0 ]; then
  printf '\033[32m[orphan-buckets] OK\033[0m every desired bucket is either free or owned by its target stack.\n'
  exit 0
fi

printf '\033[31m[orphan-buckets] FAIL\033[0m one or more desired bucket names are taken by orphan / cross-stack resources.\n\n'
for entry in "${orphans[@]}"; do
  bucket_name=${entry%%|*}
  rest=${entry#*|}
  stack_id=${rest%%|*}
  reason=${rest#*|}
  printf '  s3://%s — wanted by stack %s — %s\n' "$bucket_name" "$stack_id" "$reason"
done

printf '\nFor an orphan bucket from a previous failed deploy, the recovery is:\n'
printf '  aws s3api list-object-versions --bucket <name>   # confirm empty\n'
printf '  aws s3 rb s3://<name>                            # delete (only if empty)\n\n'
printf 'For a bucket owned by a different stack, decide whether to import it or to rename the new bucket.\n'
printf 'See docs/dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md for context.\n'
exit 1
