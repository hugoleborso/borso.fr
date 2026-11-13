import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/atoms/Panel';
import { DeckAccuracyRow } from '@/components/molecules/DeckAccuracyRow';
import { RetentionGrid } from '@/components/molecules/RetentionGrid';
import { StreakBadge } from '@/components/molecules/StreakBadge';
import { useTrainerStatistics } from '@/review/trainer-statistics.hook';
import type { AppScreenProps } from './screen.types';

// @FollowsBlueprint organism-presentational
export function StatsScreen({ decks }: AppScreenProps) {
  const { t } = useTranslation();
  const statistics = useTrainerStatistics(decks);
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <Panel title={t('stats.title')}>
        <StreakBadge streakDays={statistics.streakDays} />
      </Panel>
      <Panel title={t('stats.retention.title')}>
        <p className="text-[0.85rem] opacity-70">{t('stats.retention.caption')}</p>
        {decks.map((deck, index) => {
          const deckWeeks = statistics.retentionWeeks[index];
          if (deckWeeks === undefined) return null;
          return <RetentionGrid key={deck.id} deck={deck} weeks={deckWeeks.weeks} />;
        })}
      </Panel>
      <Panel title={t('stats.accuracy.title')}>
        <p className="text-[0.85rem] opacity-70">{t('stats.accuracy.caption')}</p>
        {decks.map((deck, index) => {
          const share = statistics.accuracy[index];
          if (share === undefined) return null;
          return <DeckAccuracyRow key={deck.id} deck={deck} share={share} measure="accuracy" />;
        })}
      </Panel>
    </div>
  );
}
