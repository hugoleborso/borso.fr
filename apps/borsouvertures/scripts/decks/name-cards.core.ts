import { Chess } from 'chess.js';
import { derivePositionKey } from '../../domain/position-key.core';
import {
  buildNameCardId,
  isNameCardChoices,
  NAME_CARD_CHOICE_COUNT,
  NAME_DECK_ID,
  type NameCard,
  type NameCardChoices,
} from '../../site/src/decks/deck.utils';
import { parseOpenings } from '../../site/src/openings/parseOpenings.utils';
import type { Line } from '../../site/src/openings/types';

export interface NameCardsInput {
  nameList: unknown;
  openings: unknown;
}

export interface NameCardsBuild {
  cards: NameCard[];
  problems: string[];
}

const FILE_LABEL = 'name-cards.json';
const HASH_OFFSET_BASIS = 2_166_136_261;
const HASH_PRIME = 16_777_619;
const SEED_SEPARATOR = '\n';
const PATH_SEPARATOR = ' ';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseNames(nameList: unknown): string[] | null {
  if (!isPlainRecord(nameList) || !Array.isArray(nameList.names)) return null;
  const names = nameList.names.filter((name: unknown) => isText(name));
  return names.length === nameList.names.length ? names : null;
}

function readLines(openings: unknown): Line[] | null {
  try {
    return parseOpenings(openings).flatMap((opening) =>
      opening.variations.flatMap((variation) => variation.lines),
    );
  } catch {
    return null;
  }
}

export function hashSeededText(seed: string, text: string): number {
  let hash = HASH_OFFSET_BASIS;
  for (const byte of new TextEncoder().encode(`${seed}${SEED_SEPARATOR}${text}`)) {
    hash = Math.imul(hash ^ byte, HASH_PRIME) >>> 0;
  }
  return hash;
}

function listInSeededOrder(names: readonly string[], seed: string): string[] {
  return names.toSorted((left, right) => hashSeededText(seed, left) - hashSeededText(seed, right));
}

function selectChoices(openingName: string, names: readonly string[]): NameCardChoices | null {
  const otherNames = listInSeededOrder(
    names.filter((name) => name !== openingName),
    openingName,
  ).slice(0, NAME_CARD_CHOICE_COUNT - 1);
  const choices = listInSeededOrder([openingName, ...otherNames], openingName);
  return isNameCardChoices(choices) ? choices : null;
}

function findShortestLine(lines: readonly Line[], openingName: string): Line | null {
  const [shortest] = lines
    .filter((line) => line.name === openingName)
    .toSorted(
      (left, right) =>
        left.movesSan.length - right.movesSan.length ||
        left.movesUci.join(PATH_SEPARATOR).localeCompare(right.movesUci.join(PATH_SEPARATOR), 'en'),
    );
  return shortest ?? null;
}

function replayToFen(movesSan: readonly string[]): string {
  const game = new Chess();
  for (const san of movesSan) game.move(san);
  return game.fen();
}

function buildNameCard(line: Line, choices: NameCardChoices): NameCard {
  const fen = replayToFen(line.movesSan);
  const positionKey = derivePositionKey(fen);
  return {
    kind: 'name',
    cardId: buildNameCardId(positionKey),
    deckId: NAME_DECK_ID,
    positionKey,
    fen,
    openingName: line.name,
    movesSan: line.movesSan,
    choices,
  };
}

// @FollowsBlueprint core-projection
export function buildNameCards(input: NameCardsInput): NameCardsBuild {
  const names = parseNames(input.nameList);
  const lines = readLines(input.openings);
  if (names === null) {
    return {
      cards: [],
      problems: [`${FILE_LABEL} must hold { "names": [...] } with opening names`],
    };
  }
  if (lines === null) {
    return { cards: [], problems: ['openings.json does not have the shape the name cards read'] };
  }
  const distinctNames = [...new Set(names)];
  const cards: NameCard[] = [];
  const problems: string[] = [];
  for (const openingName of names) {
    const line = findShortestLine(lines, openingName);
    const choices = selectChoices(openingName, distinctNames);
    if (cards.some((card) => card.openingName === openingName)) {
      problems.push(`${FILE_LABEL}: "${openingName}" is listed twice`);
    } else if (line === null) {
      problems.push(`${FILE_LABEL}: "${openingName}" is the name of no line of openings.json`);
    } else if (choices === null) {
      problems.push(
        `${FILE_LABEL}: "${openingName}" needs ${NAME_CARD_CHOICE_COUNT} names to choose from, the list holds ${distinctNames.length}`,
      );
    } else {
      const card = buildNameCard(line, choices);
      const twin = cards.find((other) => other.positionKey === card.positionKey);
      if (twin === undefined) {
        cards.push(card);
      } else {
        problems.push(
          `${FILE_LABEL}: "${openingName}" shows the same position as "${twin.openingName}"`,
        );
      }
    }
  }
  return { cards, problems };
}
