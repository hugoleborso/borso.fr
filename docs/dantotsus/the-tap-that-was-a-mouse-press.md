---
date: 2026-10-25
introduced-at: conception
detected-at: review
severity: high
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/browser/touch-tap.ts, scripts/browser/touch-tap.core.ts, scripts/argent.sh]
time-to-detect: days
tags: [harness, tooling, validation, visual-validation, claude-md, documentation]
zone: scripts/phone.sh
weak-point: prose-stands-in-for-a-check
recurs: [two-audits-that-sent-no-touch-events]
---

# The tap that was a mouse press

## Symptom

The takes branch's phone recheck (PR #193) tapped the microphone, the timeline
mark and the install banner with `scripts/argent.sh tap` and recorded the
results as real-touch evidence, because CLAUDE.md, two knowledge entries and the
script's own banner all said argent's `gesture-tap` "is a real touch event".
The validator then put capture-phase listeners on the page. Every argent tap
arrived as `pointerdown` and `click` with `pointerType: "mouse"`, and no
`touchstart` at all. The page also reported `innerWidth` 500, `innerHeight`
669, `maxTouchPoints` 0 and `(pointer: coarse)` false: not a phone. Re-measured
on 2026-10-25 on a fresh argent 0.22.1 with a one-button page: the same
`["pointerdown:mouse","click:mouse"]`, at 500 × 669.

## Root-cause chain

1. **Why was a mouse press recorded as a touch?** Three documents said
   `gesture-tap` was a touch, and nothing on the page was asked.
2. **Why did the documents say so?** `driving-previews-with-agent-browser-and-argent.md`
   once said `gesture-tap` was broken, after two runs timed out on
   `Input.dispatchMouseEvent`. When that turned out to be a shared-browser
   hazard, the correction went one step too far: it confirmed the tap
   *worked*, then wrote down that it was a *touch*, which nobody measured. The
   method in the original timeout already said otherwise.
3. **Why is it a mouse?** argent 0.22.1's Chromium backend, `sendTouch` in
   `dist/tool-server.cjs`, sends `Input.dispatchTouchEvent` only when a second
   point is given and `mousePressed` / `mouseReleased` for one point. argent
   0.30.1, the version the CLI offers to upgrade to, has the same code in
   `tapChromium`, and its tool description says "For Chromium, this dispatches
   a CDP mouse-press/release". Upgrading does not fix it.
4. **Why 500 px wide?** Headless Chromium keeps a window at least 500 px wide
   whatever `--window-size=375,812` asks, and argent applies no device metrics.

**Root cause:** thought argent's tap was a finger because its verbs are named
after a phone's, actually on Chromium it is a mouse press in a desktop-width
window, and the claim that it was a touch had been written down rather than
measured.

## Detection failure causes

- **Functional validation locally:** a tap that lands produces the same visible
  result as a click; only an event listener tells them apart, and no tool
  installed one.
- **Code review:** the documents were reviewed as prose. The negative-claims
  check dates claims that something does *not* work; a positive claim about a
  tool's behaviour has no such gate.

## Countermeasure

- **Code:** `scripts/browser/touch-tap.ts`, run as
  `scripts/argent.sh touch '<css selector>'`, sets a 375 × 812 mobile viewport
  (`Emulation.setDeviceMetricsOverride`) and touch emulation
  (`Emulation.setTouchEmulationEnabled`), scrolls the element into view,
  installs capture listeners, sends `Input.dispatchTouchEvent` `touchStart` and
  `touchEnd`, prints what reached the element and exits 1 unless `touchstart`,
  a touch `pointerdown` and a touch `click` all did. The verdict is a pure
  function, `judgeTouchTap`, at 100% coverage and mutation score.
- **Documents:** CLAUDE.md, both knowledge entries, the argent.sh banner, the
  visual-validation standard and the visual-validator brief now say argent's
  tap is a mouse press and point to `touch`. `ARGENT_CHROMIUM_FLAGS` passes
  extra Chromium flags (a fake microphone) to `start`, which the recheck had to
  work around by launching Chromium by hand.

## Eradication (mandatory — code-level)

**Type:** detection (level 4) — a touch row is now produced by a command that
fails when the input was not a touch.

**Reference:** the commit that adds this file.

**The actual fix:**

```diff
+  touch)
+    pnpm exec tsx scripts/browser/touch-tap.ts --selector "$2" --port "$CDP_PORT" \
+      --width "$PHONE_WIDTH" --height "$PHONE_HEIGHT"
```

```diff
-gesture-tap is a real touch event. gesture-swipe is NOT supported on Chromium —
+gesture-tap and 'scripts/argent.sh tap' are a MOUSE press on Chromium
+(pointerType mouse, no touchstart), and this window is 500 px wide, not
+${PHONE_WIDTH}. For a real touch at phone width, by CSS selector:
+  scripts/argent.sh touch '[aria-label="Stop"]'
```

Measured with it on 2026-10-25: `touchstart`, `pointerdown` and `click` with
`pointerType: "touch"` on the button, `innerWidth` 375, `maxTouchPoints` 5,
`(pointer: coarse)` true, exit 0.

**Sibling defects swept:** `agent-browser-coarse-pointer-emulation.md` and
`agentic-device-testing.md` carried the same claim in their summaries, which
is the sentence the hook prints; both corrected. One more fact measured on the
way: after the CDP client disconnects, touch emulation ends
(`maxTouchPoints` back to 0) while the viewport override stayed, so set, act and
read back in one session; recorded in `real-touch-gestures-over-cdp.md`.

## See also

- [`two-audits-that-sent-no-touch-events.md`](./two-audits-that-sent-no-touch-events.md) — the earlier miss this one repeats from the other side: then no touch was sent, now a mouse press was counted as one.
- [`../knowledge/real-touch-gestures-over-cdp.md`](../knowledge/real-touch-gestures-over-cdp.md)
- [`../knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md)
