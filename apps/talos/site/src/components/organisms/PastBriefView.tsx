import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { DISPLAY_LOCALE, formatLongDay } from '../../lib/calendar-day.utils';
import { usePastBrief } from '../../lib/queries/history.queries';
import { HistoryEntry } from './HistoryEntry';

export interface PastBriefViewProps {
  readonly date: string;
}

// @FollowsBlueprint organism-query-owning
export function PastBriefView({ date }: PastBriefViewProps): JSX.Element {
  const { t } = useTranslation();
  const brief = usePastBrief(date);
  const heading = formatLongDay(date, DISPLAY_LOCALE);
  return (
    <HistoryEntry
      entry={{
        heading,
        markdown: brief.data?.markdown,
        isPending: brief.isPending,
        error: brief.error,
        refetch: () => void brief.refetch(),
        sheet: {
          title: t('today.brief.sheet-title', { date: heading }),
          subject: { kind: 'journal', date },
        },
        backTo: '/history',
      }}
    />
  );
}
