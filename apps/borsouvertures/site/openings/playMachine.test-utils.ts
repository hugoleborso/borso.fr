import type { PlayMachineOptions } from './playMachine.utils';
import { ALL_KEY, type Selection } from './selectors.utils';
import type { Opening } from './types';

export const ITALIAN_GAME: Opening = {
  id: 'italian-game',
  name: 'Italian Game',
  ecoCodes: ['C50'],
  variations: [
    {
      id: 'main',
      name: 'Main',
      lines: [
        {
          id: 'classical',
          name: 'Classical',
          eco: 'C50',
          movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
          movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
        },
        {
          id: 'two-knights',
          name: 'Two Knights',
          eco: 'C55',
          movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
          movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
        },
      ],
    },
  ],
};

export const ALL_SELECTION: Selection = {
  openingId: ALL_KEY,
  variationId: ALL_KEY,
  lineId: ALL_KEY,
};

export const ITALIAN_SCOPE = {
  openingIds: ['italian-game'],
  variationIds: ['main'],
  lineIds: [],
};

interface ScheduledCallback {
  callback: () => void;
  delayMs: number;
}

interface DriverHandles {
  options: PlayMachineOptions;
  pendingTimers: ScheduledCallback[];
  fireNextTimer: () => void;
  rngQueue: string[];
}

/**
 * A deterministic stand-in for the timer and the RNG.
 *
 * `opponentDelayMs` is deliberately left out of `options`, so the delay the
 * machine hands to `scheduleTimeout` is the production default and a test can
 * assert it. Every timer is fired by hand, so the value never makes a test
 * wait.
 *
 * @Blueprint test-machine-driver
 * @BlueprintName Machine Test Driver
 * @BlueprintUsage Use to make a machine that owns timers and randomness fully deterministic, in a `.test-utils.ts` sibling the test glob does not pick up.
 * @BlueprintDescription Returns the `options` object the machine is built with alongside the handles a test steers it by. `scheduleTimeout` pushes onto a `pendingTimers` array instead of calling the event loop, so `fireNextTimer` decides when a reply lands and throws when nothing is pending rather than passing silently. `pickRandom` shifts from `rngQueue` and falls back to the first candidate, so a test names only the choices it cares about. `opponentDelayMs` is deliberately absent, so the machine uses its production default and the test can assert the value it scheduled with.
 */
export function buildDriver(): DriverHandles {
  const pendingTimers: ScheduledCallback[] = [];
  const rngQueue: string[] = [];
  return {
    pendingTimers,
    rngQueue,
    fireNextTimer: () => {
      const next = pendingTimers.shift();
      if (!next) throw new Error('no pending timer');
      next.callback();
    },
    options: {
      scheduleTimeout: (callback, delayMs) => {
        pendingTimers.push({ callback, delayMs });
      },
      pickRandom: (candidates) => {
        const seed = rngQueue.shift();
        if (seed && candidates.includes(seed)) return seed;
        return candidates[0];
      },
    },
  };
}
