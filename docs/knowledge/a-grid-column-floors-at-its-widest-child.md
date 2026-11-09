---
summary: 'A grid or flex track sized `auto` or `1fr` floors at its content''s min-content width, so an inner scroll container pushes the whole page sideways; use `minmax(0, 1fr)`.'
triggers:
  paths:
    - 'scripts/quality/dashboard/index.html'
    - 'apps/*/site/src/index.css'
  output:
    - 'scrolls sideways'
---

# A grid column floors at its widest child

A card on the 3S board was `display: grid` with no `grid-template-columns`, so
it had one implicit `auto` column. Inside it sat a row of application chips in a
container meant to scroll sideways when the applications do not fit. On a phone
the chips row did not scroll: the card grew to the chips' width, the page grew
with the card, and the whole board scrolled sideways instead, carrying the
headings off screen. Measured in a Playwright harness on 2026-11-09 with every
row open: the document was 738 px wide in a 390 px viewport.

## Why

An `auto` grid track, and a `1fr` one, take their *minimum* size from the
content's min-content contribution. A block whose children are a long unbroken
row of items has a min-content width equal to that row. `overflow-x: auto` on
the inner container does not change its parent's min-content contribution: the
scroll container is allowed to scroll, but nothing has told the track it may be
narrower than its content, so the track grows and there is never any overflow to
scroll.

The same applies to a flex item, which defaults to `min-width: auto`.

## Fix

Let the track shrink below its content:

```diff
   .s3-card {
     …
     min-width: 0;
     display: grid;
+    grid-template-columns: minmax(0, 1fr);
     gap: var(--cds-gap-sm);
```

`min-width: 0` on the card was already there and did nothing for this: it lets
the *card* shrink inside its own parent, not the card's implicit column shrink
inside the card.

`minmax(0, 1fr)` is the same track with a zero floor. Every child may now shrink,
so the two scroll containers inside the card — the chips row and the defect map —
scroll on their own. Measured after the change: 390 px at 390, 768 at 768 and
1280 at 1280. On a flex item the equivalent is `min-width: 0`.

## How to see it before a reader does

Nothing in CSS, a linter or a type warns about this: every declaration is valid
and the page looks right at desktop width, where the content fits. It shows only
when a rendered page is measured against its viewport.
`scripts/quality/check-dashboard-page.ts` does that for the board at 390, 768 and
1280 px with every row open, and refuses a document wider than the viewport. For
an application's pages the equivalent is a 375 px check through
`scripts/phone.sh` — see
[`agentic-device-testing.md`](./agentic-device-testing.md).
