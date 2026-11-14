/**
 * @vitest-environment node
 */

import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { startStockfishProcess, StockfishSearchFailedError } from './stockfish-process.adapter';

const FEN = 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2';

interface FakeEngine {
  sent: string[];
  spawnedPaths: string[];
  isKilled: () => boolean;
  spawnEngine: (enginePath: string) => {
    stdin: PassThrough;
    stdout: PassThrough;
    kill: () => boolean;
  };
}

function buildFakeEngine(answerByCommand: (command: string) => string[]): FakeEngine {
  const sent: string[] = [];
  const spawnedPaths: string[] = [];
  const state = { isKilled: false };
  return {
    sent,
    spawnedPaths,
    isKilled: () => state.isKilled,
    spawnEngine: (enginePath) => {
      spawnedPaths.push(enginePath);
      const stdin = new PassThrough();
      const stdout = new PassThrough();
      stdin.on('data', (chunk: Buffer) => {
        for (const command of chunk.toString().split('\n').filter(Boolean)) {
          sent.push(command);
          for (const line of answerByCommand(command)) stdout.write(`${line}\n`);
        }
      });
      return {
        stdin,
        stdout,
        kill: () => {
          state.isKilled = true;
          return true;
        },
      };
    },
  };
}

function answerLikeStockfish(command: string): string[] {
  if (command === 'uci') return ['id name Stockfish 19', 'readyok', 'uciok'];
  if (command === 'isready') return ['readyok'];
  if (command.startsWith('go depth 16 searchmoves')) {
    return ['info depth 16 score cp -74 pv e7e5', 'bestmove e7e5 ponder d4e5'];
  }
  if (command.startsWith('go')) {
    return [
      'info depth 15 score cp -31 pv e7e6',
      'info depth 16 score cp -5 lowerbound',
      'info depth 16 score cp -20 pv e7e6',
      'info depth 16 currmove e7e6',
      'bestmove e7e6 ponder g1f3',
      'info string a line nobody waits for',
    ];
  }
  return [];
}

// @FollowsBlueprint test-node-adapter
describe('startStockfishProcess', () => {
  it('waits for uciok and readyok, then sets the hash, before it returns', async () => {
    const engine = buildFakeEngine(answerLikeStockfish);
    await startStockfishProcess({ enginePath: '/tmp/engine.js', spawnEngine: engine.spawnEngine });
    expect(engine.spawnedPaths).toEqual(['/tmp/engine.js']);
    expect(engine.sent).toEqual(['uci', 'setoption name Hash value 64', 'isready']);
  });

  it('searches a position and returns the last exact score and the best move', async () => {
    const engine = buildFakeEngine(answerLikeStockfish);
    const stockfish = await startStockfishProcess({
      enginePath: 'engine.js',
      spawnEngine: engine.spawnEngine,
    });
    await expect(stockfish.searchPosition(FEN, 16, null)).resolves.toEqual({
      scoreCentipawns: -20,
      bestMoveUci: 'e7e6',
    });
    expect(engine.sent.slice(3)).toEqual([
      'ucinewgame',
      'isready',
      `position fen ${FEN}`,
      'go depth 16',
    ]);
  });

  it('limits a search to one move, and forgets the score of the search before', async () => {
    const engine = buildFakeEngine(answerLikeStockfish);
    const stockfish = await startStockfishProcess({
      enginePath: 'engine.js',
      spawnEngine: engine.spawnEngine,
    });
    await stockfish.searchPosition(FEN, 16, null);
    await expect(stockfish.searchPosition(FEN, 16, 'e7e5')).resolves.toEqual({
      scoreCentipawns: -74,
      bestMoveUci: 'e7e5',
    });
    expect(engine.sent.at(-1)).toBe('go depth 16 searchmoves e7e5');
  });

  it('throws its own error when the engine gives no score', async () => {
    const engine = buildFakeEngine((command) =>
      command.startsWith('go') ? ['bestmove e7e6'] : answerLikeStockfish(command),
    );
    const stockfish = await startStockfishProcess({
      enginePath: 'engine.js',
      spawnEngine: engine.spawnEngine,
    });
    const failure = await stockfish.searchPosition(FEN, 16, null).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(StockfishSearchFailedError);
    expect(failure).toMatchObject({
      name: 'StockfishSearchFailedError',
      message: `Stockfish returned no score or no move for ${FEN}`,
    });
  });

  it('throws its own error when the engine has no move', async () => {
    const engine = buildFakeEngine((command) =>
      command.startsWith('go')
        ? ['info depth 16 score mate -1', 'bestmove (none)']
        : answerLikeStockfish(command),
    );
    const stockfish = await startStockfishProcess({
      enginePath: 'engine.js',
      spawnEngine: engine.spawnEngine,
    });
    await expect(stockfish.searchPosition(FEN, 16, null)).rejects.toBeInstanceOf(
      StockfishSearchFailedError,
    );
  });

  it('asks the engine to quit and kills the process on stop', async () => {
    const engine = buildFakeEngine(answerLikeStockfish);
    const stockfish = await startStockfishProcess({
      enginePath: 'engine.js',
      spawnEngine: engine.spawnEngine,
    });
    expect(engine.isKilled()).toBe(false);
    stockfish.stop();
    expect(engine.sent.at(-1)).toBe('quit');
    expect(engine.isKilled()).toBe(true);
  });
});
