---
date: 2026-09-16
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#89'
fix-commits: [a36b358d27]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/lib/queries/audience.utils.ts, apps/pragma/site/src/lib/queries/audience.utils.test.ts]
time-to-detect: hours
tags: [pragma, react, tanstack-query, dsql, optimistic-updates, ci, flake]
zone: apps/pragma/site/src/lib/queries/audience.queries.ts
weak-point: optimistic-write-undone
recurs: [the-blueprint-that-mandated-the-refetch-that-undid-it]
blueprints: [query-optimistic-mutation]
---

# The poll that undid the tap a second later

## User impact

On the audience vote page, tapping a song a second time is how a visitor
retracts their vote.

| | Seen | Expected |
| --- | --- | --- |
| Second tap on a voted song, while a round is open | `aria-pressed` goes to `false`, then about a second later back to `true` on its own | The row stays unvoted |

From the visitor's side the app refused their tap. Nothing errored and
nothing logged. The vote was deleted on the server, and the screen went back
to showing it. Every voter in an open round could hit it. It failed a
`VotePage` test locally about once in thirty runs (the implementer's count), and CI failed
on it the first time the merged branch ran there.

## Causal chain

- The row showed the vote again a second after the tap
  - A `GET` of the vote state landed after the delete, still carrying the
    vote, and overwrote the optimistic write
    - The state query polled every second while a round was open, and the
      poll kept running through the write ← the faulty line, from
      `b608cb567`

      ```ts
      refetchInterval: (query) => selectPollInterval(query.state.data?.state.round),
      ```

      - Both vote mutations call `cancelQueries` in `onMutate`. That cancels
        the reads in flight at that instant. It does not stop the interval,
        which starts a fresh read a moment later
      - Aurora DSQL's read-after-write consistency is per connection. The
        poll is another request, on another Lambda and connection, whose
        snapshot can predate the delete
      - Commit `b608cb567` (2026-08-26) wrote the mutations on the shape of
        the `query-optimistic-mutation` blueprint, whose description opens
        with "Cancels the in flight reads for every key it is about to
        touch" (`songs.queries.ts:169`)
        - The blueprint was written for a query that refetches on demand,
          where no read starts during a write. It says nothing of a read a
          timer starts. Machine

## Root cause of occurrence

*Thought `cancelQueries` protects an optimistic write from concurrent reads,
actually it protects it only from reads already started, and a
`refetchInterval` is a machine for starting new ones.* **Machine.**

The codebase's own example promised the protection. The
`query-optimistic-mutation` blueprint describes `onMutate` as "cancels the
in flight reads for every key it is about to touch", and the queries it was
written beside refetched on demand (inferred), so it had no case where a read starts
mid-write. Copying it made the protection look complete. This is why the
entry lists the blueprint in its front matter.

## Detection failure causes

- **Typing:** every type is correct. The bug is an ordering between two
  correct calls.
- **Linter:** `borso/no-refetch-of-optimistically-written-query` checks
  `invalidateQueries` and `refetch` inside a mutation that has `onMutate`. A
  `refetchInterval` on a `useQuery` in another place is outside what it
  reads.
- **Local validation:** a one-in-thirty race does not show by tapping a
  button a few times by hand.
- **Local test run:** the race needs a poll in flight at the tap, a narrow
  window on a fast laptop. One local failure was read as noise after a green
  re-run.
- **CI:** caught it, on the merged branch, where a loaded runner widens the
  window.
- **Code review:** the mutation and the query each read correctly alone. The
  defect lives only in their composition.

## Countermeasure

Commit `a36b358d`: `selectPollInterval` takes the count of pending writes and
returns `false` while any is in flight.

```diff
-export function selectPollInterval(round: RoundView | null | undefined): number | false {
+export function selectPollInterval(
+  round: RoundView | null | undefined,
+  pendingWriteCount = 0,
+): number | false {
   if (round === null || round === undefined) return false;
   if (round.isSettled) return false;
+  if (pendingWriteCount > 0) return false;
   return OPEN_ROUND_POLL_INTERVAL_MS;
 }
```

with `const pendingWriteCount = useIsMutating();` in `useConcertVoteState`.
Nothing is refetched by this change. The next scheduled read waits until the
writes settle, which keeps it clear of
`no-refetch-of-optimistically-written-query`.

## Eradication

**Type:** detection (level 4). A gated pure function, tested, decides
whether a poll runs.

**Reference:** PR #89, commit
[`a36b358d`](https://github.com/hugoleborso/borso.fr/commit/a36b358d)

`selectPollInterval` lives in `audience.utils.ts`, gated at 100% coverage
and 100% mutation. `audience.utils.test.ts` asserts it holds the poll back
while a vote is in flight. It is marked
`@Blueprint utils-poll-that-yields-to-the-writer`
(`audience.utils.ts:50`), so the next poll beside an optimistic mutation has
a shape to copy.

**Gap in what holds:** the write count defaults to `0`, so a caller that
omits it polls through writes, and `audience.utils.test.ts` pins that default
("defaults to polling, so a caller that names no write count is
unchanged"). The protection is opt-in. Other polls take no write count at
all: `selectHistoryPollInterval` (`audience.queries.ts:300`),
`BOARD_REFRESH_MS` in `apps/pragma/site/src/lib/queries/voting.queries.ts:29`
and `POLL_INTERVAL_MS` in
`apps/last-loop-lepin/site/src/lib/queries/standings.ts:27`. Whether an
optimistic write touches their keys is unchecked.

**Proposed:** remove the default from `pendingWriteCount`, so TypeScript
demands the count from every caller, and delete the test that pins the
default. Then extend `borso/no-refetch-of-optimistically-written-query`, as
`docs/quality/weak-points.md` already proposes for this weak point, to
require that every `refetchInterval` is a function whose argument includes a
pending-write count. That is a per-file check, so it needs no cross-file
pairing of query and mutation. A poll that runs through a write could then
not be written.

**Similar instances:** `grep -rn 'refetchInterval' apps/*/site/src` lists the
four polls named above.
