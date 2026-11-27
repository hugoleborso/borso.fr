---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#238'
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/no-inline-ref-callback.js, .oxlintrc.json]
time-to-detect: one review round
tags: [react, frontend, eslint, pragma, testing, validation]
zone: apps/pragma/site/src/components/organisms/SetlistSongPicker.tsx
recurs: none (the useSyncExternalStore rule holds the same class for subscribe; nothing held it for ref)
---

# The ref that cancelled every keystroke

## User impact

A band member adding songs to a setlist in pragma could not find a song the
catalogue lacked (measured by round 2 of technical validation on PR #238,
`docs/features/pragma/several-calendar-feeds/validation/technical-validation-2026-10-29-1451.md`,
row B07). It never reached `main`.

| | Seen | Expected |
| --- | --- | --- |
| Typing a title no catalogue song matches in Add songs | Nothing, because `searchedTitle` never left `''` | The music service's results for that title |

The validator's jsdom probe of the same pattern printed
`debounced callback fired: 0 cancel calls: 1`.

## Causal chain

- The music-service search never ran.
  - The debounce was cancelled on every keystroke. Each keystroke calls
    `setQuery` and arms the debounce, and the re-render that follows runs the
    ref's cleanup, which cancels it.
    - React 19 treats a new ref callback as a detach of the old one and runs
      the cleanup the old one returned. The faulty line, added by round 1's
      fix, commit `1dfe16e5`:

      ```tsx
      <Input
        ref={() => publishSearchedTitle.cancel} // a new function each render, so its cleanup runs each commit
      ```

      - Round 1 wrote it to cancel the debounce on unmount, because
        `SetlistSongPicker.test.tsx` threw `window is not defined` when a
        pending debounce fired after jsdom was torn down (archived log,
        14:35, `technical-validator`).
        - The repository bans `useEffect`, and
          `docs/standards/07-state-and-effects.md` sent unmount work to a
          `ref` callback without saying the callback must be stable
          (Material).
        - The test-side fix, fake timers, shipped in PR #235 at 15:57 UTC and
          its knowledge entry at 17:36 UTC. Round 1's fix is dated 14:50 UTC
          (git log), so neither was there to read (Material).

## Root cause of occurrence

*Thought an inline `ref` callback that returns a cleanup runs that cleanup on
unmount, actually React 19 runs it on every render that passes a new
function, so an inline one runs it on every commit.* (Material)

The standard loaded for the fix,
[`07-state-and-effects.md`](../standards/07-state-and-effects.md), said to
prefer a `ref` callback for unmount work and said nothing of its identity.
With the "actually" known, round 1 would have shipped the `useCallback` round
2 shipped, or no production change at all.

## Detection failure causes

- **Typing:** `ref={() => fn}` type-checks. React's `RefCallback` may return
  a cleanup.
- **Linter / static analysis:** nothing flagged an inline function in `ref`.
  `borso/no-inline-subscribe-in-use-sync-external-store` holds the same class
  of bug for `useSyncExternalStore`'s `subscribe`, and only for that.
- **Functional validation locally:** the core run passed, because no test
  typed a title and waited for the music-service search. Every existing test
  stopped before the debounce fired, which is also why the flake existed.
- **Code review:** round 1's reviewer read the diff before the line existed.
  Round 2 caught it at once, which is the review working as designed. The
  cost was one extra fix round.

## Countermeasure

Commit `74a0171b` (PR #238) made the callback stable with
  `useCallback`, and added a test that types a title and asserts the search
  runs. That test fails with the old arrow.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, in the kaizen pull request of PR #238.

`borso/no-inline-ref-callback` refuses an arrow or function expression
written directly in a JSX `ref`, on every file oxlint lints. Its message
names the cause and the two stable forms. The standard now says a `ref`
callback is stable.

```diff
+    "borso/no-inline-ref-callback": "error",
```

```diff
-an event handler when one exists.
+an event handler when one exists. A `ref` callback is stable, hoisted to module
+scope or wrapped in `useCallback`. React calls a new one on every render, and
+under React 19 it first runs the cleanup the old one returned, so an inline
+`ref={() => debounced.cancel}` cancels on every keystroke rather than on
+unmount.
```

**Proof it can fail:** Round 1's line put back into a scratch copy of
`SetlistSongPicker.tsx`, then `pnpm exec oxlint` on that file:

```
SetlistSongPicker.tsx:203:20: error borso(no-inline-ref-callback): A `ref` callback must keep the same reference across renders. An inline one is a new function on every render, so React calls the old one with null, or under React 19 runs the cleanup it returned, on every commit. Hoist it to module scope, or wrap it in useCallback. See docs/standards/07-state-and-effects.md.
```

The file was then restored. Over `apps` and `infra` the rule reports nothing
today (measured), so it costs no existing code a change.

**Library considered:** `eslint-plugin-react`'s `jsx-no-bind` flags inline
functions in every prop, `ref` included, but only with `ignoreRefs: false`
and alongside every event handler. The repository writes inline handlers on
purpose, so it would need a configuration that keeps only `ref`. oxlint's
`react` plugin is not enabled here (`.oxlintrc.json`). A twenty-line rule in
`eslint-rules/` beside its `useSyncExternalStore` sibling is smaller than
enabling and narrowing a plugin.

**Similar instances:** `grep` for `ref={(`, `ref={function` and
`ref={async` across `apps/` found none. The four other organisms that
debounce in `useMemo` (`AddSongForm`, `SongSearch`, `BarPlaceSearch`,
`SuggestSongField`) cancel nothing on unmount. React 18 and later drop a
state update after unmount without a warning, so in the browser that is
harmless. In a test it is the flake
[`a-debounce-that-outlives-its-test-file`](../knowledge/a-debounce-that-outlives-its-test-file.md)
covers, and
#235's sweep found none of their tests leaves a timer pending.
