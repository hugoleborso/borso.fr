# Invariants — pragma, `api/src/sketches`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Sketch

- A sketch has no row of its own: it is the **sketch lanes** of one
  **composition** and the **sketch clips** placed on them.
  `GET /api/sketches/:compositionId` reads the composition with both.
- A clip can come from the library, or from an inspiration a member
  creates from the lane's sheet, which joins the library and lands on that
  lane at the scroll position the sheet was opened at.
- Every member edits at once, with no lock. Each write is saved on its own,
  the last one saved wins, and other open screens refresh through the
  `sketches` written root.
- The timeline runs 30 seconds past the last clip's end
  (`SKETCH_TAIL_SECONDS`).
- Deleting the composition deletes its lanes and clips and keeps the
  inspirations.

Held by: `api/src/sketches/sketches.controller.test.ts` › reads an empty sketch with its composition and answers 404 for a composition that does not exist
Held by: `api/src/sketches/sketches.controller.test.ts` › places an inspiration created from the sketch on the lane it was started from
Held by: `api/src/sketches/sketches.controller.test.ts` › refuses a lane for a composition deleted while the lane was being added
Held by: `domain/sketch.core.test.ts` › snaps 3.6 s to 4 and -2 s to 0, and extends the timeline 30 s past the last clip

## Sketch lane

- A lane belongs to one composition. Every write names the composition in
  its path, and a lane of another composition reads as `lane-not-found`.
- Lanes are listed by `position`, then id. A new lane goes under the last.
- Deleting a lane deletes its clips and keeps their inspirations. The lane
  row is deleted before its clips, so a clip placed at the same moment is
  either refused or deleted with the rest.

Held by: `api/src/sketches/sketches.controller.test.ts` › adds lanes in their position, renames one and places a clip on it
Held by: `api/src/sketches/sketches.controller.test.ts` › deletes a lane with its clips and keeps their inspirations
Held by: `api/src/sketches/sketches.controller.test.ts` › leaves no orphan clip when its lane is deleted while it is placed

## Sketch clip

- `offset_seconds` is a whole number, never below 0:00. The site snaps a
  drop to the nearest second (`snapOffsetSeconds`), and the API refuses a
  negative or fractional offset.
- Its width is its inspiration's length, read at draw time, so editing the
  inspiration's passage resizes every clip placed from it.
- Clips may overlap, on one lane or across lanes. Nothing checks it.
- Placing a clip claims its lane and its inspiration in the same
  transaction as the insert, and is refused with `lane-not-found` or
  `inspiration-not-found` when either is gone. A move or a removal of a
  clip removed meanwhile is refused with `clip-not-found`.
- Two moves of one clip at the same moment both succeed, and the clip
  stays at one of the two positions.

Held by: `api/src/sketches/sketches.controller.test.ts` › answers the same clip when a placement is retried with the same id
Held by: `api/src/sketches/sketches.controller.test.ts` › moves a clip in time and onto another lane, and refuses a negative or fractional offset
Held by: `api/src/sketches/sketches.controller.test.ts` › leaves the clip at one of two moves sent at the same moment
Held by: `api/src/sketches/sketches.controller.test.ts` › refuses a clip naming a lane or an inspiration another member deleted, or a lane of another composition
Held by: `api/src/sketches/sketches.controller.test.ts` › refuses to move a clip removed meanwhile, or onto a lane deleted meanwhile
Held by: `api/src/sketches/sketches.controller.test.ts` › leaves no orphan clip when its inspiration is deleted while it is placed
Held by: `site/src/routes/compos/sketch-timeline.core.test.ts` › gives a clip the width of its passage and drops a clip whose inspiration is not in the list
