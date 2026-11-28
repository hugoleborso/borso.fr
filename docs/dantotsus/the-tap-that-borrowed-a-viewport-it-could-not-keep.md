---
date: 2026-11-28
introduced-at: implementation
detected-at: qa
severity: low
related-pr: '#431'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/browser/cdp-session.ts, scripts/phone.sh]
time-to-detect: minutes
tags: [visual-validation, agent-browser, touch, tooling, agents]
zone: scripts/browser/cdp-session.ts
recurs: [the-tap-that-left-the-phone-at-desktop-width]
---

# The tap that borrowed a viewport it could not keep

## User impact

A visual validator checking that a 375 px phone never scrolls sideways read a
page 1280 px wide.

| | Seen | Expected |
| --- | --- | --- |
| PR #431, a max-`scrollWidth` probe across a `scripts/phone.sh touch` | `1280` | `375` |
| PR #431, a 20 ms sampler of `innerWidth/scrollWidth/clientWidth` | `1280/1280/1280` for a moment, then `375/375/375` | `375/375/375` throughout |

The validator worked out that the page never overflowed its own viewport and
passed the row. A less careful one would have filed a false FAIL. On PR #354 a
pragma pill strip lost its scroll position through the same moment.

## Causal chain

- The page was 1280 px wide for a moment during a phone tap.
  - `touch-tap.ts` and `touch-drag.ts` opened their own CDP connection and set
    `Emulation.setDeviceMetricsOverride` to 375 by 812 on it.
    - Chromium keeps one set of device metrics per page. Closing the driver's
      connection cleared it, and the session's own 375 px viewport went with it.
      - `scripts/phone.sh` then re-applied the viewport in `restore_viewport`.
        Between the two, the page laid out at the 1280 px window.

## Root cause of occurrence

*Thought the tap needed its own phone metrics to be a phone tap, actually
touch emulation alone gives a coarse pointer and touch events at the viewport
the session already has.*

Measured on 2026-11-28 with the metrics call removed. `scripts/phone.sh touch`,
`drag` and `swipe` each exited 0 with a real touch, `(pointer: coarse)` read
true during the gesture, and a 20 ms sampler saw only `375/375`.

## Detection failure causes

- **The earlier sweep:** PR #327's sweep measured the width after the tap and
  added `restore_viewport` to repair it. It never sampled during the tap, so
  the moment between the clear and the repair stayed invisible.
- **Knowledge:** a paragraph in `driving-previews-with-agent-browser-and-argent.md`
  told validators to read state after the tap. It worked around the 1280 px
  moment and left its cause.

## Countermeasure

`emulateTouch` sets only `Emulation.setTouchEmulationEnabled`. The drivers no
longer take a width or a height. `scripts/phone.sh` lost `restore_viewport` and
its traps, because nothing changes the session's viewport any more.

## Eradication

**Type:** structural impossibility (level 1). No driver sets device metrics,
so none can clear them.

**Reference:** the commit adding this file.

```diff
-export async function emulatePhone(send: CdpSend, viewport: PhoneViewport): Promise<void> {
-  await send('Emulation.setDeviceMetricsOverride', {
-    width: viewport.width,
-    height: viewport.height,
-    deviceScaleFactor: PHONE_SCALE_FACTOR,
-    mobile: true,
-  });
+export async function emulateTouch(send: CdpSend): Promise<void> {
   await send('Emulation.setTouchEmulationEnabled', {
```

**Proof it can fail:** with the old `cdp-session.ts` restored, the same sampler
on the same page read `["375/375/false","375/375/true","1280/1280/false"]`.
With the change it read `["375/375/false","375/375/true"]` (measured).

**Similar instances:** `grep -rn setDeviceMetricsOverride scripts/` finds none
left (measured).
