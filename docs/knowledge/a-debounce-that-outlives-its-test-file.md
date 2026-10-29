---
summary: 'A debounce timer still pending when a jsdom test file ends fires after jsdom is gone and fails the run with "window is not defined"; a green rerun in isolation proves nothing.'
triggers:
  output:
    - 'window is not defined'
---

# A debounce that outlives its test file

PR #235's pre-push gate failed once on
`apps/pragma/site/src/components/organisms/SetlistSongPicker.test.tsx` with
`ReferenceError: window is not defined`. The file passed 3 runs of 3 in
isolation (measured by the shipping session).

## What happens

`SetlistSongPicker` publishes its search through `debounce` from
`apps/pragma/site/src/lib/debounce.utils.ts`, a real `setTimeout` of 400 ms.
A synchronous test that calls `fireEvent.change` on the search box ends at
once, with the timer still pending. `cleanup()` unmounts the component but
does not clear the timer, and the repository bans `useEffect`, so no unmount
cleanup cancels it either. When the timer fires after vitest has torn down
jsdom for that file, the state update needs `window`, which is gone, and it
throws (inferred from the error text and from the fake-timer fix holding).

Whether the timer fires before or after the teardown depends on how long the
rest of the file takes, so the failure shows under the load of the full gate
and hides when the file runs alone.

## What to do

Fake the timers in the file that types into a debounced field without waiting
for the search, and drop whatever is pending after each test. This is #235's
fix:

```ts
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});
```

Faking only `setTimeout` and `clearTimeout` leaves the promise and
microtask timing that Testing Library's `waitFor` relies on untouched.

A test that waits for the debounced result, as
`SuggestSongField.test.tsx` does with `waitFor`, lets the timer fire inside
the test and needs no change.

## Siblings checked on 2026-10-29

Five organisms use `debounce` inside `useMemo`: `AddSongForm`, `SongSearch`,
`SetlistSongPicker`, `BarPlaceSearch` and `SuggestSongField`. Only
`SetlistSongPicker`'s tests typed without waiting. `SuggestSongField`'s tests
wait for the search result. `AddSongPage`, `SongEditForm` and `BarsPage`, which
render the other three, never type into the debounced field. The five test
files passed 3 runs of 3 together (measured).
