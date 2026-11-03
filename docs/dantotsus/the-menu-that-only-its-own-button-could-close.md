---
date: 2026-11-03
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#151'
fix-pr: none (the pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/components/molecules/Menu.test.tsx, apps/pragma/site/src/components/molecules/Menu.tsx]
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

- The menu stays open after a tap outside it
  - Nothing listens for that tap. `Menu` is a `<details>` whose list sits
    absolutely positioned below the `<summary>` button
    (`apps/pragma/site/src/components/molecules/Menu.tsx`)
    - A `<details>` toggles only when its own `<summary>` is activated. It
      has no light dismiss and no Escape handling, unlike a popover
    - The item path was closed by hand (`closeEnclosingMenu`), so closing
      was thought about, but only for paths that start inside the menu

```tsx
<details className="relative">
  <summary aria-label={label}>…</summary>
  <ul className="absolute top-full right-0 z-30 …">   {/* ← nothing outside closes it */}
```

## Root cause of occurrence

*Thought a `<details>` with an absolutely positioned list behaves like a
menu, actually it is a disclosure that only its own `<summary>` can close.*

The [HTML standard](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
says: "The details element represents a disclosure widget from which the
user can obtain additional information or controls." Its open state changes
when the `summary` is activated or the `open` attribute is set, and on no
other event. `<details>` was chosen in #151 because it opens and closes with
no React state and no `useEffect`, which the standards ban.

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

`Menu` renders a full-screen transparent backdrop inside the `<details>`,
between the button and the list. The browser hides it while the menu is
closed, so it needs no state. While open it covers the page under the list
(`z-20` under the list's `z-30`), and a tap on it closes the menu without
activating what lies under it. Escape on the button or an item closes the
menu and returns focus to the button.

Checked in a real browser (measured, Playwright, Chromium with touch at
375 px, same DOM): backdrop absent while closed, present while open, the
item still topmost at its own position, and a tap on a button outside
closed the menu without firing that button.

## Eradication

**Type:** detection (level 4)

**Reference:** commit `[self]` on this entry's pull request

```diff
+      <div
+        data-menu-backdrop
+        aria-hidden="true"
+        onClick={closeEnclosingMenu}
+        className="fixed inset-0 z-20"
+      />
       <ul className="absolute top-full right-0 z-30 …">
```

```diff
+  it('closes when the user taps outside the menu', () => {
+    const details = openMenu();
+    const backdrop = container.querySelector<HTMLElement>('[data-menu-backdrop]');
+    expect(backdrop).not.toBeNull();
+    act(() => backdrop?.click());
+    expect(details.open).toBe(false);
+  });
```

**Proof it can fail:** the test refused the old `Menu` with the two
failures quoted under *User impact* (measured), and passes on the fix.

Level 1 was considered. The Popover API closes on an outside tap by
construction, but placing a top-layer popover under its button needs CSS
anchor positioning, and the share of band phones that support it is
unknown. The backdrop lives in the one popup primitive, so every caller
inherits it.

**Similar instances:** `grep -rn "<details" apps/*/site/src` finds five
(measured). `Menu` is the only popup. The four in talos (`SourceView`,
`TodayFocus`, `DraftBoard`, `FoldedSection`) are inline disclosures, where
staying open is correct. All five pragma `more` menus
(`PracticeHeader`, `SessionSetlistPreview`, `SongDetailHeader`,
`SetlistEntryRow`, `SetlistHeaderActions`) render `Menu`, so the fix
reaches them all.
