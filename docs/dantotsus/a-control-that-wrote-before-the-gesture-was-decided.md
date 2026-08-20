---
date: 2026-08-20
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#64'
fix-pr: '#64'
fix-commits: [3b7b123]
eradication-level: 4
time-to-detect: hours
tags: [react, pragma, ux, harness]
---

# Scrolling past a song re-scored it

## Symptom

On a phone, dragging a finger up the setlist to read further down the set
changed the energy of whichever song the finger happened to land on. The page
scrolled, as asked. The song's energy also moved, silently, with no undo and no
visible confirmation, and the write reached the API — a reload showed the new
value.

A front-end review reproduced it with real touch events at 375×812: touchStart
on row 1's energy bar, four upward touchMoves, touchEnd. `main.scrollTop` went
0 → 86 **and** `aria-valuenow` went 10 → 3.

## Root-cause chain

1. **Why did the energy change during a scroll?**
   The bar committed the level under the pointer on `pointerdown`, and again on
   every `pointermove` while a button was held.

2. **Why did a scroll gesture reach those handlers at all?**
   Because `touch-action: pan-y` does not stop events reaching the element. It
   tells the browser who may *act* on the gesture, and the browser cannot decide
   until it has seen movement. The instrumented sequence for one swipe:

   ```
   pointerdown:touch → touchstart → pointermove:touch → pointermove:touch
   → touchmove → pointercancel:touch → lostpointercapture → touchend
   ```

   One `pointerdown` and two `pointermove`s land *before* Blink rules it a
   scroll. All three wrote.

3. **Why was `pointercancel` not enough to undo them?**
   It was unhandled. The control had no notion of a gesture in progress, so
   there was nothing to cancel — only three writes that had already happened.

4. **Why did `event.buttons !== 0` not restrict the moves to this control?**
   It answers "is a button held", not "is this bar being dragged". Any pressed
   pointer travelling across the bar satisfied it, so selecting a song title
   across the card moved that song's energy too.

**Root cause:** thought `touch-action: pan-y` means the page's gestures never
reach the control, actually it only decides who may act on a gesture the
control has already been sent — so a control that commits on `pointerdown`
commits on gestures that were never its own.

## Detection failure causes

- **Typing:** no type distinguishes "a pointer event this element owns" from
  "a pointer event passing through it". Both are `PointerEvent`.
- **Linter / static analysis:** no rule relates a handler's name to whether it
  writes; `onPointerDown` calling a mutation is ordinary React.
- **Functional validation locally:** the implementer drove taps and horizontal
  drags — the two gestures the control is *for* — and both behaved. The
  gesture that broke it is the one the control is supposed to ignore, so it was
  never on the list.
- **CI (tests / build):** the pure mapping was at 100% coverage and 100%
  mutation score. None of the defect lived in the pure part; it lived in which
  events called it. There was no component test at all.
- **Code review:** caught it, at review time, with real touch input. That is the
  layer that worked, and it is the last one before merge.
- **PO / QA validation:** the implementer's own visual-validation report listed
  this exact gesture under *Not verified from here*, because `argent` declines
  `gesture-swipe` on Chromium. A named gap in a report is not a gate.

## Countermeasure

- **Code:** commit `3b7b123` — the bar tracks the gesture it captured. Nothing
  is written on `pointerdown`; a slide writes once it has travelled further
  sideways than down (`isDragIntent`), a tap writes on `pointerup`, and
  `pointercancel` drops the gesture without writing. `levelFromPointerRatio`
  returns `null` rather than the minimum when the bar cannot measure itself.
- **Code:** commit `3b7b123` — `EnergyBar.test.tsx` replays each sequence,
  including the scroll-then-cancel one, against a real React tree.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a reviewer bullet in the standard that every
future standards review reads)

**Reference:** [PR #64](https://github.com/hugoleborso/borso.fr/pull/64) ·
commits [`3b7b123`](https://github.com/hugoleborso/borso.fr/commit/3b7b123)

Level 1 was considered and rejected: the misconception is expressible in any
pointer handler, and no type or lint rule can tell a handler that writes from
one that does not without knowing what "writes" means in the app. Level 4 here
is the repository's own review mechanism — a `reviewer` bullet is collected
into `docs/standards/enforcement-ledger.md` by the generator, which is the
literal checklist the `standards-reviewer` agent reads on every branch, and the
seal records that it was read.

**The actual fix:**

```diff
+- `reviewer` checks that a control taking a drag or a slide writes nothing on
+  `pointerdown`. A vertical swipe the page is entitled to still arrives at the
+  control as a `pointerdown` and a `pointermove` or two before the browser rules
+  it a scroll and sends `pointercancel`, so a control that commits on the way
+  down rewrites whatever the thumb was resting on while the user was only
+  scrolling past it. `touch-action` decides who gets the gesture; it does not
+  stop those events reaching the handler.
```

**Sibling defects swept:** the same commit fixed two variants of the same cause
— a text selection dragged across the card wrote (the `buttons !== 0` guard),
and a zero-width bar wrote the minimum instead of nothing.

## See also

- [`../knowledge/dnd-kit-pointersensor-loses-touch-to-page-scroll.md`](../knowledge/dnd-kit-pointersensor-loses-touch-to-page-scroll.md)
  — the mirror image, in the same screen: there, a control that *should* claim
  the gesture lost it to the page. Both are the same question asked from
  opposite sides, and both were only visible with real touch input.
- [`../knowledge/real-touch-gestures-over-cdp.md`](../knowledge/real-touch-gestures-over-cdp.md)
  — how the reproduction and the fix were both driven, given that argent
  declines the gesture on Chromium.
- [`described-screenshot-without-checking-pixels.md`](./described-screenshot-without-checking-pixels.md)
  — the same shape of error: reasoning about what the interface does instead of
  driving it.
