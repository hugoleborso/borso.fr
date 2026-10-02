# ADR-0023: One database role per stage schema, and API Lambdas lose admin access

- **Status:** proposed
- **Date:** 2026-10-02
- **Deciders:** Hugo Borsoni
- **Tags:** practice-free-slots, cdk, data, security

## Context

Every application on Aurora DSQL owns one cluster, and every stage of that application (prod, integ, each pull request's preview) is a schema inside it. Today every API Lambda connects as `admin`: `apps/pragma/api/src/database/client.ts`, `apps/last-loop-lepin/api/src/database/client.ts` and `apps/banana-rush/api/src/database/client.ts` all sign with `getDbConnectAdminAuthToken`, and `DsqlSchema.grantConnect` in `infra/cdk/src/constructs/dsql-schema.ts` grants `dsql:DbConnectAdmin` on the whole cluster. The `search_path` is the only thing that keeps a stage in its own schema, and it is a convenience, not a boundary.

A preview Lambda runs the code of a pull request nobody has reviewed yet, so any preview can read and write production. pragma already holds members' phone numbers and e-mail addresses, and the free-slot feature adds each member's secret calendar address ([spec](../features/pragma/practice-free-slots/spec/spec.md)), which gives read access to their whole calendar.

The Aurora DSQL documentation describes custom roles: `CREATE ROLE … WITH LOGIN`, `AWS IAM GRANT <role> TO '<iam-arn>'`, schema and table `GRANT`s, and `dsql:DbConnect` for an IAM identity mapped to a non-admin role. It does not say whether column-level `GRANT` works. The operator asked for this change in the same pull request as the feature.

## Decision

**Every stage schema gets its own login role, mapped by `AWS IAM GRANT` to that stage's API Lambda and granted rights on its own schema only. API Lambdas connect with `dsql:DbConnect` as that role, and `admin` is left to the migration runner.** The runner already connects as `admin` and already owns the schema's lifecycle. It creates the role, maps it, and grants `USAGE` on the schema plus table rights after every migration run, so a table added later is covered. When the schema is deleted, the runner revokes the mapping and drops the role. Production loses nothing it uses, and a preview can no longer reach any schema but its own.

## Consequences

- `+` A preview cannot read or write production, or another preview, whatever code it runs. That covers the calendar addresses, and also the phone numbers and e-mail addresses that exist today.
- `+` A table-level boundary exists, so later sensitive data can be isolated by putting it in its own table.
- `-` The change touches all three applications on DSQL and `infra/cdk`, which is gated at 100 % coverage. Merging deploys all three to production at once.
- `-` The deploy has a new ordering dependency. A Lambda that switches to its role before the runner has created it fails every query, so the Lambda has to depend on the schema's custom resource. A bug in this path takes the whole API down, not one feature.
- `-` Reading production by hand for debugging now needs `admin` explicitly, which is the point but is also friction.
- `~` Column-level grants are still unverified on DSQL. This decision does not rely on them.

## Alternatives considered

### Option A — One role per stage schema (chosen)

- **Summary:** As described in *Decision*.
- **Strengths:**
  - Closes the preview-to-production path for every table at once.
  - Uses only what the DSQL documentation describes.
- **Costs:**
  - Changes in `DsqlSchema`, the migration runner, `LambdaApi` wiring and three `client.ts` files, all under coverage gates.
- **Rationale:** It is the only option that fixes the boundary rather than one column, and its cost is paid once in shared constructs.

### Option B — Keep `admin` everywhere (rejected)

- **Summary:** Change nothing. Rely on `search_path` and on review.
- **Strengths:**
  - No infrastructure work and no deploy-ordering risk.
- **Costs:**
  - Any preview keeps full access to production, including the new calendar addresses.
- **Rejection rationale:** It loses on isolation, which is the reason the question came up. It would only win if the stored data were public, and it is not.

### Option C — Keep `admin`, encrypt the sensitive columns with KMS (rejected)

- **Summary:** The API encrypts the calendar address with a KMS key before writing it, and only the production Lambda may decrypt.
- **Strengths:**
  - Protects that one column even from a person reading the database as `admin`.
- **Costs:**
  - A KMS key with a fixed monthly fee plus a per-call fee, and an encryption call on every write and read.
  - Every other column stays readable and writable from any preview.
- **Rejection rationale:** It loses on breadth. It protects one column and leaves the boundary open. The operator chose plain text for the address on 2026-10-02 once the boundary was fixed ([ADR-0024](./0024-calendar-feed-address-in-its-own-table.md)).

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| A preview cannot reach production | high | Previews run unreviewed code, and production holds personal data. |
| Covers every table, not only the new one | high | The phone numbers and e-mail addresses already have the same exposure. |
| No new fixed cost | medium | This is a lab account. ADR-0022 set the same bar. |
| Deploy risk | medium | A failure in the database authentication path takes the whole API down. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| A preview cannot reach production | ✓ the role sees one schema | ✗ admin sees all | ✗ only the decrypt is blocked; writes still pass |
| Covers every table | ✓ schema-wide | ✗ none | ✗ one column |
| No new fixed cost | ✓ roles are free | ✓ nothing changes | ✗ a KMS key per application |
| Deploy risk | ✗ a new ordering dependency | ✓ none | ✓ local to one feature |

## Implementation pointers

- Spec: [`docs/features/pragma/practice-free-slots/spec/spec.md`](../features/pragma/practice-free-slots/spec/spec.md), *Questions, Options and Decisions*, the row "Who can read it?"
- Plan: `docs/features/pragma/practice-free-slots/plan/plan.md`
- Commit: stamped by `/after-task-dantotsus` on merge
- Files: `infra/cdk/src/constructs/dsql-schema.ts`, `infra/cdk/src/internal/migration-runner/index.ts`, `infra/cdk/src/constructs/lambda-api.ts`, `apps/*/api/src/database/client.ts`
- Related ADRs: ADR-0009 (previews clone production), ADR-0024
