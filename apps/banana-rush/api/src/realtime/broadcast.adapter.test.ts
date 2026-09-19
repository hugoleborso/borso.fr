import { describe, expect, it, vi } from 'vitest';
import { type ConnectionPoster, GONE_STATUS_CODE, postToConnection } from './broadcast.adapter';

function posterThatFailsWith(failure: unknown): ConnectionPoster {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the cases below are exactly the non-Error values the AWS SDK and a broken gateway reject with, which is what this adapter has to survive
  return { postToConnection: () => Promise.reject(failure) };
}

// @FollowsBlueprint test-node-adapter
describe('postToConnection', () => {
  it('sends the payload as JSON and reports delivery', async () => {
    const postSpy = vi.fn(() => Promise.resolve({}));
    const outcome = await postToConnection({ postToConnection: postSpy }, 'abc', { kind: 'ping' });

    expect(outcome).toEqual({ isGone: false });
    expect(postSpy).toHaveBeenCalledWith({
      ConnectionId: 'abc',
      Data: '{"kind":"ping"}',
    });
  });

  it('reports a connection that has gone away rather than throwing', async () => {
    const poster = posterThatFailsWith({ $metadata: { httpStatusCode: GONE_STATUS_CODE } });

    await expect(postToConnection(poster, 'abc', {})).resolves.toEqual({ isGone: true });
  });

  it('rethrows a failure carrying another status code', async () => {
    const poster = posterThatFailsWith({ $metadata: { httpStatusCode: 500 } });

    await expect(postToConnection(poster, 'abc', {})).rejects.toEqual({
      $metadata: { httpStatusCode: 500 },
    });
  });

  it('rethrows a failure carrying no metadata at all', async () => {
    const poster = posterThatFailsWith({ someOtherShape: true });

    await expect(postToConnection(poster, 'abc', {})).rejects.toEqual({ someOtherShape: true });
  });

  it('rethrows a failure that is not an object', async () => {
    await expect(postToConnection(posterThatFailsWith('boom'), 'abc', {})).rejects.toBe('boom');
  });

  it('rethrows a failure that is null', async () => {
    await expect(postToConnection(posterThatFailsWith(null), 'abc', {})).rejects.toBeNull();
  });
});
