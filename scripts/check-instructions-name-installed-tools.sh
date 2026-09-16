#!/usr/bin/env bash
# A skill cannot tell an agent to run a command this repository does not have.
#
# ADR-0007 replaced Biome with ESLint. The dependency went, the config went,
# the hooks were rewritten — and eleven files under `.claude/` went on telling
# an agent to run `pnpm exec biome lint`. One of them was the technical
# validator's own verdict table, where row B02 read *Biome lint clean* with
# that command as its check. An agent following it gets `command not found`
# and has to decide, alone and under a verdict it is supposed to be filling
# in, whether that means FAIL or UNVERIFIABLE. Four of them tripped on it over
# a month before anybody read the skill rather than ran it.
#
# Nothing broke, which is the point. Prose has no build step. A skill is read
# by a model that will try what it is told, so a stale instruction does not
# rot quietly — it spends an agent's turn and then makes it guess.
#
# So: every `pnpm exec X`, `npx X` and `node_modules/.bin/X` named in an
# instruction surface has to resolve in `node_modules/.bin`. It checks the
# actionable half — the command an agent will type — and says nothing about
# prose, which is where a retired tool is legitimately named: in the ADR that
# retired it, in the dantotsus written while it ran, in a standard explaining
# what replaced it.
#
# Requires an install. It skips itself with a stated reason when
# `node_modules/.bin` is absent, because a gate that fails on a fresh checkout
# is a gate someone deletes.
#
# See docs/dantotsus/the-skill-that-named-the-linter-the-repository-deleted.md.
set -euo pipefail

cd "$(dirname "$0")/.."

BIN_DIR="node_modules/.bin"

if [ ! -d "$BIN_DIR" ]; then
  echo "[check-instructions-name-installed-tools] skipped: $BIN_DIR is absent, so nothing resolves yet"
  exit 0
fi

INSTRUCTION_SURFACES=('.claude/*' 'docs/standards/*')

invocations="$(
  git ls-files "${INSTRUCTION_SURFACES[@]}" |
    grep -E '\.(md|sh)$' |
    xargs grep -onE '(pnpm exec|npx|node_modules/\.bin/) +[a-z@][a-zA-Z0-9@/._-]*' 2>/dev/null |
    sed -E 's|(pnpm exec\|npx\|node_modules/\.bin/) *| |' |
    sort -u
)"

failed=0

while IFS= read -r invocation; do
  [ -n "$invocation" ] || continue
  tool="${invocation##* }"
  location="${invocation% *}"
  location="${location%:}"
  if [ ! -e "${BIN_DIR}/${tool}" ]; then
    failed=1
    echo "[check-instructions-name-installed-tools] ${location}: names \`${tool}\`, which is not installed" >&2
  fi
done <<<"$invocations"

if [ "$failed" -ne 0 ]; then
  echo "[check-instructions-name-installed-tools] An instruction surface is read by an agent that" >&2
  echo "  will run what it is told. A command that does not exist costs it a turn and then makes" >&2
  echo "  it guess what the failure means. Either install the tool, or rewrite the instruction to" >&2
  echo "  name the one that replaced it. Naming a retired tool in prose is fine — this only reads" >&2
  echo "  invocations." >&2
  exit 1
fi

echo "[check-instructions-name-installed-tools] every tool an instruction tells an agent to run is installed"
