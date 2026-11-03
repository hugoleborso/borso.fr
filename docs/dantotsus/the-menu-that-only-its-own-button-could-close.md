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

## Symptom

A band member opens a `more` menu (a setlist row, the setlist header, a song,
practice mode) and taps elsewhere on the page. The menu stays open over the
page. It closes only when they tap the same `more` button again or choose an
item. Escape does nothing either. Reported by the band on 2026-11-03.

Reproduced on `main` by `Menu.test.tsx` before the fix (measured):

```
× closes when the user taps outside the menu
  AssertionError: expected null not to be null
× closes on Escape and gives focus back to its button
  AssertionError: expected true to be false
```

## Root-cause chain

1. **Why does the menu stay open?**
   Nothing listens for a tap outside it. `Menu` is a `<details>` whose list is
   positioned absolutely below the `<summary>` button
   (`apps/pragma/site/src/components/molecules/Menu.tsx`).
2. **Why does `<details>` not close on its own?**
   It is a disclosure widget. The browser toggles it only when its `<summary>`
   is activated. It has no light dismiss and no Escape handling, unlike a
   popover.
3. **Why was `<details>` chosen?**
   It gave open and close with no state and no `useEffect`, which the
   standards ban. An item tap was handled by hand (`closeEnclosingMenu`), so
   the author did think about closing, but only for the paths that start
   inside the menu.

```tsx
<details className="relative">
  <summary aria-label={label}>…</summary>
  <ul className="absolute top-full right-0 z-30 …">   {/* ← nothing outside closes it */}
```

**Root cause:** thought a `<details>` with an absolutely positioned list
behaves like a menu, actually it is a disclosure that only its own
`<summary>` can close, so a tap outside or Escape leaves it open.

Validation: had the author known that, they would have added the outside
path when they added the item path, since `closeEnclosingMenu` was already
written for it.

## Detection failure causes

- **Typing / linter:** nothing can tell a disclosure from a menu by its
  markup.
- **Functional validation:** the #216 visual validations open a menu to
  read its items or to reach one (row 13 of `visual-validation-slices-2-6.md`
  and R1-a of `visual-validation-review-1.md`). Both work. No row leaves a
  menu without choosing, and the spec names no dismissal behaviour
  (measured, grep over `docs/features/pragma/ux-redesign/`).
- **CI:** `Menu` and its predecessor `OverflowMenu` had no test file. The
  component looked too small to test, because its only logic was one
  `closest('details')` call.
- **Code review:** #216 renamed `OverflowMenu` to `Menu` and restyled it. A
  rename diff shows class changes, not missing behaviour.
- **Production:** dismissal leaves no request and no error, so nothing
  records it.

## Countermeasure

- **Code:** commit `[self]`. `Menu` renders a full-screen transparent
  backdrop inside the `<details>`, between the button and the list. The
  browser hides it while the menu is closed, so it needs no state. While the
  menu is open it covers the page under the list (`z-20` under the list's
  `z-30`), and a tap on it closes the menu without activating what lies
  under it. Escape on the button or an item closes the menu and returns
  focus to the button.
- **Real browser:** Playwright, Chromium with touch at 375 px, same DOM
  (measured): backdrop absent while closed, present while open, the item
  still the topmost element at its own position, and a tap on a button
  outside closed the menu without firing that button.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a test that exercises the previously
untested path)

**Reference:** commit `[self]` on this entry's pull request

**The actual fix:**

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

The test refused the old `Menu` with the two failures quoted under
*Symptom* (measured), and passes on the fix.

Level 1 was considered. The Popover API gives light dismiss by
construction, but placing a top-layer popover under its button needs CSS
anchor positioning, and the share of band phones that support it is
unknown. The backdrop lives in the one popup primitive, so every caller
inherits it.

**Sibling defects swept:** every `<details>` in the repository. `Menu` is
the only one used as a popup. The five in talos (`SourceView`, `TodayFocus`,
`DraftBoard`, `FoldedSection`) are inline disclosures, where staying open is
correct. All five pragma `more` menus (`PracticeHeader`,
`SessionSetlistPreview`, `SongDetailHeader`, `SetlistEntryRow`,
`SetlistHeaderActions`) render `Menu`, so the fix reaches them all.

## See also

- [The ref that cancelled every keystroke](the-ref-that-cancelled-every-keystroke.md),
  another pragma molecule whose missing test let a behaviour gap ship.
