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
      className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface shadow-2 pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      <ul className="m-0 p-0 list-none flex max-w-[560px] mx-auto">
        {tabs.map((tab) => {
          const isActive = isNavigationDestinationActive(activePath, tab.to);
          const isBadgeShown = isBadgeShownOnTab(tab.to, badgeDestination, badgeCount);
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                className={composeClassName(
                  'relative flex flex-col items-center justify-center gap-0.5 min-h-14 pt-1.5 text-[11px] leading-[14px] font-semibold no-underline transition-colors duration-[120ms]',
                  isActive ? 'text-bronze' : 'text-ink-muted',
                )}
              >
                <span
                  className={composeClassName(
                    'flex items-center justify-center w-12 h-7 rounded-full',
                    isActive ? 'bg-bronze-soft' : 'bg-transparent',
                  )}
                >
                  <Icon
                    name={tab.icon}
                    size={22}
                    strokeWidth={isActive ? ACTIVE_STROKE : IDLE_STROKE}
                  />
                </span>
                <span>{t(tab.labelKey)}</span>
                {isBadgeShown ? (
                  <span className="absolute top-0.5 left-1/2 ml-3">
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
