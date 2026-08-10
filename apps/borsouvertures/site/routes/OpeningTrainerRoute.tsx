import { Suspense } from 'react';
import { OpeningsLoadingPanel } from '@/components/molecules/OpeningsLoadingPanel';
import { TopBar } from '@/components/organisms/TopBar';
import { TrainerScreens } from './TrainerScreens';

// @FollowsBlueprint organism-shell
export function OpeningTrainerRoute() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main">
        <Suspense fallback={<OpeningsLoadingPanel />}>
          <TrainerScreens />
        </Suspense>
      </main>
    </div>
  );
}
