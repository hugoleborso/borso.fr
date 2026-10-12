# UI pass: less chrome, less text

Measured at 375 × 667, in French, against the preview seed.

## The catalogue

| Block | Before | After |
| --- | ---: | ---: |
| Next concert card | 124px | 62px |
| Crumb, title and subtitle | 80px | 25px |
| Status filters | 98px, two rows | 50px, one row that scrolls sideways |
| First song starts at | 440px | 241px |
| Songs visible above the tab bar | 1 | 3 |

`375-catalog-before-after.png` shows both.

## What changed

- **Page header, on every page.** The crumb is hidden below `sm`, the title
  is 26px instead of 34px, and pages start 16px from the top instead of 28px.
  The desktop header is unchanged.
- **Subtitles that described the page are gone**: tasks, compositions,
  sessions, setlists, bars, instruments, improvements, members, and the
  catalogue's song count, which the status filters already show. The concert
  page and the setlist page keep theirs, because those carry a date, a venue
  and a capacity.
- **Field hints that described the form are gone**: the Deezer search and
  track id hints, the multi-instrument hint in the lineup editor, the
  bar-support hint, the song-defaults hint, the account contact hint, and the
  two instruments-page hints.
- **Create actions are a round `+` button**: new song, new setlist, add song
  to a setlist. Copy order is a round icon button beside it, with a new copy
  glyph. The bottom action bar no longer draws a full-width band; the buttons
  float bottom right and still hide while scrolling down.
- **The Next concert card is one row**: venue over date, then *My part* and a
  play button for the stage view. *Vote now* joins them while a vote is open
  and wraps the row if needed.
- **Quick add placeholders** read *New task* and *New bar*.

## Kept on purpose

The outreach template's `{{bar}}` syntax, the accepted upload formats, the
swipe hint on the vote card, the offline banner, the OpenStreetMap
attribution, and the mastery matrix's sideways-scroll hint. Each says
something the screen cannot show. The last one is a candidate for a visual
cue instead of a sentence.

## Costs

- The floating `+` covers the right edge of a song card while it is shown;
  it hides as soon as the list scrolls down.
- On a phone, the last status filter is off screen until the row is swiped;
  the half-visible pill at the edge is the only cue.

## Task speed

`task-speed.json` is this run. Every job holds the numbers of `../after.json`;
the one change is that *Open a song's chord chart* now counts a stretch tap,
because the search field moved up into the top quarter of the screen.
