import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionBar } from '@/components/atoms/ActionBar';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { SectionTabs } from '@/components/atoms/SectionTabs';
import { TabPanel } from '@/components/atoms/TabPanel';
import { SideSelector } from '@/components/molecules/SideSelector';
import type { ComponentByKind } from '@/lib/componentTable.types';
import { isSessionStartAllowed } from '@/openings/sessionStart.core';
import type { Opening } from '@/openings/types';
import { setView, useAppState } from '@/state/appState';
import type { Mode } from '@/state/persistedState.utils';
import { OpeningFlowSelector } from './OpeningFlowSelector';
import { SelectionAutoOpponentRow } from './SelectionAutoOpponentRow';

type SelectionSection = 'pick' | 'setup';

const SELECTION_TABS_ID = 'explore-selection';

const SELECTION_SECTIONS = ['pick', 'setup'] as const satisfies readonly SelectionSection[];

const SECTION_LABEL_KEY_BY_SECTION = {
  pick: 'explore.sections.pick',
  setup: 'explore.sections.setup',
} as const satisfies Record<SelectionSection, string>;

// @FollowsBlueprint component-lookup-table
const AUTO_OPPONENT_ROW_BY_MODE: ComponentByKind<Mode, { isAutoOpponentEnabled: boolean }> = {
  play: SelectionAutoOpponentRow,
  learn: EmptySlot,
};

const START_LABEL_KEY_BY_MODE: Record<Mode, 'selection.start.learn' | 'selection.start.play'> = {
  learn: 'selection.start.learn',
  play: 'selection.start.play',
};

interface SelectionScreenProps {
  openings: Opening[];
}

// @FollowsBlueprint organism-table-dispatch
export function SelectionScreen({ openings }: SelectionScreenProps) {
  const { t } = useTranslation();
  const { mode, side, selection, playScope, playAutoOpponent } = useAppState();
  const [shownSection, setShownSection] = useState<SelectionSection>('pick');
  const isStartAllowed = isSessionStartAllowed(mode, selection, playScope);
  const AutoOpponentRow = AUTO_OPPONENT_ROW_BY_MODE[mode];

  return (
    <>
      <SectionTabs
        tabs={SELECTION_SECTIONS.map((section) => ({
          id: section,
          label: t(SECTION_LABEL_KEY_BY_SECTION[section]),
        }))}
        selectedId={shownSection}
        ariaLabel={t('explore.sections.aria-label')}
        idPrefix={SELECTION_TABS_ID}
        onSelect={setShownSection}
      />
      <TabPanel idPrefix={SELECTION_TABS_ID} tabId="pick" isSelected={shownSection === 'pick'}>
        <OpeningFlowSelector openings={openings} />
      </TabPanel>
      <TabPanel idPrefix={SELECTION_TABS_ID} tabId="setup" isSelected={shownSection === 'setup'}>
        <div>
          <SideSelector side={side} />
          <AutoOpponentRow isAutoOpponentEnabled={playAutoOpponent} />
        </div>
      </TabPanel>
      <ActionBar>
        <Button
          label={t(START_LABEL_KEY_BY_MODE[mode])}
          variant="primary"
          isDisabled={!isStartAllowed}
          onActivate={() => setView('session')}
        />
      </ActionBar>
    </>
  );
}
