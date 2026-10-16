import { describe, expect, it } from 'vitest';
import { selectSubjectFile, selectSubjectReference } from './discussion-subject.core';

describe('selectSubjectFile', () => {
  it('names the file of the private repository each kind of subject lives in', () => {
    expect(selectSubjectFile({ kind: 'todo', list: 'main' })).toBe('todo.md');
    expect(selectSubjectFile({ kind: 'todos', list: 'main' })).toBe('todo.md');
    expect(selectSubjectFile({ kind: 'todo', list: 'work' })).toBe('todo-taff.md');
    expect(selectSubjectFile({ kind: 'todos', list: 'work' })).toBe('todo-taff.md');
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

function cite(subject: Parameters<typeof selectSubjectReference>[0]): string {
  return selectSubjectReference(subject, 'database');
}

describe('selectSubjectReference', () => {
  it('names the file while the memory lives in git', () => {
    expect(selectSubjectReference({ kind: 'focus' }, 'git')).toBe('focus.md');
    expect(selectSubjectReference({ kind: 'focus' }, undefined)).toBe('focus.md');
  });

  it('cites the type and slug once the memory is in the database', () => {
    expect(cite({ kind: 'todo', list: 'main' })).toBe('todo: personal');
    expect(cite({ kind: 'todos', list: 'work' })).toBe('todo: work');
    expect(cite({ kind: 'focus' })).toBe('focus');
    expect(cite({ kind: 'scan' })).toBe('état: last_scan');
    expect(cite({ kind: 'relations' })).toBe('état: relations');
    expect(cite({ kind: 'proposal', slug: '2026-10-04-atelier' })).toBe(
      'proposition: etat/propositions/2026-10-04-atelier',
    );
    expect(cite({ kind: 'draft', slug: '2026-10-04-cafe' })).toBe(
      'brouillon: etat/brouillons/2026-10-04-cafe',
    );
    expect(cite({ kind: 'review', week: '2026-S40' })).toBe('journal: journal/2026-S40-hebdo');
    expect(cite({ kind: 'journal', date: '2026-10-05' })).toBe('journal: journal/2026-10-05');
    expect(cite({ kind: 'folder', path: 'second-brain/personnes' })).toBe(
      'dossier: second-brain/personnes/',
    );
    expect(cite({ kind: 'commitment', path: 'engagements/2026-10-07-devis-acme' })).toBe(
      'engagement: engagements/2026-10-07-devis-acme',
    );
    expect(cite({ kind: 'page', path: 'second-brain/personnes/alice-martin' })).toBe(
      'page: second-brain/personnes/alice-martin',
    );
  });
});
