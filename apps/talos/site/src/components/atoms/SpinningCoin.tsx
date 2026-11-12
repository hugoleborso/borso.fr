import type { CSSProperties, JSX } from 'react';

export interface SpinningCoinProps {
  readonly dockX: number;
  readonly dockY: number;
  readonly dockScale: number;
}

const EDGE_LAYER_COUNT = 12;
const EDGE_LAYER_STEP_PX = 0.9;
const EDGE_DEPTHS_PX = Array.from(
  { length: EDGE_LAYER_COUNT },
  (_, index) => (index + 1) * EDGE_LAYER_STEP_PX,
);
const FACE_CLEARANCE_PX = 1;
const BACK_DEPTH_PX = EDGE_LAYER_COUNT * EDGE_LAYER_STEP_PX + FACE_CLEARANCE_PX;
const EDGE_BACKGROUND = 'linear-gradient(90deg, #3a200b, #7a4a1e 50%, #3a200b)';
const FACE_STYLE: CSSProperties = {
  background: 'url(/icons/coin-face.webp) center / cover',
  transform: `translateZ(${String(FACE_CLEARANCE_PX)}px)`,
};
const BACK_STYLE: CSSProperties = {
  background: 'url(/icons/coin-back.webp) center / cover',
  transform: `translateZ(-${String(BACK_DEPTH_PX)}px) rotateY(180deg)`,
};
const SHADE_STYLE: CSSProperties = {
  background:
    'radial-gradient(circle at var(--opening-light-x) var(--opening-light-y), transparent 0, transparent var(--opening-light-radius), rgba(4, 3, 2, 0.92) calc(var(--opening-light-radius) + 38%))',
  transform: 'translateZ(1.2px)',
};
const GLEAM_STYLE: CSSProperties = {
  background:
    'radial-gradient(circle at var(--opening-light-x) var(--opening-light-y), rgba(255, 236, 200, 0.35), transparent 45%)',
  transform: 'translateZ(1.4px)',
};
const EDGE_LAYER_CLASS = 'absolute inset-0 rounded-full';
const FACE_LAYER_CLASS = 'absolute inset-0 rounded-full backface-hidden';
const SHADE_LAYER_CLASS = 'absolute inset-0 rounded-full backface-hidden animate-opening-shade';
const GLEAM_LAYER_CLASS = 'absolute inset-0 rounded-full backface-hidden animate-opening-gleam';

interface DockStyle extends CSSProperties {
  readonly '--opening-dock-x': string;
  readonly '--opening-dock-y': string;
  readonly '--opening-dock-scale': string;
}

function buildEdgeStyle(depth: number): CSSProperties {
  return { background: EDGE_BACKGROUND, transform: `translateZ(-${String(depth)}px)` };
}

// @FollowsBlueprint atom-plain
export function SpinningCoin({ dockX, dockY, dockScale }: SpinningCoinProps): JSX.Element {
  const dockStyle: DockStyle = {
    '--opening-dock-x': `${String(dockX)}px`,
    '--opening-dock-y': `${String(dockY)}px`,
    '--opening-dock-scale': String(dockScale),
  };
  return (
    <div
      data-testid="opening-coin"
      className="absolute left-1/2 top-[42%] size-[150px] -ml-[75px] -mt-[75px] transform-3d animate-opening-coin"
      style={dockStyle}
    >
      {EDGE_DEPTHS_PX.map((depth) => (
        <i key={depth} className={EDGE_LAYER_CLASS} style={buildEdgeStyle(depth)} />
      ))}
      <i className={FACE_LAYER_CLASS} style={BACK_STYLE} />
      <i className={FACE_LAYER_CLASS} style={FACE_STYLE} />
      <i className={SHADE_LAYER_CLASS} style={SHADE_STYLE} />
      <i className={GLEAM_LAYER_CLASS} style={GLEAM_STYLE} />
    </div>
  );
}
