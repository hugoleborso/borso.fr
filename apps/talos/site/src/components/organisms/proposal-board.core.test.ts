import { describe, expect, it } from 'vitest';
import {
  buildDecisionPayload,
  partitionProposals,
  selectCategoryLabelKey,
  selectPriorityLabelKey,
  selectPriorityTone,
  selectStatusLabelKey,
  selectStatusTone,
  type ProposalShape,
  PROPOSAL_SHEET_ACTION,
} from './proposal-board.core';

function proposal(
  slug: string,
  status: string,
  priority: string,
  createdOn: string,
): ProposalShape {
  return { slug, status, priority, category: 'action', createdOn };
}

function expiring(slug: string, status: string, expiresOn: string): ProposalShape {
  return { ...proposal(slug, status, 'normale', '2026-10-01'), expiresOn };
}

const TODAY = '2026-10-05';

describe('partitionProposals', () => {
  const proposals = [
    proposal('low', 'proposee', 'basse', '2026-10-05'),
    proposal('done', 'faite', 'haute', '2026-10-01'),
    proposal('high-old', 'proposee', 'haute', '2026-10-01'),
    proposal('refused', 'refusee', 'basse', '2026-10-03'),
    proposal('high-new', 'proposee', 'haute', '2026-10-04'),
    proposal('odd', 'proposee', 'urgente', '2026-10-02'),
    proposal('normal', 'proposee', 'normale', '2026-10-03'),
  ];

  it('orders the pending proposals by priority, then newest first', () => {
    expect(partitionProposals(proposals, TODAY).pending.map((item) => item.slug)).toEqual([
      'high-new',
      'high-old',
      'normal',
      'odd',
      'low',
    ]);
  });

  it('puts every decided proposal in the history, newest first', () => {
    expect(partitionProposals(proposals, TODAY).decided.map((item) => item.slug)).toEqual([
      'refused',
      'done',
    ]);
  });
});

function partitionExpiring() {
  return partitionProposals(
    [
      expiring('last-day', 'proposee', TODAY),
      { ...expiring('gone-old', 'proposee', '2026-10-02'), createdOn: '2026-09-20' },
      expiring('gone', 'proposee', '2026-10-04'),
      expiring('decided-late', 'acceptee', '2026-10-01'),
    ],
    TODAY,
  );
}

describe('partitionProposals with expiry dates', () => {
  it('keeps a proposal open on its last day, by the same rule as the counter', () => {
    expect(partitionExpiring().pending.map((item) => item.slug)).toEqual(['last-day']);
  });

  it('folds the undecided proposals past their date apart, newest first', () => {
    expect(partitionExpiring().expired.map((item) => item.slug)).toEqual(['gone', 'gone-old']);
  });

  it('leaves a decided proposal in the history even past its date', () => {
    expect(partitionExpiring().decided.map((item) => item.slug)).toEqual(['decided-late']);
  });
});

describe('the proposal labels', () => {
  it('paints the priorities', () => {
    expect(selectPriorityTone('haute')).toBe('bronze');
    expect(selectPriorityTone('normale')).toBe('neutral');
    expect(selectPriorityTone('basse')).toBe('outline');
    expect(selectPriorityTone('inconnue')).toBe('neutral');
  });

  it('names the priorities, falling back to normal', () => {
    expect(selectPriorityLabelKey('haute')).toBe('proposals.priority.high');
    expect(selectPriorityLabelKey('normale')).toBe('proposals.priority.normal');
    expect(selectPriorityLabelKey('basse')).toBe('proposals.priority.low');
    expect(selectPriorityLabelKey('inconnue')).toBe('proposals.priority.normal');
  });

  it('names the categories, falling back to other', () => {
    expect(selectCategoryLabelKey('action')).toBe('proposals.category.action');
    expect(selectCategoryLabelKey('initiative')).toBe('proposals.category.initiative');
    expect(selectCategoryLabelKey('idee')).toBe('proposals.category.idea');
    expect(selectCategoryLabelKey('logistique')).toBe('proposals.category.logistics');
    expect(selectCategoryLabelKey('construction')).toBe('proposals.category.build');
    expect(selectCategoryLabelKey('autre')).toBe('proposals.category.other');
  });

  it('names and paints the statuses', () => {
    expect(selectStatusLabelKey('proposee')).toBe('proposals.status.pending');
    expect(selectStatusLabelKey('acceptee')).toBe('proposals.status.accepted');
    expect(selectStatusLabelKey('refusee')).toBe('proposals.status.refused');
    expect(selectStatusLabelKey('faite')).toBe('proposals.status.completed');
    expect(selectStatusLabelKey('expiree')).toBe('proposals.status.expired');
    expect(selectStatusLabelKey('bizarre')).toBe('proposals.status.pending');
    expect(selectStatusTone('acceptee')).toBe('success');
    expect(selectStatusTone('faite')).toBe('success');
    expect(selectStatusTone('refusee')).toBe('neutral');
    expect(selectStatusTone('expiree')).toBe('outline');
    expect(selectStatusTone('proposee')).toBe('bronze');
  });
});

describe('buildDecisionPayload', () => {
  it('sends a trimmed comment', () => {
    expect(buildDecisionPayload('acceptee', '  vas-y ')).toEqual({
      decision: 'acceptee',
      comment: 'vas-y',
    });
  });

  it('omits a blank comment', () => {
    expect(buildDecisionPayload('refusee', '   ')).toEqual({ decision: 'refusee' });
  });
});

describe('PROPOSAL_SHEET_ACTION', () => {
  it('offers to accept or refuse from the long-press sheet', () => {
    expect(PROPOSAL_SHEET_ACTION.acceptee.labelKey).toBe('proposals.accept');
    expect(PROPOSAL_SHEET_ACTION.refusee.labelKey).toBe('proposals.refuse');
  });
});
