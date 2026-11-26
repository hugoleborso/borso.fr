---
status: done
summary: |
  Plan written at docs/features/pragma/concert-gear-checklist/plan/plan.md in two slices that each leave the app green. Slice 1 adds the domain rule, the gear_item migration, the api/src/gear-items module under the new written root gear-items, the member release and concert cascade, and the MCP read (get_session lists items) and write (save_gear_item, delete kind gear_item). Slice 2 adds the gear page, the summary card, the route and i18n, and stops reading and writing session.gear. No ADR trigger. No migration touches session.gear, so Akanaboum's lines stay as they are. One default for the operator to confirm on the preview: a tap on an item label opens the add sheet filled in, with delete. Not committed: the subagent-no-staging hook refuses git add and commit from a subagent, so the main session commits the four paths.
artifacts:
  - docs/features/pragma/concert-gear-checklist/plan/plan.md
  - docs/features/pragma/concert-gear-checklist/runs/2026-11-25-concert-gear-checklist/state.json
  - docs/features/pragma/concert-gear-checklist/runs/2026-11-25-concert-gear-checklist/journal.md.jsonl
  - docs/features/pragma/concert-gear-checklist/runs/2026-11-25-concert-gear-checklist/agents/technical-conception-01.md
next:
  kind: validate
---

## Detail

- Base gates run on 2026-11-25: build passed; core files tool-coverage, stale-scope-coverage, derived-read-roots and query-key-roots passed (20 tests); back-e2e tasks, sessions, mcp.controller and tool-stale-scope passed (30 tests).
- Trap found: tool-coverage.test.ts sits in the core project, not back-e2e. The plan's gates put it in the right one.
- The tool list headroom under 19,000 characters is unknown; gate 4 settles it, and the fix for an overrun is shorter text, not a higher budget.
