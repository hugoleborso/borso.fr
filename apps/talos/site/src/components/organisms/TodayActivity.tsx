import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityRow } from '../molecules/ActivityRow';
import { FoldedSection } from '../molecules/FoldedSection';
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
    <FoldedSection label={t('today.activity.count', { count: entries.length })}>
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
    </FoldedSection>
  );
}
