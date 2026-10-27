#!/usr/bin/env bash
# Every job in ci.yml stops at ten minutes.
#
# docs/standards/14-tool-runtime-budgets.md gives a pull request's CI ten
# minutes. The jobs run side by side, so the run takes as long as its slowest
# job, and a job that cannot outlive the budget is the budget, enforced by the
# runner itself. GitHub's default is six hours, so a job with no
# `timeout-minutes` has no budget at all, and the gate-canaries job carried
# ninety minutes for as long as it existed.
#
# See docs/dantotsus/a-written-runtime-budget-nobody-enforced.md.
set -euo pipefail

cd "$(dirname "$0")/.."

WORKFLOW=.github/workflows/ci.yml
BUDGET_MINUTES=10

problems=$(
  awk -v budget="$BUDGET_MINUTES" '
    function close_job() {
      if (job == "") return
      if (timeout == "") print job " declares no timeout-minutes, so GitHub gives it six hours"
      else if (timeout + 0 > budget) print job " may run " timeout " minutes, over the " budget " minute budget"
      job = ""
    }
    /^jobs:/ { in_jobs = 1; next }
    in_jobs && /^[^ #]/ { close_job(); in_jobs = 0 }
    in_jobs && /^  [A-Za-z0-9_-]+:[[:space:]]*$/ {
      close_job()
      job = $1
      sub(":", "", job)
      timeout = ""
      next
    }
    in_jobs && /^    timeout-minutes:/ {
      timeout = $2
    }
    END { close_job() }
  ' "$WORKFLOW"
)

if [ -n "$problems" ]; then
  while IFS= read -r problem; do
    echo "[check-ci-job-timeouts] $WORKFLOW: $problem" >&2
  done <<<"$problems"
  echo "[check-ci-job-timeouts] Give the job timeout-minutes: $BUDGET_MINUTES or less. A job that needs longer is a job to split or narrow, not to exempt." >&2
  exit 1
fi

echo "[check-ci-job-timeouts] every job in $WORKFLOW stops within $BUDGET_MINUTES minutes"
