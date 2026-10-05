import { describe, expect, it } from 'vitest';
import {
  buildDecisionPayload,
  isAcceptedOutcome,
  countAwaitingDecision,
  hasPendingProposals,
  isAwaitingDecision,
  partitionProposals,
  selectOutcomeKey,
  selectCategoryLabelKey,
  selectPriorityLabelKey,
  selectPriorityTone,
  selectStatusLabelKey,
  selectStatusTone,
  type ProposalShape,
} from './proposal-board.core';

function proposal(
  slug: string,
  status: string,
  priority: string,
  createdOn: string,
): ProposalShape {
  return { slug, status, priority, category: 'action', createdOn };
}

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
    expect(partitionProposals(proposals, new Set()).pending.map((item) => item.slug)).toEqual([
      'high-new',
      'high-old',
      'normal',
      'odd',
      'low',
    ]);
  });

  it('puts every decided proposal in the history, newest first', () => {
    expect(partitionProposals(proposals, new Set()).decided.map((item) => item.slug)).toEqual([
      'refused',
      'done',
    ]);
  });
});

describe('partitionProposals with proposals decided on this screen', () => {
  it('keeps a proposal the owner just decided on the board, the rest in the history', () => {
    const board = partitionProposals(
      [
        proposal('just', 'acceptee', 'haute', '2026-10-05'),
        proposal('old', 'refusee', 'haute', '2026-10-01'),
      ],
      new Set(['just']),
    );
    expect(board.pending.map((item) => item.slug)).toEqual(['just']);
    expect(board.decided.map((item) => item.slug)).toEqual(['old']);
  });
});

describe('the decision outcome', () => {
  it('tells a pending proposal from a decided one', () => {
    expect(isAwaitingDecision('proposee')).toBe(true);
    expect(isAwaitingDecision('acceptee')).toBe(false);
  });

  it('words and classifies the outcome', () => {
    expect(selectOutcomeKey('acceptee')).toBe('proposals.outcome.accepted');
    expect(selectOutcomeKey('faite')).toBe('proposals.outcome.accepted');
    expect(selectOutcomeKey('refusee')).toBe('proposals.outcome.refused');
    expect(selectOutcomeKey('bizarre')).toBe('proposals.outcome.refused');
    expect(isAcceptedOutcome('acceptee')).toBe(true);
    expect(isAcceptedOutcome('faite')).toBe(true);
    expect(isAcceptedOutcome('refusee')).toBe(false);
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

describe('hasPendingProposals', () => {
  it('is true from one pending proposal', () => {
    expect(hasPendingProposals(1)).toBe(true);
    expect(hasPendingProposals(0)).toBe(false);
  });
});

describe('countAwaitingDecision', () => {
  it('counts only the proposals still pending', () => {
    expect(
      countAwaitingDecision([
        proposal('a', 'proposee', 'haute', '2026-10-05'),
        proposal('b', 'acceptee', 'haute', '2026-10-05'),
      ]),
    ).toBe(1);
  });
});
