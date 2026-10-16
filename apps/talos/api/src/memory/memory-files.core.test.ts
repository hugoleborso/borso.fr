import { describe, expect, it } from 'vitest';
import {
  listDirectoryFiles,
  locateMemoryFile,
  renderStateFile,
  selectDirectoryKind,
} from './memory-files.core';

describe('locateMemoryFile', () => {
  it.each([
    ['etat/propositions/2026-10-04-atelier.md', 'proposal', 'etat/propositions/2026-10-04-atelier'],
    ['etat/brouillons/2026-10-08-cafe.md', 'draft', 'etat/brouillons/2026-10-08-cafe'],
    ['engagements/2026-10-05-devis-acme.md', 'commitment', 'engagements/2026-10-05-devis-acme'],
    ['journal/2026-10-08.md', 'journal', 'journal/2026-10-08'],
    ['second-brain/personnes/alice-martin.md', 'page', 'second-brain/personnes/alice-martin'],
    ['journal/archives/2025-01-01.md', 'page', 'journal/archives/2025-01-01'],
  ])('reads %s as a %s', (path, kind, key) => {
    expect(locateMemoryFile(path)).toEqual({ kind, key });
  });

  it('reads the two state files from their state keys', () => {
    expect(locateMemoryFile('etat/relations.json')).toEqual({ kind: 'state', key: 'relations' });
    expect(locateMemoryFile('etat/dernier-scan.json')).toEqual({
      kind: 'state',
      key: 'last_scan',
    });
  });

  it('knows no other file than markdown and the two state files', () => {
    expect(locateMemoryFile('etat/graphe.jsonl')).toBeNull();
  });
});

describe('selectDirectoryKind', () => {
  it('names the table of a listed directory', () => {
    expect(selectDirectoryKind('etat/propositions')).toBe('proposal');
    expect(selectDirectoryKind('journal')).toBe('journal');
  });

  it('lists nothing for a directory no table holds', () => {
    expect(selectDirectoryKind('second-brain')).toBeNull();
  });
});

describe('listDirectoryFiles', () => {
  it('keeps the direct children of the directory as markdown files', () => {
    expect(
      listDirectoryFiles('journal', [
        'journal/2026-10-08',
        'journal/archives/2025-01-01',
        'journalisme/x',
      ]),
    ).toEqual(['journal/2026-10-08.md']);
  });
});

describe('renderStateFile', () => {
  it('writes the stored value as indented JSON', () => {
    expect(renderStateFile({ genere: '2026-10-08' })).toBe('{\n  "genere": "2026-10-08"\n}');
  });
});
