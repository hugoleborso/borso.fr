import { useTranslation } from 'react-i18next';
import {
  type AnimationMode,
  selectInkbloomAnimation,
  selectInkbloomDelayMs,
} from '../../art/mondrian/animation.core';
import type { ColoredRect } from '../../art/mondrian/painting.utils';
import type { Palette } from '../../art/mondrian/palettes.utils';
import { useAnimation } from '../../art/mondrian/use-animation';

const PERCENTAGE_SCALE = 100;
const HALF = 2;
const INKBLOOM_EASING = 'cubic-bezier(.2,.7,.2,1)';

interface MondrianFrameProps {
  rectangles: readonly ColoredRect[];
  palette: Palette;
  lineWeight: number;
  drawKey: string;
  animationMode: AnimationMode;
  isReducedMotion: boolean;
  onCompose: () => void;
}

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
      className="frame"
      style={{ background: palette.bg }}
      onClick={onCompose}
      aria-label={t('mondrian.stage.frame-label')}
    >
      <div className="canvas" ref={setCanvasNode}>
        {rectangles.map((rectangle, rectangleIndex) => (
          <div
            key={`${drawKey}-${rectangle.id}`}
            className="rect"
            style={{
              left: `${rectangle.x * PERCENTAGE_SCALE}%`,
              top: `${rectangle.y * PERCENTAGE_SCALE}%`,
              width: `${rectangle.width * PERCENTAGE_SCALE}%`,
              height: `${rectangle.height * PERCENTAGE_SCALE}%`,
              background: rectangle.fill,
              outline: `${lineWeight}px solid ${palette.line}`,
              outlineOffset: `-${lineWeight / HALF}px`,
              animation: `${inkbloom.name} ${inkbloom.durationMs}ms ${INKBLOOM_EASING} both`,
              animationDelay: `${selectInkbloomDelayMs(
                rectangleIndex,
                rectangles.length,
                rectangle.id,
                isReducedMotion,
              )}ms`,
            }}
          />
        ))}
      </div>
    </button>
  );
}
