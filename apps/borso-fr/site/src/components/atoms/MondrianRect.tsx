import type { ColoredRect } from '../../art/mondrian/painting.utils';

const PERCENTAGE_SCALE = 100;
const HALF = 2;
const INKBLOOM_EASING = 'cubic-bezier(.2,.7,.2,1)';

interface MondrianRectProps {
  rectangle: ColoredRect;
  lineColor: string;
  lineWeight: number;
  animationName: string;
  animationDurationMs: number;
  animationDelayMs: number;
}

// @FollowsBlueprint atom-plain
export function MondrianRect({
  rectangle,
  lineColor,
  lineWeight,
  animationName,
  animationDurationMs,
  animationDelayMs,
}: MondrianRectProps) {
  return (
    <div
      className="rect pointer-events-none absolute origin-center"
      style={{
        left: `${rectangle.x * PERCENTAGE_SCALE}%`,
        top: `${rectangle.y * PERCENTAGE_SCALE}%`,
        width: `${rectangle.width * PERCENTAGE_SCALE}%`,
        height: `${rectangle.height * PERCENTAGE_SCALE}%`,
        background: rectangle.fill,
        outline: `${lineWeight}px solid ${lineColor}`,
        outlineOffset: `-${lineWeight / HALF}px`,
        animation: `${animationName} ${animationDurationMs}ms ${INKBLOOM_EASING} both`,
        animationDelay: `${animationDelayMs}ms`,
      }}
    />
  );
}
