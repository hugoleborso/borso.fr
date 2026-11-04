import { describe, expect, it } from 'vitest';
import { listRejectionReasons, selectBroadcastFailure } from './broadcast-outcome.core';

// @FollowsBlueprint test-pure-unit
describe('listRejectionReasons', () => {
  it('keeps the reason of every send that failed, in order, and nothing of one that worked', () => {
    const first = new Error('first');
    expect(
      listRejectionReasons([
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: first },
        { status: 'rejected', reason: 'second' },
      ]),
    ).toStrictEqual([first, 'second']);
  });

  it('lists nothing when every send worked', () => {
    expect(listRejectionReasons([{ status: 'fulfilled', value: 1 }])).toStrictEqual([]);
  });
});

describe('selectBroadcastFailure', () => {
  it('reports nothing for a broadcast that was delivered', () => {
    expect(selectBroadcastFailure({ kind: 'delivered' }, 'setlists')).toBeNull();
  });

  it('reports a broadcast that ran out of budget, with its scope', () => {
    expect(selectBroadcastFailure({ kind: 'late' }, 'setlists')).toStrictEqual({
      name: 'RealtimeBroadcastLate',
      tags: { 'realtime.scope': 'setlists' },
    });
  });

  it('reports a broadcast that failed, with its scope and the kind of error', () => {
    expect(
      selectBroadcastFailure({ kind: 'failed', error: new RangeError('down') }, 'all'),
    ).toStrictEqual({
      name: 'RealtimeBroadcastFailed',
      tags: { 'realtime.scope': 'all', 'realtime.code': 'RangeError' },
    });
  });
});
