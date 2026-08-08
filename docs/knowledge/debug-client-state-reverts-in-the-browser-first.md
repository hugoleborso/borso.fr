# When client state reverts but the server is right, reproduce in the browser before theorizing

## The shape

A class of bug where **the server is correct and the UI is wrong**:
the optimistic update applies, then the value snaps back; a list
re-sorts then un-sorts; a toggle flips then flips back. The persisted
state (checked via the API) is exactly what you asked for, yet the
screen disagrees.

PR #31 had two of these (a setlist reorder reverting, an energy bar
distorting). Both cost extra round-trips because the first fixes were
**theorised from reading the code** and shipped without watching the
bug happen. The user had to come back with _"ça ne marche pas"_ before
the real cause surfaced.

## The discipline

For any "server's right, client's wrong" symptom, **reproduce in a real
browser and capture the failing signal before writing a fix**:

1. Drive the running app (the `/verify` skill, or `agent-browser`
   directly — see [`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md))
   — log in, get to the surface, perform the exact gesture.
2. Instrument the network: patch `window.fetch` to log the request body
   and the response body of the relevant calls. Compare _what the write
   sent_ against _what the next read returned_. In PR #31 this is what
   exposed the truth — the reorder `PUT` sent `[…, b16f]`, the refetch
   `GET` returned `[b16f, …]`: a stale read, not a frontend logic bug.
3. Read the DOM order/state immediately after the action **and again a
   second later**, to catch a revert that happens after an animation.
4. Only now form the hypothesis, fix, and **re-verify on the running
   app** (or the redeployed preview) before declaring it done.

## Two specific lies to distrust

- **A warm-connection `curl` loop** testing read-after-write
  consistency. It reuses one connection and hides cross-connection DSQL
  lag — see
  [`dsql-strong-consistency-is-per-connection.md`](./dsql-strong-consistency-is-per-connection.md).
- **"The code looks right, so the fix is X."** For dnd-kit / TanStack
  Query / DSQL timing bugs, the code reads fine in all the wrong
  hypotheses too. The network capture is the arbiter, not the reading.

A preview you can't log into or seed is the silent tax here: build the
seeding/login path first (PR #31 had to add a test-seed flag and a
loginable preview before any of this was possible) so the repro loop is
actually available.

## See also

- [`dsql-strong-consistency-is-per-connection.md`](./dsql-strong-consistency-is-per-connection.md)
- [`../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md)
- [`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md)
