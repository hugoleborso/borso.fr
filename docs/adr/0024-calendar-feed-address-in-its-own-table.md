# ADR-0024: A member's calendar feed address is plain text in its own table, write-only through the API

- **Status:** proposed
- **Date:** 2026-10-02
- **Deciders:** Hugo Borsoni
- **Tags:** practice-free-slots, data, security

## Context

The free-slot calculator ([spec](../features/pragma/practice-free-slots/spec/spec.md)) reads each member's calendar from its secret iCal address. That address is a credential: anyone who has it can read the whole calendar until its owner resets it in the provider. The server must read it in clear to fetch the feed, so hashing it the way `member_credential.password_hash` is hashed is not possible.

Previews clone production ([ADR-0009](./0009-pragma-previews-clone-production.md)), and only the tables in `tableBlocklist` stay behind. With [ADR-0023](./0023-one-database-role-per-stage-schema.md), each stage's API reaches its own schema only, and grants are known to work at table level. Column-level grants are unverified on DSQL.

## Decision

**The address lives in clear in a new table, `member_calendar_feed` (`member_id` primary key, `address`, `updated_at`). No route ever returns it, it never reaches a log, and the table is in pragma's `tableBlocklist`, so previews never receive it.** Responses carry only `connected` or `absent`. The table is deleted with the member, in the same transaction that removes the rest of the member. Its own table, rather than a column on `member`, is what lets the table-level boundary apply to it alone, and keeps it out of every query that reads `member`.

## Consequences

- `+` No key, no encryption call, and no fixed cost.
- `+` Excluding the address from previews is one line in `tableBlocklist`, so no clone code changes.
- `+` Joins on `member` never carry the address by accident, because the address is in another table.
- `-` Anyone holding `admin` on the production cluster reads every address in clear, and so does any backup.
- `-` A leak of the production schema leaks every member's calendar until each member resets the address, and the application cannot rotate it for them.
- `~` The write-only rule is enforced by the response schemas and a back-e2e assertion, not by the database.

## Alternatives considered

### Option A — Plain text in its own table (chosen)

- **Summary:** As described in *Decision*.
- **Strengths:**
  - The simplest storage that still sits behind ADR-0023's boundary.
  - Blocklisting the table is already supported.
- **Costs:**
  - The address is readable by `admin`.
- **Rationale:** With the boundary from ADR-0023, the remaining exposure is the operator's own `admin` access, which the operator accepted on 2026-10-02.

### Option B — A KMS-encrypted column (rejected)

- **Summary:** The API encrypts with a KMS key before the insert and decrypts before the fetch.
- **Strengths:**
  - A backup or an `admin` session sees only ciphertext.
- **Costs:**
  - A KMS key per application, with a fixed monthly fee plus per-call fees, and a decrypt call per feed per page load.
- **Rejection rationale:** It loses on cost and complexity for an exposure the operator accepted. It would win if more people than the operator held `admin`.

### Option C — One Secrets Manager secret per member (rejected)

- **Summary:** Each address is its own secret, and the table holds its ARN.
- **Strengths:**
  - Access is controlled per secret by IAM.
- **Costs:**
  - A billed secret per member, and an AWS resource created at runtime from a member's action.
- **Rejection rationale:** It loses on cost and on the shape of the infrastructure. No other runtime action here creates AWS resources.

### Option D — A column on `member` (rejected)

- **Summary:** Add `calendar_feed_address` to `member`.
- **Strengths:**
  - No new table.
- **Costs:**
  - Previews need `columnsToNullify`, and every `select()` on `member` carries the address.
- **Rejection rationale:** It loses on accidental exposure. One `select()` without an explicit column list sends the address to the browser.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Never reaches a browser or a preview | high | The address opens a member's whole calendar. |
| No new fixed cost | medium | This is a lab account. ADR-0022 set the same bar. |
| Protected from `admin` and backups | low | The operator is the only `admin`, and accepted this exposure on 2026-10-02. |
| Implementation size | low | A small feature should not bring a key or a resource lifecycle with it. |

|  | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| Never reaches a browser or a preview | ✓ own table, blocklisted | ✓ ciphertext only | ✓ an ARN only | ✗ every `member` read carries it |
| No new fixed cost | ✓ none | ✗ a KMS key | ✗ a secret per member | ✓ none |
| Protected from `admin` and backups | ✗ in clear | ✓ ciphertext | ✓ outside the database | ✗ in clear |
| Implementation size | ✓ one table | ✗ key plus calls | ✗ resource lifecycle | ✓ one column |

## Implementation pointers

- Spec: [`docs/features/pragma/practice-free-slots/spec/spec.md`](../features/pragma/practice-free-slots/spec/spec.md), the row "How is the address stored?"
- Plan: `docs/features/pragma/practice-free-slots/plan/plan.md`
- Commit: stamped by `/after-task-dantotsus` on merge
- Files: `apps/pragma/api/src/calendar-feeds/`, `apps/pragma/api/src/database/migrations/0015_calendar_feeds.sql`, `apps/pragma/cdk/lib/stack.ts` (`tableBlocklist`)
- Related ADRs: ADR-0009, ADR-0023
