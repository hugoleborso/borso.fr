import { SKETCH_TAIL_SECONDS } from '@domain/sketch.core';
import { describe, expect, it } from 'vitest';
import {
  buildClipDragAnnouncements,
  type ClipDragAnnouncementKey,
  type ClipDragNames,
  findLaneName,
  isTapKey,
  isTapRightAfterDrag,
  PIXELS_PER_SECOND,
  projectSketchTimeline,
  NEVER_DRAGGED_AT_MS,
  selectDroppedClip,
  selectNewClipOffsetSeconds,
  selectNextLanePosition,
  selectPlayedPassage,
} from './sketch-timeline.core';

const COMPOSITION = {
  id: 'composition-1',
  title: 'New 7',
  songId: null,
  createdAt: '2026-11-13T10:00:00.000Z',
};
const DRUMS = { id: 'lane-a', compositionId: 'composition-1', name: 'drums', position: 0 };
const BRASS = { id: 'lane-b', compositionId: 'composition-1', name: 'brass', position: 1 };
const CALL_ME_MAYBE = {
  id: 'inspiration-1',
  title: 'Call Me Maybe',
  startSeconds: 52,
  endSeconds: 64,
};

// @FollowsBlueprint test-pure-unit
describe('projectSketchTimeline', () => {
  it('gives a clip the width of its passage and drops a clip whose inspiration is not in the list', () => {
    const timeline = projectSketchTimeline(
      {
        composition: COMPOSITION,
        lanes: [DRUMS, BRASS],
        clips: [
          { id: 'clip-1', laneId: 'lane-b', inspirationId: 'inspiration-1', offsetSeconds: 10 },
          { id: 'clip-2', laneId: 'lane-a', inspirationId: 'gone', offsetSeconds: 0 },
        ],
      },
      [CALL_ME_MAYBE],
    );

    expect(timeline.lanes).toEqual([
      { id: 'lane-a', name: 'drums', clips: [] },
      {
        id: 'lane-b',
        name: 'brass',
        clips: [
          {
            id: 'clip-1',
            laneId: 'lane-b',
            inspirationId: 'inspiration-1',
            offsetSeconds: 10,
            title: 'Call Me Maybe',
            leftPixels: 10 * PIXELS_PER_SECOND,
            widthPixels: 12 * PIXELS_PER_SECOND,
          },
        ],
      },
    ]);
    expect(timeline.widthPixels).toBe((22 + SKETCH_TAIL_SECONDS) * PIXELS_PER_SECOND);
  });

  it('marks the ruler every ten seconds from 0:00 to the end of the tail', () => {
    const timeline = projectSketchTimeline({ composition: COMPOSITION, lanes: [], clips: [] }, []);
    expect(timeline.ticks).toEqual([
      { seconds: 0, label: '0:00', leftPixels: 0 },
      { seconds: 10, label: '0:10', leftPixels: 10 * PIXELS_PER_SECOND },
      { seconds: 20, label: '0:20', leftPixels: 20 * PIXELS_PER_SECOND },
      { seconds: 30, label: '0:30', leftPixels: 30 * PIXELS_PER_SECOND },
    ]);
  });
});

describe('selectDroppedClip', () => {
  const clip = { laneId: 'lane-a', offsetSeconds: 10 };

  it('moves a clip by the dragged distance, snapped to a whole second, and onto the lane under it', () => {
    expect(selectDroppedClip(clip, 4.6 * PIXELS_PER_SECOND, 'lane-b')).toEqual({
      laneId: 'lane-b',
      offsetSeconds: 15,
    });
  });

  it('keeps the lane when dropped outside every lane, and stops at 0:00', () => {
    expect(selectDroppedClip(clip, -40 * PIXELS_PER_SECOND, null)).toEqual({
      laneId: 'lane-a',
      offsetSeconds: 0,
    });
  });

  it('moves a clip onto the lane under it at the same second', () => {
    expect(selectDroppedClip(clip, 2, 'lane-b')).toEqual({ laneId: 'lane-b', offsetSeconds: 10 });
  });

  it('writes nothing when the clip lands where it was', () => {
    expect(selectDroppedClip(clip, 2, 'lane-a')).toBeNull();
  });
});

describe('the placement of a new clip and lane', () => {
  it('places a new clip at the second the scroll shows', () => {
    expect(selectNewClipOffsetSeconds(0)).toBe(0);
    expect(selectNewClipOffsetSeconds(83)).toBe(10);
  });

  it('puts a new lane under the last one', () => {
    expect(selectNextLanePosition([])).toBe(0);
    expect(selectNextLanePosition([DRUMS, { ...BRASS, position: 4 }])).toBe(5);
  });
});

