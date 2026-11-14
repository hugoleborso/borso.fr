import { useTranslation } from 'react-i18next';
import { PromptLine } from '@/components/atoms/PromptLine';
import { readAnswerMoveFacts } from '@/decks/card.core';
import type { ReviewStatus } from '@/review/review-machine.utils';
import type { Side } from '@/state/persistedState.utils';
import type { CardBodyProps } from './card-body.types';
import { describeMoveInWords } from './move-words.utils';
import { selectReviewPrompt } from './review-prompt.core';

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

// @FollowsBlueprint molecule-presentational
export function MoveCardBody({ reviewCard, status }: CardBodyProps) {
  const { t } = useTranslation();
  const { opponentMove, bookMoveNotation } = reviewCard;
  const statusText = t(STATUS_KEY_BY_STATUS[status], { move: bookMoveNotation });
  const prompt = selectReviewPrompt(status, {
    question: statusText,
    context:
      opponentMove === null
        ? t('review.first-move')
        : t('review.opponent-played', {
            side: t(SIDE_KEY_BY_SIDE[opponentMove.side]),
            move: opponentMove.notation,
          }),
    notation: bookMoveNotation,
    words: describeMoveInWords(t, readAnswerMoveFacts(reviewCard)),
    outcome: statusText,
  });
  return (
    <div role="status" aria-live="polite">
      <PromptLine lead={prompt.lead} detail={prompt.detail} leadFont={prompt.leadFont} />
      <p className="sr-only">{prompt.spoken}</p>
    </div>
  );
}
