import { describe, expect, it } from 'vitest';
import { composeDiscussionText, selectSubjectPhraseKey } from './action-sheet.core';

describe('selectSubjectPhraseKey', () => {
  it('names each kind of subject with its own phrase', () => {
    expect(selectSubjectPhraseKey('todo')).toBe('discuss.subject.todo');
    expect(selectSubjectPhraseKey('todos')).toBe('discuss.subject.todos');
    expect(selectSubjectPhraseKey('commitment')).toBe('discuss.subject.commitment');
    expect(selectSubjectPhraseKey('folder')).toBe('discuss.subject.folder');
    expect(selectSubjectPhraseKey('draft')).toBe('discuss.subject.draft');
  });
});

describe('composeDiscussionText', () => {
  it('adds what is asked after the subject, separated by a blank line', () => {
    expect(composeDiscussionText('Page « Alice »', 'Prépare un message.')).toBe(
      'Page « Alice »\n\nPrépare un message.',
    );
  });

  it('keeps the subject alone when nothing more is asked', () => {
    expect(composeDiscussionText('Page « Alice »', undefined)).toBe('Page « Alice »');
  });
});
