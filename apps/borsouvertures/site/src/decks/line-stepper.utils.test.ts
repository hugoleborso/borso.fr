import { describe, expect, it } from 'vitest';
import type { LineStep } from './card.core';
import {
  buildLastMoveHighlights,
  findDeckLine,
  isLineStepControlBlocked,
  isReaderStep,
  LINE_START_POSITION,
  moveLineStepPosition,
  selectLineStep,
  selectLineStepFen,
} from './line-stepper.utils';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FIRST_STEP: LineStep = {
  fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
  notation: '1. d4',
  fromSquare: 'd2',
  toSquare: 'd4',
  piece: 'wP',
  kind: 'move',
  mover: 'white',
  idea: null,
};

const SECOND_STEP: LineStep = {
  fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
  notation: '1... d5',
  fromSquare: 'd7',
  toSquare: 'd5',
  piece: 'bP',
  kind: 'move',
  mover: 'black',
  idea: null,
};

const STEPS = [FIRST_STEP, SECOND_STEP];

// @FollowsBlueprint test-pure-unit
describe('stepping through a line', () => {
  it('starts on the position before the first move', () => {
    expect(LINE_START_POSITION).toBe(0);
    expect(selectLineStep(STEPS, LINE_START_POSITION)).toBeNull();
    expect(selectLineStepFen(STEPS, LINE_START_POSITION)).toBe(STARTING_FEN);
  });

  it('moves one ply forward or back, and jumps to either end', () => {
    expect(moveLineStepPosition(1, 'next', 2)).toBe(2);
    expect(moveLineStepPosition(1, 'previous', 2)).toBe(0);
    expect(moveLineStepPosition(1, 'first', 2)).toBe(0);
    expect(moveLineStepPosition(0, 'last', 2)).toBe(2);
  });

  it('stays inside the line at both ends', () => {
    expect(moveLineStepPosition(2, 'next', 2)).toBe(2);
    expect(moveLineStepPosition(0, 'previous', 2)).toBe(0);
    expect(moveLineStepPosition(5, 'previous', 2)).toBe(2);
  });

  it('blocks the controls that would not move', () => {
    expect(isLineStepControlBlocked(0, 'first', 2)).toBe(true);
    expect(isLineStepControlBlocked(0, 'previous', 2)).toBe(true);
    expect(isLineStepControlBlocked(0, 'next', 2)).toBe(false);
    expect(isLineStepControlBlocked(2, 'next', 2)).toBe(true);
    expect(isLineStepControlBlocked(2, 'last', 2)).toBe(true);
    expect(isLineStepControlBlocked(1, 'last', 2)).toBe(false);
  });

  it('shows the position after the move the step reached', () => {
    expect(selectLineStep(STEPS, 2)).toBe(SECOND_STEP);
    expect(selectLineStepFen(STEPS, 1)).toBe(FIRST_STEP.fen);
    expect(selectLineStepFen(STEPS, 2)).toBe(SECOND_STEP.fen);
  });

  it('highlights the two squares of the last move, and none at the start', () => {
    expect(buildLastMoveHighlights(FIRST_STEP, '#f6f669')).toEqual({
      d2: { backgroundColor: '#f6f669' },
      d4: { backgroundColor: '#f6f669' },
    });
    expect(buildLastMoveHighlights(null, '#f6f669')).toEqual({});
  });

  it('tells a reader move from an opponent move', () => {
    expect(isReaderStep(SECOND_STEP, 'black')).toBe(true);
    expect(isReaderStep(FIRST_STEP, 'black')).toBe(false);
    expect(isReaderStep(null, 'black')).toBe(false);
  });
});

describe('finding the opened line', () => {
  const lines = [
    { name: 'Main line', movesSan: ['d4'], movesUci: ['d2d4'] },
    { name: 'Side line', movesSan: ['e4'], movesUci: ['e2e4'] },
  ];

  it('finds the line by its name, and none when no line is opened or the name is gone', () => {
    expect(findDeckLine(lines, 'Side line')).toBe(lines[1]);
    expect(findDeckLine(lines, null)).toBeNull();
    expect(findDeckLine(lines, 'Removed line')).toBeNull();
  });
});
