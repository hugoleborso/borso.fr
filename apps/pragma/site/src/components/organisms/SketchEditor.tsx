/** @Feature sketches */

import type { JSX } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ClipPosition,
  findLaneName,
  projectSketchTimeline,
  selectNewClipOffsetSeconds,
  selectNextLanePosition,
  selectPlayedPassage,
  type TimelineClip,
} from '../../routes/compos/sketch-timeline.core';
import { projectInspirationCard } from '../../routes/inspirations/inspirations-page.core';
import type { InspirationRecord } from '../../lib/queries/inspirations.queries';
import { readSketchRefusal } from '../../lib/queries/sketch-refusal.core';
import {
  type SketchRecord,
  useAddSketchLane,
  useDeleteSketchLane,
  useMoveSketchClip,
  usePlaceSketchClip,
  useRemoveSketchClip,
  useRenameSketchLane,
} from '../../lib/queries/sketches.queries';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { HintText } from '../atoms/HintText';
import { ConfirmDialog } from '../molecules/ConfirmDialog';
import { formatDuration } from '../molecules/song-duration.utils';
import { InspirationPickerSheet } from './InspirationPickerSheet';
import { SketchClipSheet } from './SketchClipSheet';
import { SketchLaneSheet } from './SketchLaneSheet';
import { SketchTimeline } from './SketchTimeline';

export interface SketchEditorProps {
  readonly sketch: SketchRecord;
  readonly inspirations: readonly InspirationRecord[];
}

interface OpenLaneSheet {
  readonly laneId: string | null;
}

// @FollowsBlueprint organism-query-owning
export function SketchEditor({ sketch, inspirations }: SketchEditorProps): JSX.Element {
  const { t } = useTranslation();
  const { songId } = sketch;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const addLane = useAddSketchLane();
  const renameLane = useRenameSketchLane();
  const deleteLane = useDeleteSketchLane();
  const placeClip = usePlaceSketchClip();
  const moveClip = useMoveSketchClip();
  const removeClip = useRemoveSketchClip();
  const [laneSheet, setLaneSheet] = useState<OpenLaneSheet | null>(null);
  const [pickerLaneId, setPickerLaneId] = useState<string | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [pendingLaneDeletionId, setPendingLaneDeletionId] = useState<string | null>(null);

  const timeline = projectSketchTimeline(sketch, inspirations);
  const playedPassage = selectPlayedPassage(sketch, inspirations, playingClipId);
  const sheetLaneName = findLaneName(sketch, laneSheet?.laneId ?? null);
  const refusal = readSketchRefusal(
    placeClip.error ??
      moveClip.error ??
      removeClip.error ??
      renameLane.error ??
      deleteLane.error ??
      addLane.error,
  );

  const clipLabelOf = (clip: TimelineClip): string =>
    t('sketch.clipLabel', { title: clip.title, start: formatDuration(clip.offsetSeconds) });

  const saveLane = (name: string): void => {
    const laneId = laneSheet?.laneId ?? null;
    if (laneId === null) {
      addLane.mutate({
        songId,
        id: crypto.randomUUID(),
        name,
        position: selectNextLanePosition(sketch.lanes),
      });
    } else {
      renameLane.mutate({ songId, laneId, name });
    }
    setLaneSheet(null);
  };

  const placeInspiration = (inspirationId: string): void => {
    const laneId = pickerLaneId;
    setPickerLaneId(null);
    if (laneId === null) return;
    placeClip.mutate({
      songId,
      id: crypto.randomUUID(),
      laneId,
      inspirationId,
      offsetSeconds: selectNewClipOffsetSeconds(scrollerRef.current?.scrollLeft ?? 0),
    });
  };

  const moveClipTo = (clipId: string, position: ClipPosition): void => {
    moveClip.mutate({ songId, clipId, ...position });
  };

  const removePlayingClip = (): void => {
    const clipId = playingClipId;
    setPlayingClipId(null);
    if (clipId === null) return;
    removeClip.mutate({ songId, clipId });
  };

  return (
    <div className="flex flex-col gap-3">
      {refusal === null ? null : (
        <HintText tone="danger" role="alert">
          {t('sketch.reloaded')}
        </HintText>
      )}
      {sketch.lanes.length > 0 ? null : <HintText tone="muted">{t('sketch.empty')}</HintText>}
      <SketchTimeline
        timeline={timeline}
        scrollerRef={scrollerRef}
        clipLabelOf={clipLabelOf}
        onClipMoved={moveClipTo}
        onClipTapped={(clip) => setPlayingClipId(clip.id)}
        onLaneOpened={(laneId) => setLaneSheet({ laneId })}
        onAddClip={setPickerLaneId}
      />
      {laneSheet === null ? null : (
        <SketchLaneSheet
          key={laneSheet.laneId ?? 'new'}
          isNew={laneSheet.laneId === null}
          initialName={sheetLaneName ?? ''}
          onSave={saveLane}
          onDelete={() => {
            setPendingLaneDeletionId(laneSheet.laneId);
            setLaneSheet(null);
          }}
          onClose={() => setLaneSheet(null)}
        />
      )}
      {pickerLaneId === null ? null : (
        <InspirationPickerSheet
          inspirations={inspirations.map(projectInspirationCard)}
          onPick={placeInspiration}
          onClose={() => setPickerLaneId(null)}
        />
      )}
      {playedPassage === null ? null : (
        <SketchClipSheet
          passage={playedPassage}
          onRemove={removePlayingClip}
          onClose={() => setPlayingClipId(null)}
        />
      )}
      {pendingLaneDeletionId === null ? null : (
        <ConfirmDialog
          question={t('sketch.deleteLaneConfirm')}
          confirmLabel={t('sketch.deleteLane')}
          onConfirm={() => {
            deleteLane.mutate({ songId, laneId: pendingLaneDeletionId });
            setPendingLaneDeletionId(null);
          }}
          onCancel={() => setPendingLaneDeletionId(null)}
        />
      )}
      <BottomActions>
        <Button
          variant="primary"
          size="lg"
          icon="plus"
          onClick={() => setLaneSheet({ laneId: null })}
        >
          {t('sketch.addLane')}
        </Button>
      </BottomActions>
    </div>
  );
}
