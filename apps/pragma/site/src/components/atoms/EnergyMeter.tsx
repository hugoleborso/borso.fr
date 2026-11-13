/** @Feature setlists */

import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { useRef, useState } from 'react';
import { composeClassName } from './class-name.utils';
import { buildEnergyLevels, levelFromKey } from './energy-bar.utils';
import { barHeightRatio, levelFromTravel } from './energy-meter.utils';

export type EnergyMeterSize = 'compact' | 'wide';

interface EnergyMeterLayout {
  readonly heightPx: number;
  readonly rootClassName: string;
  readonly barsClassName: string;
  readonly barClassName: string;
}

const LAYOUTS: Readonly<Record<EnergyMeterSize, EnergyMeterLayout>> = {
  compact: {
    heightPx: 22,
    rootClassName: 'h-11 shrink-0 justify-center gap-1.5 px-1.5',
    barsClassName: 'gap-[2px]',
    barClassName: 'w-[3px]',
  },
  wide: {
    heightPx: 40,
    rootClassName: 'h-14 w-full min-w-0 gap-3',
    barsClassName: 'min-w-0 flex-1 gap-1 sm:gap-1.5',
    barClassName: 'flex-1',
  },
};

export interface EnergyMeterProps {
  readonly value: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly label: string;
  readonly valueText?: string;
  readonly filledClassName: string;
  readonly emptyClassName: string;
  readonly className?: string;
  readonly size?: EnergyMeterSize;
  readonly onChange: (level: number) => void;
}

interface Gesture {
  readonly pointerId: number;
  readonly startX: number;
  readonly startLevel: number;
}

// @FollowsBlueprint atom-plain
export function EnergyMeter({
  value,
  minimum,
  maximum,
  label,
  valueText,
  filledClassName,
  emptyClassName,
  className,
  size = 'compact',
  onChange,
}: EnergyMeterProps): JSX.Element {
  const layout = LAYOUTS[size];
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const gesture = useRef<Gesture | null>(null);

  function openGesture(event: PointerEvent<HTMLDivElement>): void {
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startLevel: value };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsAdjusting(true);
  }

  function continueGesture(event: PointerEvent<HTMLDivElement>): void {
    const active = gesture.current;
    if (active?.pointerId !== event.pointerId) return;
    const next = levelFromTravel(
      active.startLevel,
      event.clientX - active.startX,
      minimum,
      maximum,
    );
    if (next === null || next === value) return;
    onChange(next);
  }

  function closeGesture(): void {
    gesture.current = null;
    setIsAdjusting(false);
  }

  function changeFromKey(event: KeyboardEvent<HTMLDivElement>): void {
    const next = levelFromKey(event.key, value, minimum, maximum);
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={value}
      aria-valuetext={valueText}
      data-adjusting={isAdjusting}
      className={composeClassName(
        'flex cursor-ew-resize touch-none select-none items-center',
        layout.rootClassName,
        'outline-hidden focus-visible:outline-solid focus-visible:outline-3',
        'focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
      onPointerDown={openGesture}
      onPointerMove={continueGesture}
      onPointerUp={closeGesture}
      onPointerCancel={closeGesture}
      onKeyDown={changeFromKey}
    >
      <span
        className={composeClassName('flex items-end', layout.barsClassName)}
        style={{ height: layout.heightPx }}
      >
        {buildEnergyLevels(minimum, maximum).map((level) => (
          <span
            key={level}
            className={composeClassName(
              layout.barClassName,
              'rounded-cover transition-colors',
              level <= value ? filledClassName : emptyClassName,
            )}
            style={{ height: layout.heightPx * barHeightRatio(level, minimum, maximum) }}
          />
        ))}
      </span>
      <span
        className={composeClassName(
          'w-3 text-right font-mono text-meta tabular-nums',
          isAdjusting ? 'font-semibold text-accent-strong' : 'text-ink-soft',
        )}
      >
        {value}
      </span>
    </div>
  );
}
