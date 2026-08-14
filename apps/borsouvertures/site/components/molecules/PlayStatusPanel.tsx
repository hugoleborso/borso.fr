import { useTranslation } from 'react-i18next';
import { StatusItem } from '@/components/atoms/StatusItem';
import type { ValueByFlag } from '@/lib/componentTable.types';

// @FollowsBlueprint component-lookup-table
const BOOK_STATUS_KEY_BY_IN_BOOK: ValueByFlag<'play.status.in-book' | 'play.status.out-of-book'> = {
  true: 'play.status.in-book',
  false: 'play.status.out-of-book',
};

const NEXT_MOVES_KEY_BY_AVAILABILITY: ValueByFlag<
  'play.status.next-moves.available' | 'common.value.none'
> = {
  true: 'play.status.next-moves.available',
  false: 'common.value.none',
};

const NO_CANDIDATES = 0;

interface PlayStatusPanelProps {
  isInBook: boolean;
  openingName: string | undefined;
  variationName: string | undefined;
  lineName: string | undefined;
  candidateCount: number;
}

// @FollowsBlueprint molecule-presentational
export function PlayStatusPanel({
  isInBook,
  openingName,
  variationName,
  lineName,
  candidateCount,
}: PlayStatusPanelProps) {
  const { t } = useTranslation();
  const noValue = t('common.value.none');
  return (
    <div className="p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block px-[0.55rem] py-1 rounded-full bg-white/10 text-[0.85rem]">
            {t(BOOK_STATUS_KEY_BY_IN_BOOK[`${isInBook}`])}
          </span>
        </div>
        <div>{t('play.status.matches', { total: candidateCount })}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <StatusItem label={t('play.status.opening')} value={openingName ?? noValue} />
        <StatusItem label={t('play.status.variation')} value={variationName ?? noValue} />
        <StatusItem label={t('play.status.line')} value={lineName ?? noValue} />
        <StatusItem
          label={t('play.status.next-moves.label')}
          value={t(NEXT_MOVES_KEY_BY_AVAILABILITY[`${candidateCount > NO_CANDIDATES}`])}
        />
      </div>
    </div>
  );
}
