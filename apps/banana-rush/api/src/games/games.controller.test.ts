import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import {
  askForARematch,
  bid,
  claimMySeat,
  type GameSnapshot,
  hostAGame,
  joinTheGame,
  readError,
  readGameView,
  readRounds,
  request,
  type SeatedSnapshot,
  startTheGame,
  stashOf,
} from '../../../test/game-utils';

/**
 * @Blueprint test-back-e2e-whole-game
 * @BlueprintName Back End End To End Test Of A Whole Game
 * @BlueprintUsage Use for a controller whose routes only make sense in sequence, where asserting one route at a time would prove nothing about the rules.
 * @BlueprintDescription Truncates the tables before each case and drives the real application through its own HTTP routes, in the order a player would, so the assertions are about the game rather than about a handler. Every response is read through the Zod envelope in the fixtures, so a changed shape fails here rather than reaching a case untyped. The refusals get one case each and assert the code the interface will translate, not a sentence, which is what keeps the API free of a language.
 */
describe('a game of Banana Rush, end to end', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('seats the host in a lobby holding a four letter code', async () => {
    const seated = await hostAGame();

    expect(seated.game.joinCode).toHaveLength(4);
    expect(seated.game.status).toBe('lobby');
    expect(seated.game.players).toHaveLength(1);
    expect(seated.game.players[0]?.isHost).toBe(true);
    expect(seated.game.players[0]?.stashBananas).toBe(10);
    expect(seated.game.crateBananas).toBe(10);
    expect(seated.game.freeSeats).toBe(3);
    expect(seated.playerToken).not.toBe('');
  });

  it('seats a second player who arrives with the code', async () => {
    const host = await hostAGame();
    const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');

    expect(guest.game.players).toHaveLength(2);
    expect(guest.game.freeSeats).toBe(2);
    expect(guest.playerId).not.toBe(host.playerId);
  });

  it('accepts the code typed in lower case', async () => {
    const host = await hostAGame();
    const guest = await joinTheGame(host.game.joinCode.toLowerCase(), 'Zoe', 'lemur');

    expect(guest.game.players).toHaveLength(2);
  });

  it('plays the round the rules were explained with, and lands on 15 and 15', async () => {
    const host = await hostAGame();
    const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);

    await bid(host.game.joinCode, host.playerToken, 30);
    const resolved = await bid(host.game.joinCode, guest.playerToken, 25);

    expect(stashOf(resolved, host.playerId)).toBe(15);
    expect(stashOf(resolved, guest.playerId)).toBe(15);
    expect(resolved.crateBananas).toBe(15);
    expect(resolved.currentRound).toBe(2);
    expect(resolved.lastRound?.outcomes).toHaveLength(2);
  });

  it('busts the highest bidder and cascades, landing on 0, 18 and 12', async () => {
    const host = await hostAGame();
    const second = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    const third = await joinTheGame(host.game.joinCode, 'Sam', 'gibbon');
    await startTheGame(host.game.joinCode, host.playerToken);

    await bid(host.game.joinCode, host.playerToken, 90);
    await bid(host.game.joinCode, second.playerToken, 10);
    const resolved = await bid(host.game.joinCode, third.playerToken, 8);

    expect(stashOf(resolved, host.playerId)).toBe(0);
    expect(stashOf(resolved, second.playerId)).toBe(18);
    expect(stashOf(resolved, third.playerId)).toBe(12);
    expect(resolved.crateBananas).toBe(18);
    expect(resolved.lastRound?.outcomes.find((outcome) => outcome.busted)?.playerId).toBe(
      host.playerId,
    );
  });

  it('keeps a bid secret from the other players until the round resolves', async () => {
    const host = await hostAGame();
    const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);
    await bid(host.game.joinCode, host.playerToken, 30);

    const asGuest = await readGameView(host.game.joinCode, guest.playerToken);
    const asHost = await readGameView(host.game.joinCode, host.playerToken);

    expect(asGuest.players.find((player) => player.id === host.playerId)?.hasBid).toBe(true);
    expect(asGuest.viewerBid).toBeNull();
    expect(asGuest.players.every((player) => !Object.hasOwn(player, 'bid'))).toBe(true);
    expect(asHost.viewerBid).toBe(30);
  });

  it('ends the game when a player reaches the winning score', async () => {
    const host = await hostAGame({ winningScore: 100, maxPlayers: 2 });
    const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);

    let latest = host.game;
    for (let round = 0; round < 12; round += 1) {
      await bid(host.game.joinCode, host.playerToken, 2);
      latest = await bid(host.game.joinCode, guest.playerToken, 1);
      if (latest.status === 'finished') break;
    }

    expect(latest.status).toBe('finished');
    expect(latest.winnerIds).toEqual([host.playerId]);
  });
});

