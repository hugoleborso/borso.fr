import { describe, expect, it } from 'vitest';
import {
  listPickableConcerts,
  listPickableSongIds,
  listPracticeSongIds,
  planPracticeSongsSave,
  poolConcertSongIds,
  togglePickedId,
} from './practice-songs.core';

const PRACTICE = 'practice-1';

function concert(id: string, date: string, venue: string) {
  return { id, kind: 'concert', date, venue };
}

// @FollowsBlueprint test-pure-unit
describe('listPickableConcerts', () => {
  const old = concert('old', '2026-01-10T20:00:00Z', 'Le Petit Bain');
  const recent = concert('recent', '2026-09-10T20:00:00Z', 'La Cigale');
  const coming = concert('coming', '2026-12-01T20:00:00Z', 'Élysée Montmartre');
  const practice = { id: 'p', kind: 'practice', date: '2026-10-01T20:00:00Z', venue: 'Studio' };
  const sessions = [old, practice, coming, recent];

  it('keeps the concerts only, the most recent date first', () => {
    expect(listPickableConcerts(sessions, '', (session) => session.venue)).toEqual([
      coming,
      recent,
      old,
    ]);
  });

  it('matches the search ignoring case, accents and surrounding spaces', () => {
    expect(listPickableConcerts(sessions, '  elysee ', (session) => session.venue)).toEqual([
      coming,
    ]);
    expect(listPickableConcerts(sessions, 'CIGALE', (session) => session.venue)).toEqual([recent]);
    expect(listPickableConcerts(sessions, 'studio', (session) => session.venue)).toEqual([]);
  });
});

describe('poolConcertSongIds', () => {
  const setlists = [
    { id: 'a', songIds: ['s1', 's2'], sessionIds: ['c1'] },
    { id: 'b', songIds: ['s2', 's3'], sessionIds: ['c2', 'c1'] },
    { id: 'c', songIds: ['s4'], sessionIds: ['c3'] },
  ];

  it('pools the songs of every setlist of the picked concerts, once each, in order', () => {
    expect(poolConcertSongIds(['c1'], setlists)).toEqual(['s1', 's2', 's3']);
    expect(poolConcertSongIds(['c3', 'c2'], setlists)).toEqual(['s4', 's2', 's3']);
  });

  it('pools nothing when no concert is picked', () => {
    expect(poolConcertSongIds([], setlists)).toEqual([]);
  });
});

describe('listPracticeSongIds', () => {
  it('lists the songs of the practice setlists by setlist then by position, once each', () => {
    const setlists = [
      { id: 'one', songIds: [], sessionIds: [PRACTICE] },
      { id: 'two', songIds: [], sessionIds: [PRACTICE] },
      { id: 'missing', songIds: [], sessionIds: [PRACTICE] },
    ];
    const entriesBySetlistId = {
      one: [
        { id: 'e2', songId: 's2', position: 1 },
        { id: 'e1', songId: 's1', position: 0 },
      ],
      two: [
        { id: 'e3', songId: 's1', position: 0 },
        { id: 'e4', songId: 's3', position: 1 },
      ],
    };
    expect(listPracticeSongIds(setlists, entriesBySetlistId)).toEqual(['s1', 's2', 's3']);
  });
});

describe('listPickableSongIds', () => {
  it('lists the pooled songs, then the practice songs the pool lacks', () => {
    expect(listPickableSongIds(['s1', 's2'], ['s3', 's1'])).toEqual(['s1', 's2', 's3']);
  });
});

describe('togglePickedId', () => {
  it('picks an unpicked identifier at the end and unpicks a picked one', () => {
    expect(togglePickedId(['s1'], 's2')).toEqual(['s1', 's2']);
    expect(togglePickedId(['s1', 's2'], 's1')).toEqual(['s2']);
  });
});

describe('planPracticeSongsSave', () => {
  it('creates the practice setlist when it has none, with every ticked song', () => {
    expect(
      planPracticeSongsSave({
        practiceId: PRACTICE,
        practiceSetlists: [],
        entriesBySetlistId: {},
        tickedSongIds: ['s1', 's2', 's1'],
      }),
    ).toEqual({
      ownSetlistId: null,
      addSongIds: ['s1', 's2'],
      removedEntries: [],
      unlinkedSetlistIds: [],
    });
  });

  it('adds the newly ticked songs and removes the unticked ones from its own setlists', () => {
    expect(
      planPracticeSongsSave({
        practiceId: PRACTICE,
        practiceSetlists: [
          { id: 'own', songIds: [], sessionIds: [PRACTICE] },
          { id: 'own-too', songIds: [], sessionIds: [PRACTICE] },
        ],
        entriesBySetlistId: {
          own: [
            { id: 'e1', songId: 's1', position: 0 },
            { id: 'e2', songId: 's2', position: 1 },
          ],
        },
        tickedSongIds: ['s2', 's3'],
      }),
    ).toEqual({
      ownSetlistId: 'own',
      addSongIds: ['s3'],
      removedEntries: [{ setlistId: 'own', entryId: 'e1' }],
      unlinkedSetlistIds: [],
    });
  });

  it('unlinks a setlist the practice shares with another session instead of editing it', () => {
    expect(
      planPracticeSongsSave({
        practiceId: PRACTICE,
        practiceSetlists: [
          { id: 'shared', songIds: ['s1'], sessionIds: [PRACTICE, 'concert'] },
          { id: 'other', songIds: ['s9'], sessionIds: ['concert'] },
        ],
        entriesBySetlistId: { shared: [{ id: 'e1', songId: 's1', position: 0 }] },
        tickedSongIds: ['s1'],
      }),
    ).toEqual({
      ownSetlistId: null,
      addSongIds: ['s1'],
      removedEntries: [],
      unlinkedSetlistIds: ['shared', 'other'],
    });
  });
});
