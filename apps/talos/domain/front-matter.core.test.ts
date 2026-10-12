import { describe, expect, it } from 'vitest';
import { setFrontMatterValue, splitFrontMatter } from './front-matter.core';

const PROPOSAL = [
  '---',
  'type: proposition',
  'categorie: action        # action | initiative',
  'titre: "Déplacer le bloc # Umbrella"',
  "qui: 'Alex'",
  'sujet:                    # vide hors gmail',
  'projet:',
  '  - liste ignorée',
  '1nombre: ignoré',
  "jusqu'à: 2026-12",
  'échéance :  2026-10-05  ',
  '---',
  '## Pourquoi',
  'note: dans le corps',
].join('\n');

describe('splitFrontMatter', () => {
  it('reads every simple key and keeps the body after the closing fence', () => {
    expect(splitFrontMatter(PROPOSAL)).toEqual({
      frontMatter: Object.fromEntries([
        ['type', 'proposition'],
        ['categorie', 'action'],
        ['titre', 'Déplacer le bloc # Umbrella'],
        ['qui', 'Alex'],
        ['sujet', ''],
        ['projet', ''],
        ["jusqu'à", '2026-12'],
        ['échéance', '2026-10-05'],
      ]),
      body: '## Pourquoi\nnote: dans le corps',
    });
  });

  it('answers an empty header and the whole text when the file has no front matter', () => {
    expect(splitFrontMatter('# Titre\r\ntexte')).toEqual({
      frontMatter: {},
      body: '# Titre\ntexte',
    });
  });

  it('ignores a rule further down when the file does not open with one', () => {
    expect(splitFrontMatter('texte\n---\nclé: valeur\n---\nsuite')).toEqual({
      frontMatter: {},
      body: 'texte\n---\nclé: valeur\n---\nsuite',
    });
  });

  it('treats an unclosed fence as body text', () => {
    expect(splitFrontMatter('---\ntype: page\n# Titre')).toEqual({
      frontMatter: {},
      body: '---\ntype: page\n# Titre',
    });
  });

  it('accepts fences followed by spaces and windows line breaks', () => {
    expect(splitFrontMatter('---  \r\nmaj: 2026-10-04\r\n---  \r\n# Focus')).toEqual({
      frontMatter: { maj: '2026-10-04' },
      body: '# Focus',
    });
  });

  it('does not take the opening fence for the closing one', () => {
    expect(splitFrontMatter('---\nmaj: 2026-10-04\n---\nsuite')).toEqual({
      frontMatter: { maj: '2026-10-04' },
      body: 'suite',
    });
  });

  it('keeps a hash inside an unquoted value when no space precedes it', () => {
    expect(splitFrontMatter('---\nsrc: page#ancre\n---\n').frontMatter).toEqual({
      src: 'page#ancre',
    });
  });

  it('ignores a line that only looks like text before the first key', () => {
    expect(splitFrontMatter('---\n texte: indenté\n---\n').frontMatter).toEqual({});
  });
});

describe('setFrontMatterValue', () => {
  it('replaces the line of an existing key and leaves the others alone', () => {
    const updated = setFrontMatterValue(PROPOSAL, 'categorie', 'idee');
    expect(updated.split('\n')[2]).toBe('categorie: idee');
    expect(updated.split('\n').slice(3)).toEqual(PROPOSAL.split('\n').slice(3));
  });

  it('steps over header lines that are not keys', () => {
    expect(setFrontMatterValue('---\nsources:\n  - a\nstatut: x\n---\n', 'statut', 'y')).toBe(
      '---\nsources:\n  - a\nstatut: y\n---\n',
    );
  });

  it('does not mistake a longer key for the one being written', () => {
    const updated = setFrontMatterValue('---\nstatut_ancien: x\n---\nbody', 'statut', 'acceptee');
    expect(updated).toBe('---\nstatut_ancien: x\nstatut: acceptee\n---\nbody');
  });

  it('empties a key without leaving a trailing space', () => {
    expect(setFrontMatterValue('---\nenvoye: 2026-10-08\n---\n', 'envoye', '')).toBe(
      '---\nenvoye:\n---\n',
    );
  });

  it('appends the key at the end of the header when it is missing', () => {
    expect(setFrontMatterValue('---\ntype: page\n---\n# Titre', 'maj', '2026-10-05')).toBe(
      '---\ntype: page\nmaj: 2026-10-05\n---\n# Titre',
    );
  });

  it('writes a front matter when the file has none', () => {
    expect(setFrontMatterValue('# Titre', 'maj', '2026-10-05')).toBe(
      '---\nmaj: 2026-10-05\n---\n# Titre',
    );
  });
});
