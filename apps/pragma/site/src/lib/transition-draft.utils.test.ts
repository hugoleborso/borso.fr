import { describe, expect, it } from 'vitest';
import {
  buildTransitionDraftKey,
  clearTransitionDraft,
  putTransitionDraft,
  takeTransitionDraft,
} from './transition-draft.utils';

function buildKey(): string {
  return buildTransitionDraftKey('superstition', 'valerie');
}

describe('transition drafts', () => {
  it('keys a draft by the ordered song pair', () => {
    const key = buildKey();
    expect(key).toBe('superstition>valerie');
    expect(buildTransitionDraftKey('valerie', 'superstition')).not.toBe(key);
  });

  it('keeps a draft until it is cleared, without touching the map it was given', () => {
    const key = buildKey();
    const empty = new Map<string, string>();
    const drafts = putTransitionDraft(empty, key, 'Enchainer sans pause');
    expect(takeTransitionDraft(drafts, key)).toBe('Enchainer sans pause');
    expect(takeTransitionDraft(empty, key)).toBeNull();
    const cleared = clearTransitionDraft(drafts, key);
    expect(takeTransitionDraft(cleared, key)).toBeNull();
    expect(takeTransitionDraft(drafts, key)).toBe('Enchainer sans pause');
  });

  it('answers the same map when there is nothing to clear', () => {
    const key = buildKey();
    const drafts = new Map<string, string>();
    expect(clearTransitionDraft(drafts, key)).toBe(drafts);
  });
});
