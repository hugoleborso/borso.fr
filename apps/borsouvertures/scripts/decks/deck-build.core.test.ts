import { describe, expect, it } from 'vitest';
import { type Card, type MoveCard, parseDecksDocument } from '../../site/src/decks/deck.utils';
import { EXAMPLE_TRAP_CARD } from '../../site/src/decks/deck.test-utils';
import {
  buildDecksDocument,
  type DeckBuildInput,
  type DeckFolder,
  hasCatalogueKey,
} from './deck-build.core';
import {
  buildExampleFolder,
  buildExampleInput,
  buildIdeasMarkdown,
  EXAMPLE_CATALOGUE,
  EXAMPLE_DECK,
  EXAMPLE_PATHS,
  NAME_CARD_OPENINGS,
} from './deck-build.test-utils';
import { buildNameCards } from './name-cards.core';

const MAIN_LINE = ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6'];
const FIRST_KEY = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';
const FIRST_IDEA_KEY = 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -';

function listMoveCards(cards: readonly Card[] = []): MoveCard[] {
  return cards.filter((card) => card.kind === 'move');
}

function listBookMoves(cards: readonly Card[] = []): string[] {
  return listMoveCards(cards).map((card) => card.bookMoveSan);
}

function listProblems(folders: readonly DeckFolder[]): string[] {
  const build = buildDecksDocument(buildExampleInput(folders));
  return build.ok ? [] : build.problems;
}

function withDeck(
  change: Record<string, unknown>,
  overrides: Partial<DeckFolder> = {},
): DeckFolder {
  return buildExampleFolder({ deck: { ...EXAMPLE_DECK, ...change }, ...overrides });
}

function buildWhiteFolder(id: string, order: number, movesSan: string[]): DeckFolder {
  const paths = movesSan
    .map((_san, index) => movesSan.slice(0, index + 1))
    .filter((path) => path.length % 2 === 1)
    .map((path) => path.join(' '));
  return {
    folderName: id,
    deck: {
      id,
      order,
      nameKey: 'decks.names.vienna-game',
      side: 'white',
      pliesPerLine: { minimum: 1, maximum: 20 },
      lines: [{ name: 'Main line', movesSan }],
    },
    ideasEnglish: buildIdeasMarkdown('English', paths),
    ideasFrench: buildIdeasMarkdown('French', paths),
  };
}

