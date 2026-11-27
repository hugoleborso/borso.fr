---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#60'
fix-commits: [f6463f6071, c54e32da7]
eradication-level: 5
eradication-paths: [docs/knowledge/driving-previews-with-agent-browser-and-argent.md]
time-to-detect: minutes
tags: [harness, agent-browser, tooling, meta, visual-validation]
zone: scripts/install-repo-deps.sh
---

# The browser was on disk and unreachable

## User impact

The first browser command of a session, in the managed container, failed:

```
✗ Chrome not found. Checked:
  - agent-browser cache: /root/.agent-browser/browsers
  - System Chrome installations
  - Puppeteer browser cache
  - Playwright browser cache
Run `agent-browser install` to download Chrome, or use --executable-path.
```

| | Seen | Expected |
| --- | --- | --- |
| first `agent-browser open <url>` | "Chrome not found", with an offer to download a second browser | the page opens on the Chromium the container ships |
| retry with `--executable-path` | `⚠ --executable-path ignored: daemon already running` | the page opens |

A Chromium sat at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, and
the environment forbids downloading another one. Measured by the session that
wrote this entry, on 2026-08-18.

## Causal chain

- agent-browser reported "Chrome not found".
  - It searched its own cache, the system Chrome locations, and the Puppeteer
    and Playwright caches. The container keeps its browser at
    `$PLAYWRIGHT_BROWSERS_PATH`, which is none of those.
    - SessionStart provisioned a browser instead of pointing at the one on
      disk. Its step ran `agent-browser install` and swallowed the failure:
      ```bash
      npm install -g agent-browser >/dev/null
      agent-browser install >/dev/null || log "agent-browser install (Chromium provision) failed; …"  # ← the faulty line
      ```
      - `5105c2407` (2026-05-03) wrote that step from agent-browser's own
        install instructions, on the belief that a fresh session has no
        browser. The container already shipped one and sets
        `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. (Material)
  - The retry with `--executable-path` changed nothing, because the first
    failing call had started a daemon, and a daemon holds its launch options
    for its lifetime.

## Root cause of occurrence

*Thought a browser automation CLI finds whatever browser is installed, actually
it looks in the four places it knows, and this container puts its browser in a
fifth.* (Material)

The step was written from the vendor's install recipe, which assumes no
browser exists. Where the managed container keeps its browser was written in
no file of the repository at `5105c2407` (measured, `git grep pw-browsers 5105c2407`
finds nothing). The answer was absent from the context of
whoever wrote the step.

## Detection failure causes

- **Local validation:** on a laptop the system Chrome is in one of the four
  searched locations, so the whole class is invisible where the setup script
  is usually exercised.
- **CI:** no CI job drives a browser.
- **Review:** the SessionStart block reads correctly, install if absent. Its
  assumption about where a browser lives was written down nowhere to disagree
  with.
- **The tool's output:** the option-pinning warning prints one line that
  scrolls past under the successful-looking output of the next command.

## Countermeasure

`f6463f6` made SessionStart write agent-browser's user-level config, pointing
at the Chromium already on disk. Verified end to end on 2026-08-18: config
removed, block run, page opened with no flag.

## Eradication

**Type:** triggered knowledge (level 5). The path half is subtracted. The
faulty line itself still runs.

**Reference:** commit [`c54e32da7`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7) (#224, 2026-10-29)

The `f6463f6` config was a second answer beside a wrapper that kept its own.
Its sibling sweep missed `find_chromium` in `scripts/browser.sh`, added three
days earlier by `5a5ebc19f` with a versioned glob. That glob broke on
2026-10-24, as
[the-browser-moved-and-the-wrapper-died-silently](./the-browser-moved-and-the-wrapper-died-silently.md)
records.

`c54e32da7` then removed the config, `scripts/browser.sh` and
`scripts/argent.sh`. No file in the repository resolves a browser path for
agent-browser any more, so no copy is left to point at the wrong place.

**The recurrence, stated:** the faulty line was never removed. `f6463f6` added
the config beside it, and `c54e32da7` did not touch it. It sits today at
`scripts/install-repo-deps.sh:199` on `origin/main` `79814b4c8`, in the branch
that runs when no agent-browser binary is found:

```bash
agent-browser install >/dev/null 2>&1 || log "agent-browser install (Chromium provision) failed; …"
```

On this container it ran. `~/.local/bin/agent-browser`, which only the install
branch creates, is dated 2026-11-24 10:48:56, and
`~/.agent-browser/browsers/chrome-158.0.8127.88` was created one second later
(measured with `ls --time-style=full-iso`). So the second browser this
environment once forbade is downloaded at session start, while `CLAUDE.md`,
`.claude/agents/visual-validator.md` and the knowledge entry
`driving-previews-with-agent-browser-and-argent.md` all say never to run
`agent-browser install`. That knowledge entry's trigger on
`agent-browser install` is what holds today, and only for an agent that types
the command. SessionStart runs it without passing through that hook.

**Proof, corrected:** the earlier proof of this entry, `agent-browser open
about:blank` with no config, ran on that downloaded copy. It shows the config
is no longer needed. It does not show that agent-browser finds the image's
Chromium. The round 2 review measured that it does, with an empty `HOME`. I
could not repeat it, because the session refused a command that sets `HOME`.

**Proposed:** delete the `agent-browser install` call, and its log line, from
`scripts/install-repo-deps.sh`. SessionStart then installs the binary and
provisions nothing, so the step that contradicts the environment's rule no
longer exists, and the repository's code and its instructions agree.

**Similar instances:** `grep -rn 'agent-browser install\|pw-browsers\|chrome-linux' scripts .claude .husky .github CLAUDE.md docs/knowledge`
finds the SessionStart call above, the three instructions that forbid it, and
`scripts/browser/playwright-browsers.sh`. That script aligns the image's folder
for the workspace Playwright, not for agent-browser, and links every entry of
`/opt/pw-browsers` rather than globbing one path.
