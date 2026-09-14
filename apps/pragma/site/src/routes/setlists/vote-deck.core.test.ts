import { describe, expect, it } from 'vitest';
import {
  judgeRelease,
  countSongsNewSinceLastScore,
  isSongNewSinceLastScore,
  readGivenPoints,
  readIntentPoints,
  selectCardRotation,
  selectDiscardTint,
  isBudgetExhausted,
  selectScoringTint,
  selectSpentShare,
  selectNextCardIndex,
  selectPointsForZone,
  selectRemainingAfterScore,
  selectZoneForOffset,
  selectZoneStrength,
} from './vote-deck.core';

const GEOMETRY = { width: 320, height: 480 };
const COMMIT_DISTANCE = 80;

// @FollowsBlueprint test-pure-unit
describe('vote-deck.core', () => {
  it('reads a card barely moved as no zone at all', () => {
    expect(selectZoneForOffset({ x: 0, y: 0 }, GEOMETRY)).toBe('none');
    expect(selectZoneForOffset({ x: COMMIT_DISTANCE - 1, y: 0 }, GEOMETRY)).toBe('none');
    expect(selectZoneForOffset({ x: -COMMIT_DISTANCE + 1, y: 0 }, GEOMETRY)).toBe('none');
  });

  it('reads a card pulled far enough left as a discard', () => {
    expect(selectZoneForOffset({ x: -COMMIT_DISTANCE, y: 0 }, GEOMETRY)).toBe('discard');
    expect(selectZoneForOffset({ x: -300, y: -200 }, GEOMETRY)).toBe('discard');
  });

  it('splits the right side into three rows, three points at the top', () => {
    expect(selectZoneForOffset({ x: COMMIT_DISTANCE, y: -200 }, GEOMETRY)).toBe('three');
    expect(selectZoneForOffset({ x: COMMIT_DISTANCE, y: 0 }, GEOMETRY)).toBe('two');
    expect(selectZoneForOffset({ x: COMMIT_DISTANCE, y: 200 }, GEOMETRY)).toBe('one');
  });

  it('clamps a drag past the top or the bottom of the card', () => {
    expect(selectZoneForOffset({ x: 200, y: -10_000 }, GEOMETRY)).toBe('three');
    expect(selectZoneForOffset({ x: 200, y: 10_000 }, GEOMETRY)).toBe('one');
  });

  it('gives each zone its points', () => {
    expect(selectPointsForZone('discard')).toBe(0);
    expect(selectPointsForZone('one')).toBe(1);
    expect(selectPointsForZone('two')).toBe(2);
    expect(selectPointsForZone('three')).toBe(3);
    expect(selectPointsForZone('none')).toBe(0);
  });

  it('fills only the zone under the thumb, and fills it as the drag travels', () => {
    expect(selectZoneStrength('two', 'three', { x: 200, y: 0 }, GEOMETRY)).toBe(0);
    expect(selectZoneStrength('two', 'two', { x: 40, y: 0 }, GEOMETRY)).toBe(0.5);
    expect(selectZoneStrength('two', 'two', { x: 200, y: 0 }, GEOMETRY)).toBe(1);
    expect(selectZoneStrength('two', 'two', { x: 40, y: 0 }, { width: 0, height: 480 })).toBe(1);
  });

  it('returns the card home when it was never pulled far enough', () => {
    expect(judgeRelease('none', 9)).toEqual({ kind: 'return' });
  });

  it('scores zero for a discard, whatever the budget', () => {
    expect(judgeRelease('discard', 0)).toEqual({ kind: 'score', points: 0 });
  });

  it('refuses a zone the budget cannot pay for', () => {
    expect(judgeRelease('three', 2)).toEqual({ kind: 'refused' });
    expect(judgeRelease('one', 0)).toEqual({ kind: 'refused' });
  });

  it('accepts a zone the budget covers exactly', () => {
    expect(judgeRelease('three', 3)).toEqual({ kind: 'score', points: 3 });
  });

  it('gives back what the song held before it took its new points', () => {
    expect(selectRemainingAfterScore(4, 2, 3)).toBe(3);
    expect(selectRemainingAfterScore(0, 3, 0)).toBe(3);
  });

  it('stops the deck at its end rather than running past it', () => {
    expect(selectNextCardIndex(0, 3)).toBe(1);
    expect(selectNextCardIndex(2, 3)).toBe(3);
    expect(selectNextCardIndex(3, 3)).toBe(3);
  });
});

