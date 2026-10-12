# Catalogue search: four layouts compared

Measured at 375 × 667 on the preview seed, with the task-speed run's
*Open a song's chord chart* job and the position of the first song card.

| Variant | First song at | Taps | Modelled time |
| --- | ---: | ---: | ---: |
| A · search on its own row (before) | 241px | 2 | 6 s |
| B · search icon beside the title, opening the field | 208px | 3 | 7.1 s |
| C · title and field on one row | 208px | 2 | 6 s |
| D · field alone, no title | 208px | 2 | 6 s |

`375-four-variants.png` shows the four screens and
`find-chart-four-variants.mp4` the job on each, side by side.

## What the guidelines say

- Material 3 keeps a persistent search bar when search is the screen's
  primary action, and an expandable one when it is secondary.
- Apple's guidelines place the field inline above the list it searches, or
  hide it under the navigation bar until the list is pulled down.
- Nielsen Norman Group favours a visible field where people search often,
  and an icon only once testing shows people find it.

Searching the catalogue is the chart job, which is frequent, so the icon
(B) costs a tap on the job that matters for the same space C and D save.
The pull-to-reveal layout was not prototyped: a web page has no navigation
bar to tuck the field under, and the Next concert card sits above it.

## Chosen: C

The operator picked C. `PageHeader` gains an `inline` slot that sits on the
title's row; the catalogue puts its search there at every width, capped at
380px on desktop, and the placeholder is the one word *Search*.
`375-1280-chosen.png` shows the result at both widths, and
`task-speed.json` holds every job unchanged from `../ui-pass/task-speed.json`.
