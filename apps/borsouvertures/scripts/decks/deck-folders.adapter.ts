import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DeckBuildInput, DeckFolder } from './deck-build.core';

export interface DeckContentRoots {
  decksRoot: string;
  catalogueRoot: string;
}

export const DECK_CONTENT_ROOTS: DeckContentRoots = {
  decksRoot: path.resolve('content/decks'),
  catalogueRoot: path.resolve('site/src/i18n'),
};

function readText(...segments: string[]): string {
  return readFileSync(path.join(...segments), 'utf8');
}

function readJson(...segments: string[]): unknown {
  return JSON.parse(readText(...segments));
}

function readDeckFolder(decksRoot: string, folderName: string): DeckFolder {
  return {
    folderName,
    deck: readJson(decksRoot, folderName, 'deck.json'),
    ideasEnglish: readText(decksRoot, folderName, 'ideas.en.md'),
    ideasFrench: readText(decksRoot, folderName, 'ideas.fr.md'),
  };
}

export function readDeckBuildInput(roots: DeckContentRoots): DeckBuildInput {
  const folderNames = readdirSync(roots.decksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted((left, right) => left.localeCompare(right, 'en'));
  return {
    folders: folderNames.map((folderName) => readDeckFolder(roots.decksRoot, folderName)),
    catalogues: {
      en: readJson(roots.catalogueRoot, 'en.json'),
      fr: readJson(roots.catalogueRoot, 'fr.json'),
    },
  };
}
