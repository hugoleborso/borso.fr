---
date: 2026-08-20
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#64'
fix-commits: [3b7b123e55]
eradication-level: 5
eradication-paths: [docs/standards/05-frontend-architecture.md]
time-to-detect: hours
tags: [react, pragma, ux, harness]
zone: apps/pragma/site/src/components/atoms/EnergyBar.tsx
---

# Scrolling past a song re-scored it

## User impact

Every band member editing a setlist on a phone was affected. Dragging a finger up the setlist to read further down changed the energy of whichever song the finger landed on. The write reached the API, with no undo and no visible confirmation. A reload showed the new value. Desktop users were not affected.

A front-end review of PR #64 reproduced it with real touch events at 375 by 812: touchStart on row 1's energy bar, four upward touchMoves, touchEnd (measured by the reviewer).

| | Seen | Expected |
| --- | --- | --- |
| Vertical swipe starting on row 1's energy bar | `main.scrollTop` 0 to 86, and `aria-valuenow` 10 to 3 | `main.scrollTop` 0 to 86, and `aria-valuenow` stays 10 |

## Causal chain

- A vertical swipe over the energy bar scrolled the page and rewrote the song's energy.
  - One `pointerdown` and two `pointermove`s reached the bar before the browser ruled the swipe a scroll and sent `pointercancel`.

    ```
    pointerdown:touch → touchstart → pointermove:touch → pointermove:touch
    → touchmove → pointercancel:touch → lostpointercapture → touchend
    ```

    - The bar committed the level under the pointer on `pointerdown`, and again on every `pointermove` while any button was held. `pointercancel` was not handled.

      ```tsx
      // EnergyBar.tsx in db3cf2870
      if (event.buttons === 0) return;   // ❌ "a button is held", not "this bar owns the gesture"
      ...
      onPointerDown={startDrag}          // ❌ writes before the browser has decided the gesture
      onPointerMove={continueDrag}
      ```

      - Commit `db3cf2870` (2026-08-19, written by an agent) replaced the native `<input type="range">` with a `role="slider"` div of ten segments and hand-written pointer handlers. Its message: "The energy control is no longer a range input." The native input left the scroll-or-drag decision to the browser. The div had to make it itself.
        - The codebase offered no gesture primitive that waits for the browser's decision. Leaving the native input meant writing that decision by hand, in the component. (Machine)

## Root cause of occurrence

*Thought `touch-action: pan-y` keeps the page's vertical swipes away from the control, actually it only decides who may act on a gesture the control has already been sent, so a control that commits on `pointerdown` commits on swipes that were never its own.*

Machine. The commit's own header comment shows the belief: "`touch-pan-y` leaves the vertical swipe to the page, so dragging the…". The agent verified the two gestures the control is for, a tap and a horizontal drag, through argent. Nothing in the codebase carried the third gesture, the one the control must ignore. The native input had carried it for free, and every hand-written pointer control in the repository writes its own arbitration (measured below).

## Detection failure causes

- **Typing:** a pointer event the element owns and one passing through it are both `PointerEvent`.
- **Linter:** `onPointerDown` calling a mutation is ordinary React. No rule relates a handler to whether it writes.
- **Local validation:** argent declines `gesture-swipe` on Chromium. The implementer's visual-validation report listed the swipe under *Not verified from here*, and a named gap in a report blocks nothing.
- **CI:** the pure mapping had 100% coverage and a 100% mutation score. The defect lived in which events called it, and there was no component test.
- **Review:** caught it, with real touch input, as the last layer before merge.

## Countermeasure

Commit `3b7b123` made the bar track the gesture it captured. Nothing is written on `pointerdown`. A slide writes once it has travelled further sideways than down (`isDragIntent`), a tap writes on `pointerup`, and `pointercancel` drops the gesture without writing. `levelFromPointerRatio` returns `null` instead of the minimum when the bar cannot measure itself. `EnergyBar.test.tsx` replays each sequence, the scroll-then-cancel one included, against a real React tree.

Commit `de91fdfe8` (PR #216) later deleted `EnergyBar.tsx`. Its successor, `EnergyMeter.tsx`, takes `touch-none`, so the page never scrolls over it, and writes only on a `pointermove` that has travelled (read this session).

## Eradication

**Type:** knowledge (level 5). A `reviewer` bullet in a standard.

**Reference:** commit [`3b7b123`](https://github.com/hugoleborso/borso.fr/commit/3b7b123) (PR #64). The bullet is in `docs/standards/05-frontend-architecture.md` today:

```md
- `reviewer` checks that a control taking a drag or a slide writes nothing on
  `pointerdown`. … `touch-action` decides who gets the gesture; it does not
  stop those events reaching the handler.
```

The first version of this entry called it level 4. A written bullet a reviewer reads is level 5 under the ladder, whatever reads it.

The same standard also explains why React Aria's `Slider` is not the fix: it "maps the pointer to an absolute spot on the track and writes on `pointerdown`, the defect of" this entry. React Aria 3.53.1 is in `apps/pragma/package.json`, so its primitives were checked and rejected for this reason.

**Proposed:** one gesture primitive per site, such as a `useSlideGesture` hook holding `isDragIntent`, capture and `pointercancel`, and a rule under `eslint-rules/` that refuses `onPointerDown` and `onPointerMove` in JSX outside it. Every drag or slide would then wait for the browser's decision by construction, and a control that commits on press could not be written outside the primitive. `VoteDeck.tsx` and `EnergyMeter.tsx` would move onto it. `BidPad.tsx` holds a press-to-talk button, which acts on press by design, so the rule would need one named exception for it.

**Proof it can fail:** `EnergyBar.test.tsx` replayed the scroll-then-cancel sequence and failed before `3b7b123`. That file went with `EnergyBar.tsx`. No check refuses the defect today.

**Similar instances:** `grep -rln "onPointerDown\|onPointerMove" apps/*/site/src --include=*.tsx | grep -v test` finds four files. `EnergyMeter.tsx` writes only after travel and takes `touch-none`. `VoteDeck.tsx` writes on release. `BidPad.tsx` starts listening on press, which is its purpose. `Galaxy.tsx` (borso-fr) reads `pointermove` for a visual effect and writes nothing. None repeats the defect today, each by its own hand-written logic. [`dnd-kit-pointersensor-loses-touch-to-page-scroll.md`](../knowledge/dnd-kit-pointersensor-loses-touch-to-page-scroll.md) is the mirror image: a control that should claim the gesture lost it to the page.