describe('vote-deck tints and rotation', () => {
  it('tints only the zone under the thumb, up to its ceiling', () => {
    expect(selectScoringTint('two', 'three', { x: 200, y: 0 }, GEOMETRY)).toBe(0);
    expect(selectScoringTint('two', 'two', { x: 200, y: 0 }, GEOMETRY)).toBeCloseTo(0.7);
    expect(selectDiscardTint('discard', { x: -200, y: 0 }, GEOMETRY)).toBeCloseTo(0.5);
    expect(selectDiscardTint('one', { x: 200, y: 0 }, GEOMETRY)).toBe(0);
  });

  it('tilts the card with the drag', () => {
    expect(selectCardRotation({ x: 0, y: 0 })).toBe(0);
    expect(selectCardRotation({ x: 100, y: 0 })).toBeCloseTo(5);
  });

  it('reads what a song already holds, and zero when it holds nothing', () => {
    expect(readGivenPoints({ 'song-a': 2 }, 'song-a')).toBe(2);
    expect(readGivenPoints({}, 'song-a')).toBe(0);
  });
});

describe('selectSpentShare', () => {
  it('reads an untouched budget as nothing spent', () => {
    expect(selectSpentShare(30, 30)).toBe(0);
  });

  it('reads an exhausted budget as everything spent', () => {
    expect(selectSpentShare(30, 0)).toBe(100);
  });

  it('fills the bar by the share spent, not by the amount', () => {
    expect(selectSpentShare(6, 3)).toBe(50);
    expect(selectSpentShare(30, 24)).toBe(20);
  });

  it('answers zero rather than dividing by a budget of nothing', () => {
    expect(selectSpentShare(0, 0)).toBe(0);
  });
});

describe('readIntentPoints', () => {
  it('reads the points of a scoring release, and zero otherwise', () => {
    expect(readIntentPoints({ kind: 'score', points: 2 })).toBe(2);
    expect(readIntentPoints({ kind: 'refused' })).toBe(0);
    expect(readIntentPoints({ kind: 'return' })).toBe(0);
  });
});

describe('selectZoneStrength on a card of no width', () => {
  it('reads an untravelled drag on a zero-width card as fully committed', () => {
    expect(selectZoneStrength('two', 'two', { x: 0, y: 0 }, { width: 0, height: 480 })).toBe(1);
  });
});

describe('a song that arrived after this member went through the deck', () => {
  const EARLIER = '2026-09-14T10:00:00.000Z';
  const LATER = '2026-09-14T12:00:00.000Z';

  it('is new when it was created after the last score and holds none', () => {
    expect(isSongNewSinceLastScore({ id: 'song-a', createdAt: LATER }, EARLIER, 0)).toBe(true);
  });

  it('is not new when it was already there', () => {
    expect(isSongNewSinceLastScore({ id: 'song-a', createdAt: EARLIER }, LATER, 0)).toBe(false);
  });

  it('is not new once this member has scored it', () => {
    expect(isSongNewSinceLastScore({ id: 'song-a', createdAt: LATER }, EARLIER, 2)).toBe(false);
  });

  it('is not new to a member who has scored nothing yet', () => {
    expect(isSongNewSinceLastScore({ id: 'song-a', createdAt: LATER }, null, 0)).toBe(false);
  });

  it('counts the ones worth telling the member about', () => {
    const songs = [
      { id: 'song-a', createdAt: LATER },
      { id: 'song-b', createdAt: LATER },
      { id: 'song-c', createdAt: EARLIER },
    ];
    expect(countSongsNewSinceLastScore(songs, EARLIER, { 'song-b': 1 })).toBe(1);
    expect(countSongsNewSinceLastScore(songs, null, {})).toBe(0);
  });
});

describe('a budget the member has overspent', () => {
  it('never fills the bar past the whole of it', () => {
    expect(selectSpentShare(6, -1)).toBe(100);
  });

  it('reads as exhausted at zero and below', () => {
    expect(isBudgetExhausted(1)).toBe(false);
    expect(isBudgetExhausted(0)).toBe(true);
    expect(isBudgetExhausted(-1)).toBe(true);
  });
});
