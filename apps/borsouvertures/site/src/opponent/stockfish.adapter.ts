import { STOCKFISH_DISTRIBUTION } from './stockfish-distribution.core';
import { isHandshakeDone, isSearchFinished, parseBestMove } from './uci.utils';

export const STOCKFISH_WORKER_URL = `/${STOCKFISH_DISTRIBUTION.publicFolder}/${STOCKFISH_DISTRIBUTION.files.worker.fileName}`;

const DEFAULT_LOAD_TIMEOUT_MILLISECONDS = 10_000;
const DEFAULT_MOVE_TIME_MILLISECONDS = 400;
const HANDSHAKE_COMMAND = 'uci';

export class StockfishLoadFailedError extends Error {
  readonly tags: { online: string };

  constructor(isOnline: boolean, cause: unknown) {
    super('The Stockfish worker failed to load or to answer in time.', { cause });
    this.name = 'StockfishLoadFailedError';
    this.tags = { online: String(isOnline) };
  }
}

export interface StockfishProcess {
  send: (command: string) => void;
  stop: () => void;
}

export interface StockfishProcessListeners {
  onLine: (line: string) => void;
  onFailure: (cause: unknown) => void;
}

export interface StockfishSearch {
  fen: string;
  strengthCommands: readonly string[];
}

export interface StockfishOptions {
  startProcess: (workerUrl: string, listeners: StockfishProcessListeners) => StockfishProcess;
  scheduleTimeout: (callback: () => void, delayMilliseconds: number) => void;
  readIsOnline: () => boolean;
  loadTimeoutMilliseconds?: number;
  moveTimeMilliseconds?: number;
}

export interface StockfishOpponent {
  warmUp: () => void;
  findMove: (search: StockfishSearch) => Promise<string>;
  stop: () => void;
}

interface StockfishSignalHandlers {
  onLine: (line: string) => void;
  onFailure: (cause: unknown) => void;
  onLoadTimeout: () => void;
}

interface StockfishRouting {
  read: () => StockfishSignalHandlers;
  replace: (change: Partial<StockfishSignalHandlers>) => void;
  silence: () => void;
}

interface StockfishSession {
  process: StockfishProcess;
  routing: StockfishRouting;
  loaded: Promise<void>;
}

interface StartedProcess {
  process: StockfishProcess;
  startFailures: unknown[];
}

const ignoreSignal = (): void => undefined;

const NO_PROCESS: StockfishProcess = { send: ignoreSignal, stop: ignoreSignal };

const SILENT_HANDLERS: StockfishSignalHandlers = {
  onLine: ignoreSignal,
  onFailure: ignoreSignal,
  onLoadTimeout: ignoreSignal,
};

function createRouting(): StockfishRouting {
  const holder = { handlers: SILENT_HANDLERS };
  return {
    read: () => holder.handlers,
    replace: (change) => {
      holder.handlers = { ...holder.handlers, ...change };
    },
    silence: () => {
      holder.handlers = SILENT_HANDLERS;
    },
  };
}

// @FollowsBlueprint adapter-external-service
export function createStockfishOpponent(options: StockfishOptions): StockfishOpponent {
  const loadTimeout = options.loadTimeoutMilliseconds ?? DEFAULT_LOAD_TIMEOUT_MILLISECONDS;
  const moveTime = options.moveTimeMilliseconds ?? DEFAULT_MOVE_TIME_MILLISECONDS;
  const holder: { session: StockfishSession | null } = { session: null };

  function closeSession(session: StockfishSession): void {
    session.routing.silence();
    session.process.stop();
    holder.session = null;
  }

  function startProcess(listeners: StockfishProcessListeners): StartedProcess {
    try {
      return {
        process: options.startProcess(STOCKFISH_WORKER_URL, listeners),
        startFailures: [],
      };
    } catch (error) {
      return { process: NO_PROCESS, startFailures: [error] };
    }
  }

  function openSession(): StockfishSession {
    const routing = createRouting();
    const { process, startFailures } = startProcess({
      onLine: (line) => {
        routing.read().onLine(line);
      },
      onFailure: (cause) => {
        routing.read().onFailure(cause);
      },
    });
    const loaded = new Promise<void>((resolve, reject) => {
      function failLoad(cause: unknown): void {
        closeSession(session);
        reject(new StockfishLoadFailedError(options.readIsOnline(), cause));
      }
      routing.replace({
        onFailure: failLoad,
        onLoadTimeout: () => {
          failLoad(new Error(`Stockfish did not answer uci within ${loadTimeout} ms`));
        },
        onLine: (line) => {
          const isLoaded = isHandshakeDone(line);
          if (!isLoaded) return;
          routing.silence();
          resolve();
        },
      });
    });
    const session: StockfishSession = { process, routing, loaded };
    loaded.catch(ignoreSignal);
    holder.session = session;
    options.scheduleTimeout(() => {
      routing.read().onLoadTimeout();
    }, loadTimeout);
    process.send(HANDSHAKE_COMMAND);
    for (const cause of startFailures) routing.read().onFailure(cause);
    return session;
  }

  function readSession(): StockfishSession {
    return holder.session ?? openSession();
  }

  function search(session: StockfishSession, request: StockfishSearch): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      session.routing.replace({
        onFailure: (cause) => {
          closeSession(session);
          reject(new StockfishLoadFailedError(options.readIsOnline(), cause));
        },
        onLine: (line) => {
          const isFinished = isSearchFinished(line);
          if (!isFinished) return;
          session.routing.silence();
          resolve(parseBestMove(line) ?? line);
        },
      });
      const commands = [
        ...request.strengthCommands,
        `position fen ${request.fen}`,
        `go movetime ${moveTime}`,
      ];
      for (const command of commands) session.process.send(command);
    });
  }

  async function findMove(request: StockfishSearch): Promise<string> {
    const session = readSession();
    await session.loaded;
    return search(session, request);
  }

  function stop(): void {
    const { session } = holder;
    if (session === null) return;
    closeSession(session);
  }

  return {
    warmUp: () => {
      readSession();
    },
    findMove,
    stop,
  };
}