// @FollowsBlueprint test-pure-unit
describe('buildDecksDocument, the worked example', () => {
  it('builds six cards from two lines that share three reader moves', () => {
    const build = buildDecksDocument(buildExampleInput([buildExampleFolder()]));
    if (!build.ok) throw new Error(build.problems.join('\n'));
    const [deck] = build.document.decks;
    expect(build.document.version).toBe(1);
    expect(build.document.decks).toHaveLength(1);
    expect(listBookMoves(deck?.cards)).toEqual(['d5', 'e5', 'd4', 'Nc6', 'Bb4+', 'dxe3']);
    expect(deck?.cards[0]).toEqual({
      kind: 'move',
      cardId: `move:albin-countergambit:${FIRST_KEY}`,
      deckId: 'albin-countergambit',
      positionKey: FIRST_KEY,
      fen: `${FIRST_KEY} 0 1`,
      opponentMoveUci: 'd2d4',
      bookMoveUci: 'd7d5',
      bookMoveSan: 'd5',
      ideaPositionKey: FIRST_IDEA_KEY,
    });
  });

  it('keeps the lines in both notations, the side, the name key and no trap filter', () => {
    const build = buildDecksDocument(buildExampleInput([buildExampleFolder()]));
    if (!build.ok) throw new Error(build.problems.join('\n'));
    const [deck] = build.document.decks;
    expect(deck).toMatchObject({
      id: 'albin-countergambit',
      nameKey: 'decks.names.albin-countergambit',
      side: 'black',
    });
    expect(deck).not.toHaveProperty('trapFilter');
    expect(deck?.lines[0]).toEqual({
      name: 'Main line',
      movesSan: MAIN_LINE,
      movesUci: ['d2d4', 'd7d5', 'c2c4', 'e7e5', 'd4e5', 'd5d4', 'g1f3', 'b8c6'],
    });
    expect(deck?.lines[1]?.name).toBe('Lasker Trap');
  });

  it('keys each idea by the position after the reader move, in both languages', () => {
    const build = buildDecksDocument(buildExampleInput([buildExampleFolder()]));
    if (!build.ok) throw new Error(build.problems.join('\n'));
    const ideas = build.document.decks[0]?.ideas ?? [];
    expect(ideas).toHaveLength(6);
    expect(ideas[0]).toEqual({
      positionKey: FIRST_IDEA_KEY,
      en: 'English idea 1.',
      fr: 'French idea 1.',
    });
  });

  it('lists every reader move of every line with its path, for the engine gate', () => {
    const build = buildDecksDocument(buildExampleInput([buildExampleFolder()]));
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(build.readerMoves).toHaveLength(9);
    expect(build.readerMoves[3]).toEqual({
      deckId: 'albin-countergambit',
      lineName: 'Main line',
      ply: 8,
      pathSan: MAIN_LINE,
      pathUci: 'd2d4 d7d5 c2c4 e7e5 d4e5 d5d4 g1f3 b8c6',
      fen: 'rnbqkbnr/ppp2ppp/8/4P3/2Pp4/5N2/PP2PPPP/RNBQKB1R b KQkq - 1 4',
      positionKey: 'rnbqkbnr/ppp2ppp/8/4P3/2Pp4/5N2/PP2PPPP/RNBQKB1R b KQkq -',
      opponentMoveUci: 'g1f3',
      moveUci: 'b8c6',
      moveSan: 'Nc6',
      ideaPositionKey: 'r1bqkbnr/ppp2ppp/2n5/4P3/2Pp4/5N2/PP2PPPP/RNBQKB1R w KQkq -',
      exception: null,
    });
  });

  it('writes a document the site loader reads back unchanged after a JSON round trip', () => {
    const build = buildDecksDocument(buildExampleInput([buildExampleFolder()]));
    if (!build.ok) throw new Error(build.problems.join('\n'));
    const roundTripped: unknown = JSON.parse(JSON.stringify(build.document));
    expect(parseDecksDocument(roundTripped)).toEqual(build.document);
  });
});

describe('buildDecksDocument, what a deck may add', () => {
  it('carries the trap filter, the Wikipedia credit and an exception onto its move', () => {
    const credit =
      '---\nsource: wikipedia\nsourceUrl: https://en.wikipedia.org/wiki/Albin\n---\n\n';
    const exception = {
      movesSan: ['d4', 'd5', 'c4', 'e5'],
      reason: 'A sound gambit known to theory.',
    };
    const build = buildDecksDocument(
      buildExampleInput([
        withDeck(
          { trapFilter: { openingTags: ['Albin'] }, engineExceptions: [exception] },
          { ideasFrench: credit + buildIdeasMarkdown('French', EXAMPLE_PATHS) },
        ),
      ]),
    );
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(build.document.decks[0]?.trapFilter).toEqual({ openingTags: ['Albin'] });
    expect(build.document.decks[0]?.ideas[0]).toEqual({
      positionKey: FIRST_IDEA_KEY,
      en: 'English idea 1.',
      fr: 'French idea 1.',
      source: 'wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/Albin',
    });
    expect(build.readerMoves.map((move) => move.exception)).toEqual([
      null,
      exception,
      null,
      null,
      null,
      exception,
      null,
      null,
      null,
    ]);
  });

  it('prefers the English credit when both files carry one', () => {
    const english =
      '---\nsource: wikipedia\nsourceUrl: https://en.wikipedia.org/wiki/Albin\n---\n\n';
    const french =
      '---\nsource: wikipedia\nsourceUrl: https://fr.wikipedia.org/wiki/Albin\n---\n\n';
    const build = buildDecksDocument(
      buildExampleInput([
        buildExampleFolder({
          ideasEnglish: english + buildIdeasMarkdown('English', EXAMPLE_PATHS),
          ideasFrench: french + buildIdeasMarkdown('French', EXAMPLE_PATHS),
        }),
      ]),
    );
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(build.document.decks[0]?.ideas[0]?.sourceUrl).toBe(
      'https://en.wikipedia.org/wiki/Albin',
    );
  });

  it('accepts the same idea written under two paths that reach one position', () => {
    const transposing = {
      ...EXAMPLE_DECK,
      pliesPerLine: { minimum: 4, maximum: 20 },
      lines: [
        { name: 'Knight first', movesSan: ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'c5'] },
        { name: 'Pawn first', movesSan: ['d4', 'd5', 'e3', 'Nf6', 'Nf3', 'c5', 'c3', 'Nc6'] },
      ],
    };
    const paths = [
      'd4 d5',
      'd4 d5 Nf3 Nf6',
      'd4 d5 e3 Nf6',
      'd4 d5 Nf3 Nf6 e3 c5',
      'd4 d5 e3 Nf6 Nf3 c5 c3 Nc6',
    ];
    const texts = (language: string) =>
      `${buildIdeasMarkdown(language, paths)}\n## d4 d5 e3 Nf6 Nf3 c5\n\n${language} idea 4.\n`;
    const build = buildDecksDocument(
      buildExampleInput([
        buildExampleFolder({
          deck: transposing,
          ideasEnglish: texts('English'),
          ideasFrench: texts('French'),
        }),
      ]),
    );
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(listBookMoves(build.document.decks[0]?.cards)).toEqual([
      'd5',
      'Nf6',
      'c5',
      'Nf6',
      'Nc6',
    ]);
    expect(build.document.decks[0]?.ideas).toHaveLength(5);
  });

  it('gives a card whose reader moves first no opponent move', () => {
    const build = buildDecksDocument(
      buildExampleInput([buildWhiteFolder('vienna-game', 4, ['e4', 'e5', 'Nc3'])]),
    );
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(
      listMoveCards(build.document.decks[0]?.cards).map((card) => card.opponentMoveUci),
    ).toEqual([null, 'e7e5']);
    expect(build.readerMoves.map((move) => move.ply)).toEqual([1, 3]);
  });
});

