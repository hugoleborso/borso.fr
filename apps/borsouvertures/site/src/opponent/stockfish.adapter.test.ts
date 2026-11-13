import { describe, expect, it } from 'vitest';
import {
  createStockfishOpponent,
  STOCKFISH_WORKER_URL,
  StockfishLoadFailedError,
  type StockfishProcessListeners,
} from './stockfish.adapter';

interface FakeWorker {
  workerUrl: string;
  listeners: StockfishProcessListeners;
  commands: string[];
  stopCount: number;
}

const ELO_1320_COMMANDS = [
  'setoption name UCI_LimitStrength value true',
  'setoption name UCI_Elo value 1320',
];
const AFTER_D4_FEN = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
const SEARCH = { fen: AFTER_D4_FEN, strengthCommands: ELO_1320_COMMANDS };

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function buildFakeStockfish(overrides: { loadTimeoutMilliseconds?: number } = {}) {
  const workers: FakeWorker[] = [];
  const timers: { callback: () => void; delayMilliseconds: number }[] = [];
  const network = { isOnline: true };
  const opponent = createStockfishOpponent({
    startProcess: (workerUrl, listeners) => {
      const worker: FakeWorker = { workerUrl, listeners, commands: [], stopCount: 0 };
      workers.push(worker);
      return {
        send: (command) => {
          worker.commands.push(command);
        },
        stop: () => {
          worker.stopCount += 1;
        },
      };
    },
    scheduleTimeout: (callback, delayMilliseconds) => {
      timers.push({ callback, delayMilliseconds });
    },
    readIsOnline: () => network.isOnline,
    ...overrides,
  });
  function readWorker(index: number): FakeWorker {
    const worker = workers[index];
    if (worker === undefined) throw new Error(`no worker ${index}`);
    return worker;
  }
  function fireTimer(index: number): void {
    const timer = timers[index];
    if (timer === undefined) throw new Error(`no timer ${index}`);
    timer.callback();
  }
  return { opponent, workers, timers, network, readWorker, fireTimer };
}

async function readRejection(pending: Promise<unknown>): Promise<unknown> {
  try {
    await pending;
  } catch (error) {
    return error;
  }
  throw new Error('the promise resolved');
}

