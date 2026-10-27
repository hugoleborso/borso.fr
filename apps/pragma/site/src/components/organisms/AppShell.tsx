/** @Feature shell */

import type { ParseKeys } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { Overline } from '../atoms/Overline';
import { isPositiveCount } from '../../lib/counts.utils';
import { MEMBER_LOADING_COLOR, memberInitial } from '../atoms/member-palette.utils';
import { LanguageSwitcher } from '../molecules/LanguageSwitcher';
import { OfflineBanner } from '../molecules/OfflineBanner';
import { Sheet } from '../molecules/Sheet';
import {
  BREAKPOINT_BELOW_LG,
  useIsMediaQueryMatching,
} from '../molecules/media-query-matching.hook';
import { useIsOnline } from '../molecules/online-status.hook';
import { BottomTabBar } from './BottomTabBar';
import { InstallOffer } from './InstallOffer';
import { isNavigationDestinationActive } from './navigation-active.core';
import { useNavigationBadges } from './navigation-badges.hook';
import { useSignedInMember } from '../../lib/queries/me.queries';

interface NavItem {
  to: string;
  labelKey: ParseKeys;
  icon: IconName;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { to: '/catalog', labelKey: 'nav.catalog', icon: 'catalog' },
  { to: '/sessions', labelKey: 'nav.sessions', icon: 'sessions' },
  { to: '/setlists', labelKey: 'nav.setlists', icon: 'setlist' },
  { to: '/bars', labelKey: 'nav.bars', icon: 'beer' },
  { to: '/studies', labelKey: 'nav.studies', icon: 'bolt' },
];

const WORKSHOP_NAV: readonly NavItem[] = [
  { to: '/tasks', labelKey: 'nav.tasks', icon: 'tasks' },
  { to: '/compos', labelKey: 'nav.compos', icon: 'compos' },
];

const ADMIN_NAV: readonly NavItem[] = [
  { to: '/improvements', labelKey: 'nav.improvements', icon: 'bulb' },
  { to: '/members', labelKey: 'nav.members', icon: 'members' },
  { to: '/instruments', labelKey: 'nav.instruments', icon: 'instr' },
];

const MORE_NAV_DESTINATIONS: readonly string[] = [...WORKSHOP_NAV, ...ADMIN_NAV].map(
  (item) => item.to,
);

/**
 * @Blueprint organism-shell
 * @BlueprintName Application Shell Organism
 * @BlueprintUsage Use for the frame that wraps every routed page: the navigation, the global banners, and the outlet.
 * @BlueprintDescription Declares the navigation as readonly arrays of items, one per section, and maps them, so adding a destination is a data change rather than new markup. The browser's online status and the viewport width both arrive through `useSyncExternalStore` hooks, so the shell holds no effect, and its only state is the mobile panel flag a button writes.
 */
export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnline = useIsOnline();
  const isNarrow = useIsMediaQueryMatching(BREAKPOINT_BELOW_LG);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const badges = useNavigationBadges();
  const signedInMember = useSignedInMember();
  const signedInName = signedInMember.data?.firstName ?? '';
  const signedInColor = signedInMember.data?.color ?? MEMBER_LOADING_COLOR;

  const closeMobileNav = (): void => setIsMobileNavOpen(false);

  const renderNavigationSections = (): JSX.Element => (
    <>
      <div className="flex flex-col gap-px">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            label={t(item.labelKey)}
            badge={badges[item.to]}
            isActive={isNavigationDestinationActive(location.pathname, item.to)}
            onClick={closeMobileNav}
          />
        ))}
      </div>

      <Overline className="px-2.5 pt-1.5 pb-0.5">{t('nav.workshopSection')}</Overline>
      <div className="flex flex-col gap-px">
        {WORKSHOP_NAV.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            label={t(item.labelKey)}
            badge={badges[item.to]}
            isActive={isNavigationDestinationActive(location.pathname, item.to)}
            onClick={closeMobileNav}
          />
        ))}
      </div>

      <Overline className="px-2.5 pt-1.5 pb-0.5">{t('nav.administrationSection')}</Overline>
      <div className="flex flex-col gap-px">
        {ADMIN_NAV.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            label={t(item.labelKey)}
            badge={badges[item.to]}
            isActive={isNavigationDestinationActive(location.pathname, item.to)}
            onClick={closeMobileNav}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <div className="border-t border-rule pt-2">
          <LanguageSwitcher />
        </div>
        <Link
          to="/account"
          onClick={closeMobileNav}
          className="flex items-center gap-2.5 rounded-md bg-leaf p-2 text-ink no-underline shadow-leaf"
        >
          <Avatar initials={memberInitial(signedInName)} color={signedInColor} size="md" />
          <div className="min-w-0">
            <div className="truncate text-meta font-medium">{signedInName}</div>
            <div className="truncate text-meta text-ink-soft">{t('shell.meVersion')}</div>
          </div>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh flex bg-paper text-ink">
      <div className="sticky top-0 hidden h-dvh self-start lg:block">
        <nav className="flex h-full w-[232px] min-w-[232px] flex-col gap-3.5 border-r border-rule bg-sunk px-3.5 py-4">
          <div className="px-2 pt-1.5 pb-1">
            <div className="font-display text-display text-ink">{t('appName')}</div>
            <Overline className="mt-0.5">{t('appWordmark')}</Overline>
          </div>
          {renderNavigationSections()}
        </nav>
      </div>

      {isNarrow && isMobileNavOpen ? (
        <Sheet title={t('nav.more')} label={t('nav.more')} onClose={closeMobileNav}>
          <nav className="flex flex-col gap-3.5">{renderNavigationSections()}</nav>
        </Sheet>
      ) : null}

      <main className="flex-1 min-w-0 relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <OfflineBanner isVisible={!isOnline} />
        <InstallOffer />
        <Outlet />
      </main>

      {isNarrow ? (
        <BottomTabBar
          tabs={PRIMARY_NAV}
          badges={badges}
          activePath={location.pathname}
          moreDestinations={MORE_NAV_DESTINATIONS}
          isMoreOpen={isMobileNavOpen}
          onToggleMore={() => setIsMobileNavOpen((isOpen) => !isOpen)}
        />
      ) : null}
    </div>
  );
}

interface SidebarLinkProps {
  item: NavItem;
  label: string;
  badge: number | undefined;
  isActive: boolean;
  onClick: () => void;
}

function SidebarLink({ item, label, badge, isActive, onClick }: SidebarLinkProps): JSX.Element {
  const isBadgeShown = isPositiveCount(badge);
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={composeClassName(
        'flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-2 text-body text-ink no-underline transition-colors',
        'hover:bg-hover',
        isActive ? 'bg-leaf font-medium shadow-leaf' : null,
      )}
    >
      <Icon name={item.icon} size="md" className="text-ink-soft" />
      <span className="flex-1">{label}</span>
      {isBadgeShown ? (
        <Badge tone="default" size="sm">
          {badge}
        </Badge>
      ) : null}
    </NavLink>
  );
}