describe('isTapKey', () => {
  it('plays a clip on Enter and leaves Space to the drag', () => {
    expect(isTapKey('Enter')).toBe(true);
    expect(isTapKey(' ')).toBe(false);
  });
});

describe('isTapRightAfterDrag', () => {
  it('ignores the tap a drag ends on, and no other', () => {
    expect(isTapRightAfterDrag(NEVER_DRAGGED_AT_MS, 0)).toBe(false);
    expect(isTapRightAfterDrag(1_000, 1_100)).toBe(true);
    expect(isTapRightAfterDrag(1_000, 1_400)).toBe(false);
  });
});

describe('the clip a tap plays', () => {
  const sketch = {
    composition: COMPOSITION,
    lanes: [DRUMS],
    clips: [
      { id: 'clip-1', laneId: 'lane-a', inspirationId: 'inspiration-1', offsetSeconds: 0 },
      { id: 'clip-2', laneId: 'lane-a', inspirationId: 'gone', offsetSeconds: 20 },
    ],
  };
  const inspiration = {
    ...CALL_ME_MAYBE,
    artist: 'Carly Rae Jepsen',
    note: 'the trumpet',
    youtubeVideoId: 'dQw4w9WgXcQ',
  };

  it('plays the passage of the tapped clip from its start to its end', () => {
    expect(selectPlayedPassage(sketch, [inspiration], 'clip-1')).toEqual({
      title: 'Call Me Maybe',
      detail: 'Carly Rae Jepsen · 0:52\u00A0→\u00A01:04',
      note: 'the trumpet',
      youtubeVideoId: 'dQw4w9WgXcQ',
      startSeconds: 52,
      endSeconds: 64,
    });
    expect(selectPlayedPassage(sketch, [{ ...inspiration, artist: '' }], 'clip-1')?.detail).toBe(
      '0:52\u00A0→\u00A01:04',
    );
  });

  it('plays nothing when no clip is tapped or its inspiration is gone', () => {
    expect(selectPlayedPassage(sketch, [inspiration], null)).toBeNull();
    expect(selectPlayedPassage(sketch, [inspiration], 'clip-2')).toBeNull();
  });

  it('names the lane a sheet is open on, or none', () => {
    expect(findLaneName(sketch, 'lane-a')).toBe('drums');
    expect(findLaneName(sketch, null)).toBeNull();
  });
});

function spell(key: ClipDragAnnouncementKey, names: ClipDragNames): string {
  return `${key}|${names.clip}|${names.lane}`;
}

describe('buildClipDragAnnouncements', () => {
  const timeline = projectSketchTimeline(
    {
      composition: COMPOSITION,
      lanes: [DRUMS, BRASS],
      clips: [
        { id: 'clip-1', laneId: 'lane-b', inspirationId: 'inspiration-1', offsetSeconds: 10 },
      ],
    },
    [CALL_ME_MAYBE],
  );
  const announcements = buildClipDragAnnouncements(timeline, spell);
  const clip = { id: 'clip-1' };

  it('names the inspiration and the lane the clip is picked up from, never an identifier', () => {
    expect(announcements.onDragStart({ active: clip })).toBe(
      'sketch.drag.pickedUp|Call Me Maybe|brass',
    );
  });

  it('names the lane under the clip, or the lane it keeps when it is outside every lane', () => {
    expect(announcements.onDragOver({ active: clip, over: { id: 'lane-a' } })).toBe(
      'sketch.drag.over|Call Me Maybe|drums',
    );
    expect(announcements.onDragOver({ active: clip, over: null })).toBe(
      'sketch.drag.outside|Call Me Maybe|brass',
    );
  });

  it('names the lane the clip lands on, its own when dropped outside the lanes', () => {
    expect(announcements.onDragEnd({ active: clip, over: { id: 'lane-a' } })).toBe(
      'sketch.drag.dropped|Call Me Maybe|drums',
    );
    expect(announcements.onDragEnd({ active: clip, over: null })).toBe(
      'sketch.drag.dropped|Call Me Maybe|brass',
    );
  });

  it('names the lane a cancelled move leaves the clip on', () => {
    expect(announcements.onDragCancel({ active: clip, over: { id: 'lane-a' } })).toBe(
      'sketch.drag.cancelled|Call Me Maybe|brass',
    );
  });

  it('says nothing for a clip or a lane the sketch no longer holds', () => {
    expect(announcements.onDragStart({ active: { id: 'gone' } })).toBeUndefined();
    expect(announcements.onDragOver({ active: clip, over: { id: 'lane-gone' } })).toBeUndefined();
  });
});
