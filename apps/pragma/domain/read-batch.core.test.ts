import { describe, expect, it } from 'vitest';
import {
  isBatchableRead,
  MOST_READS_IN_FLIGHT,
  MOST_READS_PER_BATCH,
  READ_BATCH_PATH,
} from './read-batch.core';

// @FollowsBlueprint test-pure-unit
describe('the reads a batch may carry', () => {
  it('holds as many reads as the database pool has connections, and two batches in flight', () => {
    expect(MOST_READS_PER_BATCH).toBe(10);
    expect(MOST_READS_IN_FLIGHT).toBe(2);
    expect(READ_BATCH_PATH).toBe('/api/read-batch');
  });

  it.each(['/api/songs?x=1', '/api/songs', '/api/songs/abc#top', '/api/read-batches'])(
    'allows the API read %s',
    (path) => {
      expect(isBatchableRead(path)).toBe(true);
    },
  );

  it.each([
    '/mcp',
    '/api',
    'api/songs',
    '//evil.example/api/songs',
    'https://evil.example/api/songs',
    '/oauth/token',
    '/api/read-batch',
    '/api/read-batch?x=1',
    '/api/read-batch/again',
    '/api/../x',
    '/api/%2e%2e/x',
    '/api/songs/../../mcp',
    '/api/./songs',
    '/api/songs\\..\\..\\mcp',
  ])('refuses %s', (path) => {
    expect(isBatchableRead(path)).toBe(false);
  });
});
