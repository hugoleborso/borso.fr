import type { ReactNode } from 'react';
import { buildTabId, buildTabPanelId } from './section-tabs.utils';

interface TabPanelProps {
  idPrefix: string;
  tabId: string;
  isSelected: boolean;
  children: ReactNode;
}

// @FollowsBlueprint atom-plain
export function TabPanel({ idPrefix, tabId, isSelected, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={buildTabPanelId(idPrefix, tabId)}
      aria-labelledby={buildTabId(idPrefix, tabId)}
      hidden={!isSelected}
      className="flex flex-col gap-5"
    >
      {children}
    </div>
  );
}
