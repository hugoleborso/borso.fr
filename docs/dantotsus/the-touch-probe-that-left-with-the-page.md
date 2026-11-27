---
date: 2026-10-29
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#206'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/browser/touch-tap.ts, scripts/browser/touch-tap.core.ts, scripts/browser/touch-tap.core.test.ts, scripts/browser/touch-drag.ts]
time-to-detect: minutes
tags: [visual-validation, argent, touch, tooling, agents]
zone: scripts/browser/touch-tap.ts
recurs: none (two-audits-that-sent-no-touch-events was a pass that sent no touch at all; here the touch arrived and the tool said it had not)
---

# The touch probe that left with the page

## User impact

The touch command taps an element with a real touch over CDP and exits 1 when
the tap "did not arrive as touch". On PR #206 two visual validation rounds
tapped buttons that navigate, the consent page's Allow button among them.
Both times the tool answered `isRealTouch: false` with every problem listed.
The navigation had happened, so the tap had worked (`visual-validation-01`
at 14:05 and `visual-validation-02` at 14:43 in the archived friction log).

| | Seen | Expected |
| --- | --- | --- |
| Touch on a link that navigates | `isRealTouch: false`, "no `touchstart`, no touch `pointerdown`, no touch `click`", exit 1, browser on the linked page | `isRealTouch: true`, exit 0, browser on the linked page |

Reproduced on 2026-10-29 with a page holding one link: the old script printed
all three problems and exited 1 while Chromium showed the linked page
(measured). Every touch row on a control that navigates read as a failure.

## Causal chain

- A tap that worked reported no events.
  - The script read its record back from `window.__touchTapLog` after the
    tap, and found it empty.
    - The tap navigated. The read ran in the new document, whose `window`
      never had the log.
      - Commit `a83f0a600` (#200) wrote the listeners to keep the record in
        the page: `window.__touchTapLog.push({ ... })`, read back with
        `Runtime.evaluate` once the tap was over.
        - The script was written for taps that change state in place, which
          is most of what a touch row checks. The writing agent knew that a
          navigation replaces `window`, a basic browser fact, and the
          in-place picture of a tap won over it (Man).

## Root cause of occurrence

*Thought the page could hold the record of its own tap, actually a tap that
navigates replaces the page and the record with it.* (Man)

The fact was within the writing agent's knowledge. Nothing in the task named
a navigating control, so the prior of an in-place tap decided the design.
The fix therefore moves the record where a navigation cannot reach it,
rather than adding a sentence to a document.

## Detection failure causes

- **Tests:** `touch-tap.core.test.ts` covers the verdict on a list of events,
  and the list was always handed in. The coverage and mutation gates cover
  `.core.ts` files only, so the collection code in `touch-tap.ts`, the I/O
  shell, sat outside every test by the standard's design.
- **The tool's own output:** it printed the observed page state, which after
  a navigation is the next page's, with no sign that the page changed.

## Countermeasure

The validators recorded the rows as passing on other evidence, the redirect
reaching its destination, and logged the false negative.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file, `0470c3a46` (#221).

The page no longer keeps the record. The script registers a CDP binding
before the tap, and each listener reports its event through it as the event
fires. The binding call travels on the DevTools socket, which outlives the
document. The verdict is judged from what the socket received:

```diff
+    await send('Runtime.enable');
+    await send('Runtime.addBinding', { name: TOUCH_TAP_BINDING });
…
-        window.__touchTapLog.push({
+        window.${TOUCH_TAP_BINDING}(JSON.stringify({
…
-    const verdict = judgeTouchTap(parseRecordedEvents(observed));
+    const verdict = judgeTouchTap(reported);
```

`readReportedEvent` in `touch-tap.core.ts` reads a `Runtime.bindingCalled`
message and ignores every other message. Its tests cover each case. The final
read of the page's width and pointer state tolerates a page that is still
loading, and says so instead of throwing. `scripts/browser/touch-drag.ts`
reuses the same binding, `TOUCH_DRAG_BINDING`.

Measured after the change on the same one-link page: `isRealTouch: true`, no
problems, and the browser on the linked page.

**Proof it can fail:** the old script on the one-link page printed all three
problems and exited 1 (measured on 2026-10-29). The new one passes on the
same page.

**Proposed:** keep one implementation of the report channel. The
`addBinding` call, the listener script and the `bindingCalled` reader would
move from `touch-tap.ts` and `touch-drag.ts` into
`scripts/browser/cdp-session.ts`, beside `emulatePhone`. A future gesture
driver would then get the socket channel by calling it, and could not
rebuild a page-side log.

**Similar instances:** `grep -n "window\.\${" scripts/browser/*.ts` finds
`touch-drag.ts` keeping its drop target in the page as
`window.__touchDragDestination`. It is not an open instance:
`isLiftOverDestination` reads it before `touchEnd` is sent, while the page
that holds it is still loaded (`scripts/browser/touch-drag.ts`, the read
above the `touchEnd` dispatch). `scripts/argent.sh tap` kept nothing in the
page, and commit `c54e32da7` (#224) deleted it since.

**Related.**

- [`docs/knowledge/real-touch-gestures-over-cdp.md`](../knowledge/real-touch-gestures-over-cdp.md)
- [two-audits-that-sent-no-touch-events](./two-audits-that-sent-no-touch-events.md)
