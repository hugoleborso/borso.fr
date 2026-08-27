/** @Feature setlists */

import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { useRef } from 'react';
import { composeClassName } from './class-name.utils';
import {
  buildEnergyLevels,
  isDragIntent,
  levelFromKey,
  levelFromPointerRatio,
} from './energy-bar.utils';

const BAR_CLASS =
  'flex h-10 sm:h-9 items-center gap-1 cursor-pointer touch-pan-y select-none rounded-sm ' +
  'outline-hidden focus-visible:outline-solid focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-accent';
const SEGMENT_CLASS =
  'flex-1 h-6 rounded-sm border pointer-events-none transition-colors ' +
  'inline-flex items-center justify-center font-mono text-[10px] leading-none';

interface Gesture {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  isSliding: boolean;
}

export interface EnergyBarProps {
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

// @FollowsBlueprint atom-plain
export function EnergyBar({
  value,
  minimum,
  maximum,
  label,
  valueText,
  filledClassName,
  emptyClassName,
  className,
  onChange,
}: EnergyBarProps): JSX.Element {
  const gesture = useRef<Gesture | null>(null);

  function publishLevelUnderPointer(
    event: PointerEvent<HTMLDivElement>,
    canPublishUnchanged: boolean,
  ): void {
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = levelFromPointerRatio(
      (event.clientX - bounds.left) / bounds.width,
      minimum,
      maximum,
    );
    if (next === null) return;
    if (next === value && !canPublishUnchanged) return;
    onChange(next);
  }

  function openGesture(event: PointerEvent<HTMLDivElement>): void {
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isSliding: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueGesture(event: PointerEvent<HTMLDivElement>): void {
    const active = gesture.current;
    if (active?.pointerId !== event.pointerId) return;
    if (!active.isSliding) {
      if (!isDragIntent(event.clientX - active.startX, event.clientY - active.startY)) return;
      active.isSliding = true;
    }
    publishLevelUnderPointer(event, false);
  }

  function closeGesture(event: PointerEvent<HTMLDivElement>): void {
    const active = gesture.current;
    gesture.current = null;
    if (active?.pointerId !== event.pointerId || active.isSliding) return;
    publishLevelUnderPointer(event, true);
  }

  function abandonGesture(): void {
    gesture.current = null;
  }

  function changeFromKey(event: KeyboardEvent<HTMLDivElement>): void {
    const next = levelFromKey({ key: event.key, current: value, minimum, maximum });
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
      className={composeClassName(BAR_CLASS, className)}
      onPointerDown={openGesture}
      onPointerMove={continueGesture}
      onPointerUp={closeGesture}
      onPointerCancel={abandonGesture}
      onKeyDown={changeFromKey}
    >
      {buildEnergyLevels(minimum, maximum).map((level) => (
        <span
          key={level}
          className={composeClassName(
            SEGMENT_CLASS,
            level <= value ? filledClassName : emptyClassName,
          )}
        >
          {level}
        </span>
      ))}
    </div>
  );
}
