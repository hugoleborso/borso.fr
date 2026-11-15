# Invariants of last-loop-lepin, in `api/src/helpers/gpx`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/last-loop-lepin/`.

## GPX track

- `parseGpx` throws `GpxParseError` for input with no `<gpx>` or `<trk>` root
  and for input with no usable `<trkpt>`. The edition endpoints answer both as
  a 400.
- `startLatLng` is the first track point. It is what the sunrise and sunset
  calculation and the self-punch distance both read.
- Per-point elevations and per-point time fractions are all or nothing: one
  point missing the value drops the whole series. Time fractions increase
  strictly from 0 to 1, and each series present has the same length as
  `points`.
- Climb is cumulative positive change with a 3 m noise floor, so descents and
  GPS jitter do not add to it.