describe('the refusals a player can hit', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('refuses a code that matches no game', async () => {
    const response = await request('GET', '/api/games/ZZZZ');

    expect(response.status).toBe(404);
    expect(await readError(response)).toBe('game-not-found');
  });

  it('refuses a player arriving at a full table', async () => {
    const host = await hostAGame({ maxPlayers: 2 });
    await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');

    const response = await request('POST', `/api/games/${host.game.joinCode}/players`, {
      body: { nickname: 'Sam', avatar: 'gibbon' },
    });

    expect(response.status).toBe(409);
    expect(await readError(response)).toBe('game-full');
  });

  it('refuses a monkey somebody already picked', async () => {
    const host = await hostAGame();

    const response = await request('POST', `/api/games/${host.game.joinCode}/players`, {
      body: { nickname: 'Zoe', avatar: 'chimp' },
    });

    expect(await readError(response)).toBe('avatar-taken');
  });

  it('refuses a player arriving after the game started', async () => {
    const host = await hostAGame();
    await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);

    const response = await request('POST', `/api/games/${host.game.joinCode}/players`, {
      body: { nickname: 'Sam', avatar: 'gibbon' },
    });

    expect(await readError(response)).toBe('already-started');
  });

  it('refuses a start from anybody but the host', async () => {
    const host = await hostAGame();
    const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');

    const response = await request('POST', `/api/games/${host.game.joinCode}/start`, {
      token: guest.playerToken,
    });

    expect(response.status).toBe(403);
    expect(await readError(response)).toBe('not-host');
  });

  it('refuses a start with nobody else at the table', async () => {
    const host = await hostAGame();

    const response = await request('POST', `/api/games/${host.game.joinCode}/start`, {
      token: host.playerToken,
    });

    expect(await readError(response)).toBe('not-enough-players');
  });

  it('refuses a start from somebody holding no token at all', async () => {
    const host = await hostAGame();

    const response = await request('POST', `/api/games/${host.game.joinCode}/start`);

    expect(response.status).toBe(401);
    expect(await readError(response)).toBe('not-a-player');
  });

  it('refuses a second bid in the same round', async () => {
    const host = await hostAGame();
    await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);
    await bid(host.game.joinCode, host.playerToken, 5);

    const response = await request('POST', `/api/games/${host.game.joinCode}/bids`, {
      token: host.playerToken,
      body: { amount: 7 },
    });

    expect(await readError(response)).toBe('already-bid');
  });

  it('refuses a bid while the game is still in the lobby', async () => {
    const host = await hostAGame();

    const response = await request('POST', `/api/games/${host.game.joinCode}/bids`, {
      token: host.playerToken,
      body: { amount: 5 },
    });

    expect(await readError(response)).toBe('not-playing');
  });

  it('refuses a bid above the maximum before it reaches the game', async () => {
    const host = await hostAGame();
    await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);

    const response = await request('POST', `/api/games/${host.game.joinCode}/bids`, {
      token: host.playerToken,
      body: { amount: 1_000 },
    });

    expect(response.status).toBe(400);
  });

  it('refuses to resolve a round whose timer has not run out', async () => {
    const host = await hostAGame({ roundTimerSeconds: 60 });
    await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);

    const response = await request('POST', `/api/games/${host.game.joinCode}/resolve`, {
      token: host.playerToken,
    });

    expect(await readError(response)).toBe('round-still-open');
  });
});

