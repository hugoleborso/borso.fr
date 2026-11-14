import { describe, expect, it } from 'vitest';
import { ApiError } from '../api.client';
import { readSketchRefusal } from './sketch-refusal.core';

// @FollowsBlueprint test-pure-unit
describe('readSketchRefusal', () => {
  it('reads the lane, inspiration or clip another member removed', () => {
    for (const code of ['lane-not-found', 'inspiration-not-found', 'clip-not-found'] as const) {
      expect(readSketchRefusal(new ApiError(404, 'clip 404', { error: code }))).toBe(code);
    }
  });

  it('reads no refusal from another failure or from an error the API did not answer', () => {
    expect(readSketchRefusal(new ApiError(500, 'clip 500', { error: 'boom' }))).toBeNull();
    expect(readSketchRefusal(new Error('offline'))).toBeNull();
    expect(readSketchRefusal({ body: { error: 'clip-not-found' } })).toBeNull();
  });
});
