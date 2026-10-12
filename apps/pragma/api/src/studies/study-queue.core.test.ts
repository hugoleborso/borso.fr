import { describe, expect, it } from 'vitest';
import { buildStudyQueue, studyKey } from './study-queue.core';

// @FollowsBlueprint test-pure-unit
describe('study-queue.core', () => {
  it('lists one row per instrument I hold, not-ready first, then lowest score, then title', () => {
    const queue = buildStudyQueue({
      memberId: 'hugo',
      songs: [
        { songId: 'ready', title: 'Alpha', lineups: [{ hugo: ['guitar'] }], isReady: true },
        { songId: 'same', title: 'Charlie', lineups: [{ hugo: ['guitar'] }], isReady: false },
        { songId: 'two', title: 'Bravo', lineups: [{ hugo: ['guitar', 'voice'] }], isReady: false },
        { songId: 'unknown', title: 'Zulu', lineups: [{ hugo: ['bass'] }], isReady: false },
        { songId: 'notmine', title: 'Delta', lineups: [{ lea: ['drums'] }], isReady: false },
      ],
      defaults: { hugo: { guitar: 5, voice: 3 } },
      overrides: { ready: { hugo: { guitar: 2 } } },
      keysStudiedToday: new Set([studyKey('two', 'voice')]),
    });
    expect(
      queue.map((item) => [item.songId, item.instrumentId, item.score, item.isStudiedToday]),
    ).toEqual([
      ['unknown', 'bass', null, false],
      ['two', 'voice', 3, true],
      ['two', 'guitar', 5, false],
      ['same', 'guitar', 5, false],
      ['ready', 'guitar', 2, false],
    ]);
  });

  it('breaks a full tie on the instrument id and keeps an unknown readiness with the not ready', () => {
    const queue = buildStudyQueue({
      memberId: 'hugo',
      songs: [
        { songId: 'song', title: 'Same', lineups: [{ hugo: ['voice', 'guitar'] }], isReady: null },
      ],
      defaults: {},
      overrides: {},
      keysStudiedToday: new Set(),
    });
    expect(queue.map((item) => item.instrumentId)).toEqual(['guitar', 'voice']);
  });
});
