import { describe, expect, it } from 'vitest';
import { projectPage, projectStoredPage } from './pages.core';

const OWNER = {
  path: 'second-brain/moi',
  markdown: '---\ntype: moi\n---\n# Alex\nVoir [[second-brain/personnes/nina|Nina]].',
};
const NINA = {
  path: 'second-brain/personnes/nina',
  markdown: '# Nina\nSœur de [[second-brain/moi]].',
};
const UNRELATED = { path: 'second-brain/domaines/sport', markdown: '# Sport' };
const INDEX = {
  path: 'index',
  markdown: '- [[second-brain/moi]]\n- [[second-brain/personnes/nina]]',
};

describe('projectPage', () => {
  it('gives the page its header, body, outgoing links and the pages linking to it', () => {
    expect(projectPage(OWNER, [OWNER, NINA, UNRELATED, INDEX])).toStrictEqual({
      path: 'second-brain/moi',
      title: 'Alex',
      type: 'moi',
      frontMatter: { type: 'moi' },
      markdown: '# Alex\nVoir [[second-brain/personnes/nina|Nina]].',
      outgoingLinks: ['second-brain/personnes/nina'],
      incomingLinks: ['second-brain/personnes/nina', 'index'],
    });
  });

  it('does not count a page linking to itself as incoming', () => {
    const selfLinked = { path: 'second-brain/x', markdown: '[[second-brain/x]]' };
    expect(projectPage(selfLinked, [selfLinked]).incomingLinks).toEqual([]);
  });
});

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
