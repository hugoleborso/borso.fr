import { describe, expect, it } from 'vitest';
import {
  moveClipInSketch,
  removeClipFromSketch,
  removeLaneFromSketch,
  renameLaneInSketch,
  type SketchShape,
  settleClipInSketch,
  settleCompositionInSketch,
  settleLaneInSketch,
} from './sketch-cache.core';

const COMPOSITION = {
  id: 'composition-1',
  title: 'New 7',
  songId: null,
  createdAt: '2026-11-13T10:00:00.000Z',
};
const DRUMS = { id: 'lane-a', compositionId: 'composition-1', name: 'drums', position: 0 };
const BRASS = { id: 'lane-b', compositionId: 'composition-1', name: 'brass', position: 1 };
const CLIP = { id: 'clip-1', laneId: 'lane-a', inspirationId: 'inspiration-1', offsetSeconds: 0 };
const OTHER_CLIP = { ...CLIP, id: 'clip-2', laneId: 'lane-b' };
const SKETCH: SketchShape = {
  composition: COMPOSITION,
  lanes: [DRUMS, BRASS],
  clips: [CLIP, OTHER_CLIP],
};

// @FollowsBlueprint test-pure-unit
describe('the cached sketch', () => {
  it('adds a lane in its position, ties broken on id, and replaces one already there', () => {
    const keys = { ...DRUMS, id: 'lane-0', name: 'keys' };
    const tied = { ...BRASS, id: 'lane-0b', name: 'strings' };
    expect(settleLaneInSketch(SKETCH, keys).lanes.map((lane) => lane.name)).toEqual([
      'keys',
      'drums',
      'brass',
    ]);
    expect(settleLaneInSketch(SKETCH, tied).lanes.map((lane) => lane.name)).toEqual([
      'drums',
      'strings',
      'brass',
    ]);
    expect(settleLaneInSketch(SKETCH, { ...DRUMS, name: 'kit' }).lanes).toEqual([
      { ...DRUMS, name: 'kit' },
      BRASS,
    ]);
  });

  it('renames one lane and leaves the others', () => {
    expect(renameLaneInSketch(SKETCH, 'lane-b', 'horns').lanes).toEqual([
      DRUMS,
      { ...BRASS, name: 'horns' },
    ]);
  });

  it('removes a lane with its clips', () => {
    expect(removeLaneFromSketch(SKETCH, 'lane-a')).toEqual({
      composition: COMPOSITION,
      lanes: [BRASS],
      clips: [OTHER_CLIP],
    });
  });

  it('places a clip once, even when the answer settles it a second time', () => {
    const placed = settleClipInSketch(SKETCH, { ...CLIP, id: 'clip-3' });
    expect(placed.clips).toHaveLength(3);
    expect(settleClipInSketch(placed, { ...CLIP, id: 'clip-3', offsetSeconds: 2 }).clips).toEqual([
      CLIP,
      OTHER_CLIP,
      { ...CLIP, id: 'clip-3', offsetSeconds: 2 },
    ]);
  });

  it('moves one clip in time and onto another lane', () => {
    expect(
      moveClipInSketch(SKETCH, { clipId: 'clip-1', laneId: 'lane-b', offsetSeconds: 4 }).clips,
    ).toEqual([{ ...CLIP, laneId: 'lane-b', offsetSeconds: 4 }, OTHER_CLIP]);
  });

  it('removes one clip', () => {
    expect(removeClipFromSketch(SKETCH, 'clip-1').clips).toEqual([OTHER_CLIP]);
  });

  it('takes the renamed or catalogued composition and keeps its lanes and clips', () => {
    const catalogued = { ...COMPOSITION, title: 'Avignon Nice', songId: 'song-1' };
    expect(settleCompositionInSketch(SKETCH, catalogued)).toEqual({
      ...SKETCH,
      composition: catalogued,
    });
  });
});
