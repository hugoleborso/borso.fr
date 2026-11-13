import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionBar } from '@/components/atoms/ActionBar';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { Panel } from '@/components/atoms/Panel';
import { SectionTabs } from '@/components/atoms/SectionTabs';
import { TabPanel } from '@/components/atoms/TabPanel';
import { DailyCounts } from '@/components/molecules/DailyCounts';
import { DeckAccuracyRow } from '@/components/molecules/DeckAccuracyRow';
import { DeckRow } from '@/components/molecules/DeckRow';
import { ProgressNotKeptBanner } from '@/components/molecules/ProgressNotKeptBanner';
import { StreakBadge } from '@/components/molecules/StreakBadge';
import type { BuiltDeck } from '@/decks/deck.utils';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { openScreen } from '@/navigation/navigation.store';
import type { TrainerProgress } from '@/review/daily-plan.core';
import { useReviewLog } from '@/review/review-log.store';
import { useTrainerProgress } from '@/review/trainer-progress.hook';
import { useTrainerStatistics } from '@/review/trainer-statistics.hook';
import { useAppState } from '@/state/appState';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import type { AppScreenProps } from './screen.types';
import { selectShownSection } from './section-tabs.core';

type TodaySection = 'session' | 'ahead' | 'retention';

const TODAY_TABS_ID = 'today';

// @FollowsBlueprint component-lookup-table
const SECTIONS_BY_EMPTY_PLAN: Record<`${boolean}`, readonly [TodaySection, ...TodaySection[]]> = {
  true: ['session', 'ahead', 'retention'],
  false: ['session', 'retention'],
};

const SECTION_LABEL_KEY_BY_SECTION = {
  session: 'today.sections.session',
  ahead: 'today.sections.ahead',
  retention: 'today.sections.retention',
} as const satisfies Record<TodaySection, string>;

function NothingLeft({ message }: { message: string }) {
  return <p className="max-w-[65ch] text-ink-muted">{message}</p>;
}

const NOTHING_LEFT_BY_EMPTY_PLAN: ComponentByFlag<{ message: string }> = {
  true: NothingLeft,
  false: EmptySlot,
};

const BANNER_BY_PROGRESS_KEPT: ComponentByFlag<Record<string, never>> = {
  true: EmptySlot,
  false: ProgressNotKeptBanner,
};

function openDeck(deckId: string): void {
  openScreen({ kind: 'deck', deckId });
}

interface AheadPanelProps {
  decks: BuiltDeck[];
  progress: TrainerProgress;
  boardStyle: BoardThemeId;
  isSelected: boolean;
}

function ReviewAheadPanel({ decks, progress, boardStyle, isSelected }: AheadPanelProps) {
  const { t } = useTranslation();
  return (
    <TabPanel idPrefix={TODAY_TABS_ID} tabId="ahead" isSelected={isSelected}>
      <Panel title={t('today.review-ahead')}>
        <div className="flex flex-col">
          {decks.map((deck, index) => {
            const deckProgress = progress.deckProgress[index];
            if (deckProgress === undefined) return null;
            return (
              <DeckRow
                key={deck.id}
                deck={deck}
                progress={deckProgress}
                boardStyle={boardStyle}
                onOpen={openDeck}
              />
            );
          })}
        </div>
      </Panel>
    </TabPanel>
  );
}

const AHEAD_PANEL_BY_EMPTY_PLAN: ComponentByFlag<AheadPanelProps> = {
  true: ReviewAheadPanel,
  false: EmptySlot,
};

// @FollowsBlueprint organism-table-dispatch
export function TodayScreen({ decks }: AppScreenProps) {
  const { t } = useTranslation();
  const { boardStyle } = useAppState();
  const progress = useTrainerProgress(decks);
  const statistics = useTrainerStatistics(decks);
  const { isProgressKept } = useReviewLog();
  const [chosenSection, setChosenSection] = useState<TodaySection>('session');
  const isPlanEmpty = progress.sessionCardIds.length === 0;
  const sections = SECTIONS_BY_EMPTY_PLAN[`${isPlanEmpty}`];
  const shownSection = selectShownSection(sections, chosenSection);
  const Banner = BANNER_BY_PROGRESS_KEPT[`${isProgressKept}`];
  const NothingLeftSlot = NOTHING_LEFT_BY_EMPTY_PLAN[`${isPlanEmpty}`];
  const AheadPanel = AHEAD_PANEL_BY_EMPTY_PLAN[`${isPlanEmpty}`];
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
      <Banner />
      <h2 className="pt-3 border-t-[3px] border-ink text-2xl font-bold tracking-[-0.02em]">
        {t('today.title')}
      </h2>
      <SectionTabs
        tabs={sections.map((section) => ({
          id: section,
          label: t(SECTION_LABEL_KEY_BY_SECTION[section]),
        }))}
        selectedId={shownSection}
        ariaLabel={t('today.sections.aria-label')}
        idPrefix={TODAY_TABS_ID}
        onSelect={setChosenSection}
      />
      <TabPanel idPrefix={TODAY_TABS_ID} tabId="session" isSelected={shownSection === 'session'}>
        <DailyCounts
          dueCount={progress.plan.dueCardIds.length}
          newCount={progress.plan.newCardIds.length}
        />
        <StreakBadge streakDays={statistics.streakDays} />
        <NothingLeftSlot message={t('today.nothing-left')} />
        <ActionBar>
          <Button
            label={t('today.start')}
            variant="primary"
            isDisabled={isPlanEmpty}
            onActivate={() => openScreen({ kind: 'review-session', deckId: null })}
          />
        </ActionBar>
      </TabPanel>
      <AheadPanel
        decks={decks}
        progress={progress}
        boardStyle={boardStyle}
        isSelected={shownSection === 'ahead'}
      />
      <TabPanel
        idPrefix={TODAY_TABS_ID}
        tabId="retention"
        isSelected={shownSection === 'retention'}
      >
        <Panel title={t('stats.recent-retention.title')}>
          <div className="flex flex-col">
            {decks.map((deck, index) => {
              const share = statistics.recentRetention[index];
              if (share === undefined) return null;
              return (
                <DeckAccuracyRow
                  key={deck.id}
                  deck={deck}
                  share={share}
                  measure="retention"
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
