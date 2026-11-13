/** @Feature sketches */

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { JSX, RefObject } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ClipPosition,
  isTapRightAfterDrag,
  type SketchTimelineView,
  selectDroppedClip,
  type TimelineClip,
  type TimelineLane,
} from '../../routes/compos/sketch-timeline.core';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import { IconButton } from '../atoms/IconButton';
import { SketchClipBlock } from '../molecules/SketchClipBlock';

export interface SketchTimelineProps {
  readonly timeline: SketchTimelineView;
  readonly scrollerRef: RefObject<HTMLDivElement | null>;
  readonly clipLabelOf: (clip: TimelineClip) => string;
  readonly onClipMoved: (clipId: string, position: ClipPosition) => void;
  readonly onClipTapped: (clip: TimelineClip) => void;
  readonly onLaneOpened: (laneId: string) => void;
  readonly onAddClip: (laneId: string) => void;
}

const DRAG_ACTIVATION_DISTANCE_PX = 6;
const DRAG_TOUCH_DELAY_MS = 200;
const DRAG_TOUCH_TOLERANCE_PX = 8;
const ROW_CLASS = 'h-12 border-t border-rule';
const KEYBOARD_DRAG_CODES = { start: ['Space'], cancel: ['Escape'], end: ['Space'] };

interface SketchLaneTrackProps {
  readonly lane: TimelineLane;
  readonly clipLabelOf: (clip: TimelineClip) => string;
  readonly onClipTapped: (clip: TimelineClip) => void;
}

function SketchLaneTrack({ lane, clipLabelOf, onClipTapped }: SketchLaneTrackProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });
  return (
    <div
      ref={setNodeRef}
      data-lane-id={lane.id}
      className={composeClassName('relative', ROW_CLASS, isOver && 'bg-hover')}
    >
      {lane.clips.map((clip) => (
        <SketchClipBlock
          key={clip.id}
          clip={clip}
          label={clipLabelOf(clip)}
          onTap={() => onClipTapped(clip)}
        />
      ))}
    </div>
  );
}

// @FollowsBlueprint organism-presentational
export function SketchTimeline({
  timeline,
  scrollerRef,
  clipLabelOf,
  onClipMoved,
  onClipTapped,
  onLaneOpened,
  onAddClip,
}: SketchTimelineProps): JSX.Element {
  const { t } = useTranslation();
  const lastDragEndedAt = useRef<number | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: DRAG_TOUCH_DELAY_MS, tolerance: DRAG_TOUCH_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_DRAG_CODES }),
  );
  const clipById = new Map(
    timeline.lanes.flatMap((lane) => lane.clips).map((clip) => [clip.id, clip]),
  );

  const dropClip = (event: DragEndEvent): void => {
    lastDragEndedAt.current = Date.now();
    const clip = clipById.get(String(event.active.id));
    if (clip === undefined) return;
    const overLaneId = event.over === null ? null : String(event.over.id);
    const position = selectDroppedClip(clip, event.delta.x, overLaneId);
    if (position === null) return;
    onClipMoved(clip.id, position);
  };

  const tapClip = (clip: TimelineClip): void => {
    const isEndOfDrag = isTapRightAfterDrag(lastDragEndedAt.current, Date.now());
    if (isEndOfDrag) return;
    onClipTapped(clip);
  };

  return (
    <div className="flex gap-2">
      <ul
        className="m-0 flex w-32 shrink-0 list-none flex-col p-0 sm:w-40"
        aria-label={t('sketch.lanes')}
      >
        <li aria-hidden="true" className="h-6" />
        {timeline.lanes.map((lane) => (
          <li key={lane.id} className={composeClassName('flex items-center gap-0.5', ROW_CLASS)}>
            <Button
              icon="edit"
              variant="quiet"
              size="sm"
              className="min-w-0 flex-1 justify-start px-1.5"
              aria-label={t('sketch.renameLane', { name: lane.name })}
              onClick={() => onLaneOpened(lane.id)}
            >
              <span className="truncate">{lane.name}</span>
            </Button>
            <IconButton
              icon="plus"
              size="sm"
              variant="secondary"
              label={t('sketch.addClip', { name: lane.name })}
              onClick={() => onAddClip(lane.id)}
            />
          </li>
        ))}
      </ul>
      <div
        ref={scrollerRef}
        role="region"
        aria-label={t('sketch.timeline')}
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
      >
        <div className="relative min-w-full" style={{ width: timeline.widthPixels }}>
          <div className="relative h-6" aria-hidden="true">
            {timeline.ticks.map((tick) => (
              <span
                key={tick.seconds}
                className="absolute top-0 h-full border-l border-rule-strong pl-1 font-mono text-label text-ink-soft"
                style={{ left: tick.leftPixels }}
              >
                {tick.label}
              </span>
            ))}
          </div>
          <DndContext
            sensors={sensors}
            onDragEnd={dropClip}
            onDragCancel={() => {
              lastDragEndedAt.current = Date.now();
            }}
          >
            {timeline.lanes.map((lane) => (
              <SketchLaneTrack
                key={lane.id}
                lane={lane}
                clipLabelOf={clipLabelOf}
                onClipTapped={tapClip}
              />
            ))}
          </DndContext>
        </div>
      </div>
    </div>
  );
}
