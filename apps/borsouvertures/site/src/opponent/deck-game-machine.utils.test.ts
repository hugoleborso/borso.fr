import { describe, expect, it, vi } from 'vitest';
import { buildExampleDeck } from '@/decks/deck.test-utils';
import type { BuiltDeck } from '@/decks/deck.utils';
import { buildDeckGameDriver } from './deck-game-machine.test-utils';
import {
  createDeckGameMachine,
  type DeckGameSnapshot,
  isDeckGameMoveAccepted,
  isDeckGameOn,
  listNextBookMoves,
  selectDeckGameStatus,
  StockfishIllegalMoveError,
} from './deck-game-machine.utils';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MAIN_LINE_END_FEN = 'r1bqkbnr/ppp2ppp/2n5/4P3/2Pp4/5N2/PP2PPPP/RNBQKB1R w KQkq - 2 5';

const albinDeck = buildExampleDeck();
const whiteDeckWithoutLines: BuiltDeck = {
  ...albinDeck,
  id: 'white-deck',
  side: 'white',
  lines: [],
};
const blackDeckWithoutLines: BuiltDeck = { ...albinDeck, id: 'black-deck', lines: [] };

function startGame(deck: BuiltDeck) {
  const driver = buildDeckGameDriver();
  const machine = createDeckGameMachine(driver.options);
  machine.start(deck);
  return { driver, machine };
}

function playMainLineToItsEnd() {
  const game = startGame(albinDeck);
  game.driver.fireNextTimer();
  for (const readerMove of ['d7d5', 'e7e5', 'd5d4']) {
    game.machine.playMove(readerMove);
    game.driver.fireNextTimer();
  }
  game.machine.playMove('b8c6');
  return game;
}

async function playScriptedGame(
  deck: BuiltDeck,
  readerMoves: readonly string[],
  stockfishMoves: readonly string[],
) {
  const game = startGame(deck);
  const exchangeCount = Math.max(readerMoves.length, stockfishMoves.length);
  const readerOffset = deck.side === 'white' ? 0 : 1;
  for (let exchange = 0; exchange < exchangeCount + readerOffset; exchange += 1) {
    const readerMove = readerMoves[exchange - readerOffset];
    if (readerMove !== undefined) game.machine.playMove(readerMove);
    const stockfishMove = stockfishMoves[exchange];
    if (stockfishMove !== undefined) await game.driver.takeStockfishMove().answer(stockfishMove);
  }
  return game;
}

// @FollowsBlueprint test-machine-transition
describe('the deck game machine before and at the start', () => {
  it('is idle on the starting position before a game starts, and ignores a move', () => {
    const driver = buildDeckGameDriver();
    const machine = createDeckGameMachine(driver.options);
    const idle = machine.getSnapshot();
    expect(idle).toEqual({
      phase: 'idle',
      deckId: null,
      readerSide: 'white',
      fen: STARTING_FEN,
      moveSource: 'book',
      lastOpponentMove: null,
      ending: null,
    });
    expect(machine.playMove('e2e4')).toBe('ignored');
    expect(machine.getSnapshot()).toBe(idle);
    expect(driver.stockfishCalls).toEqual([]);
  });

  it('records the start, stops any earlier worker and warms a new one up', () => {
    const { driver, machine } = startGame(albinDeck);
    expect(driver.productEvents).toEqual([
      { name: 'opponent_game_started', deckId: 'albin-countergambit' },
    ]);
    expect(driver.stockfishCalls).toEqual(['stop', 'warm-up']);
    expect(machine.getSnapshot()).toEqual({
      phase: 'opponent-moving',
      deckId: 'albin-countergambit',
      readerSide: 'black',
      fen: STARTING_FEN,
      moveSource: 'book',
      lastOpponentMove: null,
      ending: null,
    });
  });

  it('plays the first deck move for white after 450 ms when the reader is black', () => {
    const { driver, machine } = startGame(albinDeck);
    expect(driver.pendingTimers.map((timer) => timer.delayMilliseconds)).toEqual([450]);
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'reader-to-move',
      fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
      moveSource: 'book',
      lastOpponentMove: { notation: '1. d4', source: 'book' },
    });
  });

  it('takes the delay of a book move from its options', () => {
    const driver = buildDeckGameDriver();
    const machine = createDeckGameMachine({ ...driver.options, bookMoveDelayMilliseconds: 20 });
    machine.start(albinDeck);
    expect(driver.pendingTimers.map((timer) => timer.delayMilliseconds)).toEqual([20]);
  });

  it('lets a white reader move first, with no timer', () => {
    const { driver, machine } = startGame({ ...albinDeck, side: 'white' });
    expect(machine.getSnapshot()).toMatchObject({ phase: 'reader-to-move', moveSource: 'book' });
    expect(driver.pendingTimers).toEqual([]);
  });
});

