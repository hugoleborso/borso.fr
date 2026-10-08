import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Chip } from '../atoms/Chip';
import { PersonRow } from '../molecules/PersonRow';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { buildPageHref } from '../../lib/wikilinks.core';
import { selectBirthdayDayKey, selectBirthdayTone } from './relations-board.core';

export interface BirthdayListProps {
  readonly birthdays: readonly {
    readonly page: string;
    readonly title: string;
    readonly daysUntil: number;
    readonly age: number | null;
  }[];
}

// @FollowsBlueprint organism-presentational
export function BirthdayList({ birthdays }: BirthdayListProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <ul className="m-0 p-0 list-none">
      {birthdays.map((birthday) => {
        const href = buildPageHref(birthday.page);
        return (
          <PersonRow
            key={birthday.page}
            href={href}
            title={birthday.title}
            icon="cake"
            trailing={
              <>
                {birthday.age === null ? null : (
                  <Chip tone="outline">{t('relations.age', { count: birthday.age })}</Chip>
                )}
                <Chip tone={selectBirthdayTone(birthday.daysUntil)}>
                  {t(selectBirthdayDayKey(birthday.daysUntil), { count: birthday.daysUntil })}
                </Chip>
              </>
            }
            onLongPress={() => {
              openActionSheet({
                title: birthday.title,
                subject: { kind: 'page', path: birthday.page },
                request: t('relations.discuss.birthday'),
                actions: [
                  {
                    labelKey: 'discuss.action.open',
                    icon: 'open',
                    onSelect: () => void navigate(href),
                  },
                ],
              });
            }}
          />
        );
      })}
    </ul>
  );
}
