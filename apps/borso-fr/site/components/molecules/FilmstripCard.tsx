import { useTranslation } from 'react-i18next';
import {
  selectFilmstripBarColor,
  selectFilmstripCardClassName,
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
import { ACCENT, SANS_FAMILY, SERIF_FAMILY } from '../../theme/twelve-labours.theme';

const SUMMARY_TITLE_COUNT = 2;
const CURRENT_MONTH_DOT_SIZE_PX = 6;

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
      className={selectFilmstripCardClassName(isActive)}
      style={{ background: colors.background, color: colors.color }}
    >
      <div
        style={{
          padding: '14px 14px 10px',
          borderBottom: `1px solid ${colors.innerRuleColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: SANS_FAMILY,
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: colors.secondaryOpacity,
          }}
        >
          {formatMonthNumber(month.monthNumber)}
        </span>
        <span
          style={{
            width: CURRENT_MONTH_DOT_SIZE_PX,
            height: CURRENT_MONTH_DOT_SIZE_PX,
            borderRadius: '50%',
            background: CURRENT_MONTH_DOT_BACKGROUND[`${isCurrentMonth}`],
          }}
        />
      </div>
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: SERIF_FAMILY,
            fontSize: 24,
            lineHeight: 0.95,
            letterSpacing: '-0.01em',
            marginBottom: 8,
          }}
        >
          {t(month.nameKey)}
        </div>
        <div
          style={{
            fontFamily: SANS_FAMILY,
            fontSize: 10,
            letterSpacing: '0.04em',
            opacity: colors.secondaryOpacity,
            lineHeight: 1.4,
            flex: 1,
            marginBottom: 12,
          }}
        >
          {summary}
        </div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
          {month.challenges.map((challenge) => (
            <div
              key={challenge.titleKey}
              style={{
                flex: 1,
                height: 3,
                background: selectFilmstripBarColor(challenge.status, isActive),
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: SANS_FAMILY,
            fontSize: 10,
            opacity: colors.secondaryOpacity,
            letterSpacing: '0.08em',
          }}
        >
          {formatScore(score.completed)}/{score.total}
        </div>
      </div>
    </button>
  );
}
