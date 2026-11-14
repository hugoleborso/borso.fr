# Spec: a "to play" song status

The operator asked for a "to play" category in the pragma catalogue. He chose a new song status over a setlist-based filter or renaming "idea".

## Goal

A band member can mark a song the band has chosen to play but has not started working on, and find those songs in the catalogue.

## Data shape

- `SONG_STATUSES` becomes `idea`, `to_play`, `wip`, `rehearsed`, `concert_ready`, in that order.
- The `song.status` column stays plain `text`. No migration.

## Use cases

1. The API accepts `to_play` on song create and update, and still refuses any status outside the list.
2. The song form offers "To play" / "À jouer" as a status.
3. The catalogue shows a "To play" / "À jouer" filter chip, between "In progress" and "Ideas". It lists only `to_play` songs, and `?filter=to_play` in the address selects it.
4. A `to_play` song shows a status badge labelled "To play" / "À jouer", in its own tone.
5. In the audience pool, a `to_play` song carries the not-concert-ready marker "not started yet" / "pas encore commencé".
6. Every page still works at 375 px wide.

## Out of scope

- The setlist add-songs filters. A `to_play` song appears there under "Not in setlist".
