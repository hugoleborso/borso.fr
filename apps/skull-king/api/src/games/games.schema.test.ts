import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { MAXIMUM_PLAYERS, ROUND_COUNT } from '@domain/round.core';
import { BONUS_KINDS, MAXIMUM_BONUS_COUNT } from '@domain/scoring.core';
import {
  accountGameTable,
  createGameSchema,
  entryParamSchema,
  joinCodeClaimTable,
  movePhaseSchema,
  playerParamSchema,
  roundEntryTable,
  roundParamSchema,
  roundTable,
  updatePlayerSchema,
  writeEntrySchema,
  writeRoundSchema,
} from './games.schema';

const PLAYER_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const HUGO = { name: 'Hugo', icon: 'skull', color: 'gold' };

function primaryKeyColumns(config: ReturnType<typeof getTableConfig>): readonly string[] {
  const declared = config.primaryKeys.flatMap((key) => key.columns.map((column) => column.name));
  const inline = config.columns.filter((column) => column.primary).map((column) => column.name);
  return [...inline, ...declared];
}

// @FollowsBlueprint test-pure-unit
describe('the tables', () => {
  it('makes a join code unique by keying its claim on the code', () => {
    expect(primaryKeyColumns(getTableConfig(joinCodeClaimTable))).toEqual(['join_code']);
  });

  it('keys a round on the game and its number', () => {
    expect(primaryKeyColumns(getTableConfig(roundTable))).toEqual(['game_id', 'round_number']);
  });

  it('keys an entry on the game, the round and the player, with one column per bonus kind', () => {
    const config = getTableConfig(roundEntryTable);
    expect(primaryKeyColumns(config)).toEqual(['game_id', 'round_number', 'player_id']);
    expect(config.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'standard_fourteen',
        'black_fourteen',
        'mermaid_by_pirate',
        'pirate_by_skull_king',
        'skull_king_by_mermaid',
        'loot',
      ]),
    );
  });
});

describe('the account tables of a game', () => {
  it('keys a game opened by an account on both, so reopening it moves it up the list', () => {
    expect(primaryKeyColumns(getTableConfig(accountGameTable))).toEqual(['account_id', 'game_id']);
  });
});

describe('createGameSchema', () => {
  it('accepts three players and trims their names', () => {
    const table = createGameSchema.parse({
      players: [HUGO, { ...HUGO, name: '  Léa ' }, HUGO],
    });
    expect(table.players[1]?.name).toBe('Léa');
  });

  it('refuses one player, too many players, an empty name and an unknown mark', () => {
    expect(createGameSchema.safeParse({ players: [HUGO, HUGO] }).success).toBe(false);
    const crowd = Array.from({ length: MAXIMUM_PLAYERS + 1 }, () => HUGO);
    expect(createGameSchema.safeParse({ players: crowd }).success).toBe(false);
    expect(createGameSchema.safeParse({ players: [HUGO, { ...HUGO, name: ' ' }] }).success).toBe(
      false,
    );
    expect(createGameSchema.safeParse({ players: [HUGO, { ...HUGO, icon: 'cat' }] }).success).toBe(
      false,
    );
  });
});

describe('updatePlayerSchema', () => {
  it('accepts any one change', () => {
    expect(updatePlayerSchema.parse({ color: 'sky' })).toEqual({ color: 'sky' });
  });

  it('refuses a body that changes nothing', () => {
    expect(updatePlayerSchema.safeParse({}).success).toBe(false);
  });
});

