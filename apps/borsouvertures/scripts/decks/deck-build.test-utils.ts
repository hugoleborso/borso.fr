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

export { EXAMPLE_PATHS };
