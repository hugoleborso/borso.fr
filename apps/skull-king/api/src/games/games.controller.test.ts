import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { NO_BONUS } from '@domain/scoring.core';
import { abortCommitsUpdatingColumn, truncateAllTables } from '../../../test/database-utils';
import {
  createAGame,
  entryOf,
  gameViewSchema,
  movePhase,
  readError,
  readGameEnvelope,
  reachRound,
  readGameView,
  request,
  seatId,
  TABLE_OF_FOUR,
  writeEntry,
} from '../../../test/game-utils';
import { useConnectionPoster } from '../realtime/connection-poster.setup';
import { buildSocketReply } from '../realtime/realtime.service';

const broadcastSchema = z.object({ kind: z.literal('game'), game: gameViewSchema });

const UNKNOWN_PLAYER_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

// @FollowsBlueprint test-back-e2e-whole-game
describe('a game of Skull King, end to end', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('creates a game in round one, bidding, with the players seated in order', async () => {
    const response = await request('POST', '/api/games', { players: TABLE_OF_FOUR });
    const game = await readGameEnvelope(response);

    expect(response.status).toBe(201);
    expect(game.joinCode).toMatch(/^[A-Z0-9]{4}$/u);
    expect(game.phase).toBe('bidding');
    expect(game.currentRound).toBe(1);
    expect(game.players.map((player) => [player.seat, player.name, player.icon])).toEqual([
      [0, 'Hugo', 'skull'],
      [1, 'Léa', 'parrot'],
      [2, 'Max', 'anchor'],
      [3, 'Inès', 'crown'],
    ]);
  });

  it('reads the view by its code in any case, with defaults for every unwritten cell', async () => {
    const created = await createAGame();
    const game = await readGameView(created.joinCode.toLowerCase());

    expect(game.rounds).toHaveLength(1);
    expect(game.rounds[0]?.cardCount).toBe(1);
    expect(game.rounds[0]?.isKrakenPlayed).toBe(false);
    expect(game.rounds[0]?.entries).toEqual(
      created.players.map((player) => ({
        playerId: player.id,
        bid: null,
        bidAdjustment: 0,
        rascalBet: 0,
        tricks: null,
        bonuses: NO_BONUS,
      })),
    );
  });

  it('refuses an unknown code', async () => {
    const response = await request('GET', '/api/games/ZZZZ');

    expect(response.status).toBe(404);
    expect(await readError(response)).toBe('game-not-found');
  });

  it('refuses a table of one, or of nine, with the out of range code', async () => {
    const [hugo] = TABLE_OF_FOUR;
    const alone = await request('POST', '/api/games', { players: [hugo] });
    const crowd = await request('POST', '/api/games', {
      players: Array.from({ length: 9 }, () => hugo),
    });

    expect(alone.status).toBe(400);
    expect(await readError(alone)).toBe('value-out-of-range');
    expect(await readError(crowd)).toBe('value-out-of-range');
  });

  it('keeps two writes to different cells of the same round', async () => {
    const created = await createAGame();
    await reachRound(created, 3, 'bidding');
    const hugo = seatId(created, 0);
    const lea = seatId(created, 1);

    await Promise.all([
      writeEntry(created.joinCode, 3, hugo, { bid: 2 }),
      writeEntry(created.joinCode, 3, lea, { bid: 1 }),
      writeEntry(created.joinCode, 3, hugo, { bonuses: { loot: 1 } }),
    ]);
    const game = await readGameView(created.joinCode);

    expect(entryOf(game, 3, hugo)).toEqual({
      playerId: hugo,
      bid: 2,
      bidAdjustment: 0,
      rascalBet: 0,
      tricks: null,
      bonuses: { ...NO_BONUS, loot: 1 },
    });
    expect(entryOf(game, 3, lea).bid).toBe(1);
  });

  it('answers each entry write with the fresh view, and clears a value written as null', async () => {
    const created = await createAGame();
    await reachRound(created, 2, 'bidding');
    const max = seatId(created, 2);

    const written = await readGameEnvelope(
      await writeEntry(created.joinCode, 2, max, {
        bid: 1,
        tricks: 2,
        bonuses: { standardFourteen: 3, skullKingByMermaid: 1 },
      }),
    );
    const cleared = await readGameEnvelope(
      await writeEntry(created.joinCode, 2, max, { tricks: null, bonuses: null }),
    );

    expect(entryOf(written, 2, max)).toEqual({
      playerId: max,
      bid: 1,
      bidAdjustment: 0,
      rascalBet: 0,
      tricks: 2,
      bonuses: { ...NO_BONUS, standardFourteen: 3, skullKingByMermaid: 1 },
    });
    expect(entryOf(cleared, 2, max)).toEqual({
      playerId: max,
      bid: 1,
      bidAdjustment: 0,
      rascalBet: 0,
      tricks: null,
      bonuses: NO_BONUS,
    });
  });

  it('corrects an entry of an earlier round', async () => {
    const created = await createAGame();
    await reachRound(created, 4, 'bidding');
    const ines = seatId(created, 3);

    const game = await readGameEnvelope(await writeEntry(created.joinCode, 1, ines, { bid: 0 }));

    expect(entryOf(game, 1, ines).bid).toBe(0);
  });

  it('refuses an entry for a round the table has not reached', async () => {
    const created = await createAGame();

    const response = await writeEntry(created.joinCode, 2, seatId(created, 0), { bid: 1 });

    expect(response.status).toBe(409);
    expect(await readError(response)).toBe('round-not-played');
  });

  it('refuses a bid or tricks above the cards dealt', async () => {
    const created = await createAGame();
    await reachRound(created, 2, 'bidding');

    const bid = await writeEntry(created.joinCode, 2, seatId(created, 0), { bid: 3 });
    const tricks = await writeEntry(created.joinCode, 2, seatId(created, 0), { tricks: 3 });
    const bonus = await writeEntry(created.joinCode, 2, seatId(created, 0), {
      bonuses: { blackFourteen: 2 },
    });

    expect(bid.status).toBe(400);
    expect(await readError(bid)).toBe('value-out-of-range');
    expect(await readError(tricks)).toBe('value-out-of-range');
    expect(await readError(bonus)).toBe('value-out-of-range');
  });

  it('refuses an entry for a player of another game', async () => {
    const created = await createAGame();

    const response = await writeEntry(created.joinCode, 1, UNKNOWN_PLAYER_ID, { bid: 1 });

    expect(response.status).toBe(404);
    expect(await readError(response)).toBe('player-not-found');
  });

  it('records the kraken for a played round, and refuses it for a later one', async () => {
    const created = await createAGame();

    const played = await readGameEnvelope(
      await request('PUT', `/api/games/${created.joinCode}/rounds/1`, { isKrakenPlayed: true }),
    );
    const later = await request('PUT', `/api/games/${created.joinCode}/rounds/2`, {
      isKrakenPlayed: true,
    });

    expect(played.rounds[0]?.isKrakenPlayed).toBe(true);
    expect(later.status).toBe(409);
    expect(await readError(later)).toBe('round-not-played');
  });

  it('moves the phase idempotently, so two phones pressing play land on the same state', async () => {
    const created = await createAGame();

    await reachRound(created, 1, 'scoring');

    const [first, second] = await Promise.all([
      movePhase(created.joinCode, 2, 'bidding'),
      movePhase(created.joinCode, 2, 'bidding'),
    ]);
    const game = await readGameView(created.joinCode);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(game.currentRound).toBe(2);
    expect(game.phase).toBe('bidding');
    expect(game.rounds.map((round) => round.number)).toEqual([1, 2]);
  });

  it('finishes the game after the last round, and refuses to finish it earlier', async () => {
    const created = await createAGame();

    await reachRound(created, 10, 'scoring');

    const early = await movePhase(created.joinCode, 9, 'finished');
    const finished = await readGameEnvelope(await movePhase(created.joinCode, 10, 'finished'));

    expect(early.status).toBe(400);
    expect(await readError(early)).toBe('value-out-of-range');
    expect(finished.phase).toBe('finished');
    expect(finished.rounds).toHaveLength(10);
  });

  it('refuses to score a round while a bid is missing', async () => {
    const created = await createAGame();
    await writeEntry(created.joinCode, 1, seatId(created, 0), { bid: 1 });

    const response = await movePhase(created.joinCode, 1, 'scoring');

    expect(response.status).toBe(409);
    expect(await readError(response)).toBe('bids-missing');
    expect((await readGameView(created.joinCode)).phase).toBe('bidding');
  });

  it('refuses the next round while the tricks do not balance, and lets the table go back', async () => {
    const created = await createAGame();
    for (const player of created.players) {
      await writeEntry(created.joinCode, 1, player.id, { bid: 0 });
    }
    await movePhase(created.joinCode, 1, 'scoring');

    const forward = await movePhase(created.joinCode, 2, 'bidding');
    const back = await movePhase(created.joinCode, 1, 'bidding');

    expect(forward.status).toBe(409);
    expect(await readError(forward)).toBe('tricks-unbalanced');
    expect(back.status).toBe(200);
  });

  it('expects one trick fewer for the kraken and for a white whale discard', async () => {
    const created = await createAGame();
    for (const player of created.players) {
      await writeEntry(created.joinCode, 1, player.id, { bid: 0 });
    }
    await movePhase(created.joinCode, 1, 'scoring');
    await request('PUT', `/api/games/${created.joinCode}/rounds/1`, { isKrakenPlayed: true });
    const second = await readGameEnvelope(await movePhase(created.joinCode, 2, 'bidding'));
    for (const player of second.players) {
      await writeEntry(created.joinCode, 2, player.id, { bid: player.seat === 0 ? 1 : 0 });
    }
    await movePhase(created.joinCode, 2, 'scoring');

    const unbalanced = await movePhase(created.joinCode, 3, 'bidding');
    const discarded = await readGameEnvelope(
      await request('PUT', `/api/games/${created.joinCode}/rounds/2`, {
        isWhiteWhaleDiscard: true,
      }),
    );
    const third = await movePhase(created.joinCode, 3, 'bidding');

    expect(await readError(unbalanced)).toBe('tricks-unbalanced');
    expect(discarded.rounds[1]).toMatchObject({ isKrakenPlayed: false, isWhiteWhaleDiscard: true });
    expect(discarded.rounds[0]).toMatchObject({ isKrakenPlayed: true, isWhiteWhaleDiscard: false });
    expect(third.status).toBe(200);
  });

  it('refuses to finish while a corrected earlier round no longer balances', async () => {
    const created = await createAGame();
    const lastRound = await reachRound(created, 10, 'scoring');
    await writeEntry(created.joinCode, 3, seatId(lastRound, 1), { tricks: 2 });

    const response = await movePhase(created.joinCode, 10, 'finished');

    expect(response.status).toBe(409);
    expect(await readError(response)).toBe('tricks-unbalanced');
  });

  it('refuses a round write that changes nothing', async () => {
    const created = await createAGame();

    const response = await request('PUT', `/api/games/${created.joinCode}/rounds/1`, {});

    expect(response.status).toBe(400);
    expect(await readError(response)).toBe('value-out-of-range');
  });

  it('moves a bid with Harry the Giant, for one player of the round only', async () => {
    const created = await createAGame();
    const hugo = seatId(created, 0);
    const lea = seatId(created, 1);
    for (const player of created.players) {
      await writeEntry(created.joinCode, 1, player.id, { bid: 0 });
    }
    await movePhase(created.joinCode, 1, 'scoring');

    const unbalanced = await movePhase(created.joinCode, 2, 'bidding');
    const moved = await readGameEnvelope(
      await writeEntry(created.joinCode, 1, hugo, { bidAdjustment: 1 }),
    );
    const second = await writeEntry(created.joinCode, 1, lea, { bidAdjustment: -1 });
    const balanced = await movePhase(created.joinCode, 2, 'bidding');
    const takenBack = await readGameEnvelope(
      await writeEntry(created.joinCode, 1, hugo, { bidAdjustment: null }),
    );

    expect(await readError(unbalanced)).toBe('tricks-unbalanced');
    expect(entryOf(moved, 1, hugo).bidAdjustment).toBe(1);
    expect(second.status).toBe(400);
    expect(await readError(second)).toBe('value-out-of-range');
    expect(balanced.status).toBe(200);
    expect(entryOf(takenBack, 1, hugo).bidAdjustment).toBe(0);
  });

  it('records one Rascal of Roatan bet per round, and refuses a second', async () => {
    const created = await createAGame();
    const hugo = seatId(created, 0);
    const lea = seatId(created, 1);

    const bet = await readGameEnvelope(
      await writeEntry(created.joinCode, 1, hugo, { bid: 1, rascalBet: 20 }),
    );
    const raised = await readGameEnvelope(
      await writeEntry(created.joinCode, 1, hugo, { rascalBet: 10 }),
    );
    const second = await writeEntry(created.joinCode, 1, lea, { rascalBet: 10 });
    const outOfRange = await writeEntry(created.joinCode, 1, lea, { rascalBet: 15 });
    const takenBack = await readGameEnvelope(
      await writeEntry(created.joinCode, 1, hugo, { rascalBet: null }),
    );
    const leaBets = await writeEntry(created.joinCode, 1, lea, { rascalBet: 20 });

    expect(entryOf(bet, 1, hugo)).toMatchObject({ bid: 1, rascalBet: 20 });
    expect(entryOf(raised, 1, hugo).rascalBet).toBe(10);
    expect(second.status).toBe(400);
    expect(await readError(second)).toBe('value-out-of-range');
    expect(await readError(outOfRange)).toBe('value-out-of-range');
    expect(entryOf(takenBack, 1, hugo).rascalBet).toBe(0);
    expect(leaBets.status).toBe(200);
  });

  it('changes a player’s name and mark', async () => {
    const created = await createAGame();
    const lea = seatId(created, 1);

    const game = await readGameEnvelope(
      await request('PATCH', `/api/games/${created.joinCode}/players/${lea}`, {
        name: ' Léane ',
        color: 'sky',
      }),
    );

    expect(game.players[1]).toEqual({
      id: lea,
      seat: 1,
      name: 'Léane',
      icon: 'parrot',
      color: 'sky',
      accountId: null,
    });
  });

  it('refuses to change a player who is not at the table', async () => {
    const created = await createAGame();

    const response = await request(
      'PATCH',
      `/api/games/${created.joinCode}/players/${UNKNOWN_PLAYER_ID}`,
      { name: 'Ghost' },
    );

    expect(response.status).toBe(404);
    expect(await readError(response)).toBe('player-not-found');
  });

  it('starts a rematch with the same players and marks, once however many phones ask', async () => {
    const created = await createAGame();
    await reachRound(created, 10, 'finished');

    const response = await request('POST', `/api/games/${created.joinCode}/rematch`);
    const rematch = await readGameEnvelope(response);
    const again = await readGameEnvelope(
      await request('POST', `/api/games/${created.joinCode}/rematch`),
    );

    expect(response.status).toBe(201);
    expect(rematch.joinCode).not.toBe(created.joinCode);
    expect(rematch.phase).toBe('bidding');
    expect(rematch.currentRound).toBe(1);
    expect(
      rematch.players.map(({ seat, name, icon, color }) => ({ seat, name, icon, color })),
    ).toEqual(created.players.map(({ seat, name, icon, color }) => ({ seat, name, icon, color })));
    expect(again.joinCode).toBe(rematch.joinCode);
    expect(rematch.rematchJoinCode).toBeNull();
    const finished = await readGameView(created.joinCode);
    expect(finished.phase).toBe('finished');
    expect(finished.rematchJoinCode).toBe(rematch.joinCode);
  });

  it('records the rematch when the database aborts its first commit, rather than failing', async () => {
    const created = await createAGame();
    const conflict = await abortCommitsUpdatingColumn('game', 'rematch_join_code', 1);

    try {
      const response = await request('POST', `/api/games/${created.joinCode}/rematch`);
      const rematch = await readGameEnvelope(response);

      expect(await conflict.countCommitsSeen()).toBe(2);
      expect(response.status).toBe(201);
      expect((await readGameView(created.joinCode)).rematchJoinCode).toBe(rematch.joinCode);
    } finally {
      await conflict.remove();
    }
  });
});

