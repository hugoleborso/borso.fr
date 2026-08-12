import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  selectFilmstripBarColor,
  selectFilmstripCardBorderClassName,
  selectFilmstripCardColors,
  TRANSPARENT,
} from '../../labours/labours-appearance.core';
import {
  buildFilmstripSummary,
  deriveMonthScore,
  formatMonthNumber,
  formatScore,
} from '../../labours/labours.core';
import type { Month } from '../../labours/labours.types';
import { ACCENT } from '../../theme/twelve-labours.theme';

const SUMMARY_TITLE_COUNT = 2;

const CARD_CLASS_NAME =
  'flex h-full cursor-pointer appearance-none flex-col border p-0 text-left transition-all duration-150';

const CURRENT_MONTH_DOT_BACKGROUND: Readonly<Record<`${boolean}`, string>> = {
  true: ACCENT,
  false: TRANSPARENT,
};

interface FilmstripCardProps {
  month: Month;
  isActive: boolean;
  isCurrentMonth: boolean;
  onSelect: () => void;
}

// @FollowsBlueprint molecule-presentational
export function FilmstripCard({ month, isActive, isCurrentMonth, onSelect }: FilmstripCardProps) {
  const { t } = useTranslation();
  const score = deriveMonthScore(month);
  const colors = selectFilmstripCardColors(isActive);
  const summary = buildFilmstripSummary(
    month.challenges.map((challenge) => t(challenge.titleKey)),
    SUMMARY_TITLE_COUNT,
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(CARD_CLASS_NAME, selectFilmstripCardBorderClassName(isActive))}
      style={{ background: colors.background, color: colors.color }}
    >
      <div
        className="flex items-center justify-between border-b px-3.5 pt-3.5 pb-2.5"
        style={{ borderBottomColor: colors.innerRuleColor }}
      >
        <span
          className="font-labours-sans text-[10px] font-semibold tracking-[0.18em] uppercase"
          style={{ opacity: colors.secondaryOpacity }}
        >
          {formatMonthNumber(month.monthNumber)}
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: CURRENT_MONTH_DOT_BACKGROUND[`${isCurrentMonth}`] }}
        />
      </div>
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        <div className="mb-2 font-labours-serif text-[24px] leading-[0.95] tracking-[-0.01em]">
          {t(month.nameKey)}
        </div>
        <div
          className="mb-3 flex-1 font-labours-sans text-[10px] leading-[1.4] tracking-[0.04em]"
          style={{ opacity: colors.secondaryOpacity }}
        >
          {summary}
        </div>
        <div className="mb-2 flex gap-[3px]">
          {month.challenges.map((challenge) => (
            <div
              key={challenge.titleKey}
              className="h-[3px] flex-1"
              style={{ background: selectFilmstripBarColor(challenge.status, isActive) }}
            />
          ))}
        </div>
        <div
          className="font-labours-sans text-[10px] tracking-[0.08em]"
          style={{ opacity: colors.secondaryOpacity }}
        >
          {formatScore(score.completed)}/{score.total}
        </div>
      </div>
    </button>
  );
}
