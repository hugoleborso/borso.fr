import { NO_BONUS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import {
  addPendingEdit,
  dropPendingEdit,
  type GameCache,
  type PendingEdit,
  readShownGame,
  receiveBroadcast,
  receiveGame,
  selectShownGame,
} from './game-cache.core';
import type { GameView } from './game-view.core';

const EARLIER = '2026-11-22T10:00:00.000Z';
const LATER = '2026-11-22T10:00:01.000Z';

function aGame(
  revision: number,
  readAt: string,
  bids: readonly (number | null)[] = [null, null],
): GameView {
  return {
    joinCode: 'BRIG',
    phase: 'bidding',
    currentRound: 1,
    players: [
      { id: 'hugo', seat: 0, name: 'Hugo', icon: 'skull', color: 'gold' },
      { id: 'lea', seat: 1, name: 'Léa', icon: 'bird', color: 'ice' },
    ],
    rounds: [
      {
        number: 1,
        cardCount: 1,
        isKrakenPlayed: false,
        isWhiteWhaleDiscard: false,
        entries: ['hugo', 'lea'].map((playerId, seat) => ({
          playerId,
          bid: bids[seat] ?? null,
          bidAdjustment: 0,
          rascalBet: 0,
          isMissed: false,
          tricks: null,
          bonuses: NO_BONUS,
        })),
      },
    ],
    revision,
    readAt,
  };
}

const hugoBids = (bid: number): PendingEdit => ({
  edit: { kind: 'entry', roundNumber: 1, playerId: 'hugo', edit: { bid } },
});

const cacheOf = (server: GameView, pending: readonly PendingEdit[] = []): GameCache => ({
  server,
  pending,
});

const broadcastOf = (game: GameView) => JSON.stringify({ kind: 'game', game });

const bidsShown = (cache: GameCache | undefined) =>
  readShownGame(cache)?.rounds[0]?.entries.map((entry) => entry.bid);

// @FollowsBlueprint test-pure-unit
describe('receiveGame', () => {
  it('takes whatever arrives first', () => {
    const incoming = aGame(1, EARLIER);

    expect(receiveGame(undefined, incoming)).toStrictEqual({ server: incoming, pending: [] });
  });

  it('takes a view of a later revision, even one read earlier', () => {
    const incoming = aGame(3, EARLIER);

    expect(receiveGame(cacheOf(aGame(2, LATER)), incoming).server).toBe(incoming);
  });

  it('keeps the cached view when the incoming one is of an earlier revision, even read later', () => {
    const cache = cacheOf(aGame(3, EARLIER));

    expect(receiveGame(cache, aGame(2, LATER))).toBe(cache);
  });

  it('breaks a tie of revisions by the time each view was read', () => {
    const cache = cacheOf(aGame(2, LATER));
    const later = aGame(2, LATER);

    expect(receiveGame(cache, aGame(2, EARLIER))).toBe(cache);
    expect(receiveGame(cacheOf(aGame(2, EARLIER)), later).server).toBe(later);
    expect(receiveGame(cache, later).server).toBe(later);
  });
});

describe('receiveBroadcast', () => {
  it('writes each broadcast unless the cached view is newer, even while this phone has a write pending', () => {
    const pending = hugoBids(1);
    const cache = cacheOf(aGame(1, EARLIER), [pending]);
    const fromLea = aGame(2, LATER, [null, 0]);

    const received = receiveBroadcast(cache, broadcastOf(fromLea), 'BRIG');

    expect(received?.server).toStrictEqual(fromLea);
    expect(received?.pending).toStrictEqual([pending]);
    expect(bidsShown(received)).toEqual([1, 0]);
  });

  it('keeps the cached view when the broadcast left the server before it', () => {
    const cache = cacheOf(aGame(3, LATER));

    expect(receiveBroadcast(cache, broadcastOf(aGame(2, LATER, [1, 1])), 'BRIG')).toBe(cache);
  });

  it('ignores a broadcast of another game, and a message it cannot read', () => {
    const cache = cacheOf(aGame(1, EARLIER));
    const otherGame = { ...aGame(5, LATER), joinCode: 'KRAK' };

    expect(receiveBroadcast(cache, broadcastOf(otherGame), 'BRIG')).toBe(cache);
    expect(receiveBroadcast(cache, 'not json', 'BRIG')).toBe(cache);
    expect(receiveBroadcast(undefined, 'not json', 'BRIG')).toBeUndefined();
  });

  it('opens the cache with the first broadcast of the game', () => {
    const game = aGame(1, EARLIER);

    expect(receiveBroadcast(undefined, broadcastOf(game), 'BRIG')?.server).toStrictEqual(game);
  });
});

describe('the edits this phone has not heard back about', () => {
  it('shows each pending edit over the newest server view, in the order they were tapped', () => {
    const cache = cacheOf(aGame(1, EARLIER, [null, 0]), [hugoBids(2), hugoBids(1)]);

    expect(bidsShown(cache)).toEqual([1, 0]);
  });

  it('shows the server view alone once nothing is pending', () => {
    const server = aGame(1, EARLIER);

    expect(selectShownGame(cacheOf(server))).toBe(server);
    expect(readShownGame(undefined)).toBeUndefined();
  });

  it('adds an edit after the ones already pending, and drops exactly the one that settled', () => {
    const first = hugoBids(1);
    const second = hugoBids(2);
    const withFirst = addPendingEdit(cacheOf(aGame(1, EARLIER)), first);
    const withBoth = addPendingEdit(withFirst, second);

    expect(withBoth?.pending).toStrictEqual([first, second]);
    expect(dropPendingEdit(withBoth, first)?.pending).toStrictEqual([second]);
    expect(dropPendingEdit(withBoth, first)?.server).toBe(withBoth?.server);
  });

  it('drops a refused edit, so the screen goes back to what the server holds', () => {
    const refused = hugoBids(3);
    const cache = cacheOf(aGame(1, EARLIER, [1, 0]), [refused]);

    expect(bidsShown(cache)).toEqual([3, 0]);
    expect(bidsShown(dropPendingEdit(cache, refused))).toEqual([1, 0]);
  });

  it('records nothing before the game is loaded', () => {
    expect(addPendingEdit(undefined, hugoBids(1))).toBeUndefined();
    expect(dropPendingEdit(undefined, hugoBids(1))).toBeUndefined();
  });
});
