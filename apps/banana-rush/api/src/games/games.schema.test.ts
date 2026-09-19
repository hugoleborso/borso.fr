import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  createGameSchema,
  gameTable,
  joinCodeParamSchema,
  joinGameSchema,
  outcomesSchema,
  playerTable,
  roundResultTable,
} from './games.schema';

const validCreate = {
  nickname: 'Hugo',
  avatar: 'chimp',
  maxPlayers: 4,
  winningScore: 200,
  roundTimerSeconds: 60,
};

// @FollowsBlueprint test-pure-unit
describe('createGameSchema', () => {
  it('accepts a complete setup', () => {
    expect(createGameSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('defaults a game with no timer chosen to no timer at all', () => {
    const { roundTimerSeconds, ...withoutTimer } = validCreate;
    expect(createGameSchema.parse(withoutTimer).roundTimerSeconds).toBeNull();
    expect(roundTimerSeconds).toBe(60);
  });

  it('accepts every winning score the game offers', () => {
    for (const winningScore of [100, 200, 500]) {
      expect(createGameSchema.parse({ ...validCreate, winningScore }).winningScore).toBe(
        winningScore,
      );
    }
  });

  it('accepts the thirty second timer', () => {
    expect(
      createGameSchema.parse({ ...validCreate, roundTimerSeconds: 30 }).roundTimerSeconds,
    ).toBe(30);
  });

  it('trims the nickname a player typed with spaces', () => {
    expect(createGameSchema.parse({ ...validCreate, nickname: '  Hugo  ' }).nickname).toBe('Hugo');
  });

  it('refuses an empty nickname', () => {
    expect(createGameSchema.safeParse({ ...validCreate, nickname: '   ' }).success).toBe(false);
  });

  it('refuses a nickname longer than the board can show', () => {
    expect(createGameSchema.safeParse({ ...validCreate, nickname: 'a'.repeat(17) }).success).toBe(
      false,
    );
  });

  it('refuses a monkey the game does not ship', () => {
    expect(createGameSchema.safeParse({ ...validCreate, avatar: 'banana' }).success).toBe(false);
  });

  it('refuses a table smaller than two seats', () => {
    expect(createGameSchema.safeParse({ ...validCreate, maxPlayers: 1 }).success).toBe(false);
  });

  it('refuses a table larger than eight seats', () => {
    expect(createGameSchema.safeParse({ ...validCreate, maxPlayers: 9 }).success).toBe(false);
  });

  it('refuses a winning score that is not on the list', () => {
    expect(createGameSchema.safeParse({ ...validCreate, winningScore: 250 }).success).toBe(false);
  });

  it('refuses a timer that is not on the list', () => {
    expect(createGameSchema.safeParse({ ...validCreate, roundTimerSeconds: 45 }).success).toBe(
      false,
    );
  });

  it('refuses a field the game does not know', () => {
    expect(createGameSchema.safeParse({ ...validCreate, cheat: true }).success).toBe(false);
  });
});

describe('joinGameSchema', () => {
  it('accepts a nickname and a monkey', () => {
    expect(joinGameSchema.parse({ nickname: 'Zoe', avatar: 'lemur' })).toEqual({
      nickname: 'Zoe',
      avatar: 'lemur',
    });
  });

  it('refuses anything else in the body', () => {
    expect(
      joinGameSchema.safeParse({ nickname: 'Zoe', avatar: 'lemur', stashBananas: 9_000 }).success,
    ).toBe(false);
  });
});

describe('joinCodeParamSchema', () => {
  it('accepts a four character code', () => {
    expect(joinCodeParamSchema.parse({ code: 'ABCD' }).code).toBe('ABCD');
  });

  it('refuses a code of the wrong length', () => {
    expect(joinCodeParamSchema.safeParse({ code: 'ABC' }).success).toBe(false);
  });
});

describe('outcomesSchema', () => {
  const outcome = {
    playerId: '11111111-1111-4111-8111-111111111111',
    bid: 30,
    stashBefore: 10,
    stashAfter: 15,
    crateWon: 10,
    tariffPaid: 5,
    tariffReceived: 0,
    busted: false,
  };

  it('accepts a stored round the API wrote itself', () => {
    expect(outcomesSchema.parse([outcome])).toEqual([outcome]);
  });

  it('refuses a stored round missing a field', () => {
    const { busted, ...incomplete } = outcome;
    expect(outcomesSchema.safeParse([incomplete]).success).toBe(false);
    expect(busted).toBe(false);
  });
});

describe('the tables the game stores', () => {
  it('names one row per game, keyed by its own identifier', () => {
    const config = getTableConfig(gameTable);
    expect(config.name).toBe('game');
    expect(config.columns.map((column) => column.name)).toContain('join_code');
  });

  it('names one row per player', () => {
    expect(getTableConfig(playerTable).name).toBe('player');
  });

  it('keys a resolved round on the game and the round number together', () => {
    const config = getTableConfig(roundResultTable);
    const [primaryKey] = config.primaryKeys;
    expect(config.name).toBe('round_result');
    expect(primaryKey?.columns.map((column) => column.name)).toEqual(['game_id', 'round_number']);
  });
});
