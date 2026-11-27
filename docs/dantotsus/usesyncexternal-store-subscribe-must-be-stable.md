---
date: 2026-05-15
introduced-at: implementation
detected-at: operator-deploy
severity: high
related-pr: '#23'
fix-commits: [c5eb3e0b3d]
eradication-level: 2
eradication-paths: [eslint-rules/no-inline-subscribe-in-use-sync-external-store.js, .oxlintrc.json]
time-to-detect: hours
tags: [react, performance, observability]
zone: apps/last-loop-lepin/site/src
prior-fix-commits: [4426fe4]
---

# `useSyncExternalStore` re-subscribed on every render because the callback was a fresh arrow

## User impact

Live retransmission on the preview deploy. The operator wrote: *« Le front
envoie ENORMENENT de requetes au back, beaucoup trop. »* ("The front end sends
far too many requests to the back end.")

| | Seen | Expected |
| --- | --- | --- |
| Preview API Lambda invocations, CloudWatch | about 4,100 per 5-minute bin (about 14 req/s), steady over 35 minutes | about 150 per 5-minute bin (about 0.5 req/s), from the 2 s poll of `/api/standings` |

The session that wrote this entry read those CloudWatch numbers. The same
metric on prod dropped 24 times to the expected baseline after the fix. Every
spectator page polled this way. A multi-user spike would have multiplied it.

## Causal chain

- The page fired about 28 times more requests than the 2 s timer allows.
  - Something outside the timer also called `fetchOnce`.
    - The `subscribe` callback of the hand-rolled cache did two things. It
      added the listener, and when the cache's `intervalId` was `null`, it
      started the first fetch and the interval.
      - Each consumer render passed a fresh arrow as `subscribe`. React tears
        down the old subscription and sets up the new one whenever the
        function identity changes.
        - The teardown removed the last listener and set `intervalId` back to
          `null`. The next subscribe saw `null` and fired a fresh `fetchOnce`
          and a fresh `setInterval`.
          - Each fetch changed the snapshot, which re-rendered the consumer,
            which re-subscribed. The loop ran as fast as the network allowed.
      - The faulty line, in `useStandingsPoll.ts`:

        ```ts
        return useSyncExternalStore(
          (listener) => subscribe(editionSlug, listener), // a new function on every render
          () => ({ standings: entry.standings, error: entry.error }),
          () => ({ standings: null, error: null }),
        );
        ```

        - Commit `a387b4985` ("feat(last-loop-lepin): site routes + components
          + observability", 2026-05-12, an agent) wrote it. The same commit
          built `Countdown` on `useSyncExternalStore` "over a module-scoped
          wall clock", a stable subscribe.
          - The standings subscribe needed `editionSlug`, so it could not be a
            module-scope constant like the clock's. The agent closed over the
            argument with an inline arrow.
        - PR #23 made the consumer re-render more often, with more data
          derived from each snapshot. That turned a latent waste into a loop.

## Root cause of occurrence

*Thought an arrow that only forwards to a stable, slug-keyed `subscribe` is
itself stable. Actually React compares the identity of the function it is
handed, not what that function calls. A fresh arrow on every render is a full
teardown and re-subscribe.* (Man.)

The stable pattern was in the agent's context: it wrote one in `Countdown` in
the same commit, and `apps/borsouvertures` passed module-scope subscribes at
the parent commit. The prior won when the subscribe needed an argument, which
none of those examples did. React's documentation says it plainly:

> If you pass a different subscribe function between re-renders, React will
> re-subscribe to the store using the newly passed subscribe function.
> ([react.dev, `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore))

A Machine cause sat beside it. The home-made cache started fetching from inside
`subscribe` and stopped on the last teardown. A plain subscribe would only have
wasted a listener swap, not a request.

## Detection failure causes

- **Typing:** `useSyncExternalStore` accepts any
  `(listener: () => void) => () => void`. TypeScript does not model identity
  across renders.
- **Linter:** the repository used Biome's recommended rules, which have no rule
  for this. ESLint's `react-hooks/exhaustive-deps` checks `useCallback`
  dependencies, not the raw subscribe argument.
- **Tests and CI:** `pnpm run test:core` (289 tests) and the back-e2e suite
  never count requests. No test measures the poll cadence.
- **Monitoring:** Lambda invocation counts reach CloudWatch, but no alarm is
  set on them. 14 req/s stays within the API's burst capacity.

## Countermeasure

Commit `4426fe4` in PR #23 wrapped the subscribe arrow in `useCallback` keyed on
`editionSlug`, the only value that should cause a real re-subscribe, and
`getSnapshot` for symmetry. The interval then lived its whole life and the
cadence matched the 2 s `POLL_INTERVAL_MS`.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `c5eb3e0b3` shipped a Biome Grit plugin that refused an
inline subscribe. Commit `314f24821` ("build(meta): replace biome with eslint
and prettier", 2026-08-08) replaced it with
`eslint-rules/no-inline-subscribe-in-use-sync-external-store.js`, which oxlint
runs as `borso/no-inline-subscribe-in-use-sync-external-store: error` in
`.oxlintrc.json`. It reports any `ArrowFunctionExpression`,
`FunctionExpression` or `FunctionDeclaration` passed as the first argument.

The kaizen of PR #23 also removed the cause in this app. `useStandingsPoll.ts`
and `useResource.ts` stopped calling `useSyncExternalStore` and wrapped
`useQuery` from `@tanstack/react-query`, which owns the subscription. Commit
`fcc8e1c30` later deleted `useStandingsPoll.ts` outright. That subtraction holds
for server data, but `useSyncExternalStore` stays allowed for local stores.

This entry first claimed level 1. A lint rule is level 2.

**Proof it can fail:** `eslint-rules/no-inline-subscribe-in-use-sync-external-store.test.js`
holds the refused inline shapes.

**Proposed:** the rule misses a subscribe declared in the component body and
passed by name, such as `const subscribe = (listener) => ...;
useSyncExternalStore(subscribe, ...)`. That is just as unstable. Extend the rule
to resolve an identifier argument and report it when it is bound, inside the
enclosing component or hook, to a function not wrapped in `useCallback` or
`useMemo`. Every unstable subscribe shape would then fail lint, not just the
inline one.

**Similar instances:** `git grep -n 'useSyncExternalStore(' -- apps` lists the
call sites today. They pass module-scope functions or the members of a store
built in `useMemo`, as the `hook-external-store` blueprint does
(`element-width.hook.ts`, `tab-row-overflow.hook.ts`). One passes a call,
`subscribeToMediaQuery(query)` in `media-query-matching.hook.ts`, which is
stable only because it caches one function per query in a `Map`. The rule
cannot judge that shape either way. None declares an unmemoised function in
the component body. The broader habit of rolling our own
data-fetching is
[`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md).