describe('buildDecksDocument, the rules', () => {
  it('rule 1 names the deck, the line and the ply of an illegal move', () => {
    const lines = [
      { name: 'Main line', movesSan: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc5'] },
    ];
    expect(listProblems([withDeck({ lines })])).toEqual([
      'deck "albin-countergambit": line "Main line", ply 8: "Nc5" is not a legal move',
    ]);
  });

  it('rule 2 refuses a line shorter or longer than the deck allows', () => {
    expect(listProblems([withDeck({ pliesPerLine: { minimum: 9, maximum: 20 } })])).toEqual([
      'deck "albin-countergambit": line "Main line" has 8 plies, 9 to 20 are allowed',
    ]);
    expect(listProblems([withDeck({ pliesPerLine: { minimum: 8, maximum: 9 } })])).toEqual([
      'deck "albin-countergambit": line "Lasker Trap" has 10 plies, 8 to 9 are allowed',
    ]);
    expect(listProblems([withDeck({ pliesPerLine: { minimum: 8, maximum: 10 } })])).toEqual([]);
  });

  it('rule 3 refuses a repeated line and a line that is a prefix of another, either way round', () => {
    const main = { name: 'Main line', movesSan: MAIN_LINE };
    const longer = { name: 'Longer', movesSan: [...MAIN_LINE, 'g3', 'Nge7'] };
    const twin = { name: 'Twin', movesSan: MAIN_LINE };
    const ideas = buildIdeasMarkdown('Any', [
      ...EXAMPLE_PATHS.slice(0, 4),
      `${MAIN_LINE.join(' ')} g3 Nge7`,
    ]);
    const texts = { ideasEnglish: ideas, ideasFrench: ideas };
    const shortIdeas = buildIdeasMarkdown('Any', EXAMPLE_PATHS.slice(0, 4));
    const shortTexts = { ideasEnglish: shortIdeas, ideasFrench: shortIdeas };
    expect(listProblems([withDeck({ lines: [main, twin] }, shortTexts)])).toEqual([
      'deck "albin-countergambit": line "Twin" repeats line "Main line"',
    ]);
    expect(listProblems([withDeck({ lines: [main, longer] }, texts)])).toEqual([
      'deck "albin-countergambit": line "Main line" is a prefix of line "Longer"',
    ]);
    expect(listProblems([withDeck({ lines: [longer, main] }, texts)])).toEqual([
      'deck "albin-countergambit": line "Main line" is a prefix of line "Longer"',
    ]);
  });

  it('rule 3 lets two lines share moves without one being a prefix of the other', () => {
    const lines = [
      { name: 'Knight', movesSan: ['d4', 'd5', 'Nf3', 'Nf6'] },
      { name: 'Knight and more', movesSan: ['d4', 'd5', 'Nf3', 'Nf6', 'Nf3x'] },
    ];
    expect(listProblems([withDeck({ lines, pliesPerLine: { minimum: 4, maximum: 20 } })])[0]).toBe(
      'deck "albin-countergambit": line "Knight and more", ply 5: "Nf3x" is not a legal move',
    );
  });

  it('rule 4 refuses two reader moves from one position', () => {
    const lines = [
      { name: 'Main line', movesSan: MAIN_LINE },
      { name: 'Other fourth move', movesSan: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'c5'] },
    ];
    expect(listProblems([withDeck({ lines })])[0]).toBe(
      'deck "albin-countergambit": line "Other fourth move", ply 8: the reader plays c5 where line "Main line" plays Nc6 (rnbqkbnr/ppp2ppp/8/4P3/2Pp4/5N2/PP2PPPP/RNBQKB1R b KQkq -)',
    );
  });

  it('rule 5 gives a shared position to the deck with the lower order', () => {
    const build = buildDecksDocument(
      buildExampleInput([
        buildWhiteFolder('vienna-game', 4, ['e4', 'e5', 'Nc3']),
        buildWhiteFolder('caro-kann', 3, ['e4', 'c6', 'Nc3']),
      ]),
    );
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(build.document.decks.map((deck) => deck.id)).toEqual(['caro-kann', 'vienna-game']);
    expect(build.document.decks.map((deck) => listBookMoves(deck.cards))).toEqual([
      ['e4', 'Nc3'],
      ['Nc3'],
    ]);
    expect(build.document.decks[1]?.ideas).toHaveLength(2);
    expect(build.readerMoves.map((move) => move.deckId)).toEqual([
      'caro-kann',
      'caro-kann',
      'vienna-game',
      'vienna-game',
    ]);
  });

  it('rule 5 refuses two decks of one side that leave a shared position by two moves', () => {
    expect(
      listProblems([
        buildWhiteFolder('caro-kann', 3, ['e4', 'c6', 'Nc3']),
        buildWhiteFolder('vienna-game', 4, ['d4', 'd5', 'c4']),
      ]),
    ).toEqual([
      'deck "vienna-game", line "Main line", ply 1: the reader plays d4 where deck "caro-kann" plays e4 (rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -)',
    ]);
  });

  it('rule 5 names the deck with the lowest order as the owner, and its first line', () => {
    expect(
      listProblems([
        buildWhiteFolder('grand-prix', 5, ['d4', 'd5', 'c4']),
        buildWhiteFolder('vienna-game', 4, ['e4', 'e5', 'Nc3']),
        buildWhiteFolder('caro-kann', 3, ['e4', 'c6', 'Nc3']),
      ]),
    ).toEqual([
      'deck "grand-prix", line "Main line", ply 1: the reader plays d4 where deck "caro-kann" plays e4 (rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -)',
    ]);
  });

  it('rule 5 leaves decks of opposite sides alone, and the earlier deck owns its first copy', () => {
    const build = buildDecksDocument(
      buildExampleInput([
        buildExampleFolder(),
        buildWhiteFolder('vienna-game', 4, ['d4', 'd5', 'c4']),
      ]),
    );
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(build.document.decks.map((deck) => deck.cards.length)).toEqual([6, 2]);
  });

  it('refuses two decks with one order, and an id that is not the folder name', () => {
    expect(
      listProblems([buildExampleFolder(), buildWhiteFolder('vienna-game', 1, ['e4', 'e5', 'Nc3'])]),
    ).toEqual(['deck "vienna-game": "order" 1 is already used by deck "albin-countergambit"']);
    expect(listProblems([buildExampleFolder({ folderName: 'albin' })])).toEqual([
      'deck "albin": "id" is albin-countergambit and the folder is albin',
    ]);
  });

  it('rule 6 refuses a name key missing from either catalogue', () => {
    const input = buildExampleInput([buildExampleFolder()]);
    const build = buildDecksDocument({ ...input, catalogues: { en: EXAMPLE_CATALOGUE, fr: {} } });
    expect(build).toEqual({
      ok: false,
      problems: [
        'deck "albin-countergambit": "nameKey" decks.names.albin-countergambit is missing from fr.json',
      ],
    });
    const neither = buildDecksDocument({ ...input, catalogues: { en: null, fr: { decks: 'x' } } });
    expect(neither.ok ? [] : neither.problems).toEqual([
      'deck "albin-countergambit": "nameKey" decks.names.albin-countergambit is missing from en.json',
      'deck "albin-countergambit": "nameKey" decks.names.albin-countergambit is missing from fr.json',
    ]);
  });

  it('rule 7 refuses an exception that is illegal, ends on an opponent move or leaves the deck', () => {
    const reason = 'A sound gambit known to theory.';
    const engineExceptions = [
      { movesSan: ['d4', 'd5', 'c4', 'e9'], reason },
      { movesSan: ['d4', 'd5', 'c4'], reason },
      { movesSan: ['d4', 'd5', 'Nf3', 'Nf6'], reason },
    ];
    expect(listProblems([withDeck({ engineExceptions })])).toEqual([
      'deck "albin-countergambit": engine exception "d4 d5 c4 e9", ply 4: "e9" is not a legal move',
      'deck "albin-countergambit": engine exception "d4 d5 c4" does not end on a reader move of a line of this deck',
      'deck "albin-countergambit": engine exception "d4 d5 Nf3 Nf6" does not end on a reader move of a line of this deck',
    ]);
  });

  it('reports the field problems of a deck.json under its folder', () => {
    expect(listProblems([buildExampleFolder({ deck: { ...EXAMPLE_DECK, side: 'both' } })])).toEqual(
      ['deck "albin-countergambit": "side" must be "white" or "black"'],
    );
  });
});

