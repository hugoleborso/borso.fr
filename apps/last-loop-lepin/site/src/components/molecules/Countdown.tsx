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
    <div
      className="flex flex-col items-center gap-3 py-3 text-center font-mono tabular-nums text-[clamp(28px,8vw,56px)] font-bold text-ink [overflow-wrap:anywhere]"
      role="timer"
      aria-live="off"
    >
      <Show when={label.length > 0}>
        <small className="block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">
          {label}
        </small>
      </Show>
      <div
        className="flex items-center gap-3"
        role="img"
        aria-label={`${label} ${display.accessibleValue}`.trim()}
      >
        <span className="flex gap-2">
          {display.leftDigits.map((digit, index) => (
            <FlapDigit key={`left-${index}`} digit={digit} />
          ))}
        </span>
        <span
          className="font-mono text-[clamp(28px,7vw,56px)] leading-none text-ink-mute translate-y-[-6%]"
          aria-hidden
        >
          :
        </span>
        <span className="flex gap-2">
          {display.rightDigits.map((digit, index) => (
            <FlapDigit key={`right-${index}`} digit={digit} />
          ))}
        </span>
      </div>
      <small
        className="block font-mono tabular-nums text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3"
        aria-hidden
      >
        {display.format}
      </small>
    </div>
  );
}
