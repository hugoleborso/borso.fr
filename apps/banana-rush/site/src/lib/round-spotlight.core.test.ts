import { describe, expect, it } from 'vitest';
import type { RoundStory } from './game-summary.core';
import {
  countBananasInFlight,
  planBananaFlight,
  selectRoundSpotlight,
  selectSpotlightStyling,
  sortStoriesBySpotlight,
} from './round-spotlight.core';

function story(playerId: string, overrides: Partial<RoundStory> = {}): RoundStory {
  return {
    playerId,
    nickname: playerId,
    avatar: 'chimp',
    bid: 10,
    stashBefore: 10,
    stashAfter: 10,
    crateWon: 0,
    tariffPaid: 0,
    tariffReceived: 0,
    busted: false,
    wonTheCrate: false,
    ...overrides,
  };
}

const crateWinner = story('winner', { crateWon: 12, tariffPaid: 4, wonTheCrate: true });
const tariffReceiver = story('second', { tariffReceived: 4 });
const bystander = story('third');

// @FollowsBlueprint test-pure-unit
describe('selectRoundSpotlight', () => {
  it('spotlights the player who took the crate', () => {
    expect(selectRoundSpotlight(crateWinner)).toBe('crateWinner');
  });

  it('spotlights the player the tariff was paid to', () => {
    expect(selectRoundSpotlight(tariffReceiver)).toBe('tariffReceiver');
  });

  it('spotlights nobody else', () => {
    expect(selectRoundSpotlight(bystander)).toBe('nobody');
  });

  it('spotlights the crate before the tariff when one player has both', () => {
    expect(selectRoundSpotlight({ ...crateWinner, tariffReceived: 3 })).toBe('crateWinner');
  });

  it('spotlights nobody for a tariff of nothing', () => {
    expect(selectRoundSpotlight({ ...tariffReceiver, tariffReceived: 0 })).toBe('nobody');
  });
});

describe('sortStoriesBySpotlight', () => {
  it('puts the crate first, the tariff second and everybody else after', () => {
    const ordered = sortStoriesBySpotlight([bystander, tariffReceiver, crateWinner]);
    expect(ordered.map((entry) => entry.playerId)).toEqual(['winner', 'second', 'third']);
  });

  it('leaves a list that already opens with the crate alone', () => {
    const ordered = sortStoriesBySpotlight([crateWinner, bystander]);
    expect(ordered.map((entry) => entry.playerId)).toEqual(['winner', 'third']);
  });

  it('keeps the server order among the players it does not spotlight', () => {
    const ordered = sortStoriesBySpotlight([story('late'), story('early'), crateWinner]);
    expect(ordered.map((entry) => entry.playerId)).toEqual(['winner', 'late', 'early']);
  });
});

describe('selectSpotlightStyling', () => {
  it('rings the crate winner in the deep peel and names its badge', () => {
    expect(selectSpotlightStyling('crateWinner')).toEqual({
      emphasis: 'relative z-10 ring-4 ring-peel-deep animate-spotlight-pop',
      badgeTone: 'bg-peel',
      labelKey: 'reveal.crateWinner',
      flightAnimation: 'animate-crate-fall',
    });
  });

  it('rings the tariff receiver in the leaf and names its badge', () => {
    expect(selectSpotlightStyling('tariffReceiver')).toEqual({
      emphasis: 'relative z-10 ring-4 ring-leaf animate-spotlight-pop',
      badgeTone: 'bg-leaf-soft',
      labelKey: 'reveal.tariffReceiver',
      flightAnimation: 'animate-tariff-slide',
    });
  });

  it('gives everybody else a row that is only positioned, with no badge and no flight', () => {
    expect(selectSpotlightStyling('nobody')).toEqual({
      emphasis: 'relative',
      badgeTone: '',
      labelKey: null,
      flightAnimation: '',
    });
  });
});

describe('countBananasInFlight', () => {
  it('counts what the crate handed over', () => {
    expect(countBananasInFlight(crateWinner, 'crateWinner')).toBe(12);
  });

  it('counts what the tariff handed over', () => {
    expect(countBananasInFlight(tariffReceiver, 'tariffReceiver')).toBe(4);
  });

  it('counts nothing for a row nobody is watching, whatever moved through it', () => {
    expect(countBananasInFlight({ ...crateWinner, tariffReceived: 7 }, 'nobody')).toBe(0);
  });
});

describe('planBananaFlight', () => {
  it('gives one lane per banana, each leaving later than the one before it', () => {
    expect(planBananaFlight(3)).toEqual([
      { lanePercent: 16, delayMilliseconds: 0 },
      { lanePercent: 31, delayMilliseconds: 110 },
      { lanePercent: 46, delayMilliseconds: 220 },
    ]);
  });

  it('flies nothing when nothing moved', () => {
    expect(planBananaFlight(0)).toEqual([]);
  });

  it('caps a stash sized amount at the lanes a row has room for', () => {
    expect(planBananaFlight(240)).toEqual([
      { lanePercent: 16, delayMilliseconds: 0 },
      { lanePercent: 31, delayMilliseconds: 110 },
      { lanePercent: 46, delayMilliseconds: 220 },
      { lanePercent: 61, delayMilliseconds: 330 },
      { lanePercent: 76, delayMilliseconds: 440 },
    ]);
  });
});
