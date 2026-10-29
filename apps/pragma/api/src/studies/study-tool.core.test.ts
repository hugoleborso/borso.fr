import { describe, expect, it } from 'vitest';
import { projectOverviewForTool } from './study-tool.core';
import type { StudiesOverview } from './studies.types';

const OVERVIEW: StudiesOverview = {
  today: '2026-10-28',
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
  it('names the instruments of the queue and splits the concert songs by readiness', () => {
    expect(
      projectOverviewForTool(OVERVIEW, [{ id: 'instrument-drums', name: 'Batterie' }]),
    ).toEqual({
      today: '2026-10-28',
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
