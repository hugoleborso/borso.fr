/**
 * AppShell — sidebar nav, offline banner, and page outlet. Cream paper
 * background, editorial sidebar with the "Pragma · ERP DU GROUPE"
 * wordmark, two nav sections (main and administration), and a
 * bottom-aligned "me" chip.
 *
 * Under the `lg` breakpoint the 232px sidebar gives way to a bottom tab bar
 * carrying the four pages the band uses on stage, plus a "more" tab that
 * toggles the same sidebar as a slide-over for the admin pages. The slide-over
 * is a native modal `<dialog>`, so the browser owns the top layer — which is
 * above the fixed tab bar with no stacking context to reason about — the focus
 * trap, and the Escape key, which the hand-rolled panel it replaced ignored
 * while the confirmation sheet beside it honoured.
 *
 * The frame is `h-dvh`, not `h-screen`. `100vh` on a phone is the height the
 * viewport has once the address bar has scrolled away, so while it is showing,
 * the scroll container runs past the bottom of what the screen shows and the
 * last rows stay under the tab bar however far you scroll. `100dvh` follows the
 * address bar.
 *
 * The scroll container's bottom padding follows the home indicator, because
 * the tab bar's own height does: the bar pads itself by
 * `env(safe-area-inset-bottom)`, so a fixed 64px here left the last row of a
 * page under the bar on any handset reporting a non-zero inset.
 *
 * While a `<dialog>` inside it is open the container stops scrolling, so a
 * drag on an open sheet moves the sheet rather than the page behind it. A
 * native modal dialog freezes the *document*, and the document is not what
 * scrolls here.
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
import { openDismissibleDialogOnAttach } from '../../lib/modal-dialog';
import { MEMBER_PALETTE, memberInitial } from '../atoms/member-palette.utils';
import { LanguageSwitcher } from '../molecules/LanguageSwitcher';
import { OfflineBanner } from '../molecules/OfflineBanner';
import { BREAKPOINT_BELOW_LG, useIsMediaQueryMatching } from '../molecules/useIsMediaQueryMatching';
import { useIsOnline } from '../molecules/useOnlineStatus';
import { BottomTabBar } from './BottomTabBar';
import { isNavDestinationActive } from './nav-active.core';
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

const ADMIN_NAV_DESTINATIONS: readonly string[] = ADMIN_NAV.map((item) => item.to);

/**
 * @Blueprint organism-shell
 * @BlueprintName Application Shell Organism
 * @BlueprintUsage Use for the frame that wraps every routed page: the navigation, the global banners, and the outlet.
 * @BlueprintDescription Declares the navigation as two readonly arrays of items and maps them, so adding a destination is a data change rather than new markup. The browser's online status and the viewport width both arrive through `useSyncExternalStore` hooks, so the shell holds no effect, and its only state is the mobile panel flag a button writes.
 */
export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnline = useIsOnline();
  const isNarrow = useIsMediaQueryMatching(BREAKPOINT_BELOW_LG);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const badges = useNavBadges();

  const closeMobileNav = (): void => setIsMobileNavOpen(false);

  const renderSidebar = (variant: 'desktop' | 'mobile'): JSX.Element => {
    const isSlideOver = variant === 'mobile';
    return (
      <nav
        className={composeClassName(
          'px-3.5 py-4 flex flex-col gap-3.5 bg-bg-sunk',
          variant === 'desktop'
            ? 'w-[232px] min-w-[232px] border-r border-line h-full'
            : 'w-72 max-w-[80vw] h-full border-r border-line-strong shadow-2xl',
        )}
      >
        <div className="flex items-start justify-between gap-2 px-2 pt-1.5 pb-1">
          <div className="font-display italic text-[30px] leading-none tracking-[-0.01em] text-ink-900">
            {t('appName')}
            <div className="font-sans not-italic text-xs tracking-[0.18em] uppercase text-ink-500 mt-0.5">
              {t('appWordmark')}
            </div>
          </div>
          {isSlideOver ? (
            <button
              type="button"
              onClick={closeMobileNav}
              aria-label={t('nav.closeMenu')}
              className="inline-flex items-center justify-center w-11 h-11 -mr-2 -mt-1 rounded-md text-ink-500 hover:text-ink-900 bg-transparent border-0 cursor-pointer"
            >
              <Icon name="close" size={18} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-px">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              label={t(item.labelKey)}
              badge={badges[item.to]}
              isActive={isNavDestinationActive(location.pathname, item.to)}
              onClick={closeMobileNav}
            />
          ))}
        </div>

        <div className="font-sans text-xs tracking-[0.14em] uppercase text-ink-400 px-2.5 pt-1.5 pb-0.5">
          {t('nav.administrationSection')}
        </div>
        <div className="flex flex-col gap-px">
          {ADMIN_NAV.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              label={t(item.labelKey)}
              badge={badges[item.to]}
              isActive={isNavDestinationActive(location.pathname, item.to)}
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
              <div className="text-xs text-ink-500 truncate">{t('shell.meVersion')}</div>
            </div>
          </div>
        </div>
      </nav>
    );
  };

  return (
    <div className="h-dvh flex bg-bg text-ink-900">
      {/* Desktop sidebar — hidden under the lg breakpoint. */}
      <div className="hidden lg:block">{renderSidebar('desktop')}</div>

      {/* Mobile slide-over — rendered only when open to keep the
          tree light when the user is on desktop. */}
      {isNarrow && isMobileNavOpen ? (
        <dialog
          ref={openDismissibleDialogOnAttach}
          onClose={closeMobileNav}
          aria-label={t('nav.more')}
          className="fixed inset-0 z-50 m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-transparent p-0 backdrop:bg-[rgba(20,16,12,0.5)]"
        >
          <div className="w-fit h-full">{renderSidebar('mobile')}</div>
        </dialog>
      ) : null}

      <main className="flex-1 overflow-y-auto overflow-x-hidden [&:has(dialog[open])]:overflow-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <OfflineBanner isVisible={!isOnline} />
        <Outlet />
      </main>

      {isNarrow ? (
        <BottomTabBar
          tabs={PRIMARY_NAV}
          badges={badges}
          activePath={location.pathname}
          moreDestinations={ADMIN_NAV_DESTINATIONS}
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
        'flex items-center gap-2.5 min-h-11 px-2.5 py-2 rounded-md text-[13.5px] border border-transparent',
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
