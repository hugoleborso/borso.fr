# react-bits `<Galaxy />` listens for `mousemove`, not `pointermove` — touch breaks silently

The upstream [react-bits Galaxy
component](https://github.com/DavidHDev/react-bits) attaches its
mouse-repulsion handler with `mousemove` + `mouseleave`:

```js
if (mouseInteraction) {
  ctn.addEventListener('mousemove', handleMouseMove);
  ctn.addEventListener('mouseleave', handleMouseLeave);
}
```

`mousemove` does **not** fire reliably for finger drags on touch
devices. A tap may synthesize a single mouse-equivalent event (browser
dependent), but a sustained slide produces only `touchmove` / pointer
events. So on mobile, the warp / repulsion effect silently drops — the
canvas renders the static galaxy, but moving a finger across it does
nothing.

This is a vendor surprise in a popular drop-in component. The component
imports `from 'ogl'` and works on desktop out of the box; mobile is a
silent regression you only notice if you test on a phone.

## What we do in this repo

`apps/borso-fr/site/components/Galaxy.tsx` is our local copy of the
component (ADR
[`0003`](../adr/0003-react-bits-galaxy-as-react-component.md) — we
vendor the file rather than installing from a registry). We patched
the listeners to use **pointer events**:

```diff
-    const handleMouseMove = (event: MouseEvent) => { … };
-    const handleMouseLeave = () => { … };
+    const handlePointerMove = (event: PointerEvent) => { … };
+    const handlePointerLeave = () => { … };

-    container.addEventListener('mousemove', handleMouseMove);
-    container.addEventListener('mouseleave', handleMouseLeave);
+    container.addEventListener('pointermove', handlePointerMove);
+    container.addEventListener('pointerleave', handlePointerLeave);
```

Pointer events are the unified API across mouse / touch / pen. Desktop
hover keeps working (every `mousemove` is also dispatched as a
`pointermove`); finger drags now drive the warp on mobile.

Plus a CSS line on the container to keep the browser from claiming
the slide as a scroll/zoom gesture mid-drag:

```css
.galaxy-container {
  touch-action: none;
}
```

`touch-action: none` is safe here because `<body>` already has
`overflow: hidden` — there's no scroll competing with the gesture.

## Two related caveats

1. **`pointer-events: none` on the parent**
   `#bg-canvas-wrap` has `pointer-events: none` so clicks on the
   canvas surface fall through to whatever sits below in the
   z-stack. When the listener moved from the upstream `window` (run
   #1's vanilla shader) to the container (run #2's React port), the
   parent's `none` started blocking the child from receiving
   pointer events. Per spec, `pointer-events` doesn't cascade — but
   browsers' hit-testing in practice does propagate `none` to
   descendants unless they explicitly set `pointer-events: auto`.
   Galaxy.css now sets `pointer-events: auto` on `.galaxy-container`
   to make sure.

2. **Upstream-PR opportunity**
   This *should* be fixed upstream — every react-bits user mounting
   Galaxy on a touch-friendly site will hit the same. The fix is
   the three-line swap above. We haven't submitted a patch (the
   agent's hard rule is to not open PRs against repos outside
   `hugoleborso/*`); if you want to, the diff is in commit
   [`6504559`](https://github.com/hugoleborso/borso.fr/commit/6504559).

## See also

- [`docs/adr/0003-react-bits-galaxy-as-react-component.md`](../adr/0003-react-bits-galaxy-as-react-component.md)
  — why we vendor this component instead of installing from a
  registry.
- [`docs/knowledge/agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md)
  — neighbour topic: how agent-browser emulates coarse pointer
  devices for visual validation.
