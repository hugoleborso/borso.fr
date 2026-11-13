/** @Feature sketches */

import { selectTimelineLengthSeconds, snapOffsetSeconds } from '@domain/sketch.core';
import { formatDuration } from '../../components/molecules/song-duration.utils';
import type { SketchClipShape, SketchShape } from '../../lib/queries/sketch-cache.core';
import { DETAIL_SEPARATOR, formatPassageRange } from '../inspirations/inspirations-page.core';

export const PIXELS_PER_SECOND = 8;
export const RULER_TICK_SECONDS = 10;
export const TAP_AFTER_DRAG_MILLISECONDS = 400;

export interface PassageSource {
  readonly id: string;
  readonly title: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
}

export interface TimelineClip {
  readonly id: string;
  readonly laneId: string;
  readonly inspirationId: string;
  readonly offsetSeconds: number;
  readonly title: string;
  readonly leftPixels: number;
  readonly widthPixels: number;
}

export interface TimelineLane {
  readonly id: string;
  readonly name: string;
  readonly clips: readonly TimelineClip[];
}

export interface TimelineTick {
  readonly seconds: number;
  readonly label: string;
  readonly leftPixels: number;
}

export interface SketchTimelineView {
  readonly lanes: readonly TimelineLane[];
  readonly ticks: readonly TimelineTick[];
  readonly widthPixels: number;
}

export interface ClipPosition {
  readonly laneId: string;
  readonly offsetSeconds: number;
}

function toPixels(seconds: number): number {
  return seconds * PIXELS_PER_SECOND;
}

function projectClip(clip: SketchClipShape, passage: PassageSource): TimelineClip {
  return {
    id: clip.id,
    laneId: clip.laneId,
    inspirationId: clip.inspirationId,
    offsetSeconds: clip.offsetSeconds,
    title: passage.title,
    leftPixels: toPixels(clip.offsetSeconds),
    widthPixels: toPixels(passage.endSeconds - passage.startSeconds),
  };
}

function listTicks(lengthSeconds: number): TimelineTick[] {
  const tickCount = Math.floor(lengthSeconds / RULER_TICK_SECONDS) + 1;
  return Array.from({ length: tickCount }, (_unused, index) => {
    const seconds = index * RULER_TICK_SECONDS;
    return { seconds, label: formatDuration(seconds), leftPixels: toPixels(seconds) };
  });
}

// @FollowsBlueprint core-view-projection-joining-two-lists
export function projectSketchTimeline(
  sketch: SketchShape,
  passages: readonly PassageSource[],
): SketchTimelineView {
  const passageById = new Map(passages.map((passage) => [passage.id, passage]));
  const clips = sketch.clips.flatMap((clip) => {
    const passage = passageById.get(clip.inspirationId);
    return passage === undefined ? [] : [projectClip(clip, passage)];
  });
  const lengthSeconds = selectTimelineLengthSeconds(
    clips.map((clip) => clip.offsetSeconds + clip.widthPixels / PIXELS_PER_SECOND),
  );
  return {
    lanes: sketch.lanes.map((lane) => ({
      id: lane.id,
      name: lane.name,
      clips: clips.filter((clip) => clip.laneId === lane.id),
    })),
    ticks: listTicks(lengthSeconds),
    widthPixels: toPixels(lengthSeconds),
  };
}

export function selectDroppedClip(
  clip: ClipPosition,
  deltaXPixels: number,
  overLaneId: string | null,
): ClipPosition | null {
  const laneId = overLaneId ?? clip.laneId;
  const offsetSeconds = snapOffsetSeconds(clip.offsetSeconds + deltaXPixels / PIXELS_PER_SECOND);
  if (laneId === clip.laneId && offsetSeconds === clip.offsetSeconds) return null;
  return { laneId, offsetSeconds };
}

export function selectNewClipOffsetSeconds(scrollLeftPixels: number): number {
  return snapOffsetSeconds(scrollLeftPixels / PIXELS_PER_SECOND);
}

export function selectNextLanePosition(lanes: readonly { readonly position: number }[]): number {
  return Math.max(-1, ...lanes.map((lane) => lane.position)) + 1;
}

const TAP_KEY = 'Enter';

export function isTapKey(key: string): boolean {
  return key === TAP_KEY;
}

export const NEVER_DRAGGED_AT_MS = Number.NEGATIVE_INFINITY;

export function isTapRightAfterDrag(lastDragEndedAtMs: number, nowMs: number): boolean {
  return nowMs - lastDragEndedAtMs < TAP_AFTER_DRAG_MILLISECONDS;
}

export interface PlayableInspiration extends PassageSource {
  readonly artist: string;
  readonly note: string;
  readonly youtubeVideoId: string;
}

export interface PlayedPassage {
  readonly title: string;
  readonly detail: string;
  readonly note: string;
  readonly youtubeVideoId: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
}

export function selectPlayedPassage(
  sketch: SketchShape,
  inspirations: readonly PlayableInspiration[],
  clipId: string | null,
): PlayedPassage | null {
  const clip = sketch.clips.find((candidate) => candidate.id === clipId);
  const inspiration = inspirations.find((candidate) => candidate.id === clip?.inspirationId);
  if (inspiration === undefined) return null;
  const range = formatPassageRange(inspiration);
  return {
    title: inspiration.title,
    detail: [inspiration.artist, range].filter((part) => part.length > 0).join(DETAIL_SEPARATOR),
    note: inspiration.note,
    youtubeVideoId: inspiration.youtubeVideoId,
    startSeconds: inspiration.startSeconds,
    endSeconds: inspiration.endSeconds,
  };
}

export function findLaneName(sketch: SketchShape, laneId: string | null): string | null {
  return sketch.lanes.find((lane) => lane.id === laneId)?.name ?? null;
}
