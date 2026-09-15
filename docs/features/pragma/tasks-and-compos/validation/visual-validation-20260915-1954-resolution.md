# Resolution of the 2026-09-15 19:54 visual validation

The validator's report is left as it was written. This note says what each of its
FAIL rows turned out to be, and what changed in response. Read the two together.

## The three FAIL rows

**Rows 11 and 17 — the compo named on a task was the other compo.** The checklist
was wrong, not the screen. The tasks were seeded by a script that took
`songs[0]` from the originals and called it *Runaway Sun*; the API returns the
catalogue newest first, so `songs[0]` was *Last Call*. The rendering agreed with
the data on both screens, which the validator verified against `GET /api/tasks`
before failing the rows. No code change.

**Row 16 — the chord chart printed `[F]Last call` rather than chords over
lyrics.** This is `ChordChartViewer`'s rendering, not something the compositions
screen does: it draws a chord token as `[{chord}]` in the accent colour beside
the lyric it precedes, and the song detail page and both scene views have always
looked the same. The checklist asked for a layout the application does not have
anywhere. No code change. Changing it would be a change to every chart in the
app, and belongs to its own conversation.

## The findings the validator raised unasked, which were real

Three were defects in this branch and are fixed in the commit that carries this
note:

- **The done checkbox was a 16 by 16 px target.** A real tap at its centre
  landed, so nothing was broken, but the box was the target and the row was not.
  The input now sits inside a 44 by 44 px label, which is what the rest of the
  application uses, and the row's delete control gained `shrink-0` so its own
  44 px minimum survives a long title.
- **A finished task still showed its due date in the danger colour.** Overdue was
  computed from the date alone. It now also asks whether the task is still open,
  so "racheter des cordes", done and a fortnight late, reads as neutral.
- **The instrument count beside each composition was 11 px `text-ink-400`**, which
  the validator measured at 3.34:1 against the paper background and is below AA.
  It is now 12 px `text-ink-500`, measured at 5.6:1 in the same pass.

Two further findings are deliberate and stay:

- **Un-ticking a done task returns it to *à faire*, not to the status it held
  before.** `nextStatusAfterToggle` is a two-way switch between done and the
  status a task starts at. Restoring *en cours* would mean storing the status a
  task held before it was finished, which is a column and a migration for an
  undo of a single click; the form sets any status in one more tap.
- **The delete control is a bare `×`.** It opens a confirmation dialog, so the
  destructive step is the dialog rather than the glyph.

## What was re-measured after the fixes

At 375 px, in the same browser: the checkbox target is 44 by 44 and the delete
control is 44 by 44; of the four due dates on the board only the open overdue one
is `rgb(168, 58, 42)`, the done one having gone back to `rgb(106, 95, 83)`; the
composition counts are 12 px `rgb(106, 95, 83)`; and the page has no horizontal
scroll.
