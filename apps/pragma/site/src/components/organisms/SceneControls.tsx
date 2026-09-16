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
import { Icon } from '../atoms/Icon';

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

const GROUP_CLASS = 'flex items-center gap-1.5 shrink-0';
const READOUT_CLASS = 'font-mono text-xs text-stage-ink-dim px-1 tabular-nums';

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
    <div className="flex items-center gap-x-3 overflow-x-auto lg:overflow-visible lg:flex-wrap gap-y-2 py-0.5 [scrollbar-width:none]">
      <div className={GROUP_CLASS}>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onTransposeBy(-1)}
          disabled={!canTransposeDown(semitones)}
          aria-label={t('scene.transposeDown')}
        >
          -1
        </Button>
        <span className={READOUT_CLASS}>{formatSemitoneOffset(semitones)}</span>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onTransposeBy(1)}
          disabled={!canTransposeUp(semitones)}
          aria-label={t('scene.transposeUp')}
        >
          +1
        </Button>
      </div>

      <div className={GROUP_CLASS}>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onZoomBy(-SCENE_FONT_SIZE_STEP_PX)}
          disabled={!canZoomOut(fontSizePx)}
          aria-label={t('scene.zoomOut')}
        >
          A−
        </Button>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onZoomBy(SCENE_FONT_SIZE_STEP_PX)}
          disabled={!canZoomIn(fontSizePx)}
          aria-label={t('scene.zoomIn')}
        >
          A+
        </Button>
      </div>

      <div className={GROUP_CLASS}>
        <Button
          variant={isAutoScrolling ? 'accent' : 'stage'}
          size="sm"
          onClick={onToggleAutoScroll}
          aria-pressed={isAutoScrolling}
        >
          <Icon name={isAutoScrolling ? 'pause' : 'play'} size={12} />
          {isAutoScrolling ? t('scene.autoScrollStop') : t('scene.autoScroll')}
        </Button>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onScrollSpeedBy(-SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND)}
          disabled={!canScrollSlower(scrollSpeedPxPerSecond)}
          aria-label={t('scene.scrollSlower')}
        >
          −
        </Button>
        <span className={READOUT_CLASS}>{scrollSpeedPxPerSecond}</span>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onScrollSpeedBy(SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND)}
          disabled={!canScrollFaster(scrollSpeedPxPerSecond)}
          aria-label={t('scene.scrollFaster')}
        >
          +
        </Button>
      </div>
    </div>
  );
}
