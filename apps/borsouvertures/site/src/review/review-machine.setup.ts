import { reviewEffects } from './review-effects.setup';
import { createReviewMachine } from './review-machine.utils';

// @FollowsBlueprint machine-singleton
export const reviewMachine = createReviewMachine(reviewEffects);
