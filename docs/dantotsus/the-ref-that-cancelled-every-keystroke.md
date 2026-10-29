---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#238'
fix-pr: '#238'
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/no-inline-ref-callback.js, .oxlintrc.json]
time-to-detect: one review round
tags: [react, frontend, eslint, pragma, testing, validation]
zone: apps/pragma/site/src/components/organisms/SetlistSongPicker.tsx
recurs: none (the useSyncExternalStore rule holds the same class for subscribe; nothing held it for ref)
---

# The ref that cancelled every keystroke

## Symptom

Round 2 of technical validation on PR #238 found that Add songs no longer
searched the music service. Typing a title no catalogue song matched showed
nothing, because `searchedTitle` never left `''`
(`docs/features/pragma/several-calendar-feeds/validation/technical-validation-2026-10-29-1451.md`,
row B07). The validator's jsdom probe of the same pattern printed
`debounced callback fired: 0 cancel calls: 1`.

The regression came from round 1's own fix, commit `1dfe16e5`, which added
one line:

```tsx
<Input
  ref={() => publishSearchedTitle.cancel}
```

It never reached `main`. Round 2's fix, `74a0171b`, replaced it with a
`useCallback` before the merge.

## Root-cause chain

1. **Why was the search cancelled?** The arrow is a new function on every
   render. React 19 treats a new ref callback as a detach of the old one,
   and the old one had returned `publishSearchedTitle.cancel` as its
   cleanup. Each keystroke calls `setQuery` and then arms the debounce. The
   re-render that follows runs the cleanup and cancels the debounce it just
   armed.
2. **Why was a ref used to cancel a debounce?** Round 1 had a flaky core run.
   `SetlistSongPicker.test.tsx` threw `window is not defined` when a pending
   debounce fired after jsdom was torn down (archived log, 14:35,
   `technical-validator`). The fix looked for an unmount hook. The repository
   bans `useEffect` (`docs/standards/07-state-and-effects.md`), and that
   standard says to prefer a `ref` callback. It did not say the callback must
   be stable.
3. **Why was a test flake fixed in production code?** The cause was a timer
   the test left pending, which is a test fault. PR #235, merged the same
   day, fixed the same flake in the test file with fake timers, and its sweep
   wrote it up in `docs/knowledge/a-debounce-that-outlives-its-test-file.md`.
   Round 1's fix is dated 14:50 UTC. #235 merged at 15:57 UTC and the entry at
   17:36 UTC (git log), so #238 could read neither.
4. **Why did no test catch the regression?** No test typed a title and
   waited for the music-service search. Every existing test stopped before
   the debounce fired, which is also why the flake existed.

**Root cause:** thought an inline `ref` callback that returns a cleanup runs
that cleanup on unmount, actually React 19 runs it on every render that
passes a new function, so an inline one runs it on every commit.

With that known, the round-1 fix would have been the `useCallback` round 2
shipped, or no production change at all.

## Detection failure causes

- **Typing:** `ref={() => fn}` type-checks. React's `RefCallback` may return
  a cleanup.
- **Linter / static analysis:** nothing flagged an inline function in `ref`.
  `borso/no-inline-subscribe-in-use-sync-external-store` holds the same class
  of bug for `useSyncExternalStore`'s `subscribe`, and only for that.
- **Functional validation locally:** the core run passed, because no test
  exercised the debounced search.
- **Code review:** round 1's reviewer read the diff before the line existed.
  Round 2 caught it at once, which is the review working as designed. The
  cost was one extra fix round.

## Countermeasure

- **Code:** commit `74a0171b` (PR #238) made the callback stable with
  `useCallback`, and added a test that types a title and asserts the search
  runs. That test fails with the old arrow.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — linter)

**Reference:** [PR #238](https://github.com/hugoleborso/borso.fr/pull/238) · the commit adding this file

**The actual fix:**

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

**Proof it fires.** Round 1's line put back into a scratch copy of
`SetlistSongPicker.tsx`, then `pnpm exec oxlint` on that file:

```
SetlistSongPicker.tsx:203:20: error borso(no-inline-ref-callback): A `ref` callback must keep the same reference across renders. An inline one is a new function on every render, so React calls the old one with null, or under React 19 runs the cleanup it returned, on every commit. Hoist it to module scope, or wrap it in useCallback. See docs/standards/07-state-and-effects.md.
```

The file was then restored. Over `apps` and `infra` the rule reports nothing
today (measured), so it costs no existing code a change.

**Library considered.** `eslint-plugin-react`'s `jsx-no-bind` flags inline
functions in every prop, `ref` included, but only with `ignoreRefs: false`
and alongside every event handler. The repository writes inline handlers on
purpose, so it would need a configuration that keeps only `ref`. oxlint's
`react` plugin is not enabled here (`.oxlintrc.json`). A twenty-line rule in
`eslint-rules/` beside its `useSyncExternalStore` sibling is smaller than
enabling and narrowing a plugin.

**Sibling defects swept:** `grep` for `ref={(`, `ref={function` and
`ref={async` across `apps/` found none. The four other organisms that
debounce in `useMemo` (`AddSongForm`, `SongSearch`, `BarPlaceSearch`,
`SuggestSongField`) cancel nothing on unmount. React 18 and later drop a
state update after unmount without a warning, so in the browser that is
harmless. In a test it is the flake the knowledge entry below covers, and
#235's sweep found none of their tests leaves a timer pending.

## See also

- [`../knowledge/a-debounce-that-outlives-its-test-file.md`](../knowledge/a-debounce-that-outlives-its-test-file.md),
  the test-side fix for the flake that started this chain.
- [`../standards/07-state-and-effects.md`](../standards/07-state-and-effects.md),
  which sends unmount work to a `ref` callback.
