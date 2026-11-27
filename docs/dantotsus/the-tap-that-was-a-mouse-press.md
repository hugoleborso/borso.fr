---
date: 2026-10-25
introduced-at: conception
detected-at: review
severity: high
related-pr: '#193'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/browser/touch-tap.ts, scripts/browser/touch-tap.core.ts, scripts/phone.sh]
time-to-detect: days
tags: [harness, tooling, validation, visual-validation, claude-md, documentation]
zone: docs/knowledge/driving-previews-with-agent-browser-and-argent.md
weak-point: prose-stands-in-for-a-check
recurs: [two-audits-that-sent-no-touch-events]
---

# The tap that was a mouse press

## User impact

The takes branch's phone recheck (PR #193) tapped the microphone, the timeline
mark and the install banner with `scripts/argent.sh tap`. It recorded the
results as real-touch evidence. The validator then put capture-phase listeners
on the page. No tap had been a touch (measured by the validator).

| | Seen | Expected |
| --- | --- | --- |
| Events from one argent tap | `pointerdown` and `click` with `pointerType: "mouse"`, no `touchstart` | `touchstart`, then `pointerdown` and `click` with `pointerType: "touch"` |
| Page geometry | `innerWidth` 500, `innerHeight` 669, `maxTouchPoints` 0, `(pointer: coarse)` false | 375 x 812, `maxTouchPoints` 5, `(pointer: coarse)` true |

Re-measured on 2026-10-25 on a fresh argent 0.22.1 with a one-button page: the
same `["pointerdown:mouse","click:mouse"]`, at 500 x 669. Every phone-only
behaviour the recheck claimed to have verified was unverified.

## Causal chain

- The recheck recorded a mouse press as a touch.
  - It tapped with `scripts/argent.sh tap`, because CLAUDE.md, two knowledge
    entries and the script's banner said argent's `gesture-tap` "is a real
    touch event".
    - argent 0.22.1's Chromium backend, `sendTouch` in
      `dist/tool-server.cjs`, sends `Input.dispatchTouchEvent` only when a
      second point is given, and `mousePressed` / `mouseReleased` for one
      point. argent 0.30.1 has the same code in `tapChromium`, and its tool
      description says "For Chromium, this dispatches a CDP
      mouse-press/release".
    - Headless Chromium keeps a window at least 500 px wide whatever
      `--window-size=375,812` asks, and argent applies no device metrics.
  - Commit `e79224055` rewrote
    `docs/knowledge/driving-previews-with-agent-browser-and-argent.md` to say
    "argent's touch gestures" work, and that a task about touch behaviour is
    driven with argent.
    - The same entry had said `gesture-tap` was broken, after two runs timed
      out on `CDP request Input.dispatchMouseEvent`. The commit corrected
      "broken" to "works", then called the tap a touch, which nobody
      measured.
      - The timeout it was correcting named a mouse event, and the commit
        quoted it in the section it rewrote. The tool's verbs,
        `gesture-tap`, `gesture-swipe`, `rotate`, are a phone's, and that
        name won over the evidence on the page (Man).
    - Commit `5d140956d` then added the banner line to `scripts/argent.sh`:
      `gesture-tap is a real touch event.`
    - Later edits copied the claim into CLAUDE.md and a second knowledge
      entry, so each reader met it four times (the copies are listed in
      `docs/features/pragma/song-takes-and-push/validation/visual-validation-2026-10-24-recheck.md`).

## Root cause of occurrence

*Thought argent's tap was a finger because its verbs are named after a
phone's, actually on Chromium it is a mouse press in a desktop-width window.*
(Man)

The agent that wrote `e79224055` had the contradicting evidence loaded: the
section it rewrote quoted the timeout on `Input.dispatchMouseEvent`. The
prior set by the tool's vocabulary won. So the fix cannot be one more
sentence. It has to be a command that fails when the input was not a touch.

argent 0.30.1's tool description, read on 2026-10-25: "For Chromium, this
dispatches a CDP mouse-press/release".

## Detection failure causes

- **Local validation:** a tap that lands produces the same visible result as
  a click. Only an event listener tells them apart, and no tool installed
  one.
- **Review:** the documents were reviewed as prose. The negative-claims check
  dates claims that something does *not* work. A positive claim about a
  tool's behaviour has no such gate.
- **Review:** the claim lived in four copies, so each copy confirmed the
  others and none pointed to a measurement.

## Countermeasure

`scripts/browser/touch-tap.ts`, first run as
`scripts/argent.sh touch '<css selector>'`, sets a 375 x 812 mobile viewport
and touch emulation, scrolls the element into view, installs capture
listeners, sends `Input.dispatchTouchEvent` `touchStart` and `touchEnd`, and
exits 1 unless `touchstart`, a touch `pointerdown` and a touch `click` all
reached the element. The verdict is a pure function, `judgeTouchTap`, at 100%
coverage and mutation score.

CLAUDE.md, both knowledge entries, the `argent.sh` banner, the
visual-validation standard and the visual-validator brief were corrected to
say argent's tap is a mouse press and to point to `touch`.

Measured on 2026-10-25: `touchstart`, `pointerdown` and `click` with
`pointerType: "touch"` on the button, `innerWidth` 375, `maxTouchPoints` 5,
`(pointer: coarse)` true, exit 0.

## Eradication

**Type:** detection (level 4)

**Reference:** the commit adding this file, `a83f0a600` (#200), and the
removal in `c54e32da7` (#224).

A touch row is produced by a command that fails when the input was not a
touch. Today that command is `scripts/phone.sh touch '<target>'`, which runs
`scripts/browser/touch-tap.ts` on the agent-browser session and exits 1
unless the verdict in `scripts/browser/touch-tap.core.ts` sees a real touch.

```diff
+  touch)
+    pnpm exec tsx scripts/browser/touch-tap.ts --selector "$2" --port "$port" \
+      --width "$PHONE_WIDTH" --height "$PHONE_HEIGHT"
```

The misleading verb no longer exists. Commit `c54e32da7` (#224) deleted
`scripts/argent.sh` and argent's gesture commands. That removes this
instance at the root. It does not lift the class above level 4, because
`agent-browser click` is still a mouse press, and nothing refuses a touch row
recorded from a click.

**Proof it can fail:** an argent tap on the one-button page made the verdict
exit 1 with `pointerType: "mouse"` and no `touchstart` (measured on
2026-10-25).

**Proposed:** keep one copy of the claim. The behaviour of a click and a tap
would be stated only in the `scripts/phone.sh` banner, next to the code that
measures it. CLAUDE.md and the knowledge entries would point to the command
instead of restating it. A second copy that drifts from the measurement
would then have nowhere to live.

**Similar instances:** `agent-browser-coarse-pointer-emulation.md` and
`agentic-device-testing.md` carried the same claim in their summaries, the
sentence the hook prints. Both were corrected.
`grep -rn "real touch event" docs CLAUDE.md scripts` finds no remaining
claim that a tool other than `phone.sh` sends one.

**Related.**

- [`two-audits-that-sent-no-touch-events.md`](./two-audits-that-sent-no-touch-events.md), the earlier miss this one repeats from the other side: then no touch was sent, now a mouse press was counted as one.
- [`../knowledge/real-touch-gestures-over-cdp.md`](../knowledge/real-touch-gestures-over-cdp.md)
- [`../knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md)
