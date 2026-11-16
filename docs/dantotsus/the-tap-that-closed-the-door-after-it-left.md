---
date: 2026-11-16
introduced-at: implementation
detected-at: qa
severity: low
related-pr: '#372'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/browser/cdp-session.ts, scripts/browser/touch-tap.ts, scripts/browser/touch-drag.ts]
time-to-detect: minutes
tags: [visual-validation, agent-browser, touch, tooling, agents]
zone: scripts/browser/touch-tap.ts
recurs: [the-tap-that-left-the-phone-at-desktop-width]
---

# The tap that closed the door after it left

## User impact

The visual validator of PR #372 tapped the lineup Edit button with
`scripts/phone.sh touch`. The touch reached its target, then the script exited 1
with "after the tap the page is 1280 px wide, not 375". The validator had to
judge a passing tap from a failing exit code.

| | Seen | Expected |
| --- | --- | --- |
| Same tap, same page, 6 runs (measured) | 2 runs exit 1 at 1280 px | 6 runs exit 0 at 375 px |

## Causal chain

- `phone.sh touch` exits 1 on a tap that worked.
  - `restore_viewport` reads 1280 px after setting 375 px.
    - Chromium detaches `touch-tap.ts`'s CDP session after the viewport was set again, and the detach drops the 375 px override.
      - `touch-tap.ts` called `socket.close()` and exited without waiting for the close handshake.

## Root cause of occurrence

*Thought `socket.close()` ends the CDP session before the script returns,
actually it only starts the closing handshake.* The WebSocket `close()` method
returns at once, and the `close` event fires once the handshake ends. The PR
#327 fix re-applied the viewport after the tap. It assumed the tap's session
was gone by then, so the order held on some runs and not on others.

## Detection failure causes

- **QA:** the PR #327 fix measured one run after the change. A race that loses
  one run in three needs several runs to show.

## Countermeasure

`closeSession` in `scripts/browser/cdp-session.ts` closes the socket and
resolves on the `close` event. `touch-tap.ts` and `touch-drag.ts` await it in
their `finally`, so the detach is done before `phone.sh` re-applies the
viewport.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file.

```diff
+export function closeSession(socket: WebSocket): Promise<void> {
+  return new Promise((resolve) => {
+    socket.addEventListener('close', () => {
+      resolve();
+    });
+    socket.close();
+  });
+}
...
   } finally {
-    socket.close();
+    await closeSession(socket);
   }
```

**Proof it can fail:** before the change, 2 of 6 runs of
`scripts/phone.sh touch 'section[aria-label] button'` on a pragma song page
exited 1 with "after the tap the page is 1280 px wide, not 375". After it,
0 of 12 runs on the same page failed (measured). The `restore_viewport` guard
from PR #327 stays as the check.
