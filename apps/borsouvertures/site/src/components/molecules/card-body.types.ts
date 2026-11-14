import type { ReviewCard } from '@/decks/card.core';
import type { ReviewStatus } from '@/review/review-machine.utils';

// @FollowsBlueprint domain-types-module
export interface CardBodyProps {
  reviewCard: ReviewCard;
  status: ReviewStatus;
  onChooseName: (openingName: string) => void;
}
