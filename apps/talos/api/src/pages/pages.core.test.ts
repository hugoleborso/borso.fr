import { describe, expect, it } from 'vitest';
import { hideHandWrittenCopy, projectStoredPage } from './pages.core';

const GARDEN = [
  '# Jardin',
  '',
  '## Projets liés  ',
  '',
  '- [[second-brain/projets/potager]] : actif',
  '',
  '## Chronologie',
  '',
  '- 2026-10-20 : résumé réécrit.',
];

describe('projectStoredPage', () => {
  it('reads a rendered memory page with the links the memory computed and the day of its summary', () => {
    expect(
      projectStoredPage({
        slug: 'second-brain/personnes/alice-martin',
        markdown:
          '---\ntype: personne\nproximite: 3\n---\n# Alice Martin\n\nCheffe de projet chez Acme.\n',
        outgoing: ['second-brain/organisations/acme'],
        incoming: ['second-brain/hugo'],
        summarizedOn: '2026-10-20',
      }),
    ).toEqual({
      path: 'second-brain/personnes/alice-martin',
      title: 'Alice Martin',
      type: 'personne',
      frontMatter: { type: 'personne', proximite: '3' },
      markdown: '# Alice Martin\n\nCheffe de projet chez Acme.\n',
      outgoingLinks: ['second-brain/organisations/acme'],
      incomingLinks: ['second-brain/hugo'],
      summarizedOn: '2026-10-20',
    });
  });

  it('hides the hand-written copy of a page that computes what it contains', () => {
    const page = projectStoredPage({
      slug: 'second-brain/domaines/jardin',
      markdown: `---\ntype: domaine\n---\n${[...GARDEN, '', '## Comprend', '', '- [[second-brain/projets/potager]]', ''].join('\n')}`,
      outgoing: [],
      incoming: [],
      summarizedOn: null,
    });
    expect(page.markdown).not.toContain('Projets liés');
    expect(page.markdown).toContain('## Comprend\n\n- [[second-brain/projets/potager]]');
    expect(page.summarizedOn).toBeNull();
  });
});

describe('hideHandWrittenCopy', () => {
  it('removes « Projets liés » up to the next heading when « Comprend » has lines', () => {
    const body = [...GARDEN, '', '## Comprend', '', '- [[second-brain/projets/potager]]', ''];
    expect(hideHandWrittenCopy(body.join('\n'))).toBe(
      [...GARDEN.slice(0, 2), ...GARDEN.slice(6), ...body.slice(GARDEN.length)].join('\n'),
    );
  });

  it('removes it to the end of the body when it is the last section, and stops at a first-level heading', () => {
    const computed = ['## Comprend', '- [[second-brain/projets/potager]]'];
    expect(hideHandWrittenCopy([...computed, '## Projets liés', '- potager'].join('\n'))).toBe(
      computed.join('\n'),
    );
    expect(
      hideHandWrittenCopy([...computed, '## Projets liés', '- potager', '# Annexe'].join('\n')),
    ).toBe([...computed, '# Annexe'].join('\n'));
  });

  it('keeps the body as written when nothing is computed or nothing is copied', () => {
    const withoutComputed = GARDEN.join('\n');
    const withEmptyHeading = [...GARDEN, '## Comprend', ''].join('\n');
    const withoutCopy = '# Jardin\n\n## Comprend\n\n- [[second-brain/projets/potager]]\n';
    expect(hideHandWrittenCopy(withoutComputed)).toBe(withoutComputed);
    expect(hideHandWrittenCopy(withEmptyHeading)).toBe(withEmptyHeading);
    expect(hideHandWrittenCopy(withoutCopy)).toBe(withoutCopy);
  });
});
