/** @Feature setlists */

import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { useRef, useState } from 'react';
import { composeClassName } from './class-name.utils';
import { buildEnergyLevels, levelFromKey } from './energy-bar.utils';
import { barHeightRatio, levelFromTravel } from './energy-meter.utils';

const METER_HEIGHT_PX = 22;
const BAR_WIDTH_CLASS = 'w-[3px]';

export interface EnergyMeterProps {
  readonly value: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly label: string;
  readonly valueText?: string;
  readonly filledClassName: string;
  readonly emptyClassName: string;
  readonly className?: string;
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
  onChange,
}: EnergyMeterProps): JSX.Element {
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
        'flex h-11 shrink-0 cursor-ew-resize touch-none select-none items-center justify-center gap-1.5 px-1.5',
        'outline-hidden focus-visible:outline-solid focus-visible:outline-2',
        'focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      onPointerDown={openGesture}
      onPointerMove={continueGesture}
      onPointerUp={closeGesture}
      onPointerCancel={closeGesture}
      onKeyDown={changeFromKey}
    >
      <span className="flex items-end gap-[2px]" style={{ height: METER_HEIGHT_PX }}>
        {buildEnergyLevels(minimum, maximum).map((level) => (
          <span
            key={level}
            className={composeClassName(
              BAR_WIDTH_CLASS,
              'rounded-[1px] transition-colors',
              level <= value ? filledClassName : emptyClassName,
            )}
            style={{ height: METER_HEIGHT_PX * barHeightRatio(level, minimum, maximum) }}
          />
        ))}
      </span>
      <span
        className={composeClassName(
          'w-3 text-right font-mono text-[13px] tabular-nums',
          isAdjusting ? 'font-semibold text-accent-ink' : 'text-ink-500',
        )}
      >
        {value}
      </span>
    </div>
  );
}
