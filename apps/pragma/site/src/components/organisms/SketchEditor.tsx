/** @Feature sketches */

import { SKETCH_LANE_NAME_MAX_LENGTH } from '@domain/input-limits.core';
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
import type { InspirationFieldsShape } from '../../lib/queries/inspiration-cache.core';
import {
  type InspirationRecord,
  useCreateInspiration,
} from '../../lib/queries/inspirations.queries';
import { useSignedInMember } from '../../lib/queries/me.queries';
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
import { startInspirationForm } from './inspiration-form.core';
import { InspirationForm } from './InspirationForm';
import { InspirationPickerSheet } from './InspirationPickerSheet';
import { SketchClipSheet } from './SketchClipSheet';
import { NameSheet } from './NameSheet';
import { SketchTimeline } from './SketchTimeline';

export interface SketchEditorProps {
  readonly sketch: SketchRecord;
  readonly inspirations: readonly InspirationRecord[];
}

interface OpenLaneSheet {
  readonly laneId: string | null;
}

interface ClipTarget {
  readonly laneId: string;
  readonly offsetSeconds: number;
}

const NEW_INSPIRATION_VALUES = startInspirationForm(null);

// @FollowsBlueprint organism-query-owning
export function SketchEditor({ sketch, inspirations }: SketchEditorProps): JSX.Element {
  const { t } = useTranslation();
  const compositionId = sketch.composition.id;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const addLane = useAddSketchLane();
  const renameLane = useRenameSketchLane();
  const deleteLane = useDeleteSketchLane();
  const placeClip = usePlaceSketchClip();
  const moveClip = useMoveSketchClip();
  const removeClip = useRemoveSketchClip();
  const [laneSheet, setLaneSheet] = useState<OpenLaneSheet | null>(null);
  const createInspiration = useCreateInspiration();
  const signedInMember = useSignedInMember();
  const [pickerTarget, setPickerTarget] = useState<ClipTarget | null>(null);
  const [newInspirationTarget, setNewInspirationTarget] = useState<ClipTarget | null>(null);
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
        compositionId,
        id: crypto.randomUUID(),
        name,
        position: selectNextLanePosition(sketch.lanes),
      });
    } else {
      renameLane.mutate({ compositionId, laneId, name });
    }
    setLaneSheet(null);
  };

  const openPicker = (laneId: string): void => {
    setPickerTarget({
      laneId,
      offsetSeconds: selectNewClipOffsetSeconds(scrollerRef.current?.scrollLeft ?? 0),
    });
  };

  const placeOnTarget = (target: ClipTarget, inspirationId: string): void => {
    placeClip.mutate({ compositionId, id: crypto.randomUUID(), inspirationId, ...target });
  };

  const placeInspiration = (inspirationId: string): void => {
    const target = pickerTarget;
    setPickerTarget(null);
    if (target === null) return;
    placeOnTarget(target, inspirationId);
  };

  const startNewInspiration = (): void => {
    setNewInspirationTarget(pickerTarget);
    setPickerTarget(null);
  };

  const saveNewInspiration = async (fields: InspirationFieldsShape): Promise<void> => {
    const target = newInspirationTarget;
    if (target === null) return;
    const inspirationId = crypto.randomUUID();
    await createInspiration.mutateAsync({
      inspiration: { id: inspirationId, ...fields },
      author: signedInMember.data ?? null,
    });
    setNewInspirationTarget(null);
    placeOnTarget(target, inspirationId);
  };

  const moveClipTo = (clipId: string, position: ClipPosition): void => {
    moveClip.mutate({ compositionId, clipId, ...position });
  };

  const removePlayingClip = (): void => {
    const clipId = playingClipId;
    setPlayingClipId(null);
    if (clipId === null) return;
    removeClip.mutate({ compositionId, clipId });
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
        onAddClip={openPicker}
      />
      {laneSheet === null ? null : (
        <NameSheet
          key={laneSheet.laneId ?? 'new'}
          sheetTitle={laneSheet.laneId === null ? t('sketch.newLane') : t('sketch.lane')}
          fieldLabel={t('sketch.laneName')}
          maxLength={SKETCH_LANE_NAME_MAX_LENGTH}
          deleteLabel={t('sketch.deleteLane')}
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
      {pickerTarget === null ? null : (
        <InspirationPickerSheet
          inspirations={inspirations.map(projectInspirationCard)}
          onPick={placeInspiration}
          onCreate={startNewInspiration}
          onClose={() => setPickerTarget(null)}
        />
      )}
      {newInspirationTarget === null ? null : (
        <InspirationForm
          isNew
          initialValues={NEW_INSPIRATION_VALUES}
          onSave={saveNewInspiration}
          onClose={() => setNewInspirationTarget(null)}
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
            deleteLane.mutate({ compositionId, laneId: pendingLaneDeletionId });
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
