---
status: done
summary: |
  ADR-0004 written at docs/adr/0004-pragma-shared-password-auth.md.
  Slug `pragma-shared-password-auth`, status `proposed`. No conflict
  with existing slugs. Index updated under "App architecture". Two
  alternatives evaluated (shared password vs individual accounts) with
  4-criterion rubric anchored to the spec's framing. Triggers fired:
  multiple-alternatives + diverges-from-convention (last-loop-lepin
  uses JWT+PIN; pragma is the first deliberately-lighter auth).
artifacts:
  - docs/adr/0004-pragma-shared-password-auth.md
  - docs/adr/README.md
---

# Detail

## Inputs validated

- `slug: pragma-shared-password-auth` — no existing accepted ADR with this slug. ✓
- `alternatives: [shared password (chosen), individual accounts (rejected)]` — length ≥ 2. ✓
- `consequences (negative): [no per-user audit, rotation cost is band-wide]` — length ≥ 2. ✓
- `triggers: [multiple-alternatives, diverges-from-convention]` — non-empty. ✓
- Criteria + score-matrix not supplied by the orchestrator; derived from the spec's framing (Q.O.D. row, *Out of scope* section, daily-use tool with 5 trusted members). Four criteria with explicit weights: friction at access (high), per-action attribution (low), resistance to credential leak (medium), operator overhead (medium). Rubric differentiates: shared wins on 2 (the high-weight one + a medium one), individual wins on 2 (the low-weight one + the other medium one). Decision is robust under a "what if I shift the weights one notch?" sensitivity check — flipping requires the band to exceed 5 trusted members or pragma to start holding sensitive data, both explicit *Out of scope* in the spec.

## Conflict check

Highest existing ADR number is 0003 → new number is 0004. Slug
`pragma-shared-password-auth` does not match any existing ADR file.

## Index update

- Added row `| [0004](./0004-pragma-shared-password-auth.md) | Shared-password auth for the pragma band ERP | proposed | 2026-05-19 |` to the main table.
- Added one-line entry under *App architecture* heading.
- No existing entries reordered.

## Implementation pointers in the ADR

Anticipates `apps/pragma/api/src/auth/shared-password.middleware.ts`, `apps/pragma/api/src/auth/rate-limit.utils.ts`, and `apps/pragma/cdk/lib/pragma-stack.ts`. These paths will be confirmed by the `/technical-conception` stage in the orchestrator's next step.
