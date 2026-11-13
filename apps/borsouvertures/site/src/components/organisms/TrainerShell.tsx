import { Suspense } from 'react';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { SyncPausedBanner } from '@/components/molecules/SyncPausedBanner';
import { TabBar } from '@/components/molecules/TabBar';
import { type AppTab, selectActiveTab, selectTabScreen } from '@/navigation/app-screen.core';
import { openScreen, useAppScreen } from '@/navigation/navigation.store';
import { useSyncStatus } from '@/review/sync.store';
import { AppScreens } from './AppScreens';
import { TopBar } from './TopBar';

function openTab(tab: AppTab): void {
  openScreen(selectTabScreen(tab));
}

// @FollowsBlueprint organism-shell
export function TrainerShell() {
  const screen = useAppScreen();
  const isSyncPaused = useSyncStatus() === 'paused';
  return (
    <div className="flex flex-col w-full max-w-5xl min-h-dvh mx-auto px-4 pt-[env(safe-area-inset-top)] pb-[calc(var(--spacing-tab-bar)+env(safe-area-inset-bottom)+1.5rem)] roomy:px-6">
      <TopBar />
      {isSyncPaused ? <SyncPausedBanner /> : null}
      <main className="flex flex-col gap-5">
        <Suspense fallback={<OpeningsLoadingPanel />}>
          <AppScreens />
        </Suspense>
      </main>
      <TabBar activeTab={selectActiveTab(screen)} onSelect={openTab} />
    </div>
  );
}
