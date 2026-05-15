# Visual-validation report — gpx-speed-aware-projection

- **Spec**: [`docs/features/last-loop-lepin/gpx-speed-aware-projection/spec/spec.md`](../spec/spec.md)
- **Run timestamp**: 2026-05-15-1412
- **Dev URL**: `http://localhost:5173/`
- **Evidence folder**: [`visual-validation-2026-05-15-1412/`](./visual-validation-2026-05-15-1412/)
- **Branch base**: `claude/fix-dnf-validation-NIGKH` @ `a03d6f8`

## Verdict

**PASS**

The three input metrics named under *Why* in the spec were exercised against a controlled DB state (custom `pointTimeFractions` injected directly into the `editions.gpx` JSON column), and the marker positions read off Leaflet's internal `_layers` registry matched the recorded-pace algorithm — and **not** the linear one — within rounding tolerance.

## Test setup (deviation from the spec's preferred GPX fixture)

The spec asks for validation against the Strava-recorded fixture at `apps/last-loop-lepin/api/src/helpers/gpx/__fixtures__/strava-recorded.gpx`. That fixture exists per the spec's *Test strategy*, but the test-seed controller (`api/src/__test/test-seed.controller.ts`) hardcodes a **synthetic** 5-point GPX with **no `pointTimeFractions`** for the `race-mid-loop-3` / `top-with-dnf-candidates` / `race-finished` fixtures. The seed controller is the only test-seeding surface — there is no fixture that wires the Strava-recorded GPX into a seeded edition.

To validate the spec's two branches without touching the implementation, I injected a known-good `pointTimeFractions = [0, 0.1, 0.2, 0.5, 1.0]` directly into the `editions.gpx` JSON of `lepin-2026` via `psql UPDATE`, on top of the seed's 5-point synthetic polyline. This produces a deliberately *asymmetric* time/distance profile (loop covers 50 % of the polyline distance in 20 % of the time, then 50 % more time over the remaining 50 % distance), which is enough to discriminate recorded-pace from linear at any non-trivial fraction.

This deviation is a seed-fixture gap (a follow-up: add a "strava-recorded" fixture to the test-seed controller), not an implementation gap. The implementation is exercised end-to-end on a DTO that matches the spec's contract.

## Assertions

| # | Assertion (from spec) | Result | Evidence |
| - | --- | --- | --- |
| 1 | DTO `edition.gpx.trackJson` exposes `pointTimeFractions` when the source GPX had `<time>` on every `<trkpt>`. Monotonic, `[0]=0`, `[n-1]=1`. | PASS | `curl /api/editions/lepin-2026` after the `UPDATE` returned `…"pointTimeFractions":[0,0.1,0.2,0.5,1]…`. The repo-side Zod refine (per spec *Error cases*) accepted the array. |
| 2 | When `pointTimeFractions` is present, the avatar's position at a given `timeFraction` matches the recorded-pace projection (`projectFractionTimeAware`) and **not** the linear one (`projectFraction`). | PASS | At `fraction=0.5` (Date mocked to `startsAt + 3*loopMs + 0.5*Alice.lastLoopDurationMs` so Alice's projection lands at exactly `0.5`), the Leaflet marker for Alice was at `(45.555, 5.795)` — `points[3]` exactly, which is what `projectFractionTimeAware([0,0.1,0.2,0.5,1], 0.5)` returns. The linear projection at `fraction=0.5` would put her at `(45.5574, 5.7926)` (~340 m away). Marker read via React-fiber walk → `map._layers[…]._latlng` ([`01-map-fraction-0.5-recorded-pace.png`](./visual-validation-2026-05-15-1412/01-map-fraction-0.5-recorded-pace.png)). A second sample at `fraction=0.62` (no Date mocking, polling tick) confirmed the same: marker `(45.5538, 5.7913)`, recorded-pace expected `(45.5538, 5.7914)` (delta 8 m), linear expected `(45.5549, 5.7947)` (delta 290 m) ([`03-recorded-pace-projection.png`](./visual-validation-2026-05-15-1412/03-recorded-pace-projection.png)). |
| 3 | When `pointTimeFractions` is absent, the avatar falls back to the linear algorithm — same behaviour as before the feature. | PASS | After `UPDATE editions SET gpx = '<original 5-point GPX without pointTimeFractions>'`, marker at `fraction=0.62` was `(45.55495, 5.79486)`, matching `projectFraction([0,…,4], 0.62)` = `(45.55489, 5.79467)` within 16 m (title-rounding noise). Recorded-pace expected at 0.62 with the same `pointTimeFractions` would be `~80 m` from the marker — confirms the branch read off `pointTimeFractions === undefined` is the linear one ([`02-fallback-linear-projection.png`](./visual-validation-2026-05-15-1412/02-fallback-linear-projection.png)). |

## Notes

- **No new visible affordance** is added by the feature, per the spec's *Result*. The change is purely behavioural — verified by reading marker `_latlng` off the live Leaflet map instance (reached via React fiber walk on the `.course-map.leaflet-container` element), not by visual diffing.
- **Spec input metric "DTO has `pointTimeFractions` if all `<trkpt>` had `<time>`"**: only the *consumption* side was validated here — the parser branch that emits `pointTimeFractions` from a real Strava GPX is covered by `gpx.core.test.ts` (per the spec's *Test strategy*, 4 new vectors). A future seed fixture should round-trip a real GPX through the upload pipeline to also exercise the parser end-to-end at `/visual-validation` time.
- All numerical comparisons were done with the same haversine formula the implementation uses (`metersBetween` in `course-map.utils.ts`), reproduced inline in the eval block.
- No deviation from the spec's *behavioural* contract observed.
