---
status: done
summary: >-
  Both blocking findings of technical validation round 1 are fixed. The gear cascade steps
  moved into gear-items-cascade.service.ts, which imports only its own repository. The
  sessions and members repositories now import that service, so the two import cycles are
  gone and gear-items.service.ts is off the import/no-cycle exemption list again. The three
  surviving mutants are handled. One equivalent clause is removed, one mutant is killed by a
  new assertion, and one proven equivalent carries a Stryker disable with its reason. The
  mutation score is 100 (measured). Non-blocking B11, B13, B14 and E02 are fixed, the E02 fix
  being 409 id-taken plus a back-e2e test. B12 and the three concurrent-proof findings are
  dismissed with reasons in fix-triage.md. Gates passed: oxlint --type-aware, oxfmt --check,
  the typecheck, knip, 183 core files changed since main, back-e2e for gear-items, members
  and sessions, and scripts/mutate-changed.sh.
next:
  kind: validate
artifacts:
  - .oxlintrc.json
  - apps/pragma/api/src/gear-items/gear-items-cascade.service.ts
  - apps/pragma/api/src/gear-items/gear-items.service.ts
  - apps/pragma/api/src/gear-items/gear-items.controller.ts
  - apps/pragma/api/src/gear-items/gear-items.controller.test.ts
  - apps/pragma/api/src/gear-items/gear-item-tool.core.ts
  - apps/pragma/api/src/gear-items/INVARIANTS.md
  - apps/pragma/api/src/members/members.repository.ts
  - apps/pragma/api/src/sessions/sessions.repository.ts
  - apps/pragma/domain/gear-status.core.ts
  - apps/pragma/domain/gear-status.core.test.ts
  - docs/features/pragma/concert-gear-checklist/validation/technical-validation-round1.md
  - docs/features/pragma/concert-gear-checklist/runs/2026-11-25-concert-gear-checklist/agents/fix-triage.md
---

# Implementation 03, fix round after technical validation round 1

Goal: clear the two blocking findings with the smallest change each. The two findings are the
new import-cycle exemption and the three surviving mutants.

The triage of every finding is in `fix-triage.md`, next to this file.

The round-2 validator should read only the diff since c4919b3b9.
