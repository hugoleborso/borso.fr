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
      opponentDelayMs: 0,
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
