import { Chess, type Move } from 'chess.js';
import type { Opening } from '@/openings/types';

export interface ExplorerLine {
  openingName: string;
  variationName: string;
  lineName: string;
  movesUci: string[];
}

export type ExplorerLevel = 'opening' | 'variation' | 'line';

export interface ExplorerCandidate {
  moveUci: string;
  moveSan: string;
  fenAfter: string;
  lineCount: number;
  level: ExplorerLevel;
  names: string[];
  namedHere: string | null;
  hasFurtherMoves: boolean;
}

export interface ExplorerGroup {
  level: ExplorerLevel;
  candidates: ExplorerCandidate[];
}

export interface NamedPosition {
  name: string;
  plyCount: number;
}

export interface ExplorerPosition {
  fen: string;
  movesSan: string[];
  isInBook: boolean;
  lastNamed: NamedPosition | null;
  groups: ExplorerGroup[];
}

const MAIN_LINE_VARIATION_NAME = 'Main Line';
const DEFAULT_PROMOTION = 'q';
const SQUARE_LENGTH = 2;
const SQUARE_PAIR_LENGTH = 4;
const NAMES_SHOWN = 2;
const LEVELS = ['opening', 'variation', 'line'] as const satisfies readonly ExplorerLevel[];

// @FollowsBlueprint core-projection
export function flattenExplorerLines(openings: readonly Opening[]): ExplorerLine[] {
  return openings.flatMap((opening) =>
    opening.variations.flatMap((variation) =>
      variation.lines.map((line) => ({
        openingName: opening.name,
        variationName: variation.name,
        lineName: line.name,
        movesUci: line.movesUci,
      })),
    ),
  );
}

function isLineStartingWith(line: ExplorerLine, playedMovesUci: readonly string[]): boolean {
  return (
    line.movesUci.length >= playedMovesUci.length &&
    playedMovesUci.every((move, index) => line.movesUci[index] === move)
  );
}

function isLineEndingAt(line: ExplorerLine, playedMovesUci: readonly string[]): boolean {
  return line.movesUci.length === playedMovesUci.length && isLineStartingWith(line, playedMovesUci);
}

function readName(line: ExplorerLine, level: ExplorerLevel): string {
  if (level === 'opening') return line.openingName;
  if (level === 'line') return line.lineName;
  return line.variationName === MAIN_LINE_VARIATION_NAME
    ? line.openingName
    : `${line.openingName}: ${line.variationName}`;
}

function listNamesByLineCount(lines: readonly ExplorerLine[], level: ExplorerLevel): string[] {
  const countByName = new Map<string, number>();
  for (const line of lines) {
    const name = readName(line, level);
    countByName.set(name, (countByName.get(name) ?? 0) + 1);
  }
  return [...countByName.entries()]
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'en'))
    .map(([name]) => name);
}

function selectLevel(lines: readonly ExplorerLine[]): ExplorerLevel {
  return LEVELS.find((level) => listNamesByLineCount(lines, level).length > 1) ?? 'line';
}

function findLegalMove(game: Chess, uci: string): Move | null {
  const moves = game.moves({ verbose: true });
  return (
    moves.find((move) => move.lan === uci) ??
    moves.find((move) => move.lan === `${uci}${DEFAULT_PROMOTION}`) ??
    null
  );
}

function replayMoves(playedMovesUci: readonly string[]): { game: Chess; movesSan: string[] } {
  const game = new Chess();
  const movesSan: string[] = [];
  for (const uci of playedMovesUci) {
    const move = findLegalMove(game, uci);
    if (move === null) break;
    game.move(move.san);
    movesSan.push(move.san);
  }
  return { game, movesSan };
}

export function applyExplorerMove(playedMovesUci: readonly string[], uci: string): string[] | null {
  const move = findLegalMove(replayMoves(playedMovesUci).game, uci);
  return move === null ? null : [...playedMovesUci, move.lan];
}

