#!/usr/bin/env bash
# Prints the OIDC `sub` prefix a repository's GitHub Actions tokens carry, and the
# `subjectFormat` that githubActionsPrincipal needs to trust it. With --record, also
# writes the prefix to infra/shared/oidc-subject-prefixes.json, which the shared-stack
# test checks every deploy role's trust against.
#
# The prefix is a per-repository setting (immutable subjects use owner and repository
# ids), so it cannot be inferred from the repository name.
# Eradication for docs/dantotsus/a-role-that-trusted-a-subject-talos-never-sends.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RECORD_FILE="$REPO_ROOT/infra/shared/oidc-subject-prefixes.json"

usage() {
  printf 'usage: %s <owner/repo> [--record]\n' "$0" >&2
  exit 1
}

repository="${1:-}"
record="${2:-}"
[[ "$repository" =~ ^[^/]+/[^/]+$ ]] || usage
[[ -z "$record" || "$record" == "--record" ]] || usage

for tool in gh jq; do
  command -v "$tool" >/dev/null 2>&1 || {
    printf '\033[31m[oidc-subject] FAIL\033[0m %s is required.\n' "$tool" >&2
    exit 1
  }
done

customization="$(gh api "repos/$repository/actions/oidc/customization/sub")"
identity="$(gh api "repos/$repository" --jq '{owner: .owner.login, name: .name, ownerId: .owner.id, repositoryId: .id}')"

if [ "$(jq -r '.use_default' <<<"$customization")" != "true" ]; then
  printf '\033[31m[oidc-subject] FAIL\033[0m %s uses a custom claim template, which githubActionsPrincipal cannot express:\n%s\n' \
    "$repository" "$customization" >&2
  exit 1
fi

prefix="$(jq -r '.sub_claim_prefix' <<<"$customization")"
owner="$(jq -r '.owner' <<<"$identity")"
name="$(jq -r '.name' <<<"$identity")"
owner_id="$(jq -r '.ownerId' <<<"$identity")"
repository_id="$(jq -r '.repositoryId' <<<"$identity")"

if [ "$(jq -r '.use_immutable_subject' <<<"$customization")" == "true" ]; then
  expected="repo:$owner@$owner_id/$name@$repository_id"
  format="{ kind: 'immutable', ownerId: $owner_id, repositoryId: $repository_id }"
else
  expected="repo:$owner/$name"
  format="{ kind: 'name' }"
fi

if [ "$prefix" != "$expected" ]; then
  printf '\033[31m[oidc-subject] FAIL\033[0m GitHub reports the prefix %s, but githubActionsPrincipal would build %s.\n' \
    "$prefix" "$expected" >&2
  exit 1
fi

printf 'sub prefix:    %s\n' "$prefix"
printf 'subjectFormat: %s\n' "$format"

if [ "$record" == "--record" ]; then
  updated="$(jq --sort-keys --arg repository "$owner/$name" --arg prefix "$prefix" \
    '.[$repository] = $prefix' "$RECORD_FILE")"
  printf '%s\n' "$updated" >"$RECORD_FILE"
  printf 'recorded in    %s\n' "${RECORD_FILE#"$REPO_ROOT"/}"
fi
