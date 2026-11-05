import { describe, expect, it } from 'vitest';
import { readBatchSchema } from './read-batch.schema';

const SONGS_READ = { path: '/api/songs', headers: {} };
const ELEVEN_READS = 11;

// @FollowsBlueprint test-pure-unit
describe('the body of a read batch', () => {
  it('accepts reads with the headers the site may send', () => {
    const batch = {
      reads: [
        SONGS_READ,
        {
          path: '/api/audience/live',
          headers: { 'x-ballot-token': 'token', 'x-pragma-client': 'tab' },
        },
      ],
    };
    expect(readBatchSchema.parse(batch)).toStrictEqual(batch);
  });

  it('accepts ten reads', () => {
    expect(
      readBatchSchema.safeParse({ reads: Array.from({ length: 10 }, () => SONGS_READ) }).success,
    ).toBe(true);
  });

  it.each([
    ['no reads', { reads: [] }],
    ['eleven reads', { reads: Array.from({ length: ELEVEN_READS }, () => SONGS_READ) }],
    ['a path outside the API', { reads: [{ path: '/mcp', headers: {} }] }],
    ['the batch path itself', { reads: [{ path: '/api/read-batch', headers: {} }] }],
    ['a cookie header', { reads: [{ path: '/api/songs', headers: { cookie: 'x' } }] }],
    [
      'a header value that is not text',
      { reads: [{ path: '/api/songs', headers: { 'x-ballot-token': 1 } }] },
    ],
    ['a method beside the path', { reads: [{ ...SONGS_READ, method: 'POST' }] }],
    ['no headers', { reads: [{ path: '/api/songs' }] }],
    ['a field beside the reads', { reads: [SONGS_READ], writes: [] }],
    ['no reads field', {}],
  ])('refuses %s', (_case, body) => {
    expect(readBatchSchema.safeParse(body).success).toBe(false);
  });
});
