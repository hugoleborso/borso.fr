# Invariants of pragma, in `api/src/compositions`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Composition

- A composition is its own record: an id chosen by the device, a title of
  1 to 256 characters, a nullable `song_id` and `created_at`. Creating one
  asks only for a title, prefilled "Composition N" where N is one past the
  compositions already there.
- Its **sketch** is where it is written. The compositions screen lists
  compositions only, newest first.
- **Add to catalogue** creates a song with the composition's title,
  `origin = original` and `status = idea`, and sets `song_id`, in one
  transaction that claims the composition row first. A second tap, or two
  members at once, answer the same song.
- Deleting a composition deletes its lanes and clips and keeps its
  catalogue song and the inspirations. Deleting the song keeps the
  composition and clears `song_id`, so **Add to catalogue** is offered
  again.
- A song's `origin` only says whether the band wrote it. A song with
  `origin = original` that no composition links, such as one written
  outside pragma, stays in Songs and never appears on the compositions
  screen. The column is nullable with no default, because Aurora DSQL
  cannot add a `NOT NULL` column after the table exists, so a row written
  before the column reads as `cover` through `resolveSongOrigin`.

Held by: `api/src/compositions/compositions.controller.test.ts` › creates a composition with only a title, lists newest first and renames one
Held by: `api/src/compositions/compositions.controller.test.ts` › adds a composition to the catalogue as an original idea, and answers the same song when tapped again
Held by: `api/src/compositions/compositions.controller.test.ts` › creates one song when two members add the same composition at the same moment
Held by: `api/src/compositions/compositions.controller.test.ts` › deletes a composition with its lanes and clips, and keeps its song and the inspirations
Held by: `api/src/songs/songs.controller.test.ts` › keeps the composition and its sketch when its catalogue song is deleted, and clears the link
Held by: `domain/song-origin.core.test.ts` › reads a row written before the column existed as a cover
