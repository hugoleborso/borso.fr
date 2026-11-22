import { GameError } from './game-error.types';

export interface ValidationOutcome {
  readonly success: boolean;
}

// @FollowsBlueprint core-failure-to-response
export function refuseInvalidInput(outcome: ValidationOutcome): void {
  if (!outcome.success) throw new GameError('value-out-of-range');
}
