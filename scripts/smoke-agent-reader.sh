#!/usr/bin/env bash
# Invoke an application's reader Lambda once, right after its production
# deploy, and fail when it does not answer with rows.
#
# This is the only thing in this repository that talks to Aurora DSQL from
# outside a deploy. Everything else mocks the driver, and a mock accepts every
# connection parameter, every transaction syntax and every role name — so the
# whole class of "only a real cluster can refuse this" lands at the first
# invocation of a deployed function and nowhere earlier. SELECT 1 exercises the
# connection parameters, the read-only transaction, the role mapping and every
# environment variable the construct set.
#
# An application with no reader exits 0: the stack publishes no function name,
# which is the normal state for the three applications ADR-0049 does not cover.
set -euo pipefail

APP="${1:?usage: smoke-agent-reader.sh <app> [stage]}"
STAGE="${2:-prod}"
REGION="${AWS_REGION:-eu-west-3}"
FUNCTION_NAME_OUTPUT='AgentReaderFunctionName'
SMOKE_QUERY='SELECT 1 AS reader_alive'

function_name="$(aws cloudformation describe-stacks \
  --stack-name "${APP}-${STAGE}" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='${FUNCTION_NAME_OUTPUT}'].OutputValue | [0]" \
  --output text 2>/dev/null || true)"

if [ -z "$function_name" ] || [ "$function_name" = "None" ]; then
  printf '[smoke-agent-reader] %s %s publishes no %s; nothing to smoke.\n' \
    "$APP" "$STAGE" "$FUNCTION_NAME_OUTPUT"
  exit 0
fi

response="$(mktemp)"
trap 'rm -f "$response"' EXIT

invocation="$(aws lambda invoke \
  --function-name "$function_name" --region "$REGION" \
  --cli-binary-format raw-in-base64-out \
  --payload "$(jq -nc --arg query "$SMOKE_QUERY" '{query: $query}')" \
  --output json "$response")"

payload="$(cat "$response")"

if jq -e '.FunctionError // empty' >/dev/null 2>&1 <<<"$invocation"; then
  printf '[smoke-agent-reader] %s: the reader function threw.\n  %s\n' "$APP" "$payload"
  exit 1
fi

if jq -e '.refused // empty' >/dev/null 2>&1 <<<"$payload"; then
  printf '[smoke-agent-reader] %s: the reader refused its own smoke query.\n  %s\n' \
    "$APP" "$(jq -r '.refused' <<<"$payload")"
  exit 1
fi

if ! jq -e '.rows | type == "array" and length == 1' >/dev/null 2>&1 <<<"$payload"; then
  printf '[smoke-agent-reader] %s: expected one row from %s, got:\n  %s\n' \
    "$APP" "$SMOKE_QUERY" "$payload"
  exit 1
fi

printf '[smoke-agent-reader] %s: %s answered as %s on schema %s\n' \
  "$APP" "$function_name" "$(jq -r '.role' <<<"$payload")" "$(jq -r '.schema' <<<"$payload")"
