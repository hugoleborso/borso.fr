import { useTranslation } from 'react-i18next';
import { TabButton } from '@/components/atoms/TabButton';
import { APP_TABS, type AppTab } from '@/navigation/app-screen.core';

const LABEL_KEY_BY_TAB = {
  today: 'tab-bar.today',
  decks: 'tab-bar.decks',
  explore: 'tab-bar.explore',
} as const satisfies Record<AppTab, string>;

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
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-panel-line bg-modal"
    >
      {APP_TABS.map((tab) => (
        <TabButton
          key={tab}
          label={t(LABEL_KEY_BY_TAB[tab])}
          isCurrent={tab === activeTab}
          onActivate={() => onSelect(tab)}
        />
      ))}
    </nav>
  );
}
