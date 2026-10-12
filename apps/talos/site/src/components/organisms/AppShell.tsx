import { type JSX, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../atoms/Spinner';
import { OfflineBanner } from '../molecules/OfflineBanner';
import { useIsOnline } from '../molecules/online-status.hook';
import { useToday } from '../../lib/queries/today.queries';
import { TODO_LIST_ROUTES } from '../../lib/wikilinks.core';
import { type BottomTab, BottomTabBar } from './BottomTabBar';
import { ActionSheet } from './ActionSheet';
import { ToastViewport } from './ToastViewport';

const PROPOSALS_PATH = '/proposals';

const TABS: readonly BottomTab[] = [
  { to: '/', labelKey: 'nav.today', icon: 'today' },
  { to: TODO_LIST_ROUTES.main, labelKey: 'nav.todo', icon: 'todo' },
  { to: TODO_LIST_ROUTES.work, labelKey: 'nav.work-todo', icon: 'briefcase' },
  { to: PROPOSALS_PATH, labelKey: 'nav.proposals', icon: 'proposals' },
  { to: '/brain', labelKey: 'nav.brain', icon: 'brain' },
  { to: '/message', labelKey: 'nav.message', icon: 'message' },
];

// @FollowsBlueprint organism-shell
export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const location = useLocation();
  const isOnline = useIsOnline();
  const today = useToday();
  return (
    <div className="min-h-dvh bg-bg text-ink pt-[env(safe-area-inset-top)]">
      {isOnline ? null : <OfflineBanner />}
      <main className="max-w-[640px] mx-auto px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner label={t('common.loading')} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <ToastViewport />
      <ActionSheet />
      <BottomTabBar
        tabs={TABS}
        activePath={location.pathname}
        badgeDestination={PROPOSALS_PATH}
        badgeCount={today.data?.pendingProposalCount ?? 0}
      />
    </div>
  );
}
