---
status: done
summary: |
  Plan written in five slices, each one commit that leaves the branch green.
  (1) Offline preload from the lists, manifest deleted, D12 helper. (2) Rule B
  with zero hits. (3) The API read batch. (4) The client transport with the
  D13 prototype. (5) The opening screen and the per-route acceptance
  measurement. Rule B moved from first to second, because its current hits
  are removed by D3 and D12. The plan adds three things the spec missed:
  re-homing the core-projection blueprint that 64 files follow off the
  deleted manifest core, a read-batch.service.ts because controllers may not
  map, and treating a paused (offline) query as failed so a cold offline open
  does not wait forever. No product question is open.
artifacts:
  - docs/features/pragma/open-in-two-calls/plan/plan.md
  - docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/technical-conception-01.md
next:
  kind: validate
---

## Detail

The orchestrator runs the ADR pass and invokes `/implementation`. This run did not auto-chain, because `state.json` holds `"pilotedByTechLead": true`.

Spec checksum checked before planning: `25433b7d5ce739a3c9584a64f04c6bce41c1b6c07ff4614e0dbea6cf55e1df63` (measured, `sha256sum`). The spec was not edited.

Findings that change the spec's Files to change, all measured this session:

- `apps/pragma/api/src/sessions/offline-manifest.core.ts:33` declares `@Blueprint core-projection`, and 64 files carry `@FollowsBlueprint core-projection`. Slice 1 moves the blueprint onto `projectSessionForTool` in `session-tool.core.ts` before the delete.
- `borso/no-array-methods-in-controllers` refuses `.map` in a controller, so the parallel run of the reads goes into `api/src/read-batch/read-batch.service.ts`.
- `@tanstack/query-core@5.102.8` pauses a query offline under `networkMode: 'online'` instead of failing it, so `selectOpeningWait` counts `paused` as failed.
- TanStack's `notifyManager` schedules notifications on `setTimeout(0)`, so each dependent wave is a task of its own. The spec's per-route bounds already count one request per wave.

Friction logged with `scripts/kaizen.sh --from plan` (three lines).
