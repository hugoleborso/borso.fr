/** @Feature shell */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import type { ShellTab, ShellTabId } from './navigation-active.core';

export interface BottomTabBarProps {
  readonly tabs: readonly ShellTab[];
  readonly activeTab: ShellTabId | null;
}

const TAB_CLASS =
  'relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 text-meta no-underline';

// @FollowsBlueprint organism-presentational
export function BottomTabBar(props: BottomTabBarProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-leaf border-t border-rule pb-[env(safe-area-inset-bottom)]"
      aria-label={t('nav.bottomBar')}
    >
      {props.tabs.map((tab) => {
        const isActive = tab.id === props.activeTab;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={composeClassName(TAB_CLASS, isActive ? 'text-accent' : 'text-ink-soft')}
          >
            <Icon name={tab.icon} size="md" />
            <span>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
