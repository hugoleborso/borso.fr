---
summary: 'Two requests in `Promise.all` do not overlap their read and write, and local Postgres never raises a commit conflict, so a concurrency test passes on racy code unless it holds a lock until both writers wait, on the table the write really touches.'
triggers:
  paths:
    - 'apps/*/test/database-utils.ts'
  output:
    - 'fewer than \d+ writers ever waited'
    - 'neither settled nor among \d+ waiters'
---

# A race test must prove the race happened

PR #193 fixed a dozen check-then-write races in pragma, and three times a test
written to prove one of them passed for the wrong reason.

**`Promise.all` is not concurrency.** Two in-process requests fired together
ran their read and their insert one after the other, so the first back-e2e for
"one catalogue song per Deezer track" passed on the code it was meant to fail
on. It failed, as it should, only once a fetch stub held both requests at a
barrier between the read and the write. The helpers in
`apps/pragma/test/database-utils.ts` do that with a real lock:
`runWithWritesToTableHeld(table, writers, start)` takes a `SHARE` lock on the
table, starts the writes, and releases only when `pg_stat_activity` shows that
many writers waiting on it. Both writers then read before either writes.

**The lock has to be on the table the write touches.** The setlist rows live
in `setlist_sheet`, and a test that held `setlist` locked nothing the write
needed: the writers never waited, and the helper timed out. Its message now
names the held table (`fewer than 2 writers ever waited on table "setlist"`),
so read that name against the table the repository writes before suspecting
the code.

**Local Postgres never aborts a commit.** DSQL resolves concurrent writes with
optimistic concurrency and answers the loser with `OC000` or `40001` at commit;
local Postgres takes row locks and makes the second writer wait instead. A
retry path is therefore unreachable locally unless a test forces the abort:
`abortCommitsWritingTable(table, n)` installs a deferred trigger that raises
`serialization_failure` on the first `n` commits writing that table, which is
what the conflicted-write retries in `helpers/persistence/conflict-abort.core.ts`
are tested against.
