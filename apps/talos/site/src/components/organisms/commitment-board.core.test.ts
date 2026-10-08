import { describe, expect, it } from 'vitest';
import {
  readCommitmentFilter,
  selectCommitmentFilterLabelKey,
  selectCommitmentHeadline,
  selectVisibleCommitments,
} from './commitment-board.core';

const COMMITMENTS = [
  { path: 'a', direction: 'owed' as const },
  { path: 'b', direction: 'awaited' as const },
  { path: 'c', direction: null },
];

describe('readCommitmentFilter', () => {
  it('reads a known filter from the address and falls back on all', () => {
    expect(readCommitmentFilter('owed')).toBe('owed');
    expect(readCommitmentFilter('awaited')).toBe('awaited');
    expect(readCommitmentFilter('autre')).toBe('all');
    expect(readCommitmentFilter(null)).toBe('all');
  });
});

describe('selectVisibleCommitments', () => {
  it('keeps one direction, or every commitment', () => {
    expect(selectVisibleCommitments(COMMITMENTS, 'owed').map((entry) => entry.path)).toEqual(['a']);
    expect(selectVisibleCommitments(COMMITMENTS, 'awaited').map((entry) => entry.path)).toEqual([
      'b',
    ]);
    expect(selectVisibleCommitments(COMMITMENTS, 'all')).toHaveLength(3);
  });
});

describe('selectCommitmentFilterLabelKey', () => {
  it('labels each filter', () => {
    expect(selectCommitmentFilterLabelKey('owed')).toBe('commitments.filter.owed');
    expect(selectCommitmentFilterLabelKey('awaited')).toBe('commitments.filter.awaited');
    expect(selectCommitmentFilterLabelKey('all')).toBe('commitments.filter.all');
  });
});

function nameOfPage(pagePath: string): string {
  return `Nom de ${pagePath}`;
}

describe('selectCommitmentHeadline', () => {
  it('shows a commitment the owner owes, or of unknown direction, as a task', () => {
    expect(
      selectCommitmentHeadline(
        { direction: 'owed', title: 'Envoyer le devis', action: 'Devis', counterpart: 'p' },
        nameOfPage,
      ),
    ).toEqual({ variant: 'task', lead: null, text: 'Envoyer le devis' });
    expect(selectCommitmentHeadline({ direction: null, title: 'Rendre' }, nameOfPage)).toEqual({
      variant: 'task',
      lead: null,
      text: 'Rendre',
    });
  });

  it('leads an awaited commitment with the first name of the person who owes it', () => {
    expect(
      selectCommitmentHeadline(
        { direction: 'awaited', title: 'Titre', action: 'Plan IA', counterpart: 'marine' },
        nameOfPage,
      ),
    ).toEqual({ variant: 'awaited', lead: 'Nom', text: 'Plan IA' });
    expect(
      selectCommitmentHeadline(
        { direction: 'awaited', title: 'Contrat', counterpartName: '  Bruno Martin (Acme)' },
        nameOfPage,
      ),
    ).toEqual({ variant: 'awaited', lead: 'Bruno', text: 'Contrat' });
  });

  it('leaves out the lead when nobody is named', () => {
    expect(
      selectCommitmentHeadline({ direction: 'awaited', title: 'Contrat' }, nameOfPage),
    ).toEqual({ variant: 'awaited', lead: null, text: 'Contrat' });
    expect(
      selectCommitmentHeadline(
        { direction: 'awaited', title: 'Contrat', counterpartName: ' ' },
        nameOfPage,
      ),
    ).toEqual({ variant: 'awaited', lead: null, text: 'Contrat' });
  });
});
