# ADR-0035: The quality dashboard reads pragma bug reports with a read-only database role

- **Status:** proposed
- **Date:** 2026-10-13
- **Deciders:** Hugo Borsoni
- **Tags:** quality-dashboard, data, pragma

## Context

The varicelle map colours each defect by the stage that caught it, and stage E is a bug reported by a user. Those reports land in pragma's `improvement` table, in the `prod` schema of pragma's DSQL cluster. The table mixes ideas and bugs, and the operator chose to add a `kind` column and have the dashboard read the table directly. Every connection to DSQL in this repository today uses `dsql:DbConnectAdmin`: the API, the migration runner and `scripts/dsql-shell.sh`. A database role other than `admin` needs `CREATE ROLE` and `AWS IAM GRANT`, both cluster-wide, while migrations run once per schema, so they cannot carry it.

## Decision

**A `quality_reader` database role, mapped to `QualityReadRole`, granted `SELECT` on `prod.improvement` only.** `QualityReadRole` gains `dsql:DbConnect` (not `DbConnectAdmin`) on the pragma cluster. The role is created once by the operator with `apps/pragma/scripts/grant-quality-reader.sql` through `scripts/dsql-shell.sh`, because it is cluster state, not schema state. The collector opens a read-only transaction regardless.

## Consequences

- `+` The dashboard cannot write to or read beyond one table of production.
- `+` The bug count arrives without anyone copying it.
- `-` A one-time manual grant the repository cannot verify; until it runs, the E cells read "unavailable".
- `-` A second consumer of pragma's production database, outside the application.
- `~` The `pragma-cluster` stack's ARN must be known to `infra/shared`; it is read from an SSM parameter the cluster stack already publishes, or passed as context.

## Alternatives considered

### Option A — read-only database role (chosen)

- **Summary:** as above.
- **Strengths:** least privilege on the data; no admin token in CI.
- **Costs:** one manual SQL run; one IAM statement.
- **Rationale:** the only option that reads the table without granting admin.

### Option B — `DbConnectAdmin` with a read-only transaction (rejected)

- **Summary:** give `QualityReadRole` admin connect and rely on `SET TRANSACTION READ ONLY`.
- **Strengths:** no manual step.
- **Costs:** a public publishing job holds full write access to production data.
- **Rejection rationale:** a code path is not a permission.

### Option C — a pragma endpoint returning the bug count (rejected)

- **Summary:** the dashboard calls the pragma API.
- **Strengths:** no second database consumer.
- **Costs:** a new authenticated endpoint and a credential for it.
- **Rejection rationale:** the operator chose to read the table.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Least privilege on production data | high | Band members' data |
| No manual reading | high | Notion ADR 0018 |
| Manual setup | low | One-time |

|             | Option A | Option B | Option C |
|---|---|---|---|
| Least privilege | ✓ one table, read | ✗ admin | ✓ one endpoint |
| No manual reading | ✓ | ✓ | ✓ |
| Manual setup | ✗ one SQL run | ✓ none | ✗ one credential |

## Implementation pointers

- Spec: `docs/features/meta/quality-dashboard/spec/spec.md`
- Plan: `docs/features/meta/quality-dashboard/plan/plan.md`
- Commit: stamped on merge
- Files: `apps/pragma/scripts/grant-quality-reader.sql`, `scripts/quality/pragma-bug-reports.adapter.ts`
- Related ADRs: ADR-0033
