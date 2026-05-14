#!/usr/bin/env bash
# One-shot migration: tear down the manually-managed CloudFront + S3 setup
# for borso.fr (apex) and borsouvertures.borso.fr, so the CDK stacks
# borso-fr-prod and borsouvertures-prod can take ownership on the next
# deploy. Pairs with the construct fix shipped in commit 3df59de.
#
# Scope, per the conversation that produced this script:
#   - borso.fr/coucou-mom/, /dtl/, /lucie/ are CUT (decision recorded
#     2026-05-14). The rest of borso.fr/ is rebuildable from
#     apps/borso-fr/site/ and gets overwritten by the CDK redeploy.
#   - The manual ACM certs and the WAF web ACL go with their distributions.
#   - The two CDK certs (6937bd95 borso.fr + *.borso.fr, 54817a97
#     *.preview.borso.fr) are preserved.
#
# Not scriptable, must be done by hand in the AWS console before this
# script can finish phase 4:
#   - Cancel the CloudFront security protections subscription on each
#     distribution. The marketplace subscription has no public CLI for
#     cancellation as of 2026-05; until cancelled, `update-distribution`
#     rejects `Enabled=false` with `IllegalUpdate`.
#
# Run pattern:
#   1. aws sso login --profile borso-admin
#   2. AWS_PROFILE=borso-admin scripts/migrate-static-sites-to-cdk.sh status
#   3. AWS_PROFILE=borso-admin scripts/migrate-static-sites-to-cdk.sh phase 2 --apply
#   4. … repeat per phase, reviewing dry-run output first
#   5. Approve the prod deploy in GitHub Actions (separate, manual)
#   6. AWS_PROFILE=borso-admin scripts/migrate-static-sites-to-cdk.sh phase 6
#
# After the migration lands, delete this file — it's one-shot.

set -euo pipefail

# --- Configuration (verified against live state on 2026-05-14) -------------

HOSTED_ZONE_ID="Z01522742V0MX7BURAOTW"
CLOUDFRONT_ALIAS_HOSTED_ZONE_ID="Z2FDTNDATAQYW2"   # well-known constant
ACCOUNT_ID="756586757578"

DIST_BORSOUV_MANUAL="E3FBJN6J1RYNTS"
DIST_APEX_MANUAL="E80907R476ZAJ"

BUCKET_APEX_MANUAL="borso.fr"
BUCKET_BORSOUV_MANUAL="borsouvertures.borso.fr"
BUCKET_BORSOUV_ORPHAN="borsouvertures-prod"

CERT_BORSOUV_MANUAL="arn:aws:acm:us-east-1:${ACCOUNT_ID}:certificate/f20373f4-a877-4236-994e-58c0a60da3e7"
CERT_APEX_MANUAL="arn:aws:acm:us-east-1:${ACCOUNT_ID}:certificate/8edea95e-6802-4243-87c8-a565c53532b6"

CUT_PREFIXES=(coucou-mom/ dtl/ lucie/)

# --- Output helpers --------------------------------------------------------

RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
BLUE=$'\033[34m'
DIM=$'\033[2m'
RESET=$'\033[0m'