describe('writeEntrySchema', () => {
  it('accepts each field on its own, and null to clear it', () => {
    expect(writeEntrySchema.parse({ bid: 0 })).toEqual({ bid: 0 });
    expect(writeEntrySchema.parse({ tricks: null, bonuses: null })).toEqual({
      tricks: null,
      bonuses: null,
    });
  });

  it('takes an adjustment of one either way, and null to take it back', () => {
    expect(writeEntrySchema.parse({ bidAdjustment: -1 })).toEqual({ bidAdjustment: -1 });
    expect(writeEntrySchema.parse({ bidAdjustment: null })).toEqual({ bidAdjustment: null });
    expect(writeEntrySchema.safeParse({ bidAdjustment: 2 }).success).toBe(false);
  });

  it('takes a Rascal bet of 0, 10 or 20, and null to take it back', () => {
    expect(writeEntrySchema.parse({ rascalBet: 20 })).toEqual({ rascalBet: 20 });
    expect(writeEntrySchema.parse({ rascalBet: null })).toEqual({ rascalBet: null });
    expect(writeEntrySchema.safeParse({ rascalBet: 15 }).success).toBe(false);
  });

  it('refuses a negative count and a count above the last round', () => {
    expect(writeEntrySchema.safeParse({ bid: -1 }).success).toBe(false);
    expect(writeEntrySchema.safeParse({ tricks: ROUND_COUNT + 1 }).success).toBe(false);
  });

  it('bounds every bonus kind by its own maximum', () => {
    for (const kind of BONUS_KINDS) {
      const maximum = MAXIMUM_BONUS_COUNT[kind];
      expect(writeEntrySchema.safeParse({ bonuses: { [kind]: maximum } }).success).toBe(true);
      expect(writeEntrySchema.safeParse({ bonuses: { [kind]: maximum + 1 } }).success).toBe(false);
    }
  });
});

describe('writeRoundSchema', () => {
  it('takes the kraken and the white whale discard, each on its own', () => {
    expect(writeRoundSchema.parse({ isKrakenPlayed: true })).toEqual({ isKrakenPlayed: true });
    expect(writeRoundSchema.parse({ isWhiteWhaleDiscard: false })).toEqual({
      isWhiteWhaleDiscard: false,
    });
  });

  it('refuses a round write that changes nothing', () => {
    expect(writeRoundSchema.safeParse({}).success).toBe(false);
  });
});

describe('movePhaseSchema', () => {
  it('accepts any round in play with bidding or scoring', () => {
    expect(movePhaseSchema.parse({ round: 1, phase: 'scoring' })).toEqual({
      round: 1,
      phase: 'scoring',
    });
  });

  it('finishes the game only after the last round', () => {
    expect(movePhaseSchema.safeParse({ round: ROUND_COUNT, phase: 'finished' }).success).toBe(true);
    expect(movePhaseSchema.safeParse({ round: ROUND_COUNT - 1, phase: 'finished' }).success).toBe(
      false,
    );
  });

  it('refuses a round outside the game', () => {
    expect(movePhaseSchema.safeParse({ round: 0, phase: 'bidding' }).success).toBe(false);
    expect(movePhaseSchema.safeParse({ round: ROUND_COUNT + 1, phase: 'bidding' }).success).toBe(
      false,
    );
  });
});

describe('the address parameters', () => {
  it('reads the code as typed and the round as a number', () => {
    expect(roundParamSchema.parse({ code: 'brig', round: '3' })).toEqual({
      code: 'BRIG',
      round: 3,
    });
  });

  it('refuses a round that is not a whole number in the game', () => {
    expect(roundParamSchema.safeParse({ code: 'BRIG', round: '0' }).success).toBe(false);
    expect(roundParamSchema.safeParse({ code: 'BRIG', round: '1.5' }).success).toBe(false);
    expect(roundParamSchema.safeParse({ code: 'BRIG', round: '11' }).success).toBe(false);
  });

  it('reads a player id only when it is an identifier', () => {
    expect(entryParamSchema.parse({ code: 'BRIG', round: '1', playerId: PLAYER_ID }).playerId).toBe(
      PLAYER_ID,
    );
    expect(playerParamSchema.safeParse({ code: 'BRIG', playerId: 'hugo' }).success).toBe(false);
  });
});
