import { describe, expect, it } from 'vitest';
import {
  isCorpusFile,
  isReadablePagePath,
  isSkippedLocalDirectory,
  selectDirectoryFiles,
} from './content.core';

describe('isCorpusFile', () => {
  it.each([
    ['second-brain/personnes/nina.md', true],
    ['engagements/2026-10-05-x.md', true],
    ['objectifs/2026-T4.md', true],
    ['index.md', true],
    ['second-brain/personnes/photo.png', false],
    ['journal/2026-10-05.md', false],
    ['etat/securite.md', false],
    ['boite/prive/note.md', false],
    ['sub/index.md', false],
  ])('classifies %s as corpus: %s', (path, isCorpus) => {
    expect(isCorpusFile(path)).toBe(isCorpus);
  });
});

describe('isReadablePagePath', () => {
  it.each([
    ['second-brain/moi', true],
    ['index', true],
    ['journal/2026-10-05', true],
    ['etat/securite', false],
    ['second-brain/../etat/securite', false],
    ['second-brain/..', false],
    ['/second-brain/moi', false],
    ['second-brain//moi', false],
    ['second-brain/moi%2F', false],
  ])('lets the page route read %s: %s', (path, isReadable) => {
    expect(isReadablePagePath(path)).toBe(isReadable);
  });
});

describe('selectDirectoryFiles', () => {
  it('keeps only the files directly inside the directory', () => {
    expect(
      selectDirectoryFiles(
        [
          'etat/propositions/a.md',
          'etat/propositions/archives/b.md',
          'etat/propositions-old/c.md',
          'etat/graphe.jsonl',
        ],
        'etat/propositions',
      ),
    ).toEqual(['etat/propositions/a.md']);
  });
});

describe('isSkippedLocalDirectory', () => {
  it('skips dependencies, code and private folders, and keeps the second brain', () => {
    expect(isSkippedLocalDirectory('node_modules')).toBe(true);
    expect(isSkippedLocalDirectory('prive')).toBe(true);
    expect(isSkippedLocalDirectory('second-brain')).toBe(false);
  });
});
