import { describe, expect, it } from 'vitest';
import {
  selectHarrySteps,
  selectOpenAfterStep,
  selectRascalSteps,
  selectStep,
  toggleAbility,
} from './ability-stepper.core';

// @FollowsBlueprint test-pure-unit
describe('toggleAbility', () => {
  it('opens the tapped ability, switches to another, and closes it on a second tap', () => {
    expect(toggleAbility(null, 'harry')).toBe('harry');
    expect(toggleAbility('harry', 'rascal')).toBe('rascal');
    expect(toggleAbility('rascal', 'rascal')).toBeNull();
  });
});

describe('selectOpenAfterStep', () => {
  it('closes Harry after one pick and keeps the Rascal stepper open', () => {
    expect(selectOpenAfterStep('harry')).toBeNull();
    expect(selectOpenAfterStep('rascal')).toBe('rascal');
  });
});

describe('selectStep', () => {
  const values = [0, 10, 20] as const;

  it('moves one value along the list in either direction', () => {
    expect(selectStep(values, 10, 1)).toBe(20);
    expect(selectStep(values, 10, -1)).toBe(0);
  });

  it('finds no step past either end', () => {
    expect(selectStep(values, 20, 1)).toBeNull();
    expect(selectStep(values, 0, -1)).toBeNull();
  });

  it('finds no step from a value outside the list', () => {
    expect(selectStep<number>(values, 5, 1)).toBeNull();
  });
});

describe('selectHarrySteps', () => {
  it('offers minus one and plus one, never disabled', () => {
    expect(selectHarrySteps(0)).toEqual([
      {
        direction: -1,
        text: '−1',
        labelKey: 'scoring.harryMinus',
        isDisabled: false,
        isPressed: false,
      },
      {
        direction: 1,
        text: '+1',
        labelKey: 'scoring.harryPlus',
        isDisabled: false,
        isPressed: false,
      },
    ]);
  });

  it('presses the side the bid already moved to', () => {
    expect(selectHarrySteps(-1).map((step) => step.isPressed)).toEqual([true, false]);
    expect(selectHarrySteps(1).map((step) => step.isPressed)).toEqual([false, true]);
  });
});

describe('selectRascalSteps', () => {
  it('offers minus ten and plus ten, pressing neither', () => {
    expect(selectRascalSteps(10)).toEqual([
      {
        direction: -1,
        text: '−10',
        labelKey: 'scoring.rascalMinus',
        isDisabled: false,
        isPressed: undefined,
      },
      {
        direction: 1,
        text: '+10',
        labelKey: 'scoring.rascalPlus',
        isDisabled: false,
        isPressed: undefined,
      },
    ]);
  });

  it('disables minus at no bet and plus at the largest bet', () => {
    expect(selectRascalSteps(0).map((step) => step.isDisabled)).toEqual([true, false]);
    expect(selectRascalSteps(20).map((step) => step.isDisabled)).toEqual([false, true]);
  });
});
