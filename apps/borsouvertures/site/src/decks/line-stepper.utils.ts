import type { Side } from '@/state/persistedState.utils';
import type { LineStep } from './card.core';
import type { BuiltDeckLine } from './deck.utils';

export type LineStepControl = 'first' | 'previous' | 'next' | 'last';

export interface SquareHighlight {
  backgroundColor: string;
}

export const LINE_START_POSITION = 0;
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ONE_STEP = 1;

const TARGET_BY_CONTROL = {
  first: () => LINE_START_POSITION,
  previous: (position) => position - ONE_STEP,
  next: (position) => position + ONE_STEP,
  last: (_position, stepCount) => stepCount,
} as const satisfies Record<LineStepControl, (position: number, stepCount: number) => number>;

// @FollowsBlueprint utils-pure-module
export function moveLineStepPosition(
  position: number,
  control: LineStepControl,
  stepCount: number,
): number {
  const target = TARGET_BY_CONTROL[control](position, stepCount);
  return Math.min(stepCount, Math.max(LINE_START_POSITION, target));
}

export function isLineStepControlBlocked(
  position: number,
  control: LineStepControl,
  stepCount: number,
): boolean {
  return moveLineStepPosition(position, control, stepCount) === position;
}

export function selectLineStep(steps: readonly LineStep[], position: number): LineStep | null {
  return steps[position - ONE_STEP] ?? null;
}

export function selectLineStepFen(steps: readonly LineStep[], position: number): string {
  return selectLineStep(steps, position)?.fen ?? STARTING_FEN;
}

export function buildLastMoveHighlights(
  step: LineStep | null,
  color: string,
): Record<string, SquareHighlight> {
  if (step === null) return {};
  return {
    [step.fromSquare]: { backgroundColor: color },
    [step.toSquare]: { backgroundColor: color },
  };
}

export function isReaderStep(step: LineStep | null, readerSide: Side): boolean {
  return step?.mover === readerSide;
}

export function findDeckLine(
  lines: readonly BuiltDeckLine[],
  lineName: string | null,
): BuiltDeckLine | null {
  return lines.find((line) => line.name === lineName) ?? null;
}
