import { useTranslation } from 'react-i18next';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { ShareBar } from '@/components/atoms/ShareBar';
import type { BuiltDeck } from '@/decks/deck.utils';
import { selectDeckName } from '@/decks/idea.utils';
import { buildDeckPreviewFen } from '@/openings/previews.utils';
import type { RecallShareKind, RetentionWeek } from '@/review/retention.core';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const WEEK_LABEL_KEY_BY_KIND = {
  measured: 'stats.retention.week.measured',
  empty: 'stats.retention.week.empty',
} as const satisfies Record<RecallShareKind, string>;

interface RetentionGridProps {
  deck: BuiltDeck;
  weeks: readonly RetentionWeek[];
  boardStyle: BoardThemeId;
}

// @FollowsBlueprint molecule-presentational
export function RetentionGrid({ deck, weeks, boardStyle }: RetentionGridProps) {
  const { t, i18n } = useTranslation();
  const name = selectDeckName(
    i18n.getResource(i18n.language, 'translation', deck.nameKey),
    deck.nameKey,
  );
  return (
    <div className="flex items-center gap-3 py-2 border-b border-rule last:border-b-0">
      <MiniBoard
        fen={buildDeckPreviewFen(deck.lines)}
        boardStyleId={boardStyle}
        orientation={deck.side}
      />
      <div className="flex flex-col flex-auto gap-1 min-w-0">
        <div className="text-sm font-bold leading-snug truncate">{name}</div>
        <ol className="grid grid-cols-12 gap-[3px]">
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
        <div className="flex justify-between text-xs text-ink-muted">
          <span>{t('stats.retention.oldest-week', { count: weeks.length - 1 })}</span>
          <span>{t('stats.retention.latest-week')}</span>
        </div>
      </div>
    </div>
  );
}
