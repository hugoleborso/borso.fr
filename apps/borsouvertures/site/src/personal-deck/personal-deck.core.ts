import { Chess } from 'chess.js';
import {
  buildDeckLineKey,
  type DeckLineEvent,
  listDeckLineEventsInReplayOrder,
} from '@domain/deck-line-event.core';
import { type CalendarDay, shiftCalendarDay } from '@domain/calendar-day.core';
import { derivePositionKey, type PositionKey } from '@domain/position-key.core';
import { buildMoveCardId } from '@domain/review-event.core';
import { formatNumberedLine } from '@/decks/card.core';
import type { BuiltDeck, BuiltDeckLine, Idea, MoveCard } from '@/decks/deck.utils';
import { uciFromSquare, uciPromotion, uciToSquare } from '@/openings/uciSquare.utils';
import type { Side } from '@/state/persistedState.utils';

export interface PersonalLine {
  key: string;
  side: Side;
  movesUci: string[];
  movesSan: string[];
  openingName: string | null;
  addedOn: CalendarDay;
  readerMoves: ReaderMove[];
}

export interface LineCandidate {
  side: Side;
  movesUci: readonly string[];
}

export type LineAddRefusal = 'illegal' | 'no-reader-move' | 'already-in-deck' | 'conflicts';

export type LineAddCheck =
  | { ok: true; replacedKeys: string[]; movesSan: string[]; readerMoves: ReaderMove[] }
  | { ok: false; reason: LineAddRefusal; conflictingMoveSan: string | null };

export interface ReaderMove {
  positionKey: PositionKey;
  fen: string;
  opponentMoveUci: string | null;
  moveUci: string;
  moveSan: string;
  ideaPositionKey: PositionKey;
}

interface ReplayedLine {
  movesSan: string[];
  readerMoves: ReaderMove[];
}

export const PERSONAL_DECK_ID_BY_SIDE = {
  white: 'my-lines-white',
  black: 'my-lines-black',
} as const satisfies Record<Side, string>;

export const PERSONAL_DECK_NAME_KEY = 'decks.my-lines';

const SIDES = ['white', 'black'] as const satisfies readonly Side[];
const SIDE_BY_TURN: Record<'w' | 'b', Side> = { w: 'white', b: 'black' };

function replayLine(side: Side, movesUci: readonly string[]): ReplayedLine | null {
  const game = new Chess();
  const movesSan: string[] = [];
  const readerMoves: ReaderMove[] = [];
  for (const moveUci of movesUci) {
    const fen = game.fen();
    const isReaderMove = SIDE_BY_TURN[game.turn()] === side;
    let san: string;
    try {
      san = game.move({
        from: uciFromSquare(moveUci),
        to: uciToSquare(moveUci),
        promotion: uciPromotion(moveUci),
      }).san;
    } catch {
      return null;
    }
    if (isReaderMove) {
      readerMoves.push({
        positionKey: derivePositionKey(fen),
        fen,
        opponentMoveUci: movesUci[movesSan.length - 1] ?? null,
        moveUci,
        moveSan: san,
        ideaPositionKey: derivePositionKey(game.fen()),
      });
    }
    movesSan.push(san);
  }
  return { movesSan, readerMoves };
}

function isPrefixOf(shorter: readonly string[], longer: readonly string[]): boolean {
  return shorter.length <= longer.length && shorter.every((move, index) => longer[index] === move);
}

function findConflictingMove(
  readerMoves: readonly ReaderMove[],
  lines: readonly PersonalLine[],
): string | null {
  const moveByPosition = new Map<PositionKey, ReaderMove>();
  for (const line of lines) {
    for (const move of line.readerMoves) {
      moveByPosition.set(move.positionKey, move);
    }
  }
  for (const move of readerMoves) {
    const known = moveByPosition.get(move.positionKey);
    if (known !== undefined && known.moveUci !== move.moveUci) return known.moveSan;
  }
  return null;
}

