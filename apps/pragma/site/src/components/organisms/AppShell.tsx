/**
 * AppShell — sidebar nav, offline banner, and page outlet. Cream paper
 * background, editorial sidebar with the "Pragma · ERP DU GROUPE"
 * wordmark, two nav sections (main and administration), and a
 * bottom-aligned "me" chip.
 *
 * Under the `lg` breakpoint the 232px sidebar is replaced by a
 * slide-over panel opened from a hamburger button.
 *
 * The browser's online status and the viewport width are both read
 * through `useSyncExternalStore` hooks, so this file holds no effect.
 */

import type { ParseKeys } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { isPositiveCount } from '../../lib/counts.utils';
import { MEMBER_PALETTE, memberInitial } from '../atoms/member-palette.utils';
import { LanguageSwitcher } from '../molecules/LanguageSwitcher';
import { OfflineBanner } from '../molecules/OfflineBanner';
import { BREAKPOINT_BELOW_LG, useIsMediaQueryMatching } from '../molecules/useIsMediaQueryMatching';
import { useIsOnline } from '../molecules/useOnlineStatus';
import { useNavBadges } from './useNavBadges';

interface NavItem {
  to: string;
  labelKey: ParseKeys;
  icon: IconName;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { to: '/catalog', labelKey: 'nav.catalog', icon: 'catalog' },
  { to: '/sessions', labelKey: 'nav.sessions', icon: 'sessions' },
  { to: '/setlists', labelKey: 'nav.setlists', icon: 'setlist' },
  { to: '/bars', labelKey: 'nav.bars', icon: 'bars' },
];

const ADMIN_NAV: readonly NavItem[] = [
  { to: '/members', labelKey: 'nav.members', icon: 'members' },
  { to: '/instruments', labelKey: 'nav.instruments', icon: 'instr' },
];

export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnline = useIsOnline();
  const isNarrow = useIsMediaQueryMatching(BREAKPOINT_BELOW_LG);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const badges = useNavBadges();

  const closeMobileNav = (): void => setIsMobileNavOpen(false);

  const renderSidebar = (variant: 'desktop' | 'mobile'): JSX.Element => (
    <nav
      className={composeClassName(
        'px-3.5 py-4 flex flex-col gap-3.5 bg-bg-sunk',
        variant === 'desktop'
          ? 'w-[232px] min-w-[232px] border-r border-line h-full'
          : 'w-72 max-w-[80vw] h-full border-r border-line-strong shadow-2xl',
      )}
    >
      <div className="font-display italic text-[30px] leading-none tracking-[-0.01em] text-ink-900 px-2 pt-1.5 pb-1">
        {t('appName')}
        <div className="font-sans not-italic text-[9px] tracking-[0.18em] uppercase text-ink-500 mt-0.5">
          {t('appWordmark')}
        </div>
      </div>

      <div className="flex flex-col gap-px">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            label={t(item.labelKey)}
            badge={badges[item.to]}
            isActive={location.pathname.startsWith(item.to)}
            onClick={closeMobileNav}
          />
        ))}
      </div>

      <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-400 px-2.5 pt-1.5 pb-0.5">
        {t('nav.administrationSection')}
      </div>
      <div className="flex flex-col gap-px">
        {ADMIN_NAV.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            label={t(item.labelKey)}
            badge={badges[item.to]}
            isActive={location.pathname.startsWith(item.to)}
            onClick={closeMobileNav}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <div className="border-t border-line pt-2">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-md border border-line bg-bg-elev">
          <Avatar
            initials={memberInitial(t('shell.meName'))}
            color={MEMBER_PALETTE.teal}
            size="md"
          />
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{t('shell.meName')}</div>
            <div className="text-[10.5px] text-ink-500 truncate">{t('shell.meVersion')}</div>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="h-screen flex bg-bg text-ink-900">
      {/* Desktop sidebar — hidden under the lg breakpoint. */}
      <div className="hidden lg:block">{renderSidebar('desktop')}</div>

      {/* Mobile slide-over — rendered only when open to keep the
          tree light when the user is on desktop. */}
      {isNarrow && isMobileNavOpen ? (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-[rgba(20,16,12,0.5)]"
            aria-hidden="true"
            onClick={closeMobileNav}
          />
          <div className="relative z-10">{renderSidebar('mobile')}</div>
        </div>
      ) : null}

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {isNarrow ? (
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label={t('nav.openMenu')}
            className="lg:hidden sticky top-0 z-30 inline-flex items-center gap-2 px-4 py-3 text-ink-700 bg-bg/90 backdrop-blur border-b border-line w-full text-left cursor-pointer"
          >
            <Icon name="menu" size={18} />
            <span className="font-display italic text-xl text-ink-900 leading-none">
              {t('appName')}
            </span>
          </button>
        ) : null}
        <OfflineBanner isVisible={!isOnline} />
        <Outlet />
      </main>
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
        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13.5px] border border-transparent',
        'hover:bg-[rgba(26,22,18,0.04)] transition-colors',
        isActive ? 'bg-bg-elev text-ink-900 border-line' : 'text-ink-700',
      )}
    >
      <Icon name={item.icon} size={16} className="opacity-85" />
      <span className="flex-1">{label}</span>
      {isBadgeShown ? (
        <Badge tone="default" size="sm">
          {badge}
        </Badge>
      ) : null}
    </NavLink>
  );
}
