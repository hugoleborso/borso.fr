---
date: 2026-05-15
introduced-at: implementation
detected-at: operator-deploy
severity: high
related-pr: 23
fix-pr: this PR (branch `claude/lessons-from-pr-23`)
fix-commits: [<pending — pushed in this kaizen PR>]
prior-fix-commits: [4426fe4]
eradication-level: 2
time-to-detect: hours
tags: [react, performance, observability]
---

# `useSyncExternalStore` re-subscribed on every render because the callback was a fresh arrow

## Symptom

Live retransmission on the preview deploy. Operator complaint
verbatim: *« Le front envoie ENORMENENT de requetes au back,
beaucoup trop. »* CloudWatch on the preview API Lambda showed
~4 100 invocations per 5-min bin (≈ 14 req/s), holding steady across
35 minutes of activity — instead of the intended ~150 per 5-min bin
(≈ 0.5 req/s) implied by the 2 s `setInterval` polling `/api/standings`.
The same metric on prod, after the kaizen-time fix landed, dropped 24×
to the expected baseline.

## Root-cause chain

1. **Why was the page firing many more requests than the 2 s timer
   permits?** Because something *outside* the timer was also calling
   `fetchOnce`.
2. **Why was something outside the timer calling `fetchOnce`?** The
   `subscribe` callback fed to `useSyncExternalStore` does *two
   things*: it adds the listener AND, when the cache's `intervalId`
   is `null`, it lazily kicks off the first fetch and starts the
   interval. That lazy start fires once per subscription.
3. **Why were there many subscriptions?** Each consumer render passed
   a *fresh arrow function* as the `subscribe` argument. React's
   semantics: when the subscribe identity changes, the previous
   subscription is torn down (cleanup), then the new one is set up.
4. **Why did the cleanup leave the cache in a state where the next
   subscribe would re-fetch?** The cleanup removed the listener; the
   listener set went to size 0; the lazy-start guard cleared
   `intervalId` back to `null`. So the *very next* subscribe saw
   `intervalId === null` and immediately fired a fresh `fetchOnce`
   plus a fresh `setInterval`.
5. **Why does the consumer re-render so often?** It re-renders on
   *every* snapshot change (which is `notify`-triggered after each
   `fetchOnce` resolves) — so we had a tight loop: fetch → snapshot
   change → re-render → cleanup-then-resubscribe → fresh fetch →
   snapshot change → re-render → … In practice the loop ran limited
   by network latency, not by React's render speed, hence the
   ~14 req/s ceiling.

**Root cause:** *thought `useSyncExternalStore`'s subscribe callback
behaved like `useEffect` deps and was effectively memoised across
renders; actually it is re-subscribed any time its function identity
changes, so a fresh arrow on every render is a full cleanup-resubscribe
cycle.*

If the developer had known that, they would have wrapped the arrow in
`useCallback` from the start — the very first version of the hook
would have polled at the intended cadence.

## Detection failure causes

- **Typing:** TypeScript doesn't model React-hook stability — there
  is no type-level way to say "this argument must keep the same
  identity across renders". `useSyncExternalStore`'s signature
  accepts any `(listener: () => void) => () => void`.
- **Linter / static analysis:** Biome (recommended ruleset) doesn't
  ship a rule for this. ESLint's `react-hooks/exhaustive-deps` would
  flag a missing `useCallback` dep, but the codebase uses Biome, not
  ESLint, and even ESLint doesn't flag the *raw subscribe argument*
  shape.
- **Functional validation locally:** `pnpm run test:core` (289 tests
  passing) doesn't measure request counts. `pnpm test` (back-e2e)
  doesn't either. There's no test that the polling honour the
  configured cadence.
- **CI:** Same — no test exercises render-time fetch frequency.
- **Code review:** The original hook was written for PR #14 (months
  ago) and reviewed without the perspective. The recent geometry
  changes in PR #23 made the consumer re-render more often (more
  derived data from each snapshot), surfacing the latent inefficiency.
- **Staging / production monitoring:** Lambda invocation counts ARE
  emitted to CloudWatch but no alarm threshold ever fired — the
  ~14 req/s rate is well within the API's burst capacity, just
  wasteful and would crater on a multi-user spike.

## Countermeasure

Wrapped the subscribe arrow in `useCallback` keyed on `editionSlug`
(the only thing that should ever cause a real re-subscribe), plus
`getSnapshot` for symmetry. The subscribe identity now stays stable
across re-renders, the interval lives its whole life, and the
cadence matches the 2 s `POLL_INTERVAL_MS`.

- **Code:** commit `4426fe4` in PR #23 —
  `apps/last-loop-lepin/site/src/data/useStandingsPoll.ts`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — Biome Grit plugin).

**Reference:** this kaizen PR ·
[`biome-plugins/no-inline-subscribe-in-use-sync-external-store.grit`](../../biome-plugins/no-inline-subscribe-in-use-sync-external-store.grit) ·
registered in `apps/last-loop-lepin/biome.jsonc`.

**The actual fix:**

```grit
`useSyncExternalStore($subscribe, $rest)` as $call where {
  $subscribe <: or {
    `($_) => $_`,
    `function($_) { $_ }`,
    `function $_($_) { $_ }`,
  },
  register_diagnostic(
    span = $subscribe,
    message = "The `subscribe` argument to `useSyncExternalStore` must keep the same reference across renders, or React re-subscribes on every render. Wrap in `useCallback(...)` with the relevant deps, or hoist the function to module scope.",
    severity = "error"
  )
}
```

The rule fires whenever an inline arrow or function literal is passed
as the first argument to `useSyncExternalStore`. The two acceptable
forms are a stable module-scope function or a `useCallback`-wrapped
arrow — both yield a `CallExpression` or an `Identifier` in that
position, neither of which matches the pattern above.

**Sibling defects swept:** repo-wide grep for
`useSyncExternalStore\(` returned three call sites
(`useStandingsPoll.ts`, `useResource.ts`, `clock-store.ts` indirectly).
All three were inspected; `useStandingsPoll.ts` was the only one with
the failure mode (because it's the only one whose subscribe callback
has a side effect on lazy-start). The others survive the rule today
either by binding a stable function or by their lazy-start being
idempotent — but they would now be forced to stay that way.

## See also

- [`docs/dantotsus/built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md) — the broader pattern of rolling our own data-fetching primitives instead of reaching for a battle-tested library (TanStack Query); cross-linked from the knowledge entry on the same topic shipped in this kaizen PR.
- [React docs — `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) — *"If you pass a different subscribe function between re-renders, React will re-subscribe to the store using the newly passed subscribe function."*
