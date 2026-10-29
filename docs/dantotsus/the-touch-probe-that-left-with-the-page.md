---
date: 2026-10-29
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#206'
fix-pr: none (the kaizen pull request for PR #206 that adds this file)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/browser/touch-tap.ts, scripts/browser/touch-tap.core.ts, scripts/browser/touch-tap.core.test.ts]
time-to-detect: minutes
tags: [visual-validation, argent, touch, tooling, agents]
zone: scripts/browser/touch-tap.ts
recurs: none (two-audits-that-sent-no-touch-events was a pass that sent no touch at all; here the touch arrived and the tool said it had not)
---

# The touch probe that left with the page

## Symptom

`scripts/argent.sh touch <selector>` taps an element with a real touch over
CDP and exits 1 when the tap "did not arrive as touch". On PR #206 two visual
validation rounds tapped buttons that navigate, the consent page's Allow
button among them, and both times the tool answered `isRealTouch: false`
with every problem listed: no `touchstart`, no touch `pointerdown`, no touch
`click`. The navigation had happened, so the tap had worked
(`visual-validation-01` at 14:05 and `visual-validation-02` at 14:43 in the
archived friction log). A successful tap read as a failed one, twice.

Reproduced on 2026-10-29 with a page holding one link: the old script printed
all three problems and exited 1 while Chromium showed the linked page.

## Root-cause chain

1. **Why did a tap that worked report no events?** The script installed its
   listeners in the page and kept what they saw in `window.__touchTapLog`,
   then read that variable back after the tap.
2. **Why was the variable empty?** The tap navigated. The read ran in the new
   document, whose `window` never had the log, so it found nothing.
3. **Why was the record kept in the page?** The script was written for taps
   that change state in place, which is most of what a touch row checks, and
   nothing in its tests drove a tap that leaves the page.

**Root cause:** thought the page could hold the record of its own tap,
actually a tap that navigates replaces the page and the record with it.

## Detection failure causes

- **Tests:** `touch-tap.core.test.ts` covers the verdict on a list of events,
  and the list was always handed in; nothing exercised how the list is
  collected.
- **The tool's own output:** it prints the observed page state, which after a
  navigation is the next page's, with no sign that the page changed.

## Countermeasure

The validators recorded the rows as passing on other evidence (the redirect
reached its destination) and logged the false negative.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** the commit that adds this file.

**The actual fix:** the page no longer keeps the record. The script registers
a CDP binding before the tap, and each listener reports its event through it
as the event fires; the binding call travels on the DevTools socket, which
outlives the document. The verdict is judged from what the socket received:

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
message and ignores every other message, a call to another binding and a
payload that is not an input event; its tests cover each case. The final read
of the page's width and pointer state now tolerates a page that is still
loading, and says so instead of throwing.

Measured after the change on the same one-link page: `isRealTouch: true`, no
problems, and the browser on the linked page.

**Sibling defects swept:** `scripts/argent.sh tap` goes through argent's own
`gesture-tap` and keeps nothing in the page.

## See also

- [`docs/knowledge/real-touch-gestures-over-cdp.md`](../knowledge/real-touch-gestures-over-cdp.md)
- [two-audits-that-sent-no-touch-events](./two-audits-that-sent-no-touch-events.md)
