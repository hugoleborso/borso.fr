/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  canScrollFaster,
  canScrollSlower,
  canTransposeDown,
  canTransposeUp,
  canZoomIn,
  canZoomOut,
  formatSemitoneOffset,
  SCENE_FONT_SIZE_STEP_PX,
  SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND,
} from '../../routes/catalog/scene-view.core';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';

interface SceneControlsProps {
  readonly semitones: number;
  readonly fontSizePx: number;
  readonly scrollSpeedPxPerSecond: number;
  readonly isAutoScrolling: boolean;
  readonly onTransposeBy: (semitones: number) => void;
  readonly onZoomBy: (pixels: number) => void;
  readonly onScrollSpeedBy: (pixelsPerSecond: number) => void;
  readonly onToggleAutoScroll: () => void;
}

const GROUP_CLASS = 'flex items-center gap-2 shrink-0';
const READOUT_CLASS = 'font-mono text-meta text-stage-ink-dim px-1 tabular-nums';

// @FollowsBlueprint organism-presentational
export function SceneControls({
  semitones,
  fontSizePx,
  scrollSpeedPxPerSecond,
  isAutoScrolling,
  onTransposeBy,
  onZoomBy,
  onScrollSpeedBy,
  onToggleAutoScroll,
}: SceneControlsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-x-3 overflow-x-auto lg:overflow-visible lg:flex-wrap gap-y-2 p-1 [scrollbar-width:none]">
      <div className={GROUP_CLASS}>
        <IconButton
          variant="stage"
          size="sm"
          onClick={() => onTransposeBy(-1)}
          disabled={!canTransposeDown(semitones)}
          icon="minus"
          label={t('scene.transposeDown')}
        />
        <span className={READOUT_CLASS}>{formatSemitoneOffset(semitones)}</span>
        <IconButton
          variant="stage"
          size="sm"
          onClick={() => onTransposeBy(1)}
          disabled={!canTransposeUp(semitones)}
          icon="plus"
          label={t('scene.transposeUp')}
        />
      </div>

      <div className={GROUP_CLASS}>
        <IconButton
          variant="stage"
          size="sm"
          onClick={() => onZoomBy(-SCENE_FONT_SIZE_STEP_PX)}
          disabled={!canZoomOut(fontSizePx)}
          icon="minus"
          label={t('scene.zoomOut')}
        />
        <IconButton
          variant="stage"
          size="sm"
          onClick={() => onZoomBy(SCENE_FONT_SIZE_STEP_PX)}
          disabled={!canZoomIn(fontSizePx)}
          icon="plus"
          label={t('scene.zoomIn')}
        />
      </div>

      <div className={GROUP_CLASS}>
        <Button
          icon={isAutoScrolling ? 'pause' : 'play'}
          variant={isAutoScrolling ? 'primary' : 'stage'}
          size="sm"
          onClick={onToggleAutoScroll}
          aria-pressed={isAutoScrolling}
        >
          {isAutoScrolling ? t('scene.autoScrollStop') : t('scene.autoScroll')}
        </Button>
        <IconButton
          variant="stage"
          size="sm"
          onClick={() => onScrollSpeedBy(-SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND)}
          disabled={!canScrollSlower(scrollSpeedPxPerSecond)}
          icon="minus"
          label={t('scene.scrollSlower')}
        />
        <span className={READOUT_CLASS}>{scrollSpeedPxPerSecond}</span>
        <IconButton
          variant="stage"
          size="sm"
          onClick={() => onScrollSpeedBy(SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND)}
          disabled={!canScrollFaster(scrollSpeedPxPerSecond)}
          icon="plus"
          label={t('scene.scrollFaster')}
        />
      </div>
    </div>
  );
}
