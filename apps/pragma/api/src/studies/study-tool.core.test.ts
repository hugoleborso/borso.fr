import { describe, expect, it } from 'vitest';
import { describeOwnLine, projectOverviewForTool } from './study-tool.core';
import type { StudiesOverview } from './studies.types';

const STREAK = { days: 3, isTodayCounted: true, isJokerAvailable: false };
const OVERVIEW: StudiesOverview = {
  today: '2026-10-28',
  myStreak: STREAK,
  queue: [
    {
      songId: 'song-creep',
      title: 'Creep',
      instrumentId: 'instrument-drums',
      score: 4,
      isReady: false,
      isStudiedToday: true,
    },
  ],
  band: [
    {
      memberId: 'member-hugo',
      firstName: 'Hugo',
      color: '#e0533a',
      streak: STREAK,
      studiesThisWeek: 2,
    },
  ],
  readiness: {
    concertId: 'session-concert',
    date: '2026-11-07T20:00:00.000Z',
    venue: 'Le Petit Bain',
    songs: [
      { songId: 'song-creep', title: 'Creep', isReady: false },
      { songId: 'song-army', title: 'Seven Nation Army', isReady: true },
    ],
  },
};

// @FollowsBlueprint test-pure-unit
describe('projectOverviewForTool', () => {
  it('names the instruments of the queue, keeps each streak as a count, and splits the concert songs by readiness', () => {
    expect(
      projectOverviewForTool(OVERVIEW, [{ id: 'instrument-drums', name: 'Batterie' }]),
    ).toEqual({
      today: '2026-10-28',
      myStreak: STREAK,
      queue: [
        {
          song: 'Creep',
          songId: 'song-creep',
          instrument: 'Batterie',
          score: 4,
          isReady: false,
          isStudiedToday: true,
        },
      ],
      band: [{ firstName: 'Hugo', streak: 3, thisWeek: 2 }],
      readiness: {
        concertId: 'session-concert',
        date: '2026-11-07T20:00:00.000Z',
        venue: 'Le Petit Bain',
        ready: ['Seven Nation Army'],
        notReady: ['Creep'],
      },
    });
  });

  it('answers no readiness when no concert is coming', () => {
    expect(projectOverviewForTool({ ...OVERVIEW, readiness: null }, []).readiness).toBeNull();
  });
});

describe('describeOwnLine', () => {
  it('keeps the streak as a count and the studies of the week', () => {
    expect(describeOwnLine({ streak: STREAK, studiesThisWeek: 2 })).toEqual({
      streak: 3,
      thisWeek: 2,
    });
  });
});
