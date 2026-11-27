---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#327'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/browser/playwright-browsers.sh, scripts/hooks/checks/session-start.core.ts]
time-to-detect: minutes
tags: [harness, tooling, session-start, sandbox, visual-validation]
zone: scripts/hooks/checks/session-start.core.ts
recurs: [the-browser-was-on-disk-and-unreachable]
---

# The workspace Playwright asked for a Chromium the image never had

## User impact

The implementer of PR #327 wanted a screen check from a script. Its
`require('playwright')` from `apps/pragma` refused to launch, so the check
only ran from a script outside the repository that resolved the image's
global Playwright. Any repo script that calls `chromium.launch()` fails the
same way in a hosted session: `scripts/quality/check-dashboard-page.ts`,
`apps/borso-fr/scripts/screenshot.mjs` and the pragma task-speed driver
(found with `grep -rn chromium.launch scripts apps`).

| | Seen | Expected |
| --- | --- | --- |
| `require('playwright').chromium.launch()` from `apps/pragma` | `browserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1254/...` and "Please run `npx playwright install`" | a browser |

Reproduced on 2026-11-14 (measured).

## Causal chain

- `chromium.launch()` refuses.
  - The workspace resolves `playwright@1.65.0` (the catalog range `^1.64.1`),
    whose `browsers.json` asks for `chromium-headless-shell` revision 1254.
    - `/opt/pw-browsers` holds `chromium-1243` and
      `chromium_headless_shell-1243`, the builds of the image's global
      Playwright 1.63.0 under `/opt/node-tools`.
      - `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, and Playwright core
        reads no variable for an executable path (searched in
        `playwright-core@1.65.0/lib`: only `PLAYWRIGHT_MCP_EXECUTABLE_PATH`).
        `playwright install` cannot run here.

## Root cause of occurrence

*Thought the browsers the image ships serve any Playwright in the session,
actually Playwright looks only for its own revision's folder name, and the
workspace's revision moves with every catalog bump while the image's does
not.* **Machine.**

The image is a tool of the workstation. Its browsers are pinned at build
time, while Dependabot moves the workspace's Playwright (`5dc75b21c` set the
catalog to `^1.64.1`). Nothing in the session tied the two revisions.

## Detection failure causes

- CI installs its own browsers (`pnpm exec playwright install --with-deps
  chromium`, `.github/workflows/ci.yml:454`), so no gate ever runs a repo
  launch against the image's folder.
- agent-browser, the tool the validators use, finds a Chromium on its own,
  so the gap shows only when a script imports Playwright.

## Countermeasure

The implementer ran the check from a script outside the repository.

## Eradication

**Level 1, structural impossibility.**

`scripts/browser/playwright-browsers.sh` builds `~/.cache/borso-pw-browsers`.
It links every entry of `/opt/pw-browsers`. Then, for each Chromium,
headless shell and ffmpeg revision a workspace `playwright-core` asks for, it
links that revision's folder name to the newest build the image has. The
SessionStart hook exports `PLAYWRIGHT_BROWSERS_PATH` to that folder. Off the
image (a Mac) the script prints nothing and the variable is left alone.

The hook first lived in `.claude/hooks/session-start.sh`, the diff below.
#411 (`458e886c4`) replaced that file with
`scripts/hooks/checks/session-start.core.ts`, whose `persistToolPaths` runs
the same script and writes the same export, with a test beside it.

```diff
   printf 'export PATH="$HOME/.local/bin:$PATH"\n' >> "$CLAUDE_ENV_FILE"
+  aligned_browsers="$(bash "$REPO_ROOT/scripts/browser/playwright-browsers.sh" || true)"
+  if [ -n "$aligned_browsers" ]; then
+    printf 'export PLAYWRIGHT_BROWSERS_PATH=%q\n' "$aligned_browsers" >> "$CLAUDE_ENV_FILE"
+  fi
```

Measured after the change, from `apps/pragma` with the exported variable:

- `chromium.launch()` launched Chromium `153.0.8010.12`.
- `chromium.launch({ channel: 'chromium' })` launched it too.
- A 375 px page reported `innerWidth` 375.
- agent-browser still opened a page with the same variable set.

This drives a build one revision older than Playwright 1.65 expects. Launch,
new page, `setContent` and `evaluate` work (measured). Whether every newer API
works on it is unknown.

**The mechanism can fail.** On a scratch copy without the alias loop, the
same launch refused:

```
browserType.launch: Executable doesn't exist at .../plant/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell
```

**Sibling defects swept.** The three `chromium.launch()` callers above now
launch through the same variable. `task-speed.setup.ts` also takes an
explicit `--chromium` path, which still wins.

**Related.**

- [the-browser-was-on-disk-and-unreachable](./the-browser-was-on-disk-and-unreachable.md), the same class for agent-browser
- [the-browser-moved-and-the-wrapper-died-silently](./the-browser-moved-and-the-wrapper-died-silently.md)
