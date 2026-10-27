#!/usr/bin/env bash
# Lint the whole repository with every rule, the type-aware ones included.
#
# oxlint reads .oxlintrc.json, runs its native rules in Rust, the custom rules
# under eslint-rules/ and the few upstream ESLint rules it has no faithful port
# of as JavaScript plugins, and hands the type-aware rules to tsgolint, which
# builds each tsconfig's program with the TypeScript 7 compiler. One process
# covers every workspace, where ESLint needed one process per workspace to stay
# under the heap limit. See
# docs/adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md.
#
# Warnings fail the run: `denyWarnings` is set in .oxlintrc.json, because a
# warning nobody has to clear is a rule that is off.

set -euo pipefail

cd "$(dirname "$0")/.."

# The type-aware rules resolve @borso/infra through its dist/, which a fresh
# worktree does not have; without it every cdk file reports unresolved types
# and nothing names the missing build.
scripts/ensure-infra-built.sh

exec node_modules/.bin/oxlint --type-aware "$@" .
