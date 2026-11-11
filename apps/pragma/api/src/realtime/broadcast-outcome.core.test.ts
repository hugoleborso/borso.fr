import { describe, expect, it } from 'vitest';
import {
  buildBroadcastOutcomeFields,
  listRejectionReasons,
  selectBroadcastFailure,
} from './broadcast-outcome.core';

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
    expect(selectBroadcastFailure({ kind: 'delivered' }, ['setlists'])).toBeNull();
  });

  it('reports a broadcast that ran out of budget, with the roots it carried', () => {
    expect(selectBroadcastFailure({ kind: 'late' }, ['setlists', 'studies'])).toStrictEqual({
      name: 'RealtimeBroadcastLate',
      tags: { 'realtime.written': 'setlists,studies' },
    });
  });

  it('reports a broadcast that failed, with the roots it carried and the kind of error', () => {
    expect(
      selectBroadcastFailure({ kind: 'failed', error: new RangeError('down') }, ['all']),
    ).toStrictEqual({
      name: 'RealtimeBroadcastFailed',
      tags: { 'realtime.written': 'all', 'realtime.code': 'RangeError' },
    });
  });
});

describe('buildBroadcastOutcomeFields', () => {
  it.each(['delivered', 'late'] as const)(
    'records a broadcast %s at the cutoff by its outcome alone',
    (kind) => {
      expect(buildBroadcastOutcomeFields({ kind })).toStrictEqual({
        'realtime.broadcast_outcome': kind,
      });
    },
  );

  it('records a broadcast that failed within its budget with the type and text of the error', () => {
    expect(
      buildBroadcastOutcomeFields({ kind: 'failed', error: new RangeError('gateway down') }),
    ).toStrictEqual({
      'realtime.broadcast_outcome': 'failed',
      'realtime.broadcast_failure': ['RangeError'],
      'realtime.broadcast_failure_message': ['gateway down'],
    });
  });
});
