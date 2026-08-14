import { useTranslation } from 'react-i18next';
import {
  countChallengesOfKind,
  countUnfinishedChallenges,
  deriveEditionScore,
  formatScore,
  selectCompletionRatio,
} from '../../labours/labours.core';
import type { Edition } from '../../labours/labours.types';
import { MiniStat } from '../atoms/MiniStat';
import { ProgressBar } from '../atoms/ProgressBar';

interface LaboursHeroProps {
  edition: Edition;
  year: number;
}

// @FollowsBlueprint organism-presentational
export function LaboursHero({ edition, year }: LaboursHeroProps) {
  const { t } = useTranslation();
  const score = deriveEditionScore(edition);

  return (
    <div className="grid grid-cols-1 items-end gap-12 border-b border-labours-rule pt-10 pb-8 labours-stack:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="mb-2.5 font-labours-sans text-[12px] font-semibold tracking-[0.22em] text-labours-muted uppercase">
          {t('twelve-labours.hero.edition-label')}
        </div>
        <h2 className="m-0 font-labours-serif text-[140px] leading-[0.82] font-normal tracking-[-0.045em] text-labours-ink labours-display:text-[220px]">
          {year}
        </h2>
        <div className="mt-[18px] max-w-[520px] font-labours-serif text-[30px] leading-[1.2] text-labours-ink italic">
          {t(edition.titleKey)}
          <span className="text-labours-accent">.</span>
        </div>
        <div className="mt-3 max-w-[520px] font-labours-sans text-[14px] leading-[1.5] text-labours-note-ink">
          {t(edition.subtitleKey)}
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <div className="font-labours-sans text-[11px] font-medium tracking-[0.18em] text-labours-muted uppercase">
            {t('twelve-labours.hero.tally-label')}
          </div>
          <div className="font-labours-serif text-[72px] leading-[0.9] text-labours-ink">
            {formatScore(score.completed)}
            <span className="text-labours-accent">/</span>
            {score.total}
          </div>
        </div>
        <ProgressBar ratio={selectCompletionRatio(score)} tone="edition" />
        <div className="mt-1.5 grid grid-cols-3 gap-3">
          <MiniStat
            label={t('twelve-labours.stats.daily')}
            value={countChallengesOfKind(edition, 'daily')}
            tone="ink"
          />
          <MiniStat
            label={t('twelve-labours.stats.one-shot')}
            value={countChallengesOfKind(edition, 'oneshot')}
            tone="ink"
          />
          <MiniStat
            label={t('twelve-labours.stats.remaining')}
            value={countUnfinishedChallenges(edition)}
            tone="accent"
          />
        </div>
      </div>
    </div>
  );
}