describe('the deck game machine while the game is in the deck', () => {
  it('ignores a move while the opponent is moving', () => {
    const { machine } = startGame(albinDeck);
    const before = machine.getSnapshot();
    expect(machine.playMove('d7d5')).toBe('ignored');
    expect(machine.getSnapshot()).toBe(before);
  });

  it('rejects a move the board refuses and keeps the position', () => {
    const { driver, machine } = startGame(albinDeck);
    driver.fireNextTimer();
    const before = machine.getSnapshot();
    expect(machine.playMove('d7d4')).toBe('rejected');
    expect(machine.getSnapshot()).toBe(before);
  });

  it('answers each reader move with the deck move, picked among the lines still open', () => {
    const { driver, machine } = startGame(albinDeck);
    driver.fireNextTimer();
    expect(machine.playMove('d7d5')).toBe('accepted');
    expect(machine.getSnapshot()).toMatchObject({ phase: 'opponent-moving', moveSource: 'book' });
    driver.fireNextTimer();
    expect(machine.getSnapshot().lastOpponentMove).toEqual({ notation: '2. c4', source: 'book' });
    machine.playMove('e7e5');
    driver.fireNextTimer();
    machine.playMove('d5d4');
    driver.settings.pickIndex = 1;
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'reader-to-move',
      moveSource: 'book',
      lastOpponentMove: { notation: '4. e3', source: 'book' },
    });
    expect(driver.stockfishCalls).toEqual(['stop', 'warm-up']);
    expect(driver.productEvents).toHaveLength(1);
  });

  it('hands the move to Stockfish when the pick names no deck move', () => {
    const { driver, machine } = startGame(albinDeck);
    driver.settings.pickIndex = 7;
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'opponent-moving',
      moveSource: 'stockfish',
      fen: STARTING_FEN,
    });
    expect(driver.productEvents).toContainEqual({
      name: 'opponent_left_deck',
      deckId: 'albin-countergambit',
    });
  });
});

describe('the deck game machine once the deck ends', () => {
  it('asks Stockfish for the move at the stored strength when the line ends', () => {
    const { driver, machine } = playMainLineToItsEnd();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'opponent-moving',
      moveSource: 'stockfish',
      fen: MAIN_LINE_END_FEN,
      lastOpponentMove: { notation: '4. Nf3', source: 'book' },
    });
    expect(driver.pendingTimers).toEqual([]);
    expect(driver.pendingStockfishMoves.map((pending) => pending.request)).toEqual([
      {
        fen: MAIN_LINE_END_FEN,
        strengthCommands: [
          'setoption name UCI_LimitStrength value true',
          'setoption name UCI_Elo value 1320',
        ],
      },
    ]);
    expect(driver.productEvents).toEqual([
      { name: 'opponent_game_started', deckId: 'albin-countergambit' },
      { name: 'opponent_left_deck', deckId: 'albin-countergambit' },
    ]);
  });

  it('plays the move Stockfish answers and gives the turn back to the reader', async () => {
    const { driver, machine } = playMainLineToItsEnd();
    await driver.takeStockfishMove().answer('a2a3');
    expect(machine.getSnapshot()).toEqual({
      phase: 'reader-to-move',
      deckId: 'albin-countergambit',
      readerSide: 'black',
      fen: 'r1bqkbnr/ppp2ppp/2n5/4P3/2Pp4/P4N2/1P2PPPP/RNBQKB1R b KQkq - 0 5',
      moveSource: 'stockfish',
      lastOpponentMove: { notation: '5. a3', source: 'stockfish' },
      ending: null,
    });
    expect(driver.reportedErrors).toEqual([]);
  });

  it('records that the opponent left the deck once when the reader leaves it early', async () => {
    const { driver, machine } = startGame(albinDeck);
    driver.fireNextTimer();
    expect(machine.playMove('g8f6')).toBe('accepted');
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'opponent-moving',
      moveSource: 'stockfish',
    });
    await driver.takeStockfishMove().answer('c2c4');
    machine.playMove('e7e6');
    await driver.takeStockfishMove().answer('b1c3');
    expect(driver.productEvents).toEqual([
      { name: 'opponent_game_started', deckId: 'albin-countergambit' },
      { name: 'opponent_left_deck', deckId: 'albin-countergambit' },
    ]);
    expect(driver.pendingTimers).toEqual([]);
    expect(driver.stockfishCalls).toEqual(['stop', 'warm-up', 'find-move', 'find-move']);
  });

  it('shows Stockfish as the move source as soon as a line ends on the opponent move', () => {
    const lineEndingOnWhite: BuiltDeck = {
      ...albinDeck,
      lines: [{ name: 'One move', movesSan: ['d4'], movesUci: ['d2d4'] }],
    };
    const { driver, machine } = startGame(lineEndingOnWhite);
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'reader-to-move',
      moveSource: 'stockfish',
    });
    expect(driver.productEvents).toContainEqual({
      name: 'opponent_left_deck',
      deckId: 'albin-countergambit',
    });
  });

  it('restarts the worker when the strength changed since the last Stockfish move', async () => {
    const { driver, machine } = playMainLineToItsEnd();
    await driver.takeStockfishMove().answer('a2a3');
    machine.playMove('a7a6');
    await driver.takeStockfishMove().answer('b2b3');
    expect(driver.stockfishCalls).toEqual(['stop', 'warm-up', 'find-move', 'find-move']);
    driver.settings.strength = 'skill-3';
    machine.playMove('a6a5');
    expect(driver.stockfishCalls).toEqual([
      'stop',
      'warm-up',
      'find-move',
      'find-move',
      'stop',
      'find-move',
    ]);
    expect(driver.takeStockfishMove().request.strengthCommands).toEqual([
      'setoption name UCI_LimitStrength value false',
      'setoption name Skill Level value 3',
    ]);
  });
});

