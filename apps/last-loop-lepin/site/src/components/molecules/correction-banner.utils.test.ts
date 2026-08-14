import { describe, expect, it } from 'vitest';
import { isCorrectionBannerVisible } from './correction-banner.utils';

const CORRECTED_AT = new Date('2026-06-13T07:30:00.000Z');
const CORRECTED_AT_MS = CORRECTED_AT.getTime();

// @FollowsBlueprint test-pure-unit
describe('isCorrectionBannerVisible', () => {
  it('stays hidden when no correction has landed', () => {
    expect(isCorrectionBannerVisible(null, CORRECTED_AT_MS)).toBe(false);
  });

  it('shows at the moment of the correction', () => {
    expect(isCorrectionBannerVisible(CORRECTED_AT, CORRECTED_AT_MS)).toBe(true);
  });

  it('still shows exactly one minute later', () => {
    expect(isCorrectionBannerVisible(CORRECTED_AT, CORRECTED_AT_MS + 60_000)).toBe(true);
  });

  it('hides once more than a minute has passed', () => {
    expect(isCorrectionBannerVisible(CORRECTED_AT, CORRECTED_AT_MS + 60_001)).toBe(false);
  });

  it('hides when the correction is in the future, which means the clocks disagree', () => {
    expect(isCorrectionBannerVisible(CORRECTED_AT, CORRECTED_AT_MS - 1)).toBe(false);
  });
});
