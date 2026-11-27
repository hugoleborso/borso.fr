---
date: 2026-11-16
introduced-at: implementation
detected-at: qa
severity: low
related-pr: '#372'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/phone.sh, scripts/browser/cdp-session.ts, scripts/browser/touch-tap.ts, scripts/browser/touch-drag.ts]
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

- `phone.sh touch` exited 1 on a tap that worked.
  - `restore_viewport` read 1280 px after setting 375 px.
    - Chromium detached `touch-tap.ts`'s CDP session after `phone.sh` had set
      the viewport again, and the detach dropped the 375 px override.
      - `touch-tap.ts` called `socket.close()` and exited without waiting for
        the close to finish. ← the faulty line, `touch-tap.ts` before this
        entry

        ```ts
        } finally {
          socket.close(); // starts the close; the process exits before Chromium detaches
        }
        ```

        - `socket.close()` was harmless when `a83f0a600` (#200) wrote it.
          The race was born in `731066132` (#334), whose `phone.sh` re-applies
          the viewport through agent-browser on `EXIT`. Its comment says
          "Chromium drops that override when the connection closes", and
          assumes the connection is closed once the script has exited.
          - **Machine:** two CDP sessions own one viewport override.
            `emulatePhone` in `scripts/browser/cdp-session.ts` sets
            `Emulation.setDeviceMetricsOverride` in the tap's own session,
            and `restore_viewport` in `scripts/phone.sh` sets it again through
            agent-browser's session. Detaching either one drops it, so their
            order decides the width. This design has now produced two entries
            (`recurs: the-tap-that-left-the-phone-at-desktop-width`).

## Root cause of occurrence

*Thought the tap's CDP session is gone once `touch-tap.ts` exits, actually
`socket.close()` only starts the closing handshake, and Chromium detaches the
session, dropping its override, some time later.* **Machine:** the viewport has
two owners, so a teardown in one session can undo the other's work.

The source is the measurement. 2 of 6 runs lost the race before the change,
and 0 of 12 after the script awaited the socket's `close` event (measured on
PR #372's preview). That the `close` event marks the end of the handshake is
inferred from that result. No specification was read for this entry.

## Detection failure causes

- **QA:** the PR #327 fix measured one run after the change. A race that loses
  one run in three needs several runs to show.

## Countermeasure

`closeSession` in `scripts/browser/cdp-session.ts` closes the socket and
resolves on the `close` event. `touch-tap.ts` and `touch-drag.ts` await it in
their `finally`, so the detach is done before `phone.sh` re-applies the
viewport.

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

## Eradication

**Type:** detection (level 4)

**Reference:** the commit adding this file.

What holds is detection. `restore_viewport` in `scripts/phone.sh` re-applies
375 px on exit, reads `window.innerWidth`, and exits 1 when the page is any
other width. A tap that leaves the page at the wrong width cannot pass
silently. `closeSession` removes this race, but a new gesture script that
calls `socket.close()` directly would bring it back, and nothing refuses that.

**Proposed:** give the viewport a single owner. Either the tap scripts stop
calling `emulatePhone` and rely on the viewport agent-browser already set, or
the gestures run through agent-browser's own session. Then no detach can drop
an override someone else set, and both `closeSession` and `restore_viewport`
become unnecessary. This is inferred from the code. Whether touch emulation
holds without the tap's own `Emulation.setTouchEmulationEnabled` was not
tried.

**Proof it can fail:** before the change, 2 of 6 runs of
`scripts/phone.sh touch 'section[aria-label] button'` on a pragma song page
exited 1 with "after the tap the page is 1280 px wide, not 375". After it,
0 of 12 runs on the same page failed (measured).

**Similar instances:** `grep -rn "socket.close()" scripts/browser` prints only
the call inside `closeSession`. `touch-tap.ts` and `touch-drag.ts` are the two
scripts that open their own CDP session.
