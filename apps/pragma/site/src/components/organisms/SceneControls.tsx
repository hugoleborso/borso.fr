/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatSemitoneOffset,
  SCENE_FONT_SIZE_MAX_PX,
  SCENE_FONT_SIZE_MIN_PX,
  SCENE_FONT_SIZE_STEP_PX,
  SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND,
  SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND,
  SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND,
  SCENE_TRANSPOSE_MAX_SEMITONES,
  SCENE_TRANSPOSE_MIN_SEMITONES,
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
          disabled={semitones <= SCENE_TRANSPOSE_MIN_SEMITONES}
          aria-label={t('scene.transposeDown')}
        >
          -1
        </Button>
        <span className={READOUT_CLASS}>{formatSemitoneOffset(semitones)}</span>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onTransposeBy(1)}
          disabled={semitones >= SCENE_TRANSPOSE_MAX_SEMITONES}
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
          disabled={fontSizePx <= SCENE_FONT_SIZE_MIN_PX}
          aria-label={t('scene.zoomOut')}
        >
          A−
        </Button>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onZoomBy(SCENE_FONT_SIZE_STEP_PX)}
          disabled={fontSizePx >= SCENE_FONT_SIZE_MAX_PX}
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
          disabled={scrollSpeedPxPerSecond <= SCENE_SCROLL_SPEED_MIN_PX_PER_SECOND}
          aria-label={t('scene.scrollSlower')}
        >
          −
        </Button>
        <span className={READOUT_CLASS}>{scrollSpeedPxPerSecond}</span>
        <Button
          variant="stage"
          size="sm"
          onClick={() => onScrollSpeedBy(SCENE_SCROLL_SPEED_STEP_PX_PER_SECOND)}
          disabled={scrollSpeedPxPerSecond >= SCENE_SCROLL_SPEED_MAX_PX_PER_SECOND}
          aria-label={t('scene.scrollFaster')}
        >
          +
        </Button>
      </div>
    </div>
  );
}
