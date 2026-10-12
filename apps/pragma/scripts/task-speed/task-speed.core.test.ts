import { describe, expect, it } from 'vitest';
import {
  countSwipes,
  formatEffortTable,
  indexEffortById,
  isStretchTap,
  type JourneyEffort,
  type JourneyResult,
  listBudgetOverruns,
  measureJourneyEffort,
  roundSeconds,
  summariseEffort,
  type StepObservation,
} from './task-speed.core';

const VIEWPORT_HEIGHT = 600;

function tapStep(overrides: Partial<StepObservation>): StepObservation {
  return {
    kind: 'tap',
    label: 'button',
    typedCharacters: 0,
    scrolledPixels: 0,
    targetCentreY: 400,
    hasChangedScreen: false,
    ...overrides,
  };
}

const QUICK_EFFORT: JourneyEffort = {
  taps: 2,
  typedCharacters: 0,
  swipes: 0,
  screens: 2,
  huntedTaps: 0,
  stretchTaps: 0,
  modelledSeconds: 4.9,
};

const BUDGET = { taps: 3, huntedTaps: 0, modelledSeconds: 6 };

describe('countSwipes', () => {
  it('needs no swipe when nothing scrolled', () => {
    expect(countSwipes(0, VIEWPORT_HEIGHT)).toBe(0);
    expect(countSwipes(-30, VIEWPORT_HEIGHT)).toBe(0);
  });

  it('counts one swipe up to three quarters of a viewport and two beyond', () => {
    expect(countSwipes(450, VIEWPORT_HEIGHT)).toBe(1);
    expect(countSwipes(451, VIEWPORT_HEIGHT)).toBe(2);
  });
});

describe('isStretchTap', () => {
  it('flags a target in the top quarter of the screen only', () => {
    expect(isStretchTap(149, VIEWPORT_HEIGHT)).toBe(true);
    expect(isStretchTap(150, VIEWPORT_HEIGHT)).toBe(false);
  });
});

describe('roundSeconds', () => {
  it('keeps one decimal', () => {
    expect(roundSeconds(4.26)).toBe(4.3);
  });
});

describe('measureJourneyEffort', () => {
  it('sums taps, typing, swipes, screens, hunted and stretch taps into a modelled time', () => {
    const effort = measureJourneyEffort({
      viewportHeight: VIEWPORT_HEIGHT,
      steps: [
        tapStep({ targetCentreY: 100, hasChangedScreen: true }),
        tapStep({ kind: 'type', typedCharacters: 10 }),
        tapStep({ scrolledPixels: 900 }),
      ],
    });
    expect(effort).toEqual({
      taps: 3,
      typedCharacters: 10,
      swipes: 2,
      screens: 2,
      huntedTaps: 1,
      stretchTaps: 1,
      modelledSeconds: roundSeconds(2 * 1.35 + 5 * 1.1 + 10 * 0.28),
    });
  });

  it('costs only the arrival screen for an empty journey', () => {
    expect(measureJourneyEffort({ viewportHeight: VIEWPORT_HEIGHT, steps: [] })).toEqual({
      taps: 0,
      typedCharacters: 0,
      swipes: 0,
      screens: 1,
      huntedTaps: 0,
      stretchTaps: 0,
      modelledSeconds: 1.4,
    });
  });
});

describe('listBudgetOverruns', () => {
  it('is empty at the budget exactly', () => {
    expect(listBudgetOverruns({ ...QUICK_EFFORT, taps: 3, modelledSeconds: 6 }, BUDGET)).toEqual(
      [],
    );
  });

  it('names every axis that went over', () => {
    expect(
      listBudgetOverruns({ ...QUICK_EFFORT, taps: 4, huntedTaps: 1, modelledSeconds: 6.1 }, BUDGET),
    ).toEqual(['taps 4 > 3', 'hunted 1 > 0', '6.1s > 6s']);
  });
});

const PASSING: JourneyResult = {
  id: 'quick',
  title: 'Quick job',
  budget: BUDGET,
  effort: QUICK_EFFORT,
  failure: null,
};

const OVER: JourneyResult = {
  id: 'slow',
  title: 'Slow job',
  budget: BUDGET,
  effort: { ...QUICK_EFFORT, taps: 5, huntedTaps: 1 },
  failure: null,
};

const BROKEN: JourneyResult = {
  id: 'broken',
  title: 'Broken job',
  budget: BUDGET,
  effort: null,
  failure: 'button not found',
};

const BROKEN_WITHOUT_REASON: JourneyResult = { ...BROKEN, failure: null };

describe('formatEffortTable', () => {
  it('renders a row per journey with its verdict', () => {
    const table = formatEffortTable([PASSING, OVER, BROKEN, BROKEN_WITHOUT_REASON], {});
    expect(table.split('\n')).toEqual([
      '| Job | Taps | Typed | Swipes | Screens | Hunted | Stretch | Modelled time | Verdict |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
      '| Quick job | 2 | 0 | 0 | 2 | 0 | 0 | 4.9s | within budget |',
      '| Slow job | 5 | 0 | 0 | 2 | 1 | 0 | 4.9s | over: taps 5 > 3, hunted 1 > 0 |',
      '| Broken job | – | – | – | – | – | – | – | could not run: button not found |',
      '| Broken job | – | – | – | – | – | – | – | could not run: unknown |',
    ]);
  });

  it('shows the change against a baseline in both directions', () => {
    const table = formatEffortTable([PASSING, OVER], {
      quick: { ...QUICK_EFFORT, modelledSeconds: 9.9 },
      slow: { ...QUICK_EFFORT, modelledSeconds: 2.9 },
    });
    expect(table).toContain('4.9s (was 9.9s, -5s)');
    expect(table).toContain('4.9s (was 2.9s, +2s)');
  });

  it('shows no sign when nothing changed', () => {
    expect(formatEffortTable([PASSING], { quick: QUICK_EFFORT })).toContain('4.9s (was 4.9s, 0s)');
  });
});

describe('indexEffortById', () => {
  it('keeps the journeys that produced an effort', () => {
    expect(indexEffortById([PASSING, BROKEN])).toEqual({ quick: QUICK_EFFORT });
  });
});

describe('summariseEffort', () => {
  it('says the taps, the typing, the hunted taps and the modelled time', () => {
    expect(summariseEffort(QUICK_EFFORT)).toEqual([
      '2 taps, 0 characters typed',
      '0 taps needing a scroll first',
      '4.9 s modelled',
    ]);
  });
});
