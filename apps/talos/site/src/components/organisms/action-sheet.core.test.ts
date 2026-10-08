import { describe, expect, it } from 'vitest';
import { composeDiscussionText, selectSubjectKindLabelKey } from './action-sheet.core';

describe('selectSubjectKindLabelKey', () => {
  it('names each kind of subject with its own label', () => {
    expect(selectSubjectKindLabelKey('todo')).toBe('discuss.kind.todo');
    expect(selectSubjectKindLabelKey('commitment')).toBe('discuss.kind.commitment');
    expect(selectSubjectKindLabelKey('folder')).toBe('discuss.kind.folder');
    expect(selectSubjectKindLabelKey('draft')).toBe('discuss.kind.draft');
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
