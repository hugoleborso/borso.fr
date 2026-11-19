---
date: 2026-11-19
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#377'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/lib/modal-dialog.adapter.ts]
time-to-detect: hours
tags: [pragma, frontend, react, accessibility, visual-validation]
zone: apps/pragma/site/src/components/organisms/SceneTransitionStrip.tsx
recurs: none (the earlier dialog entries are about sizing and menus, not about closing a native dialog)
---

# The popup that closed by disappearing

## User impact

A musician on Scene Mode with a keyboard, from the merge of PR #377 to the
merge of PR #380. Measured by the visual validators of PR #380 on a local
build.

| | Seen | Expected |
| --- | --- | --- |
| Escape on the transition popup | the popup and Scene Mode both closed, back to the setlist page | the popup closes, the stage stays |
| Close on the popup, then the arrow keys | focus on `<body>`, the arrows do nothing until a click on the stage | the arrows change song |
| An arrow press after the popup closed | one song change, then a dead keyboard | every press changes song |

## Causal chain

- The arrow keys stopped changing song after the popup closed.
  - Focus was on `<body>`, outside the stage `<dialog>` whose `onKeyDown` reads the keys.
    - The Close button set React state, and React removed the popup `<dialog>` while it was still open.
      - The browser gives focus back to the opener only when a modal dialog closes, and nothing closed it.
        - `openDialogOnAttach` called `showModal()` on attach and returned nothing, so detach never called `close()`.
- Escape on the popup also left Scene Mode.
  - React handed the popup's `close` event to the stage `<dialog onClose={leaveScene}>` above it in the component tree.
- After a song change the strip remounted and dropped the focus its button held.

## Root cause of occurrence

*Thought a native dialog that leaves the DOM is closed, actually it is
removed open, and only `close()` hands focus back.* The adapter opened every
pragma dialog and closed none. borsouvertures' `Modal` already returned
`() => dialog?.close()` from its ref callback (`apps/borsouvertures/site/src/components/atoms/Modal.tsx`).

The popup was a raw `<dialog>` at all because a React Aria `Sheet` rendered
under Scene Mode's top layer, so PR #377 built one by hand behind an
`eslint-disable` for `borso/no-raw-interactive-element`. That rule exists so
focus and dismissal are written once.

## Detection failure causes

- **Unit tests:** jsdom has no `close()` and no focus restore, so a test of
  the popup could not see either path.
- **Visual validation of PR #377:** its spec named opening and closing the
  popup, not the keyboard after it. Nobody pressed Escape on the popup or an
  arrow after closing it.
- **Lint:** the `eslint-disable` said why a raw dialog was needed, and nothing
  asked what it then had to do by hand.

## Countermeasure

PR #380 fixed the three paths: the stage leaves only on a close event from
itself (`isEventFromItself`), the Close button submits a `method="dialog"`
form, and the stage takes focus on every arrow press. Each has a test in
`SceneStage.test.tsx` and `SceneTransitionStrip.test.tsx`. PR #380 also made
`SceneStage` host React Aria overlays, so a new popup on stage is a `Sheet`.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file.

```diff
-export function openDialogOnAttach(dialog: HTMLDialogElement | null): void {
-  if (dialog === null) return;
-  dialog.showModal();
-  focusFirstField(dialog);
-}
+export function openDialogOnAttach(dialog: HTMLDialogElement | null): () => void {
+  dialog?.showModal();
+  focusFirstField(dialog);
+  return () => dialog?.close();
+}
```

A dialog opened through the adapter now closes when React removes it,
whatever removed it, so focus goes back to its opener. The shared jsdom setup
(`scripts/vitest-jsdom-missing-apis.js`) gained `close()`, so a test can see
it.

**Proof it can fail:** with the cleanup planted back to `() => undefined`,
`modal-dialog.adapter.test.ts` fails with `expected "vi.fn()" to be called 1
times, but got 0 times`.

**Similar instances:** `grep -rn "<dialog" apps/*/site/src` finds three. The
stage and the popup open through this adapter. borsouvertures' `Modal`
already closes on detach. The popup stays a raw dialog by choice, recorded in
ADR-2026-11-19T1802 as a product call.
