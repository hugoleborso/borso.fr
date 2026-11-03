# Setlist breaks

## Goal

A band plans its concert in two sets with an intermission, and a practice with
a pause to tune or drink. Today a setlist holds songs only, so the band writes
"pause" in a song note. This feature lets a setlist hold breaks between its
songs.

## Behaviour

- A member adds a break from a song's more menu, with **Add a break after**.
  The break appears right under that song.
- A break carries a free label up to 80 characters ("Intermission", "Tune the
  bass"). An empty label reads as **Break**. The member edits it in place, and
  leaving the field saves it.
- A member removes a break from its own more menu.
- On the Order page a break is one more row to drag. It has no number, no
  energy and no length, and the energy curve and the total time ignore it.
- Song numbers count songs only, so a break never shifts them.
- The transition note between two songs is not offered across a break.
- The **My part** view and the **Lineup** view show songs only.
- An assistant reads breaks in `get_setlist` (each placed after
  `afterSongCount` songs) and adds, renames or removes one with
  `save_setlist_break`.

## Data shape

- New table `setlist_break`: `id`, `setlist_id`, `position`, `label`
  (`NOT NULL DEFAULT ''`). `setlist_entry.song_id` is `NOT NULL` and Aurora
  DSQL cannot relax it, so a break is not an entry.
- A break shares the `position` sequence of the setlist's entries. Every
  append takes the position after the last item, and every delete compacts
  songs and breaks into one gapless run.
- `PUT /setlists/:id/reorder` takes either every id (songs and breaks), or the
  song ids only. With song ids only, each break keeps its slot, so the undo of
  a removal and the assistant's `reorder_setlist` need no change.
- `GET /setlists/:id/breaks` answers each break with `songsBefore`, the number
  of songs played before it. The site places breaks by that count, so an
  optimistic song reorder never needs the break positions.
- `POST /setlists/:id/breaks` takes `afterEntryId` and `label`.
  `PUT` and `DELETE /setlists/:id/breaks/:breakId` rename and remove. All three
  answer the fresh break list, which the site writes into its cache.
- Closing a vote rewrites the setlist's entries and drops its breaks.

## Out of scope

- A duration on a break.
- Breaks in the practice view, the session preview and the copied running
  order.