async function playUntilSomebodyWins(
  host: SeatedSnapshot,
  guest: SeatedSnapshot,
): Promise<GameSnapshot> {
  let latest = host.game;
  for (let round = 0; round < 12; round += 1) {
    await bid(host.game.joinCode, host.playerToken, 2);
    latest = await bid(host.game.joinCode, guest.playerToken, 1);
    if (latest.status === 'finished') break;
  }
  return latest;
}

describe('reading a finished game round by round', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('tells nothing about a game where no round has resolved', async () => {
    const host = await hostAGame();

    expect(await readRounds(host.game.joinCode)).toEqual([]);
  });

  it('tells every round that was played, oldest first', async () => {
    const host = await hostAGame({ winningScore: 100, maxPlayers: 2 });
    const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);
    const finished = await playUntilSomebodyWins(host, guest);

    const rounds = await readRounds(host.game.joinCode);

    expect(finished.status).toBe('finished');
    expect(rounds.map((round) => round.roundNumber)).toEqual(
      rounds.map((round, index) => index + 1),
    );
    expect(rounds).toHaveLength(finished.currentRound - 1);
  });

  it('tells what each player bid in each round and what it did to their stash', async () => {
    const host = await hostAGame({ winningScore: 100, maxPlayers: 2 });
    const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
    await startTheGame(host.game.joinCode, host.playerToken);
    await playUntilSomebodyWins(host, guest);

    const [firstRound] = await readRounds(host.game.joinCode);

    expect(firstRound?.crateBefore).toBe(10);
    expect(firstRound?.outcomes.map((outcome) => [outcome.playerId, outcome.bid])).toEqual([
      [host.playerId, 2],
      [guest.playerId, 1],
    ]);
    expect(
      firstRound?.outcomes.find((outcome) => outcome.playerId === host.playerId),
    ).toMatchObject({ stashBefore: 10, crateWon: 10, tariffPaid: 1, stashAfter: 19 });
  });

  it('refuses a code that matches no game', async () => {
    const response = await request('GET', '/api/games/ZZZZ/rounds');

    expect(response.status).toBe(404);
    expect(await readError(response)).toBe('game-not-found');
  });
});

async function reachTheEnd(): Promise<{
  host: SeatedSnapshot;
  guest: SeatedSnapshot;
  finished: GameSnapshot;
}> {
  const host = await hostAGame({ winningScore: 100, maxPlayers: 2 });
  const guest = await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');
  await startTheGame(host.game.joinCode, host.playerToken);
  const finished = await playUntilSomebodyWins(host, guest);
  return { host, guest, finished };
}

