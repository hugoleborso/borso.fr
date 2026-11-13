/**
 * @vitest-environment node
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DECK_CONTENT_ROOTS, readDeckBuildInput } from './deck-folders.adapter';

function writeDeckFolder(decksRoot: string, folderName: string): void {
  mkdirSync(path.join(decksRoot, folderName), { recursive: true });
  writeFileSync(path.join(decksRoot, folderName, 'deck.json'), `{"id":"${folderName}"}`);
  writeFileSync(path.join(decksRoot, folderName, 'ideas.en.md'), `English ${folderName}`);
  writeFileSync(path.join(decksRoot, folderName, 'ideas.fr.md'), `French ${folderName}`);
}

function writeContent(folderNames: readonly string[]): {
  decksRoot: string;
  catalogueRoot: string;
} {
  const root = mkdtempSync(path.join(tmpdir(), 'borsouvertures-deck-folders-'));
  const decksRoot = path.join(root, 'decks');
  const catalogueRoot = path.join(root, 'i18n');
  mkdirSync(decksRoot);
  mkdirSync(catalogueRoot);
  for (const folderName of folderNames) writeDeckFolder(decksRoot, folderName);
  writeFileSync(path.join(catalogueRoot, 'en.json'), '{"deck":"Deck"}');
  writeFileSync(path.join(catalogueRoot, 'fr.json'), '{"deck":"Paquet"}');
  return { decksRoot, catalogueRoot };
}

describe('readDeckBuildInput', () => {
  it('reads the three files of every deck folder, in the order of the folder names', () => {
    const roots = writeContent(['slav', 'albin']);

    expect(readDeckBuildInput(roots).folders).toEqual([
      {
        folderName: 'albin',
        deck: { id: 'albin' },
        ideasEnglish: 'English albin',
        ideasFrench: 'French albin',
      },
      {
        folderName: 'slav',
        deck: { id: 'slav' },
        ideasEnglish: 'English slav',
        ideasFrench: 'French slav',
      },
    ]);
  });

  it('sorts the folder names in English order, not in the byte order Node lists them in', () => {
    const roots = writeContent(['slav', 'écossaise', 'albin']);

    expect(readDeckBuildInput(roots).folders.map((folder) => folder.folderName)).toEqual([
      'albin',
      'écossaise',
      'slav',
    ]);
  });

  it('skips a file that sits beside the deck folders', () => {
    const roots = writeContent(['albin']);
    writeFileSync(path.join(roots.decksRoot, 'README.md'), 'not a deck');

    expect(readDeckBuildInput(roots).folders.map((folder) => folder.folderName)).toEqual(['albin']);
  });

  it('reads the two catalogues the deck names are checked against', () => {
    expect(readDeckBuildInput(writeContent([])).catalogues).toEqual({
      en: { deck: 'Deck' },
      fr: { deck: 'Paquet' },
    });
  });

  it('points at the content and the catalogues of this application', () => {
    expect(DECK_CONTENT_ROOTS).toEqual({
      decksRoot: path.resolve('content/decks'),
      catalogueRoot: path.resolve('site/src/i18n'),
    });
  });
});
