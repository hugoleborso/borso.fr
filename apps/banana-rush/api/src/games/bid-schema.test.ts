// @FollowsBlueprint test-pure-unit
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { MAXIMUM_BID_BANANAS, MINIMUM_BID_BANANAS } from '@domain/bid.core';
import { bidTable, placeBidSchema } from './games.schema';

describe('placeBidSchema', () => {
  it('accepts the smallest bid the game allows', () => {
    expect(placeBidSchema.parse({ amount: MINIMUM_BID_BANANAS }).amount).toBe(MINIMUM_BID_BANANAS);
  });

  it('accepts the largest bid the game allows', () => {
    expect(placeBidSchema.parse({ amount: MAXIMUM_BID_BANANAS }).amount).toBe(MAXIMUM_BID_BANANAS);
  });

  it('refuses a bid below the minimum', () => {
    expect(placeBidSchema.safeParse({ amount: MINIMUM_BID_BANANAS - 1 }).success).toBe(false);
  });

  it('refuses a bid above the maximum', () => {
    expect(placeBidSchema.safeParse({ amount: MAXIMUM_BID_BANANAS + 1 }).success).toBe(false);
  });

  it('refuses a bid that is not a whole number', () => {
    expect(placeBidSchema.safeParse({ amount: 4.5 }).success).toBe(false);
  });

  it('refuses anything else in the body', () => {
    expect(placeBidSchema.safeParse({ amount: 5, playerId: 'someone-else' }).success).toBe(false);
  });
});

describe('the table the secret bids land in', () => {
  it('keys a bid on the game, the player and the round together', () => {
    const config = getTableConfig(bidTable);
    const [primaryKey] = config.primaryKeys;
    expect(config.name).toBe('bid');
    expect(primaryKey?.columns.map((column) => column.name)).toEqual([
      'game_id',
      'player_id',
      'round_number',
    ]);
  });
});
