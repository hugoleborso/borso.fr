import { describe, expect, it } from 'vitest';
import { buildOptimisticInspiration, mergeInspirationChanges } from './inspiration-cache.core';

const FIELDS = {
  id: 'inspiration-1',
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: 'Call Me Maybe',
  artist: 'Carly Rae Jepsen',
  deezerTrackId: null,
  deezerAlbumId: null,
  startSeconds: 52,
  endSeconds: 64,
  note: '',
};

// @FollowsBlueprint test-pure-unit
describe('the cached inspiration', () => {
  it('shows a new inspiration at once, named after the signed-in member, used by no sketch', () => {
    expect(
      buildOptimisticInspiration(
        FIELDS,
        { memberId: 'member-1', firstName: 'Hugo' },
        '2026-11-13T10:00:00.000Z',
      ),
    ).toEqual({
      ...FIELDS,
      authorMemberId: 'member-1',
      authorName: 'Hugo',
      createdAt: '2026-11-13T10:00:00.000Z',
      sketchCount: 0,
    });
  });

  it('leaves the author empty when the signed-in member is not known yet', () => {
    const inspiration = buildOptimisticInspiration(FIELDS, null, '2026-11-13T10:00:00.000Z');
    expect(inspiration.authorName).toBeNull();
    expect(inspiration.authorMemberId).toBeNull();
  });

  it('takes every edited field and keeps the author, the date and the sketch count', () => {
    const inspiration = buildOptimisticInspiration(
      FIELDS,
      { memberId: 'member-1', firstName: 'Hugo' },
      '2026-11-13T10:00:00.000Z',
    );
    const { id: _id, ...changes } = { ...FIELDS, startSeconds: 40, note: 'the chorus' };
    expect(mergeInspirationChanges({ ...inspiration, sketchCount: 2 }, changes)).toEqual({
      ...inspiration,
      startSeconds: 40,
      note: 'the chorus',
      sketchCount: 2,
    });
  });
});
