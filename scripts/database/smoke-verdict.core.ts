import type { InvocationOutcome } from './reader-invocation.utils';

export const SMOKE_QUERY = 'SELECT 1 AS reader_alive';

const EXPECTED_ROW_COUNT = 1;

export type SmokeVerdict =
  | { readonly healthy: true; readonly role: string; readonly schema: string }
  | { readonly healthy: false; readonly reason: string };

export function decideSmokeVerdict(outcome: InvocationOutcome): SmokeVerdict {
  if (outcome.kind === 'failed') return { healthy: false, reason: outcome.reason };
  if (outcome.kind === 'refused') {
    return { healthy: false, reason: `the reader refused its own smoke query: ${outcome.reason}` };
  }
  if (outcome.rows.length !== EXPECTED_ROW_COUNT) {
    return {
      healthy: false,
      reason: `expected ${String(EXPECTED_ROW_COUNT)} row from "${SMOKE_QUERY}", got ${String(outcome.rows.length)}`,
    };
  }
  return { healthy: true, role: outcome.role, schema: outcome.schema };
}
