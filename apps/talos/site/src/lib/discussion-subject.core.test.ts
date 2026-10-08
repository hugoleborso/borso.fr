import { describe, expect, it } from 'vitest';
import { selectSubjectFile } from './discussion-subject.core';

describe('selectSubjectFile', () => {
  it('names the file of the private repository each kind of subject lives in', () => {
    expect(selectSubjectFile({ kind: 'todo' })).toBe('todo.md');
    expect(selectSubjectFile({ kind: 'focus' })).toBe('focus.md');
    expect(selectSubjectFile({ kind: 'scan' })).toBe('etat/dernier-scan.json');
    expect(selectSubjectFile({ kind: 'proposal', slug: '2026-10-04-cv' })).toBe(
      'etat/propositions/2026-10-04-cv.md',
    );
    expect(selectSubjectFile({ kind: 'journal', date: '2026-10-05' })).toBe(
      'journal/2026-10-05.md',
    );
    expect(selectSubjectFile({ kind: 'commitment', path: 'engagements/devis' })).toBe(
      'engagements/devis.md',
    );
    expect(selectSubjectFile({ kind: 'page', path: 'second-brain/moi' })).toBe(
      'second-brain/moi.md',
    );
    expect(selectSubjectFile({ kind: 'relations' })).toBe('etat/relations.json');
    expect(selectSubjectFile({ kind: 'draft', slug: '2026-10-08-relance' })).toBe(
      'etat/brouillons/2026-10-08-relance.md',
    );
    expect(selectSubjectFile({ kind: 'review', week: '2026-S41' })).toBe(
      'journal/2026-S41-hebdo.md',
    );
    expect(selectSubjectFile({ kind: 'folder', path: 'etat/propositions' })).toBe(
      'etat/propositions/',
    );
  });
});
