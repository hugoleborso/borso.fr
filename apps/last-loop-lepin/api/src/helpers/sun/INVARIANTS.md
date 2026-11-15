# Invariants of last-loop-lepin, in `api/src/helpers/sun`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/last-loop-lepin/`.

## Sunrise and sunset

- Computed from the track's start coordinates and the start date by
  `computeSunriseSunset`, a port of the U.S. Naval Observatory's compact
  algorithm, using the standard 90.833° zenith, which already folds in the
  solar disc and refraction. Its golden-value test pins every coefficient of
  that algorithm to the millisecond.
- Recomputed whenever an edition in `setup` has its start moved or its GPX
  replaced.
- A place and date with no sunrise or no sunset raises `SunCalculationError`,
  which the edition endpoints answer as a 400.
