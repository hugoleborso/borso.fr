import { useSyncExternalStore } from 'react';
import { getCurrentTime, subscribeClock } from '../clock-store';

interface CountdownProps {
  readonly targetEpochMs: number;
  readonly label: string;
}

interface Display {
  /** Left flap pair value (00..99). */
  readonly left: number;
  /** Right flap pair value (00..59 for SS, 00..59 for MM in HH:MM mode). */
  readonly right: number;
  /** Caption under the digits: "MM:SS" or "HH:MM". */
  readonly format: 'MM:SS' | 'HH:MM';
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SWITCH_TO_HOURS_AT_SECONDS = 100 * SECONDS_PER_MINUTE; // 1h40 — keeps MM:SS readable up to 99 min.

function chooseDisplay(remainingMs: number): Display {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  if (totalSec >= SWITCH_TO_HOURS_AT_SECONDS) {
    const hours = Math.min(99, Math.floor(totalSec / SECONDS_PER_HOUR));
    const minutes = Math.floor((totalSec % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return { left: hours, right: minutes, format: 'HH:MM' };
  }
  const minutes = Math.floor(totalSec / SECONDS_PER_MINUTE);
  const seconds = totalSec % SECONDS_PER_MINUTE;
  return { left: minutes, right: seconds, format: 'MM:SS' };
}

function Flap({ digit }: { readonly digit: string }) {
  // `key` rebinds the element each time the digit value flips, which fires
  // the CSS `@keyframes flap` animation once per change (defined in
  // styles/components.css). Without the key, React reuses the element and
  // the animation only plays on mount.
  return (
    <span key={digit} className="flap mono" aria-hidden>
      <span className="flap-char">{digit}</span>
      <span className="flap-hinge" />
    </span>
  );
}

function FlapPair({ value }: { readonly value: number }) {
  const padded = String(value).padStart(2, '0');
  return (
    <span className="flap-pair">
      <Flap digit={padded[0] ?? '0'} />
      <Flap digit={padded[1] ?? '0'} />
    </span>
  );
}

export function Countdown({ targetEpochMs, label }: CountdownProps) {
  const now = useSyncExternalStore(subscribeClock, getCurrentTime, () => Date.now());
  const display = chooseDisplay(targetEpochMs - now);
  const accessibleValue = `${String(display.left).padStart(2, '0')}:${String(display.right).padStart(2, '0')} ${display.format}`;
  return (
    <div className="countdown countdown-flap" role="timer" aria-live="off">
      {label.length > 0 ? <small>{label}</small> : null}
      <div className="flap-row" role="img" aria-label={`${label} ${accessibleValue}`.trim()}>
        <FlapPair value={display.left} />
        <span className="flap-colon" aria-hidden>:</span>
        <FlapPair value={display.right} />
      </div>
      <small className="flap-format mono" aria-hidden>
        {display.format}
      </small>
    </div>
  );
}
