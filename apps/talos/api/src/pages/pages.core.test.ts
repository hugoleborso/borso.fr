import { describe, expect, it } from 'vitest';
import { projectStoredPage } from './pages.core';

describe('projectStoredPage', () => {
  it('reads a rendered memory page with the links the memory computed', () => {
    expect(
      projectStoredPage({
        slug: 'second-brain/personnes/alice-martin',
        markdown:
          '---\ntype: personne\nproximite: 3\n---\n# Alice Martin\n\nCheffe de projet chez Acme.\n',
        outgoing: ['second-brain/organisations/acme'],
        incoming: ['second-brain/hugo'],
      }),
    ).toEqual({
      path: 'second-brain/personnes/alice-martin',
      title: 'Alice Martin',
      type: 'personne',
      frontMatter: { type: 'personne', proximite: '3' },
      markdown: '# Alice Martin\n\nCheffe de projet chez Acme.\n',
      outgoingLinks: ['second-brain/organisations/acme'],
      incomingLinks: ['second-brain/hugo'],
    });
  });
});