describe('the deck game machine when Stockfish fails', () => {
  it('ends the game where the deck ends when the worker cannot load', async () => {
    const { driver, machine } = playMainLineToItsEnd();
    const loadFailure = new Error('offline');
    await driver.takeStockfishMove().fail(loadFailure);
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'ended',
      ending: 'stockfish-unavailable',
      fen: MAIN_LINE_END_FEN,
      lastOpponentMove: { notation: '4. Nf3', source: 'book' },
    });
    expect(driver.reportedErrors).toEqual([loadFailure]);
    expect(driver.stockfishCalls.at(-1)).toBe('stop');
    expect(machine.playMove('a7a6')).toBe('ignored');
  });

  it('reports a move the board refuses with the strength, and ends the game', async () => {
    const { driver, machine } = playMainLineToItsEnd();
    await driver.takeStockfishMove().answer('a1a8');
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'ended',
      ending: 'stockfish-illegal-move',
      fen: MAIN_LINE_END_FEN,
    });
    const [reported] = driver.reportedErrors;
    expect(reported).toBeInstanceOf(StockfishIllegalMoveError);
    expect(reported).toMatchObject({
      name: 'StockfishIllegalMoveError',
      message: `Stockfish answered "a1a8", which the board refuses at "${MAIN_LINE_END_FEN}".`,
      tags: { strength: 'elo-1320' },
    });
    expect(driver.reportedErrors).toHaveLength(1);
    expect(driver.stockfishCalls.at(-1)).toBe('stop');
  });
});

