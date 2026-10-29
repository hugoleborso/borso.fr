#!/usr/bin/env bash
# The pre-commit hook, run on a fixture commit, inside its wall-clock budget.
#
# docs/standards/14-tool-runtime-budgets.md gives a commit 4 seconds. The
# hook enforces its per-check budget itself, on CPU time, because the machines
# it runs on are shared; what a person waits for is the wall-clock total, and
# that is only measurable where nothing else is running. So CI copies the tree,
# makes a commit that touches one file of every common kind — a component, an
# API source, a test, a manifest, a knowledge entry, a skill, a shell script
# and a workflow — and fails when the hook refuses it or takes longer than the
# budget.
#
# A typical commit touches one or two of those kinds, so this fixture is
# deliberately the heavy end of typical: most of the checks run at once.
#
# The hook used to state its budget in a comment and enforce nothing; a commit
# with nothing staged took 61 s. See
# docs/dantotsus/a-written-runtime-budget-nobody-enforced.md.
set -euo pipefail

cd "$(dirname "$0")/.."

TOTAL_BUDGET_MS=4000
FIXTURE_TEXT='A line the pre-commit runtime budget fixture adds.'
GIT_IDENTITY=(-c user.name=pre-commit-budget -c user.email=pre-commit-budget@localhost)

repository_root=$(pwd)
workspace=$(mktemp -d)
trap 'rm -rf "$workspace"' EXIT

if [ "$(date +%s%3N 2>/dev/null)" -gt 0 ] 2>/dev/null; then
  wall_clock_ms() { date +%s%3N; }
else
  wall_clock_ms() { perl -MTime::HiRes=time -e 'printf "%d", time * 1000'; }
fi

copy_tree() {
  git ls-files -z --cached --others --exclude-standard |
    while IFS= read -r -d '' path; do
      { [ -e "$path" ] || [ -L "$path" ]; } && printf '%s\0' "$path"
    done |
    tar --null -T - -cf - | tar -xf - -C "$workspace"
  for installed in node_modules apps/*/node_modules infra/*/node_modules; do
    [ -d "$installed" ] || continue
    ln -s "$repository_root/$installed" "$workspace/$installed"
  done
}

first_tracked() {
  git -C "$workspace" ls-files -- "$@" | { grep -v -E '/node_modules/' || true; } | sort | sed -n 1p
}

append_line() {
  printf '\n%s\n' "$2" >>"$workspace/$1"
}

add_manifest_field() {
  sed -i.bak '1a\
  "preCommitBudgetFixture": 1,' "$workspace/$1"
  rm -f "$workspace/$1.bak"
}

copy_tree
git -C "$workspace" init -q -b main
echo 'node_modules' >>"$workspace/.git/info/exclude"
git -C "$workspace" add -A
git -C "$workspace" "${GIT_IDENTITY[@]}" commit -q --no-verify -m 'pre-commit budget baseline'

component=$(first_tracked ':(glob)apps/*/site/src/components/atoms/*.tsx')
service=$(first_tracked ':(glob)apps/*/api/src/*/*.service.ts')
test_file=$(first_tracked ':(glob)apps/*/site/src/**/*.core.test.ts')
manifest=$(first_tracked ':(glob)apps/*/package.json')
knowledge=$(first_tracked ':(glob)docs/knowledge/*.md' ':!docs/knowledge/README.md')
skill=$(first_tracked ':(glob)plugins/borso-harness/skills/*/SKILL.md')
shell_script=$(first_tracked ':(glob)scripts/*.sh' ':!scripts/check-*')
workflow=$(first_tracked ':(glob).github/workflows/*.yml')

fixture=("$component" "$service" "$test_file" "$manifest" "$knowledge" "$skill" "$shell_script" "$workflow")
for path in "${fixture[@]}"; do
  if [ -z "$path" ]; then
    echo "[check-pre-commit-budget] a fixture kind matched no file — the tree changed shape and this check went blind" >&2
    exit 1
  fi
done

append_line "$component" 'export const preCommitBudgetFixture = 1;'
append_line "$service" 'export const preCommitBudgetFixture = 1;'
append_line "$test_file" 'export const preCommitBudgetFixture = 1;'
add_manifest_field "$manifest"
append_line "$knowledge" "$FIXTURE_TEXT"
append_line "$skill" "$FIXTURE_TEXT"
append_line "$shell_script" "# $FIXTURE_TEXT"
append_line "$workflow" "# $FIXTURE_TEXT"
git -C "$workspace" add -- "${fixture[@]}"

echo "[check-pre-commit-budget] fixture commit touches:"
printf '  %s\n' "${fixture[@]}"

# The hook runs on the fixture SAMPLES times and the median is judged. One run
# cannot tell a slower hook from a slower runner: on PR #197 the same commit
# measured 1.8 to 3.6 s on CI's runner, every check's CPU, untouched shell
# checks included, moving by the same factor, and a single 3553 ms sample failed
# a 3500 ms budget. The median of three ignores one disturbed run and still
# fails a hook that is slow twice. The hook writes nothing between runs, so
# each one measures the same work. See
# docs/dantotsus/one-sample-could-not-tell-the-hook-from-the-runner.md.
SAMPLES=3
samples_ms=()
for sample in $(seq 1 "$SAMPLES"); do
  started_ms=$(wall_clock_ms)
  set +e
  (cd "$workspace" && env -u CLAUDECODE PATH="$workspace/node_modules/.bin:$PATH" sh -e .husky/pre-commit)
  status=$?
  set -e
  elapsed_ms=$(($(wall_clock_ms) - started_ms))

  if [ "$status" -ne 0 ]; then
    echo "[check-pre-commit-budget] the hook refused the fixture commit (exit $status) after ${elapsed_ms} ms; its output above says which check" >&2
    exit 1
  fi
  echo "[check-pre-commit-budget] run $sample of $SAMPLES: ${elapsed_ms} ms"
  samples_ms+=("$elapsed_ms")
done

median_ms=$(printf '%s\n' "${samples_ms[@]}" | sort -n | sed -n "$(((SAMPLES + 1) / 2))p")
measured="a median of ${median_ms} ms over ${SAMPLES} runs (${samples_ms[*]} ms)"

if [ "$median_ms" -gt "$TOTAL_BUDGET_MS" ]; then
  echo "[check-pre-commit-budget] the hook took ${measured} on the fixture commit, over the ${TOTAL_BUDGET_MS} ms budget in docs/standards/14-tool-runtime-budgets.md" >&2
  echo "  Narrow the slowest check above to the staged files, or move it to .husky/pre-push or ci.yml." >&2
  exit 1
fi

echo "[check-pre-commit-budget] the hook passed the fixture commit in ${measured}, within ${TOTAL_BUDGET_MS} ms"
