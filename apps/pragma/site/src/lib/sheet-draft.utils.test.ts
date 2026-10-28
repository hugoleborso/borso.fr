import { describe, expect, it } from 'vitest';
import { clearDraft, putDraft, takeDraft } from './sheet-draft.utils';

const KEY = 'new';

// @FollowsBlueprint test-pure-unit
describe('sheet drafts', () => {
  it('keeps a draft until it is cleared, without touching the map it was given', () => {
    const empty = new Map<string, string>();
    const drafts = putDraft(empty, KEY, 'Imprimer les setlists');
    expect(takeDraft(drafts, KEY)).toBe('Imprimer les setlists');
    expect(takeDraft(empty, KEY)).toBeNull();
    const cleared = clearDraft(drafts, KEY);
    expect(takeDraft(cleared, KEY)).toBeNull();
    expect(takeDraft(drafts, KEY)).toBe('Imprimer les setlists');
  });

  it('keeps one draft per key', () => {
    const drafts = putDraft(putDraft(new Map<string, string>(), 'task-a', 'A'), 'task-b', 'B');
    expect(takeDraft(drafts, 'task-a')).toBe('A');
    expect(takeDraft(drafts, 'task-b')).toBe('B');
  });

  it('answers the same map when there is nothing to clear', () => {
    const drafts = new Map<string, string>();
    expect(clearDraft(drafts, KEY)).toBe(drafts);
  });
});
