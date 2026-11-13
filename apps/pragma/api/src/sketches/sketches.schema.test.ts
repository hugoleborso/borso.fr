import { randomUUID } from 'node:crypto';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { SKETCH_LANE_NAME_MAX_LENGTH } from '@domain/input-limits.core';
import { SKETCH_OFFSET_LAST_SECOND } from '@domain/sketch.core';
import {
  sketchClipCreateSchema,
  sketchClipMoveSchema,
  sketchClipTable,
  sketchLaneCreateSchema,
  sketchLaneRenameSchema,
  sketchLaneTable,
} from './sketches.schema';

// @FollowsBlueprint test-pure-unit
describe('the sketch input', () => {
  it('refuses a negative or fractional offset', () => {
    const laneId = randomUUID();
    expect(sketchClipMoveSchema.safeParse({ laneId, offsetSeconds: 4 }).success).toBe(true);
    expect(sketchClipMoveSchema.safeParse({ laneId, offsetSeconds: -1 }).success).toBe(false);
    expect(sketchClipMoveSchema.safeParse({ laneId, offsetSeconds: 2.5 }).success).toBe(false);
    expect(
      sketchClipMoveSchema.safeParse({ laneId, offsetSeconds: SKETCH_OFFSET_LAST_SECOND + 1 })
        .success,
    ).toBe(false);
  });

  it('places a clip only with its id, lane, inspiration and a whole offset', () => {
    const clip = {
      id: randomUUID(),
      laneId: randomUUID(),
      inspirationId: randomUUID(),
      offsetSeconds: 0,
    };
    expect(sketchClipCreateSchema.safeParse(clip).success).toBe(true);
    expect(sketchClipCreateSchema.safeParse({ ...clip, inspirationId: 'call-me' }).success).toBe(
      false,
    );
  });

  it('trims a lane name and refuses a blank one or one past the limit', () => {
    const lane = { id: randomUUID(), name: ' drums ', position: 0 };
    expect(sketchLaneCreateSchema.parse(lane).name).toBe('drums');
    expect(sketchLaneCreateSchema.safeParse({ ...lane, position: -1 }).success).toBe(false);
    expect(sketchLaneRenameSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(
      sketchLaneRenameSchema.safeParse({ name: 'x'.repeat(SKETCH_LANE_NAME_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
  });

  it('indexes lanes by song and clips by lane and by inspiration', () => {
    expect(getTableConfig(sketchLaneTable).indexes.map((index) => index.config.name)).toEqual([
      'sketch_lane_song_idx',
    ]);
    expect(getTableConfig(sketchClipTable).indexes.map((index) => index.config.name)).toEqual([
      'sketch_clip_lane_idx',
      'sketch_clip_inspiration_idx',
    ]);
  });
});
