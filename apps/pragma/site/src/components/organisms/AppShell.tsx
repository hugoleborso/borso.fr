/** @Feature shell */

import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from '../atoms/Avatar';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { Overline } from '../atoms/Overline';
import { MEMBER_LOADING_COLOR, memberInitial } from '../atoms/member-palette.utils';
import { OfflineBanner } from '../molecules/OfflineBanner';
import {
  BREAKPOINT_BELOW_LG,
  useIsMediaQueryMatching,
} from '../molecules/media-query-matching.hook';
import { useIsOnline } from '../molecules/online-status.hook';
import { BottomTabBar } from './BottomTabBar';
import { InstallOffer } from './InstallOffer';
import { selectActiveTab, SHELL_TABS, type ShellTab } from './navigation-active.core';
import { useSignedInMember } from '../../lib/queries/me.queries';

/**
 * @Blueprint organism-shell
 * @BlueprintName Application Shell Organism
 * @BlueprintUsage Use for the frame that wraps every routed page: the navigation, the global banners, and the outlet.
 * @BlueprintDescription Maps one readonly array of tabs, declared in a sibling core module, into both the desktop sidebar and the phone's bottom bar, so adding a destination is a data change rather than new markup, and asks a pure function which tab the current path belongs to. The browser's online status and the viewport width both arrive through `useSyncExternalStore` hooks, so the shell holds no state and no effect. Its root pads the top safe area, and the bottom bar the bottom one.
 */
export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnline = useIsOnline();
  const isNarrow = useIsMediaQueryMatching(BREAKPOINT_BELOW_LG);
  const signedInMember = useSignedInMember();
  const signedInName = signedInMember.data?.firstName ?? '';
  const signedInColor = signedInMember.data?.color ?? MEMBER_LOADING_COLOR;
  const activeTab = selectActiveTab(location.pathname);

  return (
    <div className="min-h-dvh flex bg-paper text-ink pt-[env(safe-area-inset-top)]">
      <div className="sticky top-0 hidden h-dvh self-start lg:block">
        <nav className="flex h-full w-[232px] min-w-[232px] flex-col gap-3.5 border-r border-rule bg-sunk px-3.5 py-4">
          <div className="px-2 pt-1.5 pb-1">
            <div className="font-display text-display text-ink">{t('appName')}</div>
            <Overline className="mt-0.5">{t('appWordmark')}</Overline>
          </div>
          <div className="flex flex-col gap-px">
            {SHELL_TABS.map((tab) => (
              <SidebarLink
                key={tab.id}
                tab={tab}
                label={t(tab.labelKey)}
                isActive={tab.id === activeTab}
              />
            ))}
          </div>
          <Link
            to="/account"
            className="mt-auto flex items-center gap-2.5 rounded-md bg-leaf p-2 text-ink no-underline shadow-leaf"
          >
            <Avatar initials={memberInitial(signedInName)} color={signedInColor} size="md" />
            <div className="min-w-0">
              <div className="truncate text-meta font-medium">{signedInName}</div>
              <div className="truncate text-meta text-ink-soft">{t('shell.meVersion')}</div>
            </div>
          </Link>
        </nav>
      </div>

      <main className="flex-1 min-w-0 relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <OfflineBanner isVisible={!isOnline} />
        <InstallOffer />
        <Outlet />
      </main>

      {isNarrow ? <BottomTabBar tabs={SHELL_TABS} activeTab={activeTab} /> : null}
    </div>
  );
}

interface SidebarLinkProps {
  readonly tab: ShellTab;
  readonly label: string;
  readonly isActive: boolean;
}

function SidebarLink({ tab, label, isActive }: SidebarLinkProps): JSX.Element {
  return (
    <Link
      to={tab.to}
      aria-current={isActive ? 'page' : undefined}
      className={composeClassName(
        'flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-2 text-body text-ink no-underline transition-colors',
        'hover:bg-hover',
        isActive ? 'bg-leaf font-medium shadow-leaf' : null,
      )}
    >
      <Icon name={tab.icon} size="md" className="text-ink-soft" />
      <span className="flex-1">{label}</span>
    </Link>
  );
}
