/**
 * The phone's navigation: a fixed bar of thumb-sized tabs at the bottom of
 * the screen, plus a "more" tab that opens the drawer holding the admin
 * pages. It replaces reaching for a hamburger at the top of a screen the
 * hand is holding from the bottom.
 *
 * Hidden from `lg` up, where the sidebar is already visible.
 */

import type { ParseKeys } from 'i18next';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { isPositiveCount } from '../../lib/counts.utils';
import { isNavDestinationActive } from './nav-active.core';

export interface BottomTab {
  readonly to: string;
  readonly labelKey: ParseKeys;
  readonly icon: IconName;
}

export interface BottomTabBarProps {
  readonly tabs: readonly BottomTab[];
  readonly badges: Readonly<Record<string, number | undefined>>;
  readonly activePath: string;
  readonly onOpenMore: () => void;
}

const TAB_CLASS =
  'relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-14 text-[10px] no-underline';

// @FollowsBlueprint organism-presentational
export function BottomTabBar(props: BottomTabBarProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-bg-elev border-t border-line pb-[env(safe-area-inset-bottom)]"
      aria-label={t('nav.bottomBar')}
    >
      {props.tabs.map((tab) => {
        const isActive = isNavDestinationActive(props.activePath, tab.to);
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
        onClick={props.onOpenMore}
        className={composeClassName(
          TAB_CLASS,
          'text-ink-500 bg-transparent border-0 cursor-pointer',
        )}
      >
        <Icon name="menu" size={19} />
        <span>{t('nav.more')}</span>
      </button>
    </nav>
  );
}
