import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/atoms/Panel';
import { SectionTabs } from '@/components/atoms/SectionTabs';
import { TabPanel } from '@/components/atoms/TabPanel';
import { DeckAccuracyRow } from '@/components/molecules/DeckAccuracyRow';
import { RetentionGrid } from '@/components/molecules/RetentionGrid';
import { StreakBadge } from '@/components/molecules/StreakBadge';
import { useTrainerStatistics } from '@/review/trainer-statistics.hook';
import { useAppState } from '@/state/appState';
import type { AppScreenProps } from './screen.types';

type StatsSection = 'retention' | 'accuracy';

const STATS_TABS_ID = 'stats';

const STATS_SECTIONS = ['retention', 'accuracy'] as const satisfies readonly StatsSection[];

const SECTION_LABEL_KEY_BY_SECTION = {
  retention: 'stats.sections.retention',
  accuracy: 'stats.sections.accuracy',
} as const satisfies Record<StatsSection, string>;

// @FollowsBlueprint organism-table-dispatch
export function StatsScreen({ decks }: AppScreenProps) {
  const { t } = useTranslation();
  const { boardStyle } = useAppState();
  const statistics = useTrainerStatistics(decks);
  const [shownSection, setShownSection] = useState<StatsSection>('retention');
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <Panel title={t('stats.title')}>
        <StreakBadge streakDays={statistics.streakDays} />
      </Panel>
      <SectionTabs
        tabs={STATS_SECTIONS.map((section) => ({
          id: section,
          label: t(SECTION_LABEL_KEY_BY_SECTION[section]),
        }))}
        selectedId={shownSection}
        ariaLabel={t('stats.sections.aria-label')}
        idPrefix={STATS_TABS_ID}
        onSelect={setShownSection}
      />
      <TabPanel
        idPrefix={STATS_TABS_ID}
        tabId="retention"
        isSelected={shownSection === 'retention'}
      >
        <Panel title={t('stats.retention.title')}>
          <p className="text-sm text-ink-muted">{t('stats.retention.caption')}</p>
          <div className="flex flex-col">
            {decks.map((deck, index) => {
              const deckWeeks = statistics.retentionWeeks[index];
              if (deckWeeks === undefined) return null;
              return (
                <RetentionGrid
                  key={deck.id}
                  deck={deck}
                  weeks={deckWeeks.weeks}
                  boardStyle={boardStyle}
                />
              );
            })}
          </div>
        </Panel>
      </TabPanel>
      <TabPanel idPrefix={STATS_TABS_ID} tabId="accuracy" isSelected={shownSection === 'accuracy'}>
        <Panel title={t('stats.accuracy.title')}>
          <p className="text-sm text-ink-muted">{t('stats.accuracy.caption')}</p>
          <div className="flex flex-col">
            {decks.map((deck, index) => {
              const share = statistics.accuracy[index];
              if (share === undefined) return null;
              return (
                <DeckAccuracyRow
                  key={deck.id}
                  deck={deck}
                  share={share}
                  measure="accuracy"
                  boardStyle={boardStyle}
                />
              );
            })}
          </div>
        </Panel>
      </TabPanel>
    </div>
  );
}
