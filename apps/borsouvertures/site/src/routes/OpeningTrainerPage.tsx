import { QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { SyncPausedBanner } from '@/components/molecules/SyncPausedBanner';
import { TabBar } from '@/components/molecules/TabBar';
import { AppScreens } from '@/components/organisms/AppScreens';
import { TopBar } from '@/components/organisms/TopBar';
import { queryClient } from '@/lib/query-client.setup';
import { type AppTab, selectActiveTab, selectTabScreen } from '@/navigation/app-screen.core';
import { openScreen, useAppScreen } from '@/navigation/navigation.store';
import { useSyncStatus } from '@/review/sync.store';

function openTab(tab: AppTab): void {
  openScreen(selectTabScreen(tab));
}

// @FollowsBlueprint organism-shell
export function OpeningTrainerPage() {
  const screen = useAppScreen();
  const isSyncPaused = useSyncStatus() === 'paused';
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col min-h-screen gap-4 p-2 pb-20 roomy:p-6 roomy:pb-24">
        <TopBar />
        {isSyncPaused ? <SyncPausedBanner /> : null}
        <main className="flex flex-col gap-4">
          <Suspense fallback={<OpeningsLoadingPanel />}>
            <AppScreens />
          </Suspense>
        </main>
        <TabBar activeTab={selectActiveTab(screen)} onSelect={openTab} />
      </div>
    </QueryClientProvider>
  );
}
