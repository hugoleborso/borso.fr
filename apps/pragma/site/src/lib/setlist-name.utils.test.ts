import { describe, expect, it } from 'vitest';
import { selectSetlistDisplayName } from './setlist-name.utils';

describe('selectSetlistDisplayName', () => {
  it('shows the name the band gave the setlist', () => {
    expect(selectSetlistDisplayName('Rappel', 'Untitled')).toBe('Rappel');
  });

  it('falls back when the setlist was saved without a name', () => {
    expect(selectSetlistDisplayName('', 'Untitled')).toBe('Untitled');
  });

  it('reads a name made of spaces as no name at all', () => {
    expect(selectSetlistDisplayName('   ', 'Untitled')).toBe('Untitled');
  });
});