function findLastNamed(
  lines: readonly ExplorerLine[],
  playedMovesUci: readonly string[],
): NamedPosition | null {
  for (let plyCount = playedMovesUci.length; plyCount > 0; plyCount -= 1) {
    const prefix = playedMovesUci.slice(0, plyCount);
    const named = lines.find((line) => isLineEndingAt(line, prefix));
    if (named !== undefined) return { name: named.lineName, plyCount };
  }
  return null;
}

function buildCandidate(
  fen: string,
  moveUci: string,
  through: readonly ExplorerLine[],
  playedMovesUci: readonly string[],
): ExplorerCandidate {
  const game = new Chess(fen);
  const move = game.move(moveUci);
  const childMoves = [...playedMovesUci, moveUci];
  const level = selectLevel(through);
  return {
    moveUci,
    moveSan: move.san,
    fenAfter: game.fen(),
    lineCount: through.length,
    level,
    names: listNamesByLineCount(through, level),
    namedHere: through.find((line) => isLineEndingAt(line, childMoves))?.lineName ?? null,
    hasFurtherMoves: through.some((line) => line.movesUci.length > childMoves.length),
  };
}

function listCandidates(
  fen: string,
  matching: readonly ExplorerLine[],
  playedMovesUci: readonly string[],
): ExplorerCandidate[] {
  const linesByMove = new Map<string, ExplorerLine[]>();
  for (const line of matching) {
    const nextMove = line.movesUci[playedMovesUci.length];
    if (nextMove !== undefined)
      linesByMove.set(nextMove, [...(linesByMove.get(nextMove) ?? []), line]);
  }
  return [...linesByMove.entries()]
    .map(([moveUci, through]) => buildCandidate(fen, moveUci, through, playedMovesUci))
    .toSorted(
      (left, right) =>
        right.lineCount - left.lineCount || left.moveSan.localeCompare(right.moveSan, 'en'),
    );
}

function groupCandidates(candidates: readonly ExplorerCandidate[]): ExplorerGroup[] {
  return LEVELS.map((level) => ({
    level,
    candidates: candidates.filter((candidate) => candidate.level === level),
  })).filter((group) => group.candidates.length > 0);
}

export function selectExplorerPosition(
  lines: readonly ExplorerLine[],
  playedMovesUci: readonly string[],
): ExplorerPosition {
  const { game, movesSan } = replayMoves(playedMovesUci);
  const fen = game.fen();
  const matching = lines.filter((line) => isLineStartingWith(line, playedMovesUci));
  return {
    fen,
    movesSan,
    isInBook: matching.length > 0,
    lastNamed: findLastNamed(lines, playedMovesUci),
    groups: groupCandidates(listCandidates(fen, matching, playedMovesUci)),
  };
}

export function listCandidateMoves(position: ExplorerPosition): string[] {
  return position.groups.flatMap((group) => group.candidates.map((candidate) => candidate.moveUci));
}

export function selectLastMoveSquares(playedMovesUci: readonly string[]): string[] {
  const lastMove = playedMovesUci.at(-1);
  return lastMove === undefined
    ? []
    : [lastMove.slice(0, SQUARE_LENGTH), lastMove.slice(SQUARE_LENGTH, SQUARE_PAIR_LENGTH)];
}

export function takeBackMove(playedMovesUci: readonly string[]): string[] {
  return playedMovesUci.slice(0, -1);
}

export interface ShownNames {
  shown: string[];
  hiddenCount: number;
  hasHiddenNames: boolean;
}

export function selectShownNames(candidate: ExplorerCandidate): ShownNames {
  const names =
    candidate.namedHere === null
      ? candidate.names
      : [candidate.namedHere, ...candidate.names.filter((name) => name !== candidate.namedHere)];
  const hiddenCount = Math.max(0, names.length - NAMES_SHOWN);
  return { shown: names.slice(0, NAMES_SHOWN), hiddenCount, hasHiddenNames: hiddenCount > 0 };
}
