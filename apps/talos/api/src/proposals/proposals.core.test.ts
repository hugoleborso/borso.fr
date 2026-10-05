import { describe, expect, it } from 'vitest';
import {
  buildProposalPath,
  decideProposalFile,
  isProposalFile,
  readProposalSlug,
  selectProposals,
} from './proposals.core';

function proposalFile(status: string, createdOn: string): string {
  return `---\ntype: proposition\nstatut: ${status}\ntitre: T\ncree: ${createdOn}\n---\n## Pourquoi\nx\n\n## Décision\n`;
}

const RECORD = { decision: 'acceptee', comment: 'ok', decidedAt: '2026-10-05 10:12' } as const;

describe('proposal paths', () => {
  it('maps a slug to its file and back', () => {
    expect(buildProposalPath('2026-10-04-cv')).toBe('etat/propositions/2026-10-04-cv.md');
    expect(readProposalSlug('etat/propositions/2026-10-04-cv.md')).toBe('2026-10-04-cv');
  });

  it('recognises a markdown file', () => {
    expect(isProposalFile('etat/propositions/a.md')).toBe(true);
    expect(isProposalFile('etat/propositions/.gitkeep')).toBe(false);
  });
});

describe('selectProposals', () => {
  const files = new Map([
    ['etat/propositions/2026-10-03-a.md', proposalFile('acceptee', '2026-10-03')],
    ['etat/propositions/2026-10-04-b.md', proposalFile('proposee', '2026-10-04')],
    ['etat/propositions/2026-10-05.md', '---\ntype: journal\n---\n'],
  ]);

  it('lists every proposal newest first, without the files that are not proposals', () => {
    expect(selectProposals(files, undefined).map((proposal) => proposal.slug)).toEqual([
      '2026-10-04-b',
      '2026-10-03-a',
    ]);
  });

  it('keeps only the asked status', () => {
    expect(selectProposals(files, 'proposee').map((proposal) => proposal.slug)).toEqual([
      '2026-10-04-b',
    ]);
  });
});

describe('decideProposalFile', () => {
  it('writes the decision and answers the decided proposal', () => {
    const edit = decideProposalFile('2026-10-04-b', proposalFile('proposee', '2026-10-04'), RECORD);
    expect(edit).toMatchObject({
      commitMessage: 'pwa : proposition acceptée 2026-10-04-b',
      outcome: {
        kind: 'decided',
        proposal: {
          slug: '2026-10-04-b',
          status: 'acceptee',
          decisions: ['2026-10-05 10:12 : acceptée — ok'],
        },
      },
    });
    expect(edit.content).toContain('statut: acceptee');
  });

  it('names a refusal in the commit', () => {
    const edit = decideProposalFile('p', proposalFile('proposee', '2026-10-04'), {
      ...RECORD,
      decision: 'refusee',
    });
    expect(edit).toMatchObject({ commitMessage: 'pwa : proposition refusée p' });
  });

  it('answers not-found for a missing file or a file that is not a proposal', () => {
    expect(decideProposalFile('p', null, RECORD)).toEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
    expect(decideProposalFile('p', '# Notes', RECORD)).toEqual({
      content: null,
      outcome: { kind: 'not-found' },
    });
  });

  it('refuses to decide twice', () => {
    expect(decideProposalFile('p', proposalFile('refusee', '2026-10-04'), RECORD)).toEqual({
      content: null,
      outcome: { kind: 'already-decided' },
    });
  });
});
