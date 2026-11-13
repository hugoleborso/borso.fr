/** @Feature sketches */

export interface SketchLaneShape {
  readonly id: string;
  readonly songId: string;
  readonly name: string;
  readonly position: number;
}

export interface SketchClipShape {
  readonly id: string;
  readonly laneId: string;
  readonly inspirationId: string;
  readonly offsetSeconds: number;
}

export interface SketchShape {
  readonly songId: string;
  readonly lanes: readonly SketchLaneShape[];
  readonly clips: readonly SketchClipShape[];
}

export interface ClipMove {
  readonly clipId: string;
  readonly laneId: string;
  readonly offsetSeconds: number;
}

function orderLanes(lanes: readonly SketchLaneShape[]): SketchLaneShape[] {
  return lanes.toSorted(
    (first, second) => first.position - second.position || first.id.localeCompare(second.id),
  );
}

function withoutId<Row extends { readonly id: string }>(rows: readonly Row[], id: string): Row[] {
  return rows.filter((row) => row.id !== id);
}

// @FollowsBlueprint core-view-projection
export function settleLaneInSketch(sketch: SketchShape, lane: SketchLaneShape): SketchShape {
  return { ...sketch, lanes: orderLanes([...withoutId(sketch.lanes, lane.id), lane]) };
}

export function renameLaneInSketch(sketch: SketchShape, laneId: string, name: string): SketchShape {
  return {
    ...sketch,
    lanes: sketch.lanes.map((lane) => (lane.id === laneId ? { ...lane, name } : lane)),
  };
}

export function removeLaneFromSketch(sketch: SketchShape, laneId: string): SketchShape {
  return {
    ...sketch,
    lanes: withoutId(sketch.lanes, laneId),
    clips: sketch.clips.filter((clip) => clip.laneId !== laneId),
  };
}

export function settleClipInSketch(sketch: SketchShape, clip: SketchClipShape): SketchShape {
  return { ...sketch, clips: [...withoutId(sketch.clips, clip.id), clip] };
}

export function moveClipInSketch(sketch: SketchShape, move: ClipMove): SketchShape {
  return {
    ...sketch,
    clips: sketch.clips.map((clip) =>
      clip.id === move.clipId
        ? { ...clip, laneId: move.laneId, offsetSeconds: move.offsetSeconds }
        : clip,
    ),
  };
}

export function removeClipFromSketch(sketch: SketchShape, clipId: string): SketchShape {
  return { ...sketch, clips: withoutId(sketch.clips, clipId) };
}
