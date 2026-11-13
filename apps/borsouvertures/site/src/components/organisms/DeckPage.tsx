import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionBar } from '@/components/atoms/ActionBar';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { Notice } from '@/components/atoms/Notice';
import { Panel } from '@/components/atoms/Panel';
import { SectionTabs } from '@/components/atoms/SectionTabs';
import { TabPanel } from '@/components/atoms/TabPanel';
import { DeckLineDetails } from '@/components/molecules/DeckLineDetails';
import { IconButton } from '@/components/molecules/IconButton';
import { findDeck, listLineSteps } from '@/decks/card.core';
import { selectDeckName } from '@/decks/idea.utils';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { openScreen } from '@/navigation/navigation.store';
import { buildDeckPreviewFen } from '@/openings/previews.utils';
import { findDeckProgress } from '@/review/daily-plan.core';
import { useTrainerProgress } from '@/review/trainer-progress.hook';
import { useAppState } from '@/state/appState';
import type { Side } from '@/state/persistedState.utils';
import { DeckGame } from './DeckGame';
import type { AppScreenProps } from './screen.types';

type DeckSection = 'review' | 'lines' | 'play';

const DECK_TABS_ID = 'deck';

const DECK_SECTIONS = ['review', 'lines', 'play'] as const satisfies readonly DeckSection[];

const SECTION_LABEL_KEY_BY_SECTION = {
  review: 'decks.sections.review',
  lines: 'decks.sections.lines',
  play: 'decks.sections.play',
} as const satisfies Record<DeckSection, string>;

const SIDE_KEY_BY_SIDE = {
  white: 'decks.side.white',
  black: 'decks.side.black',
} as const satisfies Record<Side, string>;

// @FollowsBlueprint component-lookup-table
const NOTHING_TO_REVIEW_BY_EMPTY_SESSION: ComponentByFlag<{ message: string }> = {
  true: Notice,
  false: EmptySlot,
};

// @FollowsBlueprint organism-table-dispatch
export function DeckPage({ decks, deckId }: AppScreenProps) {
  const { t, i18n } = useTranslation();
  const { boardStyle } = useAppState();
  const progress = useTrainerProgress(decks);
  const [shownSection, setShownSection] = useState<DeckSection>('review');
  const deck = deckId === null ? null : findDeck(decks, deckId);
  const deckProgress = deck === null ? null : findDeckProgress(progress, deck.id);
  if (deck === null || deckProgress === null) return null;
  const isSessionEmpty = deckProgress.sessionCardIds.length === 0;
  const NothingToReview = NOTHING_TO_REVIEW_BY_EMPTY_SESSION[`${isSessionEmpty}`];
  const name = selectDeckName(
    i18n.getResource(i18n.language, 'translation', deck.nameKey),
    deck.nameKey,
  );
  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto lg:max-w-none">
      <div className="flex items-center gap-3 pt-3 border-t-[3px] border-ink">
        <IconButton
          label={t('decks.back')}
          icon="chevron-left"
          onActivate={() => openScreen({ kind: 'decks' })}
        />
        <MiniBoard
          fen={buildDeckPreviewFen(deck.lines)}
          boardStyleId={boardStyle}
          orientation={deck.side}
        />
        <div className="flex flex-col min-w-0">
          <h2 className="text-xl font-bold leading-tight tracking-[-0.01em] text-balance">
            {name}
          </h2>
          <p className="text-sm text-ink-muted">{t(SIDE_KEY_BY_SIDE[deck.side])}</p>
        </div>
      </div>
      <SectionTabs
        tabs={DECK_SECTIONS.map((section) => ({
          id: section,
          label: t(SECTION_LABEL_KEY_BY_SECTION[section]),
        }))}
        selectedId={shownSection}
        ariaLabel={t('decks.sections.aria-label')}
        idPrefix={DECK_TABS_ID}
        onSelect={setShownSection}
      />
      <TabPanel idPrefix={DECK_TABS_ID} tabId="review" isSelected={shownSection === 'review'}>
        <p className="text-lg font-bold tabular-nums">
          {t('decks.counts', {
            cards: deckProgress.cardCount,
            due: deckProgress.dueCount,
            new: deckProgress.newCount,
          })}
        </p>
        <NothingToReview message={t('decks.nothing-to-review')} />
        <ActionBar>
          <Button
            label={t('decks.review')}
            variant="primary"
            isDisabled={isSessionEmpty}
            onActivate={() => openScreen({ kind: 'review-session', deckId: deck.id })}
          />
        </ActionBar>
      </TabPanel>
      <TabPanel idPrefix={DECK_TABS_ID} tabId="lines" isSelected={shownSection === 'lines'}>
        <Panel title={t('decks.lines')}>
          <div className="flex flex-col">
            {deck.lines.map((line) => (
              <DeckLineDetails
                key={line.name}
                line={line}
                steps={listLineSteps(deck, line)}
                side={deck.side}
                boardStyle={boardStyle}
              />
            ))}
          </div>
        </Panel>
      </TabPanel>
      <TabPanel idPrefix={DECK_TABS_ID} tabId="play" isSelected={shownSection === 'play'}>
        <DeckGame deck={deck} />
      </TabPanel>
    </div>
  );
}
