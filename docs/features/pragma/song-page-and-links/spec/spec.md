# Song page, band links, flame and tab transposition

## Goal

Check in the running app the changes the band asked for after the first
validation round: a song page that puts listening first, shared band links
on the Groupe page, a flame lit by sessions and app use, and tabs that
transpose in scene mode.

## Behaviour

### Song page

1. The header shows the cover, the title, the artist and the status. It
   shows no key (tonality).
2. A song with a Deezer track has a round play button on its cover. It
   toggles to pause and back. A song without one has no play button.
3. The listen links (Spotify, Deezer when present) sit under the header.
4. The tabs are Info, Chords and Takes. `?tab=lineup` opens Info.
5. Info shows, in this order: the comments card, energy on one row, the
   line-up as chips (member and instrument icon, no mastery).
6. The line-up's Edit opens the line-up editor. The ⋯ menu holds Edit,
   which opens the song edit page.
7. The Chords tab offers full screen (scene mode).
8. The page shows no "My part" card and no mastery bars.

### Band links

9. The Groupe page has a Links section. Adding a link takes a name and an
   https address. A non-https address is refused.
10. A link opens in a new tab. Deleting one asks for confirmation.

### Flame

11. A member who opens the app today has today lit on the flame.
12. The streak sheet lists each member's flame and has no "Study a song"
    button.

### Tabs in scene mode

13. Transposing a chart that holds a tab block shifts its fret numbers,
    and the strings keep their columns aligned.

## Acceptance

Every behaviour above holds in the running app at 375 px.

## Out of scope

The 20:00 reminder push, which needs a real phone and a clock.
