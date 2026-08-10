import { useSyncExternalStore } from 'react';
import { getCurrentTime, readServerTime, subscribeClock } from '../../clock-store';
import { FlapDigit } from '../atoms/FlapDigit';
import { Show } from '../atoms/Show';
import { projectCountdownDisplay } from './countdown.utils';

interface CountdownProps {
  readonly targetEpochMs: number;
  readonly label: string;
}

/**
 * @Blueprint molecule-clock-subscriber
 * @BlueprintName Molecule Reading The Shared Clock
 * @BlueprintUsage Use for a component whose display has to advance with wall clock time rather than with a data refetch.
 * @BlueprintDescription Reads the shared clock through `useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime)`, with all three arguments module level constants from `clock-store.ts` so a new function identity never resubscribes on a render. The tick is a number, and every digit on screen comes from `projectCountdownDisplay`, a pure covered projection, so the component holds no timer and no effect.
 */
export function Countdown({ targetEpochMs, label }: CountdownProps) {
  const now = useSyncExternalStore(subscribeClock, getCurrentTime, readServerTime);
  const display = projectCountdownDisplay(targetEpochMs - now);
  return (
    <div className="countdown countdown-flap" role="timer" aria-live="off">
      <Show when={label.length > 0}>
        <small>{label}</small>
      </Show>
      <div
        className="flap-row"
        role="img"
        aria-label={`${label} ${display.accessibleValue}`.trim()}
      >
        <span className="flap-pair">
          {display.leftDigits.map((digit, index) => (
            <FlapDigit key={`left-${index}`} digit={digit} />
          ))}
        </span>
        <span className="flap-colon" aria-hidden>
          :
        </span>
        <span className="flap-pair">
          {display.rightDigits.map((digit, index) => (
            <FlapDigit key={`right-${index}`} digit={digit} />
          ))}
        </span>
      </div>
      <small className="flap-format mono" aria-hidden>
        {display.format}
      </small>
    </div>
  );
}
