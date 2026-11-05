---
status: done
summary: |
  Slice 2 shipped. `borso/no-request-fan-out-in-site` refuses a request per item over
  `.map`, `.flatMap` or `Array.from` (directly or through a same-file function), a
  `useQueries` or `useSuspenseQueries` over a mapping, and a `$get`, `query` or
  `fetchQuery` awaited in a loop body. It is registered, set to error on
  `apps/*/site/**/*.{ts,tsx}` and off in test files. The only hit in the repository is
  `mapEntriesOfSetlists`, which carries the D12 inline disable. Every slice 2 gate passes.
artifacts:
  - eslint-rules/no-request-fan-out-in-site.js
  - eslint-rules/no-request-fan-out-in-site.test.js
  - eslint-rules/index.js
  - .oxlintrc.json
  - apps/pragma/site/src/lib/queries/setlist-entries.queries.ts
  - docs/standards/06-data-fetching.md
  - docs/standards/12-linting-and-gates.md
  - docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-02.md
next:
  kind: validate
---

# Implementation 02, slice 2 (rule B)

## Goal, smallest change, shape

- Goal. Lint refuses, in every `apps/*/site`, a request per item over a mapping and a read
  awaited in a loop, so no site code brings back an unbounded burst at a 10-seat API.
- Smallest change. One rule and its RuleTester suite, one line in `eslint-rules/index.js`,
  `error` in the site block and `off` in the test block of `.oxlintrc.json`, one inline
  disable, a section and an `Enforced by` bullet in standard 06, a row in standard 12.
- Shape. The rule follows `lint-rule` and `lint-rule-transitive-call`. It decides at
  `Program:exit`. Same-file functions are classed as request senders and read senders by a
  fixpoint over the calls they reach without entering a nested function. The one exception
  is a function that is the value of a `queryFn` property, which is how a `queryOptions`
  factory sends its request. Three sites are judged.
  1. A `.map` or `.flatMap` first argument, or an `Array.from` second argument, that is a
     callback reaching a request or a same-file sender's name.
  2. `useQueries` or `useSuspenseQueries` whose `queries:` is a mapping call, whatever the
     callback holds.
  3. An `await` of a read call or of a same-file read sender, inside a loop `body`, with no
     function boundary between them.
  A request is `fetch(…)` or a member call named `$get`, `$post`, `$put`, `$patch`,
  `$delete`, `query`, `fetchQuery`, `prefetchQuery` or `ensureQueryData`. A read is `$get`,
  `query` or `fetchQuery`. The rule also returns early outside a site file
  (`isSiteFile`), so the back-end valid case is meaningful.

## Choices the plan left open

- A request inside a nested function, such as an `onClick` in mapped JSX, does not count
  (valid case `HANDLER_IN_MAPPED_JSX`). It runs per tap, not per item at once.
- `.forEach` and an unawaited request in a loop are not judged. The spec names `.map`,
  `.flatMap`, `Array.from` and awaited reads only (D10, D11), and the spec is immutable.
  This is a known gap for the validator to weigh, not a hidden one.
- The fan-out message is reported on the mapping call, so the D12 disable sits on the
  `return setlistIds.map(` line of `mapEntriesOfSetlists`.

## Planted defect (gate 2.5)

Appended to `apps/pragma/site/src/lib/queries/songs.queries.ts`, then restored from a
scratch copy (`git diff --quiet` on the file confirmed it unchanged):

```ts
export function plantedPreload(queryClient: ReturnType<typeof useQueryClient>, ids: readonly string[]) {
  return Promise.allSettled(ids.map((id) => queryClient.query(songQueryOptions(id))));
}
export async function plantedLoop(ids: readonly string[]) {
  for (const id of ids) {
    await api.api.songs[':id'].$get({ param: { id } });
  }
}
```

`pnpm --filter @borso-app/pragma lint` refused both:

```
apps/pragma/site/src/lib/queries/songs.queries.ts:262:29: error borso(no-request-fan-out-in-site): One request per item grows with the number of items, and the API serves 10 at once. A batch folds at most 10 reads, so a longer list becomes several batches and one database read per item. Read the collection in one request, or seed per-item keys from a list response with `setQueryData`. See docs/standards/06-data-fetching.md.
apps/pragma/site/src/lib/queries/songs.queries.ts:267:11: error borso(no-request-fan-out-in-site): Each awaited read waits for the one before, so N reads take N round trips and never share a batch. Read the collection in one request. See docs/standards/06-data-fetching.md.
```

Before the disable was added, the same command reported exactly one hit,
`setlist-entries.queries.ts:79:10`, the `.map` in `mapEntriesOfSetlists` (measured).

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| 2.1 | `pnpm exec vitest run eslint-rules/no-request-fan-out-in-site.test.js` | pass, 21 tests (8 valid, 13 invalid) |
| 2.2 | `node_modules/.bin/tsc -p tsconfig.json --noEmit` | pass, exit 0 |
| 2.3 | `scripts/lint-repository.sh` (oxlint `--type-aware`, whole repository) | pass, exit 0, after renaming three booleans `unicorn-js(consistent-boolean-name)` refused |
| 2.4 | `pnpm run format:check` (oxfmt `--check`) | pass, 2894 files |
| 2.5 | planted fan-out and awaited `$get` in `for…of`, `pnpm --filter @borso-app/pragma lint` | refused both, pasted above, file restored |
| 2.6 | `pnpm exec vitest run --coverage` at the root | pass, 81 files, 1688 tests |
| C.1 | `pnpm --filter @borso-app/pragma lint` | pass, exit 0 |
| extra | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | pass |

The root coverage gate includes only `scripts/**/*.{core,utils}.ts` (measured in
`vitest.config.ts`), so `eslint-rules/` carries no percentage. The RuleTester suite covers
each branch of the rule by case.

## Friction

- Gate 2.5 says to restore with `git checkout -- <file>`. The `no-discarding-reset` hook
  refuses it while other slice files are uncommitted, so the plant was reverted from a
  scratch copy. Logged with `scripts/kaizen.sh --from impl-2`.
