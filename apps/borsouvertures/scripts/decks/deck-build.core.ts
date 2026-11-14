import { Chess } from 'chess.js';
import { derivePositionKey, type PositionKey } from '../../domain/position-key.core';
import { buildMoveCardId } from '../../domain/review-event.core';
import {
  type BuiltDeck,
  type BuiltDeckLine,
  type Card,
  DECKS_DOCUMENT_VERSION,
  type DecksDocument,
  type Idea,
  type MoveCard,
  NAME_DECK_ID,
  type NameCard,
  type TrapCard,
} from '../../site/src/decks/deck.utils';
import { buildTrapCards } from '../traps/trap-cards.core';
import { type DeckSource, type EngineException, parseDeckSource } from './deck-source.core';
import {
  describeIdeasProblem,
  type IdeasCredit,
  type IdeasFile,
  parseIdeasMarkdown,
} from './ideas-markdown.core';
import { buildNameCards, type NameCardsInput } from './name-cards.core';

export interface DeckFolder {
  folderName: string;
  deck: unknown;
  ideasEnglish: string;
  ideasFrench: string;
}

export interface DeckBuildInput {
  folders: readonly DeckFolder[];
  catalogues: { en: unknown; fr: unknown };
  nameCards?: NameCardsInput;
  traps?: unknown;
}

export interface ReaderMove {
  deckId: string;
  lineName: string;
  ply: number;
  pathSan: string[];
  pathUci: string;
  fen: string;
  positionKey: PositionKey;
  opponentMoveUci: string | null;
  moveUci: string;
  moveSan: string;
  ideaPositionKey: PositionKey;
  exception: EngineException | null;
}

export type DeckBuild =
  | { ok: true; document: DecksDocument; readerMoves: ReaderMove[] }
  | { ok: false; problems: string[] };

type IdeaLanguage = 'en' | 'fr';

interface ReplayedDeck {
  source: DeckSource;
  lines: BuiltDeckLine[];
  readerMoves: ReaderMove[];
  ideas: Idea[];
  problems: string[];
}

interface ReplayedPath {
  pathUci: string | null;
  problem: string | null;
}

const PLIES_PER_FULL_MOVE = 2;
const PATH_SEPARATOR = ' ';
const CATALOGUE_KEY_SEPARATOR = '.';
export const NAME_DECK_NAME_KEY = 'cards.name-deck';
const NAME_DECK_SIDE = 'white';
const NO_TRAPS = { traps: [] };
const LANGUAGE_NAMES: Record<IdeaLanguage, string> = { en: 'English', fr: 'French' };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasCatalogueKey(catalogue: unknown, key: string): boolean {
  let current: unknown = catalogue;
  for (const segment of key.split(CATALOGUE_KEY_SEPARATOR)) {
    if (!isPlainRecord(current)) return false;
    current = current[segment];
  }
  return typeof current === 'string';
}

function isReaderPly(source: DeckSource, plyIndex: number): boolean {
  return (plyIndex % PLIES_PER_FULL_MOVE === 0) === (source.side === 'white');
}

function replayPath(movesSan: readonly string[]): ReplayedPath {
  const game = new Chess();
  const movesUci: string[] = [];
  for (const [plyIndex, san] of movesSan.entries()) {
    try {
      movesUci.push(game.move(san).lan);
    } catch {
      return { pathUci: null, problem: `ply ${plyIndex + 1}: "${san}" is not a legal move` };
    }
  }
  return { pathUci: movesUci.join(PATH_SEPARATOR), problem: null };
}

function replayLine(
  source: DeckSource,
  line: DeckSource['lines'][number],
): { line: BuiltDeckLine; readerMoves: ReaderMove[]; problems: string[] } {
  const game = new Chess();
  const movesSan: string[] = [];
  const movesUci: string[] = [];
  const readerMoves: ReaderMove[] = [];
  const label = `line "${line.name}"`;
  for (const [plyIndex, san] of line.movesSan.entries()) {
    const fen = game.fen();
    let move;
    try {
      move = game.move(san);
    } catch {
      return {
        line: { name: line.name, movesSan, movesUci },
        readerMoves,
        problems: [`${label}, ply ${plyIndex + 1}: "${san}" is not a legal move`],
      };
    }
    const opponentMoveUci = movesUci.at(-1) ?? null;
    movesSan.push(move.san);
    movesUci.push(move.lan);
    if (isReaderPly(source, plyIndex)) {
      readerMoves.push({
        deckId: source.id,
        lineName: line.name,
        ply: plyIndex + 1,
        pathSan: [...movesSan],
        pathUci: movesUci.join(PATH_SEPARATOR),
        fen,
        positionKey: derivePositionKey(fen),
        opponentMoveUci,
        moveUci: move.lan,
        moveSan: move.san,
        ideaPositionKey: derivePositionKey(game.fen()),
        exception: null,
      });
    }
  }
  const { minimum, maximum } = source.pliesPerLine;
  const isLengthAllowed = movesSan.length >= minimum && movesSan.length <= maximum;
  return {
    line: { name: line.name, movesSan, movesUci },
    readerMoves,
    problems: isLengthAllowed
      ? []
      : [`${label} has ${movesSan.length} plies, ${minimum} to ${maximum} are allowed`],
  };
}

