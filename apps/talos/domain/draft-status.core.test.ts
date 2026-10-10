import { describe, expect, it } from 'vitest';
import { isDraftReady, isDraftStatusChangeAllowed } from './draft-status.core';

// @FollowsBlueprint test-pure-unit
describe('isDraftReady', () => {
  it('knows a draft is ready only from its status', () => {
    expect(isDraftReady('pret')).toBe(true);
    expect(isDraftReady('envoye')).toBe(false);
  });
});

describe('isDraftStatusChangeAllowed', () => {
  it('sends or abandons a ready draft, and restores a settled one', () => {
    expect(isDraftStatusChangeAllowed('pret', 'envoye')).toBe(true);
    expect(isDraftStatusChangeAllowed('pret', 'abandonne')).toBe(true);
    expect(isDraftStatusChangeAllowed('envoye', 'pret')).toBe(true);
    expect(isDraftStatusChangeAllowed('abandonne', 'pret')).toBe(true);
  });

  it('refuses a change that skips the ready status', () => {
    expect(isDraftStatusChangeAllowed('pret', 'pret')).toBe(false);
    expect(isDraftStatusChangeAllowed('envoye', 'abandonne')).toBe(false);
    expect(isDraftStatusChangeAllowed('abandonne', 'envoye')).toBe(false);
    expect(isDraftStatusChangeAllowed('', 'pret')).toBe(false);
  });
});
