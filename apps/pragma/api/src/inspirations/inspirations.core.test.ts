import { describe, expect, it } from 'vitest';
import {
  countSketchesByInspiration,
  projectInspirationViews,
  selectInspirationDeletion,
} from './inspirations.core';
import type { InspirationRow } from './inspirations.types';

const INSPIRATION: InspirationRow = {
  id: 'inspiration-1',
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: 'Call Me Maybe',
  artist: 'Carly Rae Jepsen',
  deezerTrackId: null,
  deezerAlbumId: null,
  startSeconds: 52,
  endSeconds: 64,
  note: '',
  authorMemberId: null,
  authorName: null,
  createdAt: new Date('2026-11-13T10:00:00Z'),
};

// @FollowsBlueprint test-pure-unit
describe('the sketches using an inspiration', () => {
  it('counts two clips of one sketch as one sketch', () => {
    const counts = countSketchesByInspiration([
      { inspirationId: 'inspiration-1', songId: 'song-1', songTitle: 'New 7' },
      { inspirationId: 'inspiration-1', songId: 'song-1', songTitle: 'New 7' },
      { inspirationId: 'inspiration-1', songId: 'song-2', songTitle: 'New 8' },
      { inspirationId: 'inspiration-2', songId: 'song-2', songTitle: 'New 8' },
    ]);
    expect(counts.get('inspiration-1')).toBe(2);
    expect(counts.get('inspiration-2')).toBe(1);
  });

  it('gives an unused inspiration a sketch count of zero', () => {
    const views = projectInspirationViews(
      [INSPIRATION, { ...INSPIRATION, id: 'inspiration-2' }],
      [{ inspirationId: 'inspiration-2', songId: 'song-1', songTitle: 'New 7' }],
    );
    expect(views.map((view) => view.sketchCount)).toEqual([0, 1]);
  });

  it('lets an unused inspiration go, and names each sketch using one once, by title', () => {
    expect(selectInspirationDeletion([])).toEqual({ kind: 'free' });
    expect(
      selectInspirationDeletion([
        { inspirationId: 'inspiration-1', songId: 'song-2', songTitle: 'New 8' },
        { inspirationId: 'inspiration-1', songId: 'song-1', songTitle: 'New 7' },
        { inspirationId: 'inspiration-1', songId: 'song-2', songTitle: 'New 8' },
      ]),
    ).toEqual({
      kind: 'inspiration-in-use',
      sketches: [
        { songId: 'song-1', title: 'New 7' },
        { songId: 'song-2', title: 'New 8' },
      ],
    });
  });
});
