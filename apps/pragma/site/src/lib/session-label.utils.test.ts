import { describe, expect, it } from 'vitest';
import { composeSessionLabel } from './session-label.utils';

// @FollowsBlueprint test-pure-unit
describe('composeSessionLabel', () => {
  it('names the kind and the date, then the venue when there is one', () => {
    expect(
      composeSessionLabel({ kindLabel: 'Practice', dateLabel: 'Wed 28 Oct', venue: null }),
    ).toBe('Practice · Wed 28 Oct');
    expect(
      composeSessionLabel({ kindLabel: 'Concert', dateLabel: 'Sun 1 Nov', venue: 'Petit Bain' }),
    ).toBe('Concert · Sun 1 Nov · Petit Bain');
  });

  it('leaves out a blank venue', () => {
    expect(
      composeSessionLabel({ kindLabel: 'Practice', dateLabel: 'Wed 28 Oct', venue: ' ' }),
    ).toBe('Practice · Wed 28 Oct');
  });
});
