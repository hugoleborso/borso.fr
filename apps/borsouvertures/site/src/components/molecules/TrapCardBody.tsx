import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';
import type { ReviewStatus } from '@/review/review-machine.utils';
import type { Side } from '@/state/persistedState.utils';
import type { CardBodyProps } from './card-body.types';

const STATUS_KEY_BY_STATUS = {
  'opponent-moving': 'cards.trap.status.opponent-moving',
  'your-move': 'cards.trap.status.your-move',
  recalled: 'cards.trap.status.recalled',
  missed: 'cards.trap.status.missed',
} as const satisfies Record<ReviewStatus, string>;

const SIDE_KEY_BY_SIDE = {
  white: 'review.side.white',
  black: 'review.side.black',
} as const satisfies Record<Side, string>;

// @FollowsBlueprint molecule-presentational
export function TrapCardBody({ reviewCard, status }: CardBodyProps) {
  const { t } = useTranslation();
  const { opponentMove } = reviewCard;
  if (opponentMove === null) return null;
  return (
    <div role="status" aria-live="polite">
      <StatusItem
        label={t('cards.trap.opponent-played', {
          side: t(SIDE_KEY_BY_SIDE[opponentMove.side]),
          move: opponentMove.notation,
        })}
        value={t(STATUS_KEY_BY_STATUS[status], { moves: reviewCard.bookMoveNotation })}
      />
    </div>
  );
}
