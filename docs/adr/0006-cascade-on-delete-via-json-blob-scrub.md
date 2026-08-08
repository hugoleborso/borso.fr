# ADR-0006: Cascade-on-delete via JSON-blob scrub (DSQL no-FK substitute)

- **Status:** Accepted
- **Date:** 2026-06-06
- **Deciders:** Hugo Le Borso
- **Tags:** pragma, lineup-editor, dsql, data, drizzle
- **First applied in:** PR for `claude/pragma-lineup-editor` (lineup editor + per-member rollup)

## Context

Aurora DSQL does not enforce foreign-key constraints at write time (see [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §3). Pragma's domain model relies on referential integrity in several places, so every "delete A" operation that has dependent rows in other tables needs a manual cascade.

Two cascade shapes had grown organically before the lineup-editor work landed:

- `deleteSongWithCascade` (`apps/pragma/api/src/songs/songs.repository.ts:225-235`) — deletes the song's `mastery_override` + `setlist_entry` rows in dependency order, then the song row. Sequential `DELETE` statements, no transaction.
- `deleteSessionWithCascade` (`apps/pragma/api/src/sessions/sessions.repository.ts:178-195`) — looks up the session's setlists, deletes the entries, then the setlists, then the session row. Same shape.

The lineup-editor feature introduced a third surface: deleting a band member must also scrub that member's ID out of every `song.defaultLineup` and every `setlist_entry.lineupOverride` — both stored as JSON-encoded TEXT (DSQL has no `jsonb`, [§1](../knowledge/dsql-postgres-compat-gaps.md)). The cascade is _richer_ than the previous two: it doesn't just delete dependent rows, it transforms them (parse JSON → drop the member key → re-stringify → write back). Before this becomes the fourth manual cascade in the repo, the pattern deserves an ADR — for the next "delete X, propagate to N tables" feature to follow a documented shape instead of re-inventing.

The spec's _Use case 4 / cascade behaviour_ row settled the user-facing choice (cascade, not preserve-as-deleted). This ADR settles the **implementation shape** the cascade must follow across pragma.

## Decision

**Wrap every cascade-on-delete inside a `database.transaction(...)`, with each cascade step expressed as a small async helper taking a `DatabaseExecutor` (the Drizzle client OR a transaction handle), allowing the helpers to be called inside or outside a transaction without duplication.** Pure transformations on JSON-encoded blob columns (e.g. _scrub member ID from lineup record_) live in `*.core.ts` files with 100% coverage so the read-write boundary stays correct as the blob shape evolves.

Concretely, every new cascade follows three layered conventions:

1. **Transaction-wrapping at the repository entry point** — `deleteXWithCascade` is a single `database.transaction(async (tx) => { ... })` so a failure mid-cascade rolls back the row delete. Existing cascades (`deleteSongWithCascade`, `deleteSessionWithCascade`) are migrated to this shape opportunistically; not in this PR.
2. **Helpers parameterised on `DatabaseExecutor`** — the type is `Database | PostgresJsTransaction<typeof schema, ...>` (see `apps/pragma/api/src/database/client.ts`). Each cascade step is a free function (`scrubMemberFromSongDefaults(tx, memberId)`) that takes the executor, so the same helper can be called from a transaction or directly from a test setup without two code paths.
3. **Pure transformations in `*.core.ts`** — the blob-mutation logic (`scrubMemberFromLineup(lineup, memberId) → lineup'`) lives in a sibling `.core.ts` file gated at 100% coverage. The repository helper does I/O (read row → call core → write row); the core is pure and testable in isolation.

## Consequences

- `+` **Single shape for "delete A, propagate to N tables/blob fields"** across pragma — the next contributor finds three examples, all the same shape, and follows them.
- `+` **DSQL OCC-friendly** — transactions stay short (read rows → in-process JSON transform → write rows), keeping the optimistic-concurrency window tight.
- `+` **Atomic** — a crash mid-cascade rolls the row delete back, so the system never observes "member deleted but their ID still in 17 lineups" intermediate state.
- `+` **Pure-core extraction satisfies the existing `*.core.ts` 100% coverage gate** — the blob mutation has explicit test cases for every edge (missing key, `null` value, multiple keys).
- `-` **DSQL OCC reject (`OC0001`) risk on contended member-delete + concurrent lineup-edit** — the transaction's read-then-write pattern is exactly what OCC will fail under contention. Documented escape hatch: fall back to the sequential cascade pattern used by `deleteSongWithCascade` (accept a small race window) if prod logs surface `OC0001` from the cascade. Local Postgres tests cannot reproduce DSQL's OCC, so the first detection is in preview.
- `-` **Migration debt** — the two existing sequential cascades (`deleteSongWithCascade`, `deleteSessionWithCascade`) don't yet follow this shape. Not a blocker because they don't touch JSON blobs, but they're now the odd ones out; a future kaizen sweep aligns them.
- `~` **`DatabaseExecutor` widens the repository's input type** — helpers must avoid Drizzle methods that don't exist on the transaction interface (none observed today; flagged for the reviewer of the next cascade).

## Alternatives considered

### Option A — Transaction + `DatabaseExecutor` + pure `.core.ts` (chosen)

- **Summary:** every cascade step wrapped in `database.transaction`, helpers take a `DatabaseExecutor`, blob transformations live in `*.core.ts` gated at 100%.
- **Strengths:** atomic; consistent shape; pure-core is unit-testable in isolation; DSQL OCC pressure stays low (short read-write window).
- **Costs:** OCC-reject risk on contention; introduces the `DatabaseExecutor` type (one more thing to know).
- **Rationale:** the only option that keeps atomicity without forcing every cascade step into the same file as the I/O boundary.

### Option B — Sequential `DELETE` + manual blob rewrite, no transaction (rejected)

- **Summary:** match the existing `deleteSongWithCascade` shape — `await db.delete(X)`, `await db.update(Y)`, `await db.delete(Z)`, each as its own statement, no transaction.
- **Strengths:** zero new types; matches existing cascades; immune to OCC reject under contention.
- **Costs:** **not atomic** — a crash mid-cascade leaves orphan member IDs in lineups, which is the exact failure mode R1 of the lineup-editor plan flagged as **high severity**. The detection is `console.warn` only (Sentry isn't wired yet) and the recovery is manual.
- **Rejection rationale:** R1 severity outweighs the OCC-reject risk. OCC rejects fail loudly with a retryable error; orphan IDs fail silently in production and pollute the data model.

### Option C — Soft-delete on `member` (set `deleted_at`, never DELETE) (rejected)

- **Summary:** keep deleted rows around; every read filters `WHERE deleted_at IS NULL`. Lineups keep their IDs and dereference to "(deleted Hugo)" forever.
- **Strengths:** no cascade needed; preserves historical record.
- **Costs:** every read path needs the filter (easy to forget); the spec explicitly rejected this UX ("Historical record is not a goal of pragma"); ID re-use across creates is impossible without uniqueness checks.
- **Rejection rationale:** the spec settled the product question (cascade, not preserve); this ADR is for the implementation shape only. Soft-delete is out.

### Option D — Database trigger (PL/pgSQL `AFTER DELETE`) (rejected)

- **Summary:** a Postgres trigger on `member` runs the scrub server-side, in-DB.
- **Strengths:** atomic by definition (single transaction); zero application code.
- **Costs:** DSQL does not support all PL/pgSQL features ([`dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md)); JSON-blob parsing inside PL/pgSQL is painful; migrations to triggers are harder to roll back than application code; the application loses the chance to validate the blob shape before re-writing.
- **Rejection rationale:** DSQL compatibility risk + JSON-blob ergonomics + the loss of Zod validation at the read-write boundary.

## How this is enforced

- **Code review** — the `/technical-validation` skill's "cascade transaction shape" angle (see the lineup-editor validation report) checks every cascade-on-delete against this ADR's three-layer convention.
- **Coverage gate** — `*.core.ts` files ship at 100% per `vitest.workspace.ts`, so the blob-mutation helpers (`scrubMemberFromLineup`, future siblings) can't escape unit tests.
- **Future kaizen** — when the next cascade lands, if it doesn't follow this shape, file a Dantotsu pointing here. The two pre-existing cascades (`deleteSongWithCascade`, `deleteSessionWithCascade`) are flagged for opportunistic migration.

## See also

- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §1 (no `jsonb`), §3 (no FK enforcement at write time).
- [`apps/pragma/api/src/members/members.repository.ts`](../../apps/pragma/api/src/members/members.repository.ts) — the canonical implementation of this pattern.
- [`apps/pragma/api/src/members/lineup-scrub.core.ts`](../../apps/pragma/api/src/members/lineup-scrub.core.ts) — the pure-core companion.
- [`docs/features/pragma/lineup-editor/spec/spec.md`](../features/pragma/lineup-editor/spec/spec.md) — the user-facing decision that the cascade behaviour is "cascade, not preserve".
