---
date: 2026-11-03
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#151'
fix-pr: none (the pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/components/molecules/Menu.tsx, apps/pragma/site/src/styles/tokens.css, apps/pragma/site/src/components/molecules/Menu.test.tsx]
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

`Menu` is now a native popover, `popover="auto"`. Its button opens it with
`popoverTarget`, and each item closes it with `popoverTargetAction="hide"`
before running. The browser closes it on a tap outside and on Escape, gives
focus back to the button, and draws it above every other layer.

Placement under the button uses CSS anchor positioning inside
`@supports (position-area: bottom)` in `tokens.css`. A browser without it
shows the popover centred on screen, because the same file restores the
`margin: auto` that Tailwind's preflight removes.

A first version hand-wrote the dismissal with a transparent backdrop. The
operator asked why it did not reuse the platform popover. Checking the
running app then showed that backdrop's own defect: the bottom bar (`z30`)
and the tab bar (`z40`) sat above it and stayed tappable with a menu open.

Checked on the real app (`pnpm dev`, Chromium, 375 px, measured):

| Check | Result |
| --- | --- |
| Tap on the button | open, list top 4 px under the button, right edges aligned |
| Tap outside | closed |
| Escape | closed, focus back on the button |
| Last menu on the page | list fits under its button inside the viewport |
| Item tap | closed, item ran |
| `@supports` rule removed, as in a browser without anchor positioning | list centred on screen |

One behaviour differs from the backdrop: the tap that closes the menu also
reaches what is under it. A tap on a song row closes the menu and opens
the song sheet (measured). This is how a light-dismiss popover works in
Chromium.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `[self]` on this entry's pull request

```diff
-    <details className="relative">
-      <summary aria-label={label} …>
+      <button type="button" popoverTarget={popoverId} aria-label={label} …>
-      <ul className="absolute top-full right-0 z-30 …">
+      <ul id={popoverId} popover="auto" data-anchored-menu …>
```

Dismissal is no longer code in this repository. The browser owns it for
every caller of `Menu`, so no future menu can forget a dismissal path.
`Menu.test.tsx` pins the wiring: the list is `popover="auto"`, the button
targets it, and each item hides it before running.

**Similar instances:** `grep -rn "<details" apps/*/site/src` finds five
(measured). `Menu` is the only popup. The four in talos (`SourceView`,
`TodayFocus`, `DraftBoard`, `FoldedSection`) are inline disclosures, where
staying open is correct. All five pragma `more` menus
(`PracticeHeader`, `SessionSetlistPreview`, `SongDetailHeader`,
`SetlistEntryRow`, `SetlistHeaderActions`) render `Menu`, so the fix
reaches them all.
