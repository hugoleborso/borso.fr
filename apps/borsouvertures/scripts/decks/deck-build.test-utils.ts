import type { DeckBuildInput, DeckFolder } from './deck-build.core';

export const EXAMPLE_DECK = {
  id: 'albin-countergambit',
  order: 1,
  nameKey: 'decks.names.albin-countergambit',
  side: 'black',
  pliesPerLine: { minimum: 8, maximum: 20 },
  lines: [
    { name: 'Main line', movesSan: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6'] },
    {
      name: 'Lasker Trap',
      movesSan: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'e3', 'Bb4+', 'Bd2', 'dxe3'],
    },
  ],
};

const EXAMPLE_PATHS = [
  '1. d4 d5',
  '1. d4 d5 2. c4 e5',
  '1. d4 d5 2. c4 e5 3. dxe5 d4',
  '1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6',
  '1. d4 d5 2. c4 e5 3. dxe5 d4 4. e3 Bb4+',
  '1. d4 d5 2. c4 e5 3. dxe5 d4 4. e3 Bb4+ 5. Bd2 dxe3',
];

export function buildIdeasMarkdown(language: string, paths: readonly string[]): string {
  return paths.map((path, index) => `## ${path}\n\n${language} idea ${index + 1}.\n`).join('\n');
}

export const EXAMPLE_CATALOGUE = {
  decks: { names: { 'albin-countergambit': 'Albin Countergambit', 'vienna-game': 'Vienna Game' } },
};

export function buildExampleFolder(overrides: Partial<DeckFolder> = {}): DeckFolder {
  return {
    folderName: 'albin-countergambit',
    deck: EXAMPLE_DECK,
    ideasEnglish: buildIdeasMarkdown('English', EXAMPLE_PATHS),
    ideasFrench: buildIdeasMarkdown('French', EXAMPLE_PATHS),
    ...overrides,
  };
}

export function buildExampleInput(folders: readonly DeckFolder[]): DeckBuildInput {
  return { folders, catalogues: { en: EXAMPLE_CATALOGUE, fr: EXAMPLE_CATALOGUE } };
}

interface LineEntry {
  name: string;
  movesSan: string[];
  movesUci: string[];
}

const LINES: LineEntry[] = [
  {
    name: 'Vienna Game',
    movesSan: ['e4', 'e5', 'Nc3', 'Nf6'],
    movesUci: ['e2e4', 'e7e5', 'b1c3', 'g8f6'],
  },
  { name: 'Vienna Game', movesSan: ['e4', 'e5', 'Nc3'], movesUci: ['e2e4', 'e7e5', 'b1c3'] },
  {
    name: 'Scotch Game',
    movesSan: ['Nf3', 'Nc6', 'e4', 'e5', 'd4'],
    movesUci: ['g1f3', 'b8c6', 'e2e4', 'e7e5', 'd2d4'],
  },
  {
    name: 'Scotch Game',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4'],
  },
  {
    name: 'Italian Game',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
  },
  {
    name: 'Ruy Lopez',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
  },
  { name: 'Sicilian Defense', movesSan: ['e4', 'c5'], movesUci: ['e2e4', 'c7c5'] },
  { name: 'Sicilian Twin', movesSan: ['e4', 'c5'], movesUci: ['e2e4', 'c7c5'] },
];

export const NAME_CARD_OPENINGS = [
  {
    id: 'open-games',
    name: 'Open Games',
    ecoCodes: ['C00'],
    variations: [
      {
        id: 'main-line',
        name: 'Main Line',
        lines: LINES.map((line, index) => ({ id: `line-${index}`, eco: 'C00', ...line })),
      },
    ],
  },
];

export { EXAMPLE_PATHS };
