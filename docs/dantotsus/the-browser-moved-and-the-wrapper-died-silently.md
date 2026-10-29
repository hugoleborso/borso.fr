---
date: 2026-10-24
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#194'
fix-pr: none (opened by the kaizen pull request for #194)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/browser.sh, scripts/argent.sh]
time-to-detect: minutes
tags: [harness, agent-browser, tooling, visual-validation]
zone: scripts/browser.sh
recurs: [the-browser-was-on-disk-and-unreachable]
---

# The browser moved and the wrapper died silently

## Symptom

On PR #194, `scripts/browser.sh open http://localhost:5180/` and `snapshot -i` printed nothing at all. The session read that as an empty page and fell back to a hand-written Playwright script. Run alone, the wrapper exited 2 with no message.

## Root-cause chain

1. **Why exit 2 with no message?** `find_chromium` ran `ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1` inside `$( )` under `set -euo pipefail`. `ls` found nothing and exited 2, `pipefail` made the substitution fail, and `set -e` stopped the script before its own « no Chromium » note.
2. **Why did `ls` find nothing?** The sandbox image now ships `chromium-1243/chrome-linux64/chrome`. The path was written against `chromium-1194/chrome-linux/chrome`.
3. **Why a versioned path?** The image also ships a stable link, `/opt/pw-browsers/chromium`, which the environment brief names. The scripts globbed the versioned folder instead.

**Root cause:** thought the browser lives at `chromium-*/chrome-linux/chrome`, actually the image names its folder per build and keeps `/opt/pw-browsers/chromium` as the one stable path.

## Detection failure causes

- **Linter / static analysis:** shellcheck does not flag a pipeline under `pipefail` inside a substitution.
- **Functional validation locally:** a failure that prints nothing reads as « the page is empty », not « the tool died ».
- **CI:** CI never runs the wrapper; the sandbox image is the only place it runs.

## Countermeasure

`find_chromium` in `scripts/browser.sh` and `scripts/argent.sh` uses `/opt/pw-browsers/chromium` when it is executable, and otherwise finds any `chrome-linux*/chrome`, never failing the script.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commit adding this file, in the kaizen pull request for #194.

**The actual fix:**

```diff
-find_chromium() {
-  ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1
-}
+STABLE_CHROMIUM=/opt/pw-browsers/chromium
+
+find_chromium() {
+  if [ -x "$STABLE_CHROMIUM" ]; then
+    printf '%s\n' "$STABLE_CHROMIUM"
+    return 0
+  fi
+  find /opt/pw-browsers -maxdepth 3 -type f -name chrome -path '*chrome-linux*' 2>/dev/null | sort | tail -n1 || true
+}
```

The stable link does not depend on a build number, so a new image no longer breaks the wrapper. The fallback cannot stop the script. Verified on 2026-10-24: `open https://example.com` prints the title with the link present, and the fallback resolves with the link moved away.

**Sibling defects swept:** `scripts/argent.sh` had the same glob and gets the same fix. `scripts/install-repo-deps.sh` already used `-path '*chrome-linux*'` and prefers the stable link.

## See also

- [`the-browser-was-on-disk-and-unreachable.md`](./the-browser-was-on-disk-and-unreachable.md)
- [`driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md)
