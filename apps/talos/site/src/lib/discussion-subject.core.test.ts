import { describe, expect, it } from 'vitest';
import { selectSubjectReference } from './discussion-subject.core';

describe('selectSubjectReference', () => {
  it('cites the type and slug of the memory record', () => {
    expect(selectSubjectReference({ kind: 'todo', list: 'main' })).toBe('todo: personal');
    expect(selectSubjectReference({ kind: 'todos', list: 'work' })).toBe('todo: work');
    expect(selectSubjectReference({ kind: 'focus' })).toBe('focus');
    expect(selectSubjectReference({ kind: 'scan' })).toBe('état: last_scan');
    expect(selectSubjectReference({ kind: 'relations' })).toBe('état: relations');
    expect(selectSubjectReference({ kind: 'proposal', slug: '2026-10-04-atelier' })).toBe(
      'proposition: etat/propositions/2026-10-04-atelier',
    );
    expect(selectSubjectReference({ kind: 'draft', slug: '2026-10-04-cafe' })).toBe(
      'brouillon: etat/brouillons/2026-10-04-cafe',
    );
    expect(selectSubjectReference({ kind: 'review', week: '2026-S40' })).toBe(
      'journal: journal/2026-S40-hebdo',
    );
    expect(selectSubjectReference({ kind: 'journal', date: '2026-10-05' })).toBe(
      'journal: journal/2026-10-05',
    );
    expect(selectSubjectReference({ kind: 'folder', path: 'second-brain/personnes' })).toBe(
      'dossier: second-brain/personnes/',
    );
    expect(
      selectSubjectReference({ kind: 'commitment', path: 'engagements/2026-10-07-devis-acme' }),
    ).toBe('engagement: engagements/2026-10-07-devis-acme');
    expect(
      selectSubjectReference({ kind: 'page', path: 'second-brain/personnes/alice-martin' }),
    ).toBe('page: second-brain/personnes/alice-martin');
  });
});
