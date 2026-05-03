# `agent-browser` device emulation does not propagate `(pointer: coarse)` to `matchMedia`

## Symptom

A `/visual-validation` row that asserts touch-affordance behaviour — caption swap, tap-to-X handlers gated on `(pointer: coarse)`, mobile-only Compose buttons keyed off the same query — lands UNVERIFIABLE. The validator reports something like:

> agent-browser 0.26 `set device "iPhone 14"` resizes the viewport and swaps the user-agent but does not propagate `pointer: coarse` to `matchMedia`. A runtime `window.matchMedia` patch evaporates on reload before React's mount-time `useEffect` reads it.

## What's actually happening

`agent-browser set device "<name>"` (and `Pixel 5`, etc.) emulates a mobile device by:

- Resizing the viewport.
- Swapping the user-agent header.
- (Some pages can read `navigator.userAgent` and "feel" mobile via UA sniffing.)

It does **not** flip `window.matchMedia('(pointer: coarse)').matches` to `true`. Verified against agent-browser 0.26.0:

```
agent-browser set device "iPhone 14"
agent-browser open http://localhost:5173/art/mondrian/
agent-browser eval "JSON.stringify({coarse: matchMedia('(pointer: coarse)').matches, touch: navigator.maxTouchPoints})"
# {"coarse":false,"touch":0}
```

Patching `window.matchMedia` via `agent-browser eval` works for that page-load only — `agent-browser reload` re-fetches the page, the patch evaporates, and any React hook that subscribes via `useEffect(() => matchMedia(...), [])` reads the un-patched value on its real mount.

## Why this matters

Several common patterns hinge on `(pointer: coarse)`:

- Caption swaps ("Press space" / "Tap the painting").
- Tap-to-X handlers that only attach on touch.
- Hover affordances suppressed on coarse pointers.

These are exactly the assertions a visual-validation run wants to verify, and exactly the ones agent-browser 0.26 cannot exercise.

## What to do

The validator should mark the row UNVERIFIABLE with a one-line note and **not** assert from source-code review alone — the standard forbids that. Closing the gap belongs to one of:

1. **Extract the `matchMedia` lookup into a pure utility** (`device.utils.ts` or similar) that takes a `matchMedia` implementation as a parameter. Test it in Vitest with a stubbed `matchMedia`. The React hook stays a thin wrapper. Lowest blast radius — no new dev deps. Recommended.
2. **Add `@testing-library/react`** to the workspace devDeps, write a `renderHook` test that calls the hook against a stubbed `matchMedia`. Bigger lift (3 packages, a vitest setup file, a new conceptual surface — React component / hook tests). Worth it only if the workspace already wants RTL for other reasons.
3. **Wait for an upstream agent-browser feature** that propagates `pointer: coarse` through device emulation (track <https://github.com/vercel-labs/agent-browser>). Until then this gap doesn't close on the visual side.

Real-device sweeps are not an option — they're manual, which the spec rule forbids.

## Don'ts

- Don't downgrade UNVERIFIABLE to PASS by reading the source code. The rule exists because the implementation can drift from the source we read; the whole point of a visual run is to observe the live DOM.
- Don't fall back to Playwright for the touch-emulation case. Playwright *does* propagate `pointer: coarse` via `page.emulate(devices['iPhone 14'])`, but the repo's tooling pick is agent-browser; switching for one row breaks the consistency rule and moves the validator off its standard.
- Don't gate the next push on closing the gap if the source code is correct *and* the surface area is genuinely cosmetic (caption swap, no behavioural change). Surface the row, document, move on.
