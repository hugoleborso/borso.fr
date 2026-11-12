---
date: 2026-11-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#314'
fix-pr: none (lands with the kaizen pull request for PR #314)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/vitest-jsdom-animation-event.js, apps/talos/vitest.config.ts, apps/pragma/vitest.config.ts]
time-to-detect: minutes
tags: [vitest, testing, react, talos, pragma]
zone: apps/talos/site/src/components/organisms/OpeningOverlay.test.tsx
recurs: none (first entry on jsdom's missing event constructors; the pragma test that hit it first logged nothing)
---

# A test fired an event React was not listening for

## User impact

No user saw anything. The developer of Talos's opening overlay lost a test
cycle, and the test that came out of it speaks an event name no browser sends.

| | Seen | Expected |
| --- | --- | --- |
| A test fires `animationstart` on the overlay | the handler never runs, and the test fails on its assertion with no error | the handler runs, as it does in every browser |
| The fix the test settled on | a map from `animationStart` to `webkitAnimationStart` | the standard event name |

Pragma's `OpeningScreen.test.tsx` and `RequireSession.test.tsx` had hit the
same wall before and each written the same map (`JSDOM_ANIMATION_EVENT_TYPES`).
Two apps, three tests, one trap (measured with
`grep -rln webkitAnimation apps/*/site/src` on `main`).

## Causal chain

- The test's handler never ran.
  - React attached `onAnimationStart` to `webkitAnimationStart`.
    - react-dom picks the vendor name when it loads: when `AnimationEvent`
      is missing from `window`, it drops the unprefixed name.
      - jsdom implements no `AnimationEvent` (inferred from
        `ReferenceError: AnimationEvent is not defined`, measured below).

## Root cause of occurrence

*Thought jsdom is a browser that lacks layout, actually it lacks whole event
constructors too, and React reads that absence to choose its event names.*

## Detection failure causes

- **Local:** the failure is an assertion on a handler that was never called.
  Nothing names the event, so the cause takes reading react-dom.

## Countermeasure

Define `AnimationEvent` before react-dom loads, in a Vitest `setupFiles`
entry shared by both apps' `core` project. The three tests now fire
`new AnimationEvent('animationstart', …)`. The prefixed maps are gone.

## Eradication

**Type:** structural impossibility (level 1). The trap no longer exists in
either app's test environment.

**Reference:** this commit.

```diff
+          setupFiles: ['../../scripts/vitest-jsdom-animation-event.js'],
-const JSDOM_PREFIXED_ANIMATION_EVENTS = {
-  animationStart: 'webkitAnimationStart',
+  const event = new AnimationEvent(ANIMATION_EVENT_TYPES[kind], { bubbles: true, animationName });
```

**Proof it can fail:** with the `setupFiles` line removed from
`apps/talos/vitest.config.ts`, `OpeningOverlay.test.tsx` fails 4 of 7 tests
with `ReferenceError: AnimationEvent is not defined`. With it, 7 of 7 pass,
and pragma's `OpeningScreen.test.tsx` passes 7 of 7 (measured). The setup
file also proved the other way: before `RequireSession.test.tsx` moved to
the standard names, the pre-push gate failed it with `expected undefined to
be 'leaving'`, because React no longer listened for the prefixed event.

**Similar instances:** `grep -rln 'webkitAnimation\|webkitTransition'
apps/*/site/src` found the three tests above and now finds nothing. `TransitionEvent` has the same shape in
react-dom, and no test in the repository fires a transition event yet.
