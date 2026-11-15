/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { readTakeCountOfTab, type SongViewTab } from '../../routes/catalog/song-view-tab.core';
import type { IconName } from '../atoms/Icon';
import { SectionTabs } from './SectionTabs';

export interface SongViewTabsProps<Tab extends SongViewTab> {
  readonly tabs: readonly Tab[];
  readonly value: Tab;
  readonly takeCount: number | null;
  readonly onChange: (tab: Tab) => void;
}

const TAB_LABEL_KEY = {
  info: 'catalog.viewTabInfo',
  lineup: 'catalog.viewTabLineup',
  chords: 'catalog.viewTabChords',
  takes: 'catalog.viewTabTakes',
} as const satisfies Readonly<Record<SongViewTab, string>>;
const TAB_ICON = {
  info: 'catalog',
  lineup: 'members',
  chords: 'text',
  takes: 'mic',
} as const satisfies Readonly<Record<SongViewTab, IconName>>;

// @FollowsBlueprint molecule-presentational
export function SongViewTabs<Tab extends SongViewTab>({
  tabs,
  value,
  takeCount,
  onChange,
}: SongViewTabsProps<Tab>): JSX.Element {
  const { t } = useTranslation();
  const labelOf = (tab: SongViewTab): string => {
    const count = readTakeCountOfTab(tab, takeCount);
    return count === null ? t(TAB_LABEL_KEY[tab]) : t('catalog.viewTabTakesCount', { count });
  };
  return (
    <SectionTabs
      label={t('catalog.viewTabsLabel')}
      tabs={tabs.map((tab) => ({ value: tab, label: labelOf(tab), icon: TAB_ICON[tab] }))}
      value={value}
      layout="stacked"
      onChange={onChange}
    />
  );
}