info()    { printf '%s[migrate]%s %s\n' "$BLUE" "$RESET" "$*"; }
ok()      { printf '%s[migrate ok]%s %s\n' "$GREEN" "$RESET" "$*"; }
warn()    { printf '%s[migrate warn]%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
fail()    { printf '%s[migrate fail]%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }
dry()     { printf '%s[dry-run]%s would run: %s%s%s\n' "$DIM" "$RESET" "$DIM" "$*" "$RESET"; }

# `apply <cmd...>` runs the command in --apply mode, otherwise prints it.
APPLY=0
apply() {
  if [ "$APPLY" -eq 1 ]; then
    "$@"
  else
    dry "$*"
  fi
}

# --- Phase 0: state probe (read-only) --------------------------------------

phase_status() {
  info "Account: $(aws sts get-caller-identity --query Arn --output text 2>/dev/null || echo '<not authenticated>')"

  for dist in "$DIST_BORSOUV_MANUAL" "$DIST_APEX_MANUAL"; do
    if out=$(aws cloudfront get-distribution --id "$dist" --query 'Distribution.[Status,DistributionConfig.Enabled]' --output text 2>/dev/null); then
      read -r status enabled <<<"$out"
      info "Distribution $dist: Status=$status Enabled=$enabled"
    else
      info "Distribution $dist: (already deleted)"
    fi
  done

  for bucket in "$BUCKET_APEX_MANUAL" "$BUCKET_BORSOUV_MANUAL" "$BUCKET_BORSOUV_ORPHAN"; do
    if count=$(aws s3api list-objects-v2 --bucket "$bucket" --query 'length(Contents || `[]`)' --output text 2>/dev/null); then
      info "Bucket s3://$bucket: $count objects"
    else
      info "Bucket s3://$bucket: (already deleted)"
    fi
  done

  for cert in "$CERT_BORSOUV_MANUAL" "$CERT_APEX_MANUAL"; do
    if aws acm describe-certificate --certificate-arn "$cert" --region us-east-1 --query 'Certificate.Status' --output text 2>/dev/null >/dev/null; then
      info "Cert ${cert##*/}: present"
    else
      info "Cert ${cert##*/}: (already deleted)"
    fi
  done

  info "Route53 records on $HOSTED_ZONE_ID candidate for cleanup (NS/SOA omitted — they stay):"
  aws route53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --output json \
    | jq -r '.ResourceRecordSets[]
        | select(.Type != "NS" and .Type != "SOA")
        | select(.Name | test("^borso\\.fr\\.borso\\.fr\\.$|^borso\\.fr\\.$|^borsouvertures\\.borso\\.fr\\.$|^_8187|^_9215"))
        | "  " + .Type + "  " + .Name'
}

# --- Phase 2: apex content cuts --------------------------------------------

phase_cuts() {
  if ! aws s3api head-bucket --bucket "$BUCKET_APEX_MANUAL" >/dev/null 2>&1; then
    ok "bucket s3://$BUCKET_APEX_MANUAL already gone — nothing to cut."
    return
  fi
  for prefix in "${CUT_PREFIXES[@]}"; do
    info "Cutting s3://$BUCKET_APEX_MANUAL/$prefix"
    apply aws s3 rm "s3://$BUCKET_APEX_MANUAL/$prefix" --recursive --only-show-errors
  done
  ok "phase 2 done (cuts)"
}

# --- Phase 3: DNS teardown -------------------------------------------------
#
# Builds the change batch from live R53 state (not hardcoded values), so
# TTLs / AliasTarget fields always match. Records to delete:
#   - A   borso.fr.                      (manual, points at the manual apex distribution)
#   - A   borsouvertures.borso.fr.       (manual, points at the manual borsouvertures distribution)
#   - A / AAAA borso.fr.borso.fr.        (phantom records from the CDK bug fixed in 3df59de)
#   - CNAME _81870…borso.fr.             (ACM validation for the manual apex cert)
#   - CNAME _92153…borsouvertures…       (ACM validation for the manual borsouvertures cert)

phase_dns() {
  local records_to_delete='[
    "borso.fr.|A",
    "borsouvertures.borso.fr.|A",
    "borso.fr.borso.fr.|A",
    "borso.fr.borso.fr.|AAAA",
    "_81870a5cfcaf28718bb9604cceb721b8.borso.fr.|CNAME",
    "_92153acc570a312a88b74d52cc750b26.borsouvertures.borso.fr.|CNAME"
  ]'

  local changes
  changes=$(
    aws route53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --output json \
      | jq --argjson targets "$records_to_delete" '
          [ .ResourceRecordSets[]
            | . as $rrs
            | select(
                ($targets | map(split("|")) | map({name: .[0], type: .[1]}))
                | any(.name == $rrs.Name and .type == $rrs.Type)
              )
            | { Action: "DELETE", ResourceRecordSet: . }
          ]
          | { Changes: . }
        '
  )

  local count
  count=$(printf '%s' "$changes" | jq '.Changes | length')
  if [ "$count" -eq 0 ]; then
    ok "no manual / phantom records left in $HOSTED_ZONE_ID — phase 3 already done."
    return
  fi
  info "Phase 3 will DELETE $count R53 records:"
  printf '%s' "$changes" | jq -r '.Changes[].ResourceRecordSet | "  " + .Type + "  " + .Name'

  if [ "$APPLY" -eq 1 ]; then
    local tmp
    tmp=$(mktemp)
    printf '%s' "$changes" > "$tmp"
    aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "file://$tmp" >/dev/null
    rm -f "$tmp"
    ok "phase 3 done (DNS teardown). NXDOMAIN window now open on apex + borsouvertures."
  else
    info "change batch that would be sent (review then re-run with --apply):"
    printf '%s\n' "$changes" | jq .
  fi
}

# --- Phase 4: distributions + WAF + buckets + certs ------------------------

disable_and_wait() {
  local dist_id=$1
  local etag config

  if ! aws cloudfront get-distribution-config --id "$dist_id" --output json > /tmp/dist-config-"$dist_id".json 2>/dev/null; then
    ok "distribution $dist_id already deleted."
    return 1
  fi

  etag=$(jq -r .ETag /tmp/dist-config-"$dist_id".json)
  local enabled
  enabled=$(jq -r .DistributionConfig.Enabled /tmp/dist-config-"$dist_id".json)

  if [ "$enabled" = "false" ]; then
    info "distribution $dist_id already disabled; waiting for Deployed status…"
  else
    info "disabling distribution $dist_id (current Enabled=$enabled)…"
    if [ "$APPLY" -eq 1 ]; then
      jq '.DistributionConfig.Enabled = false | .DistributionConfig' /tmp/dist-config-"$dist_id".json > /tmp/dist-config-"$dist_id".disabled.json
      aws cloudfront update-distribution --id "$dist_id" --if-match "$etag" \
        --distribution-config "file:///tmp/dist-config-${dist_id}.disabled.json" >/dev/null \
        || fail "update-distribution refused (Subscription still active? Cancel it in the console first.)"
    else
      dry "aws cloudfront update-distribution --id $dist_id --enabled=false"
      return 0
    fi
  fi

  info "waiting for $dist_id Status=Deployed (this can take up to 15 min)…"
  apply aws cloudfront wait distribution-deployed --id "$dist_id"
}

# ACM's InUseBy lags behind CloudFront's delete-distribution by up to a
# couple of minutes (eventual consistency on the cross-service join).
# Poll until empty before attempting delete, capped at ~3 min.
delete_cert_when_unused() {
  local cert=$1
  local short=${cert##*/}

  if ! aws acm describe-certificate --certificate-arn "$cert" --region us-east-1 >/dev/null 2>&1; then
    ok "cert $short already gone."
    return
  fi

  local attempt in_use
  for attempt in 1 2 3 4 5 6 7 8 9; do
    in_use=$(aws acm describe-certificate --certificate-arn "$cert" --region us-east-1 \
      --query 'length(Certificate.InUseBy)' --output text)
    if [ "$in_use" = "0" ]; then
      info "deleting cert $short"
      apply aws acm delete-certificate --certificate-arn "$cert" --region us-east-1
      return
    fi
    if [ "$APPLY" -eq 0 ]; then
      warn "cert $short still InUseBy $in_use — in --apply mode the script polls; here it just notes and moves on."
      return
    fi
    info "cert $short still InUseBy $in_use distribution(s); sleeping 20s (attempt $attempt/9)…"
    sleep 20
  done
  fail "cert $short never became unused after 3 min — investigate which distribution still references it."
}

phase_teardown() {
  for dist in "$DIST_BORSOUV_MANUAL" "$DIST_APEX_MANUAL"; do
    if disable_and_wait "$dist"; then
      local etag
      etag=$(aws cloudfront get-distribution --id "$dist" --query 'ETag' --output text 2>/dev/null || true)
      if [ -n "$etag" ]; then
        info "deleting distribution $dist"
        apply aws cloudfront delete-distribution --id "$dist" --if-match "$etag"
      fi
    fi
  done

  info "scanning WAF web ACLs for the legacy CreatedByCloudFront-* one"
  local waf_json
  waf_json=$(aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1 --output json)
  local waf_name waf_id waf_lock
  while IFS=$'\t' read -r waf_name waf_id; do
    [ -z "$waf_name" ] && continue
    case "$waf_name" in
      CreatedByCloudFront-*)
        waf_lock=$(aws wafv2 get-web-acl --scope CLOUDFRONT --region us-east-1 --name "$waf_name" --id "$waf_id" --query LockToken --output text)
        info "deleting WAF $waf_name ($waf_id)"
        apply aws wafv2 delete-web-acl --scope CLOUDFRONT --region us-east-1 --name "$waf_name" --id "$waf_id" --lock-token "$waf_lock"
        ;;
    esac
  done <<<"$(printf '%s' "$waf_json" | jq -r '.WebACLs[] | [.Name, .Id] | @tsv')"

  for bucket in "$BUCKET_APEX_MANUAL" "$BUCKET_BORSOUV_MANUAL" "$BUCKET_BORSOUV_ORPHAN"; do
    if aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
      info "emptying + deleting s3://$bucket"
      apply aws s3 rm "s3://$bucket" --recursive --only-show-errors
      apply aws s3 rb "s3://$bucket"
    else
      ok "bucket s3://$bucket already gone."
    fi
  done

  for cert in "$CERT_BORSOUV_MANUAL" "$CERT_APEX_MANUAL"; do
    delete_cert_when_unused "$cert"
  done

  ok "phase 4 done (teardown). Run 'phase 5' next."
}

# --- Phase 5: preflight + reminder -----------------------------------------

# The generic preflight script can't tell "alias owned by the distribution we
# want" from "alias owned by an unrelated distribution". For this migration
# the answer is known: borso.fr SHOULD remain owned by E25779EK6PTEZ2 (CDK
# borso-fr-prod, already declared) and borsouvertures.borso.fr SHOULD be
# claimed by NO distribution (the CDK borsouvertures-prod stack will create
# it fresh on first deploy).
DIST_CDK_BORSO_FR="E25779EK6PTEZ2"

phase_preflight() {
  info "checking alias ownership against the expected post-cleanup state"

  local owners_borso_fr owners_borsouv
  owners_borso_fr=$(aws cloudfront list-distributions --output json \
    | jq -r '.DistributionList.Items[]
        | select((.Aliases.Items // []) | index("borso.fr"))
        | .Id' | sort -u | tr '\n' ' ')
  owners_borsouv=$(aws cloudfront list-distributions --output json \
    | jq -r '.DistributionList.Items[]
        | select((.Aliases.Items // []) | index("borsouvertures.borso.fr"))
        | .Id' | sort -u | tr '\n' ' ')

  local pass=1
  case "$(echo "$owners_borso_fr" | xargs)" in
    "$DIST_CDK_BORSO_FR") ok "borso.fr is owned solely by CDK distribution $DIST_CDK_BORSO_FR — expected." ;;
    "")                   warn "borso.fr is claimed by NO distribution. The CDK borso-fr-prod redeploy will create the alias." ;;
    *)                    warn "borso.fr is held by: '$owners_borso_fr' — expected only $DIST_CDK_BORSO_FR. Investigate."; pass=0 ;;
  esac
  case "$(echo "$owners_borsouv" | xargs)" in
    "") ok "borsouvertures.borso.fr is held by no distribution — ready for CDK first deploy." ;;
    *)  warn "borsouvertures.borso.fr is still held by: '$owners_borsouv'. Phase 4 didn't finish."; pass=0 ;;
  esac

  if [ "$pass" -eq 1 ]; then
    ok "preflight green. Now go approve the prod deploys in GitHub Actions:"
    info "  https://github.com/hugoleborso/borso.fr/actions"
    info "  (Two pending: borso-fr-prod redeploy + borsouvertures-prod first deploy.)"
  else
    fail "preflight not green — fix the warnings above before approving the deploys."
  fi
}

# --- Phase 6: post-deploy verification -------------------------------------

phase_verify() {
  info "DNS check"
  for host in borso.fr borsouvertures.borso.fr; do
    local result
    result=$(dig +short "$host" | head -3 | tr '\n' ' ')
    if [ -z "$result" ]; then
      warn "$host returned no answer (NXDOMAIN or propagation pending)"
    else
      ok "$host → $result"
    fi
  done

  info "HTTP check (HEAD)"
  for host in borso.fr borsouvertures.borso.fr; do
    local code
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "https://$host/" || echo 'ERR')
    case "$code" in
      200|301|302) ok "https://$host → $code" ;;
      *)           warn "https://$host → $code (expected 200/30x)" ;;
    esac
  done

  info "Sanity: CDK borso-fr-prod distribution has no WAF attached"
  local web_acl
  web_acl=$(aws cloudfront get-distribution --id E25779EK6PTEZ2 --query 'Distribution.DistributionConfig.WebACLId' --output text 2>/dev/null || echo '<missing>')
  if [ -z "$web_acl" ] || [ "$web_acl" = "None" ]; then
    ok "WebACLId empty — no managed-WAF cost."
  else
    warn "WebACLId=$web_acl on CDK distribution. Investigate."
  fi
}