function listLineOverlaps(lines: readonly BuiltDeckLine[]): string[] {
  const problems: string[] = [];
  for (const [index, line] of lines.entries()) {
    const path = line.movesUci.join(PATH_SEPARATOR);
    for (const other of lines.slice(index + 1)) {
      const otherPath = other.movesUci.join(PATH_SEPARATOR);
      if (path === otherPath) {
        problems.push(`line "${other.name}" repeats line "${line.name}"`);
      } else if (otherPath.startsWith(`${path}${PATH_SEPARATOR}`)) {
        problems.push(`line "${line.name}" is a prefix of line "${other.name}"`);
      } else if (path.startsWith(`${otherPath}${PATH_SEPARATOR}`)) {
        problems.push(`line "${other.name}" is a prefix of line "${line.name}"`);
      }
    }
  }
  return problems;
}

function listReaderMoveConflicts(readerMoves: readonly ReaderMove[]): string[] {
  const first = new Map<PositionKey, ReaderMove>();
  const problems: string[] = [];
  for (const move of readerMoves) {
    const known = first.get(move.positionKey);
    if (known === undefined) {
      first.set(move.positionKey, move);
    } else if (known.moveUci !== move.moveUci) {
      problems.push(
        `line "${move.lineName}", ply ${move.ply}: the reader plays ${move.moveSan} where line "${known.lineName}" plays ${known.moveSan} (${move.positionKey})`,
      );
    }
  }
  return problems;
}

function attachExceptions(
  source: DeckSource,
  readerMoves: readonly ReaderMove[],
): { readerMoves: ReaderMove[]; problems: string[] } {
  const exceptionByPath = new Map<string | null, EngineException>();
  const problems: string[] = [];
  for (const exception of source.engineExceptions) {
    const label = `engine exception "${exception.movesSan.join(PATH_SEPARATOR)}"`;
    const path = replayPath(exception.movesSan);
    if (path.problem !== null) {
      problems.push(`${label}, ${path.problem}`);
    } else if (readerMoves.some((move) => move.pathUci === path.pathUci)) {
      exceptionByPath.set(path.pathUci, exception);
    } else {
      problems.push(`${label} does not end on a reader move of a line of this deck`);
    }
  }
  return {
    readerMoves: readerMoves.map((move) => ({
      ...move,
      exception: exceptionByPath.get(move.pathUci) ?? null,
    })),
    problems,
  };
}

function readIdeasFile(
  text: string,
  language: IdeaLanguage,
): { file: IdeasFile; problems: string[] } {
  try {
    return { file: parseIdeasMarkdown(text), problems: [] };
  } catch (error) {
    return {
      file: { credit: null, sections: [] },
      problems: [`ideas.${language}.md: ${describeIdeasProblem(error)}`],
    };
  }
}

function mapIdeaTexts(
  file: IdeasFile,
  language: IdeaLanguage,
  readerMoves: readonly ReaderMove[],
): { textByKey: Map<PositionKey, string>; problems: string[] } {
  const textByKey = new Map<PositionKey, string>();
  const problems: string[] = [];
  for (const section of file.sections) {
    const label = `ideas.${language}.md, "${section.heading}"`;
    const path = replayPath(section.movesSan);
    const readerMove = readerMoves.find((move) => move.pathUci === path.pathUci);
    const known = readerMove === undefined ? undefined : textByKey.get(readerMove.ideaPositionKey);
    if (path.problem !== null) {
      problems.push(`${label}, ${path.problem}`);
    } else if (readerMove === undefined) {
      problems.push(`${label}: the path does not end on a reader move of a line of this deck`);
    } else if (known !== undefined && known !== section.body) {
      problems.push(`${label}: another path reaches the same position with a different text`);
    } else {
      textByKey.set(readerMove.ideaPositionKey, section.body);
    }
  }
  return { textByKey, problems };
}

