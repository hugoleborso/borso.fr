---
date: 2026-11-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#314'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/vitest-jsdom-missing-apis.js, apps/talos/vitest.config.ts, apps/pragma/vitest.config.ts]
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
        - Commit 20bf60b83 (PR #314, an agent session) settled the talos test
          on the prefixed name:

          ```ts
          const JSDOM_PREFIXED_ANIMATION_EVENTS = {
            animationStart: 'webkitAnimationStart',   // ← the faulty line
          ```

          - The same map had been in pragma's tests since e55214d69 (PR #278,
            2026-11-05), so the codebase showed the vendor name as the way to
            fire an animation event under jsdom. **Machine.**

## Root cause of occurrence

*Thought jsdom is a browser that lacks layout, actually it lacks whole event
constructors too, and React reads that absence to choose its event names.*
**Machine:** the test tool hides the gap, and the repository's two earlier
tests taught the workaround instead of the cause.

## Detection failure causes

- **Local:** the failure is an assertion on a handler that was never called.
  Nothing names the event, so the cause takes reading react-dom.
- **Review:** the prefixed map in pragma's tests read as a known jsdom quirk,
  and it passed.

## Countermeasure

Define `AnimationEvent` before react-dom loads, in a Vitest `setupFiles`
entry shared by both apps' `core` project. The three tests now fire
`new AnimationEvent('animationstart', …)`. The prefixed maps are gone.

## Eradication

**Type:** structural impossibility (level 1), in the two apps whose
components listen for animation events.

**Reference:** the commit adding this file. The setup file was renamed from
`vitest-jsdom-animation-event.js` to `scripts/vitest-jsdom-missing-apis.js`
in 0729a0132, which also added a `ResizeObserver` stub. Pragma and talos
still load it (`apps/pragma/vitest.config.ts:93`).

```diff
+          setupFiles: ['../../scripts/vitest-jsdom-missing-apis.js'],
-const JSDOM_PREFIXED_ANIMATION_EVENTS = {
-  animationStart: 'webkitAnimationStart',
+  const event = new AnimationEvent(ANIMATION_EVENT_TYPES[kind], { bubbles: true, animationName });
```

It holds in two of the seven jsdom configs. banana-rush, borso-fr,
borsouvertures, last-loop-lepin and skull-king do not load the file. None of
their components listens for an animation or transition event today:
`grep -rlnE 'on(Animation|Transition)(Start|End|Iteration|Run|Cancel)' apps/*/site/src`
finds files in pragma and talos only (measured 2026-11-27). The trap is
latent in the other five, not live.

**Proposed:** add the `setupFiles` line to every jsdom project, and define
`TransitionEvent` in the same file. react-dom picks its transition event
names the same way: `react-dom-client.development.js` tests
`"AnimationEvent" in window` at line 28095 and `"TransitionEvent" in window`
at line 28099 (read this session). The first animation or transition test in any app
then fires the standard event and reaches its handler.

**Proof it can fail:** with the `setupFiles` line removed from
`apps/talos/vitest.config.ts`, `OpeningOverlay.test.tsx` fails 4 of 7 tests
with `ReferenceError: AnimationEvent is not defined`. With it, 7 of 7 pass,
and pragma's `OpeningScreen.test.tsx` passes 7 of 7 (measured). Before
`RequireSession.test.tsx` moved to the standard names, the pre-push gate
failed it with `expected undefined to be 'leaving'`, because React no longer
listened for the prefixed event.

**Similar instances:** `grep -rln 'webkitAnimation\|webkitTransition'
apps/*/site/src` found the three tests above and now finds nothing.
`grep -rln "vitest-jsdom-missing-apis" apps/*/vitest.config.ts` lists the
apps that load the setup file.