describe('buildDecksDocument, rule 8 on ideas', () => {
  it('refuses a missing French idea and names its path', () => {
    const ideasFrench = buildIdeasMarkdown('French', EXAMPLE_PATHS.slice(0, 5));
    expect(listProblems([buildExampleFolder({ ideasFrench })])).toEqual([
      'deck "albin-countergambit": the French idea of "d4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3" is missing from ideas.fr.md',
    ]);
  });

  it('refuses a missing English idea once, however many lines share the move', () => {
    const ideasEnglish = buildIdeasMarkdown('English', EXAMPLE_PATHS.slice(1));
    expect(listProblems([buildExampleFolder({ ideasEnglish })])).toEqual([
      'deck "albin-countergambit": the English idea of "d4 d5" is missing from ideas.en.md',
    ]);
  });

  it('refuses two paths that reach one position with two texts', () => {
    const ideasEnglish = `${buildIdeasMarkdown('English', EXAMPLE_PATHS)}\n## d4 d5\n\nAnother text.\n`;
    expect(listProblems([buildExampleFolder({ ideasEnglish })])).toEqual([
      'deck "albin-countergambit": ideas.en.md, "d4 d5": another path reaches the same position with a different text',
    ]);
  });

  it('refuses an idea whose path is illegal, ends on an opponent move or is in no line', () => {
    const extra =
      '\n## d4 d5 c4 e9\n\nIllegal.\n\n## d4 d5 c4\n\nOpponent move.\n\n## d4 d5 Nf3 Nf6\n\nNo line.\n';
    const ideasFrench = buildIdeasMarkdown('French', EXAMPLE_PATHS) + extra;
    expect(listProblems([buildExampleFolder({ ideasFrench })])).toEqual([
      'deck "albin-countergambit": ideas.fr.md, "d4 d5 c4 e9", ply 4: "e9" is not a legal move',
      'deck "albin-countergambit": ideas.fr.md, "d4 d5 c4": the path does not end on a reader move of a line of this deck',
      'deck "albin-countergambit": ideas.fr.md, "d4 d5 Nf3 Nf6": the path does not end on a reader move of a line of this deck',
    ]);
  });

  it('reports a file the grammar refuses, then every idea that file leaves missing', () => {
    const problems = listProblems([buildExampleFolder({ ideasEnglish: '# Title\n' })]);
    expect(problems[0]).toBe(
      'deck "albin-countergambit": ideas.en.md: "# Title" is a "# " heading, only "## " headings are read',
    );
    expect(problems).toHaveLength(7);
    expect(listProblems([buildExampleFolder({ ideasFrench: 'stray\n' })])[0]).toBe(
      'deck "albin-countergambit": ideas.fr.md: "stray" comes before the first "## " heading',
    );
  });

  it('does not read the ideas of a deck whose lines do not replay', () => {
    const lines = [{ name: 'Main line', movesSan: ['d4', 'd5', 'c4', 'e9'] }];
    expect(listProblems([withDeck({ lines, pliesPerLine: { minimum: 1, maximum: 20 } })])).toEqual([
      'deck "albin-countergambit": line "Main line", ply 4: "e9" is not a legal move',
    ]);
  });
});

