/**
 * EnergyBar atom — an energy value drawn as one tappable segment per level.
 *
 * A tap lands on the segment under the finger and a slide sweeps through the
 * levels, both through the same pure mapping, so the segment the eye aims at
 * is the level the caller receives. A range input over the same width offers
 * a thumb and no boundary instead — about twelve pixels per point on a phone,
 * with every level's edge half a step from the tick beside it.
 *
 * Each segment carries its own level, which is what lets the bar be the whole
 * control: the value is the last numeral still filled, so the row needs no
 * separate readout beside it, and aiming at a level means aiming at the
 * numeral rather than at a position along a track.
 *
 * **A gesture that starts here is not the bar's until it proves it is.** The
 * bar writes nothing on `pointerdown`: `touch-action: pan-y` lets the page
 * take a vertical swipe that began on the bar, but that swipe still arrives as
 * a `pointerdown` and two `pointermove`s before the browser decides and sends
 * `pointercancel`, so a control that writes on the way down rewrites whichever
 * song the thumb was resting on, silently and with no undo. A slide writes
 * once it travels further sideways than down (`isDragIntent`), a tap writes on
 * `pointerup`, and a cancelled gesture writes nothing at all. Tracking the
 * gesture also means only the pointer this bar captured can move it, so a text
 * selection dragged across the card writes nothing either.
 *
 * The bar is one tab stop carrying the slider role rather than ten buttons,
 * which is what keeps a twenty-song setlist from growing two hundred tab
 * stops.
 * @Feature setlists
 */

import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { useRef } from 'react';
import { composeClassName } from './class-name.utils';
import {
  buildEnergyLevels,
  isDragIntent,
  levelFromKey,
  levelFromPointerRatio,
} from './energy-bar.utils';

/**
 * The focus ring is an outline rather than a box shadow because a shadow is
 * dropped in forced-colors mode, which leaves the one control on the card that
 * a keyboard can reach with no focus indicator at all.
 */
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
