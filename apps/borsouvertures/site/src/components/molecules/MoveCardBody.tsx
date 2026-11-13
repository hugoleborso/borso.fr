import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';
import type { ReviewCard } from '@/decks/card.core';
import type { ReviewStatus } from '@/review/review-machine.utils';
import type { Side } from '@/state/persistedState.utils';

const STATUS_KEY_BY_STATUS = {
  'opponent-moving': 'review.status.opponent-moving',
  'your-move': 'review.status.your-move',
  recalled: 'review.status.recalled',
  missed: 'review.status.missed',
} as const satisfies Record<ReviewStatus, string>;

const SIDE_KEY_BY_SIDE = {
  white: 'review.side.white',
  black: 'review.side.black',
} as const satisfies Record<Side, string>;

export interface CardBodyProps {
  reviewCard: ReviewCard;
  status: ReviewStatus;
}

// @FollowsBlueprint molecule-presentational
export function MoveCardBody({ reviewCard, status }: CardBodyProps) {
  const { t } = useTranslation();
  const { opponentMove } = reviewCard;
  const context =
    opponentMove === null
      ? t('review.first-move')
      : t('review.opponent-played', {
          side: t(SIDE_KEY_BY_SIDE[opponentMove.side]),
          move: opponentMove.notation,
        });
  return (
    <div role="status" aria-live="polite">
      <StatusItem
        label={context}
        value={t(STATUS_KEY_BY_STATUS[status], { move: reviewCard.bookMoveNotation })}
      />
    </div>
  );
}
