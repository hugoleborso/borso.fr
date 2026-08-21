/** @Feature shell */

import type { ParseKeys } from 'i18next';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { isPositiveCount } from '../../lib/counts.utils';
import { isMoreTabActive, isNavigationDestinationActive } from './navigation-active.core';

export interface BottomTab {
  readonly to: string;
  readonly labelKey: ParseKeys;
  readonly icon: IconName;
}

export interface BottomTabBarProps {
  readonly tabs: readonly BottomTab[];
  readonly badges: Readonly<Record<string, number | undefined>>;
  readonly activePath: string;
  readonly moreDestinations: readonly string[];
  readonly isMoreOpen: boolean;
  readonly onToggleMore: () => void;
}

const TAB_CLASS =
  'relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 text-xs no-underline';

// @FollowsBlueprint organism-presentational
export function BottomTabBar(props: BottomTabBarProps): JSX.Element {
  const { t } = useTranslation();
  const isMoreActive = isMoreTabActive(props.activePath, props.moreDestinations, props.isMoreOpen);
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-bg-elev border-t border-line pb-[env(safe-area-inset-bottom)]"
      aria-label={t('nav.bottomBar')}
    >
      {props.tabs.map((tab) => {
        const isActive = isNavigationDestinationActive(props.activePath, tab.to);
        const badge = props.badges[tab.to];
        const isBadgeShown = isPositiveCount(badge);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={composeClassName(TAB_CLASS, isActive ? 'text-accent' : 'text-ink-500')}
          >
            <Icon name={tab.icon} size={19} />
            <span>{t(tab.labelKey)}</span>
            {isBadgeShown ? (
              <span className="absolute top-1.5 right-1/2 translate-x-4">
                <Badge tone="default" size="sm">
                  {badge}
                </Badge>
              </span>
            ) : null}
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={props.onToggleMore}
        aria-expanded={props.isMoreOpen}
        aria-current={isMoreActive ? 'page' : undefined}
        className={composeClassName(
          TAB_CLASS,
          'bg-transparent border-0 cursor-pointer',
          isMoreActive ? 'text-accent' : 'text-ink-500',
        )}
      >
        <Icon name={props.isMoreOpen ? 'close' : 'menu'} size={19} />
        <span>{t('nav.more')}</span>
      </button>
    </nav>
  );
}
