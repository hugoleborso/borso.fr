# Start a setlist from other setlists

## Why

A member building a setlist often starts from one the band already plays.
Today the Add songs sheet only lists the catalogue, so each song is picked again by hand.
The practice songs sheet already lets a member tick setlists and then untick songs.
The setlist editor gets the same gesture.

## What the member sees

- The Add songs sheet opens on two tabs, Catalogue and Setlists. Catalogue is unchanged.
- Setlists lists every other setlist that holds songs, in the order of the Setlists page.
  The setlist being edited and empty setlists are left out.
- Ticking a setlist picks all its songs, in setlist order, after the songs already picked.
  A song already in the edited setlist is skipped. A song in two ticked setlists is picked once.
- Under the setlists, "Songs of the ticked setlists" lists the pooled songs with their pick number.
  Tapping one unpicks it, tapping again picks it back at the end.
- Unticking a setlist unpicks its songs, except those another ticked setlist still holds.
- The footer button adds the picks at the end of the setlist, in pick order, like the catalogue tab.

## Data

No schema or API change. `GET /api/setlists` returns each setlist's `songIds` by position, because `listEntryOwners` in `setlist-entry.repository.ts` orders by `position` (read this session).
The picks live in the existing `useAddSongsDraft` store. The ticked setlists are local state of the sheet.

## Held by

- `site/src/components/organisms/add-songs-from-setlists.core.test.ts` (100% coverage, 100% mutation score, measured)
- `site/src/components/organisms/SetlistSongPicker.test.tsx` › picks the songs of ticked setlists, and adds only those left ticked
- `site/src/components/organisms/SetlistSongPicker.test.tsx` › unpicks the songs of a setlist once it is unticked
- `validation/picker-setlists-375.png`, the local app at 375 px after ticking a setlist and unticking one song
