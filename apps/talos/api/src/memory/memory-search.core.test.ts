import { describe, expect, it } from 'vitest';
import { rankSearchHits, type SearchCorpus } from './memory-search.core';

const EMPTY: SearchCorpus = {
  entities: [],
  aliases: [],
  facts: [],
  entityTitles: new Map(),
  commitments: [],
  sources: [],
  journalEntries: [],
  documents: [],
};

describe('rankSearchHits', () => {
  it('puts title and alias matches first, keeps one hit per slug and respects the limit', () => {
    const corpus: SearchCorpus = {
      ...EMPTY,
      entities: [
        { slug: 'second-brain/x/body', title: 'Corps', summary: null, body: 'parle de Acme' },
        { slug: 'second-brain/x/summary', title: 'Résumé', summary: 'Chez Acme', body: '' },
        { slug: 'second-brain/x/title', title: 'Acme', summary: null, body: 'Acme encore' },
        { slug: 'second-brain/x/none', title: 'Rien', summary: null, body: '' },
      ],
      aliases: [{ entitySlug: 'second-brain/x/alias', value: 'ACME SA' }],
      facts: [
        { entitySlug: 'second-brain/x/fact', value: 'Acme', raw: null },
        { entitySlug: 'second-brain/x/title', value: 'Acme', raw: 'client Acme' },
      ],
      entityTitles: new Map([['second-brain/x/alias', 'Alias']]),
      commitments: [{ slug: 'engagements/devis', action: 'Devis Acme', body: 'Envoyer à Acme' }],
      sources: [{ slug: 'sources/2026/10/04/appel', title: null, content: '# Appel Acme\nnotes' }],
      journalEntries: [{ slug: 'journal/2026-10-08', content: 'Acme a répondu' }],
      documents: [{ slug: 'etat/questions', content: '# Questions\nAcme ?' }],
    };
    const hits = rankSearchHits(corpus, 'acme', 50);
    expect(hits.map((hit) => [hit.slug, hit.matchedIn])).toEqual([
      ['second-brain/x/title', 'title'],
      ['second-brain/x/alias', 'alias'],
      ['second-brain/x/summary', 'summary'],
      ['second-brain/x/fact', 'fact'],
      ['second-brain/x/body', 'body'],
      ['engagements/devis', 'content'],
      ['sources/2026/10/04/appel', 'content'],
      ['journal/2026-10-08', 'content'],
      ['etat/questions', 'content'],
    ]);
    expect(hits.find((hit) => hit.slug === 'second-brain/x/fact')?.title).toBe('fact');
    expect(hits.find((hit) => hit.slug === 'sources/2026/10/04/appel')?.title).toBe('Appel Acme');
    expect(hits.find((hit) => hit.slug === 'engagements/devis')?.title).toBe('Devis Acme');
    expect(rankSearchHits(corpus, 'acme', 2)).toHaveLength(2);
  });
});
