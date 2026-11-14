import { describe, expect, it } from 'vitest';
import {
  EVALUATION_DEPTH,
  isEvaluationRetried,
  EVALUATION_TIME_LIMIT_MILLISECONDS,
  listEvaluationCommands,
  readStockfishEvaluation,
  selectEvaluationBarView,
  selectShownEvaluationBar,
  type StockfishEvaluation,
} from './stockfish-evaluation.core';

const WHITE_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function readFrom(line: string, fen = WHITE_TO_MOVE): StockfishEvaluation | null {
  return readStockfishEvaluation([line, 'bestmove e2e4'], fen);
}

function viewOf(evaluation: StockfishEvaluation | null, orientation: 'white' | 'black' = 'white') {
  return selectEvaluationBarView({ evaluation, hasFailed: false }, orientation);
}

// @FollowsBlueprint test-pure-unit
describe('listEvaluationCommands', () => {
  it('lifts every strength limit, then searches 14 plies deep for 500 ms at most', () => {
    expect([EVALUATION_DEPTH, EVALUATION_TIME_LIMIT_MILLISECONDS]).toEqual([14, 500]);
    expect(listEvaluationCommands(WHITE_TO_MOVE)).toEqual([
      'setoption name UCI_LimitStrength value false',
      'setoption name Skill Level value 20',
      `position fen ${WHITE_TO_MOVE}`,
      'go depth 14 movetime 500',
    ]);
  });
});

describe('readStockfishEvaluation', () => {
  it("reads centipawns from White's side, whoever is to move", () => {
    expect(readFrom('info depth 14 seldepth 18 score cp 31 nodes 12 pv e2e4')).toEqual({
      kind: 'centipawns',
      whiteCentipawns: 31,
    });
    expect(readFrom('info depth 14 score cp 31 nodes 12', BLACK_TO_MOVE)).toEqual({
      kind: 'centipawns',
      whiteCentipawns: -31,
    });
    expect(readFrom('info depth 14 score cp -40 nodes 12', BLACK_TO_MOVE)).toEqual({
      kind: 'centipawns',
      whiteCentipawns: 40,
    });
  });

  it('names the side that mates and in how many moves', () => {
    expect(readFrom('info depth 9 score mate 3 pv d1h5')).toEqual({
      kind: 'mate',
      winner: 'white',
      moveCount: 3,
    });
    expect(readFrom('info depth 9 score mate -2 pv d1h5')).toEqual({
      kind: 'mate',
      winner: 'black',
      moveCount: 2,
    });
    expect(readFrom('info depth 9 score mate 1 pv d8h4', BLACK_TO_MOVE)).toEqual({
      kind: 'mate',
      winner: 'black',
      moveCount: 1,
    });
  });

  it('names the other side the winner when the side to move is already mated', () => {
    expect(readFrom('info depth 0 score mate 0', BLACK_TO_MOVE)).toEqual({
      kind: 'mate',
      winner: 'white',
      moveCount: 0,
    });
  });

  it('takes the last exact score and skips the bounds of an unfinished iteration', () => {
    expect(
      readStockfishEvaluation(
        [
          'info depth 12 score cp 20 nodes 1',
          'info depth 13 score cp 25 nodes 2',
          'info depth 14 score cp 31 upperbound nodes 3',
          'info depth 14 score cp 35 lowerbound nodes 4',
          'bestmove e2e4',
        ],
        WHITE_TO_MOVE,
      ),
    ).toEqual({ kind: 'centipawns', whiteCentipawns: 25 });
  });

  it('reads nothing from a search that printed no score', () => {
    expect(
      readStockfishEvaluation(['info string NNUE enabled', 'bestmove (none)'], WHITE_TO_MOVE),
    ).toBeNull();
    expect(readFrom('score cp 31')).toBeNull();
  });
});

