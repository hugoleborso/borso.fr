import { describe, expect, it } from 'vitest';
import { buildTransitionDraftKey } from './transition-draft.utils';

describe('transition drafts', () => {
  it('keys a draft by the ordered song pair', () => {
    const key = buildTransitionDraftKey('superstition', 'valerie');
    expect(key).toBe('superstition>valerie');
    expect(buildTransitionDraftKey('valerie', 'superstition')).not.toBe(key);
  });
});
