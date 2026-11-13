import { isPositionKey, type PositionKey } from '@domain/position-key.core';
import { type CardId, type CardKind, parseCardId } from '@domain/review-event.core';
import type { Side } from '@/state/persistedState.utils';

export interface BuiltDeckLine {
  name: string;
  movesSan: string[];
  movesUci: string[];
}

export interface MoveCard {
  kind: 'move';
  cardId: CardId;
  deckId: string;
  positionKey: PositionKey;
  fen: string;
  opponentMoveUci: string | null;
  bookMoveUci: string;
  bookMoveSan: string;
  ideaPositionKey: PositionKey;
}

export const NAME_DECK_ID = 'opening-names';
export const NAME_CARD_CHOICE_COUNT = 4;

export type NameCardChoices = [string, string, string, string];

export interface NameCard {
  kind: 'name';
  cardId: CardId;
  deckId: string;
  positionKey: PositionKey;
  fen: string;
  openingName: string;
  movesSan: string[];
  choices: NameCardChoices;
}

export interface TrapCard {
  kind: 'trap';
  cardId: CardId;
  deckId: string;
  fen: string;
  opponentMoveUci: string;
  solutionUci: string[];
}

export type Card = MoveCard | NameCard | TrapCard;

const NAME_CARD_ID_PREFIX = 'name:';
const TRAP_CARD_ID_PREFIX = 'trap:';

export function buildNameCardId(positionKey: PositionKey): CardId {
  return `${NAME_CARD_ID_PREFIX}${positionKey}`;
}

export function buildTrapCardId(puzzleId: string): CardId {
  return `${TRAP_CARD_ID_PREFIX}${puzzleId}`;
}

export type IdeaSource = 'wikipedia';

export interface Idea {
  positionKey: PositionKey;
  en: string;
  fr: string;
  source?: IdeaSource;
  sourceUrl?: string;
}

export interface TrapFilter {
  openingTags: string[];
}

export interface BuiltDeck {
  id: string;
  nameKey: string;
  side: Side;
  lines: BuiltDeckLine[];
  cards: Card[];
  ideas: Idea[];
  trapFilter?: TrapFilter;
}

export const DECKS_DOCUMENT_VERSION = 1;

export interface DecksDocument {
  version: typeof DECKS_DOCUMENT_VERSION;
  decks: BuiltDeck[];
}

const UNKNOWN_DECK_ID = 'unknown';

export class DeckContentInvalidError extends Error {
  readonly deckId: string;

