import { useTranslation } from 'react-i18next';
import type { IconName } from '@/components/atoms/Icon';
import { TabButton } from '@/components/atoms/TabButton';
import { APP_TABS, type AppTab } from '@/navigation/app-screen.core';

interface TabFace {
  icon: IconName;
  labelKey: string;
  nameKey: string;
}

const FACE_BY_TAB = {
  today: { icon: 'today', labelKey: 'tab-bar.today', nameKey: 'today.title' },
  decks: { icon: 'decks', labelKey: 'tab-bar.decks', nameKey: 'decks.title' },
  stats: { icon: 'stats', labelKey: 'stats.tab', nameKey: 'stats.title' },
  explore: { icon: 'explore', labelKey: 'tab-bar.explore', nameKey: 'explore.title' },
} as const satisfies Record<AppTab, TabFace>;

interface TabBarProps {
  activeTab: AppTab | null;
  onSelect: (tab: AppTab) => void;
}

// @FollowsBlueprint molecule-presentational
export function TabBar({ activeTab, onSelect }: TabBarProps) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('tab-bar.aria-label')}
      className="fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom)] bg-page border-t border-rule"
    >
      <div className="flex w-full max-w-3xl h-tab-bar mx-auto">
        {APP_TABS.map((tab) => {
          const face = FACE_BY_TAB[tab];
          return (
            <TabButton
              key={tab}
              icon={face.icon}
              label={t(face.labelKey)}
              name={t(face.nameKey)}
              isCurrent={tab === activeTab}
              onActivate={() => onSelect(tab)}
            />
          );
        })}
      </div>
    </nav>
  );
}
