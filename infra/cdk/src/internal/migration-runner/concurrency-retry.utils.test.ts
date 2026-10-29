import { describe, expect, it } from 'vitest';
import {
  CONCURRENCY_RETRY_MAX_ATTEMPTS,
  isConcurrencyConflict,
  planConcurrencyRetry,
} from './concurrency-retry.utils.js';

const CATALOG_CONFLICT = Object.assign(
  new Error('schema has been updated by another transaction'),
  {
    code: 'OC001',
  },
);

// @FollowsBlueprint test-pure-unit
describe('isConcurrencyConflict', () => {
  it.each(['OC000', 'OC001', '40001'])('reads the code %s as a lost concurrency race', (code) => {
    expect(isConcurrencyConflict({ code })).toBe(true);
  });

  it('reads the code DSQL puts in the message when the error carries no code of its own', () => {
    expect(
      isConcurrencyConflict(
        new Error(
          'Received response status [FAILED] from custom resource. Message returned: schema has been updated by another transaction (OC001)',
        ),
      ),
    ).toBe(true);
    expect(
      isConcurrencyConflict(new Error('change conflicts with another transaction (OC000)')),
    ).toBe(true);
  });

  it('leaves every other error to fail the deploy', () => {
    expect(isConcurrencyConflict({ code: '42P01' })).toBe(false);
    expect(isConcurrencyConflict(new Error('relation does not exist'))).toBe(false);
    expect(isConcurrencyConflict(new Error('OC001 without its brackets'))).toBe(false);
    expect(isConcurrencyConflict({ code: 1, message: 2 })).toBe(false);
    expect(isConcurrencyConflict('OC001')).toBe(false);
    expect(isConcurrencyConflict(null)).toBe(false);
  });
});

describe('planConcurrencyRetry', () => {
  it('retries a concurrency conflict after a delay that doubles each attempt', () => {
    expect(planConcurrencyRetry(CATALOG_CONFLICT, 1)).toStrictEqual({
      isRetried: true,
      delayMilliseconds: 2_000,
    });
    expect(planConcurrencyRetry(CATALOG_CONFLICT, 2)).toStrictEqual({
      isRetried: true,
      delayMilliseconds: 4_000,
    });
    expect(
      planConcurrencyRetry(CATALOG_CONFLICT, CONCURRENCY_RETRY_MAX_ATTEMPTS - 1),
    ).toStrictEqual({ isRetried: true, delayMilliseconds: 16_000 });
  });

  it('gives up on the last attempt so the deploy still fails inside the runner timeout', () => {
    expect(planConcurrencyRetry(CATALOG_CONFLICT, CONCURRENCY_RETRY_MAX_ATTEMPTS)).toStrictEqual({
      isRetried: false,
      delayMilliseconds: 0,
    });
  });

  it('never retries any other error', () => {
    expect(planConcurrencyRetry(new Error('syntax error'), 1)).toStrictEqual({
      isRetried: false,
      delayMilliseconds: 0,
    });
  });
});
