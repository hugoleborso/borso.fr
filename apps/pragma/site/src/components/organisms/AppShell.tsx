/**
 * AppShell — sidebar nav + offline banner + page outlet. Mirrors
 * the prototype's `shell.jsx`: cream paper background, editorial
 * sidebar with "Pragma · ERP DU GROUPE" wordmark, two nav sections
 * (main + administration), bottom-aligned "me" chip.
 *
 * Adds, vs round-5:
 *  - the `/setlists` primary nav entry the prototype shows between
 *    Sessions and Bars;
 *  - badge counts per nav entry, fetched lazily from cheap list
 *    endpoints so the placeholder map is gone;
 *  - a `<lg`-breakpoint mobile fallback — the 232px sidebar is
 *    replaced by a slide-over panel triggered from a hamburger
 *    button (the prototype's `MobileNav` pattern).
 *
 * The two `useEffect`s in this file synchronise React state with
 * `navigator.onLine` and `window.matchMedia`, both canonical
 * external-system carve-outs from CLAUDE.md "useEffect is a smell".
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Icon, type IconName } from '../atoms/Icon';
import { cn } from '../atoms/cn.utils';
import {
  MEMBER_PALETTE,
  memberInitial,
} from '../atoms/member-palette.utils';
import { OfflineBanner } from '../molecules/OfflineBanner';
import { useNavBadges } from './useNavBadges';

interface NavItem {
  to: string;
  labelKey: string;
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

const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)';

function readInitialOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function readInitialNarrow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const [online, setOnline] = useState<boolean>(readInitialOnline);
  const [isNarrow, setIsNarrow] = useState<boolean>(readInitialNarrow);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const badges = useNavBadges();

  useEffect(() => {
    const handleOnline = (): void => setOnline(true);
    const handleOffline = (): void => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY);
    const handle = (event: MediaQueryListEvent): void => setIsNarrow(event.matches);
    mediaQuery.addEventListener('change', handle);
    setIsNarrow(mediaQuery.matches);
    return () => mediaQuery.removeEventListener('change', handle);
  }, []);

  // Closing the slide-over on link navigation is handled by an
  // onClick prop on each <SidebarLink>, not by watching the location
  // — per CLAUDE.md "useEffect is a smell", event-time work belongs
  // in event handlers, not in an effect that observes derived state.
  const closeMobileNav = (): void => setMobileNavOpen(false);

  const renderSidebar = (variant: 'desktop' | 'mobile'): JSX.Element => (
    <nav
      className={cn(
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

      <div className="mt-auto flex items-center gap-2.5 p-2 rounded-md border border-line bg-bg-elev">
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
    </nav>
  );

  return (
    <div className="h-screen flex bg-bg text-ink-900">
      {/* Desktop sidebar — hidden under the lg breakpoint. */}
      <div className="hidden lg:block">{renderSidebar('desktop')}</div>

      {/* Mobile slide-over — rendered only when open to keep the
          tree light when the user is on desktop. */}
      {isNarrow && mobileNavOpen ? (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-[rgba(20,16,12,0.5)]"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10">{renderSidebar('mobile')}</div>
        </div>
      ) : null}

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {isNarrow ? (
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t('nav.openMenu')}
            className="lg:hidden sticky top-0 z-30 inline-flex items-center gap-2 px-4 py-3 text-ink-700 bg-bg/90 backdrop-blur border-b border-line w-full text-left cursor-pointer"
          >
            <Icon name="menu" size={18} />
            <span className="font-display italic text-xl text-ink-900 leading-none">
              {t('appName')}
            </span>
          </button>
        ) : null}
        <OfflineBanner visible={!online} />
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
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13.5px] border border-transparent',
        'hover:bg-[rgba(26,22,18,0.04)] transition-colors',
        isActive
          ? 'bg-bg-elev text-ink-900 border-line'
          : 'text-ink-700',
      )}
    >
      <Icon name={item.icon} size={16} className="opacity-85" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 ? (
        <Badge tone="default" size="sm">
          {badge}
        </Badge>
      ) : null}
    </NavLink>
  );
}
