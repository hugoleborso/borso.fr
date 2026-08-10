import { useTranslation } from 'react-i18next';
import { selectFeaturedArticleClassName } from '../../labours/labours-appearance.core';
import {
  deriveMonthScore,
  formatScore,
  listMonthCoverImages,
  selectCompletionRatio,
} from '../../labours/labours.core';
import type { Month } from '../../labours/labours.types';
import {
  ACCENT,
  INK,
  MUTED,
  RULE,
  SANS_FAMILY,
  SERIF_FAMILY,
  STRIPE_LIGHT,
} from '../../theme/twelve-labours.theme';
import { ProgressBar } from '../atoms/ProgressBar';
import { ChallengeRow } from './ChallengeRow';

const MONTH_NUMBER_DIGITS = 2;
const MONTH_PROGRESS_HEIGHT_PX = 8;

interface FeaturedMonthProps {
  month: Month;
  year: number;
}

export function FeaturedMonth({ month, year }: FeaturedMonthProps) {
  const { t } = useTranslation();
  const score = deriveMonthScore(month);
  const coverImages = listMonthCoverImages(month);
  const monthName = t(month.nameKey);

  return (
    <article
      className={selectFeaturedArticleClassName(coverImages.length > 0)}
      style={{
        borderTop: `1px solid ${RULE}`,
        borderBottom: `1px solid ${RULE}`,
        padding: '32px 0 36px',
        gap: 48,
      }}
    >
      {coverImages.map((coverImage) => (
        <div key={coverImage}>
          <img
            src={coverImage}
            alt={t('twelve-labours.featured.cover-alt', { month: monthName })}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </div>
      ))}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: SANS_FAMILY,
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            {t('twelve-labours.featured.label', {
              month: String(month.monthNumber).padStart(MONTH_NUMBER_DIGITS, '0'),
              year,
            })}
          </div>
          <div style={{ fontFamily: SANS_FAMILY, fontSize: 13, color: MUTED }}>
            {t('twelve-labours.featured.score', {
              count: score.completed,
              completed: formatScore(score.completed),
              total: score.total,
            })}
          </div>
        </div>

        <h2
          className="twelve-travaux-month-name"
          style={{
            fontFamily: SERIF_FAMILY,
            fontWeight: 400,
            lineHeight: 0.88,
            margin: '0 0 4px',
            color: INK,
            letterSpacing: '-0.02em',
          }}
        >
          {monthName}.
        </h2>

        <div style={{ margin: '24px 0 32px' }}>
          <ProgressBar
            ratio={selectCompletionRatio(score)}
            heightPx={MONTH_PROGRESS_HEIGHT_PX}
            trackColor={STRIPE_LIGHT}
            fillColor={ACCENT}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {month.challenges.map((challenge, index) => (
            <ChallengeRow
              key={challenge.titleKey}
              challenge={challenge}
              position={index + 1}
              isLastRow={index === month.challenges.length - 1}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
