---
date: 2026-11-03
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#151'
fix-commits: [df244dda3, e523fbe2d]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/components/molecules/Menu.tsx, eslint-rules/no-raw-interactive-element.js, apps/pragma/site/src/components/molecules/Menu.test.tsx]
time-to-detect: weeks
tags: [react, frontend, pragma, accessibility, testing]
zone: apps/pragma/site/src/components/molecules/Menu.tsx
recurs: none (first entry on a dismissal defect, no earlier entry covers menus or details elements)
---

# The menu that only its own button could close

## User impact

A band member opens a `more` menu (a setlist row, the setlist header, a
song, practice mode) and taps elsewhere on the page. Reported by the band on
2026-11-03.

| | Seen | Expected |
| --- | --- | --- |
| Tap outside an open menu | The menu stays open over the page | The menu closes |
| Escape with the menu open | Nothing | The menu closes, focus back on its button |

Reproduced on `main` by `Menu.test.tsx` before the fix (measured):

```
× closes when the user taps outside the menu
  AssertionError: expected null not to be null
× closes on Escape and gives focus back to its button
  AssertionError: expected true to be false
```

## Causal chain

- The menu stayed open after a tap outside it, and Escape did nothing.
  - `Menu` was a `<details>` whose list sat absolutely positioned under its
    `<summary>`. A `<details>` changes its open state only when its own
    `<summary>` is activated or `open` is set:

    ```tsx
    <details className="relative">
      <summary aria-label={label}>…</summary>
      <ul className="absolute top-full right-0 z-30 …">   {/* ← only the summary toggles it */}
    ```

    - The item path closed it by hand, with
      `event.currentTarget.closest('details')?.removeAttribute('open')`. So
      closing was handled for paths that start inside the menu only.
      - Commit `67bab8288` (PR #151, "measure member jobs on a phone and cut
        the taps and scrolls") wrote both lines in `OverflowMenu.tsx`. PR #216
        renamed it `Menu` and restyled it.
        - The author picked `<details>` because it opens and closes with no
          React state and no `useEffect`, which pragma's standards ban. Modal
          `<dialog>` examples existed in pragma at `67bab8288^`
          (`ConfirmDialog.tsx`, `ListenLinksDialog.tsx` and others), each
          opened through a ref.

## Root cause of occurrence

*Thought a `<details>` with an absolutely positioned list behaves like a menu.
Actually it is a disclosure that only its own `<summary>` can close: no light
dismiss, no Escape.* (Method)

The [HTML standard](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
says: "The details element represents a disclosure widget from which the user
can obtain additional information or controls." Its open state changes when
the `summary` is activated or the `open` attribute is set, and on no other
event.

The tag is Method. The standard that bans React state and `useEffect` for this
kind of toggle steered the author to the one stateless primitive that opens
and closes by itself, and that primitive has no way to be dismissed from
outside.

## Detection failure causes

- **Typing and lint:** nothing tells a disclosure from a menu by its markup.
- **Functional validation:** the #216 visual validations open a menu to
  read its items or reach one (row 13 of `visual-validation-slices-2-6.md`
  and R1-a of `visual-validation-review-1.md`). Both work. No row leaves a
  menu without choosing, and the spec names no dismissal behaviour
  (measured, grep over `docs/features/pragma/ux-redesign/`).
- **CI:** `Menu` and its predecessor `OverflowMenu` had no test file. The
  component looked too small to test, since its only logic was one
  `closest('details')` call.
- **Code review:** #216 renamed `OverflowMenu` to `Menu` and restyled it. A
  rename diff shows class changes, not missing behaviour.
- **Production:** dismissal sends no request and throws no error, so
  nothing records it.

## Countermeasure

Commit `df244dda3` (PR #246) made `Menu` a modal `<dialog>`, like `Sheet`,
dimmed by `backdrop:bg-scrim`. A tap on the shadow only closed it, through a
`closeOnBackdropTap` ref callback shared with `Sheet`. The browser closed it on
Escape and gave focus back to the button. Two earlier versions were replaced on
operator review: a transparent backdrop that the bottom and tab bars sat above,
and a `popover="auto"` whose closing tap also reached what was under it.

Checked on the real app (`pnpm dev`, Chromium, 375 px, measured then):

| Check | Result |
| --- | --- |
| Tap on the button | open, shadow on, list 4 px under the button |
| One tap on a song row | menu closed, nothing else opened |
| Escape | closed, focus back on the button |
| Item tap | closed, item ran |

## Eradication

**Type:** structural impossibility (level 1) for pragma's menus, with a gap.

**Reference:** the `<dialog>` this entry first shipped no longer exists.
Commit `e523fbe2d` (PR #249) rebuilt `Menu` on React Aria's `MenuTrigger` and
`Popover`, under
[ADR-2026-11-03T1438](../adr/2026-11-03T1438-pragma-interactive-primitives-come-from-react-aria-components.md)
(accepted). The library owns the tap outside, Escape and focus return, and the
ADR chose it because it passed the operator's tap rule by default. The same
commit taught `borso/no-raw-interactive-element` to refuse a raw `<button>`, a
raw `<dialog>`, a React Aria overlay outside `Sheet` or `Menu`, and a hidden
element that takes a pointer event, in `apps/pragma/site/src`.

```diff
-    <details className="relative">
-      <summary aria-label={label} …>
+    <MenuTrigger>
+      <MenuButton aria-label={label} …>
+      <Popover placement="bottom end" offset={GAP_BELOW_THE_BUTTON_PX} …>
```

`Menu.test.tsx` taps the shadow and expects the menu closed and no item run,
and presses Escape and expects focus back on the button.

**The gap:** the rule does not refuse `<details>`, and it is enabled for
`apps/pragma/site/src` only (measured, `.oxlintrc.json` line 569). A new
`<details>` popup in pragma, or any popup in another app, would pass lint.

**Proposed:** add `details` to the elements `no-raw-interactive-element`
refuses in pragma, with a message that points at `Menu` for a popup and allows
an inline disclosure by an exception on the line. Then the primitive that has
no dismissal cannot be written as a popup again.

**Proof it can fail:** `Menu.test.tsx` failed with the backdrop callback
removed when the `<dialog>` version shipped (measured then). Not re-run on the
React Aria version this session.

**Similar instances:** `grep -rn "<details" apps/*/site/src --include=*.tsx`
finds five, all in talos and all inline disclosures, where staying open is
correct. `grep -rln "<Menu\b" apps/pragma/site/src` lists the pragma screens
whose `more` menu renders `Menu`, so the library's dismissal reaches them all.
