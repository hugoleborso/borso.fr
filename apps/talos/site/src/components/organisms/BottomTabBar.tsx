import type { ParseKeys } from 'i18next';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { CountBadge } from '../atoms/CountBadge';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { isBadgeShownOnTab, isNavigationDestinationActive } from './navigation-active.core';

export interface BottomTab {
  readonly to: string;
  readonly labelKey: ParseKeys;
  readonly icon: IconName;
}

export interface BottomTabBarProps {
  readonly tabs: readonly BottomTab[];
  readonly activePath: string;
  readonly badgeDestination: string;
  readonly badgeCount: number;
}

const ACTIVE_STROKE = 2;
const IDLE_STROKE = 1.75;
const TAB_ICON_SIZE = 20;
// @FollowsBlueprint organism-presentational
export function BottomTabBar({
  tabs,
  activePath,
  badgeDestination,
  badgeCount,
}: BottomTabBarProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('nav.bar')}
      className="fixed inset-x-0 z-40 bottom-[max(8px,calc(env(safe-area-inset-bottom)-12px))] px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pointer-events-none"
    >
      <ul className="m-0 p-1 list-none flex max-w-[480px] mx-auto rounded-full border border-on-shell/10 bg-shell/60 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_24px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.25)] pointer-events-auto">
        {tabs.map((tab) => {
          const isActive = isNavigationDestinationActive(activePath, tab.to);
          const isBadgeShown = isBadgeShownOnTab(tab.to, badgeDestination, badgeCount);
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                className={composeClassName(
                  'relative flex flex-col items-center justify-center min-h-11 rounded-full text-[10px] leading-[12px] font-semibold no-underline transition-colors duration-[120ms]',
                  isActive ? 'bg-on-shell/12 text-on-shell' : 'text-on-shell-muted',
                )}
              >
                <span className="flex items-center justify-center h-6">
                  <Icon
                    name={tab.icon}
                    size={TAB_ICON_SIZE}
                    strokeWidth={isActive ? ACTIVE_STROKE : IDLE_STROKE}
                  />
                </span>
                <span>{t(tab.labelKey)}</span>
                {isBadgeShown ? (
                  <span className="absolute top-0 left-1/2 ml-2">
                    <CountBadge
                      count={badgeCount}
                      label={t('nav.pending-count', { count: badgeCount })}
                    />
                  </span>
                ) : null}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
