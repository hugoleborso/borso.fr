/** @Feature concert-registrations */

import { CONCERT_PRIZE_ICONS, type ConcertPrizeIcon } from '@domain/concert-prize.core';
import type { JSX } from 'react';
import { RadioButton, RadioField, RadioGroup } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { PRIZE_ICON_GLYPH } from '../../routes/concerts/concert-ticket.core';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface PrizeIconChoiceProps {
  readonly value: ConcertPrizeIcon;
  readonly onChange: (icon: ConcertPrizeIcon) => void;
}

const LABEL_KEY_BY_ICON = {
  beer: 'sessions.prizeIconBeer',
  gift: 'sessions.prizeIconGift',
  ticket: 'sessions.prizeIconTicket',
  shirt: 'sessions.prizeIconShirt',
} as const satisfies Readonly<Record<ConcertPrizeIcon, string>>;

// @FollowsBlueprint molecule-choice-without-a-select
export function PrizeIconChoice({ value, onChange }: PrizeIconChoiceProps): JSX.Element {
  const { t } = useTranslation();
  const choose = (chosen: string): void => {
    const icon = CONCERT_PRIZE_ICONS.find((candidate) => candidate === chosen);
    if (icon !== undefined) onChange(icon);
  };
  return (
    <RadioGroup
      aria-label={t('sessions.prizeIcon')}
      value={value}
      onChange={choose}
      orientation="horizontal"
      className="m-0 flex gap-2 border-0 p-0"
    >
      {CONCERT_PRIZE_ICONS.map((icon) => (
        <RadioField key={icon} value={icon}>
          <RadioButton
            className={({ isSelected }) =>
              composeClassName(
                'flex size-11 cursor-pointer items-center justify-center rounded-md text-ink',
                'data-focus-visible:outline-3 data-focus-visible:outline-focus',
                isSelected
                  ? 'border-2 border-accent bg-accent-soft'
                  : 'border border-rule-strong bg-raised hover:bg-hover',
              )
            }
          >
            <Icon name={PRIZE_ICON_GLYPH[icon]} size="md" className="size-5.5" />
            <span className="sr-only">{t(LABEL_KEY_BY_ICON[icon])}</span>
          </RadioButton>
        </RadioField>
      ))}
    </RadioGroup>
  );
}