describe('selectEvaluationBarView', () => {
  it('writes centipawns as pawns with one decimal and a sign', () => {
    const ahead = viewOf({ kind: 'centipawns', whiteCentipawns: 64 });
    expect([ahead.text, ahead.labelKind, ahead.amount]).toEqual(['+0.6', 'white-ahead', '0.6']);
    const behind = viewOf({ kind: 'centipawns', whiteCentipawns: -123 });
    expect([behind.text, behind.labelKind, behind.amount]).toEqual(['-1.2', 'black-ahead', '1.2']);
  });

  it('writes a score that rounds to nothing as an even 0.0', () => {
    for (const whiteCentipawns of [0, 4, -4]) {
      const even = viewOf({ kind: 'centipawns', whiteCentipawns });
      expect([even.text, even.labelKind]).toEqual(['0.0', 'equal']);
    }
    expect(viewOf({ kind: 'centipawns', whiteCentipawns: 5 }).text).toBe('+0.1');
  });

  it('drops the decimal from ten pawns up, so the text fits the bar', () => {
    expect(viewOf({ kind: 'centipawns', whiteCentipawns: 1376 }).text).toBe('+14');
    expect(viewOf({ kind: 'centipawns', whiteCentipawns: -996 }).text).toBe('-10');
    expect(viewOf({ kind: 'centipawns', whiteCentipawns: -994 }).text).toBe('-9.9');
  });

  it('writes a mate as M and the number of moves, with a minus for Black', () => {
    const white = viewOf({ kind: 'mate', winner: 'white', moveCount: 3 });
    expect([white.text, white.labelKind, white.moveCount, white.amount]).toEqual([
      'M3',
      'white-mates',
      3,
      '',
    ]);
    const black = viewOf({ kind: 'mate', winner: 'black', moveCount: 2 });
    expect([black.text, black.labelKind, black.moveCount]).toEqual(['-M2', 'black-mates', 2]);
  });

  it('writes a mate on the board as the result', () => {
    const white = viewOf({ kind: 'mate', winner: 'white', moveCount: 0 });
    expect([white.text, white.labelKind, white.amount]).toEqual(['1-0', 'white-won', '']);
    const black = viewOf({ kind: 'mate', winner: 'black', moveCount: 0 });
    expect([black.text, black.labelKind]).toEqual(['0-1', 'black-won']);
  });

  it("gives White a share of the bar from the score's winning chances", () => {
    expect(viewOf({ kind: 'centipawns', whiteCentipawns: 0 }).whiteSharePercent).toBe(50);
    expect(viewOf({ kind: 'centipawns', whiteCentipawns: 100 }).whiteSharePercent).toBeCloseTo(
      59.1,
      1,
    );
    expect(viewOf({ kind: 'centipawns', whiteCentipawns: -300 }).whiteSharePercent).toBeCloseTo(
      24.9,
      1,
    );
    expect(viewOf({ kind: 'mate', winner: 'white', moveCount: 4 }).whiteSharePercent).toBe(100);
    expect(viewOf({ kind: 'mate', winner: 'black', moveCount: 4 }).whiteSharePercent).toBe(0);
  });

  it("writes the text at the leading side's end, on that side's colour", () => {
    const whiteAhead: StockfishEvaluation = { kind: 'centipawns', whiteCentipawns: 60 };
    const blackAhead: StockfishEvaluation = { kind: 'centipawns', whiteCentipawns: -60 };
    expect(viewOf(whiteAhead, 'white')).toMatchObject({
      isWhiteAtBottom: true,
      textEnd: 'bottom',
      isTextOnWhite: true,
    });
    expect(viewOf(whiteAhead, 'black')).toMatchObject({
      isWhiteAtBottom: false,
      textEnd: 'top',
      isTextOnWhite: true,
    });
    expect(viewOf(blackAhead, 'white')).toMatchObject({ textEnd: 'top', isTextOnWhite: false });
    expect(viewOf(blackAhead, 'black')).toMatchObject({ textEnd: 'bottom', isTextOnWhite: false });
  });

  it('holds the bar at half with no text while Stockfish looks', () => {
    expect(viewOf(null, 'black')).toEqual({
      isVisible: true,
      whiteSharePercent: 50,
      isWhiteAtBottom: false,
      text: '',
      textEnd: 'top',
      isTextOnWhite: true,
      labelKind: 'pending',
      labelKey: 'board.evaluation.pending',
      amount: '',
      moveCount: 0,
    });
  });

  it('hides the bar once Stockfish could not answer', () => {
    expect(selectEvaluationBarView({ evaluation: null, hasFailed: true }, 'white').isVisible).toBe(
      false,
    );
  });
});

describe('selectShownEvaluationBar', () => {
  it('draws the bar only when the reader keeps it shown', () => {
    const reading = { evaluation: null, hasFailed: false };
    expect(selectShownEvaluationBar(false, reading, 'white')).toBeNull();
    expect(selectShownEvaluationBar(true, reading, 'white')).toEqual(viewOf(null));
  });
});

function keyOf(evaluation: StockfishEvaluation) {
  return viewOf(evaluation).labelKey;
}

describe('the label key of the bar', () => {
  it('names each reading with its own key', () => {
    expect([
      keyOf({ kind: 'centipawns', whiteCentipawns: 0 }),
      keyOf({ kind: 'centipawns', whiteCentipawns: 50 }),
      keyOf({ kind: 'centipawns', whiteCentipawns: -50 }),
      keyOf({ kind: 'mate', winner: 'white', moveCount: 2 }),
      keyOf({ kind: 'mate', winner: 'black', moveCount: 2 }),
      keyOf({ kind: 'mate', winner: 'white', moveCount: 0 }),
      keyOf({ kind: 'mate', winner: 'black', moveCount: 0 }),
    ]).toEqual([
      'board.evaluation.equal',
      'board.evaluation.white-ahead',
      'board.evaluation.black-ahead',
      'board.evaluation.white-mates',
      'board.evaluation.black-mates',
      'board.evaluation.white-won',
      'board.evaluation.black-won',
    ]);
  });
});

describe('isEvaluationRetried', () => {
  const stopped = Object.assign(new Error('stopped'), { name: 'StockfishSearchStoppedError' });

  it('asks again once for a search the worker was stopped in the middle of', () => {
    expect(isEvaluationRetried(0, stopped)).toBe(true);
    expect(isEvaluationRetried(1, stopped)).toBe(false);
  });

  it('gives up at once on a worker that could not load', () => {
    const failed = Object.assign(new Error('offline'), { name: 'StockfishLoadFailedError' });
    expect(isEvaluationRetried(0, failed)).toBe(false);
  });
});
