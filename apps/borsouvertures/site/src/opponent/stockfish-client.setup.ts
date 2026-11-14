import { scheduleTimeoutCallback } from '@/openings/machineEffects';
import {
  createStockfishClient,
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

// @FollowsBlueprint machine-singleton
export const stockfishClient = createStockfishClient({
  startProcess: startStockfishWorker,
  scheduleTimeout: scheduleTimeoutCallback,
  readIsOnline: () => navigator.onLine,
});
