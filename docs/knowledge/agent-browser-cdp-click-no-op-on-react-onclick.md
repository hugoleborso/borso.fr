# `agent-browser click @ref` no-ops on some React `onClick` handlers; `element.click()` via `eval` works

## Symptom

When the visual-validator drives the running app via `agent-browser`, calling `agent-browser click @e23` (or whichever ref) on certain buttons silently does nothing — the React `onClick` handler doesn't fire, the URL doesn't update, no error message. The same button responds correctly to a direct `element.click()` invoked through `agent-browser eval`.

## Why

`agent-browser` uses Chrome DevTools Protocol (CDP) `Input.dispatchMouseEvent` for the `click @<ref>` command. CDP synthesises a `mouseup` / `mousedown` / `click` sequence at coordinates derived from the element's bounding box. For some React component shapes — especially ones that render a `<button>` whose JSX `onClick` is wired through a `useCallback` closure that re-renders frequently — the synthesised event lands but the React listener on the underlying DOM node is the wrong one (closure version mismatch, or the event target is a child element React's delegation didn't expect).

The `element.click()` API, in contrast, dispatches a synthetic `MouseEvent` directly via DOM, which React's event delegation layer handles correctly.

## Workaround

When `agent-browser click @<ref>` does nothing:

```bash
agent-browser eval "document.querySelector('<unique-selector>').click()"
```

The validator can fall back to this for `<button>` elements that look correct in the snapshot but don't react to CDP clicks. Note in the report's evidence column that the click was via `eval`, not via the agent-browser ref path, so future readers know which path was taken.

## Affected (observed) cases on borso.fr

- The framed-canvas `<button>` (`Composition. Click to recompose.` aria-label) — actually responds to CDP clicks.
- The rail's `Compose →` button — does *not* respond to CDP clicks; needs `eval`.
- Palette segment buttons (Classique / Muted / …) — needs `eval`.
- Animation segment buttons (Still / Drift / …) — needs `eval`.

The pattern: buttons that render via the shared `Segments` / `EditableSwatch` / `ReadOnlySwatch` components (which add an extra layer of React abstraction) tend to need `eval`; raw `<button>` elements with a direct `onClick` work via CDP.

## Why this isn't a defect of the implementation

The buttons work correctly in real browsers, with real users, and with `element.click()`. The failure is in the agent-browser CDP path's interaction with React's event delegation, not in the React code. No fix is needed in `apps/borso-fr`.

## Worth following

- agent-browser issue tracker: <https://github.com/vercel-labs/agent-browser>. If a future release fixes the CDP path's React compatibility, this knowledge entry can be removed.
- The companion entry [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md) catalogues another agent-browser tooling gap encountered during the same PR's validation runs.
