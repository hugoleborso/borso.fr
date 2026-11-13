import { useTranslation } from 'react-i18next';
import { ShareBar } from '@/components/atoms/ShareBar';
import type { BuiltDeck } from '@/decks/deck.utils';
import { selectDeckName } from '@/decks/idea.utils';
import type { RecallShareKind, RetentionWeek } from '@/review/retention.core';

const WEEK_LABEL_KEY_BY_KIND = {
  measured: 'stats.retention.week.measured',
  empty: 'stats.retention.week.empty',
} as const satisfies Record<RecallShareKind, string>;

interface RetentionGridProps {
  deck: BuiltDeck;
  weeks: readonly RetentionWeek[];
}

// @FollowsBlueprint molecule-presentational
export function RetentionGrid({ deck, weeks }: RetentionGridProps) {
  const { t, i18n } = useTranslation();
  const name = selectDeckName(
    i18n.getResource(i18n.language, 'translation', deck.nameKey),
    deck.nameKey,
  );
  return (
    <div className="flex flex-col gap-1 px-3 py-[0.6rem] rounded-lg bg-sunken">
      <div className="font-semibold">{name}</div>
      <ol className="grid grid-cols-12 gap-1">
        {weeks.map((week) => (
          <li key={week.weekStart}>
            <ShareBar
              label={t(WEEK_LABEL_KEY_BY_KIND[week.kind], {
                weekStart: week.weekStart,
                percent: week.percent,
                recalled: week.recalled,
                reviews: week.reviews,
              })}
              percent={week.percent}
              isMeasured={week.kind === 'measured'}
            />
          </li>
        ))}
      </ol>
      <div className="flex justify-between text-[0.75rem] opacity-70">
        <span>{t('stats.retention.oldest-week', { count: weeks.length - 1 })}</span>
        <span>{t('stats.retention.latest-week')}</span>
      </div>
    </div>
  );
}
