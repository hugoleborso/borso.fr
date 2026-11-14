import { describe, expect, it } from 'vitest';
import {
  formatPassageRange,
  projectInspirationCard,
  selectDeletionRefusalMessage,
} from './inspirations-page.core';

const INSPIRATION = {
  id: 'inspiration-1',
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: 'Call Me Maybe',
  artist: 'Carly Rae Jepsen',
  deezerTrackId: '1234',
  deezerAlbumId: '5678',
  startSeconds: 52,
  endSeconds: 64,
  note: 'the trumpet',
  authorMemberId: null,
  authorName: null,
  createdAt: '2026-11-13T10:00:00.000Z',
  sketchCount: 2,
};

// @FollowsBlueprint test-pure-unit
describe('the inspiration cards', () => {
  it('reads a null author as a former member and shows the passage as a range', () => {
    expect(projectInspirationCard(INSPIRATION)).toEqual({
      id: 'inspiration-1',
      title: 'Call Me Maybe',
      artist: 'Carly Rae Jepsen',
      deezerAlbumId: '5678',
      rangeLabel: '0:52\u00A0→\u00A01:04',
      detailLabel: 'Carly Rae Jepsen · 0:52\u00A0→\u00A01:04',
      note: 'the trumpet',
      authorName: null,
      sketchCount: 2,
    });
  });

  it('shows the range alone when the artist is not known', () => {
    expect(projectInspirationCard({ ...INSPIRATION, artist: '' }).detailLabel).toBe(
      '0:52\u00A0→\u00A01:04',
    );
  });

  it('writes a passage past a minute in minutes and seconds', () => {
    expect(formatPassageRange({ startSeconds: 220, endSeconds: 232 })).toBe(
      '3:40\u00A0→\u00A03:52',
    );
  });
});

describe('the refused deletion', () => {
  it('names every sketch that still uses the inspiration', () => {
    expect(
      selectDeletionRefusalMessage({
        kind: 'inspiration-in-use',
        sketches: [
          { compositionId: 'composition-1', title: 'New 7' },
          { compositionId: 'composition-2', title: 'New 8' },
        ],
      }),
    ).toEqual({ key: 'inspirations.refusal.inUse', sketchTitles: 'New 7, New 8' });
  });

  it('says when another member deleted it first, or when the reason is unknown', () => {
    expect(selectDeletionRefusalMessage({ kind: 'inspiration-not-found' }).key).toBe(
      'inspirations.refusal.notFound',
    );
    expect(selectDeletionRefusalMessage({ kind: 'unknown' })).toEqual({
      key: 'inspirations.refusal.unknown',
      sketchTitles: '',
    });
  });
});
