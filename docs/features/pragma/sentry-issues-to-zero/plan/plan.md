# Plan: pragma's open Sentry issues go to zero

| Spec behaviour | Where it lands | Test |
| --- | --- | --- |
| 1. Back off between conflict retries | `apps/pragma/api/src/helpers/persistence/conflict-abort.core.ts`: `CONFLICTED_WRITE_MAX_ATTEMPTS = 5`, `conflictRetryDelayAfter(attempt)` doubling from 100 ms, a required `wait` threaded through `retryingConflictAborts`, `retryingStatement` and `retryingConflictAbortsOf`. `apps/pragma/api/src/database/client.ts` passes `waitFor`, a `setTimeout` promise, and its blueprint text says why. | `conflict-abort.core.test.ts` checks the delays 100, 200, 400 and 800 and the 5 attempts. `tasks.controller.test.ts` imports the constant in place of a hardcoded 3. The oauth e2e tests already use the constant. |
| 2. Report a dropped batch only after its retry | `apps/pragma/site/src/lib/read-batch.core.ts`: `hasRetriedCaller(batch)`. `read-batch.adapter.ts`: `fetchBatch` catches the fetch rejection, reports only when `hasRetriedCaller`, and rejects or retries. Refusals and malformed answers keep reporting in `sendBatch`. | `read-batch.core.test.ts` covers `hasRetriedCaller`. `read-batch.adapter.test.ts` covers a drop that the retry answers (no report), a double drop (one report), and a malformed answer (two reports with `status: null`). |
| 3. Ceiling 0 | `docs/quality/targets.md` adds six rows and replaces the "no row on purpose" rule. `.claude/skills/quality-dashboard/SKILL.md` drops "deliberately unscored". | `scripts/quality` tests parse `targets.md`. |

## Risks

- A write that keeps losing conflicts now fails after 1.5 s instead of at once. Detection is the Lambda duration and the 5xx count on the 3S board.
- A 1.5 s wait is a guess above one measured recovery of 1.24 s or less. If OC001 still escapes, Sentry shows it again under the same fingerprint.

## Gates

`pnpm --filter @borso-app/pragma run lint`, `typecheck`, `test:core`, the back-e2e tests for tasks and oauth, and Stryker on the three changed files at 100%.