function listMissingIdeas(
  readerMoves: readonly ReaderMove[],
  textByKey: ReadonlyMap<PositionKey, string>,
  language: IdeaLanguage,
): string[] {
  const reported = new Set<PositionKey>();
  const problems: string[] = [];
  for (const move of readerMoves) {
    if (!textByKey.has(move.ideaPositionKey) && !reported.has(move.ideaPositionKey)) {
      reported.add(move.ideaPositionKey);
      problems.push(
        `the ${LANGUAGE_NAMES[language]} idea of "${move.pathSan.join(PATH_SEPARATOR)}" is missing from ideas.${language}.md`,
      );
    }
  }
  return problems;
}

function buildCredit(credit: IdeasCredit | null): Pick<Idea, 'source' | 'sourceUrl'> {
  return credit === null ? {} : { source: credit.source, sourceUrl: credit.sourceUrl };
}

function buildIdeas(
  folder: DeckFolder,
  readerMoves: readonly ReaderMove[],
): { ideas: Idea[]; problems: string[] } {
  const english = readIdeasFile(folder.ideasEnglish, 'en');
  const french = readIdeasFile(folder.ideasFrench, 'fr');
  const englishTexts = mapIdeaTexts(english.file, 'en', readerMoves);
  const frenchTexts = mapIdeaTexts(french.file, 'fr', readerMoves);
  const credit = buildCredit(english.file.credit ?? french.file.credit);
  const ideas: Idea[] = [];
  for (const [positionKey, englishText] of englishTexts.textByKey) {
    const frenchText = frenchTexts.textByKey.get(positionKey) ?? englishText;
    ideas.push({ positionKey, en: englishText, fr: frenchText, ...credit });
  }
  return {
    ideas,
    problems: [
      ...english.problems,
      ...french.problems,
      ...englishTexts.problems,
      ...frenchTexts.problems,
      ...listMissingIdeas(readerMoves, englishTexts.textByKey, 'en'),
      ...listMissingIdeas(readerMoves, frenchTexts.textByKey, 'fr'),
    ],
  };
}

function listCatalogueProblems(
  source: DeckSource,
  catalogues: DeckBuildInput['catalogues'],
): string[] {
  const languages: IdeaLanguage[] = ['en', 'fr'];
  return languages
    .filter((language) => !hasCatalogueKey(catalogues[language], source.nameKey))
    .map((language) => `"nameKey" ${source.nameKey} is missing from ${language}.json`);
}

function replayDeck(
  folder: DeckFolder,
  source: DeckSource,
  catalogues: DeckBuildInput['catalogues'],
): ReplayedDeck {
  const replayedLines = source.lines.map((line) => replayLine(source, line));
  const lines = replayedLines.map((replayed) => replayed.line);
  const excused = attachExceptions(
    source,
    replayedLines.flatMap((replayed) => replayed.readerMoves),
  );
  const lineProblems = replayedLines.flatMap((replayed) => replayed.problems);
  const ideas = buildIdeas(folder, excused.readerMoves);
  const ideaProblems = lineProblems.length === 0 ? ideas.problems : [];
  const idProblems =
    source.id === folder.folderName
      ? []
      : [`"id" is ${source.id} and the folder is ${folder.folderName}`];
  return {
    source,
    lines,
    readerMoves: excused.readerMoves,
    ideas: ideas.ideas,
    problems: [
      ...idProblems,
      ...listCatalogueProblems(source, catalogues),
      ...lineProblems,
      ...listLineOverlaps(lines),
      ...listReaderMoveConflicts(excused.readerMoves),
      ...excused.problems,
      ...ideaProblems,
    ],
  };
}

function listOrderProblems(decks: readonly ReplayedDeck[]): string[] {
  const problems: string[] = [];
  for (const [index, deck] of decks.entries()) {
    const twin = decks.slice(0, index).find((other) => other.source.order === deck.source.order);
    if (twin !== undefined) {
      problems.push(
        `deck "${deck.source.id}": "order" ${deck.source.order} is already used by deck "${twin.source.id}"`,
      );
    }
  }
  return problems;
}

