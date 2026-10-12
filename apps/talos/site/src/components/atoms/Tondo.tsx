import type { JSX } from 'react';

export interface TondoProps {
  readonly title: string;
}

const VIEW_SIZE = 240;
const CENTER = 120;
const RIM_RADIUS = 116;
const TICK_OUTER_RADIUS = 108;
const TICK_INNER_RADIUS = 96;
const DISC_RADIUS = 92;
const TICK_COUNT = 72;
const DEGREES_PER_TURN = 360;
const TITLE_BASELINE = 126;
const MEANDER_BAR_PATH = 'M66 150 H100 V138 H112 V150 H128 V138 H140 V150 H174';

const TICK_ANGLES = Array.from(
  { length: TICK_COUNT },
  (_, index) => (index / TICK_COUNT) * DEGREES_PER_TURN,
);

// @FollowsBlueprint atom-plain
export function Tondo({ title }: TondoProps): JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${String(VIEW_SIZE)} ${String(VIEW_SIZE)}`}
      role="img"
      aria-label={title}
      className="w-56 h-56 max-w-full"
    >
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RIM_RADIUS}
        fill="none"
        stroke="var(--color-line-strong)"
        strokeWidth={1}
      />
      <g stroke="var(--color-tondo)" strokeWidth={2}>
        {TICK_ANGLES.map((angle) => (
          <line
            key={angle}
            x1={CENTER}
            y1={CENTER - TICK_INNER_RADIUS}
            x2={CENTER}
            y2={CENTER - TICK_OUTER_RADIUS}
            transform={`rotate(${String(angle)} ${String(CENTER)} ${String(CENTER)})`}
          />
        ))}
      </g>
      <circle cx={CENTER} cy={CENTER} r={DISC_RADIUS} fill="var(--color-tondo)" />
      <text
        x={CENTER}
        y={TITLE_BASELINE}
        textAnchor="middle"
        fill="var(--color-on-tondo)"
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={36}
        letterSpacing={4}
      >
        {title.toUpperCase()}
      </text>
      <path
        d={MEANDER_BAR_PATH}
        fill="none"
        stroke="var(--color-on-tondo)"
        strokeWidth={2.5}
        strokeLinejoin="miter"
      />
    </svg>
  );
}
