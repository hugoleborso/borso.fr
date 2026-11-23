// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertPresent, readResponseShapeFingerprint } from './response-shape.adapter';

const APP_DIRECTORY = process.cwd();
const COMPILER_TIMEOUT_MS = 60_000;

// @FollowsBlueprint test-node-adapter
describe('the response shape fingerprint', () => {
  it(
    'gives the same twelve hex digits for the same response types',
    () => {
      const first = readResponseShapeFingerprint(APP_DIRECTORY);
      expect(first).toMatch(/^[0-9a-f]{12}$/);
      expect(readResponseShapeFingerprint(APP_DIRECTORY)).toBe(first);
    },
    COMPILER_TIMEOUT_MS,
  );

  it('names what the compiler did not answer', () => {
    expect(assertPresent('streaks', 'route')).toBe('streaks');
    expect(() => assertPresent(undefined, 'json reader')).toThrow('response shape: no json reader');
  });
});