describe('the live channel', () => {
  const delivered: { readonly connectionId: string; readonly data: string }[] = [];

  beforeEach(async () => {
    await truncateAllTables();
    delivered.length = 0;
    useConnectionPoster({
      postToConnection: ({ ConnectionId, Data }) => {
        delivered.push({ connectionId: ConnectionId, data: Data });
        return Promise.resolve(undefined);
      },
    });
  });

  afterEach(() => {
    useConnectionPoster({ postToConnection: () => Promise.resolve(undefined) });
  });

  it('opens a connection for a game that exists and refuses an unknown code', async () => {
    const created = await createAGame();

    const opened = await buildSocketReply({
      requestContext: { connectionId: 'phone-1', routeKey: '$connect' },
      queryStringParameters: { code: created.joinCode.toLowerCase() },
    });
    const refused = await buildSocketReply({
      requestContext: { connectionId: 'phone-2', routeKey: '$connect' },
      queryStringParameters: { code: 'ZZZZ' },
    });

    expect(opened.statusCode).toBe(200);
    expect(refused.statusCode).toBe(400);
  });

  it('pushes the view a write answers to every connection of that game', async () => {
    const created = await createAGame();
    for (const connectionId of ['phone-1', 'phone-2']) {
      await buildSocketReply({
        requestContext: { connectionId, routeKey: '$connect' },
        queryStringParameters: { code: created.joinCode },
      });
    }

    const answered = await readGameEnvelope(
      await writeEntry(created.joinCode, 1, seatId(created, 0), { bid: 1 }),
    );

    expect(delivered.map((delivery) => delivery.connectionId).toSorted()).toEqual([
      'phone-1',
      'phone-2',
    ]);
    for (const delivery of delivered) {
      const message: unknown = JSON.parse(delivery.data);
      expect(message).toEqual({ kind: 'game', game: gameViewSchema.parse(answered) });
    }
  });

  it('tells the phones of a finished game where its rematch is', async () => {
    const created = await createAGame();
    await reachRound(created, 10, 'finished');
    await buildSocketReply({
      requestContext: { connectionId: 'phone-1', routeKey: '$connect' },
      queryStringParameters: { code: created.joinCode },
    });

    const rematch = await readGameEnvelope(
      await request('POST', `/api/games/${created.joinCode}/rematch`),
    );

    const pushed = delivered.map((delivery) => {
      const message: unknown = JSON.parse(delivery.data);
      return broadcastSchema.parse(message).game;
    });
    expect(pushed).toHaveLength(1);
    expect(pushed[0]?.joinCode).toBe(created.joinCode);
    expect(pushed[0]?.rematchJoinCode).toBe(rematch.joinCode);
  });
});
