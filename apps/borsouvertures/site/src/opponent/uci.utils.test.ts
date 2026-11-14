import { describe, expect, it } from 'vitest';
import {
  isEngineReady,
  isHandshakeDone,
  isSearchFinished,
  parseBestMove,
  parseUciScore,
} from './uci.utils';

// @FollowsBlueprint test-pure-unit
describe('parseUciScore', () => {
  it('reads a centipawn score', () => {
    expect(parseUciScore('info depth 16 seldepth 22 multipv 1 score cp 54 nodes 9 pv e7e5')).toBe(
      54,
    );
    expect(parseUciScore('info depth 16 score cp -81 nodes 9')).toBe(-81);
    expect(parseUciScore('info depth 16 score cp 0')).toBe(0);
  });

  it('counts a mate as plus or minus 10,000', () => {
    expect(parseUciScore('info depth 16 score mate 3 pv f2g1n')).toBe(10_000);
    expect(parseUciScore('info depth 16 score mate -2 pv e1d2')).toBe(-10_000);
  });

  it('ignores a bound, a line with no score and a line that is no info line', () => {
    expect(parseUciScore('info depth 12 score cp 30 lowerbound nodes 4')).toBeNull();
    expect(parseUciScore('info depth 12 score cp 30 upperbound nodes 4')).toBeNull();
    expect(parseUciScore('info depth 16 currmove e7e5 currmovenumber 1')).toBeNull();
    expect(parseUciScore('bestmove e7e5 ponder d4e5')).toBeNull();
    expect(parseUciScore('say info depth 1 score cp 5')).toBeNull();
    expect(parseUciScore('info string highscore cp 5')).toBeNull();
  });
});

describe('parseBestMove', () => {
  it('reads the move with or without a ponder move', () => {
    expect(parseBestMove('bestmove e7e5 ponder d4e5')).toBe('e7e5');
    expect(parseBestMove('bestmove e7e5')).toBe('e7e5');
  });

  it('keeps a promotion piece', () => {
    expect(parseBestMove('bestmove f2g1n ponder e2e1')).toBe('f2g1n');
  });

  it('answers null when the engine has no move or the line is something else', () => {
    expect(parseBestMove('bestmove (none)')).toBeNull();
    expect(parseBestMove('info depth 16 score cp 54 pv e7e5')).toBeNull();
    expect(parseBestMove('the bestmove e7e5')).toBeNull();
    expect(parseBestMove('bestmove e7e5x')).toBeNull();
  });
});

describe('the engine status lines', () => {
  it('knows the end of a search', () => {
    expect(isSearchFinished('bestmove e7e5 ponder d4e5')).toBe(true);
    expect(isSearchFinished('bestmove (none)')).toBe(true);
    expect(isSearchFinished('info depth 16 score cp 54')).toBe(false);
  });

  it('knows the end of the handshake', () => {
    expect(isHandshakeDone('uciok')).toBe(true);
    expect(isHandshakeDone('uciok\r')).toBe(true);
    expect(isHandshakeDone('id name Stockfish')).toBe(false);
    expect(isHandshakeDone('readyok')).toBe(false);
  });

  it('knows the ready answer', () => {
    expect(isEngineReady('readyok')).toBe(true);
    expect(isEngineReady(' readyok ')).toBe(true);
    expect(isEngineReady('uciok')).toBe(false);
  });
});
