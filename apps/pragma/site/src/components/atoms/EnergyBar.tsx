/**
 * EnergyBar atom — an energy value drawn as one tappable segment per level.
 *
 * A tap lands on the segment under the thumb and a drag sweeps through the
 * levels, both through the same pure mapping, so the segment the eye aims at
 * is the level the caller receives. That is the whole point of the shape: the
 * range input it replaces gave a phone about twelve pixels per point and no
 * boundary to aim at, and needed a pair of stepper buttons beside it to be
 * usable at all.
 *
 * The bar is one tab stop carrying the slider role rather than ten buttons,
 * which is what keeps a twenty-song setlist from growing two hundred tab
 * stops. `touch-pan-y` leaves the vertical swipe to the page, so dragging the
 * bar sideways sets the energy while scrolling over it still scrolls.
 * @Feature setlists
 */

import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { composeClassName } from './class-name.utils';
import { buildEnergyLevels, levelFromKey, levelFromPointerRatio } from './energy-bar.utils';

const BAR_CLASS =
  'flex h-10 sm:h-9 items-center gap-1 cursor-pointer touch-pan-y select-none rounded-sm ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-accent';
const SEGMENT_CLASS = 'flex-1 h-5 rounded-sm pointer-events-none transition-colors';

export interface EnergyBarProps {
  readonly value: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly label: string;
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
  filledClassName,
  emptyClassName,
  className,
  onChange,
}: EnergyBarProps): JSX.Element {
  function changeFromPointer(event: PointerEvent<HTMLDivElement>): void {
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = levelFromPointerRatio(
      (event.clientX - bounds.left) / bounds.width,
      minimum,
      maximum,
    );
    if (next === value) return;
    onChange(next);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>): void {
    changeFromPointer(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueDrag(event: PointerEvent<HTMLDivElement>): void {
    if (event.buttons === 0) return;
    changeFromPointer(event);
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
      className={composeClassName(BAR_CLASS, className)}
      onPointerDown={startDrag}
      onPointerMove={continueDrag}
      onKeyDown={changeFromKey}
    >
      {buildEnergyLevels(minimum, maximum).map((level) => (
        <span
          key={level}
          className={composeClassName(
            SEGMENT_CLASS,
            level <= value ? filledClassName : emptyClassName,
          )}
        />
      ))}
    </div>
  );
}
