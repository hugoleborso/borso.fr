---
date: 2026-08-09
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#40'
fix-commits: [1cf220368d, b507ea56d]
eradication-level: 2
eradication-paths: [scripts/install-repo-deps.sh, .husky/pre-push]
time-to-detect: months
tags: [tooling, hooks, session-start, actionlint, gates]
zone: scripts/install-repo-deps.sh
---

# One failed optional install silently dropped the four tools after it

## User impact

A push that changed two workflows went through without the workflow linter.
Every session that hit the same failure also started without agent-browser and
without the `/tmp/cdk.out` disk sweep, and nothing said so.

| | Seen | Expected |
| --- | --- | --- |
| Push changing `ci.yml` and `preview.yml` | `[pre-push] WARN: actionlint not installed — skipping.`, push accepted | actionlint runs on both workflows |
| Session start | No actionlint, no agent-browser, no disk sweep, no branch check, and no warning | Each tool installed, or a line naming the one missing |

Measured by running the installer by hand, which exited 1 at its second step.
After the fix, the same run installed `agent-browser 0.27.0` and actionlint
1.7.7.

## Causal chain

- The push went through with actionlint absent.
  - `pre-push` saw no `actionlint` binary and skipped the lint with a warning.
    - The installer had never reached its actionlint step. It aborted at step 2
      of eight:

      ```text
      [install-repo-deps] rtk not found; installing from rtk-ai/rtk install.sh
      [WARN] Redirect lookup failed, falling back to GitHub API...
      curl: (22) The requested URL returned error: 403
      [ERROR] Failed to get latest version (GitHub API may be rate-limited)
      ```

      - Step 2 ran rtk's upstream installer under the script's
        `set -euo pipefail`, and made rtk's absence fatal. Commit `836df5f48`
        (2026-05-01) wrote it:

        ```bash
        curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
        if ! command -v rtk >/dev/null 2>&1; then
          fail "rtk install completed but binary still not on PATH (~/.local/bin not in PATH?)."   ← ❌ an optional tool aborts the run
        fi
        ```

        - The installer behind a `raw.githubusercontent.com` URL resolves
          "latest" through the GitHub API, which the session proxy answers
          with 403 when rate-limited (Material).
        - The steps added after `pnpm install` by later commits, actionlint
          among them, were appended below this one, under the same `set -e`.

## Root cause of occurrence

*Thought rtk's upstream installer is one more download that works like
`pnpm install`, so its failure can be fatal, actually it queries the
rate-limited GitHub API for the latest version, and rtk is a token-saving
proxy whose absence breaks nothing.* (Material)

The agent that wrote `836df5f48` saw only a `raw.githubusercontent.com` URL.
The API call lives inside the upstream script, and its own error names it:
"Failed to get latest version (GitHub API may be rate-limited)". The commit's
own header listed rtk under "Installs", beside pnpm, with no line on which
steps the session can live without.

## Detection failure causes

- **SessionStart hook:** its exit code reaches no gate. A non-zero exit shows
  nowhere a person or an agent looks.
- **The banner:** it surfaces stdout only, and `fail()` wrote to stderr. The
  first session after the fix showed no WARN line until the warnings moved to
  stdout (observed by the first version of this entry).
- **pre-push:** it treated a missing actionlint as "not always installed", the
  same on a push that changes a workflow as on one that does not.
- **Each consumer:** the rtk hook passed commands through, the visual
  validator reported a FAIL row, `pre-push` warned. Each degraded alone, so
  none pointed at the installer.

## Countermeasure

Commit [`1cf220368d`](https://github.com/hugoleborso/borso.fr/commit/1cf220368d)
runs each optional install on its own. A failure calls `note_missing`, which
prints one stdout warning naming what the absence costs, and the script
restates the list at the end. Required steps (`jq`, `pnpm`) still `fail`. The
installer then exited 0 with rtk still failing its 403, and every later step
ran.

## Eradication

**Type:** DevX check (level 2).

**Reference:** commit `1cf220368d` made `pre-push` refuse a push that changes a
workflow when actionlint is absent:

```bash
elif echo "$changed" | grep -q '^\.github/workflows/'; then
  echo "[pre-push] actionlint is not installed and this push changes a workflow." >&2
  exit 1
```

Commit [`b507ea56d`](https://github.com/hugoleborso/borso.fr/commit/b507ea56d)
(2026-10-29) then removed rtk from `scripts/install-repo-deps.sh`. The step that
queried the API is gone. actionlint downloads a pinned release,
`releases/download/v1.7.7/actionlint_1.7.7_…tar.gz`, and
`grep -c api.github.com scripts/install-repo-deps.sh` prints 0.

**Proof it can fail:** simulated against the branch's own diff with actionlint
absent, the gate listed `.github/workflows/ci.yml` and
`.github/workflows/preview.yml` and would refuse the push (first version of
this entry).

**Proposed:** subtract the class instead of collecting its failures. A
pre-commit grep on `scripts/install-repo-deps.sh` would refuse any
`api.github.com`, any `refs/heads/` and any `/latest` in a download URL. An
install could then not resolve a version over a rate-limited API, so this
failure could not recur for the next tool. Today agent-browser still falls back
to `agent-browser@latest` when no version is pinned (line 197).

**Similar instances:** `grep -n 'curl\|npm install -g' scripts/install-repo-deps.sh`
lists the downloads. The AWS CLI zip is unversioned but served by
`awscli.amazonaws.com`, not the GitHub API. The agent-browser fallback above is
the one left.
