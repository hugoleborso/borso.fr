import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { ActivityRow } from '../molecules/ActivityRow';
import { openActionSheet } from '../../lib/action-sheet.hook';
import { DISPLAY_LOCALE, formatShortDay } from '../../lib/calendar-day.utils';
import { buildPageHref } from '../../lib/wikilinks.core';
import { selectEarlierDay } from './today-agenda.core';

export interface TodayActivityProps {
  readonly entries: readonly { readonly date: string; readonly heading: string }[];
  readonly today: string;
}

function formatEarlierDay(date: string, today: string): string | null {
  const earlierDay = selectEarlierDay(date, today);
  return earlierDay === null ? null : formatShortDay(earlierDay, DISPLAY_LOCALE);
}

// @FollowsBlueprint organism-presentational
export function TodayActivity({ entries, today }: TodayActivityProps): JSX.Element | null {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <Card>
      <section aria-label={t('today.activity.title')}>
        <h2 className="m-0 mb-1 flex items-center gap-2 text-label text-ink-muted">
          <Icon name="activity" size={16} />
          {t('today.activity.title')}
        </h2>
        <ul className="m-0 p-0 list-none">
          {entries.map((entry) => (
            <ActivityRow
              key={`${entry.date}:${entry.heading}`}
              href={buildPageHref(`journal/${entry.date}`)}
              heading={entry.heading}
              dayLabel={formatEarlierDay(entry.date, today)}
              onLongPress={() => {
                openActionSheet({
                  title: entry.heading,
                  subject: { kind: 'journal', date: entry.date },
                });
              }}
            />
          ))}
        </ul>
      </section>
    </Card>
  );
}
