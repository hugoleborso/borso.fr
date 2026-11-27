---
date: 2026-11-16
introduced-at: implementation
detected-at: qa
severity: low
related-pr: '#368'
fix-commits: [self]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/routes/catalog/SongDetailPage.test.tsx, apps/pragma/site/src/components/organisms/SongChartPreviews.tsx]
time-to-detect: minutes
tags: [pragma, react, frontend, visual-validation]
zone: apps/pragma/site/src/components/organisms/SongChartPreviews.tsx
recurs: none (the first stale-closure state update recorded)
---

# Two taps, one step

## User impact

During PR #368's visual validation, two clicks on *Transpose down* sent in one script moved the stepper from 0 to -1, not -2. The chords then read one semitone off, which looks like a transposition bug until the stepper value is read. A musician tapping twice by hand has not been seen to lose a step (unknown, not measured). Each tap is its own browser task and React renders between them.

| | Seen | Expected |
| --- | --- | --- |
| Two transpose taps before a render | stepper `-1` | stepper `-2` |

## Causal chain

- The stepper moved one step for two clicks.
  - Both handlers ran before React rendered, so both read the same `semitones`.
    - The three callers computed the next value from the rendered one:

      ```tsx
      // reads `semitones` from the last render, not the pending update
      onTransposeBy={(delta) => setSemitones(clampSemitoneOffset(semitones + delta))}
      ```

      - Commit `c418738b4` ("feat(pragma): a setlist plays through Mode Scène, song by song", 2026-08-25, 36 files, 2141 insertions) wrote it. The same hunk deleted the correct form it replaced:

        ```diff
        -  const stepSemitones = (delta: number): void => {
        -    setSemitones((current) => clampSemitoneOffset(current + delta));
        +              onTransposeBy={(delta) => setSemitones(clampSemitoneOffset(semitones + delta))}
        ```

        - The commit folded the named step helpers into inline props of a new `SceneControls` organism, and the updater did not survive the fold. The third caller, in `SongChartPreviews.tsx`, came later in `de91fdfe8` with the same inline form.

## Root cause of occurrence

*Thought the rendered `semitones` was the current value inside the handler. Actually it is the value of the last render, and every update queued since is invisible to it.* (Man.)

The agent that wrote `c418738b4` had the right pattern in its context: it was on the lines the same commit deleted. The prior won while it rewrote the handlers as one-line props in a 2141-line change. That the size of the change crowded it out is inferred. A document would not have helped, because the correct code was already in front of the writer.

## Detection failure causes

- **Tests:** `SongDetailPage.test.tsx` clicked once per render through `fireEvent`, which wraps each click in its own `act` and renders between them.
- **Linter:** no rule reads a state setter's argument. `react-hooks` checks dependency arrays, not the value a setter is computed from.

## Countermeasure

The three callers pass an updater, `setSemitones((current) => clampSemitoneOffset(current + delta))`. A new test clicks twice inside one `act` and expects `+2`.

## Eradication

**Type:** detection (level 4)

**Reference:** the commit adding this file, `b48ce3675` ("docs: lessons from PR #368 (#370)").

```diff
-onTransposeBy={(delta) => setSemitones(clampSemitoneOffset(semitones + delta))}
+onTransposeBy={(delta) => setSemitones((current) => clampSemitoneOffset(current + delta))}
```

This entry first claimed level 1. It is level 4. The updater fixed three call sites, and nothing stops the next `setX(x + n)`. What holds is the test `counts two transpose taps that land before a render as two steps` in `SongDetailPage.test.tsx`, which guards `SongChartPreviews.tsx` only. The two scene pages have since moved their transposition to `useScenePreferences` (see below), so `SongChartPreviews.tsx` holds the only `setSemitones` call left.

**Proof it can fail:** with the three callers stashed, the test fails (`Tests 1 failed | 13 passed`). With them, 14 pass.

**Proposed:** add a rule under `eslint-rules/`, on the pattern of `no-server-state-in-use-state.js`, which already recognises setters by `^set[A-Z]`. It would refuse a setter call whose argument reads the state variable from the same `useState` destructuring, and accept an updater. It covers arithmetic and toggles alike. Fix `SessionGearPage.tsx` with it. A component could then no longer compute its next state from the rendered value, which would be level 2. The store shape below needs the matching subtraction: `save` takes an updater, or reads the stored value itself, so no caller can pass a value computed from a render.

**Similar instances:**

- `apps/pragma/site/src/routes/sessions/SessionGearPage.tsx:162` has `onPress={() => setIsMineOnly(!isMineOnly)}`, the same class. The original sweep's regex matched only `name [+-] name` and missed it.
- `apps/pragma/site/src/lib/scene-preferences.store.ts` has `transposition.save(transposition.value + delta)` and `fontSize.save(fontSize.value + delta)`. `value` is the rendered snapshot of `useSyncExternalStore`. Commit `4735626ea` (PR #376) wrote it three days after this entry. Whether two taps before a render lose a step there is unverified (inferred same class).
