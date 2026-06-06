# dnd-kit: a single PointerSensor loses the drag to page scroll on touch

## The trap

dnd-kit's `PointerSensor` with a distance activation constraint works on
desktop but **fails on phones**: a touch-drag on the handle is claimed
by the browser's native scroll, so the page scrolls instead of the row
dragging. One sensor can't serve both inputs well — a mouse wants a
small distance threshold, a touch wants to distinguish a drag-hold from
a scroll-swipe.

Hit in PR #31 (`b210ea8`) after the initial dnd-kit migration shipped
with a single `PointerSensor`.

## The fix

Split into per-input sensors:

```ts
const sensors = useSensors(
  useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  useSensor(KeyboardSensor),
);
```

- **MouseSensor** — 6px distance, so a click isn't a drag.
- **TouchSensor** — 200ms press-and-hold with 8px tolerance, so a quick
  swipe still scrolls the page but a hold on the handle starts the drag.
- **KeyboardSensor** — keeps keyboard reordering.

The drag handle also needs `touch-action: none` (Tailwind
`touch-none`) so the held drag isn't hijacked mid-gesture by the
browser's touch-action handling.

## See also

- [`../../CLAUDE.md`](../../CLAUDE.md) — "Every page renders correctly at
  375 px width"; touch drag is part of that contract.
