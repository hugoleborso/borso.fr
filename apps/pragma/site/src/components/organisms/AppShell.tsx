/**
 * AppShell — sidebar nav + offline banner + page outlet. Mirrors
 * the prototype's `shell.jsx`: cream paper background, editorial
 * sidebar with "Pragma · ERP DU GROUPE" wordmark, two nav sections
 * (main + administration), bottom-aligned "me" chip.
 *
 * The offline state is the only `useEffect` in the shell — it
 * synchronises React with the `navigator` global, the canonical
 * "external system" carve-out from CLAUDE.md "useEffect is a smell".
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

interface NavItem {
  to: string;
  labelKey: string;
  icon: IconName;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { to: '/catalog', labelKey: 'nav.catalog', icon: 'catalog' },
  { to: '/sessions', labelKey: 'nav.sessions', icon: 'sessions' },
  { to: '/bars', labelKey: 'nav.bars', icon: 'bars' },
];

const ADMIN_NAV: readonly NavItem[] = [
  { to: '/members', labelKey: 'nav.members', icon: 'members' },
  { to: '/instruments', labelKey: 'nav.instruments', icon: 'instr' },
];

function readInitialOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const [online, setOnline] = useState<boolean>(readInitialOnline);

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

  return (
    <div className="h-screen flex bg-bg text-ink-900">
      <nav className="w-[232px] min-w-[232px] px-3.5 py-4 border-r border-line flex flex-col gap-3.5 bg-bg-sunk">
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
              isActive={location.pathname.startsWith(item.to)}
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
              isActive={location.pathname.startsWith(item.to)}
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

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <OfflineBanner visible={!online} />
        <Outlet />
      </main>
    </div>
  );
}

interface SidebarLinkProps {
  item: NavItem;
  label: string;
  isActive: boolean;
}

function SidebarLink({ item, label, isActive }: SidebarLinkProps): JSX.Element {
  return (
    <NavLink
      to={item.to}
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
      {NAV_BADGES[item.to] !== undefined && (
        <Badge tone="default" size="sm">
          {NAV_BADGES[item.to]}
        </Badge>
      )}
    </NavLink>
  );
}

// Placeholder counts mirror the prototype's static numbers. A future
// data-fetching pass can replace these with live counts; for now they
// preserve the visual rhythm of the sidebar.
const NAV_BADGES: Record<string, string> = {};