describe('playing again with the same group', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('announces a new table on the finished game rather than resetting it', async () => {
    const { host, finished } = await reachTheEnd();

    const announced = await askForARematch(host.game.joinCode, host.playerToken);

    expect(announced.status).toBe('finished');
    expect(announced.rematchJoinCode).not.toBeNull();
    expect(announced.rematchJoinCode).not.toBe(host.game.joinCode);
    expect(await readRounds(host.game.joinCode)).toHaveLength(finished.currentRound - 1);
  });

  it('seats the same group again, with the opening stash and nobody playing yet', async () => {
    const { host } = await reachTheEnd();

    const announced = await askForARematch(host.game.joinCode, host.playerToken);
    const rematch = await readGameView(announced.rematchJoinCode ?? '');

    expect(rematch.status).toBe('lobby');
    expect(rematch.maxPlayers).toBe(2);
    expect(rematch.winningScore).toBe(100);
    expect(rematch.players.map((player) => [player.nickname, player.avatar])).toEqual([
      ['Hugo', 'chimp'],
      ['Zoe', 'lemur'],
    ]);
    expect(rematch.players.map((player) => player.stashBananas)).toEqual([10, 10]);
    expect(rematch.players.map((player) => player.isHost)).toEqual([true, false]);
  });

  it('answers the same table to a host who taps twice', async () => {
    const { host } = await reachTheEnd();

    const first = await askForARematch(host.game.joinCode, host.playerToken);
    const second = await askForARematch(host.game.joinCode, host.playerToken);

    expect(second.rematchJoinCode).toBe(first.rematchJoinCode);
  });

  it('hands each phone its own seat, in exchange for the token it already held', async () => {
    const { host, guest } = await reachTheEnd();
    await askForARematch(host.game.joinCode, host.playerToken);

    const hostSeat = await claimMySeat(host.game.joinCode, host.playerToken);
    const guestSeat = await claimMySeat(host.game.joinCode, guest.playerToken);

    expect(hostSeat.playerId).not.toBe(guestSeat.playerId);
    expect(hostSeat.playerToken).not.toBe(guestSeat.playerToken);
    expect(hostSeat.playerToken).not.toBe(host.playerToken);
    expect(hostSeat.game.viewerId).toBe(hostSeat.playerId);
    expect(hostSeat.game.players.find((player) => player.id === hostSeat.playerId)?.avatar).toBe(
      'chimp',
    );
    expect(guestSeat.game.players.find((player) => player.id === guestSeat.playerId)?.avatar).toBe(
      'lemur',
    );
  });

  it('never puts anybody token in what every phone receives', async () => {
    const { host } = await reachTheEnd();

    const announced = await askForARematch(host.game.joinCode, host.playerToken);
    const rematch = await readGameView(announced.rematchJoinCode ?? '');

    expect(JSON.stringify(announced)).not.toContain(host.playerToken);
    expect(rematch.players.every((player) => !Object.hasOwn(player, 'playerToken'))).toBe(true);
  });

  it('lets the group play the rematch through', async () => {
    const { host, guest } = await reachTheEnd();
    const announced = await askForARematch(host.game.joinCode, host.playerToken);
    const hostSeat = await claimMySeat(host.game.joinCode, host.playerToken);
    const guestSeat = await claimMySeat(host.game.joinCode, guest.playerToken);
    const rematchCode = announced.rematchJoinCode ?? '';

    await startTheGame(rematchCode, hostSeat.playerToken);
    await bid(rematchCode, hostSeat.playerToken, 4);
    const afterARound = await bid(rematchCode, guestSeat.playerToken, 1);

    expect(afterARound.status).toBe('playing');
    expect(afterARound.lastRound?.roundNumber).toBe(1);
    expect(stashOf(afterARound, hostSeat.playerId)).toBe(17);
  });

  it('refuses a rematch of a game that is not over', async () => {
    const host = await hostAGame();
    await joinTheGame(host.game.joinCode, 'Zoe', 'lemur');

    const response = await request('POST', `/api/games/${host.game.joinCode}/rematch`, {
      token: host.playerToken,
    });

    expect(response.status).toBe(409);
    expect(await readError(response)).toBe('not-finished');
  });

  it('refuses a rematch asked for by anybody but the host', async () => {
    const { host, guest } = await reachTheEnd();

    const response = await request('POST', `/api/games/${host.game.joinCode}/rematch`, {
      token: guest.playerToken,
    });

    expect(response.status).toBe(403);
    expect(await readError(response)).toBe('not-host');
  });

  it('refuses a seat claim while no rematch has been announced', async () => {
    const { host } = await reachTheEnd();

    const response = await request('POST', `/api/games/${host.game.joinCode}/seat`, {
      token: host.playerToken,
    });

    expect(response.status).toBe(409);
    expect(await readError(response)).toBe('no-rematch');
  });

  it('refuses a seat claim from somebody who never sat at the finished table', async () => {
    const { host } = await reachTheEnd();
    await askForARematch(host.game.joinCode, host.playerToken);

    const response = await request('POST', `/api/games/${host.game.joinCode}/seat`, {
      token: 'a-token-nobody-was-given',
    });

    expect(response.status).toBe(401);
    expect(await readError(response)).toBe('not-a-player');
  });
});
