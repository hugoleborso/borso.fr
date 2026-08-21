# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 5 file(s). Sealed: 4. Findings: 1.

Both of the previous round's findings are closed, checked against the tree and not the brief:

- `punch.repository.ts:12` is now `type LoopPunchRow = typeof loopPunchesTable.$inferSelect;`, and
  the `repository-row-mapper` description above it (line 22) was rewritten to prescribe the derived
  form rather than the hand-written interface.
- `getPunchesForEdition` is gone; `punch.service.ts:184` exports `listEditionPunches`, and the four
  call sites moved with it (`ranking.service.ts:5,36,49,73`, `runner.service.ts:2,90`).
- The advisory closed too: `runner.repository.ts:10` is `insertRunnerIfAbsent` and the
  `// @FollowsBlueprint repository-idempotent-upsert` marker that promised an overwrite is gone.

The one finding below is on content this branch did not introduce, in a file that has never been
sealed (`docs/standards/seals.jsonl` holds no entry for the path). That is the same basis the two
previous rounds used, and the bullet reads on the whole file.

## Findings

### apps/last-loop-lepin/api/src/punch/punch.repository.ts:43

Bullet: `reviewer` checks that a file name says what the file holds, because the suffix table is a convention no rule reads.

```ts
// @FollowsBlueprint named-domain-error
export class PunchConflictError extends Error {
  override readonly name = 'PunchConflictError';
  constructor(public readonly existing: LoopPunch) {
    super(`punch conflict for edition/runner/loop_index`);
  }
}
```

`01-naming.md:133` gives `<domain>.repository.ts` one line of contents — *"Database access only"* —
and `04-backend-architecture.md:89` says a repository *"holds Drizzle queries and transactions and
nothing else"*. This class is neither, and the repository never raises it: every construction is in
the service (`punch.service.ts:60` and `punch.service.ts:216`), which is where
`04-backend-architecture.md:135` puts it — *"A service throws a named domain error"* — and where the
`named-domain-error` blueprint it names is registered (`blueprint-index.md:141`, layer `service`,
defined at `punch.service.ts:34`, with `PunchRejectedError` and `PunchNotFoundError` as its
neighbours in that file).

The mappers above it are a different case and are not part of this finding: `narrowPunchSource`
(line 14) and `rowToLoopPunch` (line 24) are the `repository-row-mapper` blueprint itself, indexed at
the repository layer, and they sit on the row-to-domain boundary the repository owns.

What would satisfy it: move the class into `punch.service.ts` beside its two siblings, drop the
re-export at `punch.service.ts:9`, and repoint the one other importer of it,
`punch.service.test.ts:6`. Both controllers already import it from the service
(`punch.controller.ts:13`, `self-punch.controller.ts:4`), so no controller changes.

The re-export is the second half of the same problem, and it is why the move costs nothing:

```ts
// @FollowsBlueprint service-facade-reexport
export { PunchConflictError } from './punch.repository';
```

That blueprint is *"for an error another module raises that the controller has to catch"*
(`blueprint-index.md:182`). No other module raises this one — the service does. Whether a
`@FollowsBlueprint` claim is true is not itself a ledger bullet, so this paragraph did not decide the
verdict; the class's location did.

## Sealed

- `apps/last-loop-lepin/api/src/punch/punch.service.ts` — the rename is behaviour-true:
  `listEditionPunches` (line 184) returns an array and cannot throw, matching
  `listManualDidNotFinishes` four lines below, and every `get…` it calls (`getEdition`,
  `edition.service.ts:98`) throws on absence. `catchupPunch` (line 233) wraps the `loop_punches`
  insert and the `manual_dnfs` delete in one `runInOneTransaction` the service owns;
  `clearEditionPunchHistory` (line 240) does the same for the two-table delete;
  `clearEditionPunchHistoryWithin` (line 246) takes a required executor and no `getDatabase()`
  fallback, so a caller cannot accidentally run it outside the transaction at
  `edition.service.ts:213`. `buildPunchRejectionError` (line 51) returns the error it assembles.
  `lastInstantOfLoop` (line 200) names its `1`. No comment in the file is prose; all four annotations
  are `@Blueprint` or `@FollowsBlueprint`.
