import { describe, expect, it } from 'vitest';
import { getMaxRetries, nextAction } from './retry-budget.utils';

describe('getMaxRetries', () => {
  it('returns 3 when no override is provided', () => {
    expect(getMaxRetries(undefined)).toBe(3);
  });

  it('returns 3 when the override is an empty string', () => {
    expect(getMaxRetries('')).toBe(3);
  });

  it('returns the parsed override when it is a non-negative integer', () => {
    expect(getMaxRetries('5')).toBe(5);
    expect(getMaxRetries('0')).toBe(0);
  });

  it('falls back to 3 when the override is non-numeric', () => {
    expect(getMaxRetries('three')).toBe(3);
  });

  it('falls back to 3 when the override is negative', () => {
    expect(getMaxRetries('-2')).toBe(3);
  });
});

describe('nextAction', () => {
  it('escalates as soon as the retry budget is exhausted, regardless of verdict kind', () => {
    expect(nextAction(3, 'fail-local', 3)).toBe('escalate');
    expect(nextAction(3, 'fail-plan', 3)).toBe('escalate');
    expect(nextAction(4, 'pass', 3)).toBe('escalate');
  });

  it('escalates on a spec-flaw verdict even with budget remaining', () => {
    expect(nextAction(0, 'fail-spec', 3)).toBe('escalate');
  });

  it('escalates on a crash verdict even with budget remaining', () => {
    expect(nextAction(0, 'crash', 3)).toBe('escalate');
  });

  it('replans on a plan-flaw verdict when the budget remains', () => {
    expect(nextAction(1, 'fail-plan', 3)).toBe('replan');
  });

  it('fixes locally on a local-flaw verdict when the budget remains', () => {
    expect(nextAction(0, 'fail-local', 3)).toBe('fix');
    expect(nextAction(2, 'fail-local', 3)).toBe('fix');
  });

  it('returns fix for a pass verdict when budget remains (degenerate case)', () => {
    expect(nextAction(0, 'pass', 3)).toBe('fix');
  });
});
