import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDocument } from '@/decks/deck.test-utils';
import { stockfishEvaluationKeys } from '@/lib/queries/stockfish-evaluation.queries';
import { queryClient } from '@/lib/query-client.setup';
import { deckGameMachine } from '@/opponent/deck-game-machine.setup';
import { readReviewLog } from '@/review/review-log.store';
import {
  openApplication,
  readCount,
  stubBoardGeometry,
  stubDecksFetch,
} from '@/routes/trainer-page.test-utils';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

type WorkerListener = (event: { data?: string; message?: string }) => void;

const stockfishWorkers: FakeStockfishWorker[] = [];
const stockfishScript = { canLoad: true, bestMove: 'a2a3' };

// @FollowsBlueprint test-jsdom-gap-stub
class FakeStockfishWorker {
  readonly url: string;
  readonly commands: string[] = [];
  isTerminated = false;
  private readonly listeners = new Map<string, WorkerListener>();

  constructor(url: string) {
    this.url = url;
    stockfishWorkers.push(this);
  }

  addEventListener(type: string, listener: WorkerListener): void {
    this.listeners.set(type, listener);
  }

  postMessage(command: string): void {
    this.commands.push(command);
    queueMicrotask(() => {
      if (!stockfishScript.canLoad) this.listeners.get('error')?.({ message: 'offline' });
      else if (command === 'uci') this.listeners.get('message')?.({ data: 'uciok' });
      else if (command.startsWith('go ')) {
        this.listeners.get('message')?.({ data: 'info depth 14 score cp 31 pv a2a3' });
        this.listeners.get('message')?.({ data: `bestmove ${stockfishScript.bestMove}` });
      }
    });
  }

  terminate(): void {
    this.isTerminated = true;
  }
}

function playReaderMove(uci: string): void {
  act(() => {
    deckGameMachine.playMove(uci);
  });
}

async function playMainLineToItsEnd(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Start a game' }));
  await screen.findByText('The deck played 1. d4');
  playReaderMove('d7d5');
  await screen.findByText('The deck played 2. c4');
  playReaderMove('e7e5');
  await screen.findByText('The deck played 3. dxe5');
  playReaderMove('d5d4');
  await screen.findByText('The deck played 4. Nf3');
  playReaderMove('b8c6');
}

