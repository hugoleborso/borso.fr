# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 2 file(s). Sealed: 1. Findings: 1.

The two files below are the ones `seal.ts verify --base origin/main` reported as
uncleared; the other 25 changed files carry a valid seal from an earlier round.
The previous round's finding is resolved: `PunchConflictError` is declared in
`punch.service.ts:30` and the `service-facade-reexport` marker is gone from the
diff.

## Findings

### apps/last-loop-lepin/api/src/punch/punch.service.ts:50, 104, 172, 198

Bullet: `reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors.

```ts
export interface RegisterPunchInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
}
```

```ts
export interface RecordDidNotFinishInput {
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'late' | 'manual';
}
```

Four interfaces in this file are structural copies of Zod schemas in
`punch.schema.ts`, and each one is a request body the controller hands over
unchanged:

| Hand-written type | Mirrors | Controller call |
| --- | --- | --- |
| `RegisterPunchInput` (L50) | `createPunchInputSchema` (punch.schema.ts:50) | `punch.controller.ts:32` `registerPunch(input, new Date())` |
| `SelfPunchInput` (L104) | `selfPunchInputSchema` (punch.schema.ts:68) | `self-punch.controller.ts:21` `registerSelfPunch(input, …)` |
| `RecordDidNotFinishInput` (L172) | `createDidNotFinishInputSchema` (punch.schema.ts:76) | `punch.controller.ts:66` `recordManualDidNotFinish(input, new Date())` |
| `CatchupPunchInput` (L198) | `catchupPunchInputSchema` (punch.schema.ts:62) | `punch.controller.ts:72` `catchupPunch(input, new Date())` |

`editionSlugSchema` (edition.schema.ts:73) and `runnerSlugSchema`
(runner.schema.ts:25) both infer to `string`, so the shapes match field for
field today — which is what makes the drift silent tomorrow. Nothing in the
type system connects them: the controller passes `context.req.valid('json')`
into a structurally-typed parameter, so a field added to a schema, or
`reason: z.enum(['late', 'manual'])` gaining a third member, keeps compiling
while the service's hand-written union quietly stops describing the input.
`03. Typing` states the fix as "One definition is validated at the boundary and
typed everywhere inside it", and the repository already does it that way in the
newer application — `apps/pragma/api/src/bars/bars.service.ts:14` reads
`type BarCreateInput = z.infer<typeof barCreateSchema>`, as do
`sessions.service.ts:24`, `setlists.service.ts:31` and `songs.service.ts:16`.

**Not introduced by this branch, and small.** The branch's diff on this file
touches only the transaction wiring and the error class; these four
declarations are untouched. The fix is confined to `punch.service.ts`: import
the four schemas and replace each `export interface` with
`export type X = z.infer<typeof …Schema>`. Nothing outside the file names any
of the four types (grep over `apps/last-loop-lepin` returns no other
reference), so there are no call sites to update; the only observable change is
that the inferred types are not `readonly`. That is minutes of work and it
belongs in this PR rather than a follow-up.

## Sealed

- `apps/last-loop-lepin/api/src/punch/punch.repository.ts` — `LoopPunchRow` now derives from `typeof loopPunchesTable.$inferSelect` (03), `runInOneTransaction` is opened in the repository and every multi-table delete takes the executor first, which is the shape `11. Database` prescribes (04, 11); the edition teardown's cross-slice cascade is written out explicitly at `edition.service.ts:214`; `find…` returns `null`, `list…` returns arrays, `get…` is absent (01); reads return whole rows through the sanctioned `repository-row-mapper` rather than a projection (04); no prose comments.

## Unclear

None.

## Outside the checklist

- `punch.repository.ts:160` narrows the `reason` column inline with
  `reason: row.reason === 'manual' ? 'manual' : 'late'`, while the same file
  routes the equally wide `source` column through a named `narrowPunchSource`
  and documents that choice in the `repository-row-mapper` blueprint it hosts.
  The asymmetry is cosmetic — one read site, one mapping — but the second
  narrower would cost three lines and match the pattern the file itself
  publishes.
- `punch.service.ts:204` `lastInstantOfLoop` returns epoch milliseconds, and
  the call site reads `new Date(lastInstantOfLoop(edition, input.loopIndex))`.
  Its own dependency carries the unit in its name (`hourlyTopOfLoopMs`), so
  `lastInstantOfLoopMs` would read the same way at both ends. No bullet covers
  unit suffixes.
- `punch.service.ts:159` throws `new PunchNotFoundError(id)`, so the id becomes
  the error message and `punch.controller.ts:51` answers 404 with a bare uuid
  as `error`. The `named-domain-error` blueprint this class follows asks for the
  machine-readable value as a readonly field, which `PunchConflictError` and
  `PunchRejectedError` both do.
- The finding's shape is not confined to the punch slice. `edition.service.ts`
  declares `CreateEditionFromIsoInput` (L110-117) and
  `ReplaceEditionFromIsoInput` (L132-138), both wire-shaped `…FromIso`
  twins of edition schemas. That file is sealed from an earlier round and I did
  not read it in full, so this is a pointer rather than a finding — worth one
  sweep across `last-loop-lepin`'s services if the punch fix lands.
