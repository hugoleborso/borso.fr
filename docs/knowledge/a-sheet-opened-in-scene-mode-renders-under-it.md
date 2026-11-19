---
summary: "pragma's `Sheet` portals to `document.body`, which sits under Scene Mode's native modal dialog, so a Sheet opened from Scene Mode is never seen; nest a native `<dialog>` instead, as `SceneTransitionStrip.tsx` does."
triggers:
  paths:
    - 'apps/pragma/site/src/routes/**/*Scene*.tsx'
    - 'apps/pragma/site/src/components/organisms/Scene*.tsx'
---

# A Sheet opened in Scene Mode renders under it

Scene Mode opens with `dialog.showModal()` (`scene-dialog.adapter.ts`), which
puts the whole scene in the browser's top layer. `Sheet` is a React Aria
`ModalOverlay`, and React Aria portals every overlay to `document.body`. The
body is under the top layer, so a Sheet opened from Scene Mode is mounted,
focused and invisible.

PR #377 met it with the transition popup. The fix is a second native
`<dialog>` opened with `openDialogOnAttach` inside the scene, because a modal
dialog opened from inside the top layer stacks above it. See
`apps/pragma/site/src/components/organisms/SceneTransitionStrip.tsx`.

React Aria can portal elsewhere through `UNSAFE_PortalProvider`, exported by
`react-aria`, which pragma does not depend on directly (checked against
`react-aria-components` 1.22.1, which does not re-export it). Wrapping the scene
in that provider would let every `Sheet` work there. It needs the new direct
dependency, which is an ADR decision.
