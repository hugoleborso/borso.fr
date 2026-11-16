---
date: 2026-11-16
introduced-at: implementation
detected-at: qa
severity: low
related-pr: '#368'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/routes/catalog/SongScenePage.tsx, apps/pragma/site/src/routes/setlists/SetlistScenePage.tsx, apps/pragma/site/src/components/organisms/SongChartPreviews.tsx, apps/pragma/site/src/routes/catalog/SongDetailPage.test.tsx]
time-to-detect: minutes
tags: [pragma, react, frontend, visual-validation]
zone: apps/pragma/site/src/components/organisms/SongChartPreviews.tsx
recurs: none (the first stale-closure state update recorded)
---

# Two taps, one step

## User impact

During PR #368's visual validation, two clicks on *Transpose down* sent in one script moved the stepper from 0 to -1, not -2. The chords then read one semitone off, which looks like a transposition bug until the stepper value is read. A musician tapping twice by hand has not been seen to lose a step (unknown, not measured): each tap is its own browser task and React renders between them.

| | Seen | Expected |
| --- | --- | --- |
| Two transpose taps before a render | stepper `-1` | stepper `-2` |

## Causal chain

- The stepper moved one step for two clicks.
  - Both handlers ran before React rendered, so both read the same `semitones`.
    - The three callers wrote `setSemitones(clampSemitoneOffset(semitones + delta))`, computing from the rendered value instead of the pending one.

## Root cause of occurrence

*Thought the rendered `semitones` was the current value in the handler, actually it is the value of the last render, and every update queued since is invisible to it.*

## Detection failure causes

- **Tests:** `SongDetailPage.test.tsx` clicked once per render through `fireEvent`, which wraps each click in its own `act` and renders between them.

## Countermeasure

The three callers pass an updater, `setSemitones((current) => clampSemitoneOffset(current + delta))`. A new test clicks twice inside one `act` and expects `+2`.

## Eradication

**Type:** structural impossibility (level 1). An updater reads the pending value, so no number of queued taps can reuse a stale one.

**Reference:** the commit adding this file.

```diff
-onTransposeBy={(delta) => setSemitones(clampSemitoneOffset(semitones + delta))}
+onTransposeBy={(delta) => setSemitones((current) => clampSemitoneOffset(current + delta))}
```

**Proof it can fail:** with the three callers stashed, `counts two transpose taps that land before a render as two steps` fails (`Tests 1 failed | 13 passed`). With them, 14 pass.

**Similar instances:** `grep -rnE "set[A-Z][a-zA-Z]*\([^=]*[a-z][a-zA-Z]* [+-] [a-z0-9]" apps/*/site/src --include=*.tsx | grep -v "\.test\.\|=> "` finds one line, a DOM `style.setProperty` in `AutoGrowTextarea.tsx`, which is not React state. No other state setter computes from the rendered value.
