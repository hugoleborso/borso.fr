import { describe, expect, it } from 'vitest';
import { composePageView, selectContentPage, selectRecord } from './memory-page.core';

const RECORD = { attributes: '{}', body: '' };

describe('selectRecord', () => {
  it('prefers a commitment, then a proposal, then a draft', () => {
    expect(selectRecord(RECORD, RECORD, RECORD)?.type).toBe('commitment');
    expect(selectRecord(null, RECORD, RECORD)?.type).toBe('proposal');
    expect(selectRecord(null, null, RECORD)?.type).toBe('draft');
    expect(selectRecord(null, null, null)).toBeNull();
  });
});

describe('selectContentPage', () => {
  it('prefers a source, then a journal entry, then a document', () => {
    const content = { content: 'x' };
    expect(selectContentPage(content, content, content)?.type).toBe('source');
    expect(selectContentPage(null, content, content)?.type).toBe('journal');
    expect(selectContentPage(null, null, content)).toEqual({
      type: 'document',
      markdown: 'x',
      targets: [],
    });
    expect(selectContentPage(null, null, null)).toBeNull();
  });
});

describe('composePageView', () => {
  it('lists outgoing links and relations, and incoming relations and links, without the page itself', () => {
    const slug = 'second-brain/personnes/alice-martin';
    expect(
      composePageView(
        slug,
        {
          type: 'entity',
          markdown:
            'Voir [[second-brain/organisations/acme]] et [[second-brain/personnes/alice-martin]]',
          targets: ['second-brain/personnes/bruno-petit'],
        },
        [
          { fromSlug: slug, toSlug: 'second-brain/personnes/bruno-petit' },
          { fromSlug: 'second-brain/organisations/acme', toSlug: slug },
        ],
        ['journal/2026-10-08', slug],
      ),
    ).toEqual({
      slug,
      type: 'entity',
      markdown:
        'Voir [[second-brain/organisations/acme]] et [[second-brain/personnes/alice-martin]]',
      outgoing: ['second-brain/organisations/acme', 'second-brain/personnes/bruno-petit'],
      incoming: ['journal/2026-10-08', 'second-brain/organisations/acme'],
    });
  });
});
