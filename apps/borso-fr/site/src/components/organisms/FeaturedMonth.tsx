import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { selectFeaturedArticleClassName } from '../../labours/labours-appearance.core';
import {
  deriveMonthScore,
  formatMonthNumber,
  formatScore,
  listMonthCoverImages,
  selectCompletionRatio,
} from '../../labours/labours.core';
import type { Month } from '../../labours/labours.types';
import { ProgressBar } from '../atoms/ProgressBar';
import { ChallengeRow } from './ChallengeRow';

const ARTICLE_CLASS_NAME = 'grid gap-12 border-y border-labours-rule pt-8 pb-9';

interface FeaturedMonthProps {
  month: Month;
  year: number;
}

// @FollowsBlueprint organism-presentational
export function FeaturedMonth({ month, year }: FeaturedMonthProps) {
  const { t } = useTranslation();
  const score = deriveMonthScore(month);
  const coverImages = listMonthCoverImages(month);
  const monthName = t(month.nameKey);

  return (
    <article
      className={clsx(ARTICLE_CLASS_NAME, selectFeaturedArticleClassName(coverImages.length > 0))}
    >
      {coverImages.map((coverImage) => (
        <div key={coverImage}>
          <img
            src={coverImage}
            alt={t('twelve-labours.featured.cover-alt', { month: monthName })}
            className="block h-auto w-full"
          />
        </div>
      ))}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="font-labours-sans text-[11px] font-semibold tracking-[0.22em] text-labours-accent uppercase">
            {t('twelve-labours.featured.label', {
              month: formatMonthNumber(month.monthNumber),
              year,
            })}
          </div>
          <div className="font-labours-sans text-[13px] text-labours-muted">
            {t('twelve-labours.featured.score', {
              count: score.completed,
              completed: formatScore(score.completed),
              total: score.total,
            })}
          </div>
        </div>

        <h2 className="mt-0 mb-1 font-labours-serif text-[72px] leading-[0.88] font-normal tracking-[-0.02em] text-labours-ink labours-stack:text-[108px]">
          {monthName}.
        </h2>

        <div className="mt-6 mb-8">
          <ProgressBar ratio={selectCompletionRatio(score)} tone="month" />
        </div>

        <div className="flex flex-col gap-5">
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
