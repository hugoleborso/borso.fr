import {
  DEFAULT_OPPONENT_STRENGTH,
  isOpponentStrengthId,
  type OpponentStrengthId,
} from '@/opponent/opponent-strength.core';
import { type BoardThemeId, isBoardThemeId } from '@/theme/boardThemes.utils';

export type Side = 'white' | 'black';

export const NEW_CARDS_PER_DAY_DEFAULT = 10;
export const NEW_CARDS_PER_DAY_MAXIMUM = 30;

export interface PersistedState {
  side: Side;
  boardStyle: BoardThemeId;
  newCardsPerDay: number;
  opponentStrength: OpponentStrengthId;
  isEvaluationBarShown: boolean;
  isMoveSoundOn: boolean;
}

export const IS_EVALUATION_BAR_SHOWN_BY_DEFAULT = true;
export const IS_MOVE_SOUND_ON_BY_DEFAULT = false;

/**
 * @Blueprint unknown-payload-parser
 * @BlueprintName Unknown Payload Parser
 * @BlueprintUsage Use for any boundary where a value arrives as `unknown`, such as storage, a fetch body, or a bundled JSON import.
 * @BlueprintDescription Annotates the parse result as `const parsed: unknown` rather than asserting a shape onto it, then narrows one field at a time through a small named predicate per field, each returning the typed value or `null`. The returned object is rebuilt field by field from those narrowed values, so TypeScript infers the result type instead of being told it, and a field the payload is missing cannot reach the caller. A field the record no longer carries, such as the Explore fields a record from before 2026-11-13 still holds, is ignored rather than refused, so an old record keeps the reader's side, board and settings.
 */
export function parsePersistedState(raw: string): PersistedState | null {
  let record: Record<string, unknown>;
  try {
    const storedValue: unknown = JSON.parse(raw);
    if (!isPlainRecord(storedValue)) return null;
    record = storedValue;
  } catch {
    return null;
  }

  const side = parseSide(record.side);
  const boardStyle = parseBoardStyle(record.boardStyle);
  const newCardsPerDay = parseNewCardsPerDay(record.newCardsPerDay);
  const opponentStrength = parseOpponentStrength(record.opponentStrength);

  if (
    side === null ||
    boardStyle === null ||
    newCardsPerDay === null ||
    opponentStrength === null
  ) {
    return null;
  }
  return {
    side,
    boardStyle,
    newCardsPerDay,
    opponentStrength,
    isEvaluationBarShown: isFlagOn(record.isEvaluationBarShown, IS_EVALUATION_BAR_SHOWN_BY_DEFAULT),
    isMoveSoundOn: isFlagOn(record.isMoveSoundOn, IS_MOVE_SOUND_ON_BY_DEFAULT),
  };
}

function isFlagOn(value: unknown, isOnByDefault: boolean): boolean {
  return typeof value === 'boolean' ? value : isOnByDefault;
}

function parseOpponentStrength(value: unknown): OpponentStrengthId | null {
  if (value === undefined) return DEFAULT_OPPONENT_STRENGTH;
  return isOpponentStrengthId(value) ? value : null;
}

export function isNewCardsPerDay(value: unknown): value is number {
  return (
    Number.isInteger(value) && Number(value) >= 0 && Number(value) <= NEW_CARDS_PER_DAY_MAXIMUM
  );
}

function parseNewCardsPerDay(value: unknown): number | null {
  return isNewCardsPerDay(value) ? value : null;
}

export function listNewCardsPerDayChoices(): number[] {
  return Array.from({ length: NEW_CARDS_PER_DAY_MAXIMUM + 1 }, (_unused, count) => count);
}

export function toNewCardsPerDay(value: string, current: number): number {
  const count = value.trim() === '' ? Number.NaN : Number(value);
  return isNewCardsPerDay(count) ? count : current;
}

export function stringifyPersistedState(state: PersistedState): string {
  return JSON.stringify(state);
}

function parseSide(value: unknown): Side | null {
  return value === 'white' || value === 'black' ? value : null;
}

function parseBoardStyle(value: unknown): BoardThemeId | null {
  return isBoardThemeId(value) ? value : null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  // Stryker disable next-line ConditionalExpression: equivalent mutant, a primitive root carries none of the fields, so the parse answers null anyway.
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
