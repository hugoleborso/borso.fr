# Invariants — pragma, `api/src/inspirations`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Inspiration

- No audio is stored. The passage is `youtube_video_id`, `start_seconds`
  and `end_seconds`, played through the YouTube IFrame Player API, which
  stops at the end second itself.
- `youtube_video_id` matches `YOUTUBE_VIDEO_ID_PATTERN`, read from a
  `watch?v=`, `youtu.be/` or `shorts/` link by `parseYoutubeVideoId`.
- The end comes after the start, and a passage lasts 600 seconds at most
  (`selectPassageRefusal`). The form and the API apply the same rule.
- `title`, `artist`, `deezer_track_id` and `deezer_album_id` come from the
  Deezer search when a member picks a hit, or are typed by hand. Two
  inspirations may name the same Deezer track.
- The id is chosen by the device, so a retried create lands on the same
  row. The library lists them newest first.
- Every field can be edited, the passage included. A clip already placed
  from it keeps its offset and takes the new length.
- Deleting one that a sketch still uses is refused with
  `inspiration-in-use`, naming those sketches. Deleting its author keeps
  it, and the card reads *former member*.

Held by: `api/src/inspirations/inspirations.controller.test.ts` › adds an inspiration named after its author and lists the library newest first
Held by: `api/src/inspirations/inspirations.controller.test.ts` › answers the same inspiration when a create is retried with the same id
Held by: `api/src/inspirations/inspirations.controller.test.ts` › refuses an id that is not a YouTube video, an end at the start and a passage of 601 s
Held by: `api/src/inspirations/inspirations.controller.test.ts` › edits every field of an inspiration, and a clip placed from it keeps its offset
Held by: `api/src/inspirations/inspirations.controller.test.ts` › refuses an edit whose passage the create would refuse
Held by: `api/src/inspirations/inspirations.controller.test.ts` › refuses to edit an inspiration another member deleted meanwhile
Held by: `api/src/inspirations/inspirations.controller.test.ts` › refuses to delete an inspiration a sketch uses and names that sketch
Held by: `api/src/inspirations/inspirations.controller.test.ts` › deletes an unused inspiration once, then answers that it is not found
Held by: `api/src/inspirations/inspirations.controller.test.ts` › counts the sketches using an inspiration, two clips of one sketch as one
Held by: `api/src/members/members.controller.test.ts` › keeps the inspirations of a deleted member with no author
Held by: `domain/inspiration.core.test.ts` › reads the id from watch, youtu.be and shorts links and refuses a playlist or a channel
