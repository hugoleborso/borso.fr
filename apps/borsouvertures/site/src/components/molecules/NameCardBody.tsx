import { useTranslation } from 'react-i18next';
import { Button, type ButtonVariant } from '@/components/atoms/Button';
import { StatusBand } from '@/components/atoms/StatusBand';
import type { ValueByFlag } from '@/lib/componentTable.types';
import {
  listNameChoices,
  type ReviewStatus,
  selectOpeningName,
} from '@/review/review-machine.utils';
import type { CardBodyProps } from './card-body.types';
import { TONE_BY_REVIEW_STATUS } from './review-tone.core';

const STATUS_KEY_BY_STATUS = {
  'opponent-moving': 'cards.name.status.asking',
  'your-move': 'cards.name.status.asking',
  recalled: 'cards.name.status.recalled',
  missed: 'cards.name.status.missed',
} as const satisfies Record<ReviewStatus, string>;

const VARIANT_BY_RIGHT_NAME: ValueByFlag<ButtonVariant> = {
  true: 'primary',
  false: 'default',
};

// @FollowsBlueprint molecule-presentational
export function NameCardBody({ reviewCard, status, onChooseName }: CardBodyProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div role="status" aria-live="polite">
        <StatusBand
          label={t('cards.name.question')}
          tone={TONE_BY_REVIEW_STATUS[status]}
          value={t(STATUS_KEY_BY_STATUS[status], {
            name: selectOpeningName(reviewCard),
            moves: reviewCard.bookMoveNotation,
          })}
        />
      </div>
      <div role="group" aria-label={t('cards.name.choices')} className="grid grid-cols-2 gap-2">
        {listNameChoices(reviewCard, status).map((choice) => (
          <Button
            key={choice.openingName}
            label={choice.openingName}
            variant={VARIANT_BY_RIGHT_NAME[`${choice.isRightName}`]}
            isDisabled={choice.isLocked}
            onActivate={() => onChooseName(choice.openingName)}
          />
        ))}
      </div>
    </div>
  );
}
