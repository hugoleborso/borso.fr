import { describe, expect, it } from 'vitest';
import { selectResponseData } from './origin-verify-response.utils.js';

// @FollowsBlueprint test-pure-unit
describe('selectResponseData', () => {
  it('generates a value on create and on update', () => {
    expect(selectResponseData('Create', () => 'first')).toStrictEqual({ Value: 'first' });
    expect(selectResponseData('Update', () => 'second')).toStrictEqual({ Value: 'second' });
  });

  it('returns nothing on delete and never calls the generator', () => {
    let calls = 0;
    const counted = () => {
      calls += 1;
      return 'unused';
    };
    expect(selectResponseData('Delete', counted)).toStrictEqual({});
    expect(calls).toBe(0);
  });
});