// @FollowsBlueprint test-node-adapter
describe('the Stockfish adapter while the worker loads', () => {
  it('starts no worker until a game warms it up', () => {
    const stockfish = buildFakeStockfish();
    expect(stockfish.workers).toEqual([]);
    stockfish.opponent.stop();
    expect(stockfish.workers).toEqual([]);
  });

  it('starts the vendored worker file and sends uci first, with a 10 s limit', () => {
    const stockfish = buildFakeStockfish();
    stockfish.opponent.warmUp();
    expect(STOCKFISH_WORKER_URL).toBe('/stockfish/stockfish-19-lite-single.js');
    expect(stockfish.readWorker(0).workerUrl).toBe(STOCKFISH_WORKER_URL);
    expect(stockfish.readWorker(0).commands).toEqual(['uci']);
    expect(stockfish.timers.map((timer) => timer.delayMilliseconds)).toEqual([10_000]);
  });

  it('keeps one worker across a warm-up and the searches that follow', async () => {
    const stockfish = buildFakeStockfish();
    stockfish.opponent.warmUp();
    stockfish.opponent.warmUp();
    void stockfish.opponent.findMove(SEARCH);
    await flushPromises();
    expect(stockfish.workers).toHaveLength(1);
  });

  it('sends nothing but uci before the worker answers uciok', async () => {
    const stockfish = buildFakeStockfish();
    void stockfish.opponent.findMove(SEARCH);
    stockfish.readWorker(0).listeners.onLine('id name Stockfish 19 Lite');
    stockfish.readWorker(0).listeners.onLine('option name Skill Level type spin default 20');
    await flushPromises();
    expect(stockfish.readWorker(0).commands).toEqual(['uci']);
  });

  it('sends the strength, the position and a 400 ms search once the worker answered', async () => {
    const stockfish = buildFakeStockfish();
    const pendingMove = stockfish.opponent.findMove(SEARCH);
    stockfish.readWorker(0).listeners.onLine('uciok');
    await flushPromises();
    expect(stockfish.readWorker(0).commands).toEqual([
      'uci',
      ...ELO_1320_COMMANDS,
      `position fen ${AFTER_D4_FEN}`,
      'go movetime 400',
    ]);
    stockfish.readWorker(0).listeners.onLine('info depth 5 score cp -20 pv g8f6');
    stockfish.readWorker(0).listeners.onLine('bestmove g8f6 ponder c2c4');
    await expect(pendingMove).resolves.toBe('g8f6');
  });

  it('takes the search time from its options', async () => {
    const stockfish = buildFakeStockfish();
    const opponent = createStockfishOpponent({
      startProcess: (workerUrl, listeners) => {
        const worker: FakeWorker = { workerUrl, listeners, commands: [], stopCount: 0 };
        stockfish.workers.push(worker);
        return { send: (command) => worker.commands.push(command), stop: () => undefined };
      },
      scheduleTimeout: () => undefined,
      readIsOnline: () => true,
      moveTimeMilliseconds: 50,
    });
    void opponent.findMove(SEARCH);
    stockfish.readWorker(0).listeners.onLine('uciok');
    await flushPromises();
    expect(stockfish.readWorker(0).commands.at(-1)).toBe('go movetime 50');
  });

  it('fails with the online tag when the worker does not answer uci in time', async () => {
    const stockfish = buildFakeStockfish({ loadTimeoutMilliseconds: 2000 });
    stockfish.network.isOnline = false;
    const pendingMove = stockfish.opponent.findMove(SEARCH);
    expect(stockfish.timers.map((timer) => timer.delayMilliseconds)).toEqual([2000]);
    stockfish.fireTimer(0);
    const error = await readRejection(pendingMove);
    expect(error).toBeInstanceOf(StockfishLoadFailedError);
    expect(error).toMatchObject({
      name: 'StockfishLoadFailedError',
      message: 'The Stockfish worker failed to load or to answer in time.',
      tags: { online: 'false' },
      cause: new Error('Stockfish did not answer uci within 2000 ms'),
    });
    expect(stockfish.readWorker(0).stopCount).toBe(1);
  });

  it('fails with the worker failure as the cause when the file cannot load', async () => {
    const stockfish = buildFakeStockfish();
    const pendingMove = stockfish.opponent.findMove(SEARCH);
    stockfish.readWorker(0).listeners.onFailure('script load failed');
    const error = await readRejection(pendingMove);
    expect(error).toBeInstanceOf(StockfishLoadFailedError);
    expect(error).toMatchObject({ tags: { online: 'true' }, cause: 'script load failed' });
    expect(stockfish.readWorker(0).stopCount).toBe(1);
  });

  it('swallows the failure of a warm-up, and starts a new worker for the next search', async () => {
    const stockfish = buildFakeStockfish();
    stockfish.opponent.warmUp();
    stockfish.readWorker(0).listeners.onFailure('script load failed');
    await flushPromises();
    const pendingMove = stockfish.opponent.findMove(SEARCH);
    expect(stockfish.workers).toHaveLength(2);
    stockfish.readWorker(1).listeners.onLine('uciok');
    await flushPromises();
    stockfish.readWorker(1).listeners.onLine('bestmove d7d5');
    await expect(pendingMove).resolves.toBe('d7d5');
  });

  it('ignores a line the worker prints while it starts, and loads it all the same', async () => {
    const commands: string[] = [];
    const held: { listeners: StockfishProcessListeners | null } = { listeners: null };
    const opponent = createStockfishOpponent({
      startProcess: (_workerUrl, listeners) => {
        listeners.onLine('Stockfish 19 by the Stockfish developers');
        held.listeners = listeners;
        return {
          send: (command) => {
            commands.push(command);
          },
          stop: () => undefined,
        };
      },
      scheduleTimeout: () => undefined,
      readIsOnline: () => true,
    });
    const pendingMove = opponent.findMove(SEARCH);
    held.listeners?.onLine('uciok');
    await flushPromises();
    held.listeners?.onLine('bestmove g8f6');
    await expect(pendingMove).resolves.toBe('g8f6');
    expect(commands[0]).toBe('uci');
  });

  it('fails the load when the browser refuses to start the worker, then tries again', async () => {
    const refusal = new Error('workers are blocked');
    const attempts = { count: 0 };
    const opponent = createStockfishOpponent({
      startProcess: () => {
        attempts.count += 1;
        throw refusal;
      },
      scheduleTimeout: () => undefined,
      readIsOnline: () => true,
    });
    const error = await readRejection(opponent.findMove(SEARCH));
    expect(error).toBeInstanceOf(StockfishLoadFailedError);
    expect(error).toMatchObject({ cause: refusal });
    await readRejection(opponent.findMove(SEARCH));
    expect(attempts.count).toBe(2);
  });

  it('leaves a loaded worker alone when the load timer fires', async () => {
    const stockfish = buildFakeStockfish();
    const pendingMove = stockfish.opponent.findMove(SEARCH);
    stockfish.readWorker(0).listeners.onLine('uciok');
    await flushPromises();
    stockfish.fireTimer(0);
    stockfish.readWorker(0).listeners.onLine('bestmove d7d5');
    await expect(pendingMove).resolves.toBe('d7d5');
    expect(stockfish.readWorker(0).stopCount).toBe(0);
  });
});