  constructor(deckId: string) {
    super(`The built deck "${deckId}" does not have the shape the trainer reads.`);
    this.name = 'DeckContentInvalidError';
    this.deckId = deckId;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseSide(value: unknown): Side | null {
  return value === 'white' || value === 'black' ? value : null;
}

function parsePositionKey(value: unknown): PositionKey | null {
  const text = String(value);
  return text === value && isPositionKey(text) ? text : null;
}

function parseTextList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const texts: string[] = [];
  for (const entry of value) {
    const text = parseText(entry);
    if (text === null) return null;
    texts.push(text);
  }
  return texts;
}

function parseList<Parsed>(
  value: unknown,
  parseEntry: (entry: unknown) => Parsed | null,
): Parsed[] | null {
  if (!Array.isArray(value)) return null;
  const list: Parsed[] = [];
  for (const entry of value) {
    const parsedEntry = parseEntry(entry);
    if (parsedEntry === null) return null;
    list.push(parsedEntry);
  }
  return list;
}

function parseLine(value: unknown): BuiltDeckLine | null {
  if (!isPlainRecord(value)) return null;
  const name = parseText(value.name);
  const movesSan = parseTextList(value.movesSan);
  const movesUci = parseTextList(value.movesUci);
  if (name === null || movesSan === null || movesUci === null) return null;
  if (movesSan.length !== movesUci.length) return null;
  return { name, movesSan, movesUci };
}

function parseOpponentMove(value: unknown): string | null | undefined {
  if (value === null) return null;
  return parseText(value) ?? undefined;
}

function parseKindCardId(value: unknown, kind: CardKind): CardId | null {
  const text = String(value);
  return text === value && parseCardId(text)?.kind === kind ? text : null;
}

function parseMoveCard(value: unknown): MoveCard | null {
  if (!isPlainRecord(value) || value.kind !== 'move') return null;
  const cardId = parseKindCardId(value.cardId, 'move');
  const deckId = parseText(value.deckId);
  const positionKey = parsePositionKey(value.positionKey);
  const fen = parseText(value.fen);
  const opponentMoveUci = parseOpponentMove(value.opponentMoveUci);
  const bookMoveUci = parseText(value.bookMoveUci);
  const bookMoveSan = parseText(value.bookMoveSan);
  const ideaPositionKey = parsePositionKey(value.ideaPositionKey);
  if (
    cardId === null ||
    deckId === null ||
    positionKey === null ||
    fen === null ||
    opponentMoveUci === undefined ||
    bookMoveUci === null ||
    bookMoveSan === null ||
    ideaPositionKey === null
  ) {
    return null;
  }
  return {
    kind: 'move',
    cardId,
    deckId,
    positionKey,
    fen,
    opponentMoveUci,
    bookMoveUci,
    bookMoveSan,
    ideaPositionKey,
  };
}

export function isNameCardChoices(names: readonly string[]): names is NameCardChoices {
  return names.length === NAME_CARD_CHOICE_COUNT;
}

function parseChoices(value: unknown, openingName: string | null): NameCardChoices | null {
  const choices = parseTextList(value);
  if (choices === null || !isNameCardChoices(choices)) return null;
  const isRightNameOffered = choices.some((choice) => choice === openingName);
  const isEveryChoiceDistinct = new Set(choices).size === NAME_CARD_CHOICE_COUNT;
  return isRightNameOffered && isEveryChoiceDistinct ? choices : null;
}

function parseNameCard(value: unknown): NameCard | null {
  if (!isPlainRecord(value) || value.kind !== 'name' || value.deckId !== NAME_DECK_ID) return null;
  const cardId = parseKindCardId(value.cardId, 'name');
  const positionKey = parsePositionKey(value.positionKey);
  const fen = parseText(value.fen);
  const openingName = parseText(value.openingName);
  const movesSan = parseTextList(value.movesSan);
  const choices = parseChoices(value.choices, openingName);
  if (
    cardId === null ||
    positionKey === null ||
    fen === null ||
    // Stryker disable next-line ConditionalExpression: equivalent mutant, a missing name is never among the parsed choices, so parseChoices already answers null.
    openingName === null ||
    movesSan === null ||
    choices === null
  ) {
    return null;
  }
  return {
    kind: 'name',
    cardId,
    deckId: NAME_DECK_ID,
    positionKey,
    fen,
    openingName,
    movesSan,
    choices,
  };
}

function parseTrapCard(value: unknown): TrapCard | null {
  if (!isPlainRecord(value) || value.kind !== 'trap') return null;
  const cardId = parseKindCardId(value.cardId, 'trap');
  const deckId = parseText(value.deckId);
  const fen = parseText(value.fen);
  const opponentMoveUci = parseText(value.opponentMoveUci);
  const solutionUci = parseTextList(value.solutionUci);
  if (
    cardId === null ||
    deckId === null ||
    fen === null ||
    opponentMoveUci === null ||
    solutionUci === null ||
    solutionUci.length === 0
  ) {
    return null;
  }
  return { kind: 'trap', cardId, deckId, fen, opponentMoveUci, solutionUci };
}

function parseCard(value: unknown): Card | null {
  return parseMoveCard(value) ?? parseNameCard(value) ?? parseTrapCard(value);
}

function parseIdeaCredit(
  source: unknown,
  sourceUrl: unknown,
): Pick<Idea, 'source' | 'sourceUrl'> | null {
  if (source === undefined && sourceUrl === undefined) return {};
  const creditedUrl = parseText(sourceUrl);
  if (source !== 'wikipedia' || creditedUrl === null) return null;
  return { source, sourceUrl: creditedUrl };
}

function parseIdea(value: unknown): Idea | null {
  if (!isPlainRecord(value)) return null;
  const positionKey = parsePositionKey(value.positionKey);
  const english = parseText(value.en);
  const french = parseText(value.fr);
  const credit = parseIdeaCredit(value.source, value.sourceUrl);
  if (positionKey === null || english === null || french === null || credit === null) return null;
  return { positionKey, en: english, fr: french, ...credit };
}

function parseTrapFilter(value: unknown): Pick<BuiltDeck, 'trapFilter'> | null {
  if (value === undefined) return {};
  if (!isPlainRecord(value)) return null;
  const openingTags = parseTextList(value.openingTags);
  if (openingTags === null) return null;
  return { trapFilter: { openingTags } };
}

function parseBuiltDeck(value: Record<string, unknown>): BuiltDeck | null {
  const id = parseText(value.id);
  const nameKey = parseText(value.nameKey);
  const side = parseSide(value.side);
  const lines = parseList(value.lines, parseLine);
  const cards = parseList(value.cards, parseCard);
  const ideas = parseList(value.ideas, parseIdea);
  const trapFilter = parseTrapFilter(value.trapFilter);
  if (
    id === null ||
    nameKey === null ||
    side === null ||
    lines === null ||
    cards === null ||
    ideas === null ||
    trapFilter === null
  ) {
    return null;
  }
  return { id, nameKey, side, lines, cards, ideas, ...trapFilter };
}

function readDeckId(value: unknown): string {
  if (!isPlainRecord(value)) return UNKNOWN_DECK_ID;
  return parseText(value.id) ?? UNKNOWN_DECK_ID;
}

function getBuiltDeck(value: unknown): BuiltDeck {
  const deck = isPlainRecord(value) ? parseBuiltDeck(value) : null;
  if (deck === null) throw new DeckContentInvalidError(readDeckId(value));
  return deck;
}

// @FollowsBlueprint unknown-payload-parser
export function parseDecksDocument(value: unknown): DecksDocument {
  if (
    !isPlainRecord(value) ||
    value.version !== DECKS_DOCUMENT_VERSION ||
    !Array.isArray(value.decks)
  ) {
    throw new DeckContentInvalidError(UNKNOWN_DECK_ID);
  }
  return {
    version: DECKS_DOCUMENT_VERSION,
    decks: value.decks.map((deck: unknown) => getBuiltDeck(deck)),
  };
}
