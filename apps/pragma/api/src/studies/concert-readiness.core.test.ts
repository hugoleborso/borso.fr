import type { Lineup } from '@domain/lineup.core';
import { describe, expect, it } from 'vitest';
import { groupLineupsBySong, isSongReady, selectNextConcert } from './concert-readiness.core';

const DEFAULTS = { hugo: { guitar: 7 }, lea: { drums: 6, voice: 9 } };
const OVERRIDES = { songB: { lea: { drums: 8 } } };

// @FollowsBlueprint test-pure-unit
describe('concert-readiness.core', () => {
  describe('groupLineupsBySong', () => {
    it('resolves each entry against the song default and groups by song, in order of appearance', () => {
      const grouped = groupLineupsBySong(
        [
          { songId: 'songB', lineupOverride: null },
          { songId: 'songA', lineupOverride: { lea: ['voice'] } },
          { songId: 'songB', lineupOverride: { hugo: [] } },
        ],
        new Map<string, Lineup>([
          ['songA', { hugo: ['guitar'] }],
          ['songB', { hugo: ['guitar'], lea: ['drums'] }],
        ]),
      );
      expect(grouped).toEqual([
        {
          songId: 'songB',
          lineups: [
            { hugo: ['guitar'], lea: ['drums'] },
            { hugo: [], lea: ['drums'] },
          ],
        },
        { songId: 'songA', lineups: [{ hugo: ['guitar'], lea: ['voice'] }] },
      ]);
    });

    it('treats a song missing from the catalogue as having an empty default lineup', () => {
      expect(groupLineupsBySong([{ songId: 'ghost', lineupOverride: null }], new Map())).toEqual([
        { songId: 'ghost', lineups: [{}] },
      ]);
    });
  });

  describe('isSongReady', () => {
    it('is ready when the lineup mean is exactly the threshold', () => {
      expect(isSongReady(DEFAULTS, {}, { songId: 'songA', lineups: [{ hugo: ['guitar'] }] })).toBe(
        true,
      );
    });

    it('is not ready just under the threshold', () => {
      expect(
        isSongReady(
          DEFAULTS,
          {},
          { songId: 'songA', lineups: [{ hugo: ['guitar'], lea: ['drums'] }] },
        ),
      ).toBe(false);
    });

    it('reads the per-song override before the default', () => {
      expect(
        isSongReady(DEFAULTS, OVERRIDES, {
          songId: 'songB',
          lineups: [{ hugo: ['guitar'], lea: ['drums'] }],
        }),
      ).toBe(true);
    });

    it('is not ready while one member of the lineup has no score at all', () => {
      expect(
        isSongReady(
          { hugo: { guitar: 9 } },
          {},
          {
            songId: 'songA',
            lineups: [{ hugo: ['guitar'], lea: ['voice'] }],
          },
        ),
      ).toBe(false);
    });

    it('is not ready with one silent player even when the others would carry the mean', () => {
      expect(
        isSongReady(
          { hugo: { guitar: 10 }, lea: { drums: 10 }, marc: { bass: 10 } },
          {},
          {
            songId: 'songA',
            lineups: [{ hugo: ['guitar'], lea: ['drums'], marc: ['bass'], sam: ['voice'] }],
          },
        ),
      ).toBe(false);
    });

    it('is not ready for a lineup with nobody in it', () => {
      expect(isSongReady(DEFAULTS, {}, { songId: 'songA', lineups: [{}] })).toBe(false);
    });

    it('is not ready when nothing is recorded or when there is no lineup', () => {
      expect(isSongReady({}, {}, { songId: 'songA', lineups: [{ hugo: ['guitar'] }] })).toBe(false);
      expect(isSongReady(DEFAULTS, {}, { songId: 'songA', lineups: [] })).toBe(false);
    });

    it('is ready only when every lineup it is played with is ready', () => {
      expect(
        isSongReady(
          DEFAULTS,
          {},
          {
            songId: 'songA',
            lineups: [{ lea: ['voice'] }, { lea: ['drums'] }],
          },
        ),
      ).toBe(false);
    });
  });

  describe('selectNextConcert', () => {
    const now = new Date('2026-10-12T12:00:00Z');

    it('picks the earliest concert strictly after now and ignores practices', () => {
      const sessions = [
        { id: 'late', kind: 'concert', date: new Date('2026-11-20T20:00:00Z') },
        { id: 'practice', kind: 'practice', date: new Date('2026-10-13T20:00:00Z') },
        { id: 'early', kind: 'concert', date: new Date('2026-10-20T20:00:00Z') },
        { id: 'past', kind: 'concert', date: new Date('2026-10-01T20:00:00Z') },
        { id: 'now', kind: 'concert', date: now },
      ];
      expect(selectNextConcert(sessions, now)?.id).toBe('early');
    });

    it('answers null when no concert is ahead', () => {
      expect(selectNextConcert([], now)).toBeNull();
    });
  });
});