- `apps/last-loop-lepin/api/src/ranking/ranking.service.ts` — the four `listEditionPunches` call
  sites are the whole diff. Nothing here derives a shape the core does not: `computeStandingsForEdition`
  (line 29) reads edition, runners, punches and did-not-finishes and hands all five arguments to
  `computeStandings`; `getSpectatorStandings` (line 43) maps rows through the pure `toRunnerDto` with
  the CDN host read once, which is `service-dto-mapping`. All three `get…` throw
  `EditionNotFoundError` through `getEdition`, and the file re-exports that error for its controller.
  `RankedRunnerWithDto` and `SpectatorStandings` stay in the service rather than `ranking.types.ts`
  because nothing outside this file names them.
- `apps/last-loop-lepin/api/src/runner/runner.repository.ts` — `insertRunnerIfAbsent` (line 10) now
  says what `onConflictDoNothing` does, and the blueprint marker that promised an overwrite is gone,
  so the file no longer makes a claim its query contradicts. `findRunner` (line 14) returns `null` and
  never throws; `listRunnersForEdition` (line 31) returns the select unprojected and keeps its
  `repository-query` marker; `deleteAllEditionRunners` (line 23) takes the executor first and
  required, writes one table, and is reached only from `edition.service.ts:215`.
- `apps/last-loop-lepin/api/src/runner/runner.service.ts` — `seedRunner` (line 103) reads honestly now
  that the repository call is named for what it does. `getRunner` (line 57) throws
  `RunnerNotFoundError`, `getRunnerAsDto` throws through it, `listRunners` and `listRunnersAsDto`
  return arrays, `listPunchesForRunner` (line 86) filters and sorts in the service rather than in a
  repository and reads punches through the punch *service*, not its repository, which is the
  cross-slice rule at `04-backend-architecture.md:123`. `clearEditionRoster` (line 96) is a thin pass
  through to the delete inside the caller's transaction.

## Unclear

None.

## Outside the checklist

- `runner.types.ts:1-7` declares `Runner` by hand with the five columns of `runnersTable`
  (`runner.schema.ts:8-13`), including nullability, and `runner.repository.ts:14,31` returns raw rows
  under that annotation with no mapper — the same shape as last round's `LoopPunchRow` finding, one
  file over. I did not make it a finding because the declaration is in a file this branch does not
  touch and which no seal is asked for; the punch case was in the file under review. If the sweep is
  done, `type Runner = typeof runnersTable.$inferSelect` compiles here, because unlike the punch slice
  there is no widened column to narrow. `docs/standards/hotspots.md:49-50` lists both
  `runner.types.ts` and `punch.types.ts` among the most-changed files following no recorded pattern.
- `punch.service.ts:29` — `PunchNotFoundError` still declares no constructor, so the `id` passed at
  line 155 lands in `Error.message` rather than on a field a controller can read, unlike
  `PunchRejectedError` (line 39) which carries its `reason`. Carried forward from last round.
- `runInOneTransaction` now exists twice, at `punch.repository.ts:50` and `edition.repository.ts:134`,
  with the same body. The cross-slice repository rule forbids either importing the other, so the
  duplication is the price of the layering rather than a defect; noting it because a third slice
  needing a transaction will make it three.
- `clearEditionPunchHistoryWithin` (`punch.service.ts:246`) and `clearEditionRoster`
  (`runner.service.ts:96`) are the same thing — a clear that runs inside the caller's transaction —
  under two naming schemes, one with a `Within` suffix and one without. No bullet reaches function
  suffixes, but a reader picking the pattern for the next slice has two to copy.