# --- CLI dispatch ----------------------------------------------------------

usage() {
  cat <<EOF
Usage: $0 <command> [--apply]

Commands:
  status            Read-only state probe (always safe).
  phase 2           Cut /coucou-mom/, /dtl/, /lucie/ from s3://borso.fr.
  phase 3           Delete manual + phantom Route 53 records.
  phase 4           Disable + delete distributions, WAF, buckets, manual certs.
                    (Requires the console-side subscription cancellation first.)
  phase 5           Preflight aliases free + remind to approve CI deploys.
  phase 6           Post-deploy verify (DNS / HTTP / WAF-not-attached).

By default every phase runs in --dry-run mode. Pass --apply as the last
argument to actually mutate AWS state.

Run phases in order, reviewing dry-run output before each --apply.
EOF
}

main() {
  local cmd=${1:-help}
  shift || true

  for arg in "$@"; do
    case "$arg" in
      --apply) APPLY=1 ;;
    esac
  done

  case "$cmd" in
    status)   phase_status ;;
    phase)
      local phase=${1:-}
      case "$phase" in
        2) phase_cuts ;;
        3) phase_dns ;;
        4) phase_teardown ;;
        5) phase_preflight ;;
        6) phase_verify ;;
        *) usage; exit 1 ;;
      esac
      ;;
    help|-h|--help) usage ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
