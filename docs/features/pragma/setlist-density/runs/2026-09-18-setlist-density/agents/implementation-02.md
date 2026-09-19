---
status: done
summary: >-
  Fix round 2 closes both blockers from the previous validation and touches
  nothing else. The dead maximumVisibleLineupMembers export, its two constants
  and the describe block that was its only caller are gone, and MemberLineup no
  longer carries the maximumVisible prop that nothing passed. The
  InstrumentsList marker now names organism-presentational, which is what the
  component is: it calls no query hook, and every value it draws arrives as a
  prop from InstrumentsPage. Eslint, prettier, tsc, knip, the core suite and the
  per-file coverage gate all pass.
artifacts:
  - apps/pragma/site/src/components/organisms/setlist-editor.utils.ts
  - apps/pragma/site/src/components/organisms/setlist-editor.utils.test.ts
  - apps/pragma/site/src/components/molecules/MemberLineup.tsx
  - apps/pragma/site/src/components/organisms/InstrumentsList.tsx
branch: claude/pensive-hamilton-nnllpm-impl-02
commits: 3
adr_trigger: none
---

# Implementation, fix round 2

## Blocker 1 — the dead lineup member budget

`maximumVisibleLineupMembers` had no production caller. The setlist row stopped
rendering `MemberLineup` in round 1, and nothing else called the function. Its
only remaining reference was the describe block in its own sibling test, which
is why both of plan R10's detectors read clean: knip counts the test import as a
use, and the per-file coverage gate reads 100 percent because the test exercises
every branch of a function nobody calls.

Removed, in `setlist-editor.utils.ts`: `MAXIMUM_VISIBLE_MEMBERS_WHEN_CONDENSED`,
`MAXIMUM_VISIBLE_MEMBERS_WHEN_ROOMY` and the exported function between them.
Removed, in `setlist-editor.utils.test.ts`: the import and the matching describe
block. The `// @FollowsBlueprint test-pure-unit` marker that sat above that
block now sits above `describe('maximumVisibleLineupSlots')`, so the claim
recorded in `blueprint-subjects.json` against the symbol `describe` still holds.

`MemberLineup` accepted a `maximumVisible` prop defaulting to the module's own
`MAXIMUM_VISIBLE_MEMBERS`. Neither of its two callers — `SongCard` and
`CompositionDetail` — ever passed it, and with the setlist row gone nothing ever
would. The prop is dropped from `MemberLineupProps` and from the destructuring,
and `buildLineupChips` now receives the bare constant.

`maximumVisibleLineupSlots`, the function with a real caller in
`SetlistEditor.tsx:245`, is untouched, as are its constants and its tests.

## Blocker 2 — the marker that named the wrong blueprint

`InstrumentsList.tsx:113` claimed `organism-query-owning`, which the index
defines as the lowest component allowed to call a query hook. `InstrumentsList`
calls none. Its only hooks are dnd-kit's `useSensors`, `useSensor` and
`useSortable`; every value it draws arrives as a prop from `InstrumentsPage`,
which owns `useInstrumentsList`, `useMembersList`, `useCreateInstrument`,
`useUpdateInstrument`, `useDeleteInstrument` and `useReorderInstruments`. The
marker now names `organism-presentational`.

Nothing mechanical caught this. `blueprint-indexing.ts --check` asks whether the
id exists and whether the marker sits above a declaration, and both were true of
the wrong id.

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npx eslint apps/pragma --no-warn-ignored --max-warnings 0` | pass |
| Format | `npx prettier --check` on the four changed files | pass |
| Types | `cd apps/pragma && npx tsc --noEmit` | pass |
| Tests | `npx vitest run --project core --root apps/pragma` | 178 files, 1824 tests, pass |
| Coverage | `cd apps/pragma && npx vitest run --project core --coverage` | pass, no threshold missed |
| Dead code | `pnpm exec knip` | pass |
| Blueprints | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | pass, 178 blueprints, 1175 followers |

## Friction

The first eslint run reported 18 errors in `apps/pragma/cdk/lib/stack.ts`, all
of the `no-unsafe-*` family and all reading "error typed value". The cause was
that `@borso/infra` had never been built in this worktree, so every symbol it
exports resolved to `error`. The failure names the consuming file and the
type-aware rules, and says nothing about the missing build. After
`pnpm --filter @borso/infra run build` the same command reports no issues.
