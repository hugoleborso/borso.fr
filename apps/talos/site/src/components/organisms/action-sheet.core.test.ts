import { describe, expect, it } from 'vitest';
import { selectSubjectKindLabelKey } from './action-sheet.core';

describe('selectSubjectKindLabelKey', () => {
  it('names each kind of subject with its own label', () => {
    expect(selectSubjectKindLabelKey('todo')).toBe('discuss.kind.todo');
    expect(selectSubjectKindLabelKey('commitment')).toBe('discuss.kind.commitment');
    expect(selectSubjectKindLabelKey('folder')).toBe('discuss.kind.folder');
  });
});
