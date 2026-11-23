import {
  BID_ADJUSTMENTS,
  type BidAdjustment,
  RASCAL_BETS,
  type RascalBet,
} from '@domain/scoring.core';
import { formatSignedPoints } from './game-scores.core';

export type Ability = 'harry' | 'rascal';

export type OpenAbility = Ability | null;

export type StepDirection = -1 | 1;

export type StepLabelKey =
  | 'scoring.harryMinus'
  | 'scoring.harryPlus'
  | 'scoring.rascalMinus'
  | 'scoring.rascalPlus'
  | 'stepper.less'
  | 'stepper.more';

export interface StepView {
  readonly direction: StepDirection;
  readonly text: string;
  readonly labelKey: StepLabelKey;
  readonly isDisabled: boolean;
  readonly isPressed: boolean | undefined;
}

const HARRY_STEP = BID_ADJUSTMENTS[2] - BID_ADJUSTMENTS[1];
const RASCAL_STEP = RASCAL_BETS[1] - RASCAL_BETS[0];

const OPEN_AFTER_STEP: Readonly<Record<Ability, OpenAbility>> = {
  harry: null,
  rascal: 'rascal',
};

// @FollowsBlueprint utils-pure-module
export function toggleAbility(open: OpenAbility, tapped: Ability): OpenAbility {
  return open === tapped ? null : tapped;
}

export function selectOpenAfterStep(ability: Ability): OpenAbility {
  return OPEN_AFTER_STEP[ability];
}

export function selectStep<Value>(
  values: readonly Value[],
  current: Value,
  direction: StepDirection,
): Value | null {
  const index = values.indexOf(current);
  return index === -1 ? null : (values[index + direction] ?? null);
}

export function selectHarrySteps(adjustment: BidAdjustment): readonly StepView[] {
  return [
    {
      direction: -1,
      text: formatSignedPoints(-HARRY_STEP),
      labelKey: 'scoring.harryMinus',
      isDisabled: false,
      isPressed: adjustment < 0,
    },
    {
      direction: 1,
      text: formatSignedPoints(HARRY_STEP),
      labelKey: 'scoring.harryPlus',
      isDisabled: false,
      isPressed: adjustment > 0,
    },
  ];
}

export function selectRascalSteps(bet: RascalBet): readonly StepView[] {
  return [
    {
      direction: -1,
      text: formatSignedPoints(-RASCAL_STEP),
      labelKey: 'scoring.rascalMinus',
      isDisabled: selectStep(RASCAL_BETS, bet, -1) === null,
      isPressed: undefined,
    },
    {
      direction: 1,
      text: formatSignedPoints(RASCAL_STEP),
      labelKey: 'scoring.rascalPlus',
      isDisabled: selectStep(RASCAL_BETS, bet, 1) === null,
      isPressed: undefined,
    },
  ];
}
