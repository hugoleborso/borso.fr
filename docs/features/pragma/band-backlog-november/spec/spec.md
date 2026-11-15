# Four items from the band's improvements backlog

## Goal

Ship four items the band filed in Improvements: back links that return to
the parent as it was left, reordering a rehearsal's songs, a flame that
lights when a member opens the app, and legible tabs in scene mode.

## Behaviour

### Back links

1. A header back link (for example "< Groupe" on Improvements) that leads
   to the page the member just came from returns to it as it was left: a
   filter or view chosen on the parent (its `?filter=` or `?view=` query)
   is still selected.
2. After that tap, the browser back button does not reopen the child page.
3. Opened directly by its address, a page's back link still leads to its
   parent.

### Rehearsal song order

4. On a practice with two songs or more, the Songs tab shows an "Ordonner
   les morceaux" / "Order songs" action in the bottom bar. At 375 px it may
   show only its icon.
5. It opens the Order screen of the practice's songs. Its back link and
   Done return to the practice, not to a setlist.
6. A new order shows on the practice's Songs tab after Done.
7. The action is absent with fewer than two songs.

### Flame

8. The song page has no "Révisé" / "Practised" toggle any more.
9. A member who opens the app today has today counted in their flame (the
   streak sheet from the flame on Home shows today lit).

### Tabs in scene mode

10. A chart holding a tab block (`{start_of_tab}` ... `{end_of_tab}`)
    shows a "Tab" badge in scene mode.
11. Each tab line stays on one line with its columns aligned, at 375 px and
    at 1280 px. A line too wide for the screen scrolls sideways inside its
    block; the page itself never scrolls sideways.
12. Transposing in scene mode changes the lyric chords and leaves the tab
    lines as written.

## Acceptance

Every behaviour above holds in the running app at 375 px.

## Out of scope

PDF or image charts in scene mode. Linking the band's Drive.
