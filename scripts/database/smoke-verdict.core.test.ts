import { describe, expect, it } from 'vitest';
import type { InvocationOutcome } from './reader-invocation.utils';
import { decideSmokeVerdict, SMOKE_QUERY } from './smoke-verdict.core';

const ONE_ROW: InvocationOutcome = {
  kind: 'rows',
  rows: [{ reader_alive: 1 }],
  capped: false,
  schema: 'prod',
  role: 'ai_reader_prod',
};

function reasonFor(outcome: InvocationOutcome): string {
  const verdict = decideSmokeVerdict(outcome);
  if (verdict.healthy) throw new Error('expected an unhealthy verdict');
  return verdict.reason;
}

describe('decideSmokeVerdict', () => {
  it('is healthy on exactly one row, and carries the role and schema it answered as', () => {
    expect(decideSmokeVerdict(ONE_ROW)).toStrictEqual({
      healthy: true,
      role: 'ai_reader_prod',
      schema: 'prod',
    });
  });

  it('passes a failure through verbatim, so the connection error survives to the log', () => {
    expect(
      reasonFor({ kind: 'failed', reason: 'the reader function failed with PostgresError: nope' }),
    ).toBe('the reader function failed with PostgresError: nope');
  });

  it('is unhealthy when the reader refuses the smoke query it was given', () => {
    const reason = reasonFor({ kind: 'refused', reason: 'the query uses DELETE' });
    expect(reason).toContain('refused its own smoke query');
    expect(reason).toContain('the query uses DELETE');
  });

  it('is unhealthy on no rows, which is a connection that answered nothing', () => {
    const reason = reasonFor({ ...ONE_ROW, rows: [] });
    expect(reason).toContain('got 0');
    expect(reason).toContain(SMOKE_QUERY);
  });

  it('is unhealthy on more rows than asked for', () => {
    expect(reasonFor({ ...ONE_ROW, rows: [{ a: 1 }, { a: 2 }] })).toContain('got 2');
  });
});
