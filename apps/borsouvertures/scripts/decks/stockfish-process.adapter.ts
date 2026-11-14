import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import {
  isEngineReady,
  isHandshakeDone,
  isSearchFinished,
  parseBestMove,
  parseUciScore,
} from '../../site/src/opponent/uci.utils';
import { ENGINE_HASH_MEGABYTES, type EngineSearch } from './engine-gate.core';

type EngineProcess = Pick<ChildProcessWithoutNullStreams, 'stdin' | 'stdout' | 'kill'>;

export interface StockfishProcessOptions {
  enginePath: string;
  spawnEngine: (enginePath: string) => EngineProcess;
}

export interface StockfishProcess {
  searchPosition: (fen: string, depth: number, onlyMoveUci: string | null) => Promise<EngineSearch>;
  stop: () => void;
}

interface LineWaiter {
  isAwaited: (line: string) => boolean;
  resolve: (line: string) => void;
}

export class StockfishSearchFailedError extends Error {
  constructor(fen: string) {
    super(`Stockfish returned no score or no move for ${fen}`);
    this.name = 'StockfishSearchFailedError';
  }
}

// @FollowsBlueprint adapter-external-service
export async function startStockfishProcess(
  options: StockfishProcessOptions,
): Promise<StockfishProcess> {
  const engine = options.spawnEngine(options.enginePath);
  const waiters: LineWaiter[] = [];
  let lastScore: number | null = null;

  function readLastScore(): number | null {
    return lastScore;
  }

  createInterface({ input: engine.stdout }).on('line', (line) => {
    lastScore = parseUciScore(line) ?? lastScore;
    const waiter = waiters[0];
    if (waiter === undefined || !waiter.isAwaited(line)) return;
    waiters.shift();
    waiter.resolve(line);
  });

  function waitForLine(isAwaited: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      waiters.push({ isAwaited, resolve });
    });
  }

  function send(command: string): void {
    engine.stdin.write(`${command}\n`);
  }

  async function waitUntilReady(): Promise<void> {
    const ready = waitForLine(isEngineReady);
    send('isready');
    await ready;
  }

  const handshake = waitForLine(isHandshakeDone);
  send('uci');
  await handshake;
  send(`setoption name Hash value ${ENGINE_HASH_MEGABYTES}`);
  await waitUntilReady();

  return {
    async searchPosition(fen, depth, onlyMoveUci) {
      send('ucinewgame');
      await waitUntilReady();
      lastScore = null;
      send(`position fen ${fen}`);
      const finished = waitForLine(isSearchFinished);
      send(
        onlyMoveUci === null ? `go depth ${depth}` : `go depth ${depth} searchmoves ${onlyMoveUci}`,
      );
      const bestMoveUci = parseBestMove(await finished);
      const scoreCentipawns = readLastScore();
      if (bestMoveUci === null || scoreCentipawns === null) {
        throw new StockfishSearchFailedError(fen);
      }
      return { scoreCentipawns, bestMoveUci };
    },
    stop() {
      send('quit');
      engine.kill();
    },
  };
}