describe('the deck game machine when a game is replaced or left', () => {
  it('drops a book move scheduled for a game that was replaced', () => {
    const { driver, machine } = startGame(albinDeck);
    machine.start(whiteDeckWithoutLines);
    const replaced = machine.getSnapshot();
    driver.fireNextTimer();
    expect(machine.getSnapshot()).toBe(replaced);
    expect(replaced).toMatchObject({ deckId: 'white-deck', phase: 'reader-to-move' });
  });

  it('drops a Stockfish answer and a Stockfish failure that land after the reader left', async () => {
    const answered = playMainLineToItsEnd();
    const pendingAnswer = answered.driver.takeStockfishMove();
    answered.machine.leave();
    const afterLeaving = answered.machine.getSnapshot();
    await pendingAnswer.answer('a2a3');
    expect(answered.machine.getSnapshot()).toBe(afterLeaving);

    const failed = playMainLineToItsEnd();
    const pendingFailure = failed.driver.takeStockfishMove();
    failed.machine.leave();
    await pendingFailure.fail(new Error('offline'));
    expect(failed.machine.getSnapshot().phase).toBe('idle');
    expect(failed.driver.reportedErrors).toEqual([]);
  });

  it('goes back to idle, stops the worker and tells its listeners when the reader leaves', () => {
    const { driver, machine } = startGame(albinDeck);
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);
    machine.leave();
    expect(machine.getSnapshot()).toMatchObject({ phase: 'idle', deckId: null });
    expect(driver.stockfishCalls).toEqual(['stop', 'warm-up', 'stop']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(machine.playMove('d7d5')).toBe('ignored');
    unsubscribe();
    machine.start(albinDeck);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('tells its listeners of each change of the game', () => {
    const driver = buildDeckGameDriver();
    const machine = createDeckGameMachine(driver.options);
    const listener = vi.fn();
    machine.subscribe(listener);
    machine.start(albinDeck);
    expect(listener).toHaveBeenCalledTimes(1);
    driver.fireNextTimer();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('the deck game machine at the end of a game', () => {
  it('ends on a win of the reader and stops the worker', async () => {
    const { driver, machine } = await playScriptedGame(
      blackDeckWithoutLines,
      ['e7e5', 'd8h4'],
      ['f2f3', 'g2g4'],
    );
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'ended',
      ending: 'reader-won',
      fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
    });
    expect(driver.stockfishCalls.at(-1)).toBe('stop');
    expect(driver.pendingStockfishMoves).toEqual([]);
  });

  it('ends on a win of the opponent', async () => {
    const { machine } = await playScriptedGame(
      whiteDeckWithoutLines,
      ['f2f3', 'g2g4'],
      ['e7e5', 'd8h4'],
    );
    expect(machine.getSnapshot()).toMatchObject({
      phase: 'ended',
      ending: 'opponent-won',
      lastOpponentMove: { notation: '2... Qh4#', source: 'stockfish' },
    });
  });

  it('ends on a draw when the opponent has no move and is not in check', async () => {
    const { machine } = await playScriptedGame(
      whiteDeckWithoutLines,
      ['e2e3', 'd1h5', 'h5a5', 'h2h4', 'a5c7', 'c7d7', 'd7b7', 'b7b8', 'b8c8', 'c8e6'],
      ['a7a5', 'a8a6', 'h7h5', 'a6h6', 'f7f6', 'e8f7', 'd8d3', 'd3h7', 'f7g6'],
    );
    expect(machine.getSnapshot()).toMatchObject({ phase: 'ended', ending: 'draw' });
  });

  it('promotes to a queen when the board names no piece, and to the named piece otherwise', async () => {
    const readerMoves = ['h2h4', 'h4g5', 'g5h6', 'h6h7'];
    const stockfishMoves = ['g7g5', 'h7h6', 'a7a6', 'a6a5'];
    const queened = await playScriptedGame(whiteDeckWithoutLines, readerMoves, stockfishMoves);
    expect(queened.machine.playMove('h7g8')).toBe('accepted');
    expect(queened.machine.getSnapshot().fen).toBe(
      'rnbqkbQr/1ppppp2/8/p7/8/8/PPPPPPP1/RNBQKBNR b KQkq - 0 5',
    );
    const knighted = await playScriptedGame(whiteDeckWithoutLines, readerMoves, stockfishMoves);
    expect(knighted.machine.playMove('h7g8n')).toBe('accepted');
    expect(knighted.machine.getSnapshot().fen).toBe(
      'rnbqkbNr/1ppppp2/8/p7/8/8/PPPPPPP1/RNBQKBNR b KQkq - 0 5',
    );
  });
});

describe('the deck game selectors', () => {
  const playing: DeckGameSnapshot = {
    phase: 'reader-to-move',
    deckId: 'albin-countergambit',
    readerSide: 'black',
    fen: STARTING_FEN,
    moveSource: 'book',
    lastOpponentMove: null,
    ending: null,
  };

  it('lists the distinct next moves of the lines the played moves open', () => {
    expect(listNextBookMoves(albinDeck.lines, [])).toEqual(['d2d4']);
    expect(
      listNextBookMoves(albinDeck.lines, ['d2d4', 'd7d5', 'c2c4', 'e7e5', 'd4e5', 'd5d4']),
    ).toEqual(['g1f3', 'e2e3']);
    expect(listNextBookMoves(albinDeck.lines, ['d2d4', 'g8f6'])).toEqual([]);
    expect(
      listNextBookMoves(albinDeck.lines, [
        'd2d4',
        'd7d5',
        'c2c4',
        'e7e5',
        'd4e5',
        'd5d4',
        'g1f3',
        'b8c6',
      ]),
    ).toEqual([]);
  });

  it('says a game is on for the deck it was started on only', () => {
    expect(isDeckGameOn(playing, 'albin-countergambit')).toBe(true);
    expect(isDeckGameOn(playing, 'vienna-game')).toBe(false);
    expect(isDeckGameOn({ ...playing, deckId: null }, 'vienna-game')).toBe(false);
  });

  it('accepts a move only when the machine accepted it', () => {
    expect(isDeckGameMoveAccepted('accepted')).toBe(true);
    expect(isDeckGameMoveAccepted('rejected')).toBe(false);
    expect(isDeckGameMoveAccepted('ignored')).toBe(false);
  });

  it('names the status from the ending first, then the phase and the move source', () => {
    expect(selectDeckGameStatus(playing)).toBe('reader-to-move');
    expect(selectDeckGameStatus({ ...playing, phase: 'opponent-moving' })).toBe('book-moving');
    expect(
      selectDeckGameStatus({ ...playing, phase: 'opponent-moving', moveSource: 'stockfish' }),
    ).toBe('stockfish-moving');
    expect(selectDeckGameStatus({ ...playing, phase: 'ended', ending: 'draw' })).toBe('draw');
    expect(
      selectDeckGameStatus({ ...playing, phase: 'opponent-moving', ending: 'reader-won' }),
    ).toBe('reader-won');
  });
});
