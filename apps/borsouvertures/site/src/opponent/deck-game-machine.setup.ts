import { recordProductEvent, reportTaggedError } from '@/observability/error-reporting.adapter';
import { readErrorTags } from '@/observability/error-reporting.core';
import { pickRandomCandidate, scheduleTimeoutCallback } from '@/openings/machineEffects';
import { readOpponentStrength } from '@/state/appState';
import { createDeckGameMachine } from './deck-game-machine.utils';
import {
  createStockfishOpponent,
  type StockfishProcess,
  type StockfishProcessListeners,
} from './stockfish.adapter';

function startStockfishWorker(
  workerUrl: string,
  listeners: StockfishProcessListeners,
): StockfishProcess {
  const worker = new Worker(workerUrl);
  worker.addEventListener('message', (event) => {
    listeners.onLine(String(event.data));
  });
  worker.addEventListener('error', (event) => {
    listeners.onFailure(event.message);
  });
  return {
    send: (command) => {
      worker.postMessage(command);
    },
    stop: () => {
      worker.terminate();
    },
  };
}

const stockfishOpponent = createStockfishOpponent({
  startProcess: startStockfishWorker,
  scheduleTimeout: scheduleTimeoutCallback,
  readIsOnline: () => navigator.onLine,
});

// @FollowsBlueprint machine-singleton
export const deckGameMachine = createDeckGameMachine({
  readStrength: readOpponentStrength,
  warmUpStockfish: stockfishOpponent.warmUp,
  findStockfishMove: stockfishOpponent.findMove,
  stopStockfish: stockfishOpponent.stop,
  pickRandom: pickRandomCandidate,
  scheduleTimeout: scheduleTimeoutCallback,
  recordProductEvent,
  reportError: (error) => {
    reportTaggedError(error, readErrorTags(error));
  },
});
