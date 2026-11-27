---
date: 2026-10-24
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#194'
fix-commits: [b806f7909, c54e32da7]
eradication-level: 1
eradication-paths: [scripts/install-repo-deps.sh]
time-to-detect: minutes
tags: [harness, agent-browser, tooling, visual-validation]
zone: scripts/browser.sh
recurs: [the-browser-was-on-disk-and-unreachable]
---

# The browser moved and the wrapper died silently

## User impact

On PR #194, `scripts/browser.sh open http://localhost:5180/` and `snapshot -i`
printed nothing at all. The session read that as an empty page and fell back
to a hand-written Playwright script. Run alone, the wrapper exited 2 with no
message.

| | Seen | Expected |
| --- | --- | --- |
| `scripts/browser.sh open <url>` | no output, exit 2 | the page title, or a message naming what is missing |

Measured by the PR #194 session on 2026-10-24.

## Causal chain

- The wrapper exited 2 and printed nothing.
  - `find_chromium` ran `ls` inside `$( )` under `set -euo pipefail`. `ls`
    found nothing and exited 2, `pipefail` failed the substitution, and
    `set -e` stopped the script before its own "no Chromium" note.
    ```bash
    find_chromium() {
      ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1  # ← the faulty line
    }
    ```
    - The image now ships `chromium-1243/chrome-linux64/chrome`. The glob
      matched only the `chrome-linux` folder of `chromium-1194`.
      - `5a5ebc19f` (2026-08-15) wrote the glob into `scripts/browser.sh`. It
        copied it from `scripts/argent.sh`, where `2e581bcfe` (2026-08-14) had
        written it. Its input was the knowledge corpus.
        `agent-browser-cli-quirks.md` gave the glob verbatim,
        `/opt/pw-browsers/chromium-*/chrome-linux/chrome`, and
        `driving-previews-with-agent-browser-and-argent.md` gave the full
        `chromium-1194` path. No file in the repository named the stable link
        `/opt/pw-browsers/chromium` (`git grep` at `2e581bcfe^` and at
        `5a5ebc19f`, this session). (Material)
      - On 2026-08-18, `f6463f6` taught SessionStart to prefer the stable link.
        It left the two wrappers on their own glob. From then on the
        repository held three Chromium resolvers, and only one used the stable
        link, so the fix did not reach the file that broke. (Machine)

## Root cause of occurrence

*Thought the build number was the only part of the browser's path that
changes, actually the image renames the whole folder per build and keeps
`/opt/pw-browsers/chromium` as the one stable path.* (Material)

The agent that wrote the glob copied it from the knowledge entry it had
loaded, and the stable path was in no document it could have read. Under the
agentic 4M rule that is Material: the right answer was absent from its
context. The second branch is Machine. `f6463f6` fixed the path once, in
SessionStart, and nothing tied the wrappers to that fix, because each kept its
own copy of a fact the image owns. Measured this session:
`ls -la /opt/pw-browsers/` shows
`chromium -> /opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.

## Detection failure causes

- **Linter:** shellcheck does not flag a pipeline under `pipefail` inside a
  command substitution.
- **Local validation:** a failure that prints nothing reads as "the page is
  empty", not "the tool died".
- **CI:** CI never runs the wrapper. The sandbox image is the only place it
  runs, so an image change is seen first by the next session.
- **Review of `f6463f6`:** its diff touched only `scripts/install-repo-deps.sh`.
  The wrappers' glob was outside the diff a reviewer reads.

## Countermeasure

`b806f7909` made `find_chromium` in `scripts/browser.sh` and
`scripts/argent.sh` use `/opt/pw-browsers/chromium` when it is executable.
Otherwise it ran `find ... -path '*chrome-linux*'` with `|| true`, so it could
never stop the script. Verified on 2026-10-24: `open https://example.com`
printed the title with the link present, and the fallback resolved with the
link moved away.

## Eradication

**Type:** structural impossibility by subtraction (level 1)

**Reference:** commit [`c54e32da7`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7) (#224, 2026-10-29)

The patch above kept two resolvers and a fallback glob. Five days later,
`c54e32da7` deleted the class instead. It removed `scripts/browser.sh`,
`scripts/argent.sh` and the agent-browser config that SessionStart wrote,
because agent-browser now finds a browser itself. No file in the repository
names a Chromium path for agent-browser any more, so an image rename has
nothing to break.

```diff
 scripts/argent.sh                                  |  300 -----
 scripts/browser.sh                                 |  177 ---
 scripts/install-repo-deps.sh                       |   61 +-
```

**Proof it holds:** measured this session, with no
`~/.agent-browser/config.json`, `agent-browser open about:blank` opened the
page on agent-browser 0.41.2. The browser it ran sits in its own cache,
`~/.agent-browser/browsers/chrome-158.0.8127.88`.

**Similar instances:** `grep -rn 'pw-browsers\|chrome-linux' scripts .claude .husky .github`
finds one remaining reader of the image's folder,
`scripts/browser/playwright-browsers.sh`. It links every entry of
`/opt/pw-browsers` and picks builds with `find -name "$1-[0-9]*" | sort -V`,
which neither depends on the `chrome-linux` subfolder nor fails under
`pipefail` when nothing matches.
