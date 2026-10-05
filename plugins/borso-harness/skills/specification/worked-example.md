# Worked example — "As a commuter, I want to see the waiting time for a new ride"

A complete spec following the canonical template, captured locally as a reference for the level of depth and brevity expected. Adapted from the Theodo Academy example.

---

# As a commuter, I want to see the waiting time for a new ride

## Why

Need for a waiting time estimate before booking a ride. Aim: increase the number of rides by improving the experience for both Riders and Drivers.

- **For Dynamic City Commuters** — get to their destination quicker by giving them a realistic estimation of the waiting time.
    - Target: **95% accuracy** of waiting-time estimation.
- **For Gig Economy Drivers** — limit empty drives and ride cancellations.
    - Target: **~10% reduction** in ride cancellations, measured 30 days after go-live.

**Budget:** 5 dev-days.

## Result

[Figma mockup — ride-options screen showing "≈ 4 min" next to each vehicle category (UberX / Van / Green), with an "unavailable" state for categories with no nearby driver.]

## Use cases / edge cases

[BPMN — pickup location entered → query waiting-time service → display estimate per category → user picks a category → confirm pickup. Branches for: estimate unavailable, estimate stale, all categories unavailable.]

Happy path:
1. User enters a pickup location.
2. App calls `/waiting-time?pickup=<lat,long>`.
3. App displays an estimate per vehicle category, with min–max seconds.
4. User picks a category and confirms.

Edge cases:
- Estimate cannot be produced for some categories → show "unavailable" for those categories.
- All categories unavailable → show a single "no rides nearby" state.
- User pans the map after the estimate is shown → keep showing the previous estimate (see Q.O.D.).

Error cases:
- Maps ETA upstream times out or errors → fall back to "unavailable".
- Driver-location data is stale (`last_position_update` older than threshold) → exclude that driver.

## Questions, Options and Decisions

| Question | Options | Decision |
| --- | --- | --- |
| If the waiting time changes significantly (±5 min) after the user selects a category, do we display a toast/alert? | (a) Display a toast — slightly better UX on edge case. (b) Do not display. | **No toast** — extra noise on a rare path. |
| If the user moves on the map while looking at the waiting time, do we recalculate automatically? | (a) Recalculate live — performance issues, may degrade adoption. (b) Recalculate after 5 min — not usable, may confuse the user. (c) Do not recalculate. | **Do not recalculate** — for performance reasons. |
| What data source will be used to estimate the waiting time? | Internal blueprint (Estimated Delivery Time) + dedicated ADR on waiting-time computation. | **GPS distance + traffic.** |
| Do we evolve the current API endpoint or create one? | (a) Create a new endpoint. (b) Add logic to the existing one — couples concerns; weaker DDD boundary. | **Dedicated endpoint** `/waiting-time?pickup=<lat,long>`. |
| How many requests per minute can the app safely perform? | n/a | **≤ 100 rpm** — avoids excessive polling and battery drain. |

**Out of scope:** push notifications when waiting time drops.

## Changes

### Types to add

```ts
// New value object
export type WaitingTimeEstimate = {
  categoryId: 'UBERX' | 'VAN' | 'GREEN';
  minSeconds: number | null;
  maxSeconds: number | null;
  status: 'AVAILABLE' | 'UNAVAILABLE';
};

// Domain Service input
export type WaitingTimeRequest = {
  pickupLat: number;
  pickupLng: number;
};
```

### Database

```sql
-- Add freshness timestamp to driver location table
ALTER TABLE driver_locations
ADD COLUMN last_position_update TIMESTAMP NOT NULL DEFAULT NOW();

-- Add vehicle category to drivers table (if missing)
ALTER TABLE drivers
ADD COLUMN category VARCHAR(20);
```

### Files to change

Backend:
```
src/dispatch/waiting-time/WaitingTimeEstimator.ts     // NEW
src/dispatch/waiting-time/WaitingTimeController.ts    // NEW
src/dispatch/MapsEtaClient.ts                         // NEW
src/dispatch/DriverLocationRepository.ts              // UPDATE: add findNearestAvailableDrivers()
src/api/router.ts                                     // UPDATE: register new route
```

Frontend:
```
src/RideOptions/RideOptionsViewModel.ts               // UPDATE
src/RideOptions/RideOptionsViewController.ts          // UPDATE
src/Networking/RidesAPI.ts                            // UPDATE
```

### Test strategy

- Unit tests on `WaitingTimeEstimator` covering the happy path + each edge case in *Use cases*.
- Integration test on `/waiting-time` against a fake `MapsEtaClient` and an in-memory `DriverLocationRepository`.
- A smoke test on the front-end view-model verifying the "unavailable" state renders when the API returns no estimate.

## Production strategy

### Analytics

- `waiting_time_accuracy_error_seconds`
    - **What:** for each completed ride, log the absolute difference between the **estimated waiting time** and the **actual driver arrival time** (in seconds).
    - **How we check it:** dashboard with p50 / p75 / p90 per **city** and **vehicle category**.
    - **Success criteria:**
        - p75 error **< 180 seconds** (3 minutes).
        - No city/category with p90 error **> 300 seconds** over a rolling 7-day window.
- A/B test on `number_of_rides` with 50% of users having the feature.

### Zero-defect strategy

- `WaitingTimeEstimationFailedError`
    - **When raised:** the `/waiting-time` endpoint cannot produce any estimate (unexpected internal error, invalid data) and we fall back to "unavailable".
    - **Alerting:** Sentry issue with tags `city`, `vehicleCategory`, `environment`. Alert if **> 50 occurrences in 5 minutes** in production.
- `MapsEtaTimeoutError`
    - **When raised:** the call to the external Maps ETA API times out or exceeds our retry policy.
    - **Alerting:** same Sentry tags; threshold tuned per city after one week of baseline data.
