/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { SONG_VIEW_TABS, type SongViewTab } from '../../routes/catalog/song-view-tab.core';
import type { IconName } from '../atoms/Icon';
import { SectionTabs } from './SectionTabs';

export interface SongViewTabsProps {
  readonly value: SongViewTab;
  readonly onChange: (tab: SongViewTab) => void;
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
export function SongViewTabs({ value, onChange }: SongViewTabsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <SectionTabs
      label={t('catalog.viewTabsLabel')}
      tabs={SONG_VIEW_TABS.map((tab) => ({
        value: tab,
        label: t(TAB_LABEL_KEY[tab]),
        icon: TAB_ICON[tab],
      }))}
      value={value}
      layout="stacked"
      onChange={onChange}
    />
  );
}
