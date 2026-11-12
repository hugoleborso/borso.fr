import { describe, expect, it } from 'vitest';
import {
  computeDockMove,
  isDockAimingAnimation,
  isLandingAnimation,
  SHRINK_IN_PLACE,
  shouldPlayOpening,
} from './opening.core';

const PHONE = { width: 390, height: 844 };

describe('computeDockMove', () => {
  it('moves the coin centre onto the centre of the header logo and scales it to its width', () => {
    const logo = { left: 16, top: 12, width: 30, height: 30 };
    expect(computeDockMove(logo, PHONE)).toEqual({
      x: 31 - 195,
      y: 27 - 844 * 0.42,
      scale: 0.2,
    });
  });

  it('reads the height of the logo for the vertical centre, not its width', () => {
    const tallLogo = { left: 0, top: 0, width: 150, height: 300 };
    expect(computeDockMove(tallLogo, PHONE).y).toBeCloseTo(150 - 844 * 0.42);
  });

  it('shrinks the coin where it stands when no header logo is on screen', () => {
    expect(computeDockMove(null, PHONE)).toEqual(SHRINK_IN_PLACE);
    expect(SHRINK_IN_PLACE).toEqual({ x: 0, y: 0, scale: 0 });
  });
});

describe('shouldPlayOpening', () => {
  it.each([
    [false, false, true],
    [true, false, false],
    [false, true, false],
    [true, true, false],
  ])('played %s, reduced motion %s: plays %s', (played, reducedMotion, expected) => {
    expect(shouldPlayOpening(played, reducedMotion)).toBe(expected);
  });
});

describe('the animations the overlay listens to', () => {
  it.each([
    ['opening-reveal', true, false],
    ['opening-dock', true, true],
    ['opening-halo', false, false],
    ['opening-word', false, false],
  ])('%s: aims at the dock %s, lands %s', (name, aims, lands) => {
    expect(isDockAimingAnimation(name)).toBe(aims);
    expect(isLandingAnimation(name)).toBe(lands);
  });
});
