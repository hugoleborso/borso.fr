import type { ProductEvent } from '@/observability/error-reporting.core';
import type { DeckGameMachineOptions, StockfishMoveRequest } from './deck-game-machine.utils';
import type { OpponentStrengthId } from './opponent-strength.core';

interface PendingStockfishMove {
  request: StockfishMoveRequest;
  answer: (uci: string) => Promise<void>;
  fail: (error: Error) => Promise<void>;
}

interface ScheduledCallback {
  callback: () => void;
  delayMilliseconds: number;
}

interface DeckGameDriver {
  options: DeckGameMachineOptions;
  productEvents: ProductEvent[];
  reportedErrors: unknown[];
  stockfishCalls: string[];
  pendingTimers: ScheduledCallback[];
  pendingStockfishMoves: PendingStockfishMove[];
  settings: { strength: OpponentStrengthId; pickIndex: number };
  fireNextTimer: () => void;
  takeStockfishMove: () => PendingStockfishMove;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

// @FollowsBlueprint test-machine-driver
export function buildDeckGameDriver(): DeckGameDriver {
  const productEvents: ProductEvent[] = [];
  const reportedErrors: unknown[] = [];
  const stockfishCalls: string[] = [];
  const pendingTimers: ScheduledCallback[] = [];
  const pendingStockfishMoves: PendingStockfishMove[] = [];
  const settings: DeckGameDriver['settings'] = { strength: 'elo-1320', pickIndex: 0 };
  return {
    productEvents,
    reportedErrors,
    stockfishCalls,
    pendingTimers,
    pendingStockfishMoves,
    settings,
    fireNextTimer: () => {
      const next = pendingTimers.shift();
      if (!next) throw new Error('no pending timer');
      next.callback();
    },
    takeStockfishMove: () => {
      const next = pendingStockfishMoves.shift();
      if (!next) throw new Error('no pending Stockfish move');
      return next;
    },
    options: {
      readStrength: () => settings.strength,
      warmUpStockfish: () => {
        stockfishCalls.push('warm-up');
      },
      stopStockfish: () => {
        stockfishCalls.push('stop');
      },
      findStockfishMove: (request) => {
        stockfishCalls.push('find-move');
        return new Promise<string>((resolve, reject) => {
          pendingStockfishMoves.push({
            request,
            answer: (uci) => {
              resolve(uci);
              return flushPromises();
            },
            fail: (error) => {
              reject(error);
              return flushPromises();
            },
          });
        });
      },
      pickRandom: (candidates) => candidates[settings.pickIndex],
      scheduleTimeout: (callback, delayMilliseconds) => {
        pendingTimers.push({ callback, delayMilliseconds });
      },
      recordProductEvent: (event) => {
        productEvents.push(event);
      },
      reportError: (error) => {
        reportedErrors.push(error);
      },
    },
  };
}