// @FollowsBlueprint test-component-render
describe('a game against Stockfish on a deck page', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
    window.localStorage.clear();
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('Worker', FakeStockfishWorker);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    stubBoardGeometry();
  });

  beforeEach(async () => {
    act(() => {
      deckGameMachine.leave();
    });
    stockfishWorkers.length = 0;
    stockfishScript.canLoad = true;
    queryClient.removeQueries({ queryKey: stockfishEvaluationKeys.all });
    sentry.captureException.mockClear();
    await openApplication();
    await userEvent.click(screen.getByRole('button', { name: 'Opening decks' }));
    await userEvent.click(await screen.findByRole('button', { name: /Albin Countergambit/ }));
    await userEvent.click(screen.getByRole('tab', { name: 'Play' }));
  });

  it('offers the game with the 2000 step selected, and starts no worker before a game', () => {
    expect(screen.getByRole('heading', { name: 'Play it against Stockfish' })).toBeTruthy();
    const strength = screen.getByRole('combobox', { name: 'Stockfish strength' });
    expect(strength).toHaveProperty('value', 'elo-2000');
    expect(Array.from(strength.querySelectorAll('option'), (option) => option.textContent)).toEqual(
      [
        'Easiest',
        'Easier',
        'Easy',
        '1320 rating',
        '1500 rating',
        '1700 rating',
        '1900 rating',
        '2000 rating',
        '2200 rating',
        '2500 rating',
      ],
    );
    expect(stockfishWorkers).toEqual([]);
  });

  it('plays the deck moves, then a Stockfish move at the default strength once the line ends', async () => {
    await playMainLineToItsEnd();
    expect(await screen.findByText('Stockfish played 5. a3')).toBeTruthy();
    expect(screen.getByText('The deck has ended, Stockfish plays')).toBeTruthy();
    expect(screen.getByText('Your move')).toBeTruthy();
    const [worker] = stockfishWorkers;
    expect(worker?.url).toBe('/stockfish/stockfish-19-lite-single.js');
    expect(worker?.commands[0]).toBe('uci');
    const moveSearchStart = worker?.commands.indexOf('setoption name UCI_LimitStrength value true');
    expect(
      worker?.commands.slice(
        moveSearchStart,
        moveSearchStart === undefined ? 0 : moveSearchStart + 4,
      ),
    ).toEqual([
      'setoption name UCI_LimitStrength value true',
      'setoption name UCI_Elo value 2000',
      'position fen r1bqkbnr/ppp2ppp/2n5/4P3/2Pp4/5N2/PP2PPPP/RNBQKB1R w KQkq - 2 5',
      'go movetime 400',
    ]);
  });

  it('evaluates each position of the game on the same worker, and draws the bar beside the board', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Start a game' }));
    await screen.findByText('The deck played 1. d4');
    const bar = await screen.findByRole('img', { name: 'Evaluation: Black is better by 0.3' });
    expect(bar.textContent).toBe('-0.3');
    expect(stockfishWorkers).toHaveLength(1);
    expect(stockfishWorkers[0]?.commands).toContain('go depth 14 movetime 500');
  });

  it('hides the bar quietly, with no report, when the worker cannot load', async () => {
    stockfishScript.canLoad = false;
    await userEvent.click(screen.getByRole('button', { name: 'Start a game' }));
    await screen.findByText('The deck played 1. d4');
    const bar = screen.getByRole('img', { name: /^Evaluation/ });
    await waitFor(() => {
      expect(bar.className).toContain('invisible');
    });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('stores no review, so the counts on Today stay as they were', async () => {
    await playMainLineToItsEnd();
    await screen.findByText('Stockfish played 5. a3');
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(readCount('due')).toBe('0');
    expect(readCount('new')).toBe('6');
    expect(readReviewLog().events).toEqual([]);
  });

  it('plays an easier step once the reader selects it, and offers the strength in settings mid-game', async () => {
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Stockfish strength' }),
      'skill-3',
    );
    await playMainLineToItsEnd();
    await screen.findByText('Stockfish played 5. a3');
    const commands = stockfishWorkers[0]?.commands ?? [];
    const skillIndex = commands.indexOf('setoption name Skill Level value 3');
    expect(commands.slice(skillIndex - 1, skillIndex + 1)).toEqual([
      'setoption name UCI_LimitStrength value false',
      'setoption name Skill Level value 3',
    ]);
    expect(screen.queryByRole('combobox', { name: 'Stockfish strength' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const settings = within(screen.getByRole('dialog', { name: 'Settings' }));
    await userEvent.selectOptions(
      settings.getByRole('combobox', { name: 'Stockfish strength' }),
      'elo-2000',
    );
    expect(settings.getByRole('combobox', { name: 'Stockfish strength' })).toHaveProperty(
      'value',
      'elo-2000',
    );
    await userEvent.click(settings.getByRole('button', { name: 'Close settings' }));
  });

  it('ends the game where the deck ends, with a message and a report, when the worker cannot load', async () => {
    stockfishScript.canLoad = false;
    await playMainLineToItsEnd();
    expect(
      await screen.findByText(
        'Stockfish could not load, so the game ends where the deck ends. Its first game on a device needs the network.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('The deck played 4. Nf3')).toBeTruthy();
    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'StockfishLoadFailedError' }),
      { tags: { online: 'true' } },
    );
  });

  it('names the deck move the reader missed once his move leaves the deck', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Start a game' }));
    await screen.findByText('The deck played 1. d4');
    playReaderMove('g8f6');
    expect(await screen.findByText('Stockfish played 2. a3')).toBeTruthy();
    expect(screen.getByText('You left the deck, which plays 1... d5')).toBeTruthy();
    expect(screen.queryByText('The deck has ended, Stockfish plays')).toBeNull();
  });

  it('stops the worker and offers a new game when the reader leaves', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Start a game' }));
    await screen.findByText('The deck played 1. d4');
    await userEvent.click(screen.getByRole('button', { name: 'Leave the game' }));
    expect(screen.getByRole('button', { name: 'Start a game' })).toBeTruthy();
    expect(stockfishWorkers.map((worker) => worker.isTerminated)).toEqual([true]);
  });
});
