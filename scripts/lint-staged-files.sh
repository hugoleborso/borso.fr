#!/usr/bin/env bash
# Lint the files a commit stages with every rule, the type-aware ones and the
# unused-directive report included, without building a workspace's whole
# TypeScript program.
#
# tsgolint builds the program of the tsconfig.json nearest each file, so one
# staged pragma component cost the program of all of pragma: 5.2 s of wall time
# and 12.5 s of CPU, measured on 2026-10-27. This script lints from a temporary
# copy of the tree, made of symbolic links, where each touched workspace's
# tsconfig.json is replaced by one that extends the real file and lists only
# the staged files that the real file includes. tsgolint then builds a program
# of those files and what they import: 2.2 s and 4.5 s of CPU for the same
# component, with the same diagnostics.
#
# A staged TypeScript file its workspace's tsconfig.json does not include, such
# as a CDK stack or a vitest configuration, is not listed. tsgolint lints it in
# an inferred program of its own, as the whole-tree run in CI does, so the two
# runs report the same thing for it.
#
# With no TypeScript file staged there is no program to narrow, and the
# JavaScript files get the plain pass without type information. That pass
# turns the unused-directive report off: a directive naming a type-aware rule
# would read as unused there. See
# docs/knowledge/oxlint-without-type-aware-reads-type-aware-directives-as-unused.md.
#
# usage: scripts/lint-staged-files.sh <path>...   (paths relative to the root)

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

typescript_files=()
for path in "$@"; do
  case "$path" in
    *.ts | *.tsx | *.mts | *.cts) typescript_files+=("$path") ;;
  esac
done

if [ "${#typescript_files[@]}" -eq 0 ]; then
  exec node_modules/.bin/oxlint --report-unused-disable-directives-severity=off "$@"
fi

for path in "${typescript_files[@]}"; do
  case "$path" in
    apps/*/cdk/* | infra/shared/*)
      scripts/ensure-infra-built.sh
      break
      ;;
  esac
done

overlay="$(mktemp -d)"
cleanup() { rm -rf "$overlay"; }
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

# The folder holding the tsconfig.json tsgolint would pick for a path: its
# workspace under apps/ or infra/, or the root for the repository's tooling.
nearest_project() {
  local folder="$1"
  while [[ "$folder" == */* ]]; do
    folder="${folder%/*}"
    if [ -f "$folder/tsconfig.json" ]; then
      printf '%s' "$folder"
      return
    fi
  done
  printf '.'
}

shopt -s dotglob nullglob

