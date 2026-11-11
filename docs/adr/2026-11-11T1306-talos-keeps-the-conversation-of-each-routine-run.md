# ADR-2026-11-11T1306: Talos keeps the conversation of each routine run in a table of its own database

- **Status:** proposed
- **Date:** 2026-11-11
- **Deciders:** Hugo
- **Tags:** routine-launch, talos, data

## Context

A decision on a proposal fires the Claude Code routine, and from this feature a message typed on the Message screen fires it too (spec R1, R2). The fire endpoint answers the address of the conversation it created, `claude_code_session_url` (read in the Claude Code documentation on 2026-11-11, spec introduction). Until now the API discarded that answer (`routine-fire.adapter.ts` on `main` read the status only). The owner wants to open that conversation right away and later (spec introduction). The endpoint is a research preview, so the shape of its answer is driven by an external service and may change. A decision's HTTP answer is a `Proposal`, and the spec keeps it unchanged whatever the fire does (R2.2). The memory files are a contract with the agent repository ([`MEMORY-CONTRACT.md`](../../apps/talos/MEMORY-CONTRACT.md)). The question is where the address of a run lives so the owner finds it again.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | The owner opens the conversation of a run right away and later, after a reload or from another device (spec introduction, R3) | Component test of the Message screen listing the runs with their link, and back e2e of `GET /api/routine/runs` |
| A decision's answer and status stay as they are | operator | high | The spec states it (R2.2). The Décider screen and its undo read a `Proposal` | Back e2e: the decision answers the same `Proposal` when the fire fails and when the run cannot be stored |
| No change to the contract with the agent repository | author | medium | A new memory file or table is read and written by the agent, in a repository this change does not touch | Diff of `MEMORY-CONTRACT.md`, which stays empty |
| What breaks when the preview endpoint changes its answer | author | low | The answer's shape is not ours | Core test: an answer without a usable address is stored as a run without one |

## Decision

**A `routine_run` table in the app's own database.** Each successful fire stores one row: `id`, `fired_at`, `trigger`, `subject`, `session_url`. `GET /api/routine/runs` answers the 20 most recent, and the Message screen lists them. It wins because it is the only option where the owner finds a conversation after a reload, with a decision's answer and the memory contract both untouched.

## Consequences

- `+` The owner opens the conversation of any of the last 20 runs from the Message screen, on any device.
- `+` A decision keeps its answer. Storing the run is a side effect that is reported and never fails the decision (back e2e).
- `-` A column holds a value an external research preview shapes. `session_url` is nullable and kept only when it starts with `https://claude.ai/code/`, so a changed answer costs the link and nothing else.
- `-` The table grows by one row per fire and nothing prunes it. The list sorts on `fired_at` with no index. The number of fires a day is unknown.
- `-` A fire that succeeded but whose row could not be written leaves no trace in the app. The conversation still exists in Claude Code.
- `~` A new migration, `0002_routine_run.sql`, runs on the next deploy. The table joins the two lists of the back-e2e harness.
- `~` The export of `/api/agent/export` and the memory tables do not hold routine runs.

## Alternatives considered

### Option A, a table of the app's own database (chosen)

- **Raised by:** author (spec « Data shape »)
- **Summary:** The table and the two routes described in *Decision*.
- **Strengths:**
  - The address survives a reload and is read from any device.
  - The decision route answers what it answered before.
  - Nothing changes for the agent repository.
- **Costs:**
  - One table, one migration, one slice (`api/src/routine/`).
  - A nullable column shaped by an external preview.
- **Rationale:** It is the only option that meets both operator criteria.

### Option B, the address only in the HTTP answer (rejected)

- **Raised by:** author
- **Summary:** `POST /api/routine/runs` and the decision route answer the address, and the screen keeps it in memory.
- **Strengths:** No table and no migration.
- **Costs:** The address is lost on reload and never reaches another device. The decision route would answer a new shape.
- **Rejection rationale:** It loses on both operator criteria. The owner cannot open the conversation later, and a decision's answer changes shape.

### Option C, the address in the memory files (rejected)

- **Raised by:** author
- **Summary:** Write the address into the proposal's page or a memory document, so the agent and the app both read it.
- **Strengths:** The address sits next to the proposal it answers.
- **Costs:** A change to `MEMORY-CONTRACT.md` and to the agent repository. A message has no page to carry it.
- **Rejection rationale:** It loses on the contract criterion, and a message's run has no file to live in.

### Option D, keep discarding the answer (rejected)

- **Raised by:** author
- **Summary:** Do nothing. The owner finds the conversation in Claude Code's own session list.
- **Strengths:** No code, no table.
- **Costs:** The owner searches a list of sessions by hand after every message and every decision. Whether that list names a routine's session in a way that tells two runs apart is unknown.
- **Rejection rationale:** It loses on the first operator criterion. The spec asks for the conversation right away and later, from the app.

## Scores

|             | A, table | B, HTTP answer | C, memory files | D, nothing |
|---|---|---|---|---|
| Changes the app for its users | ✓ list of runs, after a reload too | ✗ lost on reload | ✓ readable later | ✗ nothing in the app |
| Decision's answer unchanged | ✓ same `Proposal` | ✗ new shape | ✓ same `Proposal` | ✓ same `Proposal` |
| Agent contract unchanged | ✓ untouched | ✓ untouched | ✗ new memory content | ✓ untouched |
| Preview endpoint changes | ✓ nullable address, run kept | ✓ nothing stored | ✗ a memory write depends on it | ✓ answer ignored |

## Implementation pointers

- Spec: docs/features/talos/routine-launch/spec/spec.md (Data shape, R2, R3, R4)
- Plan: none, the feature was implemented from the spec
- Commit: stamped by /after-task-kaizen on merge
- Files: apps/talos/api/src/routine/routine.schema.ts, apps/talos/api/src/routine/routine.service.ts, apps/talos/api/src/helpers/routine/routine-fire.core.ts (`readSessionUrl`), apps/talos/api/src/database/migrations/0002_routine_run.sql
- Related ADRs: ADR-2026-10-16T0716 (the memory lives in the database; routine runs are not memory)