describe('buildDecksDocument, name cards and trap cards', () => {
  const NAMES = ['Vienna Game', 'Italian Game', 'Ruy Lopez', 'Scotch Game', 'Sicilian Defense'];
  const CATALOGUE = { ...EXAMPLE_CATALOGUE, cards: { 'name-deck': 'Opening names' } };
  const TRAP = {
    puzzleId: 'FUczt',
    deckId: 'albin-countergambit',
    fen: EXAMPLE_TRAP_CARD.fen,
    movesUci: ['f3d4', 'e5d3', 'e2d3', 'g4d1'],
    rating: 1237,
  };

  function buildWith(change: Partial<DeckBuildInput>) {
    return buildDecksDocument({
      ...buildExampleInput([buildExampleFolder()]),
      catalogues: { en: CATALOGUE, fr: CATALOGUE },
      ...change,
    });
  }

  it('adds the name deck after every deck, and the site reads it back', () => {
    const nameCards = { nameList: { names: NAMES }, openings: NAME_CARD_OPENINGS };
    const build = buildWith({ nameCards });
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(build.document.decks.map((deck) => deck.id)).toEqual([
      'albin-countergambit',
      'opening-names',
    ]);
    expect(build.document.decks[1]).toEqual({
      id: 'opening-names',
      nameKey: 'cards.name-deck',
      side: 'white',
      lines: [],
      cards: buildNameCards(nameCards).cards,
      ideas: [],
    });
    expect(build.readerMoves).toHaveLength(9);
    expect(parseDecksDocument(JSON.parse(JSON.stringify(build.document)))).toEqual(build.document);
  });

  it('puts the trap cards of a deck after its move cards', () => {
    const build = buildWith({ traps: { traps: [TRAP] } });
    if (!build.ok) throw new Error(build.problems.join('\n'));
    expect(build.document.decks[0]?.cards.map((card) => card.kind)).toEqual([
      ...Array.from({ length: 6 }, () => 'move'),
      'trap',
    ]);
    expect(build.document.decks[0]?.cards.at(-1)).toEqual(EXAMPLE_TRAP_CARD);
  });

  it('refuses a name the openings do not carry, and a name deck key either catalogue lacks', () => {
    const nameCards = { nameList: { names: [...NAMES, 'Nowhere'] }, openings: NAME_CARD_OPENINGS };
    expect(buildWith({ nameCards, catalogues: { en: CATALOGUE, fr: EXAMPLE_CATALOGUE } })).toEqual({
      ok: false,
      problems: [
        'name-cards.json: "Nowhere" is the name of no line of openings.json',
        "the name deck's key cards.name-deck is missing from fr.json",
      ],
    });
    const neither = buildWith({
      nameCards: { nameList: { names: NAMES }, openings: NAME_CARD_OPENINGS },
      catalogues: { en: EXAMPLE_CATALOGUE, fr: EXAMPLE_CATALOGUE },
    });
    expect(neither.ok ? [] : neither.problems).toEqual([
      "the name deck's key cards.name-deck is missing from en.json",
      "the name deck's key cards.name-deck is missing from fr.json",
    ]);
  });

  it('refuses a traps file of another shape', () => {
    expect(buildWith({ traps: { traps: 'none' } })).toEqual({
      ok: false,
      problems: ['traps.json must hold { "traps": [...] }'],
    });
  });
});

describe('hasCatalogueKey', () => {
  it('finds a text at a dotted path and nothing else', () => {
    expect(hasCatalogueKey(EXAMPLE_CATALOGUE, 'decks.names.vienna-game')).toBe(true);
    expect(hasCatalogueKey(EXAMPLE_CATALOGUE, 'decks.names')).toBe(false);
    expect(hasCatalogueKey(EXAMPLE_CATALOGUE, 'decks.names.vienna-game.more')).toBe(false);
    expect(hasCatalogueKey(EXAMPLE_CATALOGUE, 'decks.titles.vienna-game')).toBe(false);
    expect(hasCatalogueKey([['x']], '0.0')).toBe(false);
  });
});
