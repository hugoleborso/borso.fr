import { describe, expect, it } from 'vitest';
import { selectVisibility } from './visibility.utils';

describe('selectVisibility', () => {
  it('shows when the claim holds', () => {
    expect(selectVisibility(true)).toBe('shown');
  });

  it('hides when the claim does not hold', () => {
    expect(selectVisibility(false)).toBe('hidden');
  });
});
