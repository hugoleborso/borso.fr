import { describe, expect, it } from 'vitest';
import {
  listWikilinkTargets,
  readPageTitle,
  readSection,
  stripMarkdownExtension,
  summarizePage,
} from './markdown-page.core';

describe('readPageTitle', () => {
  it('reads the first level one heading', () => {
    expect(readPageTitle('intro\n## Sous-titre\n#  Marc Lefort \n# Autre', 'x')).toBe(
      'Marc Lefort',
    );
  });

  it('falls back when the page has no level one heading', () => {
    expect(readPageTitle('## Sous-titre\ntexte', 'marc-lefort')).toBe('marc-lefort');
  });

  it('falls back when the heading is empty', () => {
    expect(readPageTitle('#  \ntexte', 'marc-lefort')).toBe('marc-lefort');
  });
});

describe('stripMarkdownExtension', () => {
  it('removes a trailing .md', () => {
    expect(stripMarkdownExtension('second-brain/moi.md')).toBe('second-brain/moi');
  });

  it('leaves a path without extension untouched', () => {
    expect(stripMarkdownExtension('second-brain/moi')).toBe('second-brain/moi');
  });
});

describe('listWikilinkTargets', () => {
  it('reads each target once, without alias, anchor or extension, in order of appearance', () => {
    const markdown = [
      'Voir [[second-brain/personnes/marc-lefort|Marc]] et',
      '[[ second-brain/projets/refonte-du-site-globex#Faits ]], puis [[engagements/x.md]]',
      'et encore [[second-brain/personnes/marc-lefort]].',
    ].join('\n');
    expect(listWikilinkTargets(markdown)).toEqual([
      'second-brain/personnes/marc-lefort',
      'second-brain/projets/refonte-du-site-globex',
      'engagements/x',
    ]);
  });

  it('answers an empty list for a page without links', () => {
    expect(listWikilinkTargets('[pas un lien](x) [[]]')).toEqual([]);
  });
});

describe('readSection', () => {
  const body = [
    '# Proposition',
    '## Pourquoi  ',
    '',
    'Parce que.',
    '### Détail',
    'gardé',
    '## Ce que Talos propose',
    'Un brouillon.',
    '# Annexe',
    'hors section',
  ].join('\n');

  it('reads the lines under a heading up to the next heading of the same level', () => {
    expect(readSection(body, 'Pourquoi')).toBe('Parce que.\n### Détail\ngardé');
  });

  it('stops at a level one heading', () => {
    expect(readSection(body, 'Ce que Talos propose')).toBe('Un brouillon.');
  });

  it('reads to the end of the file for the last section', () => {
    expect(readSection('## Décision\n- une\n- deux', 'Décision')).toBe('- une\n- deux');
  });

  it('answers null when the heading is absent', () => {
    expect(readSection(body, 'Décision')).toBeNull();
  });
});

describe('summarizePage', () => {
  it('reads the title, the type and the header of a page', () => {
    expect(
      summarizePage('second-brain/moi', '---\ntype: moi\n---\n# Alex Durand\ntexte'),
    ).toStrictEqual({
      path: 'second-brain/moi',
      title: 'Alex Durand',
      type: 'moi',
      frontMatter: { type: 'moi' },
      body: '# Alex Durand\ntexte',
    });
  });

  it('falls back to the last path segment and a generic type', () => {
    expect(summarizePage('second-brain/personnes/nina', 'texte')).toMatchObject({
      title: 'nina',
      type: 'page',
    });
  });
});
