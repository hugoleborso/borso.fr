import { describe, expect, it } from 'vitest';
import { selectInstrumentDeletionEffect } from './instruments-page.core';

// @FollowsBlueprint test-pure-unit
describe('selectInstrumentDeletionEffect', () => {
  it('empties the form when the deleted row is the one being edited', () => {
    expect(selectInstrumentDeletionEffect('guitar', 'guitar')).toBe('clear-form');
  });

  it('leaves the form alone when another row is deleted', () => {
    expect(selectInstrumentDeletionEffect('guitar', 'bass')).toBe('keep-form');
  });

  it('leaves the form alone when nothing is being edited', () => {
    expect(selectInstrumentDeletionEffect(null, 'bass')).toBe('keep-form');
  });
});