// @FollowsBlueprint core-decision
export function checkLineAdd(
  lines: readonly PersonalLine[],
  candidate: LineCandidate,
): LineAddCheck {
  const replayed = replayLine(candidate.side, candidate.movesUci);
  if (replayed === null) return { ok: false, reason: 'illegal', conflictingMoveSan: null };
  if (replayed.readerMoves.length === 0) {
    return { ok: false, reason: 'no-reader-move', conflictingMoveSan: null };
  }
  const sameSide = lines.filter((line) => line.side === candidate.side);
  if (sameSide.some((line) => isPrefixOf(candidate.movesUci, line.movesUci))) {
    return { ok: false, reason: 'already-in-deck', conflictingMoveSan: null };
  }
  const conflictingMoveSan = findConflictingMove(replayed.readerMoves, sameSide);
  if (conflictingMoveSan !== null) return { ok: false, reason: 'conflicts', conflictingMoveSan };
  const replacedKeys = sameSide
    .filter((line) => isPrefixOf(line.movesUci, candidate.movesUci))
    .map((line) => line.key);
  return {
    ok: true,
    replacedKeys,
    movesSan: replayed.movesSan,
    readerMoves: replayed.readerMoves,
  };
}

function addLine(lines: readonly PersonalLine[], event: DeckLineEvent): PersonalLine[] {
  const check = checkLineAdd(lines, event);
  if (!check.ok) return [...lines];
  const kept = lines.filter((line) => !check.replacedKeys.includes(line.key));
  return [
    ...kept,
    {
      key: buildDeckLineKey(event.side, event.movesUci),
      side: event.side,
      movesUci: [...event.movesUci],
      movesSan: check.movesSan,
      openingName: event.openingName,
      addedOn: event.calendarDay,
      readerMoves: check.readerMoves,
    },
  ];
}

export function replayPersonalLines(events: readonly DeckLineEvent[], now: Date): PersonalLine[] {
  let lines: PersonalLine[] = [];
  for (const event of listDeckLineEventsInReplayOrder(events, now)) {
    const key = buildDeckLineKey(event.side, event.movesUci);
    lines =
      event.kind === 'line-added'
        ? addLine(lines, event)
        : lines.filter((line) => line.key !== key);
  }
  return lines;
}

export function findPersonalLine(
  lines: readonly PersonalLine[],
  side: Side,
  movesUci: readonly string[],
): PersonalLine | null {
  const key = buildDeckLineKey(side, movesUci);
  return lines.find((line) => line.key === key) ?? null;
}

function selectLineName(line: PersonalLine): string {
  return line.openingName ?? formatNumberedLine(line.movesSan);
}

function buildDeckLines(lines: readonly PersonalLine[]): BuiltDeckLine[] {
  const countByName = new Map<string, number>();
  return lines.map((line) => {
    const baseName = selectLineName(line);
    const seen = countByName.get(baseName) ?? 0;
    countByName.set(baseName, seen + 1);
    const name = seen === 0 ? baseName : `${baseName} (${String(seen + 1)})`;
    return { name, movesSan: [...line.movesSan], movesUci: [...line.movesUci] };
  });
}

function buildPersonalDeck(side: Side, lines: readonly PersonalLine[]): BuiltDeck {
  const deckId = PERSONAL_DECK_ID_BY_SIDE[side];
  const cards = new Map<PositionKey, MoveCard>();
  const ideas = new Map<PositionKey, Idea>();
  for (const line of lines) {
    for (const move of line.readerMoves) {
      const name = selectLineName(line);
      if (!cards.has(move.positionKey)) {
        cards.set(move.positionKey, {
          kind: 'move',
          cardId: buildMoveCardId(deckId, move.positionKey),
          deckId,
          positionKey: move.positionKey,
          fen: move.fen,
          opponentMoveUci: move.opponentMoveUci,
          bookMoveUci: move.moveUci,
          bookMoveSan: move.moveSan,
          ideaPositionKey: move.ideaPositionKey,
          dueFromDay: shiftCalendarDay(line.addedOn, 1),
        });
      }
      if (!ideas.has(move.ideaPositionKey)) {
        ideas.set(move.ideaPositionKey, {
          positionKey: move.ideaPositionKey,
          en: name,
          fr: name,
          source: 'opening-name',
        });
      }
    }
  }
  return {
    id: deckId,
    nameKey: PERSONAL_DECK_NAME_KEY,
    side,
    lines: buildDeckLines(lines),
    cards: [...cards.values()],
    ideas: [...ideas.values()],
  };
}

// @FollowsBlueprint core-projection
export function buildPersonalDecks(lines: readonly PersonalLine[]): BuiltDeck[] {
  return SIDES.flatMap((side) => {
    const sideLines = lines.filter((line) => line.side === side);
    return sideLines.length === 0 ? [] : [buildPersonalDeck(side, sideLines)];
  });
}

export function isPersonalDeck(deckId: string): boolean {
  return SIDES.some((side) => PERSONAL_DECK_ID_BY_SIDE[side] === deckId);
}