function buildCards(
  deck: ReplayedDeck,
  earlierDecks: readonly ReplayedDeck[],
): { cards: MoveCard[]; problems: string[] } {
  const owned = new Map<PositionKey, ReaderMove>();
  for (const earlier of earlierDecks.toReversed()) {
    for (const move of earlier.readerMoves.toReversed()) owned.set(move.positionKey, move);
  }
  const cards = new Map<PositionKey, MoveCard>();
  const problems: string[] = [];
  for (const move of deck.readerMoves) {
    const owner = owned.get(move.positionKey);
    if (owner !== undefined && owner.moveUci !== move.moveUci) {
      problems.push(
        `deck "${deck.source.id}", line "${move.lineName}", ply ${move.ply}: the reader plays ${move.moveSan} where deck "${owner.deckId}" plays ${owner.moveSan} (${move.positionKey})`,
      );
    }
    if (owner === undefined && !cards.has(move.positionKey)) {
      cards.set(move.positionKey, {
        kind: 'move',
        cardId: buildMoveCardId(deck.source.id, move.positionKey),
        deckId: deck.source.id,
        positionKey: move.positionKey,
        fen: move.fen,
        opponentMoveUci: move.opponentMoveUci,
        bookMoveUci: move.moveUci,
        bookMoveSan: move.moveSan,
        ideaPositionKey: move.ideaPositionKey,
      });
    }
  }
  return { cards: [...cards.values()], problems };
}

function buildDeck(deck: ReplayedDeck, cards: Card[]): BuiltDeck {
  const trapFilter = deck.source.trapFilter;
  return {
    id: deck.source.id,
    nameKey: deck.source.nameKey,
    side: deck.source.side,
    lines: deck.lines,
    cards,
    ideas: deck.ideas,
    ...(trapFilter === undefined ? {} : { trapFilter }),
  };
}

function listNameKeyProblems(catalogues: DeckBuildInput['catalogues']): string[] {
  const languages: IdeaLanguage[] = ['en', 'fr'];
  return languages
    .filter((language) => !hasCatalogueKey(catalogues[language], NAME_DECK_NAME_KEY))
    .map(
      (language) => `the name deck's key ${NAME_DECK_NAME_KEY} is missing from ${language}.json`,
    );
}

function buildNameDecks(input: DeckBuildInput): { decks: BuiltDeck[]; problems: string[] } {
  if (input.nameCards === undefined) return { decks: [], problems: [] };
  const built = buildNameCards(input.nameCards);
  const cards: NameCard[] = built.cards;
  return {
    decks: [
      {
        id: NAME_DECK_ID,
        nameKey: NAME_DECK_NAME_KEY,
        side: NAME_DECK_SIDE,
        lines: [],
        cards,
        ideas: [],
      },
    ],
    problems: [...built.problems, ...listNameKeyProblems(input.catalogues)],
  };
}

// @FollowsBlueprint core-projection
export function buildDecksDocument(input: DeckBuildInput): DeckBuild {
  const problems: string[] = [];
  const replayed: ReplayedDeck[] = [];
  for (const folder of input.folders) {
    const source = parseDeckSource(folder.deck);
    if (source.ok) {
      const deck = replayDeck(folder, source.deck, input.catalogues);
      replayed.push(deck);
      problems.push(...deck.problems.map((problem) => `deck "${folder.folderName}": ${problem}`));
    } else {
      problems.push(...source.problems.map((problem) => `deck "${folder.folderName}": ${problem}`));
    }
  }
  const ordered = replayed.toSorted((left, right) => left.source.order - right.source.order);
  problems.push(...listOrderProblems(ordered));
  const traps = buildTrapCards(
    input.traps ?? NO_TRAPS,
    ordered.map((deck) => deck.source),
  );
  problems.push(...traps.problems);
  const decks: BuiltDeck[] = [];
  for (const [index, deck] of ordered.entries()) {
    const built = buildCards(deck, ordered.slice(0, index));
    const trapCards: TrapCard[] = traps.cardsByDeckId.get(deck.source.id) ?? [];
    problems.push(...built.problems);
    decks.push(buildDeck(deck, [...built.cards, ...trapCards]));
  }
  const nameDecks = buildNameDecks(input);
  problems.push(...nameDecks.problems);
  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    document: { version: DECKS_DOCUMENT_VERSION, decks: [...decks, ...nameDecks.decks] },
    readerMoves: ordered.flatMap((deck) => deck.readerMoves),
  };
}
