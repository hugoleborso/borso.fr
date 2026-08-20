import { useTranslation } from 'react-i18next';
import {
  type AnimationMode,
  selectInkbloomAnimation,
  selectInkbloomDelayMs,
} from '../../art/mondrian/animation.core';
import type { ColoredRect } from '../../art/mondrian/painting.utils';
import type { Palette } from '../../art/mondrian/palettes.utils';
import { useAnimation } from '../../art/mondrian/use-animation';
import { MondrianRect } from '../atoms/MondrianRect';

const FRAME_CLASS_NAME =
  "relative block h-full w-full cursor-pointer appearance-none overflow-hidden border-none bg-atelier-frame p-0 shadow-atelier isolate after:pointer-events-none after:absolute after:inset-0 after:z-[5] after:bg-[image:var(--vignette-atelier)] after:content-['']";

interface MondrianFrameProps {
  rectangles: readonly ColoredRect[];
  palette: Palette;
  lineWeight: number;
  drawKey: string;
  animationMode: AnimationMode;
  isReducedMotion: boolean;
  onCompose: () => void;
}

// @FollowsBlueprint organism-presentational
export function MondrianFrame({
  rectangles,
  palette,
  lineWeight,
  drawKey,
  animationMode,
  isReducedMotion,
  onCompose,
}: MondrianFrameProps) {
  const { t } = useTranslation();
  const setCanvasNode = useAnimation(animationMode, isReducedMotion);
  const inkbloom = selectInkbloomAnimation(isReducedMotion);

  return (
    <button
      type="button"
      className={FRAME_CLASS_NAME}
      style={{ background: palette.bg }}
      onClick={onCompose}
      aria-label={t('mondrian.stage.frame-label')}
    >
      <div className="relative h-full w-full origin-center" ref={setCanvasNode}>
        {rectangles.map((rectangle, rectangleIndex) => (
          <MondrianRect
            key={`${drawKey}-${rectangle.id}`}
            rectangle={rectangle}
            lineColor={palette.line}
            lineWeight={lineWeight}
            animationName={inkbloom.name}
            animationDurationMs={inkbloom.durationMs}
            animationDelayMs={selectInkbloomDelayMs(
              rectangleIndex,
              rectangles.length,
              rectangle.id,
              isReducedMotion,
            )}
          />
        ))}
      </div>
    </button>
  );
}
