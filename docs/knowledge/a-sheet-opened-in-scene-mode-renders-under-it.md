---
summary: "Scene Mode is a native modal dialog in the browser's top layer; open a panel from it inside `SceneStage`, which points React Aria's portal at the stage, or the panel renders under the stage and is never seen."
triggers:
  paths:
    - 'apps/pragma/site/src/routes/**/*Scene*.tsx'
    - 'apps/pragma/site/src/components/organisms/Scene*.tsx'
---

# A Sheet opened in Scene Mode renders under it

Scene Mode opens with `dialog.showModal()` (`scene-dialog.adapter.ts`), which
puts the whole scene in the browser's top layer. React Aria portals every
overlay, `Sheet` included, to `document.body` by default, and the body is under
the top layer. PR #377 met it with the transition popup, mounted, focused and
invisible.

Since PR #380 both Scene pages render through
`apps/pragma/site/src/components/atoms/SceneStage.tsx`, which wraps the stage in
React Aria's `UNSAFE_PortalProvider` pointed at the stage dialog. A `Sheet`, a
popover or a tooltip opened inside it lands in the top layer. A new stage-like
screen built from its own `<dialog>` needs the same provider.
[ADR-2026-11-19T1802](../adr/2026-11-19T1802-scene-mode-hosts-react-aria-overlays-through-a-portal-provider.md)
records the choice.

Two traps of a hand-made dialog nested in the stage, both met on PR #380:

- React passes the nested dialog's `close` event up to the stage's `onClose`.
  `SceneStage` leaves only on its own close.
- A Close button that unmounts the dialog without closing it drops focus to
  `<body>`. Close it natively, with a `<form method="dialog">` submit button.
