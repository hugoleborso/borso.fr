import { describe, expect, it } from 'vitest';
import { projectPage } from './pages.core';

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
