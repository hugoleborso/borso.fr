const PERCENTAGE_SCALE = 100;
const MARKER_OVERHANG_PX = 3;
const MARKER_WIDTH_PX = 2;

/** A marker the same colour as nothing, so the bar renders without one. */
export const NO_MARKER_COLOR = 'transparent';

interface ProgressBarProps {
  ratio: number;
  heightPx: number;
  trackColor: string;
  fillColor: string;
  markerColor?: string;
}

// @FollowsBlueprint atom-plain
export function ProgressBar({
  ratio,
  heightPx,
  trackColor,
  fillColor,
  markerColor = NO_MARKER_COLOR,
}: ProgressBarProps) {
  const filledPercentage = `${ratio * PERCENTAGE_SCALE}%`;
  return (
    <div
      style={{
        height: heightPx,
        background: trackColor,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: filledPercentage,
          background: fillColor,
          transition: 'width 1s cubic-bezier(.2,.7,.3,1)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: filledPercentage,
          top: -MARKER_OVERHANG_PX,
          bottom: -MARKER_OVERHANG_PX,
          width: MARKER_WIDTH_PX,
          background: markerColor,
        }}
      />
    </div>
  );
}