async function startSearch() {
  const stockfish = buildFakeStockfish();
  const pendingMove = stockfish.opponent.findMove(SEARCH);
  stockfish.readWorker(0).listeners.onLine('uciok');
  await flushPromises();
  return { stockfish, pendingMove };
}

describe('the Stockfish adapter during a search', () => {
  it('hands back the whole line when the search ends without a move', async () => {
    const { stockfish, pendingMove } = await startSearch();
    stockfish.readWorker(0).listeners.onLine('bestmove (none)');
    await expect(pendingMove).resolves.toBe('bestmove (none)');
  });

  it('answers a second search on the same worker, and ignores lines between searches', async () => {
    const { stockfish, pendingMove } = await startSearch();
    stockfish.readWorker(0).listeners.onLine('bestmove g8f6');
    await pendingMove;
    stockfish.readWorker(0).listeners.onLine('bestmove a7a6');
    const secondMove = stockfish.opponent.findMove({ fen: 'second', strengthCommands: [] });
    await flushPromises();
    expect(stockfish.readWorker(0).commands.slice(-2)).toEqual([
      'position fen second',
      'go movetime 400',
    ]);
    stockfish.readWorker(0).listeners.onLine('bestmove e7e5');
    await expect(secondMove).resolves.toBe('e7e5');
    expect(stockfish.workers).toHaveLength(1);
  });

  it('fails the search and drops the worker when it crashes mid-search', async () => {
    const { stockfish, pendingMove } = await startSearch();
    stockfish.readWorker(0).listeners.onFailure('out of memory');
    const error = await readRejection(pendingMove);
    expect(error).toBeInstanceOf(StockfishLoadFailedError);
    expect(error).toMatchObject({ tags: { online: 'true' }, cause: 'out of memory' });
    expect(stockfish.readWorker(0).stopCount).toBe(1);
    void stockfish.opponent.findMove(SEARCH);
    expect(stockfish.workers).toHaveLength(2);
  });

  it('stops the worker, goes deaf to it, and starts a new one for the next game', async () => {
    const { stockfish } = await startSearch();
    stockfish.opponent.stop();
    expect(stockfish.readWorker(0).stopCount).toBe(1);
    stockfish.readWorker(0).listeners.onLine('bestmove g8f6');
    stockfish.readWorker(0).listeners.onFailure('late failure');
    stockfish.opponent.stop();
    expect(stockfish.readWorker(0).stopCount).toBe(1);
    stockfish.opponent.warmUp();
    expect(stockfish.workers).toHaveLength(2);
  });

  it('keeps the newer worker when an older one fails late', async () => {
    const stockfish = buildFakeStockfish();
    stockfish.opponent.warmUp();
    stockfish.opponent.stop();
    stockfish.opponent.warmUp();
    stockfish.fireTimer(0);
    await flushPromises();
    stockfish.opponent.warmUp();
    expect(stockfish.workers).toHaveLength(2);
    expect(stockfish.readWorker(1).stopCount).toBe(0);
  });
});