# Turn a folder of the overlay that is a link into a real folder whose entries
# are links, so one file inside it can be replaced. One `ln` for all of them:
# a process per entry cost a third of a second on a two-core machine.
open_folder() {
  local target="$overlay/$1"
  [ -L "$target" ] || return 0
  rm "$target"
  mkdir "$target"
  ln -s "$root/$1"/* "$target"/
}

entries=()
for entry in "$root"/*; do
  case "$entry" in
    "$root/.git" | "$root/.oxlintrc.json") ;;
    *) entries+=("$entry") ;;
  esac
done
ln -s "${entries[@]}" "$overlay"/
cp "$root/.oxlintrc.json" "$overlay/.oxlintrc.json"

declare -A listed_by_project=()
for path in "$@"; do
  [ -f "$path" ] || continue
  project="$(nearest_project "$path")"
  listed_by_project[$project]+="$path"$'\n'
done

for project in "${!listed_by_project[@]}"; do
  configuration="$(cd "$project" && "$root/node_modules/.bin/tsc" -p tsconfig.json --showConfig)"
  entries=''
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    relative="${path#"$project"/}"
    if [[ "$configuration" == *"\"./$relative\""* ]]; then
      entries+="\"./$relative\","
    fi
  done <<<"${listed_by_project[$project]}"
  if [ "$project" != "." ]; then
    open_folder "${project%/*}"
    open_folder "$project"
  fi
  rm "$overlay/$project/tsconfig.json"
  printf '{"extends":"%s/tsconfig.json","include":[],"files":[%s]}\n' \
    "$root/$project" "${entries%,}" >"$overlay/$project/tsconfig.json"
done

# One oxlint run with every rule spends its time in two halves one after the
# other: the JavaScript plugins in node, then tsgolint. Measured on the
# fixture commit's three files under two cores on 2026-10-27, 2.3 s of wall
# time in one run against 1.7 s in two side by side, for the same CPU. So the
# configuration is split in two, every rule in exactly one half: the rules of
# the JavaScript plugins, and every native rule with the type-aware ones.
#
# tsgolint, the Go half, runs on two threads. On four it spent a third more
# CPU for no less wall time, because the other half and the commit's other
# checks want the cores too; on one, a commit touching four workspaces took
# 6 to 6.7 s, since it builds their programs one after the other, against
# 4.6 s on two. Measured on 2026-10-27 on a four-core machine other agents
# were also using.
#
# Each half reports a directive naming a rule of the other half as unused. A
# directive is unused only when both halves report it, so the report keeps the
# unused-directive lines the two runs share and every other line of either. A
# directive naming one rule of each half, one of them unused, prints a
# different message in each run, so it is dropped here and left to the
# whole-tree run in CI.
cd "$overlay"
node --input-type=module -e '
  import { readFileSync, writeFileSync } from "node:fs";
  const configuration = JSON.parse(readFileSync(".oxlintrc.json", "utf8"));
  const pluginNames = new Set(configuration.jsPlugins.map((plugin) => plugin.name));
  const pluginOf = (rule) => rule.split("/").slice(0, rule.startsWith("@") ? 2 : 1).join("/");
  const isPluginRule = (rule) => rule.includes("/") && pluginNames.has(pluginOf(rule));
  const keepRules = (rules, wantsPluginRules) =>
    Object.fromEntries(Object.entries(rules ?? {}).filter(([rule]) => isPluginRule(rule) === wantsPluginRules));
  const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
  const half = (wantsPluginRules, droppedKey) => ({
    ...without(configuration, droppedKey),
    rules: keepRules(configuration.rules, wantsPluginRules),
    overrides: configuration.overrides.map((override) => ({
      ...without(override, droppedKey),
      rules: keepRules(override.rules, wantsPluginRules),
    })),
  });
  writeFileSync(".oxlintrc.plugins.json", JSON.stringify({ ...half(true, "plugins"), plugins: [] }));
  writeFileSync(".oxlintrc.native.json", JSON.stringify(half(false, "jsPlugins")));
'

status=0
node_modules/.bin/oxlint -c .oxlintrc.plugins.json -f unix "$@" >plugins.out 2>&1 &
plugins_run=$!
GOMAXPROCS=2 node_modules/.bin/oxlint -c .oxlintrc.native.json --type-aware -f unix "$@" \
  >native.out 2>&1 ||
  native_status=$?
wait "$plugins_run" || plugins_status=$?

diagnostic='^[^ ]+:[0-9]+:[0-9]+: '
unused='^[^ ]+:[0-9]+:[0-9]+: Unused (eslint|oxlint)-disable'
for half in plugins native; do
  half_status_name="${half}_status"
  if [ "${!half_status_name:-0}" -ne 0 ] && ! grep -Eq "$diagnostic" "$half.out"; then
    echo "[lint-staged-files] the $half half of oxlint failed without a diagnostic:" >&2
    cat "$half.out" >&2
    status=2
  fi
done

{
  grep -Eh "$diagnostic" plugins.out native.out | grep -Ev "$unused" || true
  comm -12 <(grep -E "$unused" plugins.out | sort -u) <(grep -E "$unused" native.out | sort -u)
} | sort -t: -k1,1 -k2,2n -k3,3n -u >report.out

if [ -s report.out ]; then
  cat report.out
  echo "$(grep -c . report.out) problem(s) in the staged files"
  status=1
fi
exit "$status"
