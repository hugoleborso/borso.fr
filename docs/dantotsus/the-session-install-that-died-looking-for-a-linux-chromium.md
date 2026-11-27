---
date: 2026-10-27
introduced-at: implementation
detected-at: local
severity: high
related-pr: none (f6463f607 was pushed to main without a pull request)
fix-commits: [1cf220368, c54e32da7, 458e886c4]
eradication-level: 4
eradication-paths: [scripts/install-repo-deps.sh, scripts/hooks/checks/session-start.core.ts, scripts/browser/playwright-browsers.sh]
time-to-detect: weeks
tags: [harness, hooks, sandbox, tooling, meta, gates]
zone: scripts/install-repo-deps.sh
weak-point: gate-measures-nothing
recurs: [cdk-destroy-failure-swallowed-by-trailing-or-echo]
---

# The session install that died looking for a Linux Chromium

## User impact

Every Claude session on the operator's Mac, for weeks. Sessions in the Linux sandbox were not affected.

| | Seen | Expected |
| --- | --- | --- |
| A commit from a Mac session | Pre-commit refused it: "this Claude Code session never ran borso.fr's .claude hooks. Its project folder is not this clone" | The commit goes through. The folder was this clone, and the hooks had printed all session |
| Running the acknowledgement the message asked for | The install printed its steps, exited 1 with no message, recorded nothing, and the next commit was refused again | The acknowledgement records the session and the refusal stops |
| Every Mac session, silently | No blueprint lookups, no reminder of unswept `KAIZEN.md` entries, no stale-branch check | All of these run at session start |

Measured by the session that hit the refusal on 2026-10-27.

## Causal chain

- Pre-commit refused the commit as coming from a session that never ran the hooks.
  - `check-claude-harness-active.sh` looked for the session marker in the git directory and found none.
    - Only `session-start.sh` wrote the marker, with `--record`, after running `install-repo-deps.sh`.
      - `session-start.sh` ran under `set -euo pipefail`, and the install exited 1, so `--record` never ran.
        - `install-repo-deps.sh` also ran under `set -euo pipefail`. Its agent-browser block probed for a Chromium in `/opt/pw-browsers`, a path that exists in the Linux sandbox and on no Mac. `find` exited 1 on the missing folder, `pipefail` gave that status to the assignment, and `set -e` ended the script. ← the faulty line

          ```bash
          browsers_root="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
          # exits 1 when browsers_root does not exist; 2>/dev/null hides only the message
          chromium_binary=$(find "$browsers_root" -maxdepth 3 -type f -name chrome -path '*chrome-linux*' 2>/dev/null | sort | tail -n1)
          ```

          - An agent wrote the block in `f6463f607` ("point agent-browser at the browser the container ships"). Its message says the block is "a no-op on a machine that has no Playwright browsers directory" and was "verified end to end", in the container, where the folder exists.
            - The same file already wrote `2>/dev/null || true` on the `find /tmp … cdk.out*` sweep, and `|| true` on the other optional steps (measured, `git show f6463f607^:scripts/install-repo-deps.sh`). The safe pattern sat in the agent's context and the new line left it out.
              - **Machine:** the script was one `set -e` chain. Each optional step was safe only if its own line remembered `|| true`, and everything after it, the marker included, depended on every line remembering.

## Root cause of occurrence

*Thought a `find` whose stderr goes to `/dev/null` is a quiet probe that returns nothing when the folder is missing, actually `find` exits 1 on a missing start path, and under `pipefail` and `set -e` that status ends the script.* **Man**, under the agentic rule: the correct `|| true` pattern was on the other optional steps of the same file, so the right example was in context and the prior won.

Measured this session: `bash -c 'set -o pipefail; x=$(find /nonexistent-dir -type f 2>/dev/null | sort | tail -n1); echo "status=$?"'` prints `status=1`. The `2>/dev/null` hides the message and keeps the status.

Below the belief sits the Machine condition in the chain. One forgotten `|| true` anywhere in a single `set -e` script took every later step with it. The same class came back later. A GitHub 403 on one tool download "took every later step with it" (quoted from the comment `1cf220368` added at `scripts/install-repo-deps.sh:25-31`).

## Detection failure causes

- **Linter:** `shellcheck` does not flag a pipeline whose first command may fail. The `2>/dev/null` looks deliberate, because it is.
- **Local validation:** the commit was verified only in the container, where `/opt/pw-browsers` exists and `find` returns 0.
- **CI:** CI runs on Linux, where the folder exists. The failing platform had no CI.
- **Monitoring:** SessionStart output was not shown unless something asked for it. The install's last visible line, `actionlint: 1.7.7`, read as success, so an exit 1 looked like completion.
- **The gate that caught it:** it saw the missing marker weeks later, because it was the first mechanism that depended on the install reaching its last line. It then named the wrong cause, a session attached to another repository, and its suggested fix exited 1 at the same place.

## Countermeasure

`02c715dc5` (#202) appended `|| true` to the probe. Measured after the fix: the install exited 0, ran the four steps after it, and `--acknowledge` wrote the marker.

## Eradication

**Type:** detection (level 4)

What holds today, by commit:

- `c54e32da7` (#224) deleted the agent-browser probe and the marker gate `check-claude-harness-active.sh`. Nothing records a marker any more, so no step's failure can erase one.
- `1cf220368` made each optional step of `scripts/install-repo-deps.sh` report its own failure through `note_missing` and carry on. The run restates every missing tool at the end, on stdout, which the banner shows.
- `458e886c4` moved SessionStart to `scripts/hooks/checks/session-start.core.ts`. When the install exits non-zero, `reportOutput` puts its stdout and stderr in the agent's context. `session-start.core.test.ts` covers that case (`status: 1`, `stderr: 'ERROR: no pnpm\n'`). A failed install is no longer silent.
- `scripts/browser/playwright-browsers.sh`, the one remaining `/opt/pw-browsers` probe, tests the folder first: `[ -d "$IMAGE_BROWSERS" ] || exit 0`.

This is detection, not impossibility. A new step written under `set -e` without `||` still ends the install. The difference is that the agent now reads the failure at the top of its session.

**Proposed:** run each step of `scripts/install-repo-deps.sh` through one function, such as `optional_step <name> <command…>`, that wraps the command and calls `note_missing` on failure, and add a check to `scripts/lint-repository.sh` that refuses a bare command between the setup block and the summary. A step that can end the run would then have to be written as `fail`, on purpose.

**Proof it can fail:** `session-start.core.test.ts` asserts that a failing install with `stderr: 'ERROR: no pnpm\n'` returns that text as context.

**Similar instances:** `grep -n "find " scripts/install-repo-deps.sh scripts/browser/*.sh` prints the `/tmp` sweep, which carries `|| true`, and the `newest_build` helper in `playwright-browsers.sh`, which runs only after the `-d` test. See also [`cdk-destroy-failure-swallowed-by-trailing-or-echo.md`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md) for the opposite failure, a status swallowed when it mattered.
