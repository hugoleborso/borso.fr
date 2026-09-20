import { describe, expect, it } from 'vitest';
import {
  MINIMUM_CRATE_BANANAS,
  resolveRound,
  type RoundResolution,
  splitEvenly,
} from './round.core';

function stashesAfter(resolution: RoundResolution): Record<string, number> {
  return Object.fromEntries(
    resolution.outcomes.map((outcome) => [outcome.playerId, outcome.stashAfter]),
  );
}

// @FollowsBlueprint test-pure-unit
describe('resolveRound, the two examples the rules were explained with', () => {
  it('pays the tariff out of the crate when the highest bidder can afford it', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 30 },
        { playerId: 'you', stashBefore: 10, bid: 25 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 15, you: 15 });
    expect(resolution.crateWinnerIds).toEqual(['me']);
    expect(resolution.bustedIds).toEqual([]);
    expect(resolution.crateAfter).toBe(15);
  });

  it('cascades to the next bidder when the highest one cannot pay, landing on 0, 18 and 12', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 90 },
        { playerId: 'you', stashBefore: 10, bid: 10 },
        { playerId: 'them', stashBefore: 10, bid: 8 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 0, you: 18, them: 12 });
    expect(resolution.bustedIds).toEqual(['me']);
    expect(resolution.crateWinnerIds).toEqual(['you']);
    expect(resolution.crateAfter).toBe(18);
  });
});

describe('resolveRound outcome detail', () => {
  it('records what each player won, paid and received', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 30 },
        { playerId: 'you', stashBefore: 10, bid: 25 },
      ],
    });

    expect(resolution.outcomes).toEqual([
      {
        playerId: 'me',
        bid: 30,
        stashBefore: 10,
        stashAfter: 15,
        crateWon: 10,
        tariffPaid: 5,
        tariffReceived: 0,
        busted: false,
      },
      {
        playerId: 'you',
        bid: 25,
        stashBefore: 10,
        stashAfter: 15,
        crateWon: 0,
        tariffPaid: 0,
        tariffReceived: 5,
        busted: false,
      },
    ]);
    expect(resolution.crateBefore).toBe(10);
  });

  it('marks the busted player and leaves them nothing', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 90 },
        { playerId: 'you', stashBefore: 10, bid: 10 },
        { playerId: 'them', stashBefore: 10, bid: 8 },
      ],
    });
    const busted = resolution.outcomes.find((outcome) => outcome.playerId === 'me');

    expect(busted).toEqual({
      playerId: 'me',
      bid: 90,
      stashBefore: 10,
      stashAfter: 0,
      crateWon: 0,
      tariffPaid: 0,
      tariffReceived: 0,
      busted: true,
    });
  });
});

describe('resolveRound when players tie', () => {
  it('splits the crate between tied leaders and charges no tariff', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 40 },
        { playerId: 'you', stashBefore: 10, bid: 40 },
        { playerId: 'them', stashBefore: 10, bid: 5 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 15, you: 15, them: 10 });
    expect(resolution.crateWinnerIds).toEqual(['me', 'you']);
  });

  it('discards the remainder when the crate does not divide evenly', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 7 },
        { playerId: 'you', stashBefore: 10, bid: 7 },
        { playerId: 'them', stashBefore: 10, bid: 7 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 13, you: 13, them: 13 });
  });

  it('splits one tariff between everyone tied for second place', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 20 },
        { playerId: 'you', stashBefore: 10, bid: 10 },
        { playerId: 'them', stashBefore: 10, bid: 10 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 10, you: 15, them: 15 });
    expect(resolution.outcomes[0]?.tariffPaid).toBe(10);
  });

  it('discards the remainder when a tariff does not divide evenly', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 15 },
        { playerId: 'you', stashBefore: 10, bid: 10 },
        { playerId: 'them', stashBefore: 10, bid: 10 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 15, you: 12, them: 12 });
  });
});

describe('resolveRound edge cases', () => {
  it('gives the whole crate away with no tariff when only one player bids', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [{ playerId: 'me', stashBefore: 10, bid: 4 }],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 20 });
    expect(resolution.crateWinnerIds).toEqual(['me']);
  });

  it('lets the last group standing take the crate after every group above it busts', () => {
    const resolution = resolveRound({
      crateBefore: 5,
      bids: [
        { playerId: 'first', stashBefore: 1, bid: 900 },
        { playerId: 'second', stashBefore: 1, bid: 500 },
        { playerId: 'third', stashBefore: 1, bid: 2 },
      ],
    });

    expect(resolution.bustedIds).toEqual(['first', 'second']);
    expect(stashesAfter(resolution)).toEqual({ first: 0, second: 0, third: 6 });
  });

  it('lets a player sitting on nothing win a crate and pay a tariff out of it', () => {
    const resolution = resolveRound({
      crateBefore: 20,
      bids: [
        { playerId: 'broke', stashBefore: 0, bid: 12 },
        { playerId: 'rich', stashBefore: 40, bid: 4 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ broke: 12, rich: 48 });
  });

  it('busts the leader when the tariff is one banana more than they can raise', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 22 },
        { playerId: 'you', stashBefore: 10, bid: 1 },
      ],
    });

    expect(resolution.bustedIds).toEqual(['me']);
  });

  it('keeps the leader alive when the tariff is exactly what they can raise', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 10, bid: 21 },
        { playerId: 'you', stashBefore: 10, bid: 1 },
      ],
    });

    expect(resolution.bustedIds).toEqual([]);
    expect(stashesAfter(resolution)).toEqual({ me: 0, you: 30 });
  });

  it('refills the crate to the largest stash on the table', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'me', stashBefore: 50, bid: 9 },
        { playerId: 'you', stashBefore: 3, bid: 1 },
      ],
    });

    expect(resolution.crateAfter).toBe(52);
  });

  it('never lets the crate fall to nothing, so a game cannot deadlock', () => {
    const resolution = resolveRound({ crateBefore: 0, bids: [] });

    expect(resolution.crateAfter).toBe(MINIMUM_CRATE_BANANAS);
    expect(resolution.outcomes).toEqual([]);
    expect(resolution.crateWinnerIds).toEqual([]);
  });
});

describe('resolveRound does not depend on the order bids arrive in', () => {
  it('reaches the same table from bids submitted lowest first', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'them', stashBefore: 10, bid: 8 },
        { playerId: 'you', stashBefore: 10, bid: 10 },
        { playerId: 'me', stashBefore: 10, bid: 90 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 0, you: 18, them: 12 });
    expect(resolution.crateWinnerIds).toEqual(['you']);
    expect(resolution.bustedIds).toEqual(['me']);
  });

  it('reaches the same table from bids submitted in a jumbled order', () => {
    const resolution = resolveRound({
      crateBefore: 10,
      bids: [
        { playerId: 'you', stashBefore: 10, bid: 25 },
        { playerId: 'me', stashBefore: 10, bid: 30 },
      ],
    });

    expect(stashesAfter(resolution)).toEqual({ me: 15, you: 15 });
    expect(resolution.crateWinnerIds).toEqual(['me']);
  });
});

describe('splitEvenly', () => {
  it('divides the total between the recipients', () => {
    expect(splitEvenly(10, 2)).toBe(5);
  });

  it('drops the remainder rather than handing out more than there is', () => {
    expect(splitEvenly(10, 3)).toBe(3);
  });

  it('hands out nothing when there is nobody to hand it to', () => {
    expect(splitEvenly(10, 0)).toBe(0);
  });
});
